import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:animated_text_kit/animated_text_kit.dart';
import '../constants/app_colors.dart';

class AIAssistantPage extends StatefulWidget {
  const AIAssistantPage({super.key});

  @override
  State<AIAssistantPage> createState() => _AIAssistantPageState();
}

class _AIAssistantPageState extends State<AIAssistantPage> {
  final List<Map<String, String>> _messages = [
    {
      'role': 'ai',
      'text': 'Namaste! I am your VaidyaMed AI Assistant. How can I help you today? I can analyze your symptoms, explain your reports, or suggest Ayurvedic lifestyle changes.'
    },
  ];

  final TextEditingController _controller = TextEditingController();

  void _sendMessage() {
    if (_controller.text.trim().isEmpty) return;
    setState(() {
      _messages.add({'role': 'user', 'text': _controller.text});
      _controller.clear();
    });

    // Mock AI response
    Future.delayed(const Duration(seconds: 1), () {
      if (mounted) {
        setState(() {
          _messages.add({
            'role': 'ai',
            'text': 'I am analyzing your query with our clinical engine. Based on Ayurvedic principles and your history, I recommend focusing on balancing your Vata dosha through warm, grounding foods and regular sleep patterns. Would you like a detailed plan?'
          });
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.white,
      appBar: AppBar(
        backgroundColor: AppColors.gDark,
        title: Text(
          'Neural AI Assistant',
          style: GoogleFonts.playfairDisplay(color: AppColors.gold, fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            onPressed: () {},
            icon: const Icon(Icons.history, color: AppColors.gPale),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(20),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final msg = _messages[index];
                return _buildMessage(msg['role'] == 'ai', msg['text']!);
              },
            ),
          ),
          _buildInputArea(),
        ],
      ),
    );
  }

  Widget _buildMessage(bool isAI, String text) {
    return Align(
      alignment: isAI ? Alignment.centerLeft : Alignment.centerRight,
      child: Container(
        margin: const EdgeInsets.only(bottom: 20),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isAI ? AppColors.offWhite : AppColors.gGreen,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(20),
            topRight: const Radius.circular(20),
            bottomLeft: Radius.circular(isAI ? 0 : 20),
            bottomRight: Radius.circular(isAI ? 20 : 0),
          ),
          border: isAI ? Border.all(color: AppColors.gPale.withOpacity(0.5)) : null,
          boxShadow: [
            if (!isAI)
              BoxShadow(
                color: AppColors.gGreen.withOpacity(0.2),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
          ],
        ),
        child: isAI && text == _messages.last['text']
            ? DefaultTextStyle(
                style: GoogleFonts.poppins(color: AppColors.textDark, fontSize: 13, height: 1.5),
                child: AnimatedTextKit(
                  animatedTexts: [
                    TypewriterAnimatedText(text, speed: const Duration(milliseconds: 30)),
                  ],
                  isRepeatingAnimation: false,
                ),
              )
            : Text(
                text,
                style: GoogleFonts.poppins(
                  color: isAI ? AppColors.textDark : AppColors.white,
                  fontSize: 13,
                  height: 1.5,
                ),
              ),
      ),
    );
  }

  Widget _buildInputArea() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.white,
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 20, offset: const Offset(0, -5)),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: AppColors.offWhite, borderRadius: BorderRadius.circular(12)),
            child: const Icon(Icons.attach_file, color: AppColors.gGreen, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: TextField(
              controller: _controller,
              decoration: InputDecoration(
                hintText: 'Type your symptoms...',
                hintStyle: GoogleFonts.poppins(color: AppColors.textMute, fontSize: 14),
                border: InputBorder.none,
              ),
              onSubmitted: (_) => _sendMessage(),
            ),
          ),
          IconButton(
            onPressed: _sendMessage,
            icon: const CircleAvatar(
              backgroundColor: AppColors.gGreen,
              child: Icon(Icons.send, color: AppColors.white, size: 18),
            ),
          ),
        ],
      ),
    );
  }
}
