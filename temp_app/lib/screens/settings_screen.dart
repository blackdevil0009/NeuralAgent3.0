import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../widgets/vx_text_field.dart';
import '../widgets/vx_widgets.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _twoFactorEnabled = true;
  bool _emailNotifications = true;
  bool _smsNotifications = false;

  final TextEditingController _currentPassCtrl = TextEditingController();
  final TextEditingController _newPassCtrl = TextEditingController();
  final TextEditingController _confirmPassCtrl = TextEditingController();

  void _changePassword() async {
    if (_newPassCtrl.text != _confirmPassCtrl.text) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Passwords do not match'), backgroundColor: AppColors.errorRed));
      return;
    }
    
    // Mock save
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Changing password...'), backgroundColor: AppColors.primaryGreen));
    await Future.delayed(const Duration(seconds: 1));
    if (!mounted) return;
    
    _currentPassCtrl.clear();
    _newPassCtrl.clear();
    _confirmPassCtrl.clear();
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Password changed successfully!'), backgroundColor: AppColors.primaryGreen));
  }

  @override
  void dispose() {
    _currentPassCtrl.dispose();
    _newPassCtrl.dispose();
    _confirmPassCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7FDF9),
      appBar: AppBar(
        title: const Text('Settings', style: TextStyle(fontFamily: 'PlayfairDisplay', fontWeight: FontWeight.w700, color: AppColors.primaryGreen)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.primaryGreen),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        physics: const BouncingScrollPhysics(),
        children: [
          _buildSectionTitle('Security & Authentication'),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.inputBorder.withValues(alpha: 0.5))),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Two-Factor Authentication (2FA)', style: TextStyle(fontFamily: 'Poppins', fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textDark)),
                  subtitle: const Text('Require OTP for every login', style: TextStyle(fontFamily: 'Poppins', fontSize: 11, color: AppColors.textMuted)),
                  value: _twoFactorEnabled,
                  activeThumbColor: AppColors.primaryGreen,
                  onChanged: (v) => setState(() => _twoFactorEnabled = v),
                ),
                const Divider(),
                const SizedBox(height: 8),
                const Text('Change Password', style: TextStyle(fontFamily: 'Poppins', fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textDark)),
                const SizedBox(height: 12),
                VxTextField(label: 'Current Password', hint: '••••••••', icon: Icons.lock_outline, isPassword: true, controller: _currentPassCtrl),
                const SizedBox(height: 12),
                VxTextField(label: 'New Password', hint: '••••••••', icon: Icons.lock_outline, isPassword: true, controller: _newPassCtrl),
                const SizedBox(height: 12),
                VxTextField(label: 'Confirm New Password', hint: '••••••••', icon: Icons.lock_outline, isPassword: true, controller: _confirmPassCtrl),
                const SizedBox(height: 16),
                VxButton(label: 'Update Password', onPressed: _changePassword),
              ],
            ),
          ),
          const SizedBox(height: 24),
          _buildSectionTitle('Notifications'),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.inputBorder.withValues(alpha: 0.5))),
            child: Column(
              children: [
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Email Notifications', style: TextStyle(fontFamily: 'Poppins', fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textDark)),
                  subtitle: const Text('Receive appointments and health tips via email', style: TextStyle(fontFamily: 'Poppins', fontSize: 11, color: AppColors.textMuted)),
                  value: _emailNotifications,
                  activeThumbColor: AppColors.primaryGreen,
                  onChanged: (v) => setState(() => _emailNotifications = v),
                ),
                const Divider(),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('SMS Notifications', style: TextStyle(fontFamily: 'Poppins', fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textDark)),
                  subtitle: const Text('Receive important alerts on your phone', style: TextStyle(fontFamily: 'Poppins', fontSize: 11, color: AppColors.textMuted)),
                  value: _smsNotifications,
                  activeThumbColor: AppColors.primaryGreen,
                  onChanged: (v) => setState(() => _smsNotifications = v),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          _buildSectionTitle('Preferences'),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.inputBorder.withValues(alpha: 0.5))),
            child: Column(
              children: [
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.language_outlined, color: AppColors.primaryGreen),
                  title: const Text('Language', style: TextStyle(fontFamily: 'Poppins', fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textDark)),
                  trailing: const Text('English', style: TextStyle(fontFamily: 'Poppins', fontSize: 13, color: AppColors.textMuted)),
                  onTap: () {},
                ),
                const Divider(),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.dark_mode_outlined, color: AppColors.primaryGreen),
                  title: const Text('Theme', style: TextStyle(fontFamily: 'Poppins', fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textDark)),
                  trailing: const Text('Light Mode', style: TextStyle(fontFamily: 'Poppins', fontSize: 13, color: AppColors.textMuted)),
                  onTap: () {},
                ),
              ],
            ),
          ),
          const SizedBox(height: 30),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(fontFamily: 'Poppins', fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textDark),
    );
  }
}
