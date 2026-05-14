import 'package:flutter/material.dart';
import 'dart:convert';
// import 'package:http/http.dart' as http;
import '../theme/app_theme.dart';
import '../widgets/vx_widgets.dart';
import '../widgets/vx_text_field.dart';
import 'home_screen.dart';

class OtpScreen extends StatefulWidget {
  final String email;
  final String purpose; // 'registration' or '2fa'

  const OtpScreen({super.key, required this.email, required this.purpose});

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  final _otpCtrl = TextEditingController();
  bool _isLoading = false;
  String? _errorMsg;

  Future<void> _verifyOtp() async {
    final otp = _otpCtrl.text.trim();
    if (otp.length < 6) {
      setState(() => _errorMsg = 'Please enter a valid 6-digit OTP.');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMsg = null;
    });

    try {
      // MOCK BACKEND FOR DEVELOPMENT MODE
      await Future.delayed(const Duration(seconds: 1));

      if (!mounted) return;
      setState(() => _isLoading = false);

      // Mock successful verification
      if (widget.purpose == '2fa') {
        final userMap = {
          'id': 'mock_user_123',
          'email': widget.email,
          'fullName': 'Mock User',
          'role': 'patient',
        };
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => HomeScreen(user: userMap)),
          (route) => false,
        );
      } else {
        // Just verified, send back to login
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Verified successfully. Please login.'),
          backgroundColor: AppColors.primaryGreen,
        ));
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _errorMsg = 'Verification error.';
      });
    }
  }

  Future<void> _resendOtp() async {
    setState(() {
      _isLoading = true;
      _errorMsg = null;
    });

    try {
      // MOCK BACKEND FOR DEVELOPMENT MODE
      await Future.delayed(const Duration(seconds: 1));

      if (!mounted) return;
      setState(() => _isLoading = false);

      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('A new OTP has been sent to your email.'),
        backgroundColor: AppColors.primaryGreen,
      ));
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _errorMsg = 'Connection error.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: AppColors.backgroundGradient),
        child: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                child: Row(
                  children: [
                    GestureDetector(
                      onTap: () => Navigator.of(context).pop(),
                      child: Container(
                        width: 38, height: 38,
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                        ),
                        child: const Icon(Icons.arrow_back_ios_new_rounded, size: 16, color: Colors.white),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('VaidyaMed-X', style: TextStyle(fontFamily: 'PlayfairDisplay', fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.accentGold)),
                        Text('Verification', style: TextStyle(fontFamily: 'Poppins', fontSize: 11, color: Colors.white.withValues(alpha: 0.7))),
                      ],
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Center(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(AppDimens.radiusCard),
                        boxShadow: [BoxShadow(color: const Color(0xFF143C1E).withValues(alpha: 0.15), blurRadius: 32, offset: const Offset(0, 12))],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            widget.purpose == '2fa' ? 'Two-Factor Auth' : 'Verify Email',
                            style: AppTextStyles.welcomeTitle,
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Please enter the 6-digit code sent to\n${widget.email}',
                            style: AppTextStyles.sectionSub,
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 24),
                          VxTextField(
                            label: 'OTP Code',
                            hint: 'XXXXXX',
                            icon: Icons.security_outlined,
                            controller: _otpCtrl,
                            keyboardType: TextInputType.number,
                          ),
                          if (_errorMsg != null) ...[
                            const SizedBox(height: 12),
                            Text(_errorMsg!, style: const TextStyle(color: AppColors.errorRed, fontSize: 12, fontFamily: 'Poppins'), textAlign: TextAlign.center),
                          ],
                          const SizedBox(height: 24),
                          VxButton(
                            label: 'Verify',
                            onPressed: _verifyOtp,
                            isLoading: _isLoading,
                          ),
                          const SizedBox(height: 16),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Text("Didn't receive it? ", style: TextStyle(fontFamily: 'Poppins', fontSize: 12, color: AppColors.textMuted)),
                              GestureDetector(
                                onTap: _isLoading ? null : _resendOtp,
                                child: const Text('Resend', style: AppTextStyles.link),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
