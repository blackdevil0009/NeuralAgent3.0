"""
app/services/ayurveda_ai_service.py — AI Prediction and Feedback Service
"""

import os
import joblib
from app.extensions import db
from app.models import AISelfLearningLog

MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'ai', 'models')
MODEL_PATH = os.path.join(MODEL_DIR, 'ayurveda_model.pkl')

class AyurvedaAIService:
    _model = None

    @classmethod
    def load_model(cls):
        """Loads the local PKL model if available."""
        if cls._model is None:
            if os.path.exists(MODEL_PATH):
                cls._model = joblib.load(MODEL_PATH)
            else:
                return False
        return True

    @classmethod
    def predict_treatment(cls, symptoms: str) -> str:
        """Uses the local model to predict treatment. Falls back to default if no model exists."""
        if not cls.load_model():
            return "Model not trained yet. Please ask an administrator to run the AI preparation script."
        
        # The model returns an array of predictions
        prediction = cls._model.predict([symptoms])
        return prediction[0]

    @classmethod
    def submit_feedback(cls, doctor_id: int, input_symptoms: str, predicted_treatment: str, actual_treatment: str):
        """Saves doctor feedback into the self-learning log."""
        log = AISelfLearningLog(
            doctor_id=doctor_id,
            input_symptoms=input_symptoms,
            predicted_treatment=predicted_treatment,
            actual_treatment=actual_treatment,
            is_integrated=False
        )
        db.session.add(log)
        db.session.commit()
        return log.id
