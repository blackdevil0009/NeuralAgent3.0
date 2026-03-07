import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../constants/app_colors.dart';
import '../widgets/gradient_background.dart';
import '../widgets/primary_button.dart';

class RegistrationPage extends StatefulWidget {
  const RegistrationPage({super.key});

  @override
  State<RegistrationPage> createState() => _RegistrationPageState();
}

class _RegistrationPageState extends State<RegistrationPage> {
  bool isPatient = true;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: GradientBackground(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 60.0),
            child: Column(
              children: [
                _buildHeader(),
                const SizedBox(height: 30),
                _buildFormCard(),
                const SizedBox(height: 20),
                _buildLoginCTA(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.spa, color: AppColors.gold, size: 32),
            const SizedBox(width: 8),
            Text(
              'Join VaidyaMed-X',
              style: GoogleFonts.playfairDisplay(
                color: AppColors.gold,
                fontWeight: FontWeight.bold,
                fontSize: 28,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          'Begin your journey to holistic health',
          textAlign: TextAlign.center,
          style: GoogleFonts.poppins(
            color: AppColors.white.withOpacity(0.7),
            fontSize: 13,
          ),
        ),
      ],
    );
  }

  Widget _buildFormCard() {
    return Container(
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(26),
        boxShadow: [
          BoxShadow(
            color: AppColors.gDark.withOpacity(0.3),
            blurRadius: 40,
            offset: const Offset(0, 20),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Create Account',
            style: GoogleFonts.playfairDisplay(
              fontSize: 22,
              color: AppColors.gGreen,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 20),
          _buildRoleToggle(),
          const SizedBox(height: 24),
          _buildField('FULL NAME', 'John Doe', Icons.person_outline),
          const SizedBox(height: 16),
          _buildField('EMAIL ADDRESS', 'john@example.com', Icons.email_outlined),
          const SizedBox(height: 16),
          _buildField('MOBILE NUMBER', '+91 9876543210', Icons.phone_android_outlined),
          const SizedBox(height: 16),
          _buildField('PASSWORD', '••••••••', Icons.lock_outline, isPassword: true),
          const SizedBox(height: 30),
          PrimaryButton(
            text: 'CREATE ACCOUNT',
            onPressed: () {},
          ),
        ],
      ),
    );
  }

  Widget _buildRoleToggle() {
    return Row(
      children: [
        _buildRoleBtn('PATIENT', isPatient, () => setState(() => isPatient = true)),
        const SizedBox(width: 12),
        _buildRoleBtn('DOCTOR', !isPatient, () => setState(() => isPatient = false)),
      ],
    );
  }

  Widget _buildRoleBtn(String label, bool selected, VoidCallback onTap) {
    return Expanded(
      child: OutlinedButton(
        onPressed: onTap,
        style: OutlinedButton.styleFrom(
          backgroundColor: selected ? AppColors.gGreen : Colors.transparent,
          side: BorderSide(color: selected ? AppColors.gGreen : AppColors.gPale),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          padding: const EdgeInsets.symmetric(vertical: 12),
        ),
        child: Text(
          label,
          style: GoogleFonts.poppins(
            color: selected ? AppColors.white : AppColors.textMute,
            fontSize: 12,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }

  Widget _buildField(String label, String hint, IconData icon, {bool isPassword = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.poppins(
            fontSize: 10,
            fontWeight: FontWeight.w600,
            color: AppColors.textMute,
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 4),
        TextField(
          obscureText: isPassword,
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: GoogleFonts.poppins(color: const Color(0xFFAEC8B4), fontSize: 13),
            prefixIcon: Icon(icon, color: AppColors.textMute, size: 18),
            filled: true,
            fillColor: AppColors.offWhite,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.gPale),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          ),
        ),
      ],
    );
  }

  Widget _buildLoginCTA() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          "Already have an account? ",
          style: GoogleFonts.poppins(color: AppColors.white.withOpacity(0.7), fontSize: 12),
        ),
        GestureDetector(
          onTap: () => Navigator.pop(context),
          child: Text(
            "Login",
            style: GoogleFonts.poppins(
              color: AppColors.amber,
              fontWeight: FontWeight.bold,
              fontSize: 12,
            ),
          ),
        ),
      ],
    );
  }
}
