// lib/services/wellness_service.dart
// VaidyaMed-X — Wellness AI Service (Flutter)
//
// Handles all wellness API communication:
//   - AI chat sessions
//   - Wellness daily logging
//   - Score retrieval
//   - Reminders CRUD
//   - Feedback submission

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_service.dart'; // existing service for base URL + auth headers

// ─────────────────────────────────────────────────────────────────
//  Data Models
// ─────────────────────────────────────────────────────────────────

class ChatMessage {
  final int id;
  final String sessionId;
  final String role; // 'user' | 'assistant'
  final String message;
  final String? matchedCondition;
  final double? confidence;
  final String? modelUsed;
  final DateTime createdAt;

  ChatMessage({
    required this.id,
    required this.sessionId,
    required this.role,
    required this.message,
    this.matchedCondition,
    this.confidence,
    this.modelUsed,
    required this.createdAt,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> j) => ChatMessage(
        id: j['id'],
        sessionId: j['session_id'] ?? '',
        role: j['role'] ?? 'user',
        message: j['message'] ?? '',
        matchedCondition: j['matched_condition'],
        confidence: j['confidence']?.toDouble(),
        modelUsed: j['model_used'],
        createdAt: j['created_at'] != null
            ? DateTime.parse(j['created_at'])
            : DateTime.now(),
      );
}

class ChatResponse {
  final String sessionId;
  final int conversationId;
  final String response;
  final String? matchedCondition;
  final double? confidence;
  final List<String> ragSources;
  final String modelUsed;

  ChatResponse({
    required this.sessionId,
    required this.conversationId,
    required this.response,
    this.matchedCondition,
    this.confidence,
    required this.ragSources,
    required this.modelUsed,
  });

  factory ChatResponse.fromJson(Map<String, dynamic> j) => ChatResponse(
        sessionId: j['session_id'] ?? '',
        conversationId: j['conversation_id'] ?? 0,
        response: j['response'] ?? '',
        matchedCondition: j['matched_condition'],
        confidence: j['confidence']?.toDouble(),
        ragSources: List<String>.from(j['rag_sources'] ?? []),
        modelUsed: j['model_used'] ?? '',
      );
}

class WellnessLog {
  final int? id;
  final String logDate;
  final double? sleepHours;
  final int? waterMl;
  final int? steps;
  final int? exerciseMin;
  final int? stressLevel;
  final String? mood;
  final int? mealsLogged;
  final String? dietQuality;
  final String? dietNotes;
  final bool? medicinesTaken;

  WellnessLog({
    this.id,
    required this.logDate,
    this.sleepHours,
    this.waterMl,
    this.steps,
    this.exerciseMin,
    this.stressLevel,
    this.mood,
    this.mealsLogged,
    this.dietQuality,
    this.dietNotes,
    this.medicinesTaken,
  });

  factory WellnessLog.fromJson(Map<String, dynamic> j) => WellnessLog(
        id: j['id'],
        logDate: j['log_date'] ?? '',
        sleepHours: j['sleep_hours']?.toDouble(),
        waterMl: j['water_ml'],
        steps: j['steps'],
        exerciseMin: j['exercise_min'],
        stressLevel: j['stress_level'],
        mood: j['mood'],
        mealsLogged: j['meals_logged'],
        dietQuality: j['diet_quality'],
        dietNotes: j['diet_notes'],
        medicinesTaken: j['medicines_taken'],
      );

  Map<String, dynamic> toJson() => {
        'log_date': logDate,
        if (sleepHours != null) 'sleep_hours': sleepHours,
        if (waterMl != null) 'water_ml': waterMl,
        if (steps != null) 'steps': steps,
        if (exerciseMin != null) 'exercise_min': exerciseMin,
        if (stressLevel != null) 'stress_level': stressLevel,
        if (mood != null) 'mood': mood,
        if (mealsLogged != null) 'meals_logged': mealsLogged,
        if (dietQuality != null) 'diet_quality': dietQuality,
        if (dietNotes != null) 'diet_notes': dietNotes,
        if (medicinesTaken != null) 'medicines_taken': medicinesTaken,
      };
}

class WellnessScore {
  final double score;
  final Map<String, dynamic> breakdown;
  final String date;
  final String? recommendations;
  final bool logExists;

  WellnessScore({
    required this.score,
    required this.breakdown,
    required this.date,
    this.recommendations,
    required this.logExists,
  });

  factory WellnessScore.fromJson(Map<String, dynamic> j) => WellnessScore(
        score: (j['score'] ?? 0).toDouble(),
        breakdown: Map<String, dynamic>.from(j['breakdown'] ?? {}),
        date: j['date'] ?? '',
        recommendations: j['recommendations'],
        logExists: j['log_exists'] ?? false,
      );

  String get grade {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Needs Attention';
  }
}

class Reminder {
  final int? id;
  final String title;
  final String? description;
  final String type; // medicine | water | diet | sleep | exercise | custom
  final String remindAt; // HH:MM
  final String repeat; // once | daily | weekly | monthly
  final bool isActive;
  final String? startDate;
  final String? endDate;
  final String? daysOfWeek;

  Reminder({
    this.id,
    required this.title,
    this.description,
    required this.type,
    required this.remindAt,
    this.repeat = 'daily',
    this.isActive = true,
    this.startDate,
    this.endDate,
    this.daysOfWeek,
  });

