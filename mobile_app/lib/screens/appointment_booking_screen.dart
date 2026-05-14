import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../widgets/vx_text_field.dart';
import '../widgets/vx_widgets.dart';

class AppointmentBookingScreen extends StatefulWidget {
  const AppointmentBookingScreen({super.key});

  @override
  State<AppointmentBookingScreen> createState() => _AppointmentBookingScreenState();
}

class _AppointmentBookingScreenState extends State<AppointmentBookingScreen> {
  final List<String> _specializations = ['All', 'Ayurveda', 'Cardiology', 'Dermatology', 'Neurology', 'Orthopedics'];
  String _activeFilter = 'All';
  String _searchQuery = '';

  final List<Map<String, dynamic>> _doctors = [
    {
      'id': 'd1',
      'name': 'Ananya Sharma',
      'spec': 'Ayurveda',
      'rating': 4.8,
      'exp': '10',
      'hospital': 'VaidyaMed Care',
      'fee': 500,
      'location': 'Mumbai',
      'icon': '🌿',
      'color': const Color(0xFF2D6A4F)
    },
    {
      'id': 'd2',
      'name': 'Rajesh Kumar',
      'spec': 'Cardiology',
      'rating': 4.9,
      'exp': '15',
      'hospital': 'City Heart Institute',
      'fee': 800,
      'location': 'Delhi',
      'icon': '❤️',
      'color': const Color(0xFFC62828)
    },
    {
      'id': 'd3',
      'name': 'Sneha Desai',
      'spec': 'Dermatology',
      'rating': 4.7,
      'exp': '8',
      'hospital': 'Skin Health Clinic',
      'fee': 600,
      'location': 'Pune',
      'icon': '🧴',
      'color': const Color(0xFFE65100)
    },
    {
      'id': 'd4',
      'name': 'Amit Patel',
      'spec': 'Orthopedics',
      'rating': 4.6,
      'exp': '12',
      'hospital': 'Bone & Joint Center',
      'fee': 700,
      'location': 'Ahmedabad',
      'icon': '🦴',
      'color': const Color(0xFF283593)
    },
  ];

