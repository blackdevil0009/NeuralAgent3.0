import 'package:flutter/material.dart';
import '../services/api_service.dart';
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

  List<Map<String, dynamic>> _doctors = [];
  bool _isLoading = true;
  String? _errorMsg;

  @override
  void initState() {
    super.initState();
    _fetchDoctors();
  }

  Future<void> _fetchDoctors() async {
    setState(() {
      _isLoading = true;
      _errorMsg = null;
    });
    try {
      final res = await ApiClient.get(ApiConfig.doctors);
      if (res.ok && res.data != null) {
        final docsList = res.data!['data']?['doctors'] as List? ?? [];
        final parsed = docsList.map((d) {
          return {
            'id': d['id']?.toString() ?? '',
            'name': d['fullName'] ?? d['name'] ?? 'Doctor',
            'spec': d['specialization'] ?? 'General',
            'rating': 4.8, // Mocked rating for now as backend might not have it
            'exp': d['experience']?.toString() ?? '5',
            'hospital': d['hospital'] ?? d['clinic_location'] ?? 'VaidyaMed Care',
            'fee': d['consultation_fee'] ?? d['fee'] ?? 500,
            'location': d['city'] ?? d['location'] ?? 'Unknown',
            'upiId': d['upiId'] ?? d['upi_id'] ?? '',
            'icon': _getIconForSpec(d['specialization']),
            'color': _getColorForSpec(d['specialization']),
          };
        }).toList();
        setState(() {
          _doctors = parsed;
          _isLoading = false;
        });
      } else {
        setState(() {
          _errorMsg = 'Failed to load doctors: ${res.error}';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _errorMsg = 'Connection error. Please try again.';
        _isLoading = false;
      });
    }
  }

  String _getIconForSpec(String? spec) {
    if (spec == null) return '👨‍⚕️';
    final s = spec.toLowerCase();
    if (s.contains('ayurveda')) return '🌿';
    if (s.contains('cardio')) return '❤️';
    if (s.contains('derm')) return '🧴';
    if (s.contains('ortho')) return '🦴';
    if (s.contains('neuro')) return '🧠';
    return '👨‍⚕️';
  }

  Color _getColorForSpec(String? spec) {
    if (spec == null) return const Color(0xFF283593);
    final s = spec.toLowerCase();
    if (s.contains('ayurveda')) return const Color(0xFF2D6A4F);
    if (s.contains('cardio')) return const Color(0xFFC62828);
    if (s.contains('derm')) return const Color(0xFFE65100);
    if (s.contains('ortho')) return const Color(0xFF283593);
    return const Color(0xFF00695C);
  }

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
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: AppColors.primaryGreen))
                : _errorMsg != null
                    ? Center(child: Text(_errorMsg!, style: const TextStyle(color: AppColors.errorRed)))
                    : filtered.isEmpty
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
  TimeOfDay? _time;
  final TextEditingController _purposeCtrl = TextEditingController();
  bool _isSubmitting = false;

  void _book() async {
    if (_date == null || _time == null || _purposeCtrl.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select date, time, and purpose'), backgroundColor: AppColors.errorRed));
      return;
    }
    setState(() => _isSubmitting = true);
    
    try {
      final dateStr = '${_date!.year}-${_date!.month.toString().padLeft(2, '0')}-${_date!.day.toString().padLeft(2, '0')}';
      final timeStr = '${_time!.hour.toString().padLeft(2, '0')}:${_time!.minute.toString().padLeft(2, '0')}';
      
      final createRes = await ApiClient.post(ApiConfig.createOrder, {
        'doctorId': widget.doctor['id'],
        'date': dateStr,
        'time': timeStr,
        'type': _type,
        'purpose': _purposeCtrl.text,
      });

      if (!createRes.ok || createRes.data == null) {
        final error = createRes.data?['message'] ?? createRes.data?['error'] ?? createRes.error ?? 'Failed to initiate booking.';
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error), backgroundColor: AppColors.errorRed));
        setState(() => _isSubmitting = false);
        return;
      }

      final data = createRes.data!['data'] as Map<String, dynamic>;
      final appointmentId = data['appointmentId'];
      final orderId = data['orderId'];

      // Send simulated payment confirmation to verify-payment endpoint
      final verifyRes = await ApiClient.post(ApiConfig.verifyPayment, {
        'appointmentId': appointmentId,
        'razorpayOrderId': orderId,
        'razorpayPaymentId': 'pay_SIM_${DateTime.now().millisecondsSinceEpoch}',
        'razorpaySignature': 'SIM_SIGNATURE',
      });

      if (verifyRes.ok) {
        final resData = verifyRes.data!['data'] as Map<String, dynamic>?;
        final appointment = resData?['appointment'] as Map<String, dynamic>? ?? {};
        final txnId = resData?['transactionId']?.toString() ?? 'N/A';
        final doctorUpi = appointment['doctorUpiId'] ?? appointment['doctor_upi_id'] ?? widget.doctor['upiId'] ?? '';
        final doctorMobile = appointment['doctorMobile'] ?? appointment['doctor_mobile'] ?? '';
        final clinicLocation = appointment['clinicLocation'] ?? appointment['clinic_location'] ?? '';

        if (mounted) {
          await showDialog(
            context: context,
            barrierDismissible: false,
            builder: (context) => AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
              backgroundColor: Colors.white,
              title: const Column(
                children: [
                  Text('🎉', style: TextStyle(fontSize: 48)),
                  SizedBox(height: 12),
                  Text(
                    'Payment Confirmed!',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontFamily: 'PlayfairDisplay', fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.primaryGreen),
                  ),
                ],
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Your appointment with Dr. ${widget.doctor['name']} is confirmed.',
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontFamily: 'Poppins', fontSize: 13, color: AppColors.textMuted),
                    ),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF7FDF9),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.primaryGreen.withValues(alpha: 0.12)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('🔓 UNLOCKED DETAILS', style: TextStyle(fontFamily: 'Poppins', fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.primaryGreen, letterSpacing: 1.0)),
                          const SizedBox(height: 8),
                          if (clinicLocation.isNotEmpty) ...[
                            Row(
                              children: [
                                const Text('📍 ', style: TextStyle(fontSize: 14)),
                                Expanded(child: Text(clinicLocation, style: const TextStyle(fontFamily: 'Poppins', fontSize: 12, color: AppColors.textDark))),
                              ],
                            ),
                            const SizedBox(height: 6),
                          ],
                          if (doctorMobile.isNotEmpty) ...[
                            Row(
                              children: [
                                const Text('📞 ', style: TextStyle(fontSize: 14)),
                                Expanded(child: Text(doctorMobile, style: const TextStyle(fontFamily: 'Poppins', fontSize: 12, color: AppColors.textDark))),
                              ],
                            ),
                            const SizedBox(height: 6),
                          ],
                          if (doctorUpi.isNotEmpty) ...[
                            Row(
                              children: [
                                const Text('💳 ', style: TextStyle(fontSize: 14)),
                                Expanded(child: Text('UPI ID: $doctorUpi', style: const TextStyle(fontFamily: 'Poppins', fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textDark))),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Transaction ID', style: TextStyle(fontFamily: 'Poppins', fontSize: 11, color: AppColors.textMuted)),
                        Expanded(
                          child: SelectableText(
                            txnId,
                            textAlign: TextAlign.end,
                            style: const TextStyle(fontFamily: 'Poppins', fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textDark),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              actions: [
                Center(
                  child: ElevatedButton(
                    onPressed: () => Navigator.of(context).pop(),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primaryGreen,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(50)),
                    ),
                    child: const Text('Great!', style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          );
          Navigator.of(context).pop(true);
        }
      } else {
        final error = verifyRes.data?['message'] ?? verifyRes.data?['error'] ?? verifyRes.error ?? 'Payment verification failed.';
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error), backgroundColor: AppColors.errorRed));
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.errorRed));
    } finally {
      setState(() => _isSubmitting = false);
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
                          if (time != null) setState(() => _time = time);
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
                          decoration: BoxDecoration(border: Border.all(color: AppColors.inputBorder), borderRadius: BorderRadius.circular(12)),
                          child: Text(_time == null ? 'Select' : _time!.format(context), style: const TextStyle(fontFamily: 'Poppins', fontSize: 13)),
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
