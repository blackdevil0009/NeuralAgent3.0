import 'package:flutter/material.dart';
import '../services/api_service.dart';
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
  final TextEditingController _nameCtrl = TextEditingController();
  final TextEditingController _contactNameCtrl = TextEditingController();
  final TextEditingController _contactCtrl = TextEditingController();
  final TextEditingController _locationCtrl = TextEditingController();
  final TextEditingController _descCtrl = TextEditingController();

  String _caseType = 'Urgent';
  String _providerType = 'hospital';
  dynamic _selectedProvider;

  List<dynamic> _hospitals = [];
  List<dynamic> _doctors = [];
  Map<String, dynamic>? _activeEmergency;

  bool _isLoadingOptions = false;
  bool _isLoadingStatus = false;
  bool _isSubmitting = false;
  String? _errorMsg;

  @override
  void initState() {
    super.initState();
    _loadAll();
  }

  Future<void> _loadAll() async {
    await _fetchActiveEmergency();
    if (_activeEmergency == null) {
      await _loadBookingOptions();
    }
  }

  Future<void> _fetchActiveEmergency() async {
    setState(() {
      _isLoadingStatus = true;
      _errorMsg = null;
    });

    try {
      final res = await ApiClient.get(ApiConfig.myEmergencies);
      if (res.ok && res.data != null) {
        final list = res.data!['data']?['emergencies'] as List?;
        if (list != null && list.isNotEmpty) {
          // Find the first unresolved or pending emergency
          final active = list.firstWhere(
            (e) => e['status']?.toString().toLowerCase() != 'resolved',
            orElse: () => null,
          );
          setState(() {
            _activeEmergency = active;
          });
        } else {
          setState(() {
            _activeEmergency = null;
          });
        }
      }
    } catch (e) {
      debugPrint("Failed to fetch active emergencies: $e");
    } finally {
      setState(() {
        _isLoadingStatus = false;
      });
    }
  }

  Future<void> _loadBookingOptions() async {
    setState(() {
      _isLoadingOptions = true;
      _errorMsg = null;
    });

    try {
      final res = await ApiClient.get(ApiConfig.emergencyOptions);
      if (res.ok && res.data != null) {
        final d = res.data!['data'];
        setState(() {
          _hospitals = d['hospitals'] ?? [];
          _doctors = d['independentDoctors'] ?? [];

          // Prefill patient profile from backend
          final prof = d['patientProfile'];
          if (prof != null) {
            _nameCtrl.text = prof['name'] ?? '';
            _contactCtrl.text = prof['contact'] ?? '';
            _locationCtrl.text = prof['location'] ?? '';
          }

          // Select default provider
          if (_providerType == 'hospital' && _hospitals.isNotEmpty) {
            _selectedProvider = _hospitals.first;
          } else if (_providerType == 'doctor' && _doctors.isNotEmpty) {
            _selectedProvider = _doctors.first;
          }
        });
      } else {
        setState(() {
          _errorMsg = res.data?['message'] ?? res.error ?? 'Failed to load emergency centers.';
        });
      }
    } catch (e) {
      setState(() {
        _errorMsg = 'Connection error. Check your network.';
      });
    } finally {
      setState(() {
        _isLoadingOptions = false;
      });
    }
  }

  void _submitEmergency() async {
    if (_descCtrl.text.trim().isEmpty) {
      _snack('Please mention details about the clinical emergency symptoms.', isError: true);
      return;
    }
    if (_contactNameCtrl.text.trim().isEmpty) {
      _snack('Please provide a contact person name.', isError: true);
      return;
    }
    if (_contactCtrl.text.trim().isEmpty) {
      _snack('Please provide a contact phone number.', isError: true);
      return;
    }
    if (_locationCtrl.text.trim().isEmpty) {
      _snack('Please provide the physical location for help to arrive.', isError: true);
      return;
    }
    if (_selectedProvider == null) {
      _snack('Please select an emergency provider/hospital.', isError: true);
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final payload = {
        'explanation': _descCtrl.text.trim(),
        'caseType': _caseType,
        'contact': _contactCtrl.text.trim(),
        'patientName': _nameCtrl.text.trim().isEmpty ? 'Patient' : _nameCtrl.text.trim(),
        'contactName': _contactNameCtrl.text.trim(),
        'location': _locationCtrl.text.trim(),
        'providerType': _providerType,
        'providerId': _selectedProvider['id'],
      };

      final res = await ApiClient.post(ApiConfig.emergencies, payload);
      setState(() => _isSubmitting = false);

      if (res.ok && res.data != null) {
        _snack('🚨 Emergency broadcasted successfully! Help is on the way.');
        _fetchActiveEmergency();
      } else {
        final err = res.data?['message'] ?? res.error ?? 'SOS alert failed.';
        _snack(err, isError: true);
      }
    } catch (e) {
      setState(() => _isSubmitting = false);
      _snack('Failed to broadcast SOS: $e', isError: true);
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

  @override
  void dispose() {
    _nameCtrl.dispose();
    _contactNameCtrl.dispose();
    _contactCtrl.dispose();
    _locationCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoadingStatus) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: AppColors.errorRed)),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFFBF4F4), // Red tint background
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadAll,
          color: AppColors.errorRed,
          child: _activeEmergency != null ? _buildTrackingView() : _buildFormView(),
        ),
      ),
    );
  }

  Widget _buildTrackingView() {
    final e = _activeEmergency!;
    final status = e['status']?.toString().toUpperCase() ?? 'PENDING';
    final providerName = e['providerName'] ?? e['hospitalName'] ?? 'Selected Provider';
    final doctorName = e['assignedDoctorName'] ?? 'Assigning Team...';

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: const Color(0xFFF0D3CF)),
              boxShadow: [
                BoxShadow(
                  color: AppColors.errorRed.withValues(alpha: 0.1),
                  blurRadius: 30,
                  offset: const Offset(0, 10),
                )
              ],
            ),
            child: Column(
              children: [
                const Icon(Icons.emergency, size: 64, color: AppColors.errorRed),
                const SizedBox(height: 16),
                Text(
                  'Case #EM-${e['id']}',
                  style: const TextStyle(
                    fontFamily: 'PlayfairDisplay',
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: AppColors.errorRed,
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.errorRed.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    status,
                    style: const TextStyle(
                      fontFamily: 'Poppins',
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: AppColors.errorRed,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Your SOS request has been broadcasted to the emergency network. Care team is actively responding.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontFamily: 'Poppins', fontSize: 12, color: AppColors.textMuted, height: 1.5),
                ),
                const Divider(height: 32, color: Color(0xFFF5E6E6)),
                _buildInfoCard('Destination Center', providerName),
                const SizedBox(height: 12),
                _buildInfoCard('Assigned Care Specialist', doctorName),
                const SizedBox(height: 12),
                _buildInfoCard('Case Priority', e['caseType']?.toString().toUpperCase() ?? 'URGENT'),
                const SizedBox(height: 12),
                _buildInfoCard('Registered Location', e['location'] ?? ''),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _fetchActiveEmergency,
                        icon: const Icon(Icons.refresh, color: AppColors.errorRed),
                        label: const Text('Refresh Status', style: TextStyle(fontFamily: 'Poppins', color: AppColors.errorRed)),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          side: const BorderSide(color: AppColors.errorRed),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () {
                          setState(() {
                            _activeEmergency = null;
                          });
                          _loadBookingOptions();
                        },
                        icon: const Icon(Icons.home, color: Colors.white),
                        label: const Text('File New Alert', style: TextStyle(fontFamily: 'Poppins', color: Colors.white)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.errorRed,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoCard(String label, String value) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFAFAFA),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: const TextStyle(fontFamily: 'Poppins', fontSize: 9, fontWeight: FontWeight.bold, color: AppColors.textMuted),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(fontFamily: 'Poppins', fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textDark),
          ),
        ],
      ),
    );
  }

  Widget _buildFormView() {
    if (_errorMsg != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(_errorMsg!, textAlign: TextAlign.center, style: const TextStyle(fontFamily: 'Poppins', color: AppColors.errorRed)),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _loadBookingOptions,
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.errorRed),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    if (_isLoadingOptions) {
      return const Center(child: CircularProgressIndicator(color: AppColors.errorRed));
    }

    final activeList = _providerType == 'hospital' ? _hospitals : _doctors;

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Holistic Emergency Support Protocol. Broadcast your vitals & GPS location instantly to verified care centers.',
            style: TextStyle(fontFamily: 'Poppins', fontSize: 11.5, color: AppColors.textMuted, height: 1.4),
          ),
          const SizedBox(height: 20),

          _buildSectionTitle('1. Emergency Destination'),
          Row(
            children: [
              Expanded(
                child: _buildSelectCard(
                  'Hospital',
                  'Verified ICU beds',
                  _providerType == 'hospital',
                  () {
                    setState(() {
                      _providerType = 'hospital';
                      _selectedProvider = _hospitals.isNotEmpty ? _hospitals.first : null;
                    });
                  },
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildSelectCard(
                  'Local Doctor',
                  'Clinics nearby',
                  _providerType == 'doctor',
                  () {
                    setState(() {
                      _providerType = 'doctor';
                      _selectedProvider = _doctors.isNotEmpty ? _doctors.first : null;
                    });
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),

          _buildSectionTitle('2. Select Center / Specialist'),
          activeList.isEmpty
              ? Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
                  child: const Text('No verified centers available in this region.', style: TextStyle(fontFamily: 'Poppins', fontSize: 12, color: AppColors.textMuted)),
                )
              : DropdownButtonFormField<dynamic>(
                  value: _selectedProvider?['id'],
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: Colors.white,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.inputBorder)),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.inputBorder)),
                  ),
                  items: activeList.map((item) {
                    final sub = _providerType == 'hospital'
                        ? '${item['type'].toString().toUpperCase()} • ${item['activeEmergencyCount']} Active'
                        : '${item['specialization']} • ${item['experience']} Yrs Exp';
                    return DropdownMenuItem<dynamic>(
                      value: item['id'],
                      child: Text(
                        '${item['name']} ($sub)',
                        style: const TextStyle(fontFamily: 'Poppins', fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textDark),
                      ),
                    );
                  }).toList(),
                  onChanged: (val) {
                    setState(() {
                      _selectedProvider = activeList.firstWhere((e) => e['id'] == val, orElse: () => null);
                    });
                  },
                ),
          const SizedBox(height: 18),

          _buildSectionTitle('3. Emergency Priority'),
          Row(
            children: [
              Expanded(child: _buildSelectCard('Critical', 'Immediate ICU', _caseType == 'Critical', () => setState(() => _caseType = 'Critical'))),
              const SizedBox(width: 8),
              Expanded(child: _buildSelectCard('Urgent', 'Vitals Unstable', _caseType == 'Urgent', () => setState(() => _caseType = 'Urgent'))),
              const SizedBox(width: 8),
              Expanded(child: _buildSelectCard('Moderate', 'Stable/Needs consultation', _caseType == 'Moderate', () => setState(() => _caseType = 'Moderate'))),
            ],
          ),
          const SizedBox(height: 18),

          _buildSectionTitle('4. Brief Problem Explanation'),
          TextField(
            controller: _descCtrl,
            maxLines: 3,
            decoration: InputDecoration(
              hintText: 'Describe acute symptoms, breathing issues, pain locations...',
              hintStyle: const TextStyle(fontFamily: 'Poppins', fontSize: 12.5, color: AppColors.textMuted),
              filled: true,
              fillColor: Colors.white,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppColors.inputBorder)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppColors.inputBorder)),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppColors.errorRed)),
            ),
          ),
          const SizedBox(height: 18),

          _buildSectionTitle('5. GPS & Contact Dispatch details'),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.inputBorder),
            ),
            child: Column(
              children: [
                VxTextField(label: 'Patient Full Name', hint: 'Patient Name', controller: _nameCtrl),
                const SizedBox(height: 10),
                VxTextField(label: 'Dispatch Contact Person', hint: 'e.g. Spouse / Brother', controller: _contactNameCtrl),
                const SizedBox(height: 10),
                VxTextField(label: 'Emergency Mobile Number', hint: 'Mobile number', controller: _contactCtrl),
                const SizedBox(height: 10),
                VxTextField(label: 'Exact Address Location', hint: 'Complete address with landmarks', controller: _locationCtrl),
              ],
            ),
          ),
          const SizedBox(height: 24),

          VxButton(
            label: '🚨 Broadcast SOS Alert Now',
            onPressed: _submitEmergency,
            isLoading: _isSubmitting,
            gradient: const LinearGradient(colors: [AppColors.errorRed, Color(0xFFC0392B)]),
          ),
          const SizedBox(height: 30),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        title,
        style: const TextStyle(fontFamily: 'Poppins', fontSize: 13.5, fontWeight: FontWeight.bold, color: AppColors.textDark),
      ),
    );
  }

  Widget _buildSelectCard(String title, String subtitle, bool isSelected, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFFFF5F5) : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppColors.errorRed : AppColors.inputBorder,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: TextStyle(
                fontFamily: 'Poppins',
                fontSize: 12.5,
                fontWeight: FontWeight.bold,
                color: isSelected ? AppColors.errorRed : AppColors.textDark,
              ),
            ),
            const SizedBox(height: 2),
            Text(subtitle, style: const TextStyle(fontFamily: 'Poppins', fontSize: 9.5, color: AppColors.textMuted)),
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
  List<dynamic> _emergencies = [];
  bool _isLoading = false;
  String? _errorMsg;

  @override
  void initState() {
    super.initState();
    _fetchEmergencies();
  }

  Future<void> _fetchEmergencies() async {
    setState(() {
      _isLoading = true;
      _errorMsg = null;
    });

    try {
      final res = await ApiClient.get(ApiConfig.emergencies);
      if (res.ok && res.data != null) {
        setState(() {
          _emergencies = res.data!['data']?['emergencies'] ?? [];
        });
      } else {
        setState(() {
          _errorMsg = res.data?['message'] ?? res.error ?? 'Failed to load assigned emergencies.';
        });
      }
    } catch (e) {
      setState(() {
        _errorMsg = 'Connection error. Check your network.';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _markHandled(String id) async {
    try {
      final res = await ApiClient.put(ApiConfig.resolveEmergency(id), {});
      if (res.ok) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('SOS Case marked resolved successfully.'),
          backgroundColor: AppColors.primaryGreen,
        ));
        _fetchEmergencies();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(res.error ?? 'Failed to mark case handled.'),
          backgroundColor: AppColors.errorRed,
        ));
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Resolve failed: $e'),
        backgroundColor: AppColors.errorRed,
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7FDF9),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _fetchEmergencies,
          color: AppColors.errorRed,
          child: _isLoading
              ? const Center(child: CircularProgressIndicator(color: AppColors.errorRed))
              : _errorMsg != null
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(_errorMsg!, textAlign: TextAlign.center, style: const TextStyle(fontFamily: 'Poppins', color: AppColors.errorRed)),
                            const SizedBox(height: 16),
                            ElevatedButton(
                              onPressed: _fetchEmergencies,
                              style: ElevatedButton.styleFrom(backgroundColor: AppColors.errorRed),
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      ),
                    )
                  : _emergencies.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.check_circle_outline, size: 64, color: AppColors.primaryGreen),
                              const SizedBox(height: 16),
                              const Text(
                                'No Active Emergencies',
                                style: TextStyle(fontFamily: 'PlayfairDisplay', fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.textDark),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                'Monitoring Indian SOS networks dynamically.',
                                style: TextStyle(fontFamily: 'Poppins', fontSize: 12, color: AppColors.textMuted),
                              ),
                            ],
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          physics: const AlwaysScrollableScrollPhysics(),
                          itemCount: _emergencies.length,
                          itemBuilder: (context, index) {
                            final e = _emergencies[index];
                            final isCritical = e['caseType']?.toString().toLowerCase() == 'critical';

                            return Container(
                              margin: const EdgeInsets.only(bottom: 16),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(16),
                                border: Border(
                                  left: BorderSide(
                                    color: isCritical ? AppColors.errorRed : Colors.orange,
                                    width: 6,
                                  ),
                                ),
                                boxShadow: [
                                  BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 10, offset: const Offset(0, 4))
                                ],
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(16),
                                    decoration: BoxDecoration(
                                      color: isCritical ? const Color(0xFFFFF5F5) : const Color(0xFFFFF9F5),
                                      borderRadius: const BorderRadius.only(topRight: Radius.circular(16)),
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                              decoration: BoxDecoration(
                                                color: isCritical ? AppColors.errorRed : Colors.orange,
                                                borderRadius: BorderRadius.circular(12),
                                              ),
                                              child: Text(
                                                e['caseType']?.toString().toUpperCase() ?? 'URGENT',
                                                style: const TextStyle(
                                                  fontFamily: 'Poppins',
                                                  fontSize: 8.5,
                                                  fontWeight: FontWeight.bold,
                                                  color: Colors.white,
                                                ),
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            Text(
                                              'ID: EM-${e['id']}',
                                              style: const TextStyle(fontFamily: 'Poppins', fontSize: 11, color: AppColors.textMuted),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 12),
                                        Text(
                                          e['patientName'] ?? 'Unknown Patient',
                                          style: const TextStyle(
                                            fontFamily: 'PlayfairDisplay',
                                            fontSize: 20,
                                            fontWeight: FontWeight.bold,
                                            color: AppColors.primaryGreen,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          '📞 Dispatch: ${e['contactName']} (${e['contact']})',
                                          style: const TextStyle(
                                            fontFamily: 'Poppins',
                                            fontSize: 12,
                                            color: AppColors.textDark,
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          '📍 GPS: ${e['location']}',
                                          style: const TextStyle(fontFamily: 'Poppins', fontSize: 11.5, color: AppColors.textMuted),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Padding(
                                    padding: const EdgeInsets.all(16),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Text(
                                          'CASE BRIEF / SYMPTOMS',
                                          style: TextStyle(fontFamily: 'Poppins', fontSize: 9.5, fontWeight: FontWeight.bold, color: AppColors.textMuted),
                                        ),
                                        const SizedBox(height: 6),
                                        Text(
                                          e['explanation'] ?? 'No case explanation provided.',
                                          style: const TextStyle(fontFamily: 'Poppins', fontSize: 12.5, color: AppColors.textDark, height: 1.4),
                                        ),
                                        const SizedBox(height: 16),
                                        Row(
                                          children: [
                                            Expanded(
                                              child: ElevatedButton.icon(
                                                onPressed: () => _markHandled(e['id'].toString()),
                                                icon: const Icon(Icons.check, size: 16, color: Colors.white),
                                                label: const Text('Mark Case Resolved', style: TextStyle(fontFamily: 'Poppins', fontSize: 12, color: Colors.white)),
                                                style: ElevatedButton.styleFrom(
                                                  backgroundColor: AppColors.primaryGreen,
                                                  elevation: 0,
                                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                                ),
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
        ),
      ),
    );
  }
}
