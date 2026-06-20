import 'package:flutter/material.dart';
import 'dart:convert';
import '../services/api_service.dart';
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
      // Choose the correct endpoint based on purpose
      final endpoint = widget.purpose == '2fa'
          ? ApiConfig.verify2faOtp
          : ApiConfig.verifyRegistrationOtp;

      final res = await ApiClient.post(endpoint, {
        'email': widget.email,
        'otp': otp,
      });

      if (!mounted) return;
      setState(() => _isLoading = false);

      if (res.ok && res.data != null) {
        final data = res.data!;
        final inner = data['data'] ?? data;

        if (widget.purpose == '2fa') {
          // 2FA login — token + user returned
          final token = inner['token']?.toString() ?? inner['accessToken']?.toString();
          final userRaw = inner['user'] as Map<String, dynamic>? ?? inner;
          final userMap = <String, dynamic>{
            'id': userRaw['id']?.toString() ?? '',
            'name': userRaw['fullName'] ?? userRaw['name'] ?? widget.email.split('@').first,
            'email': widget.email,
            'mobile': userRaw['mobile'] ?? '',
            'role': userRaw['role'] ?? 'patient',
          };
          if (token != null) await AuthService.saveToken(token);
          await AuthService.saveUser(userMap);
          Navigator.of(context).pushAndRemoveUntil(
            MaterialPageRoute(builder: (_) => HomeScreen(user: userMap)),
            (route) => false,
          );
        } else {
          // Registration verification — just go back to login
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('Email verified! Please login.'),
            backgroundColor: AppColors.primaryGreen,
          ));
          Navigator.of(context).pop();
        }
      } else {
        final msg = res.data?['message'] ?? res.error ?? 'Invalid or expired OTP.';
        setState(() => _errorMsg = msg);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _errorMsg = 'Connection error. Check your network.';
      });
    }
  }

  Future<void> _resendOtp() async {
    setState(() {
      _isLoading = true;
      _errorMsg = null;
    });

    try {
      final endpoint = widget.purpose == '2fa'
          ? ApiConfig.resend2faOtp
          : ApiConfig.resendVerification;

      final res = await ApiClient.post(endpoint, {'email': widget.email});

      if (!mounted) return;
      setState(() => _isLoading = false);

      final msg = res.data?['message'] ?? 'A new OTP has been sent to your email.';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(res.ok ? msg : (res.data?['message'] ?? 'Failed to resend OTP.')),
        backgroundColor: res.ok ? AppColors.primaryGreen : AppColors.errorRed,
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
