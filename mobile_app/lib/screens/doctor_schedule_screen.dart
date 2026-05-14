import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import 'video_call_screen.dart';

class DoctorScheduleScreen extends StatefulWidget {
  const DoctorScheduleScreen({super.key});
  @override
  State<DoctorScheduleScreen> createState() => _DoctorScheduleScreenState();
}

class _DoctorScheduleScreenState extends State<DoctorScheduleScreen> {
  int _selectedDay = DateTime.now().day;
  String _viewMode = 'today';

  final List<Map<String, dynamic>> _appointments = [
    {'id': 101, 'patientName': 'Riya Mehta', 'time': '10:00', 'type': 'Chat', 'status': 'Confirmed', 'day': DateTime.now().day},
    {'id': 102, 'patientName': 'Arjun Verma', 'time': '11:00', 'type': 'In-Clinic', 'status': 'Scheduled', 'day': DateTime.now().day},
    {'id': 103, 'patientName': 'Sunita Rao', 'time': '13:00', 'type': 'Chat', 'status': 'Scheduled', 'day': DateTime.now().day},
    {'id': 104, 'patientName': 'Deepak Sharma', 'time': '10:00', 'type': 'In-Clinic', 'status': 'Confirmed', 'day': DateTime.now().day + 1},
  ];

  final List<String> _timeSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

  Color _statusColor(String s) => s == 'Confirmed' ? const Color(0xFF15803D) : s == 'Completed' ? const Color(0xFF4B5563) : s == 'Cancelled' ? const Color(0xFF991B1B) : const Color(0xFF92400E);
  Color _statusBg(String s) => s == 'Confirmed' ? const Color(0xFFF0FDF4) : s == 'Completed' ? const Color(0xFFF8F9FA) : s == 'Cancelled' ? const Color(0xFFFEF2F2) : const Color(0xFFFFFBEB);

