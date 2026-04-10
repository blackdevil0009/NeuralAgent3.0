"""
app/utils/response.py — Standardised JSON Response Helpers

All API responses follow this envelope:
  {
    "success": true | false,
    "data":    { ... }   | null,
    "error":   null      | "message string"
  }
"""

from flask import jsonify


def success_response(data=None, message: str = 'OK', status_code: int = 200):
    """Return a successful JSON response."""
    payload = {'success': True}
    if message:
        payload['data'] = {'message': message, **(data or {})} if isinstance(data, dict) else \
                          {'message': message, 'result': data} if data is not None else \
                          {'message': message}
    else:
        payload['data'] = data
    payload['error'] = None
    return jsonify(payload), status_code


def error_response(message: str = 'An error occurred',
                   status_code: int = 400, errors: dict = None):
    """Return an error JSON response."""
    payload = {
        'success': False,
        'data':    {'message': message, 'errors': errors} if errors else {'message': message},
        'error':   message,
    }
    return jsonify(payload), status_code


def created_response(data=None, message: str = 'Created successfully'):
    return success_response(data=data, message=message, status_code=201)


def unauthorized_response(message: str = 'Unauthorized', error_code: str = None):
    return error_response(message=message, status_code=401, errors={'code': error_code} if error_code else None)


def forbidden_response(message: str = 'Forbidden'):
    return error_response(message=message, status_code=403)


def not_found_response(message: str = 'Resource not found'):
    return error_response(message=message, status_code=404)


def server_error_response(message: str = 'Internal server error'):
    return error_response(message=message, status_code=500)
