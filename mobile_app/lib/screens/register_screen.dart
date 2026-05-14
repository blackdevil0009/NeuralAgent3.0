import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:file_picker/file_picker.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/vx_text_field.dart';
import '../widgets/vx_widgets.dart';
import 'otp_screen.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});
  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen>
    with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();

  final _nameCtrl      = TextEditingController();
  final _emailCtrl     = TextEditingController();
  final _phoneCtrl     = TextEditingController();
  final _passwordCtrl  = TextEditingController();
  final _confirmCtrl   = TextEditingController();
  // Doctor-specific
  final _licenseCtrl                = TextEditingController();
  final _clinicCtrl                 = TextEditingController();
  final _customSpecializationCtrl   = TextEditingController();
  
  // New matching fields
  final _addressCtrl = TextEditingController();
  final _cityCtrl    = TextEditingController();
  final _stateCtrl   = TextEditingController();
  final _pincodeCtrl = TextEditingController();
  final _dobCtrl     = TextEditingController();

  int  _role  = 0; // 0=Patient  1=Doctor
  int  _step  = 0; // 0=Basic  1=Details  2=Security
  int  _pwStrength = 0;
  bool _loading       = false;
  bool _termsAccepted = false;

  // Dropdown selections
  String? _gender;
  String? _bloodGroup;
  String? _prakriti;
  String? _specialization;
  String? _degree;
  String? _customSpecialization;
  PlatformFile? _docFile;

  late final AnimationController _anim;
  late final Animation<double>   _fade;

  static const _roles = ['Patient', 'Doctor'];

  bool _verifyingDoc = false;
  bool _docAutoFilled = false;

  Future<void> _verifyDocumentOCR() async {
    if (_docFile == null) return;
    if (_nameCtrl.text.trim().isEmpty || _degree == null) {
      _snack('Please fill Name and Degree first before verifying.', isError: true);
      return;
    }

    setState(() => _verifyingDoc = true);
    try {
      final fields = {
        'fullName': _nameCtrl.text.trim(),
        'degree': _degree!,
        'regNumber': _licenseCtrl.text.trim(),
        'dob': _dobCtrl.text.trim(),
      };

      final res = await ApiClient.postMultipart(
        ApiConfig.verifyDocument,
        fields,
        fileField: 'document',
        filePath: _docFile!.path,
        fileBytes: _docFile!.bytes,
        fileName: _docFile!.name,
      );

      if (res.ok && res.data != null) {
        final extracted = res.data!['extracted'] as Map<String, dynamic>? ?? {};
        setState(() {
          if (extracted['regNumber'] != null) {
            _licenseCtrl.text = extracted['regNumber'].toString().replaceAll('"', '').replaceAll("'", "");
          }
          _docAutoFilled = true;
          _verifyingDoc = false;
        });
        _snack('✅ Credentials verified & auto-filled!');
      } else {
        setState(() => _verifyingDoc = false);
        _snack(res.data?['message'] ?? res.error ?? 'Verification failed.', isError: true);
      }
    } catch (e) {
      setState(() => _verifyingDoc = false);
      _snack('Error during verification.', isError: true);
    }
  }

  @override
  void initState() {
    super.initState();
    _anim = AnimationController(vsync: this, duration: const Duration(milliseconds: 550));
    _fade = CurvedAnimation(parent: _anim, curve: Curves.easeOutCubic);
    _anim.forward();
    _passwordCtrl.addListener(_calcPwStrength);
  }

  void _calcPwStrength() {
    final pw = _passwordCtrl.text;
    int score = 0;
    if (pw.length >= 8) score++;
    if (RegExp(r'[A-Z]').hasMatch(pw)) score++;
    if (RegExp(r'[0-9]').hasMatch(pw)) score++;
    if (RegExp(r'[^A-Za-z0-9]').hasMatch(pw)) score++;
    if (_pwStrength != score) {
      setState(() => _pwStrength = score);
    }
  }

  @override
  void dispose() {
    _anim.dispose();
    _passwordCtrl.removeListener(_calcPwStrength);
    for (final c in [_nameCtrl, _emailCtrl, _phoneCtrl, _passwordCtrl, _confirmCtrl, _licenseCtrl, _clinicCtrl, _customSpecializationCtrl, _addressCtrl, _cityCtrl, _stateCtrl, _pincodeCtrl, _dobCtrl]) {
      c.dispose();
    }
    super.dispose();
  }

  void _next() {
    if (_formKey.currentState!.validate()) {
      if (_step < 2) {
        setState(() => _step++);
      } else {
        _submit();
      }
    }
  }

  void _back() { if (_step > 0) setState(() => _step--); }

  Future<void> _submit() async {
    if (!_termsAccepted) {
      _snack('Please accept the Terms & Conditions.', isError: true);
      return;
    }
    if (_role == 0 && _gender == null) {
      _snack('Please select a gender.', isError: true);
      return;
    }
    setState(() => _loading = true);

    try {
      ApiResponse<Map<String, dynamic>> res;

      if (_role == 0) {
        final payload = {
          'role': 'patient',
          'fullName': _nameCtrl.text.trim(),
          'email': _emailCtrl.text.trim(),
          'mobile': _phoneCtrl.text.trim(),
          'password': _passwordCtrl.text.trim(),
          'gender': _gender?.toLowerCase(),
          'bloodGroup': _bloodGroup,
          'dosha': _prakriti,
          'dob': _dobCtrl.text.trim(),
          'address': _addressCtrl.text.trim(),
          'city': _cityCtrl.text.trim(),
          'state': _stateCtrl.text.trim(),
          'pincode': _pincodeCtrl.text.trim(),
          'termsAgreed': _termsAccepted,
        };
        res = await ApiClient.post(ApiConfig.register, payload);
      } else {
        if (_docFile == null) {
          _snack('Please upload your degree/marksheet.', isError: true);
          setState(() => _loading = false);
          return;
        }
        final fields = {
          'role': 'doctor',
          'fullName': _nameCtrl.text.trim(),
          'email': _emailCtrl.text.trim(),
          'mobile': _phoneCtrl.text.trim(),
          'password': _passwordCtrl.text.trim(),
          'specialization': (_specialization == 'Other' && (_customSpecialization ?? '').isNotEmpty)
              ? _customSpecialization!
              : (_specialization ?? 'General Medicine'),
          'regNumber': _licenseCtrl.text.trim(),
          'hospital': _clinicCtrl.text.trim(),
          'address': _addressCtrl.text.trim(),
          'city': _cityCtrl.text.trim(),
          'state': _stateCtrl.text.trim(),
          'pincode': _pincodeCtrl.text.trim(),
          'dob': _dobCtrl.text.trim(),
          'termsAgreed': _termsAccepted.toString(),
          'degree': _degree ?? 'MBBS',
          'position': 'Consultant',
          'experience': '5',
        };
        res = await ApiClient.postMultipart(
          ApiConfig.register,
          fields,
          fileField: 'document',
          filePath: _docFile!.path,
          fileBytes: _docFile!.bytes,
          fileName: _docFile!.name,
        );
      }

      if (!mounted) return;
      setState(() => _loading = false);

      if (res.ok) {
        _showSuccess();
      } else {
        String errMsg = res.data?['message'] ?? res.error ?? 'Registration error.';
        if (res.data != null && res.data!['errors'] != null) {
          try {
            final errs = res.data!['errors'] as Map<String, dynamic>;
            errMsg = errs.values.map((v) => v is List ? v.join(', ') : v.toString()).join('\n');
          } catch (_) {}
        }
        _snack(errMsg, isError: true);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      _snack('Connection error. Check your network.', isError: true);
    }
  }

  void _snack(String msg, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: isError ? AppColors.errorRed : AppColors.primaryGreen,
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ));
  }

  void _showSuccess() {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => OtpScreen(
          email: _emailCtrl.text.trim(),
          purpose: 'registration',
        ),
      ),
    );
  }

  // ── Step 0: Basic Info ────────────────────────────────────────────────────
  Widget _step0() => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      VxTextField(
        label: _role == 1 ? 'Full Name (as per license)' : 'Full Name',
        hint: _role == 1 ? 'Dr. First Last' : 'Enter your full name',
        icon: Icons.person_outline,
        controller: _nameCtrl,
        validator: (v) => (v ?? '').trim().isEmpty ? 'Name is required' : null,
      ),
      const SizedBox(height: 12),
      VxTextField(
        label: 'Email Address',
        hint: 'Enter your email',
        icon: Icons.email_outlined,
        keyboardType: TextInputType.emailAddress,
        controller: _emailCtrl,
        validator: (v) {
          final t = v?.trim() ?? '';
          if (t.isEmpty) return 'Email is required';
          if (!t.contains('@')) return 'Enter a valid email';
          return null;
        },
      ),
      const SizedBox(height: 12),
      VxTextField(
        label: 'Mobile Number',
        hint: '+91 XXXXX XXXXX',
        icon: Icons.phone_outlined,
        keyboardType: TextInputType.phone,
        controller: _phoneCtrl,
        validator: (v) {
          final t = v?.trim() ?? '';
          if (t.isEmpty) return 'Mobile number required';
          if (t.length < 10) return 'Enter valid 10-digit number';
          return null;
        },
      ),
    ],
  );

  // ── Step 1: Role-specific Details ─────────────────────────────────────────
  Widget _step1() => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      _infoCard(
        icon: _role == 0 ? '🌿' : '⚕️',
        title: _role == 0 ? 'Personal Details' : 'Professional Details',
        subtitle: _role == 0
            ? 'Helps us personalize your Ayurvedic health journey.'
            : 'Your credentials will be verified by our team.',
      ),
      const SizedBox(height: 14),
      if (_role == 0) ...[
        _genderRow(),
        const SizedBox(height: 12),
        _dropdown(
          label: 'BLOOD GROUP',
          hint: 'Select blood group',
          icon: Icons.water_drop_outlined,
          items: ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−'],
          value: _bloodGroup,
          onChanged: (v) => setState(() => _bloodGroup = v),
        ),
        const SizedBox(height: 12),
        _dropdown(
          label: 'PRAKRITI (BODY TYPE)',
          hint: 'Select Prakriti',
          icon: Icons.self_improvement_outlined,
          items: ['Vata', 'Pitta', 'Kapha', 'Vata-Pitta', 'Pitta-Kapha', 'Vata-Kapha', 'Tridosha'],
          value: _prakriti,
          onChanged: (v) => setState(() => _prakriti = v),
        ),
        const SizedBox(height: 12),
        VxTextField(
          label: 'Date of Birth',
          hint: 'YYYY-MM-DD',
          icon: Icons.calendar_month_outlined,
          controller: _dobCtrl,
          validator: (v) {
            final t = (v ?? '').trim();
            if (t.isEmpty) return 'Required';
            if (!RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(t)) return 'Use YYYY-MM-DD format';
            return null;
          },
        ),
        const SizedBox(height: 18),
        _infoCard(
          icon: '🏠',
          title: 'Address Information',
          subtitle: 'Required for home deliveries & services.',
        ),
        const SizedBox(height: 14),
        VxTextField(
          label: 'Address',
          hint: 'House No, Street',
          icon: Icons.location_on_outlined,
          controller: _addressCtrl,
          validator: (v) => (v ?? '').trim().length < 10 ? 'Min 10 chars' : null,
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(child: VxTextField(label: 'City', hint: 'City', icon: Icons.location_city_outlined, controller: _cityCtrl)),
            const SizedBox(width: 8),
            Expanded(child: VxTextField(label: 'State', hint: 'State', icon: Icons.map_outlined, controller: _stateCtrl)),
          ]
        ),
        const SizedBox(height: 12),
        VxTextField(
          label: 'Pincode',
          hint: 'e.g. 400001',
          icon: Icons.pin_drop_outlined,
          controller: _pincodeCtrl,
          keyboardType: TextInputType.number,
          validator: (v) {
            final t = (v ?? '').trim();
            if (!RegExp(r'^\d{6}$').hasMatch(t)) return 'Enter valid 6-digit PIN';
            return null;
          },
        ),
      ] else ...[
        _dropdown(
          label: 'MEDICAL DEGREE',
          hint: 'Select your degree',
          icon: Icons.school_outlined,
          items: [
            'MBBS', 'MD', 'MS', 'DNB', 'DM', 'MCh',
            'BDS', 'MDS',
            'BAMS', 'MD (Ayurveda)', 'MS (Ayurveda)',
            'BHMS', 'MD (Homeopathy)',
            'BUMS', 'MD (Unani)',
            'BNYS', 'BPT', 'MPT',
            'BSc Nursing', 'MSc Nursing', 'GNM', 'ANM',
            'D.Pharm', 'B.Pharm', 'M.Pharm', 'Pharm.D',
            'BMLT', 'DMLT', 'MPH', 'MHA',
            'FRCS', 'MRCP', 'FRCP', 'FACS', 'FCPS',
            'DA', 'DCH', 'DGO', 'DLO', 'DPM', 'DO', 'DOMS',
          ],
          value: _degree,
          onChanged: (v) => setState(() => _degree = v),
        ),
        const SizedBox(height: 12),
        _dropdown(
          label: 'SPECIALIZATION',
          hint: 'Select specialization',
          icon: Icons.medical_information_outlined,
          items: [
            'General Physician', 'Ayurveda', 'Homeopathy', 'Unani', 'Naturopathy',
            'General Medicine', 'General Surgery', 'Cardiology', 'Pediatrics',
            'Orthopedics', 'Neurology', 'Dermatology', 'Psychiatry',
            'Gynecology', 'Ophthalmology', 'ENT', 'Oncology', 'Radiology',
            'Anesthesiology', 'Pathology', 'Nephrology', 'Urology',
            'Endocrinology', 'Gastroenterology', 'Pulmonology', 'Rheumatology',
            'Emergency Medicine', 'Family Medicine', 'Community Medicine',
            'Geriatrics', 'Sports Medicine', 'Palliative Care',
            'Dentistry', 'Oral Surgery', 'Physiotherapy', 'Pharmacy', 'Nursing',
            'Neonatology', 'Hepatology', 'Plastic Surgery', 'Neurosurgery',
            'Vascular Surgery', 'Thoracic Surgery', 'Transplant Medicine',
            'Nutrition & Dietetics', 'Other',
          ],
          value: _specialization,
          onChanged: (v) => setState(() => _specialization = v),
        ),
        if (_specialization == 'Other') ...[
          const SizedBox(height: 10),
          VxTextField(
            label: 'Custom Specialization',
            hint: 'Enter your specialization',
            icon: Icons.edit_outlined,
            controller: _customSpecializationCtrl,
            validator: (v) => (v ?? '').trim().isEmpty ? 'Please enter your specialization' : null,
          ),
        ],
        const SizedBox(height: 12),
        VxTextField(
          label: 'Medical License / Reg. No.',
          hint: 'e.g. MCI-123456',
          icon: Icons.badge_outlined,
          controller: _licenseCtrl,
          validator: (v) => (v ?? '').trim().isEmpty ? 'License number required' : null,
        ),
        const SizedBox(height: 12),
        VxTextField(
          label: 'Date of Birth',
          hint: 'YYYY-MM-DD',
          icon: Icons.calendar_today_outlined,
          controller: _dobCtrl,
          validator: (v) {
            final t = (v ?? '').trim();
            // DOB is optional for doctors but validated if entered
            if (t.isNotEmpty && !RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(t))
              return 'Use YYYY-MM-DD format';
            return null;
          },
        ),
        const SizedBox(height: 18),
        // ── Clinic Information ─────────────────────────────────────
        _infoCard(
          icon: '🏥',
          title: 'Clinic Information',
          subtitle: 'Where patients can reach you for consultations.',
        ),
        const SizedBox(height: 14),
        VxTextField(
          label: 'Clinic Name',
          hint: 'e.g. Arya Wellness Clinic',
          icon: Icons.local_hospital_outlined,
          controller: _clinicCtrl,
          validator: (v) => (v ?? '').trim().isEmpty ? 'Required' : null,
        ),
        const SizedBox(height: 12),
        VxTextField(
          label: 'Clinic Address',
          hint: 'House No, Street',
          icon: Icons.location_on_outlined,
          controller: _addressCtrl,
          validator: (v) => (v ?? '').trim().length < 10 ? 'Min 10 chars' : null,
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(child: VxTextField(label: 'City', hint: 'City', icon: Icons.location_city_outlined, controller: _cityCtrl)),
            const SizedBox(width: 8),
            Expanded(child: VxTextField(label: 'State', hint: 'State', icon: Icons.map_outlined, controller: _stateCtrl)),
          ]
        ),
        const SizedBox(height: 12),
        VxTextField(
          label: 'Pincode',
          hint: 'e.g. 400001',
          icon: Icons.pin_drop_outlined,
          controller: _pincodeCtrl,
          keyboardType: TextInputType.number,
          validator: (v) {
            final t = (v ?? '').trim();
            if (!RegExp(r'^\d{6}$').hasMatch(t)) return 'Enter valid 6-digit PIN';
            return null;
          },
        ),
        const SizedBox(height: 14),
        _infoCard(icon: '📄', title: 'Medical Degree', subtitle: 'Upload degree/marksheet (PDF/JPG/PNG).'),
        const SizedBox(height: 8),
        GestureDetector(
          onTap: () async {
            final result = await FilePicker.platform.pickFiles(
              type: FileType.custom, allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png']
            );
            if (result != null) {
              setState(() {
                _docFile = result.files.first;
                _docAutoFilled = false;
              });
            }
          },
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.cardBg,
              border: Border.all(color: _docFile == null ? AppColors.inputBorder : AppColors.primaryGreen),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                Icon(Icons.upload_file, color: _docFile == null ? AppColors.textMuted : AppColors.primaryGreen),
                const SizedBox(width: 8),
                Expanded(child: Text(_docFile?.name ?? 'Tap to select document', maxLines: 1, overflow: TextOverflow.ellipsis)),
                if (_docFile != null) ...[
                  const SizedBox(width: 8),
                  Icon(Icons.check_circle, size: 16, color: AppColors.primaryGreen),
                ]
              ],
            ),
          ),
        ),
        if (_docFile != null && !_docAutoFilled) ...[
          const SizedBox(height: 8),
          ElevatedButton.icon(
            onPressed: _verifyingDoc ? null : _verifyDocumentOCR,
            icon: _verifyingDoc 
                ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.auto_fix_high, size: 16),
            label: Text(_verifyingDoc ? 'Scanning...' : 'Verify & Auto-fill Credentials'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primaryGreen,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 10),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
          ),
        ] else if (_docAutoFilled) ...[
          const SizedBox(height: 4),
          Row(
            children: [
              Icon(Icons.auto_awesome, size: 12, color: AppColors.primaryGreen),
              const SizedBox(width: 4),
              Text('Auto-filled from document', style: TextStyle(fontSize: 11, color: AppColors.primaryGreen, fontWeight: FontWeight.w600)),
            ],
          ),
        ],
      ],
    ],
  );

  // ── Step 2: Security ───────────────────────────────────────────────────────
  Widget _step2() => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      _infoCard(
        icon: '🔒',
        title: 'Secure Your Account',
        subtitle: 'Create a strong password to protect your health data.',
      ),
      const SizedBox(height: 14),
      VxTextField(
        label: 'Password',
        hint: 'Minimum 8 characters',
        icon: Icons.lock_outline,
        isPassword: true,
        controller: _passwordCtrl,
        validator: (v) {
          final pw = (v ?? '').trim();
          if (pw.length < 8) return 'Minimum 8 characters required';
          if (!RegExp(r'[A-Z]').hasMatch(pw)) return 'Must contain an uppercase letter';
          if (!RegExp(r'[0-9]').hasMatch(pw)) return 'Must contain a number';
          if (!RegExp(r'[^A-Za-z0-9]').hasMatch(pw)) return 'Must contain a special character';
          return null;
        },
      ),
      if (_passwordCtrl.text.isNotEmpty)
        Padding(
          padding: const EdgeInsets.only(top: 8, bottom: 4),
          child: Row(
            children: [
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: _pwStrength / 4,
                    minHeight: 6,
                    backgroundColor: const Color(0xFFE0E0E0),
                    valueColor: AlwaysStoppedAnimation<Color>(
                      _pwStrength <= 1 ? AppColors.errorRed :
                      _pwStrength == 2 ? const Color(0xFFE67E22) :
                      _pwStrength == 3 ? const Color(0xFFF1C40F) :
                      AppColors.primaryGreen,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                _pwStrength <= 1 ? 'Weak' : _pwStrength == 2 ? 'Fair' : _pwStrength == 3 ? 'Good' : 'Strong',
                style: TextStyle(
                  fontFamily: 'Poppins', fontSize: 11, fontWeight: FontWeight.w600,
                  color: _pwStrength <= 1 ? AppColors.errorRed :
                         _pwStrength == 2 ? const Color(0xFFE67E22) :
                         _pwStrength == 3 ? const Color(0xFFF1C40F) :
                         AppColors.primaryGreen,
                ),
              ),
            ],
          ),
        ),
      const Padding(
        padding: EdgeInsets.only(top: 6, bottom: 6),
        child: Text(
          'Must be at least 8 characters, include an uppercase letter, a number, and a special character.',
          style: TextStyle(fontFamily: 'Poppins', fontSize: 11, color: Colors.grey),
        ),
      ),
      const SizedBox(height: 12),
      VxTextField(
        label: 'Confirm Password',
        hint: 'Re-enter your password',
        icon: Icons.lock_reset_outlined,
        isPassword: true,
        controller: _confirmCtrl,
        textInputAction: TextInputAction.done,
        validator: (v) {
          if ((v ?? '').trim() != _passwordCtrl.text.trim()) return 'Passwords do not match';
          return null;
        },
      ),
      const SizedBox(height: 14),
      Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFFEAF5EE),
          borderRadius: BorderRadius.circular(10),
        ),
        child: const Text(
          '💡 Use uppercase, lowercase, numbers & symbols for a strong password.',
          style: TextStyle(fontFamily: 'Poppins', fontSize: 11, color: AppColors.textMuted),
        ),
      ),
      const SizedBox(height: 14),
      Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 20, height: 20,
            child: Checkbox(
              value: _termsAccepted,
              activeColor: AppColors.primaryGreen,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
              onChanged: (v) => setState(() => _termsAccepted = v ?? false),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: RichText(
              text: const TextSpan(
                style: TextStyle(fontFamily: 'Poppins', fontSize: 11.5, color: AppColors.textMuted),
                children: [
                  TextSpan(text: 'I agree to the '),
                  TextSpan(text: 'Terms & Conditions', style: TextStyle(color: AppColors.primaryGreen, fontWeight: FontWeight.w600)),
                  TextSpan(text: ' and '),
                  TextSpan(text: 'Privacy Policy', style: TextStyle(color: AppColors.primaryGreen, fontWeight: FontWeight.w600)),
                  TextSpan(text: ' of VaidyaMed-X.'),
                ],
              ),
            ),
          ),
        ],
      ),
    ],
  );

  // ── Helpers ────────────────────────────────────────────────────────────────
  Widget _infoCard({required String icon, required String title, required String subtitle}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFEAF5EE), Color(0xFFF4FAF6)],
          begin: Alignment.topLeft, end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.primaryLight.withValues(alpha: 0.3), width: 1.2),
      ),
      child: Row(
        children: [
          Text(icon, style: const TextStyle(fontSize: 28)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontFamily: 'Poppins', fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.primaryGreen)),
                Text(subtitle, style: AppTextStyles.sectionSub),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _genderRow() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('GENDER', style: AppTextStyles.label),
        const SizedBox(height: 6),
        Row(
          children: ['Male', 'Female', 'Other'].map((g) {
            final sel = _gender == g;
            return Expanded(
              child: GestureDetector(
                onTap: () => setState(() => _gender = g),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  margin: EdgeInsets.only(right: g == 'Other' ? 0 : 8),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    color: sel ? AppColors.primaryGreen : AppColors.cardBg,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: sel ? AppColors.primaryGreen : AppColors.inputBorder, width: 1.8),
                  ),
                  alignment: Alignment.center,
                  child: Text(g, style: TextStyle(fontFamily: 'Poppins', fontSize: 12, fontWeight: FontWeight.w500, color: sel ? Colors.white : AppColors.textMuted)),
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _dropdown({
    required String label, required String hint, required IconData icon,
    required List<String> items, required String? value, required ValueChanged<String?> onChanged,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: AppTextStyles.label),
        const SizedBox(height: 5),
        DropdownButtonFormField<String>(
          initialValue: value,
          hint: Text(hint, style: const TextStyle(fontFamily: 'Poppins', fontSize: 13, color: Color(0xFFAEC8B4))),
          items: items.map((e) => DropdownMenuItem(value: e, child: Text(e, style: const TextStyle(fontFamily: 'Poppins', fontSize: 13.5)))).toList(),
          onChanged: onChanged,
          dropdownColor: Colors.white,
          borderRadius: BorderRadius.circular(12),
          icon: const Icon(Icons.keyboard_arrow_down_rounded, color: AppColors.textMuted),
          decoration: InputDecoration(
            prefixIcon: Icon(icon, size: 18, color: AppColors.textMuted),
            filled: true,
            fillColor: AppColors.cardBg,
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppDimens.radiusInput), borderSide: const BorderSide(color: AppColors.inputBorder, width: 1.8)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(AppDimens.radiusInput), borderSide: const BorderSide(color: AppColors.inputBorder, width: 1.8)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(AppDimens.radiusInput), borderSide: const BorderSide(color: AppColors.inputFocus, width: 2)),
          ),
        ),
      ],
    );
  }

  Widget _stepIndicator() {
    const labels = ['Basic Info', 'Details', 'Security'];
    return Row(
      children: List.generate(3, (i) {
        final done   = i < _step;
        final active = i == _step;
        return Expanded(
          child: Row(
            children: [
              Expanded(
                child: Column(
                  children: [
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 250),
                      width: 28, height: 28,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: (done || active) ? AppColors.primaryGreen : const Color(0xFFDCEEDE),
                        border: Border.all(color: active ? AppColors.accentGold : Colors.transparent, width: 2),
                      ),
                      child: Center(
                        child: done
                            ? const Icon(Icons.check, size: 14, color: Colors.white)
                            : Text('${i + 1}', style: TextStyle(fontFamily: 'Poppins', fontSize: 12, fontWeight: FontWeight.w600, color: active ? Colors.white : AppColors.textMuted)),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(labels[i], style: TextStyle(fontFamily: 'Poppins', fontSize: 9.5, fontWeight: active ? FontWeight.w600 : FontWeight.w400, color: active ? AppColors.primaryGreen : AppColors.textMuted)),
                  ],
                ),
              ),
              if (i < 2)
                Expanded(
                  child: Container(
                    height: 2,
                    margin: const EdgeInsets.only(bottom: 18),
                    color: i < _step ? AppColors.primaryGreen : const Color(0xFFDCEEDE),
                  ),
                ),
            ],
          ),
        );
      }),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: AppColors.backgroundGradient),
        child: SafeArea(
          child: FadeTransition(
            opacity: _fade,
            child: Column(
              children: [
                // ── Top bar ──────────────────────────────────────────
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
                          Text('Create your account', style: TextStyle(fontFamily: 'Poppins', fontSize: 11, color: Colors.white.withValues(alpha: 0.7))),
                        ],
                      ),
                    ],
                  ),
                ),
                // ── Scrollable card ───────────────────────────────────
                Expanded(
                  child: SingleChildScrollView(
                    physics: const BouncingScrollPhysics(),
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(AppDimens.radiusCard),
                        boxShadow: [BoxShadow(color: const Color(0xFF143C1E).withValues(alpha: 0.15), blurRadius: 32, offset: const Offset(0, 12))],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(AppDimens.radiusCard),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            // Role tabs
                            Padding(
                              padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                              child: VxRoleTabs(
                                roles: _roles,
                                selected: _role,
                                onSelect: (i) => setState(() { _role = i; _step = 0; }),
                              ),
                            ),
                            // Step indicator
                            Padding(
                              padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
                              child: _stepIndicator(),
                            ),
                            // Form
                            Padding(
                              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                              child: Form(
                                key: _formKey,
                                child: AnimatedSwitcher(
                                  duration: const Duration(milliseconds: 280),
                                  transitionBuilder: (child, anim) => FadeTransition(opacity: anim, child: child),
                                  child: KeyedSubtree(
                                    key: ValueKey('$_role-$_step'),
                                    child: _step == 0 ? _step0() : _step == 1 ? _step1() : _step2(),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 14),
                            // Nav buttons
                            Padding(
                              padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
                              child: Row(
                                children: [
                                  if (_step > 0) ...[
                                    Expanded(child: VxButton(label: 'Back', onPressed: _back, outlined: true)),
                                    const SizedBox(width: 12),
                                  ],
                                  Expanded(
                                    flex: _step > 0 ? 2 : 1,
                                    child: VxButton(
                                      label: _step == 2 ? 'Create Account' : 'Continue',
                                      onPressed: _next,
                                      isLoading: _loading,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 12),
                            // Login CTA
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Text('Already have an account? ', style: TextStyle(fontFamily: 'Poppins', fontSize: 12, color: AppColors.textMuted)),
                                GestureDetector(
                                  onTap: () => Navigator.of(context).pop(),
                                  child: const Text('Sign In', style: AppTextStyles.link),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            const VxShlokaBanner(),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
