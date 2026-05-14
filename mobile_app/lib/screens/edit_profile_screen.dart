import 'package:flutter/material.dart';
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
    _nameCtrl = TextEditingController(text: widget.user['name'] ?? '');
    _phoneCtrl = TextEditingController(text: widget.user['mobile'] ?? '');
    _dobCtrl = TextEditingController(text: widget.user['dob'] ?? '');
    _addressCtrl = TextEditingController(text: widget.user['address'] ?? '');
    _cityCtrl = TextEditingController(text: widget.user['city'] ?? '');
    _stateCtrl = TextEditingController(text: widget.user['state'] ?? '');
    _pinCtrl = TextEditingController(text: widget.user['pin'] ?? widget.user['pincode'] ?? '');
    _allergiesCtrl = TextEditingController(text: widget.user['allergies'] ?? '');
    _conditionsCtrl = TextEditingController(text: widget.user['conditions'] ?? '');
    _medicationsCtrl = TextEditingController(text: widget.user['medications'] ?? '');

    _gender = widget.user['gender'] ?? 'Prefer not to say';
    _bloodGroup = widget.user['bloodGroup'] ?? 'Unknown';
    _dosha = widget.user['dosha'] ?? 'Not assessed';
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
    await Future.delayed(const Duration(seconds: 1)); // Mock save
    if (!mounted) return;
    
    // Return mock updated data
    Navigator.of(context).pop({
      ...widget.user,
      'name': _nameCtrl.text,
      'mobile': _phoneCtrl.text,
      'dob': _dobCtrl.text,
      'address': _addressCtrl.text,
      'city': _cityCtrl.text,
      'state': _stateCtrl.text,
      'pin': _pinCtrl.text,
      'allergies': _allergiesCtrl.text,
      'conditions': _conditionsCtrl.text,
      'medications': _medicationsCtrl.text,
      'gender': _gender,
      'bloodGroup': _bloodGroup,
      'dosha': _dosha,
    });
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
              VxTextField(label: 'Email', hint: 'Email', icon: Icons.email_outlined, controller: TextEditingController(text: widget.user['email']), readOnly: true),
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
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label.toUpperCase(), style: AppTextStyles.label),
        const SizedBox(height: 6),
        DropdownButtonFormField<String>(
          value: items.contains(value) ? value : items.first,
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
