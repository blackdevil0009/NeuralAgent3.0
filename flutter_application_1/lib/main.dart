import 'package:flutter/material.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Vaidyamed-X Hospital Login',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.teal),
        useMaterial3: true,
      ),
      home: const HospitalLoginPage(),
    );
  }
}

class FakeAuthService {
  FakeAuthService._();

  static final FakeAuthService instance = FakeAuthService._();

  final Map<String, HospitalAccount> _accounts = {
    'cityhospital@vaidyamedx.com': HospitalAccount(
      hospitalName: 'City Hospital',
      email: 'cityhospital@vaidyamedx.com',
      password: 'City@123',
      isVerified: true,
      is2faEnabled: true,
    ),
    'greenvalley@vaidyamedx.com': HospitalAccount(
      hospitalName: 'Green Valley Hospital',
      email: 'greenvalley@vaidyamedx.com',
      password: 'Green@123',
      isVerified: false,
      is2faEnabled: true,
    ),
  };

  String _currentOtp = '';
  String _otpForEmail = '';

  HospitalAccount? loginWithPassword(String email, String password) {
    final normalized = email.trim().toLowerCase();
    final account = _accounts[normalized];
    if (account == null || account.password != password.trim()) {
      return null;
    }
    return account;
  }

  bool isHospitalVerified(String email) {
    return _accounts[email.trim().toLowerCase()]?.isVerified ?? false;
  }

  bool hasAccount(String email) {
    return _accounts.containsKey(email.trim().toLowerCase());
  }

  bool is2faRequired(String email) {
    return _accounts[email.trim().toLowerCase()]?.is2faEnabled ?? false;
  }

  String generateOtpFor(String email) {
    _otpForEmail = email.trim().toLowerCase();
    _currentOtp = '246810';
    return _currentOtp;
  }

  bool verifyOtp(String email, String otp) {
    final normalized = email.trim().toLowerCase();
    return normalized == _otpForEmail && otp.trim() == _currentOtp;
  }

  bool resetPassword({
    required String email,
    required String newPassword,
    required bool verificationCheck,
  }) {
    final normalized = email.trim().toLowerCase();
    final account = _accounts[normalized];
    if (account == null || !verificationCheck) {
      return false;
    }
    account.password = newPassword.trim();
    return true;
  }
}

class HospitalAccount {
  HospitalAccount({
    required this.hospitalName,
    required this.email,
    required this.password,
    required this.isVerified,
    required this.is2faEnabled,
  });

  final String hospitalName;
  final String email;
  String password;
  final bool isVerified;
  final bool is2faEnabled;
}

class HospitalLoginPage extends StatefulWidget {
  const HospitalLoginPage({super.key});

  @override
  State<HospitalLoginPage> createState() => _HospitalLoginPageState();
}

class _HospitalLoginPageState extends State<HospitalLoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _verificationAccepted = false;
  bool _isLoading = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    if (!_verificationAccepted) {
      _showSnack('Please complete the verification check.');
      return;
    }

    setState(() {
      _isLoading = true;
    });

    await Future<void>.delayed(const Duration(milliseconds: 400));

    final auth = FakeAuthService.instance;
    final email = _emailController.text;
    final password = _passwordController.text;
    final account = auth.loginWithPassword(email, password);

    if (!mounted) return;

    setState(() {
      _isLoading = false;
    });

    if (account == null) {
      _showSnack('Invalid email or password.');
      return;
    }

    if (!auth.isHospitalVerified(email)) {
      _showSnack(
        'Hospital profile is not verified yet. Contact platform support.',
      );
      return;
    }

    if (auth.is2faRequired(email)) {
      final otp = auth.generateOtpFor(email);
      _showSnack('2FA OTP sent. Demo OTP: $otp');
      await Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => OtpVerificationPage(
            email: email.trim().toLowerCase(),
            hospitalName: account.hospitalName,
          ),
        ),
      );
      return;
    }

    _openDashboard(account.hospitalName);
  }

  void _openDashboard(String hospitalName) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => HospitalDashboardPage(hospitalName: hospitalName),
      ),
    );
  }

  void _showSnack(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Card(
            margin: const EdgeInsets.all(20),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Form(
                key: _formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Hospital Login',
                      style: Theme.of(context).textTheme.headlineSmall,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 20),
                    TextFormField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(
                        labelText: 'Hospital Email',
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) {
                        final text = value?.trim() ?? '';
                        if (text.isEmpty) return 'Email is required';
                        if (!text.contains('@')) return 'Enter a valid email';
                        return null;
                      },
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _passwordController,
                      obscureText: true,
                      decoration: const InputDecoration(
                        labelText: 'Password',
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) {
                        if ((value ?? '').trim().isEmpty) {
                          return 'Password is required';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 10),
                    CheckboxListTile(
                      contentPadding: EdgeInsets.zero,
                      value: _verificationAccepted,
                      onChanged: (value) {
                        setState(() {
                          _verificationAccepted = value ?? false;
                        });
                      },
                      title: const Text(
                        'Verification check: I confirm this is an authorized hospital login',
                      ),
                      controlAffinity: ListTileControlAffinity.leading,
                    ),
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton(
                        onPressed: () async {
                          await Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => const ForgotPasswordPage(),
                            ),
                          );
                        },
                        child: const Text('Forgot password?'),
                      ),
                    ),
                    const SizedBox(height: 6),
                    FilledButton(
                      onPressed: _isLoading ? null : _handleLogin,
                      child: _isLoading
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Sign in'),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Demo account: cityhospital@vaidyamedx.com / City@123',
                      textAlign: TextAlign.center,
                    ),
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

