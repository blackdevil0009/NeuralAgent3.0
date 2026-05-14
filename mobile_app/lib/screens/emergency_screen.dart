import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../widgets/vx_text_field.dart';
import '../widgets/vx_widgets.dart';

class EmergencyScreen extends StatefulWidget {
  final String role;
  const EmergencyScreen({super.key, required this.role});

  @override
  State<EmergencyScreen> createState() => _EmergencyScreenState();
}

class _EmergencyScreenState extends State<EmergencyScreen> {
  @override
  Widget build(BuildContext context) {
    if (widget.role.toLowerCase() == 'doctor') {
      return const DoctorEmergencyScreen();
    } else {
      return const PatientEmergencyScreen();
    }
  }
}

// -------------------------------------------------------------
// PATIENT EMERGENCY SCREEN
// -------------------------------------------------------------
class PatientEmergencyScreen extends StatefulWidget {
  const PatientEmergencyScreen({super.key});

  @override
  State<PatientEmergencyScreen> createState() => _PatientEmergencyScreenState();
}

class _PatientEmergencyScreenState extends State<PatientEmergencyScreen> {
  final TextEditingController _nameCtrl = TextEditingController(text: 'John Doe');
  final TextEditingController _contactNameCtrl = TextEditingController();
  final TextEditingController _contactCtrl = TextEditingController(text: '+91 9876543210');
  final TextEditingController _locationCtrl = TextEditingController(text: '123 Main St, Mumbai');
  final TextEditingController _descCtrl = TextEditingController();

  String _caseType = 'Urgent';
  String _providerType = 'Hospital';
  bool _isSubmitting = false;
  bool _isSubmitted = false;

  void _submitEmergency() async {
    if (_descCtrl.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please provide a brief description of the problem.'), backgroundColor: AppColors.errorRed));
      return;
    }

    setState(() => _isSubmitting = true);
    await Future.delayed(const Duration(seconds: 2));
    if (!mounted) return;

    setState(() {
      _isSubmitting = false;
      _isSubmitted = true;
    });
  }

