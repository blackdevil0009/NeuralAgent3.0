import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class AiScreen extends StatefulWidget {
  final String role;
  const AiScreen({super.key, required this.role});

  @override
  State<AiScreen> createState() => _AiScreenState();
}

class _AiScreenState extends State<AiScreen> {
  @override
  Widget build(BuildContext context) {
    if (widget.role.toLowerCase() == 'doctor') {
      return const DoctorAiScreen();
    } else {
      return const PatientAiScreen();
    }
  }
}

// -------------------------------------------------------------
// PATIENT AI ASSISTANT (Chatbot with Quick Prompts)
// -------------------------------------------------------------
class PatientAiScreen extends StatefulWidget {
  const PatientAiScreen({super.key});

  @override
  State<PatientAiScreen> createState() => _PatientAiScreenState();
}

class _PatientAiScreenState extends State<PatientAiScreen> {
  final TextEditingController _messageCtrl = TextEditingController();
  final List<Map<String, dynamic>> _messages = [
    {
      'isUser': false,
      'text': 'Hello! 👋 I\'m your local Ayurveda AI Assistant. I can provide informational guidance based on traditional Ayurvedic wisdom. Tell me your symptoms or query!',
      'time': 'Just now',
    }
  ];

  final List<String> _quickPrompts = [
    '🤒 Common cold symptoms',
    '🦴 Remedies for joint pain',
    '🍬 Diabetes management',
    '🧘 Anxious and stressed',
    '🍵 Benefits of Ginger tea',
  ];

  void _sendMessage([String? prompt]) {
    final text = prompt ?? _messageCtrl.text.trim();
    if (text.isEmpty) return;

    setState(() {
      _messages.insert(0, {
        'isUser': true,
        'text': text,
        'time': 'Just now',
      });
      _messageCtrl.clear();
    });

    Future.delayed(const Duration(seconds: 1), () {
      if (mounted) {
        setState(() {
          _messages.insert(0, {
            'isUser': false,
            'text': 'Based on Ayurvedic principles, for "$text", it is recommended to balance your doshas. Keep hydrated and try incorporating warming spices like ginger or turmeric. (Note: Development Mode AI)',
            'time': 'Just now',
          });
        });
      }
    });
  }

  @override
  void dispose() {
    _messageCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7FDF9),
      appBar: AppBar(
        title: const Text('Ayurveda AI Assistant', style: TextStyle(fontFamily: 'PlayfairDisplay', fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.primaryGreen)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.primaryGreen),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              reverse: true,
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final msg = _messages[index];
                return _buildMessageBubble(msg['text'], msg['isUser']);
              },
            ),
          ),
          _buildQuickPrompts(),
          _buildInputArea(),
        ],
      ),
    );
  }

  Widget _buildMessageBubble(String text, bool isUser) {
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        constraints: const BoxConstraints(maxWidth: 280),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: isUser ? AppColors.primaryGreen : Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(isUser ? 16 : 0),
            bottomRight: Radius.circular(isUser ? 0 : 16),
          ),
          border: isUser ? null : Border.all(color: AppColors.inputBorder.withValues(alpha: 0.5)),
          boxShadow: [
            if (!isUser) BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 5, offset: const Offset(0, 2)),
          ],
        ),
        child: Text(
          text,
          style: TextStyle(fontFamily: 'Poppins', fontSize: 13, color: isUser ? Colors.white : AppColors.textDark, height: 1.4),
        ),
      ),
    );
  }

  Widget _buildQuickPrompts() {
    return Container(
      height: 50,
      margin: const EdgeInsets.only(bottom: 8),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _quickPrompts.length,
        itemBuilder: (context, index) {
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ActionChip(
              label: Text(_quickPrompts[index], style: const TextStyle(fontFamily: 'Poppins', fontSize: 11, color: AppColors.primaryGreen)),
              backgroundColor: const Color(0xFFF0FDF4),
              side: const BorderSide(color: const Color(0xFFDCFCE7)),
              onPressed: () => _sendMessage(_quickPrompts[index]),
            ),
          );
        },
      ),
    );
  }

  Widget _buildInputArea() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12).copyWith(bottom: MediaQuery.of(context).padding.bottom + 12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: AppColors.inputBorder.withValues(alpha: 0.5))),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _messageCtrl,
              decoration: InputDecoration(
                hintText: 'Ask about symptoms...',
                hintStyle: const TextStyle(fontFamily: 'Poppins', fontSize: 13, color: AppColors.textMuted),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: const BorderSide(color: AppColors.inputBorder)),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: const BorderSide(color: AppColors.inputBorder)),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: const BorderSide(color: AppColors.primaryGreen)),
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              ),
              onSubmitted: (_) => _sendMessage(),
            ),
          ),
          const SizedBox(width: 8),
          Container(
            decoration: BoxDecoration(
              color: const Color(0xFFF0FDF4),
              shape: BoxShape.circle,
              border: Border.all(color: const Color(0xFFDCFCE7)),
            ),
            child: IconButton(
              icon: const Icon(Icons.mic, color: AppColors.primaryGreen),
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Voice input simulated.')));
              },
            ),
          ),
          const SizedBox(width: 8),
          Container(
            decoration: const BoxDecoration(color: AppColors.primaryGreen, shape: BoxShape.circle),
            child: IconButton(
              icon: const Icon(Icons.send, color: Colors.white, size: 20),
              onPressed: () => _sendMessage(),
            ),
          ),
        ],
      ),
    );
  }
}

