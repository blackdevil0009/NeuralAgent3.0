from flask import Blueprint
from app.controllers.ml_controller import upload_dataset, train_model, predict

ml_bp = Blueprint('ml', __name__)

ml_bp.route('/upload-dataset', methods=['POST'])(upload_dataset)
ml_bp.route('/train', methods=['POST'])(train_model)
ml_bp.route('/predict', methods=['POST'])(predict)