  factory Reminder.fromJson(Map<String, dynamic> j) => Reminder(
        id: j['id'],
        title: j['title'] ?? '',
        description: j['description'],
        type: j['type'] ?? 'custom',
        remindAt: j['remind_at'] ?? '08:00',
        repeat: j['repeat'] ?? 'daily',
        isActive: j['is_active'] ?? true,
        startDate: j['start_date'],
        endDate: j['end_date'],
        daysOfWeek: j['days_of_week'],
      );

  Map<String, dynamic> toJson() => {
        'title': title,
        if (description != null) 'description': description,
        'type': type,
        'remind_at': remindAt,
        'repeat': repeat,
        'is_active': isActive,
        if (startDate != null) 'start_date': startDate,
        if (endDate != null) 'end_date': endDate,
        if (daysOfWeek != null) 'days_of_week': daysOfWeek,
      };
}

// ─────────────────────────────────────────────────────────────────
//  Wellness Service
// ─────────────────────────────────────────────────────────────────

class WellnessService {
  final ApiService _api;

  WellnessService(this._api);

  // ── AI Chat ───────────────────────────────────────────────────

  /// Send a message to the wellness AI. Optionally pass [sessionId] to continue
  /// an existing chat session, or leave null to start a new one.
  Future<ChatResponse> sendMessage(String message, {String? sessionId}) async {
    final response = await _api.post(
      '/wellness/chat',
      body: {
        'message': message,
        if (sessionId != null) 'session_id': sessionId,
      },
    );
    _checkSuccess(response, 'sendMessage');
    return ChatResponse.fromJson(response['data']);
  }

  Future<List<Map<String, dynamic>>> getChatSessions() async {
    final response = await _api.get('/wellness/chat/sessions');
    _checkSuccess(response, 'getChatSessions');
    return List<Map<String, dynamic>>.from(response['data']['sessions'] ?? []);
  }

  Future<List<ChatMessage>> getChatHistory({String? sessionId, int limit = 50}) async {
    final params = <String, String>{'limit': '$limit'};
    if (sessionId != null) params['session_id'] = sessionId;
    final response = await _api.get('/wellness/chat/history', queryParams: params);
    _checkSuccess(response, 'getChatHistory');
    return (response['data']['history'] as List)
        .map((m) => ChatMessage.fromJson(m))
        .toList();
  }

  // ── Feedback ──────────────────────────────────────────────────

  Future<void> submitFeedback({
    required int conversationId,
    int? rating,
    bool? wasHelpful,
    bool? noticedImprovement,
    String? comment,
  }) async {
    await _api.post(
      '/wellness/feedback',
      body: {
        'conversation_id': conversationId,
        if (rating != null) 'rating': rating,
        if (wasHelpful != null) 'was_helpful': wasHelpful,
        if (noticedImprovement != null) 'noticed_improvement': noticedImprovement,
        if (comment != null) 'comment': comment,
      },
    );
  }

  // ── Wellness Log ──────────────────────────────────────────────

  Future<Map<String, dynamic>> saveWellnessLog(WellnessLog log) async {
    final response = await _api.post('/wellness/log', body: log.toJson());
    _checkSuccess(response, 'saveWellnessLog');
    return response['data'];
  }

  Future<WellnessLog?> getTodayLog() async {
    final response = await _api.get('/wellness/log/today');
    _checkSuccess(response, 'getTodayLog');
    final logJson = response['data']['log'];
    return logJson != null ? WellnessLog.fromJson(logJson) : null;
  }

  Future<List<WellnessLog>> getLogHistory({int days = 7}) async {
    final response = await _api.get(
      '/wellness/log/history',
      queryParams: {'days': '$days'},
    );
    _checkSuccess(response, 'getLogHistory');
    return (response['data']['logs'] as List)
        .map((l) => WellnessLog.fromJson(l))
        .toList();
  }

  // ── Wellness Score ────────────────────────────────────────────

  Future<WellnessScore> getTodayScore() async {
    final response = await _api.get('/wellness/score');
    _checkSuccess(response, 'getTodayScore');
    return WellnessScore.fromJson(response['data']);
  }

  Future<List<WellnessScore>> getScoreHistory({int days = 30}) async {
    final response = await _api.get(
      '/wellness/score/history',
      queryParams: {'days': '$days'},
    );
    _checkSuccess(response, 'getScoreHistory');
    return (response['data']['scores'] as List)
        .map((s) => WellnessScore.fromJson(s))
        .toList();
  }

  // ── Reminders ─────────────────────────────────────────────────

  Future<Reminder> createReminder(Reminder reminder) async {
    final response = await _api.post('/wellness/reminders', body: reminder.toJson());
    _checkSuccess(response, 'createReminder');
    return Reminder.fromJson(response['data']);
  }

  Future<List<Reminder>> getReminders({bool activeOnly = true}) async {
    final response = await _api.get(
      '/wellness/reminders',
      queryParams: {'active': activeOnly ? 'true' : 'false'},
    );
    _checkSuccess(response, 'getReminders');
    return (response['data']['reminders'] as List)
        .map((r) => Reminder.fromJson(r))
        .toList();
  }

  Future<Reminder> updateReminder(int id, Map<String, dynamic> updates) async {
    final response = await _api.put('/wellness/reminders/$id', body: updates);
    _checkSuccess(response, 'updateReminder');
    return Reminder.fromJson(response['data']);
  }

  Future<void> deleteReminder(int id) async {
    await _api.delete('/wellness/reminders/$id');
  }

  // ── Private ───────────────────────────────────────────────────

  void _checkSuccess(Map<String, dynamic> response, String caller) {
    if (response['success'] != true) {
      throw Exception(
        '[$caller] ${response['message'] ?? 'An error occurred'}',
      );
    }
  }
}