class OtpVerificationPage extends StatefulWidget {
  const OtpVerificationPage({
    super.key,
    required this.email,
    required this.hospitalName,
  });

  final String email;
  final String hospitalName;

  @override
  State<OtpVerificationPage> createState() => _OtpVerificationPageState();
}

class _OtpVerificationPageState extends State<OtpVerificationPage> {
  final _otpController = TextEditingController();
  bool _isVerifying = false;

  @override
  void dispose() {
    _otpController.dispose();
    super.dispose();
  }

  void _verifyOtp() async {
    setState(() {
      _isVerifying = true;
    });
    await Future<void>.delayed(const Duration(milliseconds: 300));
    final ok = FakeAuthService.instance.verifyOtp(widget.email, _otpController.text);
    if (!mounted) return;
    setState(() {
      _isVerifying = false;
    });
    if (!ok) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Invalid OTP. Please try again.')),
      );
      return;
    }
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => HospitalDashboardPage(hospitalName: widget.hospitalName),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('2FA Verification')),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Card(
            margin: const EdgeInsets.all(20),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Enter OTP for ${widget.email}',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _otpController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'One-time password',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: _isVerifying ? null : _verifyOtp,
                    child: _isVerifying
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Verify and continue'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class ForgotPasswordPage extends StatefulWidget {
  const ForgotPasswordPage({super.key});

  @override
  State<ForgotPasswordPage> createState() => _ForgotPasswordPageState();
}

class _ForgotPasswordPageState extends State<ForgotPasswordPage> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _verificationCheck = false;
  bool _updating = false;

  @override
  void dispose() {
    _emailController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _resetPassword() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_verificationCheck) {
      _showSnack('Please complete verification check before reset.');
      return;
    }

    setState(() {
      _updating = true;
    });

    await Future<void>.delayed(const Duration(milliseconds: 400));

    final ok = FakeAuthService.instance.resetPassword(
      email: _emailController.text,
      newPassword: _newPasswordController.text,
      verificationCheck: _verificationCheck,
    );

    if (!mounted) return;
    setState(() {
      _updating = false;
    });

    if (!ok) {
      _showSnack('Account not found or verification failed.');
      return;
    }

    _showSnack('Password updated successfully.');
    Navigator.of(context).pop();
  }

  void _showSnack(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Forgot Password')),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Card(
            margin: const EdgeInsets.all(20),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Form(
                key: _formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    TextFormField(
                      controller: _emailController,
                      decoration: const InputDecoration(
                        labelText: 'Hospital Email',
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) {
                        final email = value?.trim() ?? '';
                        if (email.isEmpty) return 'Email is required';
                        if (!email.contains('@')) return 'Enter valid email';
                        if (!FakeAuthService.instance.hasAccount(email)) {
                          return 'No account found for this email';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _newPasswordController,
                      obscureText: true,
                      decoration: const InputDecoration(
                        labelText: 'New Password',
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) {
                        final text = value?.trim() ?? '';
                        if (text.length < 6) {
                          return 'Password must be at least 6 chars';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _confirmPasswordController,
                      obscureText: true,
                      decoration: const InputDecoration(
                        labelText: 'Confirm Password',
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) {
                        if ((value ?? '').trim() !=
                            _newPasswordController.text.trim()) {
                          return 'Passwords do not match';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 8),
                    CheckboxListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Verification check passed'),
                      value: _verificationCheck,
                      onChanged: (v) {
                        setState(() {
                          _verificationCheck = v ?? false;
                        });
                      },
                      controlAffinity: ListTileControlAffinity.leading,
                    ),
                    const SizedBox(height: 8),
                    FilledButton(
                      onPressed: _updating ? null : _resetPassword,
                      child: _updating
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Update Password'),
                    ),
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

class HospitalDashboardPage extends StatelessWidget {
  const HospitalDashboardPage({super.key, required this.hospitalName});

  final String hospitalName;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Hospital Dashboard')),
      body: Center(
        child: Text(
          'Welcome, $hospitalName',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
      ),
    );
  }
}
