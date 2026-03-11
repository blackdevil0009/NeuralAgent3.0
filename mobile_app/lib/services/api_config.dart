class ApiConfig {
  static const String baseUrl = 'http://148.230.66.181:5000';
  static const String hmacSecret = 'YOUR_HMAC_SECRET_KEY'; // In production, use a secure vault or env
  
  // Endpoints
  static const String login = '/api/login';
  static const String register = '/api/registration';
  static const String appointments = '/api/appointments';
  static const String doctors = '/api/doctors';
  static const String aiChat = '/api/ai/chat';
  static const String messagesHistory = '/api/v2/messages/history/';
  static const String sendMessage = '/api/v2/messages/send';
}
