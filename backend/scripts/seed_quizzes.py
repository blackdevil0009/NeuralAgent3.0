"""
scripts/seed_quizzes.py — Populate the Gamified Quiz Module
"""

import os
import sys
import json

# Add the backend directory to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from app.extensions import db
from app.models.quiz import QuizLevel, QuizCategory, QuizQuestion

def seed():
    app = create_app()
    with app.app_context():
        print("--- Seeding Gamified Quiz Module ---")
        
        # 1. Create Levels
        levels_data = [
            {'name': 'Beginner', 'rank': 1, 'unlock_score': 0, 'multiplier': 1.0, 'desc': 'Start your Ayurvedic journey.'},
            {'name': 'Intermediate', 'rank': 2, 'unlock_score': 100, 'multiplier': 1.5, 'desc': 'Deepen your knowledge of doshas and routines.'},
            {'name': 'Advanced', 'rank': 3, 'unlock_score': 500, 'multiplier': 2.0, 'desc': 'Master dietary laws and advanced lifestyle.'},
            {'name': 'Expert', 'rank': 4, 'unlock_score': 1500, 'multiplier': 3.0, 'desc': 'Sanskrit terms and complex scenarios.'}
        ]
        
        levels = {}
        for l in levels_data:
            level = QuizLevel.query.filter_by(difficulty_rank=l['rank']).first()
            if not level:
                level = QuizLevel(name=l['name'], difficulty_rank=l['rank'], required_score_to_unlock=l['unlock_score'], reward_multiplier=l['multiplier'], description=l['desc'])
                db.session.add(level)
                db.session.flush()
            levels[l['name']] = level
            
        # 2. Create Categories
        cats_data = [
            'Morning Habits', 'Sleep Routine', 'Diet & Nutrition', 
            'Yoga & Wellness', 'Mental Health & Discipline', 
            'Seasonal Health Care', 'Home Remedies', 
            'Vata, Pitta, Kapha', 'Ayurvedic Shlokas'
        ]
        
        categories = {}
        for c in cats_data:
            cat = QuizCategory.query.filter_by(name=c).first()
            if not cat:
                cat = QuizCategory(name=c, description=f'Learn about {c}.', is_active=True)
                db.session.add(cat)
                db.session.flush()
            categories[c] = cat
            
        # 3. Create Questions (Sample set across different levels/categories)
        questions = [
            # Morning Habits (Beginner)
            {
                'cat': 'Morning Habits', 'level': 'Beginner', 'type': 'mcq',
                'text': 'According to Ayurveda, when is the best time to wake up?',
                'options': ['Brahma Muhurta (1.5 hours before sunrise)', 'After 8 AM', 'Midnight', 'Just before noon'],
                'correct': 'Brahma Muhurta (1.5 hours before sunrise)',
                'exp': 'Brahma Muhurta is considered highly auspicious and optimal for mental clarity and fresh air.'
            },
            {
                'cat': 'Morning Habits', 'level': 'Beginner', 'type': 'true_false',
                'text': 'Drinking a glass of warm water immediately after waking up is recommended in Ayurveda.',
                'options': ['True', 'False'],
                'correct': 'True',
                'exp': 'Ushapan (drinking warm water) flushes out toxins (Ama) and stimulates the gastrointestinal tract.'
            },
            # Vata, Pitta, Kapha (Intermediate)
            {
                'cat': 'Vata, Pitta, Kapha', 'level': 'Intermediate', 'type': 'scenario',
                'text': 'You are experiencing dry skin, anxiety, and bloating. Which Dosha is likely imbalanced?',
                'options': ['Vata', 'Pitta', 'Kapha', 'None'],
                'correct': 'Vata',
                'exp': 'Dryness, irregular digestion, and anxiety are classic signs of Vata imbalance.'
            },
            {
                'cat': 'Vata, Pitta, Kapha', 'level': 'Intermediate', 'type': 'mcq',
                'text': 'Which of these foods is best for pacifying Pitta dosha in summer?',
                'options': ['Spicy chilies', 'Sweet and cooling fruits (like melon)', 'Dry crackers', 'Hot soup'],
                'correct': 'Sweet and cooling fruits (like melon)',
                'exp': 'Pitta is hot by nature. Sweet, cooling, and hydrating foods balance its fiery quality.'
            },
            # Diet & Nutrition (Advanced)
            {
                'cat': 'Diet & Nutrition', 'level': 'Advanced', 'type': 'fill_blank',
                'text': 'Eating incompatible foods together (like milk and sour fruits) is called _____.',
                'options': ['Viruddha Ahara', 'Sattvic Ahara', 'Pathya', 'Ojas'],
                'correct': 'Viruddha Ahara',
                'exp': 'Viruddha Ahara refers to antagonistic food combinations that create toxins in the body.'
            },
            # Ayurvedic Shlokas (Expert)
            {
                'cat': 'Ayurvedic Shlokas', 'level': 'Expert', 'type': 'shlok_meaning',
                'text': 'What is the meaning of: "Samadosha Samagnischa Samadhatu Malakriyah"?',
                'options': [
                    'The definition of a perfectly healthy person.',
                    'The process of making herbal decoctions.',
                    'The rules of yoga breathing.',
                    'The seasonal diet for winter.'
                ],
                'correct': 'The definition of a perfectly healthy person.',
                'exp': 'Sushruta Samhita defines health as a state where doshas, digestive fire (agni), tissues (dhatu), and wastes (mala) are in perfect balance, along with a peaceful mind and soul.'
            }
        ]
        
        # We will dynamically generate a few more variations to fill up the database
        # For a true production app, hundreds of these would be loaded from a JSON file.
        added_count = 0
        for q_data in questions:
            cat = categories.get(q_data['cat'])
            lvl = levels.get(q_data['level'])
            
            if not cat or not lvl:
                continue
                
            # Check if exists
            exists = QuizQuestion.query.filter_by(question_text=q_data['text']).first()
            if not exists:
                q = QuizQuestion(
                    category_id=cat.id,
                    level_id=lvl.id,
                    question_type=q_data['type'],
                    question_text=q_data['text'],
                    options_json=json.dumps(q_data['options']),
                    correct_answer=q_data['correct'],
                    explanation=q_data['exp']
                )
                db.session.add(q)
                added_count += 1
                
        db.session.commit()
        print(f"Seeding Complete! Added {added_count} new questions.")

if __name__ == '__main__':
    seed()
