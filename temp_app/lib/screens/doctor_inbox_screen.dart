import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';

// ─────────────────────────────────────────────
//  SCREEN 1 — Conversation List
// ─────────────────────────────────────────────
class DoctorInboxScreen extends StatefulWidget {
  const DoctorInboxScreen({super.key});
  @override
  State<DoctorInboxScreen> createState() => _DoctorInboxScreenState();
}

class _DoctorInboxScreenState extends State<DoctorInboxScreen> {
  final TextEditingController _searchCtrl = TextEditingController();
  String _searchQuery = '';
  bool _loading = true;
  String? _error;

  List<Map<String, dynamic>> _convos = [];

  // No fallback mock data


  @override
  void initState() {
    super.initState();
    _fetchConversations();
  }

  Future<void> _fetchConversations() async {
    setState(() { _loading = true; _error = null; });
    try {
      // Fetch appointments to build conversation list (same as web app)
      final res = await ApiClient.get('${ApiConfig.appointments}?role=doctor');
      if (res.ok && res.data != null) {
        final appts = (res.data!['data']?['appointments'] ?? res.data!['appointments'] ?? []) as List<dynamic>;
        final map = <String, Map<String, dynamic>>{};
        for (final a in appts) {
          final pId = a['userId']?.toString() ?? a['patientId']?.toString() ?? '';
          if (pId.isEmpty) continue;
          if (!map.containsKey(pId) || DateTime.tryParse(a['appointmentDate'] ?? '')?.isAfter(DateTime.tryParse(map[pId]!['time'] ?? '') ?? DateTime(2000)) == true) {
            map[pId] = {
              'id': pId,
              'name': a['patientName'] ?? 'Patient',
              'avatar': '👤',
              'lastMsg': '${a['type'] ?? 'Appointment'} — ${a['appointmentDate'] ?? ''}',
              'time': a['appointmentTime']?.toString().substring(0, 5) ?? '',
              'online': a['status'] == 'Confirmed',
              'unread': 0,
              'dosha': 'Not assessed',
              'type': a['type'] ?? 'Appointment',
            };
          }
        }
        setState(() { _convos = map.values.toList(); _loading = false; });
      } else {
        setState(() { _convos = []; _loading = false; });
      }
    } catch (_) {
      setState(() { _convos = []; _loading = false; });
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
          const Text('Patient Messages', style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.w700, color: Colors.white, fontSize: 17)),
          if (totalUnread > 0) Text('$totalUnread unread', style: TextStyle(fontFamily: 'Poppins', fontSize: 11, color: Colors.white.withValues(alpha: 0.8))),
        ]),
        actions: [
          IconButton(icon: const Icon(Icons.refresh, color: Colors.white), onPressed: _fetchConversations),
          IconButton(icon: const Icon(Icons.more_vert, color: Colors.white), onPressed: () {}),
        ],
      ),
      body: Column(children: [
        // Search bar
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
                decoration: const InputDecoration(hintText: 'Search patients...', hintStyle: TextStyle(fontFamily: 'Poppins', fontSize: 13, color: Colors.white54), border: InputBorder.none, isDense: true, contentPadding: EdgeInsets.zero),
              )),
            ]),
          ),
        ),

        // Body
        Expanded(child: _loading
            ? const Center(child: CircularProgressIndicator(color: AppColors.primaryGreen))
            : _filtered.isEmpty
                ? Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    const Text('💬', style: TextStyle(fontSize: 48)),
                    const SizedBox(height: 12),
                    const Text('No patient conversations', style: TextStyle(fontFamily: 'Poppins', color: AppColors.textMuted)),
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
                          onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => DoctorChatScreen(convo: c))),
                          child: Container(
                            color: hasUnread ? AppColors.primaryGreen.withValues(alpha: 0.03) : Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            child: Row(children: [
                              Stack(children: [
                                Container(width: 54, height: 54, decoration: BoxDecoration(color: const Color(0xFFEAF5EE), shape: BoxShape.circle, border: Border.all(color: AppColors.primaryGreen.withValues(alpha: 0.2), width: 1.5)), alignment: Alignment.center, child: Text(c['avatar'], style: const TextStyle(fontSize: 26))),
                                if (c['online'] == true) Positioned(right: 1, bottom: 1, child: Container(width: 13, height: 13, decoration: BoxDecoration(color: const Color(0xFF4CAF50), shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 2)))),
                              ]),
                              const SizedBox(width: 14),
                              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                                  Text(c['name'], style: TextStyle(fontFamily: 'Poppins', fontWeight: hasUnread ? FontWeight.bold : FontWeight.w600, fontSize: 15, color: AppColors.textDark)),
                                  Text(c['time'], style: TextStyle(fontFamily: 'Poppins', fontSize: 11, color: hasUnread ? AppColors.primaryGreen : AppColors.textMuted, fontWeight: hasUnread ? FontWeight.bold : FontWeight.normal)),
                                ]),
                                const SizedBox(height: 3),
                                Row(children: [
                                  Container(margin: const EdgeInsets.only(right: 6), padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1), decoration: BoxDecoration(color: AppColors.accentGold.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(50)), child: Text(c['dosha'], style: TextStyle(fontFamily: 'Poppins', fontSize: 9, fontWeight: FontWeight.bold, color: AppColors.accentGold))),
                                  Expanded(child: Text(c['lastMsg'], maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontFamily: 'Poppins', fontSize: 12, color: hasUnread ? AppColors.textDark : AppColors.textMuted, fontWeight: hasUnread ? FontWeight.w500 : FontWeight.normal))),
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
      floatingActionButton: FloatingActionButton(onPressed: () {}, backgroundColor: AppColors.primaryGreen, child: const Icon(Icons.message_outlined, color: Colors.white)),
    );
  }
}

