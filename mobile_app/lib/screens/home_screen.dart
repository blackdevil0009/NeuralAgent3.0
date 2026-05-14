import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import 'login_screen.dart';
import 'profile_screen.dart';
import 'booking_screen.dart';
import 'report_screen.dart';
import 'ai_screen.dart';
import 'emergency_screen.dart';
import 'appointment_booking_screen.dart';
import 'wellness_screen.dart';
import 'inbox_screen.dart';
import 'medicines_screen.dart';
import 'support_screen.dart';
import 'doctor_patients_screen.dart';
import 'doctor_schedule_screen.dart';
import 'doctor_inbox_screen.dart';
import 'notifications_screen.dart';

class HomeScreen extends StatefulWidget {
  final Map<String, dynamic> user;

  const HomeScreen({
    super.key,
    required this.user,
  });

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  final List<String> _titles = ['Dashboard', 'Appointments', 'Records', 'Wellness', 'Profile', 'Emergency'];

  bool get _isDoctor => widget.user['role']?.toString() == 'doctor';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7FDF9),
      appBar: AppBar(
        title: Text(
          _titles[_currentIndex],
          style: const TextStyle(
            fontFamily: 'PlayfairDisplay',
            fontWeight: FontWeight.w700,
            color: AppColors.primaryGreen,
          ),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.primaryGreen),
        actions: [
          IconButton(
            icon: const Icon(Icons.chat_bubble_outline),
            onPressed: () {
              Navigator.of(context).push(MaterialPageRoute(
                builder: (_) => _isDoctor ? const DoctorInboxScreen() : const InboxScreen(),
              ));
            },
          ),
          Stack(
            children: [
              IconButton(
                icon: const Icon(Icons.notifications_none_outlined),
                onPressed: () {
                  Navigator.of(context).push(MaterialPageRoute(builder: (_) => const NotificationsScreen()));
                },
              ),
              Positioned(
                right: 8, top: 8,
                child: Container(
                  width: 8, height: 8,
                  decoration: const BoxDecoration(color: Color(0xFFE53935), shape: BoxShape.circle),
                ),
              ),
            ],
          ),
          const SizedBox(width: 8),
        ],
      ),
      drawer: _buildDrawer(context),
      body: _buildBody(),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          Navigator.of(context).push(MaterialPageRoute(builder: (_) => AiScreen(role: widget.user['role']?.toString() ?? 'patient')));
        },
        backgroundColor: AppColors.accentGold,
        child: const Icon(Icons.auto_awesome, color: Colors.white),
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          boxShadow: [
            BoxShadow(
              color: AppColors.primaryGreen.withValues(alpha: 0.08),
              blurRadius: 20,
              offset: const Offset(0, -5),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          child: BottomNavigationBar(
            currentIndex: _currentIndex,
            onTap: (index) => setState(() => _currentIndex = index),
            backgroundColor: Colors.white,
            selectedItemColor: AppColors.primaryGreen,
            unselectedItemColor: AppColors.textMuted.withValues(alpha: 0.6),
            selectedLabelStyle: const TextStyle(fontFamily: 'Poppins', fontSize: 11, fontWeight: FontWeight.w600),
            unselectedLabelStyle: const TextStyle(fontFamily: 'Poppins', fontSize: 10, fontWeight: FontWeight.w500),
            type: BottomNavigationBarType.fixed,
            items: [
              const BottomNavigationBarItem(icon: Icon(Icons.home_outlined), activeIcon: Icon(Icons.home), label: 'Home'),
              BottomNavigationBarItem(
                icon: const Icon(Icons.calendar_today_outlined),
                activeIcon: const Icon(Icons.calendar_month),
                label: _isDoctor ? 'Schedule' : 'Bookings',
              ),
              BottomNavigationBarItem(
                icon: const Icon(Icons.description_outlined),
                activeIcon: const Icon(Icons.description),
                label: _isDoctor ? 'Patients' : 'Records',
              ),
              if (!_isDoctor)
                const BottomNavigationBarItem(icon: Icon(Icons.self_improvement_outlined), activeIcon: Icon(Icons.self_improvement), label: 'Wellness'),
              const BottomNavigationBarItem(icon: Icon(Icons.person_outline), activeIcon: Icon(Icons.person), label: 'Profile'),
              const BottomNavigationBarItem(icon: Icon(Icons.emergency_outlined), activeIcon: Icon(Icons.emergency), label: 'SOS'),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBody() {
    // Simple placeholder switching based on tab
    switch (_currentIndex) {
      case 0: return _buildDashboardTab();
      case 1: return _isDoctor ? const DoctorScheduleScreen() : const BookingScreen();
      case 2: return _isDoctor ? const DoctorPatientsScreen() : const ReportScreen();
      case 3:
        if (_isDoctor) return ProfileScreen(user: widget.user);
        return const WellnessScreen();
      case 4:
        if (_isDoctor) return EmergencyScreen(role: 'doctor');
        return ProfileScreen(user: widget.user);
      case 5: return EmergencyScreen(role: widget.user['role']?.toString() ?? 'patient');
      default: return const SizedBox.shrink();
    }
  }

  Widget _buildDashboardTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Hello, ${widget.user['role'] == 'patient' ? widget.user['name'] ?? 'User' : 'Dr. ${widget.user['name'] ?? 'User'}'} 👋',
            style: const TextStyle(
              fontFamily: 'Poppins',
              fontSize: 22,
              fontWeight: FontWeight.w600,
              color: AppColors.textDark,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'How are you feeling today?',
            style: TextStyle(
              fontFamily: 'Poppins',
              fontSize: 13,
              color: AppColors.textMuted.withValues(alpha: 0.8),
            ),
          ),
          const SizedBox(height: 24),

          // Action Card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: AppColors.backgroundGradient,
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primaryGreen.withValues(alpha: 0.3),
                  blurRadius: 15,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.user['role'] == 'patient' ? 'Consult an Ayurvedic Expert' : 'Manage Your Schedule',
                        style: const TextStyle(
                          fontFamily: 'Poppins',
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        widget.user['role'] == 'patient' ? 'Get personalized holistic treatments.' : 'View upcoming patient appointments.',
                        style: TextStyle(
                          fontFamily: 'Poppins',
                          fontSize: 12,
                          color: Colors.white.withValues(alpha: 0.85),
                        ),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () {
                          if (widget.user['role'] == 'patient') {
                            Navigator.of(context).push(MaterialPageRoute(builder: (_) => const AppointmentBookingScreen()));
                          } else {
                            setState(() => _currentIndex = 1); // Go to Schedule tab
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: AppColors.primaryGreen,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(50)),
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                          elevation: 0,
                        ),
                        child: Text(
                          widget.user['role'] == 'patient' ? 'Book Now' : 'View Schedule',
                          style: const TextStyle(fontFamily: 'Poppins', fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                const Icon(Icons.spa, size: 60, color: AppColors.accentGold),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Categories or Quick Links
          Text(
            'Quick Links',
            style: const TextStyle(
              fontFamily: 'Poppins',
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppColors.textDark,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _buildQuickLink(Icons.local_pharmacy_outlined, 'Medicines', () {
                Navigator.of(context).push(MaterialPageRoute(builder: (_) => const MedicinesScreen()));
              }),
              _buildQuickLink(Icons.video_call_outlined, 'Teleconsult', null),
              _buildQuickLink(Icons.monitor_heart_outlined, 'Vitals', null),
              _buildQuickLink(Icons.support_agent_outlined, 'Support', () {
                Navigator.of(context).push(MaterialPageRoute(builder: (_) => const SupportScreen()));
              }),
            ],
          ),
          const SizedBox(height: 24),

          // Placeholder for upcoming events/tips
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.inputBorder.withValues(alpha: 0.4)),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEAF5EE),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.wb_sunny_outlined, color: AppColors.primaryGreen),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Daily Ayurvedic Tip',
                        style: TextStyle(fontFamily: 'Poppins', fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textDark),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Drink warm water in the morning to kickstart digestion (Agni).',
                        style: TextStyle(fontFamily: 'Poppins', fontSize: 11, color: AppColors.textMuted),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickLink(IconData icon, String label, VoidCallback? onTap) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primaryGreen.withValues(alpha: 0.06),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
                border: Border.all(color: AppColors.inputBorder.withValues(alpha: 0.3)),
              ),
              child: Icon(icon, color: AppColors.primaryGreen, size: 24),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              style: const TextStyle(
                fontFamily: 'Poppins',
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: AppColors.textDark,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDrawer(BuildContext context) {
    return Drawer(
      child: Container(
        color: const Color(0xFFF7FDF9),
        child: Column(
          children: [
            UserAccountsDrawerHeader(
              decoration: const BoxDecoration(gradient: AppColors.headerGradient),
              accountName: Text('${widget.user['role']}'.toUpperCase(), style: const TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.w600)),
              accountEmail: Text('${widget.user['email']}', style: const TextStyle(fontFamily: 'Poppins', fontSize: 12)),
              currentAccountPicture: const CircleAvatar(
                backgroundColor: Colors.white,
                child: Text('🌿', style: TextStyle(fontSize: 24)),
              ),
            ),
            ListTile(
              leading: const Icon(Icons.settings_outlined, color: AppColors.primaryGreen),
              title: const Text('Settings', style: TextStyle(fontFamily: 'Poppins', fontSize: 14)),
              onTap: () => Navigator.of(context).pop(),
            ),
            ListTile(
              leading: const Icon(Icons.help_outline, color: AppColors.primaryGreen),
              title: const Text('Help & Support', style: TextStyle(fontFamily: 'Poppins', fontSize: 14)),
              onTap: () => Navigator.of(context).pop(),
            ),
            ListTile(
              leading: const Icon(Icons.policy_outlined, color: AppColors.primaryGreen),
              title: const Text('Privacy Policy', style: TextStyle(fontFamily: 'Poppins', fontSize: 14)),
              onTap: () => Navigator.of(context).pop(),
            ),
            const Spacer(),
            const Divider(color: AppColors.inputBorder),
            ListTile(
              leading: const Icon(Icons.logout, color: AppColors.errorRed),
              title: const Text('Logout', style: TextStyle(fontFamily: 'Poppins', fontSize: 14, color: AppColors.errorRed, fontWeight: FontWeight.w600)),
              onTap: () {
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                  (route) => false,
                );
              },
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}
