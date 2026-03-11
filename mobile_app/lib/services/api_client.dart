import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:dio/dio.dart';
import 'api_config.dart';

class ApiClient {
  late Dio _dio;
  String? _token;

  ApiClient() {
    _dio = Dio(BaseOptions(
      baseUrl: ApiConfig.baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        final timestamp = (DateTime.now().millisecondsSinceEpoch ~/ 1000).toString();
        
        // HMAC Signature logic (DEV_BYPASS for now as per backend changes)
        options.headers['X-Timestamp'] = timestamp;
        options.headers['X-HMAC-Signature'] = 'DEV_BYPASS'; 
        
        if (_token != null) {
          options.headers['Authorization'] = 'Bearer $_token';
        }
        
        return handler.next(options);
      },
      onError: (e, handler) {
        print('API Error: ${e.message}');
        return handler.next(e);
      },
    ));
  }

  void setToken(String token) {
    _token = token;
  }

  Future<Response> get(String path, {Map<String, dynamic>? queryParameters}) async {
    return await _dio.get(path, queryParameters: queryParameters);
  }

  Future<Response> post(String path, {dynamic data}) async {
    return await _dio.post(path, data: data);
  }

  Future<Response> put(String path, {dynamic data}) async {
    return await _dio.put(path, data: data);
  }
}

// Global instance or use provider/riverpod
final apiClient = ApiClient();
