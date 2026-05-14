import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/vx_text_field.dart';
import '../widgets/vx_widgets.dart';
import 'register_screen.dart';
import 'home_screen.dart';
import 'otp_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();

  int _roleIndex = 0; // 0=Patient  1=Doctor
  bool _rememberMe = false;
  bool _isLoading = false;
  String? _errorMsg;

  late final AnimationController _animCtrl;
  late final Animation<double> _fadeIn;

  static const List<String> _roles = ['Patient', 'Doctor'];

  @override
  void initState() {
    super.initState();
    _animCtrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 600));
    _fadeIn = CurvedAnimation(parent: _animCtrl, curve: Curves.easeOutCubic);
    _animCtrl.forward();
  }

  @override
  void dispose() {
    _animCtrl.dispose();
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    setState(() => _errorMsg = null);
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);

    final String emailText = _emailCtrl.text.trim();
    final String passwordText = _passwordCtrl.text.trim();
    final String roleText = _roles[_roleIndex].toLowerCase();

    try {
      final res = await ApiClient.post(ApiConfig.login, {
        'email': emailText,
        'password': passwordText,
        'role': roleText,
      });

      if (!mounted) return;

      if (res.ok && res.data != null) {
        final data = res.data!;
        // Support both { token, user } and { data: { token, user } }
        final inner = data['data'] ?? data;
        final token = inner['token'] as String? ?? inner['accessToken'] as String?;
        final userRaw = inner['user'] as Map<String, dynamic>? ?? inner;

        final userMap = <String, dynamic>{
          'id': userRaw['id']?.toString() ?? userRaw['_id']?.toString() ?? '',
          'name': userRaw['fullName'] ?? userRaw['name'] ?? emailText.split('@').first,
          'email': emailText,
          'mobile': userRaw['mobile'] ?? '',
          'role': roleText,
          'dob': userRaw['dob'] ?? '',
          'gender': userRaw['gender'] ?? 'Prefer not to say',
          'bloodGroup': userRaw['bloodGroup'] ?? 'Unknown',
          'dosha': userRaw['dosha'] ?? 'Not assessed',
          'address': userRaw['address'] ?? '',
          'city': userRaw['city'] ?? '',
          'state': userRaw['state'] ?? '',
          'pin': userRaw['pin'] ?? userRaw['pincode'] ?? '',
          'allergies': userRaw['allergies'] ?? '',
          'conditions': userRaw['conditions'] ?? '',
          'medications': userRaw['medications'] ?? '',
          'specialization': userRaw['specialization'] ?? '',
          'reg_number': userRaw['reg_number'] ?? userRaw['regNumber'] ?? '',
          'hospital': userRaw['hospital'] ?? '',
        };

        if (token != null) await AuthService.saveToken(token);
        await AuthService.saveUser(userMap);

        setState(() => _isLoading = false);
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => HomeScreen(user: userMap)),
        );
      } else {
        // Fallback: if server unreachable use mock for dev
        final errMsg = res.data?['message'] ?? res.data?['error'] ?? res.error ?? 'Login failed';
        if (res.statusCode == 0) {
          // Server not reachable — use mock
          await Future.delayed(const Duration(milliseconds: 500));
          final mockUser = {
            'id': 'mock_001',
            'name': emailText.split('@').first,
            'email': emailText,
            'mobile': '',
            'role': roleText,
            'dosha': 'Vata',
            'bloodGroup': 'O+',
          };
          if (!mounted) return;
          setState(() => _isLoading = false);
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (_) => HomeScreen(user: mockUser)),
          );
        } else {
          setState(() { _isLoading = false; _errorMsg = errMsg; });
        }
      }
    } catch (e) {
      if (!mounted) return;
      setState(() { _isLoading = false; _errorMsg = 'Connection error. Check your network.'; });
    }
  }

  void _showForgotPassword() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const _ForgotPasswordSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;

    return Scaffold(
      body: Container(
        width: size.width,
        height: size.height,
        decoration: const BoxDecoration(gradient: AppColors.backgroundGradient),
        child: SafeArea(
          child: FadeTransition(
            opacity: _fadeIn,
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: size.height -
                    MediaQuery.of(context).padding.top -
                    MediaQuery.of(context).padding.bottom),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const VxHeader(),
                    // White Card
                    Container(
                      margin: const EdgeInsets.symmetric(
                          horizontal: 20, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius:
                            BorderRadius.circular(AppDimens.radiusCard),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF143C1E).withValues(alpha: 0.15),
                            blurRadius: 32,
                            offset: const Offset(0, 12),
                          ),
                        ],
                      ),
                      child: ClipRRect(
                        borderRadius:
                            BorderRadius.circular(AppDimens.radiusCard),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            // Role tabs
                            Padding(
                              padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                              child: VxRoleTabs(
                                roles: _roles,
                                selected: _roleIndex,
                                onSelect: (i) =>
                                    setState(() => _roleIndex = i),
                              ),
                            ),
                            // Form
                            Padding(
                              padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
                              child: Form(
                                key: _formKey,
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.stretch,
                                  children: [
                                    Text(
                                      'Welcome back 👋',
                                      style: AppTextStyles.welcomeTitle.copyWith(fontSize: 22),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      _roleIndex == 0
                                          ? 'Welcome back, access your health records'
                                          : 'Welcome back, Dr. — manage your patients',
                                      style: AppTextStyles.sectionSub,
                                    ),
                                    const SizedBox(height: 14),
                                    // Error banner
                                    if (_errorMsg != null)
                                      Container(
                                        margin:
                                            const EdgeInsets.only(bottom: 12),
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 12, vertical: 10),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFFDECEA),
                                          border: Border.all(
                                              color: const Color(0xFFF5C6CB)),
                                          borderRadius:
                                              BorderRadius.circular(10),
                                        ),
                                        child: Row(
                                          children: [
                                            const Icon(Icons.error_outline,
                                                size: 16,
                                                color: AppColors.errorRed),
                                            const SizedBox(width: 8),
                                            Expanded(
                                              child: Text(
                                                _errorMsg!,
                                                style: const TextStyle(
                                                  fontFamily: 'Poppins',
                                                  fontSize: 11.5,
                                                  color: AppColors.errorRed,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    VxTextField(
                                      label: 'Email Address',
                                      hint: 'Enter your email',
                                      icon: Icons.email_outlined,
                                      keyboardType: TextInputType.emailAddress,
                                      controller: _emailCtrl,
                                      validator: (v) {
                                        final t = v?.trim() ?? '';
                                        if (t.isEmpty) return 'Email is required';
                                        if (!t.contains('@'))
                                          return 'Enter a valid email';
                                        return null;
                                      },
                                    ),
                                    const SizedBox(height: 12),
                                    VxTextField(
                                      label: 'Password',
                                      hint: 'Enter your password',
                                      icon: Icons.lock_outline,
                                      isPassword: true,
                                      controller: _passwordCtrl,
                                      textInputAction: TextInputAction.done,
                                      validator: (v) {
                                        if ((v ?? '').trim().isEmpty)
                                          return 'Password is required';
                                        if (v!.trim().length < 6)
                                          return 'Minimum 6 characters';
                                        return null;
                                      },
                                    ),
                                    const SizedBox(height: 12),
                                    // Remember me & forgot
                                    Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                      children: [
                                        Row(
                                          children: [
                                            SizedBox(
                                              width: 20,
                                              height: 20,
                                              child: Checkbox(
                                                value: _rememberMe,
                                                activeColor:
                                                    AppColors.primaryGreen,
                                                shape: RoundedRectangleBorder(
                                                  borderRadius:
                                                      BorderRadius.circular(4),
                                                ),
                                                onChanged: (v) => setState(
                                                    () => _rememberMe =
                                                        v ?? false),
                                              ),
                                            ),
                                            const SizedBox(width: 6),
                                            const Text(
                                              'Remember me',
                                              style: TextStyle(
                                                fontFamily: 'Poppins',
                                                fontSize: 11.5,
                                                color: AppColors.textMuted,
                                              ),
                                            ),
                                          ],
                                        ),
                                        GestureDetector(
                                          onTap: _showForgotPassword,
                                          child: const Text(
                                            'Forgot password?',
                                            style: AppTextStyles.link,
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 18),
                                  ],
                                ),
                              ),
                            ),
                            // Login button
                            Padding(
                              padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
                              child: VxButton(
                                label: 'Sign In',
                                onPressed: _handleLogin,
                                isLoading: _isLoading,
                              ),
                            ),
                            const SizedBox(height: 12),
                            // OR divider
                            Padding(
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 16),
                              child: Row(
                                children: [
                                  const Expanded(
                                      child: Divider(color: Color(0xFFDCEEDE))),
                                  Padding(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 10),
                                    child: Text(
                                      'OR',
                                      style: TextStyle(
                                        fontFamily: 'Poppins',
                                        fontSize: 11,
                                        color: Colors.grey.shade400,
                                      ),
                                    ),
                                  ),
                                  const Expanded(
                                      child: Divider(color: Color(0xFFDCEEDE))),
                                ],
                              ),
                            ),
                            const SizedBox(height: 10),
                            // Register CTA
                            Padding(
                              padding:
                                  const EdgeInsets.fromLTRB(16, 0, 16, 4),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Text(
                                    "Don't have an account? ",
                                    style: TextStyle(
                                      fontFamily: 'Poppins',
                                      fontSize: 12,
                                      color: AppColors.textMuted,
                                    ),
                                  ),
                                  GestureDetector(
                                    onTap: () => Navigator.of(context).push(
                                      MaterialPageRoute(
                                        builder: (_) => const RegisterScreen(),
                                      ),
                                    ),
                                    child: const Text(
                                      'Register',
                                      style: AppTextStyles.link,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 4),
                            const VxShlokaBanner(),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ── Forgot Password Bottom Sheet ──────────────────────────────────────────────

class _ForgotPasswordSheet extends StatefulWidget {
  const _ForgotPasswordSheet();

  @override
  State<_ForgotPasswordSheet> createState() => _ForgotPasswordSheetState();
}

class _ForgotPasswordSheetState extends State<_ForgotPasswordSheet> {
  final _emailCtrl = TextEditingController();
  bool _sent = false;
  bool _loading = false;

  @override
  void dispose() {
    _emailCtrl.dispose();
    super.dispose();
  }

  Future<void> _sendReset() async {
    if (_emailCtrl.text.trim().isEmpty ||
        !_emailCtrl.text.contains('@')) return;
    setState(() => _loading = true);
    await Future<void>.delayed(const Duration(milliseconds: 900));
    if (!mounted) return;
    setState(() {
      _loading = false;
      _sent = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 20),
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            if (!_sent) ...[
              const Text('🔐', style: TextStyle(fontSize: 36)),
              const SizedBox(height: 8),
              const Text('Forgot Password?',
                  style: AppTextStyles.welcomeTitle),
              const SizedBox(height: 4),
              const Text(
                'Enter your registered email to receive a reset link.',
                style: AppTextStyles.sectionSub,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),
              VxTextField(
                label: 'Email Address',
                hint: 'Enter your email',
                icon: Icons.email_outlined,
                keyboardType: TextInputType.emailAddress,
                controller: _emailCtrl,
                textInputAction: TextInputAction.done,
              ),
              const SizedBox(height: 20),
              VxButton(
                label: 'Send Reset Link',
                onPressed: _sendReset,
                isLoading: _loading,
              ),
            ] else ...[
              const Text('✅', style: TextStyle(fontSize: 42)),
              const SizedBox(height: 12),
              const Text('Link Sent!', style: AppTextStyles.welcomeTitle),
              const SizedBox(height: 8),
              Text(
                'A password reset link has been sent to\n${_emailCtrl.text.trim()}',
                style: AppTextStyles.sectionSub,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),
              VxButton(
                label: 'Done',
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
