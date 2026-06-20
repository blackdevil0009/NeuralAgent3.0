import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// Central API configuration for VaidyaMed-X Flutter app.
///
/// ── Production SSL Backend ───────────────────────────────────────────────
/// The app is configured to connect to the live SSL backend:
///   https://api.vaidyamedx.in
///
/// ── Localhost connectivity on a PHYSICAL ANDROID DEVICE (For Dev) ────────
/// The backend runs on your PC at port 5002. On a physical device connected
/// via USB or ADB-over-WiFi, `127.0.0.1` resolves to the **device itself**,
/// not the PC. We fix this with ADB reverse port forwarding, which tunnels
/// the device's loopback → PC's loopback:
///
///   adb reverse tcp:5002 tcp:5002
///
/// Run this once after connecting the device. Flutter hot-restart is enough
/// after that. The HTTP URL `http://127.0.0.1:5002` then works on both the
/// emulator and physical device transparently.
///
/// For the Android emulator only (no ADB reverse needed):
///   use http://10.0.2.2:5002 instead.
class ApiConfig {
  // ─── Base URL ───────────────────────────────────────────────────────────
  // Production SSL Backend → https://api.vaidyamedx.in
  // Physical device + ADB reverse → http://127.0.0.1:5002
  // Android emulator (no ADB reverse) → http://10.0.2.2:5002
  // Web → http://localhost:5002
  static const String _host = 'https://api.vaidyamedx.in';

  static const String baseUrl = _host;

  // ── Auth ────────────────────────────────────────────────────────────────
  static const String register              = '$baseUrl/api/auth/register';
  static const String login                 = '$baseUrl/api/auth/login';
  static const String verifyRegistrationOtp = '$baseUrl/api/auth/verify-registration-otp';
  static const String verify2faOtp          = '$baseUrl/api/auth/verify-2fa-otp';
  static const String resendVerification    = '$baseUrl/api/auth/resend-verification';
  static const String resend2faOtp          = '$baseUrl/api/auth/resend-2fa-otp';
  static const String forgotPassword        = '$baseUrl/api/auth/forgot-password';
  static const String resetPassword         = '$baseUrl/api/auth/reset-password';
  static const String toggle2fa             = '$baseUrl/api/auth/2fa/toggle';
  static const String verifyDocument        = '$baseUrl/api/auth/verify-document';

  // ── User / Profile / Doctors ─────────────────────────────────────────────
  static const String profile               = '$baseUrl/api/user/profile';
  static const String doctors               = '$baseUrl/api/doctors';
  static const String notifications         = '$baseUrl/api/notifications';
  static const String verifyUpi             = '$baseUrl/api/doctor/verify-upi';
  static String lookupIfsc(String code)     => '$baseUrl/api/utils/ifsc/$code';

  // ── Appointments ────────────────────────────────────────────────────────
  static const String appointments          = '$baseUrl/api/appointments';
  static const String createOrder           = '$baseUrl/api/appointments/create-order';
  static const String verifyPayment         = '$baseUrl/api/appointments/verify-payment';
  static String appointmentById(String id)  => '$baseUrl/api/appointments/$id';

  // ── Reports ─────────────────────────────────────────────────────────────
  static const String reports               = '$baseUrl/api/reports';
  static String analyzeReport(String id)    => '$baseUrl/api/reports/$id/analyze';
  static String deleteReport(String id)     => '$baseUrl/api/reports/$id';

  // ── Emergencies ─────────────────────────────────────────────────────────
  static const String emergencyOptions      = '$baseUrl/api/emergencies/options';
  static const String emergencies           = '$baseUrl/api/emergencies';
  static const String myEmergencies         = '$baseUrl/api/emergencies/my';
  static String resolveEmergency(String id) => '$baseUrl/api/emergencies/$id/handle';

  // ── AI ──────────────────────────────────────────────────────────────────
  static const String aiQuery               = '$baseUrl/api/v2/ai/query';

  // ── Messages ────────────────────────────────────────────────────────────
  static const String conversations         = '$baseUrl/api/messages';
  static const String uploadMessage         = '$baseUrl/api/messages/upload';
  static const String sendMessage           = '$baseUrl/api/v2/messages/send';
  static String messageHistory(String peerId) =>
      '$baseUrl/api/v2/messages/history/$peerId';

  // ── WebSocket ────────────────────────────────────────────────────────────
  /// Socket.IO server URL (same host, no path prefix)
  static const String socketUrl             = _host;
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

  static Future<ApiResponse<Map<String, dynamic>>> delete(String url) async {
    try {
      final headers = await AuthService.authHeaders();
      final res = await http
          .delete(Uri.parse(url), headers: headers)
          .timeout(const Duration(seconds: 12));
      final body = jsonDecode(res.body) as Map<String, dynamic>;
      return ApiResponse(data: body, statusCode: res.statusCode);
    } catch (e) {
      return ApiResponse(error: e.toString(), statusCode: 0);
    }
  }

  static Future<ApiResponse<Map<String, dynamic>>> put(
      String url, Map<String, dynamic> payload) async {
    try {
      final headers = await AuthService.authHeaders();
      final res = await http
          .put(Uri.parse(url), headers: headers, body: jsonEncode(payload))
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

/// Dynamic API Service wrapper for modular endpoints
class ApiService {
  Future<Map<String, dynamic>> get(String path, {Map<String, dynamic>? queryParams}) async {
    String url = '${ApiConfig.baseUrl}$path';
    if (queryParams != null && queryParams.isNotEmpty) {
      url = Uri.parse(url).replace(queryParameters: queryParams.map((k, v) => MapEntry(k, v.toString()))).toString();
    }
    final res = await ApiClient.get(url);
    if (res.data != null) return res.data!;
    return {'success': false, 'message': res.error ?? 'API Error'};
  }

  Future<Map<String, dynamic>> post(String path, {Map<String, dynamic>? body}) async {
    final res = await ApiClient.post('${ApiConfig.baseUrl}$path', body ?? {});
    if (res.data != null) return res.data!;
    return {'success': false, 'message': res.error ?? 'API Error'};
  }

  Future<Map<String, dynamic>> put(String path, {Map<String, dynamic>? body}) async {
    final res = await ApiClient.put('${ApiConfig.baseUrl}$path', body ?? {});
    if (res.data != null) return res.data!;
    return {'success': false, 'message': res.error ?? 'API Error'};
  }

  Future<Map<String, dynamic>> delete(String path) async {
    final res = await ApiClient.delete('${ApiConfig.baseUrl}$path');
    if (res.data != null) return res.data!;
    return {'success': false, 'message': res.error ?? 'API Error'};
  }
}
