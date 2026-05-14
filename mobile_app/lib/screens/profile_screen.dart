import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
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

  String _gender = 'Prefer not to say';
  String _bloodGroup = 'Unknown';
  String _dosha = 'Not assessed';

  @override
  void initState() {
    super.initState();
    _profile = Map<String, dynamic>.from(widget.user);
    _initControllers();
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
    _gender = _profile['gender'] ?? 'Prefer not to say';
    _bloodGroup = _profile['bloodGroup'] ?? 'Unknown';
    _dosha = _profile['dosha'] ?? 'Not assessed';
  }

  Future<void> _saveProfile() async {
    setState(() => _isSaving = true);
    await Future.delayed(const Duration(seconds: 1));
    setState(() {
      _profile['name'] = _nameCtrl.text;
      _profile['mobile'] = _mobileCtrl.text;
      _profile['dob'] = _dobCtrl.text;
      _profile['address'] = _addressCtrl.text;
      _profile['city'] = _cityCtrl.text;
      _profile['state'] = _stateCtrl.text;
      _profile['pin'] = _pinCtrl.text;
      _profile['gender'] = _gender;
      _profile['bloodGroup'] = _bloodGroup;
      _profile['dosha'] = _dosha;
      _profile['allergies'] = _allergiesCtrl.text;
      _profile['conditions'] = _conditionsCtrl.text;
      _profile['medications'] = _medicationsCtrl.text;
      _profile['specialization'] = _specCtrl.text;
      _profile['hospital'] = _hospitalCtrl.text;
      _isEditing = false;
      _isSaving = false;
    });
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('✅ Profile saved successfully!'), backgroundColor: AppColors.primaryGreen));
    }
  }

  @override
  void dispose() {
    for (final c in [_nameCtrl, _mobileCtrl, _dobCtrl, _addressCtrl, _cityCtrl, _stateCtrl, _pinCtrl, _allergiesCtrl, _conditionsCtrl, _medicationsCtrl, _specCtrl, _licenseCtrl, _hospitalCtrl, _clinicLocCtrl]) {
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
                    _sectionHeader('🏥 Professional Details'),
                    const SizedBox(height: 12),
                    _buildCard([
                      _fieldRow('Specialization', _specCtrl, readOnly: !_isEditing),
                      _divider(),
                      _fieldRow('License / Reg. No.', _licenseCtrl, readOnly: true),
                      _divider(),
                      _fieldRow('Hospital / Clinic', _hospitalCtrl, readOnly: !_isEditing),
                      _divider(),
                      _fieldRow('Clinic Location', _clinicLocCtrl, readOnly: !_isEditing),
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
}
