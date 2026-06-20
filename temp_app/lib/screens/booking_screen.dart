import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import 'appointment_booking_screen.dart';
import 'inbox_screen.dart';

class BookingScreen extends StatefulWidget {
  const BookingScreen({super.key});

  @override
  State<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends State<BookingScreen> {
  List<Map<String, dynamic>> _upcoming = [];
  List<Map<String, dynamic>> _past = [];
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
        
        final parsedUpcoming = <Map<String, dynamic>>[];
        final parsedPast = <Map<String, dynamic>>[];
        
        for (var a in list) {
          final dateStr = a['appointmentDate']?.toString() ?? '';
          final timeStrRaw = a['appointmentTime']?.toString() ?? '';
          
          final docName = a['doctorName'] ?? 'Doctor';
          final spec = a['specialization'] ?? 'Specialist';
          final timeStr = dateStr.isNotEmpty && timeStrRaw.isNotEmpty 
              ? '$dateStr, ${timeStrRaw.substring(0, 5)}'
              : 'Pending Time';
              
          final map = {
            'doctorId': a['doctorId']?.toString(),
            'doctor': 'Dr. $docName',
            'spec': spec,
            'time': timeStr,
            'status': a['status'] == 'confirmed' ? 'Scheduled' : a['status'] ?? 'Scheduled',
            'type': a['type'] ?? 'Consultation',
            'online': a['status'] == 'confirmed',
          };
          
          if (a['status'] == 'cancelled') {
            parsedPast.add(map);
          } else {
            parsedUpcoming.add(map);
          }
        }
        
        if (mounted) {
          setState(() {
            _upcoming = parsedUpcoming;
            _past = parsedPast;
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

  void _bookNew() async {
    final bool? result = await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const AppointmentBookingScreen()),
    );
    
    if (result == true && mounted) {
      _fetchAppointments(); // Refresh the list
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: AppColors.primaryGreen));
    }
    
    return ListView(
      padding: const EdgeInsets.all(16),
      physics: const BouncingScrollPhysics(),
      children: [
        ElevatedButton.icon(
          onPressed: _bookNew,
          icon: const Icon(Icons.add, size: 20),
          label: const Text('Book New Appointment', style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.w600)),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primaryGreen,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          ),
        ),
        const SizedBox(height: 24),
        const Text('Upcoming Appointments', style: TextStyle(fontFamily: 'Poppins', fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textDark)),
        const SizedBox(height: 12),
        if (_upcoming.isEmpty)
          const Text('No upcoming appointments', style: TextStyle(color: AppColors.textMuted))
        else
          ..._upcoming.map((a) => _buildAppointmentCard(a, true)),
        
        const SizedBox(height: 24),
        const Text('Past Appointments', style: TextStyle(fontFamily: 'Poppins', fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textDark)),
        const SizedBox(height: 12),
        if (_past.isEmpty)
          const Text('No past appointments', style: TextStyle(color: AppColors.textMuted))
        else
          ..._past.map((a) => _buildAppointmentCard(a, false)),
      ],
    );
  }

  Widget _buildAppointmentCard(Map<String, dynamic> a, bool isUpcoming) {
    final doctor = a['doctor'];
    final spec = a['spec'];
    final time = a['time'];
    final status = a['status'];
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.inputBorder.withValues(alpha: 0.5)),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 5, offset: const Offset(0, 2))],
      ),
      child: Column(
        children: [
          Row(
            children: [
              const CircleAvatar(
                radius: 24,
                backgroundColor: Color(0xFFEAF5EE),
                child: Text('👨‍⚕️', style: TextStyle(fontSize: 24)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(doctor, style: const TextStyle(fontFamily: 'Poppins', fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textDark)),
                    const SizedBox(height: 2),
                    Text(spec, style: const TextStyle(fontFamily: 'Poppins', fontSize: 12, color: AppColors.textMuted)),
                  ],
                ),
              ),
              if (isUpcoming)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(color: const Color(0xFFEAF5EE), borderRadius: BorderRadius.circular(12)),
                  child: Text(status ?? 'Upcoming', style: const TextStyle(fontFamily: 'Poppins', fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.primaryGreen)),
                )
              else
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(color: const Color(0xFFF5F5F5), borderRadius: BorderRadius.circular(12)),
                  child: Text(status ?? 'Completed', style: const TextStyle(fontFamily: 'Poppins', fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.textMuted)),
                ),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(height: 1, color: Color(0xFFF0F5F1)),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(Icons.calendar_month_outlined, size: 16, color: AppColors.primaryGreen),
              const SizedBox(width: 8),
              Text(time, style: const TextStyle(fontFamily: 'Poppins', fontSize: 12, fontWeight: FontWeight.w500, color: AppColors.textDark)),
              const Spacer(),
              if (isUpcoming)
                Row(
                  children: [
                    TextButton(onPressed: (){}, child: const Text('Reschedule', style: TextStyle(fontFamily: 'Poppins', fontSize: 11, color: AppColors.primaryGreen))),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      onPressed: () {
                        if (a['doctorId'] != null) {
                          Navigator.of(context).push(MaterialPageRoute(
                            builder: (_) => PatientChatScreen(convo: {
                              'id': a['doctorId'],
                              'name': a['doctor'],
                              'avatar': '👨‍⚕️',
                              'spec': a['spec'],
                              'lastMsg': '${a['type']} — ${a['time']}',
                              'time': a['time'],
                              'online': a['online'],
                              'unread': 0,
                              'type': a['type'],
                            }),
                          ));
                        }
                      },
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryGreen, foregroundColor: Colors.white, minimumSize: const Size(60, 32), padding: const EdgeInsets.symmetric(horizontal: 16)),
                      child: const Text('Message', style: TextStyle(fontFamily: 'Poppins', fontSize: 11)),
                    ),
                  ],
                )
            ],
          )
        ],
      ),
    );
  }
}
