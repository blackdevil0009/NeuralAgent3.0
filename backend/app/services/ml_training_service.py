import os
import logging
import uuid
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score

logger = logging.getLogger(__name__)

# A registry to hold active label encoders so predictions can map back strings if needed
# In a real enterprise app, you would save these along with the model!
class MLTrainingService:
    def __init__(self, base_dir="ml_models"):
        self.base_dir = base_dir
        os.makedirs(self.base_dir, exist_ok=True)
        os.makedirs(os.path.join(self.base_dir, 'datasets'), exist_ok=True)
        os.makedirs(os.path.join(self.base_dir, 'models'), exist_ok=True)

    def save_dataset(self, file_stream, filename):
        """Save an uploaded dataset to disk and return the path."""
        ext = filename.rsplit('.', 1)[1].lower()
        unique_name = f"{uuid.uuid4().hex}.{ext}"
        filepath = os.path.join(self.base_dir, 'datasets', unique_name)
        file_stream.save(filepath)
        return filepath

    def train_model(self, dataset_path, target_column):
        """Train a basic classification model on the dataset."""
        try:
            # 1. Load data
            if dataset_path.endswith('.csv'):
                df = pd.read_csv(dataset_path)
            elif dataset_path.endswith('.json'):
                df = pd.read_json(dataset_path)
            else:
                return {"success": False, "error": "Unsupported file format."}

            if target_column not in df.columns:
                return {"success": False, "error": f"Target column '{target_column}' not found in dataset."}

            # 2. Preprocess
            # Separate features (X) and target (y)
            X = df.drop(columns=[target_column])
            y = df[target_column]

            # Drop completely empty columns
            X = X.dropna(axis=1, how='all')

            # Impute missing values (fill NaNs)
            num_cols = X.select_dtypes(include=['int64', 'float64']).columns
            cat_cols = X.select_dtypes(include=['object', 'bool']).columns

            if not num_cols.empty:
                num_imputer = SimpleImputer(strategy='mean')
                X[num_cols] = num_imputer.fit_transform(X[num_cols])
            
            if not cat_cols.empty:
                cat_imputer = SimpleImputer(strategy='most_frequent')
                X[cat_cols] = cat_imputer.fit_transform(X[cat_cols])

            # Encode categorical features
            label_encoders = {}
            for col in cat_cols:
                le = LabelEncoder()
                X[col] = le.fit_transform(X[col].astype(str))
                label_encoders[col] = le

            # Encode target if categorical
            target_encoder = None
            if y.dtype == 'object' or y.dtype == 'bool':
                target_encoder = LabelEncoder()
                y = target_encoder.fit_transform(y.astype(str))

            # 3. Split data
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

            # 4. Train Model (Random Forest for robust general performance)
            model = RandomForestClassifier(n_estimators=100, random_state=42)
            model.fit(X_train, y_train)

            # 5. Evaluate
            predictions = model.predict(X_test)
            accuracy = accuracy_score(y_test, predictions)

            # 6. Save Model and Encoders
            model_id = uuid.uuid4().hex
            model_artifact = {
                'model': model,
                'features': list(X.columns),
                'label_encoders': label_encoders,
                'target_encoder': target_encoder,
                'target_column': target_column
            }
            
            model_path = os.path.join(self.base_dir, 'models', f"{model_id}.joblib")
            joblib.dump(model_artifact, model_path)

            return {
                "success": True,
                "model_id": model_id,
                "accuracy": round(accuracy * 100, 2),
                "features": list(X.columns)
            }
        except Exception as e:
            logger.error(f"Error training model: {e}", exc_info=True)
            return {"success": False, "error": str(e)}

    def predict(self, model_id, input_data):
        """Predict using a trained model."""
        model_path = os.path.join(self.base_dir, 'models', f"{model_id}.joblib")
        if not os.path.exists(model_path):
            return {"success": False, "error": "Model not found."}

        try:
            artifact = joblib.load(model_path)
            model = artifact['model']
            features = artifact['features']
            label_encoders = artifact['label_encoders']
            target_encoder = artifact['target_encoder']

            # Create DataFrame from input
            if isinstance(input_data, dict):
                df_input = pd.DataFrame([input_data])
            else:
                df_input = pd.DataFrame(input_data)

            # Ensure all features exist
            for f in features:
                if f not in df_input.columns:
                    df_input[f] = 0 # Default missing features to 0

            # Order columns correctly
            df_input = df_input[features]

            # Encode categoricals using saved encoders
            for col, le in label_encoders.items():
                if col in df_input.columns:
                    # Handle unseen labels gracefully by assigning a default or -1
                    # A robust production system uses OneHotEncoder with handle_unknown='ignore'
                    # Here we map known classes and set -1 for unknowns
                    classes = dict(zip(le.classes_, le.transform(le.classes_)))
                    df_input[col] = df_input[col].apply(lambda x: classes.get(str(x), -1))

            # Predict
            pred = model.predict(df_input)

            # Decode target if it was encoded
            if target_encoder:
                pred = target_encoder.inverse_transform(pred)

            return {"success": True, "predictions": pred.tolist()}
        except Exception as e:
            logger.error(f"Error predicting: {e}", exc_info=True)
            return {"success": False, "error": str(e)}

    def get_latest_model_id(self):
        """Find and return the ID of the most recently trained model."""
        models_dir = os.path.join(self.base_dir, 'models')
        if not os.path.exists(models_dir):
            return None
        
        files = [os.path.join(models_dir, f) for f in os.listdir(models_dir) if f.endswith('.joblib')]
        if not files:
            return None
            
        latest_file = max(files, key=os.path.getmtime)
        return os.path.basename(latest_file).replace('.joblib', '')

ml_service = MLTrainingService()
