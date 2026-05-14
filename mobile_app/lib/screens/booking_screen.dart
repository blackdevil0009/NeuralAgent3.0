import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import 'appointment_booking_screen.dart';

class BookingScreen extends StatefulWidget {
  const BookingScreen({super.key});

  @override
  State<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends State<BookingScreen> {
  final List<Map<String, dynamic>> _upcoming = [
    {'doctor': 'Dr. Ananya Sharma', 'spec': 'Ayurveda Specialist', 'time': 'Tomorrow, 10:00 AM'},
    {'doctor': 'Dr. Rajesh Kumar', 'spec': 'General Physician', 'time': '15 Oct, 02:30 PM'},
  ];

  final List<Map<String, dynamic>> _past = [
    {'doctor': 'Dr. Sneha Desai', 'spec': 'Dermatologist', 'time': '02 Sep, 11:00 AM'},
  ];

  void _bookNew() async {
    final bool? result = await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const AppointmentBookingScreen()),
    );
    
    if (result == true && mounted) {
      setState(() {
        _upcoming.insert(0, {
          'doctor': 'Dr. Amit Patel',
          'spec': 'Ayurveda Specialist',
          'time': 'Just Booked'
        });
      });
    }
  }

  @override
  Widget build(BuildContext context) {
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
          ..._upcoming.map((a) => _buildAppointmentCard(a['doctor'], a['spec'], a['time'], true)),
        
        const SizedBox(height: 24),
        const Text('Past Appointments', style: TextStyle(fontFamily: 'Poppins', fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textDark)),
        const SizedBox(height: 12),
        ..._past.map((a) => _buildAppointmentCard(a['doctor'], a['spec'], a['time'], false)),
      ],
    );
  }

  Widget _buildAppointmentCard(String doctor, String spec, String time, bool isUpcoming) {
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
                  child: const Text('Upcoming', style: TextStyle(fontFamily: 'Poppins', fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.primaryGreen)),
                )
              else
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(color: const Color(0xFFF5F5F5), borderRadius: BorderRadius.circular(12)),
                  child: const Text('Completed', style: TextStyle(fontFamily: 'Poppins', fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.textMuted)),
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
                      onPressed: (){},
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryGreen, foregroundColor: Colors.white, minimumSize: const Size(60, 32), padding: const EdgeInsets.symmetric(horizontal: 16)),
                      child: const Text('Join', style: TextStyle(fontFamily: 'Poppins', fontSize: 11)),
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
