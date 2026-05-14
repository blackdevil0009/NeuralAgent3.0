import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';

// ─────────────────────────────────────────────
//  SCREEN 1 — Doctor List (Patient's View)
// ─────────────────────────────────────────────
class InboxScreen extends StatefulWidget {
  const InboxScreen({super.key});
  @override
  State<InboxScreen> createState() => _InboxScreenState();
}

class _InboxScreenState extends State<InboxScreen> {
  final TextEditingController _searchCtrl = TextEditingController();
  String _searchQuery = '';
  bool _loading = true;
  List<Map<String, dynamic>> _convos = [];

  // Fallback mock data
  final List<Map<String, dynamic>> _mock = [
    {'id': 'd1', 'name': 'Dr. Ananya Sharma', 'avatar': '👩‍⚕️', 'spec': 'Ayurveda Specialist', 'lastMsg': 'Please share your latest diet details.', 'time': '10:15 AM', 'online': true, 'unread': 2, 'type': 'Chat Consultation'},
    {'id': 'd2', 'name': 'Dr. Rajesh Kumar', 'avatar': '👨‍⚕️', 'spec': 'Cardiologist', 'lastMsg': 'Your ECG looks normal. Continue the medication.', 'time': 'Yesterday', 'online': false, 'unread': 0, 'type': 'In-Clinic'},
    {'id': 'd3', 'name': 'Dr. Kavita Nair', 'avatar': '👩‍⚕️', 'spec': 'Ayurvedic Consultant', 'lastMsg': 'Take Triphala after dinner.', 'time': 'Mon', 'online': true, 'unread': 1, 'type': 'Chat Consultation'},
  ];

  @override
  void initState() {
    super.initState();
    _fetchConversations();
  }

  Future<void> _fetchConversations() async {
    setState(() => _loading = true);
    try {
      // Patient fetches their own appointments to find their doctors
      final res = await ApiClient.get(ApiConfig.appointments);
      if (res.ok && res.data != null) {
        final appts = (res.data!['data']?['appointments'] ?? res.data!['appointments'] ?? []) as List<dynamic>;
        final seen = <String>{};
        final convos = <Map<String, dynamic>>[];
        for (final a in appts) {
          final dId = a['doctorId']?.toString() ?? a['userId']?.toString() ?? '';
          if (dId.isEmpty || seen.contains(dId)) continue;
          seen.add(dId);
          convos.add({
            'id': dId,
            'name': 'Dr. ${a['doctorName'] ?? a['name'] ?? 'Doctor'}',
            'avatar': '👨‍⚕️',
            'spec': a['specialization'] ?? a['type'] ?? 'Specialist',
            'lastMsg': '${a['type'] ?? 'Appointment'} — ${a['appointmentDate'] ?? ''}',
            'time': a['appointmentTime']?.toString().substring(0, 5) ?? '',
            'online': a['status'] == 'Confirmed',
            'unread': 0,
            'type': a['type'] ?? 'Consultation',
          });
        }
        setState(() { _convos = convos.isNotEmpty ? convos : _mock; _loading = false; });
      } else {
        setState(() { _convos = _mock; _loading = false; });
      }
    } catch (_) {
      setState(() { _convos = _mock; _loading = false; });
    }
  }

  List<Map<String, dynamic>> get _filtered => _searchQuery.isEmpty
      ? _convos
      : _convos.where((c) => c['name'].toString().toLowerCase().contains(_searchQuery.toLowerCase())).toList();

