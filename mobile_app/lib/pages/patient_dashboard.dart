import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../constants/app_colors.dart';
import '../widgets/gradient_background.dart';
import '../widgets/glass_card.dart';
import 'ai_assistant_page.dart';
import 'login_page.dart';

class PatientDashboard extends StatefulWidget {
  const PatientDashboard({super.key});

  @override
  State<PatientDashboard> createState() => _PatientDashboardState();
}

class _PatientDashboardState extends State<PatientDashboard> {
  int _selectedIndex = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.white,
      appBar: _buildAppBar(),
      drawer: _buildDrawer(),
      body: _buildBody(),
      bottomNavigationBar: _buildBottomNav(),
      floatingActionButton: FloatingActionButton(
        onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AIAssistantPage())),
        backgroundColor: AppColors.gGreen,
        child: const Icon(Icons.chat_bubble_outline, color: AppColors.white),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      backgroundColor: AppColors.gDark,
      title: Row(
        children: [
          const Icon(Icons.spa, color: AppColors.gold, size: 24),
          const SizedBox(width: 8),
          Text(
            'Patient Portal',
            style: GoogleFonts.playfairDisplay(
              color: AppColors.gold,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
      actions: [
        IconButton(
          onPressed: () {},
          icon: const Icon(Icons.notifications_none_outlined),
        ),
        const CircleAvatar(
          radius: 16,
          backgroundColor: AppColors.gMid,
          child: Icon(Icons.person, size: 20, color: AppColors.gPale),
        ),
        const SizedBox(width: 16),
      ],
    );
  }

  Widget _buildDrawer() {
    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          DrawerHeader(
            decoration: const BoxDecoration(color: AppColors.gDark),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const CircleAvatar(
                  radius: 30,
                  backgroundColor: AppColors.gold,
                  child: Icon(Icons.person, size: 30, color: AppColors.gDark),
                ),
                const SizedBox(height: 12),
                Text(
                  'John Doe',
                  style: GoogleFonts.poppins(color: AppColors.white, fontWeight: FontWeight.bold),
                ),
                Text(
                  'john@example.com',
                  style: GoogleFonts.poppins(color: AppColors.white.withOpacity(0.6), fontSize: 12),
                ),
              ],
            ),
          ),
          _buildDrawerItem(Icons.dashboard_outlined, 'Health Dashboard'),
          _buildDrawerItem(Icons.smart_toy_outlined, 'AI Assistant', onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AIAssistantPage()))),
          _buildDrawerItem(Icons.file_upload_outlined, 'Upload Reports'),
          _buildDrawerItem(Icons.calendar_month_outlined, 'Appointments'),
          _buildDrawerItem(Icons.person_search_outlined, 'Find Doctors'),
          const Divider(),
          _buildDrawerItem(Icons.settings_outlined, 'Settings'),
          _buildDrawerItem(Icons.logout, 'Logout', isLogout: true, onTap: () => Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const LoginPage()))),
        ],
      ),
    );
  }

  Widget _buildDrawerItem(IconData icon, String title, {bool isLogout = false, VoidCallback? onTap}) {
    return ListTile(
      leading: Icon(icon, color: isLogout ? Colors.redAccent : AppColors.gGreen),
      title: Text(
        title,
        style: GoogleFonts.poppins(color: isLogout ? Colors.redAccent : AppColors.textDark, fontSize: 14),
      ),
      onTap: onTap ?? () {},
    );
  }

  Widget _buildBody() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildWelcomeSection(),
          const SizedBox(height: 24),
          _buildVitalsGrid(),
          const SizedBox(height: 24),
          _buildUpcomingAppointments(),
          const SizedBox(height: 24),
          _buildHealthTips(),
        ],
      ),
    );
  }

  Widget _buildWelcomeSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Namaste, John!',
          style: GoogleFonts.playfairDisplay(fontSize: 26, fontWeight: FontWeight.bold, color: AppColors.gDark),
        ),
        Text(
          'How are you feeling today?',
          style: GoogleFonts.poppins(color: AppColors.textMute, fontSize: 14),
        ),
      ],
    );
  }

  Widget _buildVitalsGrid() {
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      crossAxisSpacing: 16,
      mainAxisSpacing: 16,
      childAspectRatio: 1.3,
      children: [
        _buildVitalCard('Heart Rate', '72 bpm', Icons.favorite, Colors.redAccent),
        _buildVitalCard('Blood Pressure', '120/80', Icons.speed, Colors.blueAccent),
        _buildVitalCard('Oxygen Level', '98%', Icons.air, Colors.teal),
        _buildVitalCard('Blood Sugar', '110 mg/dl', Icons.water_drop, Colors.orangeAccent),
      ],
    );
  }

  Widget _buildVitalCard(String title, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.offWhite,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.gPale.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: 20),
              const SizedBox(width: 8),
              Text(title, style: GoogleFonts.poppins(fontSize: 11, color: AppColors.textMute)),
            ],
          ),
          const Spacer(),
          Text(value, style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textDark)),
        ],
      ),
    );
  }

  Widget _buildUpcomingAppointments() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Upcoming Session', style: GoogleFonts.poppins(fontWeight: FontWeight.bold, fontSize: 16)),
            Text('See All', style: GoogleFonts.poppins(color: AppColors.gGreen, fontSize: 13)),
          ],
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: AppColors.mainGradient,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Row(
            children: [
              const CircleAvatar(radius: 24, backgroundColor: AppColors.gPale, child: Icon(Icons.person)),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Dr. Rajesh Kumar', style: GoogleFonts.poppins(color: AppColors.white, fontWeight: FontWeight.bold)),
                    Text('Ayurvedic Consultant', style: GoogleFonts.poppins(color: AppColors.white.withOpacity(0.7), fontSize: 12)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(color: AppColors.gold, borderRadius: BorderRadius.circular(10)),
                child: Text('4:30 PM', style: GoogleFonts.poppins(fontWeight: FontWeight.bold, color: AppColors.gDark, fontSize: 12)),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildHealthTips() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Daily Health Tips', style: GoogleFonts.poppins(fontWeight: FontWeight.bold, fontSize: 16)),
        const SizedBox(height: 12),
        SizedBox(
          height: 120,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: [
              _buildTipCard('Start your day with warm water and lemon.', Icons.wb_sunny_outlined),
              _buildTipCard('Pranayama for 10 mins can boost immunity.', Icons.self_improvement),
              _buildTipCard('Avoid heavy meals after sunset for better digestion.', Icons.nights_stay_outlined),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildTipCard(String tip, IconData icon) {
    return Container(
      width: 200,
      margin: const EdgeInsets.only(right: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.gLight.withOpacity(0.05),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.gLight.withOpacity(0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: AppColors.gGreen, size: 24),
          const SizedBox(height: 8),
          Text(tip, style: GoogleFonts.poppins(fontSize: 12, color: AppColors.textMid), maxLines: 3),
        ],
      ),
    );
  }

  Widget _buildBottomNav() {
    return BottomNavigationBar(
      currentIndex: _selectedIndex,
      onTap: (i) => setState(() => _selectedIndex = i),
      selectedItemColor: AppColors.gGreen,
      unselectedItemColor: AppColors.textMute,
      showUnselectedLabels: true,
      type: BottomNavigationBarType.fixed,
      items: const [
        BottomNavigationBarItem(icon: Icon(Icons.home_outlined), label: 'Home'),
        BottomNavigationBarItem(icon: Icon(Icons.smart_toy_outlined), label: 'AI Chat'),
        BottomNavigationBarItem(icon: Icon(Icons.file_copy_outlined), label: 'Reports'),
        BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: 'Profile'),
      ],
    );
  }
}