// ─────────────────────────────────────────────
//  SCREEN 2 — Full Chat Screen (with real API)
// ─────────────────────────────────────────────
class DoctorChatScreen extends StatefulWidget {
  final Map<String, dynamic> convo;
  const DoctorChatScreen({required this.convo, super.key});
  @override
  State<DoctorChatScreen> createState() => _DoctorChatScreenState();
}

class _DoctorChatScreenState extends State<DoctorChatScreen> {
  final TextEditingController _inputCtrl = TextEditingController();
  final ScrollController _scrollCtrl = ScrollController();
  List<Map<String, dynamic>> _msgs = [];
  bool _loading = true;
  bool _sending = false;
  String? _myId;

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
            'id': m['id']?.toString() ?? m['_id']?.toString() ?? '',
            'sender': m['sender_id']?.toString() == _myId ? 'doctor' : 'patient',
            'text': m['content']?.toString() ?? m['text']?.toString() ?? '',
            'time': _formatTime(m['timestamp']?.toString() ?? m['created_at']?.toString() ?? ''),
            'read': m['is_read'] == true || m['read'] == true,
            'type': m['message_type'] ?? m['messageType'] ?? 'text',
          }).toList();
          _loading = false;
        });
      } else {
        setState(() {
          _msgs = [];
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
      final ampm = dt.hour >= 12 ? 'PM' : 'AM';
      return '$h:$m $ampm';
    } catch (_) {
      return raw;
    }
  }

  void _scrollToBottom() {
    if (_scrollCtrl.hasClients) {
      _scrollCtrl.animateTo(_scrollCtrl.position.maxScrollExtent, duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
    }
  }

  Future<void> _send() async {
    final text = _inputCtrl.text.trim();
    if (text.isEmpty || _sending) return;
    _inputCtrl.clear();

    // Optimistic UI
    final optimistic = {'id': 'tmp-${DateTime.now().millisecondsSinceEpoch}', 'sender': 'doctor', 'text': text, 'time': TimeOfDay.now().format(context), 'read': false, 'sending': true, 'type': 'text'};
    setState(() { _msgs.add(optimistic); _sending = true; });
    Future.delayed(const Duration(milliseconds: 80), _scrollToBottom);

    try {
      final res = await ApiClient.post(ApiConfig.sendMessage, {
        'receiverId': widget.convo['id'].toString(),
        'content': text,
        'messageType': 'text',
      });
      setState(() {
        _msgs.removeLast();
        _msgs.add({'id': res.data?['data']?['id']?.toString() ?? optimistic['id']!, 'sender': 'doctor', 'text': text, 'time': optimistic['time']!, 'read': false, 'type': 'text'});
        _sending = false;
      });
    } catch (_) {
      // Keep optimistic msg but mark as failed
      setState(() { _msgs.last['sending'] = false; _msgs.last['failed'] = true; _sending = false; });
    }
    Future.delayed(const Duration(milliseconds: 80), _scrollToBottom);
  }

  Future<void> _pickAndUploadAttachment() async {
    if (_sending) return;
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'mp4', 'mov', 'avi', 'mkv'],
        withData: true,
      );

      if (result == null || result.files.isEmpty) return;

      final file = result.files.first;
      setState(() => _sending = true);

      final uploadRes = await ApiClient.postMultipart(
        ApiConfig.uploadMessage,
        {},
        fileField: 'file',
        filePath: file.path,
        fileBytes: file.bytes,
        fileName: file.name,
      );

      if (uploadRes.ok && uploadRes.data != null && uploadRes.data!['url'] != null) {
        final fileUrl = uploadRes.data!['url'].toString();
        final optimistic = {
          'id': 'tmp-${DateTime.now().millisecondsSinceEpoch}',
          'sender': 'doctor',
          'text': fileUrl,
          'time': TimeOfDay.now().format(context),
          'read': false,
          'sending': true,
          'type': 'attachment'
        };
        setState(() { _msgs.add(optimistic); });
        Future.delayed(const Duration(milliseconds: 80), _scrollToBottom);

        final res = await ApiClient.post(ApiConfig.sendMessage, {
          'receiverId': widget.convo['id'].toString(),
          'content': fileUrl,
          'messageType': 'attachment',
        });

        setState(() {
          _msgs.removeLast();
          _msgs.add({
            'id': res.data?['data']?['id']?.toString() ?? optimistic['id']!,
            'sender': 'doctor',
            'text': fileUrl,
            'time': optimistic['time']!,
            'read': false,
            'type': 'attachment'
          });
          _sending = false;
        });
      } else {
        setState(() => _sending = false);
        final errMsg = uploadRes.data?['error'] ?? uploadRes.error ?? 'Unknown error';
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Upload failed (${uploadRes.statusCode}): $errMsg'),
          backgroundColor: Colors.red,
        ));
      }
    } catch (e) {
      setState(() => _sending = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Error uploading file: $e'),
        backgroundColor: Colors.red,
      ));
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
          Container(width: 38, height: 38, decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), shape: BoxShape.circle), alignment: Alignment.center, child: Text(c['avatar'], style: const TextStyle(fontSize: 20))),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(c['name'], style: const TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold, fontSize: 15, color: Colors.white)),
            Row(children: [
              Container(width: 7, height: 7, decoration: BoxDecoration(color: c['online'] == true ? const Color(0xFF80ED99) : Colors.white38, shape: BoxShape.circle)),
              const SizedBox(width: 4),
              Text(c['online'] == true ? 'Online • ${c['dosha']}' : 'Offline • ${c['dosha']}', style: TextStyle(fontFamily: 'Poppins', fontSize: 11, color: Colors.white.withValues(alpha: 0.85))),
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
                    if (i == 0) return Center(child: Container(margin: const EdgeInsets.only(bottom: 16), padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 5), decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.8), borderRadius: BorderRadius.circular(50)), child: Text('${c['type']} — Pull to refresh', style: const TextStyle(fontFamily: 'Poppins', fontSize: 11, color: AppColors.textMuted))));
                    final msg = _msgs[i - 1];
                    final isDoctor = msg['sender'] == 'doctor';
                    final isFailed = msg['failed'] == true;
                    final isSending = msg['sending'] == true;
                    final isAttachment = msg['type'] == 'attachment';
                    final text = msg['text'].toString();
                    final fullUrl = text.startsWith('http') ? text : '${ApiConfig.baseUrl}$text';
                    final ext = text.contains('.') ? text.split('.').last.toLowerCase() : '';
                    final isImage = ext == 'jpg' || ext == 'jpeg' || ext == 'png';
                    final isVideo = ext == 'mp4' || ext == 'mov' || ext == 'avi' || ext == 'mkv';

                    return Padding(
                      padding: EdgeInsets.only(bottom: 6, left: isDoctor ? 50 : 0, right: isDoctor ? 0 : 50),
                      child: Align(
                        alignment: isDoctor ? Alignment.centerRight : Alignment.centerLeft,
                        child: Container(
                          constraints: BoxConstraints(maxWidth: MediaQuery.of(ctx).size.width * 0.75),
                          decoration: BoxDecoration(
                            color: isFailed ? const Color(0xFFFFEBEE) : isDoctor ? AppColors.primaryGreen : Colors.white,
                            borderRadius: BorderRadius.only(topLeft: const Radius.circular(16), topRight: const Radius.circular(16), bottomLeft: Radius.circular(isDoctor ? 16 : 2), bottomRight: Radius.circular(isDoctor ? 2 : 16)),
                            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 4, offset: const Offset(0, 2))],
                          ),
                          padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 9),
                          child: Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                            if (isAttachment)
                              GestureDetector(
                                onTap: () => launchUrl(Uri.parse(fullUrl), mode: LaunchMode.externalApplication),
                                child: Container(
                                  margin: const EdgeInsets.only(bottom: 6),
                                  decoration: BoxDecoration(
                                    color: isDoctor ? Colors.white.withValues(alpha: 0.15) : AppColors.primaryGreen.withValues(alpha: 0.08),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  clipBehavior: Clip.hardEdge,
                                  child: isImage
                                      ? Stack(
                                          alignment: Alignment.center,
                                          children: [
                                            Image.network(fullUrl, height: 160, width: double.infinity, fit: BoxFit.cover, errorBuilder: (_, __, ___) => Container(height: 120, color: Colors.grey.shade200, child: const Icon(Icons.broken_image, color: Colors.grey, size: 40))),
                                            Positioned(right: 8, bottom: 8, child: Container(padding: const EdgeInsets.all(6), decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle), child: const Icon(Icons.open_in_full_rounded, color: Colors.white, size: 16))),
                                          ],
                                        )
                                      : Padding(
                                          padding: const EdgeInsets.all(12),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Icon(isVideo ? Icons.video_file_rounded : Icons.picture_as_pdf_rounded, color: isDoctor ? Colors.white : AppColors.primaryGreen, size: 32),
                                              const SizedBox(width: 10),
                                              Expanded(child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Text(isVideo ? 'Video Attachment' : 'PDF Medical Report', style: TextStyle(fontFamily: 'Poppins', fontSize: 13, fontWeight: FontWeight.bold, color: isDoctor ? Colors.white : AppColors.textDark)),
                                                  Text('Tap to open & view', style: TextStyle(fontFamily: 'Poppins', fontSize: 11, color: isDoctor ? Colors.white70 : AppColors.textMuted)),
                                                ],
                                              )),
                                              Icon(Icons.download_rounded, color: isDoctor ? Colors.white : AppColors.primaryGreen, size: 20),
                                            ],
                                          ),
                                        ),
                                ),
                              )
                            else
                              Text(msg['text'], style: TextStyle(fontFamily: 'Poppins', fontSize: 14, color: isFailed ? Colors.red : isDoctor ? Colors.white : AppColors.textDark, height: 1.45)),
                            const SizedBox(height: 3),
                            Row(mainAxisSize: MainAxisSize.min, children: [
                              if (isFailed) const Text('Failed', style: TextStyle(fontFamily: 'Poppins', fontSize: 9, color: Colors.red)),
                              if (!isFailed) Text(msg['time'], style: TextStyle(fontFamily: 'Poppins', fontSize: 10, color: isDoctor ? Colors.white54 : AppColors.textMuted)),
                              if (isDoctor && !isFailed) ...[
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
                    decoration: const InputDecoration(hintText: 'Type clinical advice...', hintStyle: TextStyle(fontFamily: 'Poppins', fontSize: 13, color: AppColors.textMuted), border: InputBorder.none, contentPadding: EdgeInsets.symmetric(vertical: 10)),
                  )),
                  IconButton(icon: const Icon(Icons.attach_file_rounded, color: AppColors.textMuted, size: 22), onPressed: _pickAndUploadAttachment, constraints: const BoxConstraints(), padding: const EdgeInsets.all(8)),
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