// -------------------------------------------------------------
// DOCTOR AI ASSISTANT (Clinical Analysis, IoT, Team)
// -------------------------------------------------------------
class DoctorAiScreen extends StatefulWidget {
  const DoctorAiScreen({super.key});

  @override
  State<DoctorAiScreen> createState() => _DoctorAiScreenState();
}

class _DoctorAiScreenState extends State<DoctorAiScreen> with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  String _selectedPatient = 'Rohit Sharma';
  bool _isAnalyzing = false;
  Map<String, dynamic>? _analysisResult;

  final List<Map<String, dynamic>> _mockIot = [
    {'label': 'ICU Ventilator-04', 'status': 'Stable', 'metric': '65% O2'},
    {'label': 'Cardiac Monitor-01', 'status': 'Active', 'metric': '72 BPM'},
    {'label': 'Smart Dialysis-A2', 'status': 'Operational', 'metric': 'BFR: 300'},
  ];

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  void _runAnalysis() async {
    setState(() => _isAnalyzing = true);
    await Future.delayed(const Duration(seconds: 2));
    if (mounted) {
      setState(() {
        _isAnalyzing = false;
        _analysisResult = {
          'patient': _selectedPatient,
          'result': 'Elevated WBC count detected. Recommend inflammatory markers check.',
          'dosha': 'Pitta aggravation indicated by recurring low-grade fever.',
        };
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7FDF9),
      appBar: AppBar(
        title: const Text('Clinical AI Assistant', style: TextStyle(fontFamily: 'PlayfairDisplay', fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.primaryGreen)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.primaryGreen),
        bottom: TabBar(
          controller: _tabCtrl,
          labelColor: AppColors.primaryGreen,
          unselectedLabelColor: AppColors.textMuted,
          indicatorColor: AppColors.primaryGreen,
          labelStyle: const TextStyle(fontFamily: 'Poppins', fontSize: 12, fontWeight: FontWeight.w600),
          tabs: const [
            Tab(text: 'Analysis'),
            Tab(text: 'IoT Monitor'),
            Tab(text: 'Team Live'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabCtrl,
        children: [
          _buildAnalysisTab(),
          _buildIotTab(),
          _buildTeamTab(),
        ],
      ),
    );
  }

  Widget _buildAnalysisTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Colors.white, Color(0xFFF9FDFA)]),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.inputBorder.withValues(alpha: 0.5)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('AI Report Interpreter', style: TextStyle(fontFamily: 'Poppins', fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textDark)),
                const SizedBox(height: 4),
                const Text('Scan patient reports for hidden clinical correlations.', style: TextStyle(fontFamily: 'Poppins', fontSize: 12, color: AppColors.textMuted)),
                const SizedBox(height: 20),
                const Text('SELECT PATIENT', style: AppTextStyles.label),
                const SizedBox(height: 6),
                DropdownButtonFormField<String>(
                  value: _selectedPatient,
                  items: ['Rohit Sharma', 'Anjali Gupta'].map((e) => DropdownMenuItem(value: e, child: Text(e, style: const TextStyle(fontFamily: 'Poppins', fontSize: 13)))).toList(),
                  onChanged: (v) => setState(() => _selectedPatient = v!),
                  decoration: InputDecoration(
                    filled: true, fillColor: AppColors.cardBg,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.inputBorder)),
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _isAnalyzing ? null : _runAnalysis,
                    icon: _isAnalyzing ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : const Icon(Icons.analytics),
                    label: Text(_isAnalyzing ? 'Analyzing...' : 'Run AI Insights', style: const TextStyle(fontFamily: 'Poppins')),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primaryGreen,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (_analysisResult != null) ...[
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: const Border(left: BorderSide(color: AppColors.accentGold, width: 5)),
                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, 4))],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Clinical AI Summary: ${_analysisResult!['patient']}', style: const TextStyle(fontFamily: 'Poppins', fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.textDark)),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: const Color(0xFFF8F9F8), borderRadius: BorderRadius.circular(12)),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('MODERN MED FINDINGS', style: TextStyle(fontFamily: 'Poppins', fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
                        const SizedBox(height: 6),
                        Text(_analysisResult!['result'], style: const TextStyle(fontFamily: 'Poppins', fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.errorRed)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: const Color(0xFFEAF5EE), borderRadius: BorderRadius.circular(12)),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('AYURVEDIC STATUS', style: TextStyle(fontFamily: 'Poppins', fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
                        const SizedBox(height: 6),
                        Text(_analysisResult!['dosha'], style: const TextStyle(fontFamily: 'Poppins', fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.primaryGreen)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ]
        ],
      ),
    );
  }

  Widget _buildIotTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        ..._mockIot.map((m) => Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.inputBorder.withValues(alpha: 0.5)),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(m['label'], style: const TextStyle(fontFamily: 'Poppins', fontSize: 11, color: AppColors.textMuted, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 4),
                    Text(m['metric'], style: const TextStyle(fontFamily: 'Poppins', fontSize: 22, fontWeight: FontWeight.w700, color: AppColors.textDark)),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(Icons.circle, size: 8, color: AppColors.primaryGreen),
                        const SizedBox(width: 6),
                        Text(m['status'], style: const TextStyle(fontFamily: 'Poppins', fontSize: 11, color: AppColors.primaryGreen, fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ],
                ),
              ),
              Container(
                width: 60, height: 40,
                decoration: BoxDecoration(color: const Color(0xFFF5F5F5), borderRadius: BorderRadius.circular(8)),
                child: const Icon(Icons.show_chart, color: AppColors.textMuted),
              ),
            ],
          ),
        )),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: const Color(0xFF1A1A1A), borderRadius: BorderRadius.circular(12)),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('[SYSTEM] HOSPITAL NETWORK AT 98% EFFICIENCY', style: TextStyle(fontFamily: 'monospace', color: Colors.greenAccent, fontSize: 11)),
              SizedBox(height: 8),
              Text('[IOT] VENTILATOR-04 UPDATED TO FIRMWARE V2.4', style: TextStyle(fontFamily: 'monospace', color: Colors.greenAccent, fontSize: 11)),
              SizedBox(height: 8),
              Text('[AI] PREDICTIVE ALERT: ICU-ROOM-2 TEMP FLUCTUATION DETECTED', style: TextStyle(fontFamily: 'monospace', color: Colors.orangeAccent, fontSize: 11)),
            ],
          ),
        )
      ],
    );
  }

  Widget _buildTeamTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          height: 250,
          decoration: BoxDecoration(
            color: const Color(0xFF222222),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Stack(
            alignment: Alignment.center,
            children: [
              const Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.videocam_outlined, size: 48, color: Colors.white54),
                  SizedBox(height: 12),
                  Text('Live Video Feed Disabled', style: TextStyle(fontFamily: 'Poppins', color: Colors.white54)),
                ],
              ),
              Positioned(
                bottom: 16, left: 16,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(color: Colors.red, borderRadius: BorderRadius.circular(20)),
                  child: const Text('LIVE 00:00:00', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700)),
                ),
              )
            ],
          ),
        ),
        const SizedBox(height: 24),
        const Text('Team Presence', style: TextStyle(fontFamily: 'Poppins', fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textDark)),
        const SizedBox(height: 12),
        ...['Dr. Sameer (Admin)', 'Nurse Maria', 'Tech Support #2'].map((name) => Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Row(
            children: [
              const Icon(Icons.circle, size: 12, color: Colors.greenAccent),
              const SizedBox(width: 12),
              Text(name, style: const TextStyle(fontFamily: 'Poppins', fontSize: 14)),
            ],
          ),
        )),
        const SizedBox(height: 16),
        TextField(
          decoration: InputDecoration(
            hintText: 'Quick team message...',
            hintStyle: const TextStyle(fontFamily: 'Poppins', fontSize: 13),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          ),
        ),
        const SizedBox(height: 12),
        ElevatedButton(
          onPressed: (){},
          style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryGreen, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 14)),
          child: const Text('Send Broadcast', style: TextStyle(fontFamily: 'Poppins')),
        ),
      ],
    );
  }
}