  @override
  Widget build(BuildContext context) {
    final totalUnread = _convos.fold<int>(0, (s, c) => s + ((c['unread'] as int?) ?? 0));
    return Scaffold(
      backgroundColor: const Color(0xFFF7FDF9),
      appBar: AppBar(
        backgroundColor: AppColors.primaryGreen,
        elevation: 0,
        leading: const BackButton(color: Colors.white),
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('My Doctors', style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.w700, color: Colors.white, fontSize: 17)),
          if (totalUnread > 0)
            Text('$totalUnread unread', style: TextStyle(fontFamily: 'Poppins', fontSize: 11, color: Colors.white.withValues(alpha: 0.8))),
        ]),
        actions: [
          IconButton(icon: const Icon(Icons.refresh, color: Colors.white), onPressed: _fetchConversations),
          IconButton(icon: const Icon(Icons.more_vert, color: Colors.white), onPressed: () {}),
        ],
      ),
      body: Column(children: [
        // Search bar (styled like doctor inbox)
        Container(
          color: AppColors.primaryGreen,
          padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
            decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(24)),
            child: Row(children: [
              const Icon(Icons.search, color: Colors.white70, size: 18),
              const SizedBox(width: 10),
              Expanded(child: TextField(
                controller: _searchCtrl,
                onChanged: (v) => setState(() => _searchQuery = v),
                style: const TextStyle(fontFamily: 'Poppins', fontSize: 13, color: Colors.white),
                decoration: const InputDecoration(hintText: 'Search doctors...', hintStyle: TextStyle(fontFamily: 'Poppins', fontSize: 13, color: Colors.white54), border: InputBorder.none, isDense: true, contentPadding: EdgeInsets.zero),
              )),
            ]),
          ),
        ),

        // List
        Expanded(child: _loading
            ? const Center(child: CircularProgressIndicator(color: AppColors.primaryGreen))
            : _filtered.isEmpty
                ? Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    const Text('🩺', style: TextStyle(fontSize: 52)),
                    const SizedBox(height: 12),
                    const Text('No doctor conversations yet', style: TextStyle(fontFamily: 'Poppins', color: AppColors.textMuted)),
                    const SizedBox(height: 8),
                    const Text('Book an appointment to start messaging', style: TextStyle(fontFamily: 'Poppins', fontSize: 12, color: AppColors.textMuted)),
                    const SizedBox(height: 16),
                    OutlinedButton(onPressed: _fetchConversations, child: const Text('Refresh', style: TextStyle(fontFamily: 'Poppins', color: AppColors.primaryGreen))),
                  ]))
                : RefreshIndicator(
                    color: AppColors.primaryGreen,
                    onRefresh: _fetchConversations,
                    child: ListView.separated(
                      physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                      itemCount: _filtered.length,
                      separatorBuilder: (_, __) => const Divider(height: 1, indent: 78, color: Color(0xFFEDF4EF)),
                      itemBuilder: (ctx, i) {
                        final c = _filtered[i];
                        final hasUnread = ((c['unread'] as int?) ?? 0) > 0;
                        return InkWell(
                          onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => _PatientChatScreen(convo: c))),
                          child: Container(
                            color: hasUnread ? AppColors.primaryGreen.withValues(alpha: 0.03) : Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            child: Row(children: [
                              // Doctor avatar
                              Stack(children: [
                                Container(
                                  width: 54, height: 54,
                                  decoration: BoxDecoration(
                                    gradient: const LinearGradient(colors: [Color(0xFF2D6A4F), Color(0xFF52B788)], begin: Alignment.topLeft, end: Alignment.bottomRight),
                                    shape: BoxShape.circle,
                                    border: Border.all(color: AppColors.primaryGreen.withValues(alpha: 0.3), width: 1.5),
                                  ),
                                  alignment: Alignment.center,
                                  child: Text(c['avatar'], style: const TextStyle(fontSize: 26)),
                                ),
                                if (c['online'] == true)
                                  Positioned(right: 1, bottom: 1, child: Container(width: 13, height: 13, decoration: BoxDecoration(color: const Color(0xFF4CAF50), shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 2)))),
                              ]),
                              const SizedBox(width: 14),
                              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                                  Text(c['name'], style: TextStyle(fontFamily: 'Poppins', fontWeight: hasUnread ? FontWeight.bold : FontWeight.w600, fontSize: 15, color: AppColors.textDark)),
                                  Text(c['time'], style: TextStyle(fontFamily: 'Poppins', fontSize: 11, color: hasUnread ? AppColors.primaryGreen : AppColors.textMuted, fontWeight: hasUnread ? FontWeight.bold : FontWeight.normal)),
                                ]),
                                const SizedBox(height: 2),
                                // Specialization badge
                                Text(c['spec'], style: const TextStyle(fontFamily: 'Poppins', fontSize: 11, color: AppColors.primaryGreen, fontWeight: FontWeight.w500)),
                                const SizedBox(height: 2),
                                Row(children: [
                                  Expanded(child: Text(c['lastMsg'], maxLines: 1, overflow: TextOverflow.ellipsis,
                                    style: TextStyle(fontFamily: 'Poppins', fontSize: 12, color: hasUnread ? AppColors.textDark : AppColors.textMuted, fontWeight: hasUnread ? FontWeight.w500 : FontWeight.normal))),
                                  if (hasUnread) Container(margin: const EdgeInsets.only(left: 8), width: 20, height: 20, decoration: BoxDecoration(color: AppColors.primaryGreen, shape: BoxShape.circle), alignment: Alignment.center, child: Text('${c['unread']}', style: const TextStyle(fontFamily: 'Poppins', fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white))),
                                ]),
                              ])),
                            ]),
                          ),
                        );
                      },
                    ),
                  )),
      ]),
    );
  }
}

