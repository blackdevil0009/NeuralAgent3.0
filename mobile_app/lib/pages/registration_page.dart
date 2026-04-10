import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../constants/app_colors.dart';
import '../widgets/gradient_background.dart';
import '../widgets/primary_button.dart';
import '../services/api_client.dart';
import '../services/api_config.dart';

class RegistrationPage extends StatefulWidget {
  const RegistrationPage({super.key});

  @override
  State<RegistrationPage> createState() => _RegistrationPageState();
}

class _RegistrationPageState extends State<RegistrationPage> {
  bool isPatient = true;
  bool isLoading = false;
  final TextEditingController nameController = TextEditingController();
  final TextEditingController emailController = TextEditingController();
  final TextEditingController phoneController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();

  Future<void> _handleRegister() async {
    if (nameController.text.isEmpty || emailController.text.isEmpty || phoneController.text.isEmpty || passwordController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill all fields')),
      );
      return;
    }

    setState(() => isLoading = true);
    try {
      final response = await apiClient.post(ApiConfig.register, data: {
        'name': nameController.text.trim(),
        'email': emailController.text.trim(),
        'phone': phoneController.text.trim(),
        'password': passwordController.text,
        'role': isPatient ? 'patient' : 'doctor',
      });

      if (response.statusCode == 201 || response.statusCode == 200) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Registration successful! Please login.')),
          );
          Navigator.pop(context);
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(response.data['data']?['error'] ?? 'Registration failed')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Connection error. Please try again.')),
        );
      }
    } finally {
      if (mounted) setState(() => isLoading = false);
    }
  }

  @override
  void dispose() {
    nameController.dispose();
    emailController.dispose();
    phoneController.dispose();
    passwordController.dispose();
    super.dispose();
  }

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
          _buildField('FULL NAME', 'John Doe', Icons.person_outline, controller: nameController),
          const SizedBox(height: 16),
          _buildField('EMAIL ADDRESS', 'john@example.com', Icons.email_outlined, controller: emailController),
          const SizedBox(height: 16),
          _buildField('MOBILE NUMBER', '+91 9876543210', Icons.phone_android_outlined, controller: phoneController),
          const SizedBox(height: 16),
          _buildField('PASSWORD', '••••••••', Icons.lock_outline, isPassword: true, controller: passwordController),
          const SizedBox(height: 30),
          PrimaryButton(
            text: isLoading ? 'REGISTERING...' : 'CREATE ACCOUNT',
            onPressed: isLoading ? null : _handleRegister,
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

  Widget _buildField(String label, String hint, IconData icon, {bool isPassword = false, TextEditingController? controller}) {
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
          controller: controller,
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
