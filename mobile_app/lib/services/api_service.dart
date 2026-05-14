import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// Central API configuration for VaidyaMed-X Flutter app.
/// Android emulator uses 10.0.2.2 to reach the host machine's localhost.
/// Physical device: replace with your PC's local IP (e.g. 192.168.1.10).
class ApiConfig {
  // ─── Direct networking is blocked by emulator, using ADB reverse ───
  static const String _localHost =
      kIsWeb ? 'localhost' : 'http://127.0.0.1:5002';

  static const String baseUrl = _localHost;

  // Auth
  static const String login = '$baseUrl/api/auth/login';
  static const String register = '$baseUrl/api/auth/register';
  static const String profile = '$baseUrl/api/user/profile';

  // Messages
  static const String conversations = '$baseUrl/api/messages';
  static String messageHistory(String peerId) =>
      '$baseUrl/api/v2/messages/history/$peerId';
  static const String sendMessage = '$baseUrl/api/v2/messages/send';

  // Appointments
  static const String appointments = '$baseUrl/api/appointments';
  static String appointmentById(String id) =>
      '$baseUrl/api/appointments/$id';
}

/// Helper to get the stored JWT token.
class AuthService {
  static const _tokenKey = 'vx_token';
  static const _userKey = 'vx_user';

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  static Future<void> saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
  }

  static Future<void> saveUser(Map<String, dynamic> user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userKey, jsonEncode(user));
  }

  static Future<Map<String, dynamic>?> getUser() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_userKey);
    if (raw == null) return null;
    return jsonDecode(raw) as Map<String, dynamic>;
  }

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_userKey);
  }

  /// Returns headers with Bearer token.
  static Future<Map<String, String>> authHeaders() async {
    final token = await getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  /// Extract the current user's ID from the JWT payload.
  static String? extractUserId(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return null;
      final payload = utf8.decode(base64Url.decode(base64Url.normalize(parts[1])));
      final map = jsonDecode(payload) as Map<String, dynamic>;
      return map['sub']?.toString() ?? map['id']?.toString();
    } catch (_) {
      return null;
    }
  }
}

/// Generic API response wrapper.
class ApiResponse<T> {
  final T? data;
  final String? error;
  final int statusCode;
  bool get ok => statusCode >= 200 && statusCode < 300;

  const ApiResponse({this.data, this.error, required this.statusCode});
}

/// Thin HTTP client wrappers.
class ApiClient {
  static Future<ApiResponse<Map<String, dynamic>>> get(String url) async {
    try {
      final headers = await AuthService.authHeaders();
      final res = await http.get(Uri.parse(url), headers: headers)
          .timeout(const Duration(seconds: 12));
      final body = jsonDecode(res.body) as Map<String, dynamic>;
      return ApiResponse(data: body, statusCode: res.statusCode);
    } catch (e) {
      return ApiResponse(error: e.toString(), statusCode: 0);
    }
  }

  static Future<ApiResponse<Map<String, dynamic>>> post(
      String url, Map<String, dynamic> payload) async {
    try {
      final headers = await AuthService.authHeaders();
      final res = await http
          .post(Uri.parse(url), headers: headers, body: jsonEncode(payload))
          .timeout(const Duration(seconds: 12));
      final body = jsonDecode(res.body) as Map<String, dynamic>;
      return ApiResponse(data: body, statusCode: res.statusCode);
    } catch (e) {
      return ApiResponse(error: e.toString(), statusCode: 0);
    }
  }

  static Future<ApiResponse<Map<String, dynamic>>> postMultipart(
      String url, Map<String, String> fields,
      {String? fileField, String? filePath, List<int>? fileBytes, String? fileName}) async {
    try {
      final token = await AuthService.getToken();
      final request = http.MultipartRequest('POST', Uri.parse(url));

      if (token != null) {
        request.headers['Authorization'] = 'Bearer $token';
      }

      request.fields.addAll(fields);

      if (fileField != null) {
        if (filePath != null) {
          request.files.add(await http.MultipartFile.fromPath(fileField, filePath));
        } else if (fileBytes != null && fileName != null) {
          request.files.add(http.MultipartFile.fromBytes(fileField, fileBytes, filename: fileName));
        }
      }

      final streamedResponse = await request.send().timeout(const Duration(seconds: 30));
      final response = await http.Response.fromStream(streamedResponse);
      final body = jsonDecode(response.body) as Map<String, dynamic>;
      return ApiResponse(data: body, statusCode: response.statusCode);
    } catch (e) {
      return ApiResponse(error: e.toString(), statusCode: 0);
    }
  }
}