  @override
  void dispose() {
    _nameCtrl.dispose(); _contactNameCtrl.dispose();
    _contactCtrl.dispose(); _locationCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFBF4F4), // Slight red tint for emergency
      appBar: AppBar(
        title: const Text('Emergency Booking', style: TextStyle(fontFamily: 'PlayfairDisplay', fontWeight: FontWeight.w700, color: AppColors.errorRed)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.errorRed),
      ),
      body: _isSubmitted ? _buildTrackingView() : _buildFormView(),
    );
  }

  Widget _buildTrackingView() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: const Color(0xFFF0D3CF)),
          boxShadow: [BoxShadow(color: AppColors.errorRed.withValues(alpha: 0.1), blurRadius: 30, offset: const Offset(0, 10))],
        ),
        child: Column(
          children: [
            const Icon(Icons.emergency, size: 64, color: AppColors.errorRed),
            const SizedBox(height: 16),
            const Text('Case #EM-9921 - PENDING', style: TextStyle(fontFamily: 'PlayfairDisplay', fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.errorRed)),
            const SizedBox(height: 12),
            const Text('Tracking updates from selected provider. Help is on the way.', textAlign: TextAlign.center, style: TextStyle(fontFamily: 'Poppins', fontSize: 13, color: AppColors.textMuted)),
            const SizedBox(height: 24),
            _buildInfoCard('Status', 'PENDING TEAM ASSIGNMENT'),
            const SizedBox(height: 12),
            _buildInfoCard('Priority', _caseType),
            const SizedBox(height: 12),
            _buildInfoCard('Location', _locationCtrl.text),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.of(context).pop(),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.errorRed,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: const Text('Return to Home', style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.w600)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoCard(String label, String value) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE5EDF4))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label.toUpperCase(), style: const TextStyle(fontFamily: 'Poppins', fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.textMuted)),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontFamily: 'Poppins', fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textDark)),
        ],
      ),
    );
  }

  Widget _buildFormView() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      physics: const BouncingScrollPhysics(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('Choose where this case should go first, share a short medical report, and include the best contact person and address.', style: TextStyle(fontFamily: 'Poppins', fontSize: 12, color: AppColors.textMuted)),
          const SizedBox(height: 24),
          
          _buildSectionTitle('1. Emergency Destination'),
          Row(
            children: [
              Expanded(child: _buildSelectCard('Hospital', 'Hospital Desk', _providerType == 'Hospital', () => setState(() => _providerType = 'Hospital'))),
              const SizedBox(width: 12),
              Expanded(child: _buildSelectCard('Doctor', 'Local Clinic', _providerType == 'Doctor', () => setState(() => _providerType = 'Doctor'))),
            ],
          ),
          const SizedBox(height: 24),
          
          _buildSectionTitle('2. Case Priority'),
          Row(
            children: [
              Expanded(child: _buildSelectCard('Critical', 'Life Threatening', _caseType == 'Critical', () => setState(() => _caseType = 'Critical'))),
              const SizedBox(width: 8),
              Expanded(child: _buildSelectCard('Urgent', 'Fast Action', _caseType == 'Urgent', () => setState(() => _caseType = 'Urgent'))),
              const SizedBox(width: 8),
              Expanded(child: _buildSelectCard('Moderate', 'Stable', _caseType == 'Moderate', () => setState(() => _caseType = 'Moderate'))),
            ],
          ),
          const SizedBox(height: 24),
          
          _buildSectionTitle('3. Problem Report'),
          TextField(
            controller: _descCtrl,
            maxLines: 4,
            decoration: InputDecoration(
              hintText: 'Mention symptoms, how long this has been happening...',
              hintStyle: const TextStyle(fontFamily: 'Poppins', fontSize: 13, color: AppColors.textMuted),
              filled: true,
              fillColor: Colors.white,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppColors.inputBorder)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppColors.inputBorder)),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppColors.errorRed)),
            ),
          ),
          const SizedBox(height: 24),
          
          _buildSectionTitle('4. Contact Details'),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.inputBorder)),
            child: Column(
              children: [
                VxTextField(label: 'Patient Name', hint: 'Full Name', controller: _nameCtrl),
                const SizedBox(height: 12),
                VxTextField(label: 'Contact Name', hint: 'Family Member', controller: _contactNameCtrl),
                const SizedBox(height: 12),
                VxTextField(label: 'Contact Number', hint: '+91 XXXXX XXXXX', controller: _contactCtrl),
                const SizedBox(height: 12),
                VxTextField(label: 'Location', hint: 'Current Address', controller: _locationCtrl),
              ],
            ),
          ),
          const SizedBox(height: 24),
          
          VxButton(
            label: 'Book Emergency Support',
            onPressed: _submitEmergency,
            isLoading: _isSubmitting,
            gradient: const LinearGradient(colors: [AppColors.errorRed, AppColors.errorRed]),
          ),
          const SizedBox(height: 30),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Text(title, style: const TextStyle(fontFamily: 'Poppins', fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textDark)),
    );
  }

  Widget _buildSelectCard(String title, String subtitle, bool isSelected, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFFFF7ED) : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isSelected ? const Color(0xFFC2410C) : AppColors.inputBorder, width: isSelected ? 2 : 1),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: TextStyle(fontFamily: 'Poppins', fontSize: 13, fontWeight: FontWeight.w700, color: isSelected ? const Color(0xFFC2410C) : AppColors.textDark)),
            const SizedBox(height: 4),
            Text(subtitle, style: const TextStyle(fontFamily: 'Poppins', fontSize: 10, color: AppColors.textMuted)),
          ],
        ),
      ),
    );
  }
}


// -------------------------------------------------------------
// DOCTOR EMERGENCY SCREEN
// -------------------------------------------------------------
class DoctorEmergencyScreen extends StatefulWidget {
  const DoctorEmergencyScreen({super.key});

  @override
  State<DoctorEmergencyScreen> createState() => _DoctorEmergencyScreenState();
}

