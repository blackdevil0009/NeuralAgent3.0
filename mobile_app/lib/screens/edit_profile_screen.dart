import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../widgets/vx_text_field.dart';
import '../widgets/vx_widgets.dart';

class EditProfileScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  const EditProfileScreen({super.key, required this.user});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  late TextEditingController _nameCtrl;
  late TextEditingController _phoneCtrl;
  late TextEditingController _dobCtrl;
  late TextEditingController _addressCtrl;
  late TextEditingController _cityCtrl;
  late TextEditingController _stateCtrl;
  late TextEditingController _pinCtrl;
  late TextEditingController _allergiesCtrl;
  late TextEditingController _conditionsCtrl;
  late TextEditingController _medicationsCtrl;

  String? _gender;
  String? _bloodGroup;
  String? _dosha;

  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController(text: widget.user['name']?.toString() ?? '');
    _phoneCtrl = TextEditingController(text: widget.user['mobile']?.toString() ?? '');
    _dobCtrl = TextEditingController(text: widget.user['dob']?.toString() ?? '');
    _addressCtrl = TextEditingController(text: widget.user['address']?.toString() ?? '');
    _cityCtrl = TextEditingController(text: widget.user['city']?.toString() ?? '');
    _stateCtrl = TextEditingController(text: widget.user['state']?.toString() ?? '');
    _pinCtrl = TextEditingController(text: (widget.user['pin'] ?? widget.user['pincode'])?.toString() ?? '');
    _allergiesCtrl = TextEditingController(text: widget.user['allergies']?.toString() ?? '');
    _conditionsCtrl = TextEditingController(text: widget.user['conditions']?.toString() ?? '');
    _medicationsCtrl = TextEditingController(text: widget.user['medications']?.toString() ?? '');

    _gender = _matchItem(['Prefer not to say', 'Male', 'Female', 'Other'], widget.user['gender']?.toString());
    _bloodGroup = _matchItem(['Unknown', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'], widget.user['bloodGroup']?.toString());
    _dosha = _matchItem(['Not assessed', 'Vata', 'Pitta', 'Kapha', 'Vata-Pitta', 'Pitta-Kapha', 'Vata-Kapha', 'Tridoshic'], widget.user['dosha']?.toString());
  }

  String _matchItem(List<String> items, String? val) {
    if (val == null || val.isEmpty) return items.first;
    final lowerVal = val.toLowerCase();
    for (final item in items) {
      if (item.toLowerCase() == lowerVal) return item;
    }
    return items.first;
  }

  @override
  void dispose() {
    _nameCtrl.dispose(); _phoneCtrl.dispose(); _dobCtrl.dispose();
    _addressCtrl.dispose(); _cityCtrl.dispose(); _stateCtrl.dispose();
    _pinCtrl.dispose(); _allergiesCtrl.dispose(); _conditionsCtrl.dispose();
    _medicationsCtrl.dispose();
    super.dispose();
  }

  void _saveProfile() async {
    setState(() => _isLoading = true);
    
    String rawMobile = _phoneCtrl.text.replaceAll(RegExp(r'\D'), '');
    if (rawMobile.length > 10 && rawMobile.startsWith('91')) {
      rawMobile = rawMobile.substring(2);
    }
    
    final payload = {
      'name': _nameCtrl.text,
      'mobile': rawMobile,
      'address': _addressCtrl.text,
      'city': _cityCtrl.text,
      'state': _stateCtrl.text,
      'pin': _pinCtrl.text.replaceAll(RegExp(r'\D'), ''),
      'allergies': _allergiesCtrl.text,
      'conditions': _conditionsCtrl.text,
      'medications': _medicationsCtrl.text,
      'bloodGroup': _bloodGroup,
      'dosha': _dosha,
    };

    try {
      final res = await ApiClient.put(ApiConfig.profile, payload);
      
      if (!mounted) return;
      setState(() => _isLoading = false);

      if (res.ok && res.data != null) {
        final updatedData = res.data!['data'] as Map<String, dynamic>?;
        if (updatedData != null) {
          // Keep local state merged with new backend state
          final newUser = {...widget.user, ...updatedData};
          await AuthService.saveUser(newUser);
          
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profile updated successfully'), backgroundColor: AppColors.primaryGreen));
          Navigator.of(context).pop(newUser);
        }
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(res.error ?? 'Failed to update profile'), backgroundColor: AppColors.errorRed));
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Connection error'), backgroundColor: AppColors.errorRed));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7FDF9),
      appBar: AppBar(
        title: const Text('Edit Profile', style: TextStyle(fontFamily: 'PlayfairDisplay', fontWeight: FontWeight.w700, color: AppColors.primaryGreen)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.primaryGreen),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        physics: const BouncingScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _buildSection('👤 Personal Information', [
              VxTextField(label: 'Full Name', hint: 'Your full name', icon: Icons.person_outline, controller: _nameCtrl),
              const SizedBox(height: 12),
              VxTextField(label: 'Email', hint: 'Email', icon: Icons.email_outlined, controller: TextEditingController(text: widget.user['email']?.toString() ?? ''), readOnly: true),
              const SizedBox(height: 12),
              VxTextField(label: 'Mobile', hint: '+91 XXXXX XXXXX', icon: Icons.phone_outlined, controller: _phoneCtrl),
              const SizedBox(height: 12),
              VxTextField(label: 'Date of Birth', hint: 'YYYY-MM-DD', icon: Icons.calendar_month_outlined, controller: _dobCtrl),
              const SizedBox(height: 12),
              _buildDropdown('Gender', ['Prefer not to say', 'Male', 'Female', 'Other'], _gender, (v) => setState(() => _gender = v)),
              const SizedBox(height: 12),
              _buildDropdown('Blood Group', ['Unknown', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'], _bloodGroup, (v) => setState(() => _bloodGroup = v)),
            ]),
            const SizedBox(height: 20),
            _buildSection('🏠 Address', [
              VxTextField(label: 'Street Address', hint: 'Your address', icon: Icons.location_on_outlined, controller: _addressCtrl),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(child: VxTextField(label: 'City', hint: 'City', icon: Icons.location_city_outlined, controller: _cityCtrl)),
                  const SizedBox(width: 8),
                  Expanded(child: VxTextField(label: 'State', hint: 'State', icon: Icons.map_outlined, controller: _stateCtrl)),
                ],
              ),
              const SizedBox(height: 12),
              VxTextField(label: 'PIN Code', hint: '6-digit PIN', icon: Icons.pin_drop_outlined, controller: _pinCtrl),
            ]),
            const SizedBox(height: 20),
            _buildSection('🌿 Ayurvedic Profile', [
              _buildDropdown('Predominant Dosha', ['Not assessed', 'Vata', 'Pitta', 'Kapha', 'Vata-Pitta', 'Pitta-Kapha', 'Vata-Kapha', 'Tridoshic'], _dosha, (v) => setState(() => _dosha = v)),
              const SizedBox(height: 12),
              VxTextField(label: 'Allergies', hint: 'e.g. Peanuts, Penicillin', icon: Icons.warning_amber_outlined, controller: _allergiesCtrl),
              const SizedBox(height: 12),
              VxTextField(label: 'Chronic Conditions', hint: 'e.g. Diabetes', icon: Icons.medical_services_outlined, controller: _conditionsCtrl),
              const SizedBox(height: 12),
              VxTextField(label: 'Current Medications', hint: 'e.g. Metformin 500mg', icon: Icons.medication_outlined, controller: _medicationsCtrl),
            ]),
            const SizedBox(height: 32),
            VxButton(label: 'Save Changes', onPressed: _saveProfile, isLoading: _isLoading),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildSection(String title, List<Widget> children) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.inputBorder.withValues(alpha: 0.5)),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 5, offset: const Offset(0, 2))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(title, style: const TextStyle(fontFamily: 'Poppins', fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textDark)),
          const SizedBox(height: 16),
          ...children,
        ],
      ),
    );
  }

  Widget _buildDropdown(String label, List<String> items, String? value, ValueChanged<String?> onChanged) {
    String safeValue = items.first;
    if (value != null && value.isNotEmpty) {
      final lower = value.toLowerCase();
      for (final item in items) {
        if (item.toLowerCase() == lower) {
          safeValue = item;
          break;
        }
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label.toUpperCase(), style: AppTextStyles.label),
        const SizedBox(height: 6),
        DropdownButtonFormField<String>(
          value: safeValue,
          items: items.map((e) => DropdownMenuItem(value: e, child: Text(e, style: const TextStyle(fontFamily: 'Poppins', fontSize: 13)))).toList(),
          onChanged: onChanged,
          decoration: InputDecoration(
            filled: true,
            fillColor: AppColors.cardBg,
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.inputBorder)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.inputBorder)),
          ),
        ),
      ],
    );
  }
}
