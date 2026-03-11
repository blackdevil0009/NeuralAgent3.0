import '../widgets/primary_button.dart';
import 'login_page.dart';
import '../services/api_client.dart';

class DoctorDashboard extends StatefulWidget {
  const DoctorDashboard({super.key});

  @override
  State<DoctorDashboard> createState() => _DoctorDashboardState();
}

class _DoctorDashboardState extends State<DoctorDashboard> {
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
        onPressed: () {},
        backgroundColor: AppColors.gold,
        child: const Icon(Icons.add, color: AppColors.gDark),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      backgroundColor: AppColors.gDark,
      title: Row(
        children: [
          const Icon(Icons.medical_services_outlined, color: AppColors.gold, size: 24),
          const SizedBox(width: 8),
          Text(
            'Doctor Portal',
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
          icon: const Icon(Icons.search, color: AppColors.gPale),
        ),
        const CircleAvatar(
          radius: 16,
          backgroundColor: AppColors.gold,
          child: Text('RK', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.gDark)),
        ),
        const SizedBox(width: 16),
      ],
    );
  }

  Widget _buildDrawer() {
    return Drawer(
      child: Column(
        children: [
          UserAccountsDrawerHeader(
            decoration: const BoxDecoration(color: AppColors.gDark),
            currentAccountPicture: const CircleAvatar(
              backgroundColor: AppColors.gold,
              child: Text('RK', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.gDark)),
            ),
            accountName: Text('Dr. Rajesh Kumar', style: GoogleFonts.poppins(fontWeight: FontWeight.bold)),
            accountEmail: Text('rajesh.kumar@vaidyamed.com', style: GoogleFonts.poppins(fontSize: 12)),
          ),
          _buildDrawerItem(Icons.people_outline, 'Patient Management'),
          _buildDrawerItem(Icons.calendar_today_outlined, 'My Schedule'),
          _buildDrawerItem(Icons.mail_outline, 'Inbox'),
          _buildDrawerItem(Icons.smart_toy_outlined, 'AI Assistant'),
          _buildDrawerItem(Icons.emergency_outlined, 'Emergency Dashboard'),
          const Spacer(),
          const Divider(),
          _buildDrawerItem(Icons.settings_outlined, 'Settings'),
          _buildDrawerItem(Icons.logout, 'Logout', isLogout: true, onTap: () {
            apiClient.setToken('');
            Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const LoginPage()));
          }),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildDrawerItem(IconData icon, String title, {bool isLogout = false}) {
    return ListTile(
      leading: Icon(icon, color: isLogout ? Colors.redAccent : AppColors.gGreen),
      title: Text(
        title,
        style: GoogleFonts.poppins(color: isLogout ? Colors.redAccent : AppColors.textDark, fontSize: 14),
      ),
      onTap: () {},
    );
  }

  Widget _buildBody() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildOverviewCards(),
          const SizedBox(height: 30),
          _buildSectionHeader('Recent Patients', 'View All'),
          const SizedBox(height: 16),
          _buildPatientList(),
          const SizedBox(height: 30),
          _buildSectionHeader('Today\'s Appointments', 'Schedule'),
          const SizedBox(height: 16),
          _buildAppointmentList(),
        ],
      ),
    );
  }

  Widget _buildOverviewCards() {
    return Row(
      children: [
        Expanded(child: _buildStatCard('Total Patients', '128', Icons.people, AppColors.gGreen)),
        const SizedBox(width: 16),
        Expanded(child: _buildStatCard('Appointments', '12', Icons.event, AppColors.gold)),
      ],
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 28),
          const SizedBox(height: 12),
          Text(value, style: GoogleFonts.poppins(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.textDark)),
          Text(title, style: GoogleFonts.poppins(fontSize: 12, color: AppColors.textMute)),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, String action) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title, style: GoogleFonts.playfairDisplay(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.gDark)),
        Text(action, style: GoogleFonts.poppins(color: AppColors.gGreen, fontWeight: FontWeight.w600, fontSize: 13)),
      ],
    );
  }

  Widget _buildPatientList() {
    return Column(
      children: [
        _buildPatientItem('Amit Sharma', 'Vata Imbalance', 'Stable'),
        _buildPatientItem('Priya Patel', 'Pitta/Kapha', 'Recovering'),
        _buildPatientItem('Rahul Singh', 'Chronic Fatigue', 'New'),
      ],
    );
  }

  Widget _buildPatientItem(String name, String condition, String status) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.offWhite,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.gPale.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          CircleAvatar(backgroundColor: AppColors.gPale, child: Text(name[0])),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: GoogleFonts.poppins(fontWeight: FontWeight.bold, color: AppColors.textDark)),
                Text(condition, style: GoogleFonts.poppins(fontSize: 12, color: AppColors.textMute)),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: status == 'Stable' ? Colors.green.withOpacity(0.1) : AppColors.gold.withOpacity(0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              status,
              style: GoogleFonts.poppins(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: status == 'Stable' ? Colors.green : AppColors.gold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAppointmentList() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.gDark,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        children: [
          _buildApptRow('10:30 AM', 'Suresh Raina', 'Follow-up'),
          const Divider(color: Colors.white10),
          _buildApptRow('11:45 AM', 'Meena Gupta', 'New Consultation'),
        ],
      ),
    );
  }

  Widget _buildApptRow(String time, String patient, String type) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        children: [
          Text(time, style: GoogleFonts.poppins(color: AppColors.amber, fontWeight: FontWeight.bold, fontSize: 13)),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(patient, style: GoogleFonts.poppins(color: AppColors.white, fontWeight: FontWeight.w600)),
                Text(type, style: GoogleFonts.poppins(color: AppColors.white.withOpacity(0.5), fontSize: 11)),
              ],
            ),
          ),
          const Icon(Icons.chevron_right, color: Colors.white24),
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
      type: BottomNavigationBarType.fixed,
      items: const [
        BottomNavigationBarItem(icon: Icon(Icons.people_alt_outlined), label: 'Patients'),
        BottomNavigationBarItem(icon: Icon(Icons.calendar_month_outlined), label: 'Schedule'),
        BottomNavigationBarItem(icon: Icon(Icons.chat_outlined), label: 'Messages'),
        BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: 'Profile'),
      ],
    );
  }
}
