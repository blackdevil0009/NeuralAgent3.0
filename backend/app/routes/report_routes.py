from flask import Blueprint
from app.middleware import jwt_required_custom
from app.controllers.report_controller import (
    list_reports, upload_report, download_report, analyze_report, delete_report
)

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/api/reports', methods=['GET'])
@jwt_required_custom
def get_reports():
    return list_reports()

@reports_bp.route('/api/reports', methods=['POST'])
@jwt_required_custom
def post_report():
    return upload_report()

@reports_bp.route('/api/reports/<int:report_id>/file', methods=['GET'])
@jwt_required_custom
def get_report_file(report_id):
    return download_report(report_id)

@reports_bp.route('/api/reports/<int:report_id>/analyze', methods=['POST'])
@jwt_required_custom
def post_analyze(report_id):
    return analyze_report(report_id)

@reports_bp.route('/api/reports/<int:report_id>', methods=['DELETE'])
@jwt_required_custom
def remove_report(report_id):
    return delete_report(report_id)
