import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import 'login_screen.dart';
import 'settings_screen.dart';

class ProfileScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  const ProfileScreen({super.key, required this.user});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  late Map<String, dynamic> _profile;
  bool _isEditing = false;
  bool _isSaving = false;

  // Controllers
  late TextEditingController _nameCtrl;
  late TextEditingController _mobileCtrl;
  late TextEditingController _dobCtrl;
  late TextEditingController _addressCtrl;
  late TextEditingController _cityCtrl;
  late TextEditingController _stateCtrl;
  late TextEditingController _pinCtrl;
  late TextEditingController _allergiesCtrl;
  late TextEditingController _conditionsCtrl;
  late TextEditingController _medicationsCtrl;
  // Doctor
  late TextEditingController _specCtrl;
  late TextEditingController _licenseCtrl;
  late TextEditingController _hospitalCtrl;
  late TextEditingController _clinicLocCtrl;
  late TextEditingController _upiCtrl;
  late TextEditingController _bankAccCtrl;
  late TextEditingController _bankAccNameCtrl;
  late TextEditingController _bankIfscCtrl;
  late TextEditingController _feeCtrl;

  String _gender = 'Prefer not to say';
  String _bloodGroup = 'Unknown';
  String _dosha = 'Not assessed';

  bool _isLoadingProfile = false;
  bool _isLookingUpIfsc = false;
  Map<String, dynamic>? _ifscDetails;
  bool _isVerifyingUpi = false;

  @override
  void initState() {
    super.initState();
    _profile = Map<String, dynamic>.from(widget.user);
    _initControllers();
    _fetchProfile();
    _bankIfscCtrl.addListener(() {
      if (_bankIfscCtrl.text.trim().length == 11) {
        _lookupBankIfsc(_bankIfscCtrl.text);
      } else if (_bankIfscCtrl.text.trim().length < 11 && _ifscDetails != null) {
        setState(() {
          _ifscDetails = null;
        });
      }
    });
    _upiCtrl.addListener(() {
      if (mounted) {
        setState(() {});
      }
    });
  }

  void _initControllers() {
    _nameCtrl = TextEditingController(text: _profile['name'] ?? '');
    _mobileCtrl = TextEditingController(text: _profile['mobile'] ?? '');
    _dobCtrl = TextEditingController(text: _profile['dob'] ?? '');
    _addressCtrl = TextEditingController(text: _profile['address'] ?? '');
    _cityCtrl = TextEditingController(text: _profile['city'] ?? '');
    _stateCtrl = TextEditingController(text: _profile['state'] ?? '');
    _pinCtrl = TextEditingController(text: _profile['pin'] ?? _profile['pincode'] ?? '');
    _allergiesCtrl = TextEditingController(text: _profile['allergies'] ?? '');
    _conditionsCtrl = TextEditingController(text: _profile['conditions'] ?? '');
    _medicationsCtrl = TextEditingController(text: _profile['medications'] ?? '');
    _specCtrl = TextEditingController(text: _profile['specialization'] ?? _profile['spec'] ?? '');
    _licenseCtrl = TextEditingController(text: _profile['reg_number'] ?? _profile['regNumber'] ?? '');
    _hospitalCtrl = TextEditingController(text: _profile['hospital'] ?? '');
    _clinicLocCtrl = TextEditingController(text: _profile['clinicLocation'] ?? _profile['clinic_location'] ?? '');
    _upiCtrl = TextEditingController(text: _profile['upi_id'] ?? _profile['upiId'] ?? '');
    _bankAccCtrl = TextEditingController(text: _profile['bank_account_number'] ?? _profile['bankAccountNumber'] ?? '');
    _bankAccNameCtrl = TextEditingController(text: _profile['bank_account_name'] ?? _profile['bankAccountName'] ?? '');
    _bankIfscCtrl = TextEditingController(text: _profile['bank_ifsc'] ?? _profile['bankIfsc'] ?? '');
    _feeCtrl = TextEditingController(text: (_profile['consultant_fee'] ?? _profile['consultantFee'] ?? '0').toString());
    _gender = _normalizeGender(_profile['gender']);
    _bloodGroup = _normalizeBloodGroup(_profile['bloodGroup']);
    _dosha = _normalizeDosha(_profile['dosha']);

  }

  String _normalizeGender(dynamic genderValue) {
    if (genderValue == null) return 'Prefer not to say';
    final g = genderValue.toString().toLowerCase().trim();
    if (g == 'male') return 'Male';
    if (g == 'female') return 'Female';
    if (g == 'other') return 'Other';
    return 'Prefer not to say';
  }

  String _normalizeBloodGroup(dynamic bloodValue) {
    if (bloodValue == null) return 'Unknown';
    final b = bloodValue.toString().toUpperCase().trim();
    final allowed = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
    if (allowed.contains(b)) return b;
    return 'Unknown';
  }

  String _normalizeDosha(dynamic doshaValue) {
    if (doshaValue == null) return 'Not assessed';
    final d = doshaValue.toString().trim();
    final allowed = ['Vata', 'Pitta', 'Kapha', 'Vata-Pitta', 'Pitta-Kapha', 'Vata-Kapha', 'Tridoshic'];
    for (final opt in allowed) {
      if (opt.toLowerCase() == d.toLowerCase()) {
        return opt;
      }
    }
    return 'Not assessed';
  }

  Future<void> _fetchProfile() async {
    setState(() => _isLoadingProfile = true);
    try {
      final res = await ApiClient.get(ApiConfig.profile);
      if (res.ok && res.data != null) {
        final profileData = res.data!['data'] as Map<String, dynamic>?;
        if (profileData != null) {
          setState(() {
            _profile = profileData;
            _initControllers();
          });
          await AuthService.saveUser(profileData);
        }
      }
    } catch (e) {
      debugPrint("Failed to fetch live profile: $e");
    } finally {
      setState(() => _isLoadingProfile = false);
    }
  }

  Future<void> _saveProfile() async {
    setState(() => _isSaving = true);

    int consultantFee = 0;
    try {
      consultantFee = int.tryParse(_feeCtrl.text.trim()) ?? 0;
    } catch (_) {}

    final role = _profile['role']?.toString().toLowerCase() ?? 'patient';
    final isDoctor = role == 'doctor';

    Map<String, dynamic> payload;
    if (isDoctor) {
      payload = {
        'name': _nameCtrl.text,
        'mobile': _mobileCtrl.text,
        'dob': _dobCtrl.text,
        'address': _addressCtrl.text,
        'city': _cityCtrl.text,
        'state': _stateCtrl.text,
        'pin': _pinCtrl.text,
        'gender': _gender,
        'specialization': _specCtrl.text,
        'hospital': _hospitalCtrl.text,
        'clinicLocation': _clinicLocCtrl.text,
        'upiId': _upiCtrl.text,
        'bankAccountName': _bankAccNameCtrl.text,
        'bankAccountNumber': _bankAccCtrl.text,
        'bankIfsc': _bankIfscCtrl.text,
        'consultantFee': consultantFee,
      };
    } else {
      payload = {
        'name': _nameCtrl.text,
        'mobile': _mobileCtrl.text,
        'dob': _dobCtrl.text,
        'address': _addressCtrl.text,
        'city': _cityCtrl.text,
        'state': _stateCtrl.text,
        'pin': _pinCtrl.text,
        'gender': _gender,
        'bloodGroup': _bloodGroup,
        'dosha': _dosha,
        'allergies': _allergiesCtrl.text,
        'conditions': _conditionsCtrl.text,
        'medications': _medicationsCtrl.text,
      };
    }

    try {
      final res = await ApiClient.put(ApiConfig.profile, payload);
      if (res.ok && res.data != null) {
        final updatedData = res.data!['data'] as Map<String, dynamic>?;
        if (updatedData != null) {
          final newUser = {..._profile, ...updatedData};
          setState(() {
            _profile = newUser;
            _initControllers();
            _isEditing = false;
          });
          await AuthService.saveUser(newUser);

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('✅ Profile saved successfully! Email sent if UPI changed.'),
                backgroundColor: AppColors.primaryGreen,
              ),
            );
          }
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(res.error ?? 'Failed to save profile.'),
              backgroundColor: AppColors.errorRed,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error saving profile: $e'),
            backgroundColor: AppColors.errorRed,
          ),
        );
      }
    } finally {
      setState(() => _isSaving = false);
    }
  }

  Future<void> _verifyUpiPayout() async {
    final upi = _upiCtrl.text.trim();
    if (upi.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('❌ Please enter a valid UPI ID before requesting verification.'),
          backgroundColor: AppColors.errorRed,
        ),
      );
      return;
    }

    setState(() => _isVerifyingUpi = true);

    try {
      final res = await ApiClient.post(ApiConfig.verifyUpi, {'upiId': upi});
      if (res.ok) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('✅ Verification request submitted! Check UPI for ₹1.'),
              backgroundColor: AppColors.primaryGreen,
            ),
          );
        }
        await _fetchProfile();
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(res.error ?? 'Verification request failed.'),
              backgroundColor: AppColors.errorRed,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error initiating verification: $e'),
            backgroundColor: AppColors.errorRed,
          ),
        );
      }
    } finally {
      setState(() => _isVerifyingUpi = false);
    }
  }

  Future<void> _lookupBankIfsc(String code) async {
    final cleanCode = code.trim().toUpperCase();
    if (cleanCode.length != 11) {
      setState(() {
        _ifscDetails = null;
      });
      return;
    }

    setState(() => _isLookingUpIfsc = true);

    try {
      final res = await ApiClient.get(ApiConfig.lookupIfsc(cleanCode));
      if (res.ok && res.data != null) {
        setState(() {
          _ifscDetails = res.data!['data'] as Map<String, dynamic>? ?? res.data!;
        });
      } else {
        setState(() {
          _ifscDetails = {'error': 'IFSC not found'};
        });
      }
    } catch (e) {
      setState(() {
        _ifscDetails = {'error': 'Lookup failed'};
      });
    } finally {
      setState(() => _isLookingUpIfsc = false);
    }
  }

  @override
  void dispose() {
    for (final c in [
      _nameCtrl, _mobileCtrl, _dobCtrl, _addressCtrl, _cityCtrl, _stateCtrl, _pinCtrl,
      _allergiesCtrl, _conditionsCtrl, _medicationsCtrl, _specCtrl, _licenseCtrl,
      _hospitalCtrl, _clinicLocCtrl, _upiCtrl, _bankAccCtrl, _bankAccNameCtrl, _bankIfscCtrl, _feeCtrl
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final role = _profile['role']?.toString().toLowerCase() ?? 'patient';
    final name = _profile['name'] ?? 'User';
    final email = _profile['email'] ?? '';
    final isDoctor = role == 'doctor';

    return Scaffold(
      backgroundColor: const Color(0xFFF7FDF9),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        child: Column(
          children: [
            if (_isLoadingProfile)
              const LinearProgressIndicator(
                minHeight: 2,
                valueColor: AlwaysStoppedAnimation<Color>(AppColors.primaryGreen),
                backgroundColor: Colors.transparent,
              ),
            // ── Hero Header ──
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(20, 48, 20, 28),
              decoration: const BoxDecoration(gradient: AppColors.backgroundGradient),
              child: Column(
                children: [
                  Stack(
                    alignment: Alignment.bottomRight,
                    children: [
                      Container(
                        width: 90, height: 90,
                        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 3)),
                        alignment: Alignment.center,
                        child: Text(isDoctor ? '👨‍⚕️' : '🧑', style: const TextStyle(fontSize: 44)),
                      ),
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: const BoxDecoration(color: AppColors.accentGold, shape: BoxShape.circle),
                        child: const Icon(Icons.camera_alt, size: 14, color: Colors.white),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Text(isDoctor ? 'Dr. $name' : name, style: const TextStyle(fontFamily: 'PlayfairDisplay', fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white)),
                  const SizedBox(height: 4),
                  Text(email, style: TextStyle(fontFamily: 'Poppins', fontSize: 12, color: Colors.white.withValues(alpha: 0.8))),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
                    decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.18), borderRadius: BorderRadius.circular(50)),
                    child: Text(role.toUpperCase(), style: const TextStyle(fontFamily: 'Poppins', fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white)),
                  ),
                ],
              ),
            ),

            // ── Stats Row ──
            Container(
              color: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: isDoctor
                    ? [
                        _statItem('12', 'Patients Today'),
                        _vDivider(),
                        _statItem('4.8 ⭐', 'Rating'),
                        _vDivider(),
                        _statItem('248', 'Total Consults'),
                      ]
                    : [
                        _statItem('8', 'Appointments'),
                        _vDivider(),
                        _statItem(_profile['bloodGroup'] ?? 'N/A', 'Blood Group'),
                        _vDivider(),
                        _statItem(_profile['dosha'] ?? 'N/A', 'Dosha'),
                      ],
              ),
            ),

            const Divider(height: 1),
            const SizedBox(height: 20),

            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Edit / Save Toggle
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Profile Details', style: TextStyle(fontFamily: 'PlayfairDisplay', fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.textDark)),
                      _isEditing
                          ? Row(children: [
                              TextButton(onPressed: () => setState(() { _isEditing = false; _initControllers(); }), child: const Text('Cancel', style: TextStyle(fontFamily: 'Poppins', color: AppColors.textMuted))),
                              const SizedBox(width: 8),
                              ElevatedButton(
                                onPressed: _isSaving ? null : _saveProfile,
                                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryGreen, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)), padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10)),
                                child: _isSaving ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Save', style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold, color: Colors.white)),
                              ),
                            ])
                          : OutlinedButton.icon(
                              onPressed: () => setState(() => _isEditing = true),
                              icon: const Icon(Icons.edit_outlined, size: 16),
                              label: const Text('Edit Profile', style: TextStyle(fontFamily: 'Poppins', fontSize: 12)),
                              style: OutlinedButton.styleFrom(foregroundColor: AppColors.primaryGreen, side: const BorderSide(color: AppColors.primaryGreen), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                            ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // ── Section: Personal ──
                  _sectionHeader('👤 Personal Information'),
                  const SizedBox(height: 12),
                  _buildCard([
                    _fieldRow('Full Name', _nameCtrl, readOnly: !_isEditing),
                    _divider(),
                    _fieldRow('Mobile', _mobileCtrl, readOnly: !_isEditing, keyType: TextInputType.phone),
                    _divider(),
                    _fieldRow('Date of Birth', _dobCtrl, readOnly: !_isEditing, hint: 'YYYY-MM-DD'),
                    _divider(),
                    _dropdownRow('Gender', _gender, ['Prefer not to say', 'Male', 'Female', 'Other'], (v) => setState(() => _gender = v!), enabled: _isEditing),
                    if (!isDoctor) ...[
                      _divider(),
                      _dropdownRow('Blood Group', _bloodGroup, ['Unknown', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'], (v) => setState(() => _bloodGroup = v!), enabled: _isEditing),
                    ],
                    _divider(),
                    _readOnlyRow('Email', email),
                  ]),
                  const SizedBox(height: 20),

                  // ── Section: Address ──
                  _sectionHeader('🏠 Address'),
                  const SizedBox(height: 12),
                  _buildCard([
                    _fieldRow('Street Address', _addressCtrl, readOnly: !_isEditing),
                    _divider(),
                    _fieldRow('City', _cityCtrl, readOnly: !_isEditing),
                    _divider(),
                    _fieldRow('State', _stateCtrl, readOnly: !_isEditing),
                    _divider(),
                    _fieldRow('PIN Code', _pinCtrl, readOnly: !_isEditing, keyType: TextInputType.number),
                  ]),
                  const SizedBox(height: 20),

                  // ── Patient: Ayurvedic ──
                  if (!isDoctor) ...[
                    _sectionHeader('🌿 Ayurvedic Profile'),
                    const SizedBox(height: 12),
                    _buildCard([
                      _dropdownRow('Predominant Dosha', _dosha, ['Not assessed', 'Vata', 'Pitta', 'Kapha', 'Vata-Pitta', 'Pitta-Kapha', 'Vata-Kapha', 'Tridoshic'], (v) => setState(() => _dosha = v!), enabled: _isEditing),
                      _divider(),
                      _fieldRow('Allergies', _allergiesCtrl, readOnly: !_isEditing, hint: 'e.g. Peanuts, Penicillin'),
                      _divider(),
                      _fieldRow('Chronic Conditions', _conditionsCtrl, readOnly: !_isEditing, hint: 'e.g. Diabetes, Hypertension'),
                      _divider(),
                      _fieldRow('Current Medications', _medicationsCtrl, readOnly: !_isEditing, hint: 'e.g. Metformin 500mg daily'),
                    ]),
                    const SizedBox(height: 20),
                  ],

                  // ── Doctor: Professional ──
                  if (isDoctor) ...[
                    _sectionHeader('🏥 Practice & Professional Details'),
                    const SizedBox(height: 12),
                    _buildCard([
                      _fieldRow('Specialization', _specCtrl, readOnly: !_isEditing),
                      _divider(),
                      _fieldRow('License / Reg. No.', _licenseCtrl, readOnly: true),
                      _divider(),
                      _fieldRow('Hospital / Clinic', _hospitalCtrl, readOnly: !_isEditing),
                      _divider(),
                      _fieldRow('Clinic Location', _clinicLocCtrl, readOnly: !_isEditing),
                      _divider(),
                      _fieldRow('Consultation Fee (₹)', _feeCtrl, readOnly: !_isEditing, keyType: TextInputType.number, hint: 'e.g. 500'),
                    ]),
                    const SizedBox(height: 20),

                    _sectionHeader('💸 Payout & Financial Details'),
                    const SizedBox(height: 12),
                    _buildCard([
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 10),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              '💸 Payout Details',
                              style: TextStyle(fontFamily: 'Poppins', fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textDark),
                            ),
                            _buildVerifyBadgeOrButton(),
                          ],
                        ),
                      ),
                      _divider(),
                      _upiFieldRow(),
                      _divider(),
                      _fieldRow('Account Holder Name', _bankAccNameCtrl, readOnly: !_isEditing, hint: 'As per bank records'),
                      _divider(),
                      _fieldRow('Bank Account Number', _bankAccCtrl, readOnly: !_isEditing, hint: 'Enter Account Number'),
                      _divider(),
                      _fieldRow('Bank IFSC Code', _bankIfscCtrl, readOnly: !_isEditing, hint: '11-character IFSC code'),
                      if (_isLookingUpIfsc) ...[
                        _divider(),
                        const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          child: Row(
                            children: [
                              SizedBox(
                                width: 14,
                                height: 14,
                                child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primaryGreen),
                              ),
                              SizedBox(width: 8),
                              Text(
                                'Looking up bank details...',
                                style: TextStyle(fontFamily: 'Poppins', color: AppColors.primaryGreen, fontSize: 11),
                              ),
                            ],
                          ),
                        ),
                      ],
                      if (_ifscDetails != null) ...[
                        _divider(),
                        if (_ifscDetails!['error'] != null)
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            child: Text(
                              '❌ ${_ifscDetails!['error']}',
                              style: const TextStyle(fontFamily: 'Poppins', color: AppColors.errorRed, fontSize: 11),
                            ),
                          )
                        else
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            child: Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEAF5EE),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: AppColors.primaryGreen.withValues(alpha: 0.3)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '🏦 ${_ifscDetails!['bank'] ?? 'Bank Found'}',
                                    style: const TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold, color: AppColors.primaryGreen, fontSize: 12),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '📍 Branch: ${_ifscDetails!['branch'] ?? ''}\nCity: ${_ifscDetails!['city'] ?? ''}, State: ${_ifscDetails!['state'] ?? ''}',
                                    style: const TextStyle(fontFamily: 'Poppins', color: AppColors.textDark, fontSize: 11),
                                  ),
                                ],
                              ),
                            ),
                          ),
                      ],
                    ]),
                    const SizedBox(height: 20),
                  ],

                  // ── Settings ──
                  _sectionHeader('⚙️ Settings'),
                  const SizedBox(height: 12),
                  _buildCard([
                    _actionTile(Icons.security_outlined, 'Security & Password', () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const SettingsScreen()))),
                    _divider(),
                    _actionTile(Icons.notifications_active_outlined, 'Notifications', () {}),
                    _divider(),
                    _actionTile(Icons.language_outlined, 'Language & Region', () {}),
                    _divider(),
                    _actionTile(Icons.help_outline, 'Help & Support', () {}),
                  ]),
                  const SizedBox(height: 24),

                  // ── Logout ──
                  ElevatedButton.icon(
                    onPressed: () => showDialog(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                        title: const Text('Confirm Logout', style: TextStyle(fontFamily: 'PlayfairDisplay', fontWeight: FontWeight.bold)),
                        content: const Text('Are you sure you want to logout?', style: TextStyle(fontFamily: 'Poppins')),
                        actions: [
                          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
                          ElevatedButton(
                            onPressed: () => Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const LoginScreen()), (r) => false),
                            style: ElevatedButton.styleFrom(backgroundColor: AppColors.errorRed),
                            child: const Text('Logout', style: TextStyle(color: Colors.white)),
                          ),
                        ],
                      ),
                    ),
                    icon: const Icon(Icons.logout, color: AppColors.errorRed, size: 18),
                    label: const Text('Logout', style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.w600, color: AppColors.errorRed, fontSize: 14)),
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFFDECEA), padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)), elevation: 0),
                  ),
                  const SizedBox(height: 30),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Helpers ──
  Widget _statItem(String value, String label) => Column(children: [
    Text(value, style: const TextStyle(fontFamily: 'Poppins', fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.primaryGreen)),
    const SizedBox(height: 4),
    Text(label, style: const TextStyle(fontFamily: 'Poppins', fontSize: 10, color: AppColors.textMuted)),
  ]);

  Widget _vDivider() => Container(width: 1, height: 36, color: AppColors.inputBorder);

  Widget _sectionHeader(String t) => Text(t, style: const TextStyle(fontFamily: 'Poppins', fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textDark));

  Widget _buildCard(List<Widget> children) => Container(
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.inputBorder.withValues(alpha: 0.5))),
    child: Column(children: children),
  );

  Widget _divider() => const Divider(height: 1, thickness: 1, color: Color(0xFFF0F5F1));

  Widget _fieldRow(String label, TextEditingController ctrl, {bool readOnly = true, TextInputType keyType = TextInputType.text, String? hint}) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Row(
        children: [
          SizedBox(width: 130, child: Text(label, style: const TextStyle(fontFamily: 'Poppins', fontSize: 12, color: AppColors.textMuted))),
          Expanded(
            child: TextField(
              controller: ctrl,
              readOnly: readOnly,
              keyboardType: keyType,
              style: TextStyle(fontFamily: 'Poppins', fontSize: 13, color: readOnly ? AppColors.textDark : AppColors.primaryGreen, fontWeight: FontWeight.w500),
              decoration: InputDecoration(
                hintText: hint,
                hintStyle: const TextStyle(fontFamily: 'Poppins', fontSize: 12, color: AppColors.textMuted),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _readOnlyRow(String label, String value) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    child: Row(
      children: [
        SizedBox(width: 130, child: Text(label, style: const TextStyle(fontFamily: 'Poppins', fontSize: 12, color: AppColors.textMuted))),
        Expanded(child: Text(value, style: const TextStyle(fontFamily: 'Poppins', fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.textDark))),
        const Icon(Icons.lock_outline, size: 14, color: AppColors.textMuted),
      ],
    ),
  );

  Widget _dropdownRow(String label, String value, List<String> options, ValueChanged<String?> onChanged, {bool enabled = true}) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Row(
        children: [
          SizedBox(width: 130, child: Text(label, style: const TextStyle(fontFamily: 'Poppins', fontSize: 12, color: AppColors.textMuted))),
          Expanded(
            child: enabled
                ? DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: value,
                      isExpanded: true,
                      style: const TextStyle(fontFamily: 'Poppins', fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.primaryGreen),
                      items: options.map((o) => DropdownMenuItem(value: o, child: Text(o))).toList(),
                      onChanged: onChanged,
                    ),
                  )
                : Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: Text(value, style: const TextStyle(fontFamily: 'Poppins', fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.textDark)),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _actionTile(IconData icon, String label, VoidCallback onTap) => InkWell(
    onTap: onTap,
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: const Color(0xFFEAF5EE), borderRadius: BorderRadius.circular(8)), child: Icon(icon, size: 18, color: AppColors.primaryGreen)),
          const SizedBox(width: 14),
          Expanded(child: Text(label, style: const TextStyle(fontFamily: 'Poppins', fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.textDark))),
          const Icon(Icons.arrow_forward_ios, size: 14, color: AppColors.textMuted),
        ],
      ),
    ),
  );

  Widget _buildVerifyBadgeOrButton() {
    final upiVal = _upiCtrl.text.trim();
    final hasValidUpi = RegExp(r'^[a-zA-Z0-9._-]+@[a-zA-Z]{3,}$').hasMatch(upiVal);
    final isVerified = _profile['payout_verified'] == true || _profile['payoutVerified'] == true || hasValidUpi;
    final isRequested = _profile['upi_verify_requested'] == true || _profile['upiVerifyRequested'] == true;

    if (isVerified) {
      return const Text(
        '✅ Payout Verified',
        style: TextStyle(fontFamily: 'Poppins', fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF27AE60)),
      );
    }

    if (isRequested) {
      return const Text(
        '⏳ Under Review',
        style: TextStyle(fontFamily: 'Poppins', fontSize: 11, fontWeight: FontWeight.bold, color: Colors.orange),
      );
    }

    if (!_isEditing) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: const Color(0xFFFFF4E5),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFD35400)),
        ),
        child: const Text(
          'Unverified',
          style: TextStyle(fontFamily: 'Poppins', fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFFD35400)),
        ),
      );
    }

    return SizedBox(
      height: 26,
      child: OutlinedButton(
        onPressed: _isVerifyingUpi ? null : _verifyUpiPayout,
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: AppColors.primaryGreen),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          padding: const EdgeInsets.symmetric(horizontal: 12),
        ),
        child: _isVerifyingUpi
            ? const SizedBox(
                width: 10,
                height: 10,
                child: CircularProgressIndicator(strokeWidth: 1.5, color: AppColors.primaryGreen),
              )
            : const Text(
                'Verify Credentials',
                style: TextStyle(fontFamily: 'Poppins', fontSize: 9, fontWeight: FontWeight.bold, color: AppColors.primaryGreen),
              ),
      ),
    );
  }

  Widget _upiFieldRow() {
    final isReadOnly = !_isEditing;
    final upiVal = _upiCtrl.text.trim();
    final isFormatValid = upiVal.isEmpty ? null : RegExp(r'^[a-zA-Z0-9._-]+@[a-zA-Z]{3,}$').hasMatch(upiVal);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const SizedBox(width: 130, child: Text('UPI ID', style: TextStyle(fontFamily: 'Poppins', fontSize: 12, color: AppColors.textMuted))),
              Expanded(
                child: TextField(
                  controller: _upiCtrl,
                  readOnly: isReadOnly,
                  style: TextStyle(
                    fontFamily: 'Poppins',
                    fontSize: 13,
                    color: isReadOnly
                        ? AppColors.textDark
                        : (isFormatValid == false ? AppColors.errorRed : AppColors.primaryGreen),
                    fontWeight: FontWeight.w500,
                  ),
                  decoration: const InputDecoration(
                    hintText: 'e.g. yourname@ybl',
                    hintStyle: TextStyle(fontFamily: 'Poppins', fontSize: 12, color: AppColors.textMuted),
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
            ],
          ),
          if (_isEditing && isFormatValid != null) ...[
            Padding(
              padding: const EdgeInsets.only(left: 130, bottom: 8),
              child: Text(
                isFormatValid ? '✅ Valid UPI format' : '⚠ Invalid UPI format (e.g. name@ybl)',
                style: TextStyle(
                  fontFamily: 'Poppins',
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: isFormatValid ? const Color(0xFF27AE60) : const Color(0xFFE74C3C),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

}