  void _openBookingForm(Map<String, dynamic> doctor) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => BookingBottomSheet(doctor: doctor),
    ).then((result) {
      if (result == true && mounted) {
        Navigator.of(context).pop(true);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _doctors.where((d) {
      final matchesSearch = d['name'].toString().toLowerCase().contains(_searchQuery.toLowerCase()) || 
                            d['spec'].toString().toLowerCase().contains(_searchQuery.toLowerCase());
      final matchesFilter = _activeFilter == 'All' || d['spec'] == _activeFilter;
      return matchesSearch && matchesFilter;
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF7FDF9),
      appBar: AppBar(
        title: const Text('Find Doctors', style: TextStyle(fontFamily: 'PlayfairDisplay', fontWeight: FontWeight.w700, color: AppColors.primaryGreen)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.primaryGreen),
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.white,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  onChanged: (v) => setState(() => _searchQuery = v),
                  decoration: InputDecoration(
                    hintText: '🔍 Search by name or specialization...',
                    hintStyle: const TextStyle(fontFamily: 'Poppins', fontSize: 13, color: AppColors.textMuted),
                    filled: true,
                    fillColor: const Color(0xFFF8FAFC),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(50), borderSide: BorderSide.none),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 0),
                  ),
                ),
                const SizedBox(height: 16),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  child: Row(
                    children: _specializations.map((spec) {
                      final isActive = _activeFilter == spec;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(spec, style: TextStyle(fontFamily: 'Poppins', fontSize: 12, fontWeight: isActive ? FontWeight.w600 : FontWeight.w500, color: isActive ? Colors.white : AppColors.textDark)),
                          selected: isActive,
                          onSelected: (v) => setState(() => _activeFilter = spec),
                          selectedColor: AppColors.primaryGreen,
                          backgroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(50), side: BorderSide(color: isActive ? AppColors.primaryGreen : AppColors.inputBorder)),
                          showCheckmark: false,
                        ),
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: const Color(0xFFE8F4FD), borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFF90CAF9))),
                  child: const Row(
                    children: [
                      Icon(Icons.lock_outline, size: 16, color: Color(0xFF1565C0)),
                      SizedBox(width: 8),
                      Expanded(child: Text('Consultation fee is charged before confirming. Chat unlocks after payment.', style: TextStyle(fontFamily: 'Poppins', fontSize: 11, color: Color(0xFF1565C0)))),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: filtered.isEmpty
                ? const Center(child: Text('No doctors found.', style: TextStyle(color: AppColors.textMuted)))
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    physics: const BouncingScrollPhysics(),
                    itemCount: filtered.length,
                    itemBuilder: (context, index) {
                      final d = filtered[index];
                      return Container(
                        margin: const EdgeInsets.only(bottom: 16),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.primaryGreen.withValues(alpha: 0.12)),
                          boxShadow: [BoxShadow(color: const Color(0xFF0A2814).withValues(alpha: 0.06), blurRadius: 12, offset: const Offset(0, 2))],
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: 48,
                              height: 48,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                gradient: LinearGradient(colors: [d['color'], const Color(0xFF0D2410)]),
                              ),
                              alignment: Alignment.center,
                              child: Text(d['icon'], style: const TextStyle(fontSize: 20)),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Dr. ${d['name']}', style: const TextStyle(fontFamily: 'PlayfairDisplay', fontSize: 16, fontWeight: FontWeight.w700, color: Color(0xFF1A2E1A))),
                                  Text(d['spec'], style: const TextStyle(fontFamily: 'Poppins', fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.primaryGreen)),
                                  const SizedBox(height: 6),
                                  Wrap(
                                    spacing: 8,
                                    runSpacing: 4,
                                    children: [
                                      _buildMetaBadge('⭐ ${d['rating']}'),
                                      _buildMetaBadge('🕐 ${d['exp']} yrs exp'),
                                      _buildMetaBadge('🏥 ${d['hospital']}'),
                                      _buildMetaBadge('💰 ₹${d['fee']}/consult'),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Text('📍 ${d['location']}', style: const TextStyle(fontFamily: 'Poppins', fontSize: 11, color: Color(0xFF6B8F71))),
                                  const SizedBox(height: 12),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: ElevatedButton.icon(
                                          onPressed: () => _openBookingForm(d),
                                          icon: const Icon(Icons.calendar_month, size: 16),
                                          label: const Text('Book & Pay', style: TextStyle(fontFamily: 'Poppins', fontSize: 11, fontWeight: FontWeight.w600)),
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: AppColors.primaryGreen,
                                            foregroundColor: Colors.white,
                                            padding: const EdgeInsets.symmetric(vertical: 10),
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: OutlinedButton.icon(
                                          onPressed: null,
                                          icon: const Icon(Icons.lock, size: 14),
                                          label: const Text('Message', style: TextStyle(fontFamily: 'Poppins', fontSize: 11)),
                                          style: OutlinedButton.styleFrom(
                                            padding: const EdgeInsets.symmetric(vertical: 10),
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
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
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetaBadge(String text) {
    return Text(text, style: const TextStyle(fontFamily: 'Poppins', fontSize: 10, color: AppColors.textMuted));
  }
}

class BookingBottomSheet extends StatefulWidget {
  final Map<String, dynamic> doctor;
  const BookingBottomSheet({super.key, required this.doctor});

  @override
  State<BookingBottomSheet> createState() => _BookingBottomSheetState();
}

class _BookingBottomSheetState extends State<BookingBottomSheet> {
  String _type = 'Chat Consultation';
  DateTime? _date;
  String? _time;
  final TextEditingController _purposeCtrl = TextEditingController();
  bool _isSubmitting = false;

  void _book() async {
    if (_date == null || _time == null || _purposeCtrl.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select date, time, and purpose'), backgroundColor: AppColors.errorRed));
      return;
    }
    setState(() => _isSubmitting = true);
    await Future.delayed(const Duration(seconds: 2));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Payment simulated. Appointment booked!'), backgroundColor: AppColors.primaryGreen));
      Navigator.of(context).pop(true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                const Text('🩺', style: TextStyle(fontSize: 32)),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Dr. ${widget.doctor['name']}', style: const TextStyle(fontFamily: 'PlayfairDisplay', fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.textDark)),
                      Text('${widget.doctor['spec']} • ₹${widget.doctor['fee']} Fee', style: const TextStyle(fontFamily: 'Poppins', fontSize: 12, color: AppColors.textMuted)),
                    ],
                  ),
                ),
                IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.of(context).pop()),
              ],
            ),
            const SizedBox(height: 20),
            _buildLabel('Consultation Type'),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(border: Border.all(color: AppColors.inputBorder), borderRadius: BorderRadius.circular(12)),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _type,
                  isExpanded: true,
                  items: const [
                    DropdownMenuItem(value: 'Chat Consultation', child: Text('💬 Chat Consultation', style: TextStyle(fontFamily: 'Poppins', fontSize: 13))),
                    DropdownMenuItem(value: 'Offline / In-Clinic', child: Text('🏥 Offline / In-Clinic', style: TextStyle(fontFamily: 'Poppins', fontSize: 13))),
                  ],
                  onChanged: (v) => setState(() => _type = v!),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildLabel('Date *'),
                      InkWell(
                        onTap: () async {
                          final date = await showDatePicker(
                            context: context, initialDate: DateTime.now().add(const Duration(days: 1)),
                            firstDate: DateTime.now(), lastDate: DateTime.now().add(const Duration(days: 30)),
                          );
                          if (date != null) setState(() => _date = date);
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
                          decoration: BoxDecoration(border: Border.all(color: AppColors.inputBorder), borderRadius: BorderRadius.circular(12)),
                          child: Text(_date == null ? 'Select' : '${_date!.day}/${_date!.month}/${_date!.year}', style: const TextStyle(fontFamily: 'Poppins', fontSize: 13)),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildLabel('Time *'),
                      InkWell(
                        onTap: () async {
                          final time = await showTimePicker(context: context, initialTime: const TimeOfDay(hour: 10, minute: 0));
                          if (time != null) setState(() => _time = time.format(context));
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
                          decoration: BoxDecoration(border: Border.all(color: AppColors.inputBorder), borderRadius: BorderRadius.circular(12)),
                          child: Text(_time ?? 'Select', style: const TextStyle(fontFamily: 'Poppins', fontSize: 13)),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _buildLabel('Purpose of Visit *'),
            TextField(
              controller: _purposeCtrl,
              decoration: InputDecoration(
                hintText: 'e.g. Fever & cold...',
                hintStyle: const TextStyle(fontFamily: 'Poppins', fontSize: 13, color: AppColors.textMuted),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.inputBorder)),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.inputBorder)),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.primaryGreen)),
              ),
            ),
            const SizedBox(height: 24),
            VxButton(
              label: 'Pay & Book — ₹${widget.doctor['fee']}',
              onPressed: _book,
              isLoading: _isSubmitting,
            ),
            const SizedBox(height: 10),
          ],
        ),
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(text, style: const TextStyle(fontFamily: 'Poppins', fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textDark)),
    );
  }
}
