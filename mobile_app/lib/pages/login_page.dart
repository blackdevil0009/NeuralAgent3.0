import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../constants/app_colors.dart';
import '../widgets/gradient_background.dart';
import '../widgets/primary_button.dart';
import '../widgets/glass_card.dart';

import 'patient_dashboard.dart';
import 'doctor_dashboard.dart';
import 'registration_page.dart';
import 'ai_assistant_page.dart';
import '../services/api_client.dart';
import '../services/api_config.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  bool isPatient = true;
  bool obscurePassword = true;
  bool isLoading = false;
  final TextEditingController emailController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();

  Future<void> _handleLogin() async {
    if (emailController.text.isEmpty || passwordController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter both email and password')),
      );
      return;
    }

    setState(() => isLoading = true);
    try {
      final response = await apiClient.post(ApiConfig.login, data: {
        'email': emailController.text.trim(),
        'password': passwordController.text,
        'role': isPatient ? 'patient' : 'doctor',
      });

      if (response.statusCode == 200) {
        final data = response.data['data'];
        final token = data['token'];
        apiClient.setToken(token);
        
        if (mounted) {
          if (isPatient) {
            Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const PatientDashboard()));
          } else {
            Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const DoctorDashboard()));
          }
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(response.data['data']?['error'] ?? 'Login failed')),
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
    emailController.dispose();
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
                const SizedBox(height: 40),
                _buildLoginCard(),
                const SizedBox(height: 30),
                _buildRegistrationCTA(),
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
        const Icon(Icons.spa, color: AppColors.gold, size: 48),
        const SizedBox(height: 12),
        Text(
          'VaidyaMed-X',
          style: GoogleFonts.playfairDisplay(
            color: AppColors.gold,
            fontWeight: FontWeight.bold,
            fontSize: 32,
            letterSpacing: 2.0,
          ),
        ),
        Text(
          'Ancient Wisdom, Modern Precision',
          style: GoogleFonts.lora(
            color: AppColors.white.withOpacity(0.7),
            fontStyle: FontStyle.italic,
            fontSize: 12,
          ),
        ),
      ],
    );
  }

  Widget _buildLoginCard() {
    return Container(
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
        children: [
          _buildRoleTabs(),
          Padding(
            padding: const EdgeInsets.all(32.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Welcome Back',
                  style: GoogleFonts.playfairDisplay(
                    fontSize: 24,
                    color: AppColors.gGreen,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  'Please enter your credentials',
                  style: GoogleFonts.poppins(
                    fontSize: 13,
                    color: AppColors.textMute,
                  ),
                ),
                const SizedBox(height: 24),
                _buildTextField(
                  label: 'EMAIL ADDRESS',
                  hint: 'Enter your email',
                  icon: Icons.email_outlined,
                  controller: emailController,
                ),
                const SizedBox(height: 20),
                _buildTextField(
                  label: 'PASSWORD',
                  hint: 'Enter your password',
                  icon: Icons.lock_outline,
                  isPassword: true,
                  obscure: obscurePassword,
                  controller: passwordController,
                  onToggleObscure: () {
                    setState(() => obscurePassword = !obscurePassword);
                  },
                ),
                const SizedBox(height: 16),
                _buildLoginActions(),
                const SizedBox(height: 24),
                PrimaryButton(
                  text: isLoading ? 'LOADING...' : 'LOGIN',
                  onPressed: isLoading ? null : _handleLogin,
                ),
              ],
            ),
          ),
          _buildShlokaBanner(),
        ],
      ),
    );
  }

  Widget _buildRoleTabs() {
    return Container(
      padding: const EdgeInsets.all(4),
      margin: const EdgeInsets.only(top: 24, left: 32, right: 32),
      decoration: BoxDecoration(
        color: AppColors.offWhite,
        borderRadius: BorderRadius.circular(50),
        border: Border.all(color: AppColors.gPale.withOpacity(0.5)),
      ),
      child: Row(
        children: [
          _buildTabBtn('PATIENT', isPatient, () => setState(() => isPatient = true)),
          _buildTabBtn('DOCTOR', !isPatient, () => setState(() => isPatient = false)),
        ],
      ),
    );
  }

  Widget _buildTabBtn(String label, bool active, VoidCallback onTap) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: active ? AppColors.gGreen : Colors.transparent,
            borderRadius: BorderRadius.circular(50),
          ),
          child: Center(
            child: Text(
              label,
              style: GoogleFonts.poppins(
                color: active ? AppColors.white : AppColors.gGreen,
                fontSize: 12,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.5,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTextField({
    required String label,
    required String hint,
    required IconData icon,
    bool isPassword = false,
    bool obscure = false,
    TextEditingController? controller,
    VoidCallback? onToggleObscure,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.poppins(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: AppColors.textMute,
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          obscureText: obscure,
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: GoogleFonts.poppins(color: const Color(0xFFAEC8B4), fontSize: 14),
            prefixIcon: Icon(icon, color: AppColors.textMute, size: 20),
            suffixIcon: isPassword
                ? IconButton(
                    icon: Icon(
                      obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                      color: AppColors.textMute,
                      size: 20,
                    ),
                    onPressed: onToggleObscure,
                  )
                : null,
            filled: true,
            fillColor: AppColors.offWhite,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.gPale),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.gPale),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.gGreen, width: 1.5),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          ),
        ),
      ],
    );
  }

  Widget _buildLoginActions() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            SizedBox(
              height: 24,
              width: 24,
              child: Checkbox(
                value: true,
                onChanged: (v) {},
                activeColor: AppColors.gGreen,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
              ),
            ),
            const SizedBox(width: 8),
            Text(
              'Remember me',
              style: GoogleFonts.poppins(fontSize: 12, color: AppColors.textMute),
            ),
          ],
        ),
        TextButton(
          onPressed: () {},
          child: Text(
            'Forgot Password?',
            style: GoogleFonts.poppins(
              fontSize: 12,
              color: AppColors.gGreen,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildShlokaBanner() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 20),
      decoration: BoxDecoration(
        color: const Color(0xFFF4FAF6),
        border: Border(top: BorderSide(color: AppColors.gGreen.withOpacity(0.1))),
      ),
      child: Text(
        '“Dharmarthakamamokshanam arogyam mulamuttamam”',
        textAlign: TextAlign.center,
        style: GoogleFonts.lora(
          fontSize: 11,
          fontStyle: FontStyle.italic,
          color: AppColors.gGreen.withOpacity(0.8),
        ),
      ),
    );
  }

  Widget _buildRegistrationCTA() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          "Don't have an account? ",
          style: GoogleFonts.poppins(color: AppColors.white.withOpacity(0.7), fontSize: 13),
        ),
        GestureDetector(
          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const RegistrationPage())),
          child: Text(
            "Register",
            style: GoogleFonts.poppins(
              color: AppColors.amber,
              fontWeight: FontWeight.bold,
              fontSize: 13,
            ),
          ),
        ),
      ],
    );
  }
}
