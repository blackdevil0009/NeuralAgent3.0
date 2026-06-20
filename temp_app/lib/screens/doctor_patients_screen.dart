import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import 'doctor_inbox_screen.dart';

class DoctorPatientsScreen extends StatefulWidget {
  const DoctorPatientsScreen({super.key});
  @override
  State<DoctorPatientsScreen> createState() => _DoctorPatientsScreenState();
}

class _DoctorPatientsScreenState extends State<DoctorPatientsScreen> {
  Map<String, dynamic>? _selectedPatient;
  bool _showMedical = false;
  final TextEditingController _notesCtrl = TextEditingController();

  List<Map<String, dynamic>> _appointments = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchAppointments();
  }

  Future<void> _fetchAppointments() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiClient.get(ApiConfig.appointments);
      if (res.ok && res.data != null) {
        final list = (res.data!['data']?['appointments'] ?? res.data!['appointments'] ?? []) as List<dynamic>;
        
        final parsed = list.map((a) {
          final dateStrRaw = a['appointmentDate']?.toString() ?? '';
          final timeStrRaw = a['appointmentTime']?.toString() ?? '';
          
          final timeStr = timeStrRaw.isNotEmpty ? timeStrRaw.substring(0, 5) : 'TBD';
          final dateStr = dateStrRaw.isNotEmpty ? dateStrRaw : 'TBD';
          
          final p = a['patient'] ?? {};
              
          return {
            'id': a['id'] ?? 0,
            'patientId': a['userId']?.toString() ?? a['patientId']?.toString() ?? '',
            'patientName': a['patientName'] ?? a['patient_name'] ?? p['name'] ?? 'Patient',
            'date': dateStr,
            'time': timeStr,
            'type': a['type'] ?? 'Consultation',
            'status': a['status'] == 'confirmed' ? 'Confirmed' : a['status'] ?? 'Scheduled',
            'notes': a['notes'] ?? 'No notes available.',
            'conditions': p['conditions'] ?? 'None',
            'medications': p['medications'] ?? 'None',
            'allergies': p['allergies'] ?? 'None',
            'dosha': p['dosha'] ?? 'Not assessed'
          };
        }).toList();
        
        if (mounted) {
          setState(() {
            _appointments = parsed;
            _isLoading = false;
          });
        }
      } else {
        if (mounted) setState(() => _isLoading = false);
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _month(int m) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return m >= 1 && m <= 12 ? months[m - 1] : '';
  }

  Color _statusColor(String s) => s == 'Confirmed' ? const Color(0xFF15803D) : s == 'Completed' ? const Color(0xFF4B5563) : s == 'Cancelled' ? const Color(0xFF991B1B) : const Color(0xFF92400E);
  Color _statusBg(String s) => s == 'Confirmed' ? const Color(0xFFF0FDF4) : s == 'Completed' ? const Color(0xFFF8F9FA) : s == 'Cancelled' ? const Color(0xFFFEF2F2) : const Color(0xFFFFFBEB);

  @override
  Widget build(BuildContext context) {
    final total = _appointments.length;
    final confirmed = _appointments.where((a) => a['status'] == 'Confirmed').length;
    final pending = _appointments.where((a) => a['status'] == 'Scheduled').length;

    return Scaffold(
      backgroundColor: const Color(0xFFF7FDF9),
      appBar: AppBar(
        title: const Text('Patient Management', style: TextStyle(fontFamily: 'PlayfairDisplay', fontWeight: FontWeight.w700, color: AppColors.primaryGreen)),
        backgroundColor: Colors.white, elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.primaryGreen),
      ),
      body: Column(
        children: [
          // Stats
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.white,
            child: Row(
              children: [
                _statCard('Total Load', '$total', AppColors.primaryGreen),
                const SizedBox(width: 12),
                _statCard('Confirmed', '$confirmed', const Color(0xFF15803D)),
                const SizedBox(width: 12),
                _statCard('Pending', '$pending', const Color(0xFF92400E)),
              ],
            ),
          ),
          // Queue
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: AppColors.primaryGreen))
                : _appointments.isEmpty
                    ? const Center(child: Text('No appointments found', style: TextStyle(color: AppColors.textMuted)))
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _appointments.length,
                        itemBuilder: (ctx, i) {
                          final a = _appointments[i];
                          final isSelected = _selectedPatient?['id'] == a['id'];
                          return GestureDetector(
                            onTap: () {
                              setState(() {
                                _selectedPatient = a;
                                _notesCtrl.text = '';
                                _showMedical = false;
                              });
                              _showPatientPanel(a);
                            },
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 12),
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: isSelected ? const Color(0xFFEAF5EE) : Colors.white,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: isSelected ? AppColors.primaryGreen.withValues(alpha: 0.5) : AppColors.inputBorder),
                              ),
                              child: Row(
                                children: [
                                  Container(width: 44, height: 44, decoration: const BoxDecoration(color: Color(0xFFEAF5EE), shape: BoxShape.circle), alignment: Alignment.center, child: const Text('👤', style: TextStyle(fontSize: 20))),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(a['patientName'], style: const TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textDark)),
                                        Text('${a['date']} • ${a['time']} • ${a['type']}', style: const TextStyle(fontFamily: 'Poppins', fontSize: 11, color: AppColors.textMuted)),
                                      ],
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                    decoration: BoxDecoration(color: _statusBg(a['status']), borderRadius: BorderRadius.circular(50)),
                                    child: Text(a['status'], style: TextStyle(fontFamily: 'Poppins', fontSize: 10, fontWeight: FontWeight.bold, color: _statusColor(a['status']))),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }

  void _showPatientPanel(Map<String, dynamic> a) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setS) => DraggableScrollableSheet(
          initialChildSize: 0.85,
          maxChildSize: 0.95,
          minChildSize: 0.5,
          builder: (ctx, sc) => Container(
            decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
            child: ListView(
              controller: sc,
              padding: const EdgeInsets.all(24),
              children: [
                Row(
                  children: [
                    const Text('👤', style: TextStyle(fontSize: 36)),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(a['patientName'], style: const TextStyle(fontFamily: 'PlayfairDisplay', fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.textDark)),
                        Text('Consultation ID: #${a['id']}', style: const TextStyle(fontFamily: 'Poppins', fontSize: 12, color: AppColors.textMuted)),
                      ]),
                    ),
                    IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(ctx)),
                  ],
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => setS(() => _showMedical = !_showMedical),
                        icon: const Icon(Icons.folder_open, size: 16),
                        label: const Text('Medical History', style: TextStyle(fontFamily: 'Poppins', fontSize: 12)),
                        style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 12), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () {
                          if (a['patientId'].isNotEmpty) {
                            Navigator.of(context).push(MaterialPageRoute(
                              builder: (_) => DoctorChatScreen(convo: {
                                'id': a['patientId'],
                                'name': a['patientName'],
                                'avatar': '👤',
                                'lastMsg': '${a['type']} — ${a['date']} ${a['time']}',
                                'time': a['time'],
                                'online': a['status'] == 'Confirmed',
                                'unread': 0,
                                'dosha': a['dosha'],
                                'type': a['type'],
                              }),
                            ));
                          }
                        },
                        icon: const Icon(Icons.message_outlined, size: 16),
                        label: const Text('Message', style: TextStyle(fontFamily: 'Poppins', fontSize: 12)),
                        style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 12), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                      ),
                    ),
                  ],
                ),
                if (_showMedical) ...[
                  const SizedBox(height: 20),
                  const Text('Medical History', style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold, fontSize: 15)),
                  const SizedBox(height: 12),
                  _medicalRow('🏥 Conditions', a['conditions']),
                  _medicalRow('💊 Medications', a['medications']),
                  _medicalRow('⚠️ Allergies', a['allergies'], isAlert: true),
                  _medicalRow('🌿 Dosha', a['dosha']),
                ],
                const SizedBox(height: 20),
                const Text('Patient Notes', style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold, fontSize: 15)),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.inputBorder)),
                  child: Text('"${a['notes']}"', style: const TextStyle(fontFamily: 'Poppins', fontSize: 13, color: AppColors.textMuted, fontStyle: FontStyle.italic)),
                ),
                const SizedBox(height: 20),
                const Text('Doctor Observations', style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold, fontSize: 15)),
                const SizedBox(height: 8),
                TextField(
                  controller: _notesCtrl,
                  maxLines: 4,
                  decoration: InputDecoration(
                    hintText: 'Type clinical notes for this session...',
                    hintStyle: const TextStyle(fontFamily: 'Poppins', fontSize: 12, color: AppColors.textMuted),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.inputBorder)),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.primaryGreen)),
                  ),
                ),
                const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: () { Navigator.pop(ctx); ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Clinical notes saved.'), backgroundColor: AppColors.primaryGreen)); },
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryGreen, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                  child: const Text('Save Observations', style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold)),
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _medicalRow(String label, String value, {bool isAlert = false}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isAlert ? const Color(0xFFFFF5F5) : const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
        border: isAlert ? Border.all(color: const Color(0xFFFEB2B2)) : null,
      ),
      child: Row(
        children: [
          Text(label, style: TextStyle(fontFamily: 'Poppins', fontSize: 12, fontWeight: FontWeight.bold, color: isAlert ? const Color(0xFFC53030) : AppColors.textDark)),
          const SizedBox(width: 8),
          Expanded(child: Text(value, style: TextStyle(fontFamily: 'Poppins', fontSize: 12, color: isAlert ? const Color(0xFFC53030) : AppColors.textMuted))),
        ],
      ),
    );
  }

  Widget _statCard(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: color.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(12), border: Border.all(color: color.withValues(alpha: 0.2))),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontFamily: 'Poppins', fontSize: 10, color: AppColors.textMuted)),
            const SizedBox(height: 4),
            Text(value, style: TextStyle(fontFamily: 'Poppins', fontSize: 22, fontWeight: FontWeight.bold, color: color)),
          ],
        ),
      ),
    );
  }
}
