"""
scripts/prepare_ayurveda_ai.py — Generate and Train Initial Ayurveda AI Model
"""

import os
import sys
import pandas as pd
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

# Ensure app context if needed
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'app', 'ai', 'models')
MODEL_PATH = os.path.join(MODEL_DIR, 'ayurveda_model.pkl')
DATASET_PATH = os.path.join(MODEL_DIR, 'base_ayurveda_dataset.csv')

def generate_base_dataset():
    """Generates a synthetic baseline dataset based on Charaka & Sushruta Samhita."""
    
    data = [
        # Charaka Samhita (Medicine/Internal)
        ("chronic fever, weakness, loss of appetite, dry cough", "Jwara (Fever) - Treat with Guduchi and antipyretic herbs like Parpataka."),
        ("indigestion, bloating, acid reflux, burning sensation", "Amlapitta - Administer cooling herbs like Shatavari, Amalaki, and avoid spicy foods."),
        ("joint pain, swelling, morning stiffness", "Amavata (Rheumatoid Arthritis) - Fasting (Langhana), dry fomentation, and Castor oil."),
        ("severe cough with phlegm, breathlessness, wheezing", "Kasa/Shwasa - Kanakasava, Vasavaleha, and avoid cold exposures."),
        ("frequent urination, extreme thirst, sweet taste in mouth", "Prameha (Diabetes) - Administer Nisha Amalaki, Shilajit, and strict diet control."),
        
        # Sushruta Samhita (Surgery/Anatomy/Wounds)
        ("deep cut, bleeding, fresh wound", "Sadyo Vrana - Clean wound with Kashaya (decoction) of Nimba, apply Jatyadi Taila for healing."),
        ("pus formation, swelling, throbbing pain in localized area", "Vidradhi (Abscess) - Needs Chedana (incision) and Bhedana (drainage), followed by wound cleansing."),
        ("calculus in urinary tract, severe pain radiating to groin", "Ashmari - Lithotriptic herbs like Pashanabheda, Gokshura, and if severe, surgical removal (Shalya Chikitsa)."),
        ("fractured bone, swelling, inability to move the limb", "Bhagna (Fracture) - Reduction (Kushabandha) and splinting, internal use of Laksha and Arjuna."),
        ("piles, bleeding during defecation, painful mass", "Arsha (Hemorrhoids) - Kshara Karma (alkali application) or Agnikarma (thermal cauterization)."),
    ]
    
    # Duplicate records to simulate a larger starting corpus for ML algorithms
    expanded_data = []
    for _ in range(15): 
        expanded_data.extend(data)
        
    df = pd.DataFrame(expanded_data, columns=['symptoms', 'treatment'])
    
    if not os.path.exists(MODEL_DIR):
        os.makedirs(MODEL_DIR)
        
    df.to_csv(DATASET_PATH, index=False)
    print(f"Generated base dataset with {len(df)} records at {DATASET_PATH}")
    return df

def train_model(df):
    """Trains a TF-IDF + Random Forest Pipeline and saves it."""
    
    X = df['symptoms']
    y = df['treatment']
    
    # Create an NLP pipeline
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(stop_words='english', max_features=1000)),
        ('clf', RandomForestClassifier(n_estimators=50, random_state=42))
    ])
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training model...")
    pipeline.fit(X_train, y_train)
    
    print("Model accuracy on test set:", pipeline.score(X_test, y_test))
    
    # Save the pipeline
    joblib.dump(pipeline, MODEL_PATH)
    print(f"Model successfully saved to {MODEL_PATH}")

if __name__ == '__main__':
    print("--- Ayurveda AI Data Prep & Training ---")
    df = generate_base_dataset()
    train_model(df)
