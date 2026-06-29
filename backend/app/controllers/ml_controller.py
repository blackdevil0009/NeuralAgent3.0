from flask import request
from app.utils import success_response, error_response
from app.services.ml_training_service import ml_service
import os

def upload_dataset():
    """POST /api/ml/upload-dataset"""
    if 'file' not in request.files:
        return error_response('No file provided.', 400)
    
    file = request.files['file']
    if file.filename == '':
        return error_response('Empty file provided.', 400)
    
    if not file.filename.endswith('.csv') and not file.filename.endswith('.json'):
        return error_response('Only .csv and .json files are supported.', 400)
    
    try:
        dataset_path = ml_service.save_dataset(file, file.filename)
        return success_response(
            message='Dataset uploaded successfully.',
            data={'dataset_path': dataset_path}
        )
    except Exception as e:
        return error_response(f"Error saving dataset: {e}", 500)

def train_model():
    """POST /api/ml/train"""
    data = request.get_json(force=True, silent=True) or {}
    dataset_path = data.get('dataset_path')
    target_column = data.get('target_column')

    if not dataset_path or not target_column:
        return error_response('dataset_path and target_column are required.', 400)

    if not os.path.exists(dataset_path):
        return error_response('Dataset not found.', 404)

    # Note: For large datasets, this should be sent to a Celery queue
    # For now, it runs synchronously.
    result = ml_service.train_model(dataset_path, target_column)
    
    if result.get('success'):
        return success_response(
            message='Model trained successfully.',
            data=result
        )
    else:
        return error_response(result.get('error', 'Training failed.'), 500)

def predict():
    """POST /api/ml/predict"""
    data = request.get_json(force=True, silent=True) or {}
    model_id = data.get('model_id')
    input_data = data.get('input_data')

    if not model_id or not input_data:
        return error_response('model_id and input_data are required.', 400)

    result = ml_service.predict(model_id, input_data)
    if result.get('success'):
        return success_response(
            message='Prediction successful.',
            data={'predictions': result['predictions']}
        )
    else:
        return error_response(result.get('error', 'Prediction failed.'), 500)