  void _changeStatus(Map<String, dynamic> appt, String newStatus) {
    setState(() => appt['status'] = newStatus);
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Appointment marked as $newStatus'), backgroundColor: AppColors.primaryGreen));
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final dayAppts = _appointments.where((a) => a['day'] == _selectedDay).toList();
    final confirmed = _appointments.where((a) => a['status'] == 'Confirmed').length;
    final now = DateTime.now();

    return Scaffold(
      backgroundColor: const Color(0xFFF7FDF9),
      appBar: AppBar(
        title: const Text('My Schedule', style: TextStyle(fontFamily: 'PlayfairDisplay', fontWeight: FontWeight.w700, color: AppColors.primaryGreen)),
        backgroundColor: Colors.white, elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.primaryGreen),
      ),
      body: Column(
        children: [
          // Calendar Strip
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('${_monthName(now.month)} ${now.year}', style: const TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textDark)),
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(gradient: AppColors.backgroundGradient, borderRadius: BorderRadius.circular(10)),
                        child: Text('Daily Load: ${confirmed * 20}%', style: const TextStyle(fontFamily: 'Poppins', fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: 64,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: 14,
                    itemBuilder: (ctx, i) {
                      final day = now.day + i - 2;
                      final isSelected = day == _selectedDay;
                      final weekDay = DateTime(now.year, now.month, day).weekday;
                      final dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                      return GestureDetector(
                        onTap: () => setState(() => _selectedDay = day),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          width: 52,
                          margin: const EdgeInsets.only(right: 8),
                          decoration: BoxDecoration(
                            gradient: isSelected ? AppColors.backgroundGradient : null,
                            color: isSelected ? null : Colors.white,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: isSelected ? AppColors.primaryGreen : AppColors.inputBorder),
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(dayLabels[(weekDay - 1) % 7], style: TextStyle(fontFamily: 'Poppins', fontSize: 10, color: isSelected ? Colors.white70 : AppColors.textMuted)),
                              const SizedBox(height: 4),
                              Text('$day', style: TextStyle(fontFamily: 'Poppins', fontSize: 16, fontWeight: FontWeight.bold, color: isSelected ? Colors.white : AppColors.textDark)),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),

          // View Mode Tabs
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            color: Colors.white,
            child: Row(
              children: ['today', 'week', 'month'].map((m) {
                final isActive = _viewMode == m;
                return Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _viewMode = m),
                    child: Container(
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      decoration: BoxDecoration(
                        color: isActive ? AppColors.primaryGreen : Colors.transparent,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      alignment: Alignment.center,
                      child: Text(m[0].toUpperCase() + m.substring(1), style: TextStyle(fontFamily: 'Poppins', fontSize: 12, fontWeight: FontWeight.w600, color: isActive ? Colors.white : AppColors.textMuted)),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),

          const Divider(height: 1),

          // Schedule Body
          Expanded(
            child: _viewMode == 'today'
                ? _buildTodayView(dayAppts)
                : Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    const Text('📅', style: TextStyle(fontSize: 48)),
                    const SizedBox(height: 12),
                    Text('${_viewMode[0].toUpperCase()}${_viewMode.substring(1)} view coming soon', style: const TextStyle(fontFamily: 'Poppins', color: AppColors.textMuted)),
                  ])),
          ),
        ],
      ),
    );
  }

  Widget _buildTodayView(List<Map<String, dynamic>> dayAppts) {
    if (dayAppts.isEmpty) {
      return const Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Text('🗓️', style: TextStyle(fontSize: 48)),
        SizedBox(height: 12),
        Text('No appointments for this day', style: TextStyle(fontFamily: 'Poppins', color: AppColors.textMuted)),
      ]));
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _timeSlots.length,
      itemBuilder: (ctx, i) {
        final slot = _timeSlots[i];
        final appt = dayAppts.where((a) => a['time'] == slot).toList();
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 60,
              child: Padding(
                padding: const EdgeInsets.only(top: 14),
                child: Text(slot, style: const TextStyle(fontFamily: 'Poppins', fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textMuted)),
              ),
            ),
            Expanded(
              child: Column(
                children: [
                  if (appt.isEmpty)
                    Container(height: 50, margin: const EdgeInsets.only(bottom: 8), decoration: BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.inputBorder.withValues(alpha: 0.4)))))
                  else
                    ...appt.map((a) => GestureDetector(
                      onTap: () => _showAppointmentActions(a),
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: _statusBg(a['status']),
                          borderRadius: BorderRadius.circular(12),
                          border: Border(left: BorderSide(color: _statusColor(a['status']), width: 4)),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Text(a['patientName'], style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold, color: _statusColor(a['status']))),
                                Text('${a['type']} • ID: #${a['id']}', style: const TextStyle(fontFamily: 'Poppins', fontSize: 11, color: AppColors.textMuted)),
                              ]),
                            ),
                            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                              Text(a['time'], style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold, color: _statusColor(a['status']))),
                              Text(a['status'], style: TextStyle(fontFamily: 'Poppins', fontSize: 10, color: _statusColor(a['status']))),
                            ]),
                          ],
                        ),
                      ),
                    )),
                ],
              ),
            ),
          ],
        );
      },
    );
  }

  void _showAppointmentActions(Map<String, dynamic> a) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(a['patientName'], style: const TextStyle(fontFamily: 'PlayfairDisplay', fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.primaryGreen)),
            Text('${a['type']} • ${a['time']}', style: const TextStyle(fontFamily: 'Poppins', fontSize: 12, color: AppColors.textMuted)),
            const SizedBox(height: 20),
            if (a['status'] == 'Scheduled') ...[
              _actionBtn('✅ Confirm Appointment', AppColors.primaryGreen, () => _changeStatus(a, 'Confirmed')),
              const SizedBox(height: 10),
            ],
            if (a['status'] == 'Confirmed' || a['status'] == 'Scheduled') ...[
              _actionBtn('🏁 Mark as Completed', const Color(0xFF15803D), () => _changeStatus(a, 'Completed')),
              const SizedBox(height: 10),
              _actionBtn('😐 Mark as No-Show', const Color(0xFF92400E), () => _changeStatus(a, 'No-Show')),
              const SizedBox(height: 10),
            ],
            _actionBtn('📹 Join Video Call', const Color(0xFF1565C0), () {
              Navigator.pop(ctx);
              Navigator.of(context).push(MaterialPageRoute(
                builder: (_) => VideoCallScreen(
                  channelName: 'vaidyamed_${a['id']}',
                  patientName: a['patientName'],
                ),
              ));
            }),
            const SizedBox(height: 8),
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Close', style: TextStyle(fontFamily: 'Poppins', color: AppColors.textMuted))),
          ],
        ),
      ),
    );
  }

  Widget _actionBtn(String label, Color color, VoidCallback onTap) {
    return ElevatedButton(
      onPressed: onTap,
      style: ElevatedButton.styleFrom(backgroundColor: color, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
      child: Text(label, style: const TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold)),
    );
  }

  String _monthName(int m) => ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m];
}