// ─────────────────────────────────────────────
//  SCREEN 2 — Patient Chat with Doctor
// ─────────────────────────────────────────────
class _PatientChatScreen extends StatefulWidget {
  final Map<String, dynamic> convo;
  const _PatientChatScreen({required this.convo});
  @override
  State<_PatientChatScreen> createState() => _PatientChatScreenState();
}

class _PatientChatScreenState extends State<_PatientChatScreen> {
  final TextEditingController _inputCtrl = TextEditingController();
  final ScrollController _scrollCtrl = ScrollController();
  List<Map<String, dynamic>> _msgs = [];
  bool _loading = true;
  bool _sending = false;
  String? _myId;

  // Quick reply chips for patients
  final List<String> _quickReplies = [
    '📋 Share report',
    '📅 Book appointment',
    '❓ Ask a question',
    '💊 Prescription query',
    '🌡️ Fever update',
    '✅ Feeling better',
  ];

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    final token = await AuthService.getToken();
    if (token != null) _myId = AuthService.extractUserId(token);
    await _fetchHistory();
  }

  Future<void> _fetchHistory() async {
    setState(() => _loading = true);
    try {
      final peerId = widget.convo['id'].toString();
      final res = await ApiClient.get(ApiConfig.messageHistory(peerId));
      if (res.ok && res.data != null) {
        final rawMsgs = (res.data!['data']?['messages'] ?? res.data!['messages'] ?? []) as List<dynamic>;
        setState(() {
          _msgs = rawMsgs.map((m) => {
            'id': m['id']?.toString() ?? '',
            'sender': m['sender_id']?.toString() == _myId ? 'me' : 'them',
            'text': m['content']?.toString() ?? m['text']?.toString() ?? '',
            'time': _formatTime(m['timestamp']?.toString() ?? m['created_at']?.toString() ?? ''),
            'read': m['is_read'] == true || m['read'] == true,
          }).toList();
          _loading = false;
        });
      } else {
        // Mock fallback
        setState(() {
          _msgs = [
            {'sender': 'them', 'text': 'Hello! How are you feeling today?', 'time': '9:50 AM', 'read': true},
            {'sender': 'me', 'text': 'Doctor, I have had a cough for 3 days.', 'time': '9:52 AM', 'read': true},
            {'sender': 'them', 'text': 'Please avoid cold foods and drink warm water with honey and ginger. I\'ll prescribe Sitopaladi Churna.', 'time': '9:55 AM', 'read': true},
            {'sender': 'me', 'text': 'Should I take steam inhalation too?', 'time': '10:02 AM', 'read': true},
          ];
          _loading = false;
        });
      }
    } catch (_) {
      setState(() => _loading = false);
    }
    WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());
  }

  String _formatTime(String raw) {
    if (raw.isEmpty) return '';
    try {
      final dt = DateTime.parse(raw).toLocal();
      final h = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
      final m = dt.minute.toString().padLeft(2, '0');
      return '$h:$m ${dt.hour >= 12 ? 'PM' : 'AM'}';
    } catch (_) {
      return raw;
    }
  }

  void _scrollToBottom() {
    if (_scrollCtrl.hasClients) {
      _scrollCtrl.animateTo(_scrollCtrl.position.maxScrollExtent, duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
    }
  }

  Future<void> _send({String? quickText}) async {
    final text = (quickText ?? _inputCtrl.text).trim();
    if (text.isEmpty || _sending) return;
    _inputCtrl.clear();

    final optimistic = {'id': 'tmp-${DateTime.now().millisecondsSinceEpoch}', 'sender': 'me', 'text': text, 'time': TimeOfDay.now().format(context), 'read': false, 'sending': true};
    setState(() { _msgs.add(optimistic); _sending = true; });
    Future.delayed(const Duration(milliseconds: 80), _scrollToBottom);

    try {
      final res = await ApiClient.post(ApiConfig.sendMessage, {
        'receiverId': widget.convo['id'].toString(),
        'content': text,
      });
      setState(() {
        _msgs.removeLast();
        _msgs.add({'id': res.data?['data']?['id']?.toString() ?? optimistic['id']!, 'sender': 'me', 'text': text, 'time': optimistic['time']!, 'read': false});
        _sending = false;
      });
    } catch (_) {
      setState(() { _msgs.last['sending'] = false; _msgs.last['failed'] = true; _sending = false; });
    }
    Future.delayed(const Duration(milliseconds: 80), _scrollToBottom);
  }

  @override
  void dispose() {
    _inputCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.convo;
    return Scaffold(
      backgroundColor: const Color(0xFFF0F4F1),
      appBar: AppBar(
        backgroundColor: AppColors.primaryGreen,
        elevation: 0,
        leadingWidth: 40,
        leading: const BackButton(color: Colors.white),
        titleSpacing: 0,
        title: Row(children: [
          Container(
            width: 38, height: 38,
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFF2D6A4F), Color(0xFF52B788)], begin: Alignment.topLeft, end: Alignment.bottomRight),
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: Text(c['avatar'], style: const TextStyle(fontSize: 20)),
          ),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(c['name'], style: const TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold, fontSize: 15, color: Colors.white)),
            Row(children: [
              Container(width: 7, height: 7, decoration: BoxDecoration(color: c['online'] == true ? const Color(0xFF80ED99) : Colors.white38, shape: BoxShape.circle)),
              const SizedBox(width: 4),
              Text(
                '${c['online'] == true ? 'Online' : 'Offline'} • ${c['spec']}',
                style: TextStyle(fontFamily: 'Poppins', fontSize: 10, color: Colors.white.withValues(alpha: 0.85)),
                overflow: TextOverflow.ellipsis,
              ),
            ]),
          ])),
        ]),
        actions: [
          IconButton(icon: const Icon(Icons.videocam_outlined, color: Colors.white, size: 22), onPressed: () {}),
          IconButton(icon: const Icon(Icons.call_outlined, color: Colors.white, size: 22), onPressed: () {}),
          IconButton(icon: const Icon(Icons.more_vert, color: Colors.white, size: 22), onPressed: () {}),
        ],
      ),
      body: Column(children: [
        // Messages
        Expanded(child: _loading
            ? const Center(child: CircularProgressIndicator(color: AppColors.primaryGreen))
            : RefreshIndicator(
                color: AppColors.primaryGreen,
                onRefresh: _fetchHistory,
                child: ListView.builder(
                  controller: _scrollCtrl,
                  physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                  itemCount: _msgs.length + 1,
                  itemBuilder: (ctx, i) {
                    if (i == 0) {
                      return Center(
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 16),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
                          decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.85), borderRadius: BorderRadius.circular(50)),
                          child: Text('${c['type']} — Pull to refresh', style: const TextStyle(fontFamily: 'Poppins', fontSize: 11, color: AppColors.textMuted)),
                        ),
                      );
                    }
                    final msg = _msgs[i - 1];
                    final isMe = msg['sender'] == 'me';
                    final isFailed = msg['failed'] == true;
                    final isSending = msg['sending'] == true;
                    return Padding(
                      padding: EdgeInsets.only(bottom: 6, left: isMe ? 50 : 0, right: isMe ? 0 : 50),
                      child: Align(
                        alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                        child: Container(
                          constraints: BoxConstraints(maxWidth: MediaQuery.of(ctx).size.width * 0.75),
                          decoration: BoxDecoration(
                            color: isFailed ? const Color(0xFFFFEBEE) : isMe ? AppColors.primaryGreen : Colors.white,
                            borderRadius: BorderRadius.only(
                              topLeft: const Radius.circular(16), topRight: const Radius.circular(16),
                              bottomLeft: Radius.circular(isMe ? 16 : 2),
                              bottomRight: Radius.circular(isMe ? 2 : 16),
                            ),
                            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 4, offset: const Offset(0, 2))],
                          ),
                          padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 9),
                          child: Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                            // Doctor label on received msgs
                            if (!isMe)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 3),
                                child: Text(c['name'], style: const TextStyle(fontFamily: 'Poppins', fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.primaryGreen)),
                              ),
                            Text(msg['text'], style: TextStyle(fontFamily: 'Poppins', fontSize: 14, color: isFailed ? Colors.red : isMe ? Colors.white : AppColors.textDark, height: 1.45)),
                            const SizedBox(height: 3),
                            Row(mainAxisSize: MainAxisSize.min, children: [
                              if (isFailed) const Text('Failed • tap to retry', style: TextStyle(fontFamily: 'Poppins', fontSize: 9, color: Colors.red))
                              else Text(msg['time'], style: TextStyle(fontFamily: 'Poppins', fontSize: 10, color: isMe ? Colors.white54 : AppColors.textMuted)),
                              if (isMe && !isFailed) ...[
                                const SizedBox(width: 4),
                                isSending
                                    ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 1.5, color: Colors.white54))
                                    : Icon(msg['read'] == true ? Icons.done_all_rounded : Icons.done_rounded, size: 14, color: msg['read'] == true ? AppColors.accentGold : Colors.white38),
                              ],
                            ]),
                          ]),
                        ),
                      ),
                    );
                  },
                ),
              )),

        // Quick reply chips (patient-specific)
        Container(
          height: 38,
          color: Colors.white,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            itemCount: _quickReplies.length,
            itemBuilder: (ctx, i) => Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ActionChip(
                label: Text(_quickReplies[i], style: const TextStyle(fontFamily: 'Poppins', fontSize: 11, color: AppColors.primaryGreen)),
                backgroundColor: const Color(0xFFEAF5EE),
                side: BorderSide.none,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(50)),
                onPressed: () => _send(quickText: _quickReplies[i].replaceFirst(RegExp(r'^.+? '), '')),
                padding: const EdgeInsets.symmetric(horizontal: 4),
                visualDensity: VisualDensity.compact,
              ),
            ),
          ),
        ),

        // Input bar
        Container(
          padding: EdgeInsets.fromLTRB(10, 8, 10, MediaQuery.of(context).padding.bottom + 10),
          decoration: const BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: Color(0xFFE4EDE6)))),
          child: Row(children: [
            Expanded(
              child: Container(
                decoration: BoxDecoration(color: const Color(0xFFF4FAF6), borderRadius: BorderRadius.circular(28), border: Border.all(color: const Color(0xFFD0E8D8))),
                child: Row(children: [
                  const SizedBox(width: 6),
                  IconButton(icon: const Icon(Icons.emoji_emotions_outlined, color: AppColors.textMuted, size: 22), onPressed: () {}, constraints: const BoxConstraints(), padding: const EdgeInsets.all(8)),
                  Expanded(child: TextField(
                    controller: _inputCtrl,
                    onSubmitted: (_) => _send(),
                    maxLines: null,
                    keyboardType: TextInputType.multiline,
                    textInputAction: TextInputAction.newline,
                    style: const TextStyle(fontFamily: 'Poppins', fontSize: 14, color: AppColors.textDark),
                    decoration: InputDecoration(
                      hintText: 'Message ${c['name']}...',
                      hintStyle: const TextStyle(fontFamily: 'Poppins', fontSize: 13, color: AppColors.textMuted),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                  )),
                  IconButton(icon: const Icon(Icons.attach_file_rounded, color: AppColors.textMuted, size: 22), onPressed: () {}, constraints: const BoxConstraints(), padding: const EdgeInsets.all(8)),
                ]),
              ),
            ),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: _send,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                width: 48, height: 48,
                decoration: BoxDecoration(gradient: _sending ? null : AppColors.backgroundGradient, color: _sending ? Colors.grey.shade300 : null, shape: BoxShape.circle),
                child: Icon(Icons.send_rounded, color: _sending ? Colors.grey : Colors.white, size: 22),
              ),
            ),
          ]),
        ),
      ]),
    );
  }
}
