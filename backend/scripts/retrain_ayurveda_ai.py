"""
scripts/retrain_ayurveda_ai.py — Retrain Ayurveda AI with Self-Learning Feedback
"""

import os
import sys
import pandas as pd
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

# Add the backend directory to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from app.extensions import db
from app.models import AISelfLearningLog

MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'app', 'ai', 'models')
MODEL_PATH = os.path.join(MODEL_DIR, 'ayurveda_model.pkl')
DATASET_PATH = os.path.join(MODEL_DIR, 'base_ayurveda_dataset.csv')

def retrain_model():
    app = create_app()
    with app.app_context():
        print("--- Ayurveda AI Self-Learning Retraining ---")
        
        # 1. Load the base dataset
        if not os.path.exists(DATASET_PATH):
            print(f"Error: Base dataset not found at {DATASET_PATH}. Please run prepare_ayurveda_ai.py first.")
            return
            
        base_df = pd.read_csv(DATASET_PATH)
        print(f"Loaded {len(base_df)} records from base dataset.")
        
        # 2. Fetch unintegrated feedback from the database
        new_feedback = AISelfLearningLog.query.filter_by(is_integrated=False).all()
        
        if not new_feedback:
            print("No new feedback found to integrate. Exiting.")
            return
            
        print(f"Found {len(new_feedback)} new feedback logs from doctors.")
        
        # 3. Prepare the new data
        feedback_data = []
        for log in new_feedback:
            feedback_data.append({
                'symptoms': log.input_symptoms,
                'treatment': log.actual_treatment  # The doctor's corrected treatment
            })
            
        feedback_df = pd.DataFrame(feedback_data)
        
        # To give doctor feedback high weight, we replicate it slightly
        expanded_feedback = pd.concat([feedback_df] * 5, ignore_index=True)
        
        # Combine base and new data
        combined_df = pd.concat([base_df, expanded_feedback], ignore_index=True)
        print(f"Combined dataset now has {len(combined_df)} records.")
        
        # 4. Retrain the model
        X = combined_df['symptoms']
        y = combined_df['treatment']
        
        pipeline = Pipeline([
            ('tfidf', TfidfVectorizer(stop_words='english', max_features=1000)),
            ('clf', RandomForestClassifier(n_estimators=50, random_state=42))
        ])
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        print("Retraining model...")
        pipeline.fit(X_train, y_train)
        print("New Model accuracy on test set:", pipeline.score(X_test, y_test))
        
        # 5. Save the updated model
        joblib.dump(pipeline, MODEL_PATH)
        print(f"Updated model successfully saved to {MODEL_PATH}")
        
        # 6. Mark feedback as integrated
        for log in new_feedback:
            log.is_integrated = True
            
        db.session.commit()
        print("Database updated: All new feedback marked as integrated.")

if __name__ == '__main__':
    retrain_model()
