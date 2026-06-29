"""
app/controllers/gamification_controller.py
"""

from flask import request
from app.extensions import db
from app.models.user import User
from app.models.gamification import PopCoinTransaction, UserStreak
from app.middleware import get_jwt_user_id
from app.utils.response import success_response, error_response
from app.services import reward_service

import logging
import os
import json
import re
from flask import request, current_app
from werkzeug.utils import secure_filename


logger = logging.getLogger(__name__)


def get_dashboard_data():
    """Returns gamification info for the current user."""
    user_id = get_jwt_user_id()
    user = User.query.get(user_id)
    if not user:
        return error_response("User not found", 404)

    # Fetch recent transactions
    txns = PopCoinTransaction.query.filter_by(user_id=user_id).order_by(PopCoinTransaction.created_at.desc()).limit(10).all()
    
    # Fetch active streaks
    streaks = UserStreak.query.filter_by(user_id=user_id).all()

    data = {
        'balance': user.pop_coin_balance,
        'level': user.achievement_level,
        'recent_transactions': [t.to_dict() for t in txns],
        'streaks': [s.to_dict() for s in streaks]
    }
    
    return success_response(data=data, message="Dashboard data fetched successfully")


def submit_daily_quiz():
    """User submits a daily quiz to earn coins."""
    user_id = get_jwt_user_id()
    data = request.get_json() or {}
    
    score = data.get('score', 0)
    total = data.get('total', 0)
    
    if total == 0:
        return error_response("Invalid quiz data", 400)
    
    percentage = score / total
    
    # Award coins based on score
    coins_earned = 10  # base for participation
    if percentage >= 0.8:
        coins_earned += 10 # bonus for good score
    if percentage == 1.0:
        coins_earned += 10 # perfect score bonus
        
    res = reward_service.award_coins(user_id, coins_earned, "health_quiz", f"Completed daily quiz with score {score}/{total}")
    
    if not res['success']:
        return error_response(res['message'], 500)
        
    return success_response(
        data={"coins_earned": coins_earned, "new_balance": res['new_balance'], "level_up": res['level_up']},
        message=f"Quiz submitted! You earned {coins_earned} Pop Coins."
    )


def claim_daily_login():
    """Called once a day by frontend to claim login streak."""
    user_id = get_jwt_user_id()
    
    res = reward_service.update_streak(user_id, "daily_login")
    
    coins_earned = 5 # base for daily login
    if res['bonus']:
        coins_earned += 50 # 7-day streak bonus
        
    award_res = reward_service.award_coins(user_id, coins_earned, "daily_login", "Daily login streak")
    
    return success_response(
        data={
            "streak": res['streak'], 
            "bonus_awarded": res['bonus'], 
            "coins_earned": coins_earned, 
            "new_balance": award_res.get('new_balance')
        },
        message=f"Daily streak: {res['streak']} days! Earned {coins_earned} coins."
    )


def _get_knowledge_path():
    path = os.path.join(current_app.root_path, '..', 'uploads', 'gamification')
    os.makedirs(path, exist_ok=True)
    return os.path.join(path, 'health_knowledge.txt')


def upload_knowledge_dataset():
    """Admin endpoint to upload or append to the health knowledge dataset for AI quizzes."""
    if 'file' not in request.files:
        return error_response("No file provided.", 400)
        
    file = request.files['file']
    if file.filename == '':
        return error_response("No file selected.", 400)
        
    if not file.filename.endswith('.txt'):
        return error_response("Only .txt files are supported for knowledge datasets.", 400)
        
    try:
        content = file.read().decode('utf-8')
        knowledge_path = _get_knowledge_path()
        
        # Append mode allows building knowledge day by day
        with open(knowledge_path, 'a', encoding='utf-8') as f:
            f.write("\n--- NEW DATASET ENTRY ---\n")
            f.write(content)
            
        return success_response(message="Health knowledge dataset updated successfully.")
    except Exception as e:
        logger.error(f"Failed to upload knowledge: {e}")
        return error_response("Failed to process dataset.", 500)


def generate_ai_quiz():
    """Generates a dynamic 3-question quiz using Gemini based on the user's level and knowledge dataset."""
    user_id = get_jwt_user_id()
    user = User.query.get(user_id)
    if not user:
        return error_response("User not found", 404)
        
    category = request.args.get('category', 'General Health')
    
    # Determine difficulty based on user pop coins/level
    balance = user.pop_coin_balance or 0
    difficulty = "Easy"
    coins_reward = 10
    if balance > 2500:
        difficulty = "Expert"
        coins_reward = 30
    elif balance > 1000:
        difficulty = "Hard"
        coins_reward = 25
    elif balance > 500:
        difficulty = "Medium"
        coins_reward = 20
    elif balance > 100:
        difficulty = "Medium-Easy"
        coins_reward = 15

    knowledge_path = _get_knowledge_path()
    knowledge_text = ""
    if os.path.exists(knowledge_path):
        with open(knowledge_path, 'r', encoding='utf-8') as f:
            # Read last 10000 characters to keep prompt size manageable
            content = f.read()
            knowledge_text = content[-10000:]
            
    prompt = f"""
You are an expert Ayurvedic Acharya and Quiz Master for a gamification app.
Using the provided "Ayurveda Knowledge Dataset", generate exactly 3 multiple-choice questions about "{category}".
Difficulty Level: {difficulty} (Scale: Easy -> Expert. Make questions appropriate for this level).

CRITICAL REQUIREMENT: You MUST include at least one relevant Sanskrit Shloka or traditional Ayurvedic term in the questions or as part of the options to make it an authentic Ayurvedic learning experience.

Dataset Context:
\"\"\"{knowledge_text}\"\"\"

Output ONLY valid JSON in this exact structure:
[
  {{
    "q": "The question text (can include a Shloka)?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": 1
  }}
]
Note: "answer" must be the integer index (0-3) of the correct option. Do NOT output markdown formatting like ```json, just the raw JSON array.
"""
    try:
        from google import genai
        api_key = os.getenv("GEMINI_API_KEY")
        client = genai.Client(api_key=api_key)
        
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        
        text = response.text.strip()
        # Clean markdown code blocks if Gemini ignores instructions
        text = re.sub(r'^```json\s*', '', text)
        text = re.sub(r'^```\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        
        questions = json.loads(text)
        
        if not isinstance(questions, list) or len(questions) == 0:
            raise ValueError("Invalid format returned by AI")
            
        return success_response(data={
            "id": f"ai_quiz_{category.lower().replace(' ', '_')}",
            "title": f"AI Quiz: {category}",
            "icon": "🤖",
            "difficulty": difficulty,
            "coins": coins_reward,
            "questions": questions
        })
    except Exception as e:
        logger.error(f"AI Quiz Generation failed: {e}")
        # Fallback Quiz if API fails
        return success_response(data={
            "id": "fallback_quiz",
            "title": f"Fallback: {category}",
            "icon": "🤖",
            "difficulty": difficulty,
            "coins": coins_reward,
            "questions": [
                {
                    "q": f"Which is a healthy practice for {category.lower()}?",
                    "options": ["Drinking water", "Eating junk food", "Skipping sleep", "High stress"],
                    "answer": 0
                }
            ]
        })
