import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import 'wellness_submodules.dart';

class WellnessScreen extends StatelessWidget {
  const WellnessScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      physics: const BouncingScrollPhysics(),
      children: [
        // Hero Section
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [Color(0xFF2D6A4F), Color(0xFF1A4228)], begin: Alignment.topLeft, end: Alignment.bottomRight),
            borderRadius: BorderRadius.circular(24),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('🌿 Health Wellness Hub', style: TextStyle(fontFamily: 'PlayfairDisplay', fontSize: 18, color: AppColors.accentGold, fontWeight: FontWeight.bold)),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      const Text('89', style: TextStyle(fontFamily: 'PlayfairDisplay', fontSize: 32, color: AppColors.accentGold, height: 1)),
                      Text('Wellness Score', style: TextStyle(fontFamily: 'Poppins', fontSize: 10, color: Colors.white.withValues(alpha: 0.7))),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text('Personalized Ayurvedic wellness tools to balance your doshas and maintain harmony.', style: TextStyle(fontFamily: 'Poppins', fontSize: 12, color: Colors.white.withValues(alpha: 0.9))),
              const SizedBox(height: 16),
              const Text('⚠️ For guidance only. Consult your physician.', style: TextStyle(fontFamily: 'Poppins', fontSize: 10, color: Colors.white54)),
            ],
          ),
        ),
        const SizedBox(height: 24),

        // Submodules Grid
        Row(
          children: [
            Expanded(child: _buildSubmoduleCard(context, 'Dosha Quiz', 'Take 2-min quiz', '❓', const DoshaQuizScreen(), const Color(0xFFEAF5EE))),
            const SizedBox(width: 16),
            Expanded(child: _buildSubmoduleCard(context, 'Diet Plan', 'Weekly meals', '🍲', const DietPlanScreen(), const Color(0xFFFFF8E1))),
            const SizedBox(width: 16),
            Expanded(child: _buildSubmoduleCard(context, 'Reminders', 'Medicine schedule', '⏰', const ReminderScreen(), const Color(0xFFE3F2FD))),
          ],
        ),
        const SizedBox(height: 32),

        // Quick Tips & Dosha Balance
        const Text('💡 Quick Wellness Tips', style: TextStyle(fontFamily: 'Poppins', fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textDark)),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.inputBorder)),
          child: const Column(
            children: [
              _TipItem('Wake before sunrise for balanced Vata'),
              _TipItem('Hydrate with warm water + lemon'),
              _TipItem('Practice 10min pranayama daily'),
              _TipItem('Avoid cold drinks if Pitta dominant'),
            ],
          ),
        ),
        const SizedBox(height: 24),

        const Text('📊 Dosha Balance', style: TextStyle(fontFamily: 'Poppins', fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textDark)),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.inputBorder)),
          child: const Column(
            children: [
              _DoshaBar(label: 'Vata', percentage: 0.42, color: Colors.blue),
              SizedBox(height: 12),
              _DoshaBar(label: 'Pitta', percentage: 0.33, color: Colors.red),
              SizedBox(height: 12),
              _DoshaBar(label: 'Kapha', percentage: 0.25, color: Colors.green),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSubmoduleCard(BuildContext context, String title, String subtitle, String icon, Widget screen, Color bgColor) {
    return GestureDetector(
      onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => screen)),
      child: Container(
        height: 130,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.inputBorder), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 10, offset: const Offset(0, 4))]),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: bgColor, shape: BoxShape.circle), child: Text(icon, style: const TextStyle(fontSize: 20))),
            const Spacer(),
            Text(title, style: const TextStyle(fontFamily: 'Poppins', fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textDark)),
            const SizedBox(height: 4),
            Text(subtitle, style: const TextStyle(fontFamily: 'Poppins', fontSize: 9, color: AppColors.textMuted)),
          ],
        ),
      ),
    );
  }
}

class _TipItem extends StatelessWidget {
  final String text;
  const _TipItem(this.text);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('• ', style: TextStyle(color: AppColors.primaryGreen, fontWeight: FontWeight.bold)),
          Expanded(child: Text(text, style: const TextStyle(fontFamily: 'Poppins', fontSize: 12, color: AppColors.textDark))),
        ],
      ),
    );
  }
}

class _DoshaBar extends StatelessWidget {
  final String label;
  final double percentage;
  final Color color;

  const _DoshaBar({required this.label, required this.percentage, required this.color});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        SizedBox(width: 45, child: Text(label, style: const TextStyle(fontFamily: 'Poppins', fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textDark))),
        const SizedBox(width: 12),
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: LinearProgressIndicator(
              value: percentage,
              backgroundColor: const Color(0xFFF5F5F5),
              valueColor: AlwaysStoppedAnimation(color),
              minHeight: 8,
            ),
          ),
        ),
        const SizedBox(width: 12),
        SizedBox(width: 35, child: Text('${(percentage * 100).toInt()}%', style: const TextStyle(fontFamily: 'Poppins', fontSize: 12, color: AppColors.textMuted), textAlign: TextAlign.right)),
      ],
    );
  }
}