class _DoctorEmergencyScreenState extends State<DoctorEmergencyScreen> {
  final List<Map<String, dynamic>> _emergencies = [
    {
      'id': 'EM-9421',
      'type': 'Critical',
      'patient': 'Amit Kumar',
      'contact': '+91 9876543210',
      'desc': 'Severe chest pain radiating to left arm. Shortness of breath.',
      'time': 'Just now'
    },
    {
      'id': 'EM-9420',
      'type': 'Urgent',
      'patient': 'Priya Singh',
      'contact': '+91 9123456789',
      'desc': 'High fever (104F) not responding to paracetamol. Severe dehydration.',
      'time': '10 mins ago'
    }
  ];

  void _markHandled(String id) {
    setState(() {
      _emergencies.removeWhere((e) => e['id'] == id);
    });
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Case marked as handled.'), backgroundColor: AppColors.primaryGreen));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7FDF9),
      appBar: AppBar(
        title: const Text('Emergency Command Center', style: TextStyle(fontFamily: 'PlayfairDisplay', fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.errorRed)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.errorRed),
      ),
      body: _emergencies.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.check_circle_outline, size: 64, color: AppColors.primaryGreen),
                  const SizedBox(height: 16),
                  const Text('No Active Emergencies', style: TextStyle(fontFamily: 'PlayfairDisplay', fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.textDark)),
                  const SizedBox(height: 8),
                  Text('System is monitoring for new alerts.', style: TextStyle(fontFamily: 'Poppins', fontSize: 13, color: AppColors.textMuted)),
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              physics: const BouncingScrollPhysics(),
              itemCount: _emergencies.length,
              itemBuilder: (context, index) {
                final e = _emergencies[index];
                final isCritical = e['type'] == 'Critical';
                return Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border(left: BorderSide(color: isCritical ? AppColors.errorRed : const Color(0xFFD35400), width: 6)),
                    boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, 4))],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(color: isCritical ? const Color(0xFFFFF5F5) : const Color(0xFFFFF9F5), borderRadius: const BorderRadius.only(topRight: Radius.circular(16))),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(color: isCritical ? AppColors.errorRed : const Color(0xFFD35400), borderRadius: BorderRadius.circular(12)),
                                  child: Text(e['type'].toUpperCase(), style: const TextStyle(fontFamily: 'Poppins', fontSize: 9, fontWeight: FontWeight.w700, color: Colors.white)),
                                ),
                                const SizedBox(width: 8),
                                Text('ID: ${e['id']} • ${e['time']}', style: const TextStyle(fontFamily: 'Poppins', fontSize: 11, color: AppColors.textMuted)),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Text(e['patient'], style: const TextStyle(fontFamily: 'PlayfairDisplay', fontSize: 22, fontWeight: FontWeight.w700, color: AppColors.primaryGreen)),
                            const SizedBox(height: 4),
                            Text('📞 ${e['contact']}', style: const TextStyle(fontFamily: 'Poppins', fontSize: 13, color: AppColors.textDark, fontWeight: FontWeight.w500)),
                          ],
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('CASE BRIEF', style: TextStyle(fontFamily: 'Poppins', fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
                            const SizedBox(height: 6),
                            Text(e['desc'], style: const TextStyle(fontFamily: 'Poppins', fontSize: 13, color: AppColors.textDark, height: 1.4)),
                            const SizedBox(height: 16),
                            Row(
                              children: [
                                Expanded(
                                  child: OutlinedButton.icon(
                                    onPressed: (){},
                                    icon: const Icon(Icons.history, size: 16, color: AppColors.textDark),
                                    label: const Text('History', style: TextStyle(fontFamily: 'Poppins', fontSize: 12, color: AppColors.textDark)),
                                    style: OutlinedButton.styleFrom(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: ElevatedButton.icon(
                                    onPressed: () => _markHandled(e['id']),
                                    icon: const Icon(Icons.check, size: 16, color: AppColors.primaryGreen),
                                    label: const Text('Handled', style: TextStyle(fontFamily: 'Poppins', fontSize: 12, color: AppColors.primaryGreen)),
                                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFF0FDF4), elevation: 0, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                                  ),
                                ),
                              ],
                            )
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
    );
  }
}
