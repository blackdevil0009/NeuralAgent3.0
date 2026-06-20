"""
scripts/prepare_report_analysis_ai.py — Train local AI model for Report Problem Detection
"""

import os
import sys
import pandas as pd
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'app', 'ai', 'models')
MODEL_PATH = os.path.join(MODEL_DIR, 'report_analysis_model.pkl')
DATASET_PATH = os.path.join(MODEL_DIR, 'base_report_dataset.csv')

def generate_report_dataset():
    """Generates synthetic medical report findings mapped to actual problems."""
    
    data = [
        # Hematology / Anemia
        ("low hemoglobin low hb fatigue weakness pallor", "Anemia"),
        ("hemoglobin 9.0 g/dL low rbc count low iron", "Anemia (Iron Deficiency)"),
        ("high wbc count leukocytosis fever infection", "Systemic Infection / Inflammation"),
        
        # Diabetes
        ("high fasting glucose hba1c 7.5 high blood sugar", "Diabetes Mellitus Type 2"),
        ("glucose 180 mg/dL hba1c 8.0 polyuria polydipsia", "Uncontrolled Diabetes"),
        ("glucose 110 mg/dL hba1c 5.9 prediabetes", "Pre-Diabetes"),
        
        # Thyroid
        ("high tsh low t4 weight gain fatigue feeling cold", "Hypothyroidism"),
        ("low tsh high t4 weight loss rapid heartbeat", "Hyperthyroidism"),
        
        # Lipid Profile / Cardiology
        ("high total cholesterol high ldl high triglycerides", "Hyperlipidemia / High Cardiovascular Risk"),
        ("ldl 160 mg/dL cholesterol 240 mg/dL", "Hypercholesterolemia"),
        
        # Liver
        ("high sgpt high sgot ast alt elevated bilirubin jaundice", "Liver Dysfunction / Hepatitis"),
        
        # Kidney
        ("high creatinine high urea low egfr reduced kidney function", "Chronic Kidney Disease (CKD) / Renal Impairment"),
        ("protein in urine hematuria frothy urine", "Proteinuria / Possible Kidney Damage"),
        
        # Vitamins
        ("low vitamin d 15 ng/ml bone pain weakness", "Vitamin D Deficiency"),
        ("low vitamin b12 150 pg/ml tingling neuropathy", "Vitamin B12 Deficiency"),
        
        # General / Normal
        ("all values within normal range healthy report", "No significant abnormalities detected"),
        ("hemoglobin 14 glucose 90 tsh 2.0 normal limits", "No significant abnormalities detected")
    ]
    
    # Duplicate and add variations to create a robust enough dataset for scikit-learn
    expanded_data = []
    for _ in range(20): 
        expanded_data.extend(data)
        
    df = pd.DataFrame(expanded_data, columns=['report_text', 'actual_problem'])
    
    if not os.path.exists(MODEL_DIR):
        os.makedirs(MODEL_DIR)
        
    df.to_csv(DATASET_PATH, index=False)
    print(f"Generated base report dataset with {len(df)} records at {DATASET_PATH}")
    return df

def train_model(df):
    """Trains a TF-IDF + Random Forest Pipeline and saves it."""
    
    X = df['report_text']
    y = df['actual_problem']
    
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(stop_words='english', ngram_range=(1, 2))),
        ('clf', RandomForestClassifier(n_estimators=100, random_state=42))
    ])
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training report analysis model...")
    pipeline.fit(X_train, y_train)
    
    print("Model accuracy on test set:", pipeline.score(X_test, y_test))
    
    joblib.dump(pipeline, MODEL_PATH)
    print(f"Report Model successfully saved to {MODEL_PATH}")

if __name__ == '__main__':
    print("--- Medical Report AI Data Prep & Training ---")
    df = generate_report_dataset()
    train_model(df)
