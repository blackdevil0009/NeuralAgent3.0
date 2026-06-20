import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class SupportScreen extends StatefulWidget {
  const SupportScreen({super.key});

  @override
  State<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends State<SupportScreen> {
  final TextEditingController _messageCtrl = TextEditingController();
  bool _isSubmitting = false;
  int? _expandedFaq;

  final List<Map<String, String>> _faqs = [
    {
      'q': 'How do I book an appointment?',
      'a': 'Go to the Bookings tab, tap "Book New Appointment", search for a doctor by specialization, then tap "Book & Pay" to confirm your slot.',
    },
    {
      'q': 'Is my data secure?',
      'a': 'Yes. All your health records and messages are encrypted end-to-end. We comply with HIPAA and DPDP standards.',
    },
    {
      'q': 'How do I cancel or reschedule?',
      'a': 'Open the Bookings tab, find your appointment, and use the reschedule option. Cancellations are free up to 24 hours before the slot.',
    },
    {
      'q': 'What is the SOS / Emergency tab?',
      'a': 'The SOS tab lets you report a medical emergency and get connected to the nearest available doctor or emergency care unit.',
    },
    {
      'q': 'How do I reset my password?',
      'a': 'Log out, tap "Forgot Password" on the login screen, and enter your registered email. You will receive a reset link.',
    },
    {
      'q': 'Is teleconsultation available 24/7?',
      'a': 'Teleconsultation availability depends on each doctor\'s schedule. You can check their available slots on the Bookings page.',
    },
  ];

  void _submitTicket() async {
    if (_messageCtrl.text.trim().isEmpty) return;
    setState(() => _isSubmitting = true);
    await Future.delayed(const Duration(seconds: 2));
    if (mounted) {
      setState(() => _isSubmitting = false);
      _messageCtrl.clear();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('✅ Support ticket submitted! We\'ll respond within 24 hours.'),
          backgroundColor: AppColors.primaryGreen,
        ),
      );
    }
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
        title: const Text('Help & Support', style: TextStyle(fontFamily: 'PlayfairDisplay', fontWeight: FontWeight.w700, color: AppColors.primaryGreen)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.primaryGreen),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        physics: const BouncingScrollPhysics(),
        children: [
          // Hero Banner
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFF2D6A4F), Color(0xFF1A4228)], begin: Alignment.topLeft, end: Alignment.bottomRight),
              borderRadius: BorderRadius.circular(24),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('How can we help?', style: TextStyle(fontFamily: 'PlayfairDisplay', fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.accentGold)),
                      const SizedBox(height: 8),
                      Text('Our team is available Mon–Sat, 9am–7pm IST.', style: TextStyle(fontFamily: 'Poppins', fontSize: 12, color: Colors.white.withValues(alpha: 0.85))),
                    ],
                  ),
                ),
                const Text('🎧', style: TextStyle(fontSize: 48)),
              ],
            ),
          ),
          const SizedBox(height: 28),

          // Quick Contact Actions
          const Text('Contact Us', style: TextStyle(fontFamily: 'Poppins', fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textDark)),
          const SizedBox(height: 14),
          Row(
            children: [
              _buildContactCard('📞', 'Call Us', '1800-XXX-XXXX', const Color(0xFFE3F2FD)),
              const SizedBox(width: 12),
              _buildContactCard('📧', 'Email Us', 'support@vaidyamed.in', const Color(0xFFE8F4EC)),
              const SizedBox(width: 12),
              _buildContactCard('💬', 'Live Chat', 'Chat Now', const Color(0xFFFFF8E1)),
            ],
          ),
          const SizedBox(height: 28),

          // Submit Ticket
          const Text('Submit a Ticket', style: TextStyle(fontFamily: 'Poppins', fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textDark)),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.inputBorder)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: _messageCtrl,
                  maxLines: 4,
                  decoration: InputDecoration(
                    hintText: 'Describe your issue in detail...',
                    hintStyle: const TextStyle(fontFamily: 'Poppins', fontSize: 13, color: AppColors.textMuted),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.inputBorder)),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.inputBorder)),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.primaryGreen)),
                    contentPadding: const EdgeInsets.all(14),
                  ),
                ),
                const SizedBox(height: 14),
                ElevatedButton(
                  onPressed: _isSubmitting ? null : _submitTicket,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primaryGreen,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _isSubmitting
                      ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Send Message', style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 28),

          // FAQ Section
          const Text('Frequently Asked Questions', style: TextStyle(fontFamily: 'Poppins', fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textDark)),
          const SizedBox(height: 14),
          ...List.generate(_faqs.length, (i) {
            final isOpen = _expandedFaq == i;
            return GestureDetector(
              onTap: () => setState(() => _expandedFaq = isOpen ? null : i),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isOpen ? const Color(0xFFEAF5EE) : Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: isOpen ? AppColors.primaryGreen.withValues(alpha: 0.4) : AppColors.inputBorder),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            _faqs[i]['q']!,
                            style: TextStyle(fontFamily: 'Poppins', fontSize: 13, fontWeight: FontWeight.w600, color: isOpen ? AppColors.primaryGreen : AppColors.textDark),
                          ),
                        ),
                        Icon(isOpen ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down, color: AppColors.primaryGreen, size: 20),
                      ],
                    ),
                    if (isOpen) ...[
                      const SizedBox(height: 10),
                      const Divider(color: AppColors.inputBorder, height: 1),
                      const SizedBox(height: 10),
                      Text(_faqs[i]['a']!, style: const TextStyle(fontFamily: 'Poppins', fontSize: 12, color: AppColors.textMuted, height: 1.6)),
                    ],
                  ],
                ),
              ),
            );
          }),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildContactCard(String emoji, String title, String sub, Color bgColor) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: bgColor, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.inputBorder.withValues(alpha: 0.5))),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(emoji, style: const TextStyle(fontSize: 24)),
            const SizedBox(height: 8),
            Text(title, style: const TextStyle(fontFamily: 'Poppins', fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textDark)),
            const SizedBox(height: 2),
            Text(sub, style: const TextStyle(fontFamily: 'Poppins', fontSize: 10, color: AppColors.textMuted)),
          ],
        ),
      ),
    );
  }
}
