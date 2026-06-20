import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});
  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;

  List<Map<String, dynamic>> _all = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 3, vsync: this);
    _fetchNotifications();
  }

  Future<void> _fetchNotifications() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiClient.get(ApiConfig.notifications);
      if (res.ok && res.data != null) {
        final list = res.data!['data'] as List? ?? [];
        if (mounted) {
          setState(() {
            _all = list.map((n) => {
              'id': n['id']?.toString() ?? '',
              'type': n['type'] ?? 'tip',
              'title': n['title'] ?? 'Notification',
              'body': n['body'] ?? n['message'] ?? '',
              'time': n['time'] ?? 'Just now',
              'read': n['read'] ?? false,
            }).toList();
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

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> get _unread => _all.where((n) => !n['read']).toList();
  List<Map<String, dynamic>> get _appointments => _all.where((n) => n['type'] == 'appointment').toList();

  int get _unreadCount => _unread.length;

  void _markAll() => setState(() { for (final n in _all) n['read'] = true; });
  void _markRead(String id) => setState(() { _all.firstWhere((n) => n['id'] == id)['read'] = true; });
  void _delete(String id) => setState(() => _all.removeWhere((n) => n['id'] == id));

  IconData _icon(String type) {
    switch (type) {
      case 'appointment': return Icons.calendar_month_outlined;
      case 'message': return Icons.chat_bubble_outline;
      case 'reminder': return Icons.alarm_outlined;
      case 'emergency': return Icons.emergency_outlined;
      case 'report': return Icons.description_outlined;
      case 'tip': return Icons.spa_outlined;
      default: return Icons.notifications_outlined;
    }
  }

  Color _iconColor(String type) {
    switch (type) {
      case 'appointment': return const Color(0xFF1565C0);
      case 'message': return AppColors.primaryGreen;
      case 'reminder': return const Color(0xFF92400E);
      case 'emergency': return const Color(0xFFC0392B);
      case 'report': return const Color(0xFF6B21A8);
      case 'tip': return const Color(0xFF065F46);
      default: return AppColors.primaryGreen;
    }
  }

  Color _iconBg(String type) {
    switch (type) {
      case 'appointment': return const Color(0xFFE3F2FD);
      case 'message': return const Color(0xFFEAF5EE);
      case 'reminder': return const Color(0xFFFFFBEB);
      case 'emergency': return const Color(0xFFFEE2E2);
      case 'report': return const Color(0xFFF3E8FF);
      case 'tip': return const Color(0xFFECFDF5);
      default: return const Color(0xFFEAF5EE);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7FDF9),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.primaryGreen),
        title: Row(children: [
          const Text('Notifications', style: TextStyle(fontFamily: 'PlayfairDisplay', fontWeight: FontWeight.w700, color: AppColors.primaryGreen, fontSize: 20)),
          const SizedBox(width: 8),
          if (_unreadCount > 0)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(color: AppColors.primaryGreen, borderRadius: BorderRadius.circular(50)),
              child: Text('$_unreadCount new', style: const TextStyle(fontFamily: 'Poppins', fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white)),
            ),
        ]),
        actions: [
          if (_unreadCount > 0)
            TextButton(
              onPressed: _markAll,
              child: const Text('Mark all read', style: TextStyle(fontFamily: 'Poppins', fontSize: 12, color: AppColors.primaryGreen)),
            ),
        ],
        bottom: TabBar(
          controller: _tabCtrl,
          indicatorColor: AppColors.primaryGreen,
          labelColor: AppColors.primaryGreen,
          unselectedLabelColor: AppColors.textMuted,
          labelStyle: const TextStyle(fontFamily: 'Poppins', fontSize: 12, fontWeight: FontWeight.w600),
          unselectedLabelStyle: const TextStyle(fontFamily: 'Poppins', fontSize: 12),
          tabs: [
            Tab(text: 'All (${_all.length})'),
            Tab(text: 'Unread (${_unread.length})'),
            Tab(text: 'Appointments (${_appointments.length})'),
          ],
        ),
      ),
      body: _isLoading 
          ? const Center(child: CircularProgressIndicator(color: AppColors.primaryGreen))
          : TabBarView(
              controller: _tabCtrl,
              children: [
                _buildList(_all),
                _buildList(_unread, emptyMsg: 'No unread notifications 🎉', emptyIcon: '🔔'),
                _buildList(_appointments, emptyMsg: 'No appointment notifications', emptyIcon: '📅'),
              ],
            ),
    );
  }

  Widget _buildList(List<Map<String, dynamic>> items, {String? emptyMsg, String? emptyIcon}) {
    if (items.isEmpty) {
      return Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Text(emptyIcon ?? '🔔', style: const TextStyle(fontSize: 52)),
        const SizedBox(height: 16),
        Text(emptyMsg ?? 'No notifications', style: const TextStyle(fontFamily: 'Poppins', fontSize: 15, color: AppColors.textMuted)),
      ]));
    }

    // Group by date label
    final today = items.where((n) => n['time'].toString().contains('min') || n['time'].toString().contains('hr')).toList();
    final yesterday = items.where((n) => n['time'] == 'Yesterday').toList();
    final older = items.where((n) => n['time'].toString().contains('days') || n['time'].toString().contains('day ago')).toList();

    return ListView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(vertical: 8),
      children: [
        if (today.isNotEmpty) ...[_dateHeader('Today'), ...today.map(_notifCard)],
        if (yesterday.isNotEmpty) ...[_dateHeader('Yesterday'), ...yesterday.map(_notifCard)],
        if (older.isNotEmpty) ...[_dateHeader('Earlier'), ...older.map(_notifCard)],
      ],
    );
  }

  Widget _dateHeader(String label) => Padding(
    padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
    child: Text(label, style: const TextStyle(fontFamily: 'Poppins', fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textMuted)),
  );

  Widget _notifCard(Map<String, dynamic> n) {
    final isUnread = !n['read'];
    return Dismissible(
      key: Key(n['id']),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        color: const Color(0xFFFF4444),
        child: const Icon(Icons.delete_outline, color: Colors.white),
      ),
      onDismissed: (_) => _delete(n['id']),
      child: GestureDetector(
        onTap: () => _markRead(n['id']),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: isUnread ? Colors.white : Colors.white.withValues(alpha: 0.7),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: isUnread ? AppColors.primaryGreen.withValues(alpha: 0.3) : AppColors.inputBorder.withValues(alpha: 0.5)),
            boxShadow: isUnread ? [BoxShadow(color: AppColors.primaryGreen.withValues(alpha: 0.06), blurRadius: 8, offset: const Offset(0, 2))] : [],
          ),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: _iconBg(n['type']), borderRadius: BorderRadius.circular(12)),
              child: Icon(_icon(n['type']), color: _iconColor(n['type']), size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Expanded(child: Text(n['title'], style: TextStyle(fontFamily: 'Poppins', fontSize: 13, fontWeight: isUnread ? FontWeight.bold : FontWeight.w600, color: AppColors.textDark))),
                Text(n['time'], style: TextStyle(fontFamily: 'Poppins', fontSize: 10, color: isUnread ? AppColors.primaryGreen : AppColors.textMuted, fontWeight: isUnread ? FontWeight.w600 : FontWeight.normal)),
              ]),
              const SizedBox(height: 4),
              Text(n['body'], style: TextStyle(fontFamily: 'Poppins', fontSize: 12, color: isUnread ? const Color(0xFF4A4A4A) : AppColors.textMuted, height: 1.5)),
            ])),
            if (isUnread) ...[
              const SizedBox(width: 8),
              Container(width: 8, height: 8, margin: const EdgeInsets.only(top: 4), decoration: const BoxDecoration(color: AppColors.primaryGreen, shape: BoxShape.circle)),
            ],
          ]),
        ),
      ),
    );
  }
}
