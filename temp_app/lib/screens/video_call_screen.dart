import 'package:flutter/material.dart';
import 'package:agora_rtc_engine/agora_rtc_engine.dart';
import 'package:permission_handler/permission_handler.dart';

// ──────────────────────────────────────────────────────────────
// SETUP INSTRUCTIONS:
//  1. Go to https://console.agora.io and create a project
//  2. Copy your App ID and replace _kAppId below
//  3. For production: generate a token from Agora console and set it in _kToken
//     For testing: set _kToken = '' and disable "App Certificate" in Agora console
//  4. Add to android/app/src/main/AndroidManifest.xml:
//       <uses-permission android:name="android.permission.CAMERA"/>
//       <uses-permission android:name="android.permission.RECORD_AUDIO"/>
//       <uses-permission android:name="android.permission.READ_PHONE_STATE"/>
//       <uses-permission android:name="android.permission.INTERNET"/>
//  5. Set minSdkVersion to 21 in android/app/build.gradle
// ──────────────────────────────────────────────────────────────

const String _kAppId = 'YOUR_AGORA_APP_ID'; // ← Replace this
const String _kToken = '';                   // ← Set token or leave '' for testing
const String _kChannel = 'vaidyamed_channel';

class VideoCallScreen extends StatefulWidget {
  final String channelName;
  final String patientName;

  const VideoCallScreen({
    super.key,
    this.channelName = _kChannel,
    this.patientName = 'Patient',
  });

  @override
  State<VideoCallScreen> createState() => _VideoCallScreenState();
}

class _VideoCallScreenState extends State<VideoCallScreen> {
  // ── State ──
  late RtcEngine _engine;
  int? _remoteUid;           // UID of the remote user
  bool _localUserJoined = false;
  bool _isLoading = true;
  bool _muted = false;
  bool _cameraOff = false;
  bool _frontCamera = true;
  bool _speakerOn = true;
  String? _errorMessage;

  // ── Duration timer ──
  final Stopwatch _callTimer = Stopwatch();
  late Stream<int> _timerStream;

  @override
  void initState() {
    super.initState();
    _timerStream = Stream.periodic(const Duration(seconds: 1), (i) => i);
    _initAgora();
  }

  // ── Init & join ──
  Future<void> _initAgora() async {
    // 1. Request permissions
    final perms = await [Permission.microphone, Permission.camera].request();
    if (perms[Permission.microphone] != PermissionStatus.granted ||
        perms[Permission.camera] != PermissionStatus.granted) {
      setState(() { _isLoading = false; _errorMessage = 'Camera and microphone permissions are required.'; });
      return;
    }

    try {
      // 2. Create engine
      _engine = createAgoraRtcEngine();
      await _engine.initialize(RtcEngineContext(
        appId: _kAppId,
        channelProfile: ChannelProfileType.channelProfileCommunication,
      ));

      // 3. Register event handlers
      _engine.registerEventHandler(RtcEngineEventHandler(
        onJoinChannelSuccess: (connection, elapsed) {
          if (!mounted) return;
          setState(() { _localUserJoined = true; _isLoading = false; _callTimer.start(); });
        },
        onUserJoined: (connection, remoteUid, elapsed) {
          if (!mounted) return;
          setState(() => _remoteUid = remoteUid);
        },
        onUserOffline: (connection, remoteUid, reason) {
          if (!mounted) return;
          setState(() => _remoteUid = null);
        },
        onError: (err, msg) {
          if (!mounted) return;
          setState(() { _isLoading = false; _errorMessage = 'Connection error: $msg'; });
        },
        onNetworkQuality: (connection, remoteUid, txQuality, rxQuality) {
          // Handle network quality changes if needed
        },
      ));

      // 4. Enable video and set encoder config
      await _engine.enableVideo();
      await _engine.setVideoEncoderConfiguration(const VideoEncoderConfiguration(
        dimensions: VideoDimensions(width: 1280, height: 720),
        frameRate: 30,
        bitrate: 0,
      ));

      // 5. Set audio route
      await _engine.setEnableSpeakerphone(true);

      // 6. Start preview
      await _engine.startPreview();

      // 7. Join channel
      await _engine.joinChannel(
        token: _kToken,
        channelId: widget.channelName,
        uid: 0, // 0 = auto-assign
        options: const ChannelMediaOptions(
          autoSubscribeVideo: true,
          autoSubscribeAudio: true,
          publishCameraTrack: true,
          publishMicrophoneTrack: true,
          clientRoleType: ClientRoleType.clientRoleBroadcaster,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() { _isLoading = false; _errorMessage = 'Failed to initialise video call: $e'; });
    }
  }

  // ── Controls ──
  Future<void> _toggleMute() async {
    setState(() => _muted = !_muted);
    await _engine.muteLocalAudioStream(_muted);
  }

  Future<void> _toggleCamera() async {
    setState(() => _cameraOff = !_cameraOff);
    await _engine.muteLocalVideoStream(_cameraOff);
  }

  Future<void> _switchCamera() async {
    setState(() => _frontCamera = !_frontCamera);
    await _engine.switchCamera();
  }

  Future<void> _toggleSpeaker() async {
    setState(() => _speakerOn = !_speakerOn);
    await _engine.setEnableSpeakerphone(_speakerOn);
  }

  Future<void> _endCall() async {
    await _engine.leaveChannel();
    if (mounted) Navigator.of(context).pop();
  }

  String _formatDuration(int seconds) {
    final m = (seconds ~/ 60).toString().padLeft(2, '0');
    final s = (seconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Future<void> dispose() async {
    _callTimer.stop();
    await _engine.leaveChannel();
    await _engine.release();
    super.dispose();
  }

  // ── Build ──
  @override
  Widget build(BuildContext context) {
    if (_errorMessage != null) return _buildError();

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(children: [
        // ── Remote Video (full screen) ──
        _buildRemoteVideo(),

        // ── Local Video (PiP corner) ──
        if (_localUserJoined) _buildLocalVideo(),

        // ── Loading overlay ──
        if (_isLoading) _buildLoadingOverlay(),

        // ── Top bar ──
        _buildTopBar(),

        // ── Bottom controls ──
        _buildBottomControls(),
      ]),
    );
  }

  Widget _buildRemoteVideo() {
    if (_remoteUid != null) {
      return AgoraVideoView(
        controller: VideoViewController.remote(
          rtcEngine: _engine,
          canvas: VideoCanvas(uid: _remoteUid),
          connection: RtcConnection(channelId: widget.channelName),
        ),
      );
    }
    // Waiting for remote user
    return Container(
      width: double.infinity,
      height: double.infinity,
      color: const Color(0xFF0D1117),
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Container(
          width: 100, height: 100,
          decoration: BoxDecoration(color: const Color(0xFF1A2F1A), shape: BoxShape.circle, border: Border.all(color: const Color(0xFF2D6A4F).withValues(alpha: 0.5), width: 2)),
          child: const Center(child: Text('👤', style: TextStyle(fontSize: 52))),
        ),
        const SizedBox(height: 24),
        Text(widget.patientName, style: const TextStyle(fontFamily: 'Poppins', fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white)),
        const SizedBox(height: 8),
        Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Container(width: 8, height: 8, decoration: const BoxDecoration(color: Color(0xFF25D366), shape: BoxShape.circle)),
          const SizedBox(width: 6),
          const Text('Waiting for user to join...', style: TextStyle(fontFamily: 'Poppins', fontSize: 14, color: Color(0xFF8A8A8A))),
        ]),
        const SizedBox(height: 40),
        // Pulsing dots animation
        Row(mainAxisAlignment: MainAxisAlignment.center, children: List.generate(3, (i) => _PulseDot(delay: Duration(milliseconds: i * 300)))),
      ]),
    );
  }

  Widget _buildLocalVideo() {
    return Positioned(
      top: 100,
      right: 16,
      width: 100,
      height: 150,
      child: GestureDetector(
        onTap: _switchCamera,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFF2D6A4F), width: 2),
            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.5), blurRadius: 12)],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: _cameraOff
                ? Container(color: const Color(0xFF1A1A1A), child: const Center(child: Icon(Icons.videocam_off, color: Colors.white54, size: 28)))
                : AgoraVideoView(
                    controller: VideoViewController(
                      rtcEngine: _engine,
                      canvas: const VideoCanvas(uid: 0),
                    ),
                  ),
          ),
        ),
      ),
    );
  }

  Widget _buildLoadingOverlay() {
    return Container(
      color: Colors.black.withValues(alpha: 0.85),
      child: const Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        CircularProgressIndicator(color: Color(0xFF25D366), strokeWidth: 3),
        SizedBox(height: 20),
        Text('Connecting to secure channel...', style: TextStyle(fontFamily: 'Poppins', fontSize: 14, color: Colors.white70)),
      ])),
    );
  }

  Widget _buildTopBar() {
    return Positioned(
      top: 0, left: 0, right: 0,
      child: Container(
        padding: EdgeInsets.only(top: MediaQuery.of(context).padding.top + 8, left: 16, right: 16, bottom: 12),
        decoration: BoxDecoration(
          gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Colors.black.withValues(alpha: 0.7), Colors.transparent]),
        ),
        child: Row(children: [
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(widget.patientName, style: const TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold, fontSize: 17, color: Colors.white)),
            StreamBuilder<int>(
              stream: _timerStream,
              builder: (ctx, snap) {
                final secs = _callTimer.elapsed.inSeconds;
                return Text(
                  _localUserJoined ? (_remoteUid != null ? _formatDuration(secs) : 'Ringing...') : 'Connecting...',
                  style: const TextStyle(fontFamily: 'Poppins', fontSize: 12, color: Color(0xFF25D366)),
                );
              },
            ),
          ]),
          const Spacer(),
          // Signal strength indicator
          if (_remoteUid != null)
            Row(children: List.generate(4, (i) => Container(
              margin: const EdgeInsets.only(left: 2),
              width: 4, height: 8 + i * 4.0,
              decoration: BoxDecoration(color: i < 3 ? const Color(0xFF25D366) : const Color(0xFF25D366).withValues(alpha: 0.4), borderRadius: BorderRadius.circular(2)),
            ))),
        ]),
      ),
    );
  }

  Widget _buildBottomControls() {
    return Positioned(
      bottom: 0, left: 0, right: 0,
      child: Container(
        padding: EdgeInsets.only(top: 24, left: 16, right: 16, bottom: MediaQuery.of(context).padding.bottom + 24),
        decoration: BoxDecoration(
          gradient: LinearGradient(begin: Alignment.bottomCenter, end: Alignment.topCenter, colors: [Colors.black.withValues(alpha: 0.85), Colors.transparent]),
        ),
        child: Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
          _controlBtn(icon: _speakerOn ? Icons.volume_up : Icons.volume_off, label: _speakerOn ? 'Speaker' : 'Earpiece', onTap: _toggleSpeaker),
          _controlBtn(icon: _muted ? Icons.mic_off : Icons.mic, label: _muted ? 'Unmute' : 'Mute', onTap: _toggleMute, isActive: _muted),
          // End call — center, larger
          GestureDetector(
            onTap: _endCall,
            child: Container(
              width: 70, height: 70,
              decoration: const BoxDecoration(color: Color(0xFFE53935), shape: BoxShape.circle),
              child: const Icon(Icons.call_end, color: Colors.white, size: 30),
            ),
          ),
          _controlBtn(icon: _cameraOff ? Icons.videocam_off : Icons.videocam, label: _cameraOff ? 'Cam Off' : 'Camera', onTap: _toggleCamera, isActive: _cameraOff),
          _controlBtn(icon: Icons.flip_camera_ios_outlined, label: 'Flip', onTap: _switchCamera),
        ]),
      ),
    );
  }

  Widget _controlBtn({required IconData icon, required String label, required VoidCallback onTap, bool isActive = false}) {
    return GestureDetector(
      onTap: onTap,
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          width: 52, height: 52,
          decoration: BoxDecoration(
            color: isActive ? Colors.white : Colors.white.withValues(alpha: 0.15),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: isActive ? Colors.black87 : Colors.white, size: 24),
        ),
        const SizedBox(height: 6),
        Text(label, style: const TextStyle(fontFamily: 'Poppins', fontSize: 10, color: Colors.white70)),
      ]),
    );
  }

  Widget _buildError() {
    return Scaffold(
      backgroundColor: const Color(0xFF0D1117),
      body: Center(child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          const Text('❌', style: TextStyle(fontSize: 52)),
          const SizedBox(height: 24),
          const Text('Call Failed', style: TextStyle(fontFamily: 'Poppins', fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white)),
          const SizedBox(height: 12),
          Text(_errorMessage ?? 'Unknown error', textAlign: TextAlign.center, style: const TextStyle(fontFamily: 'Poppins', fontSize: 13, color: Color(0xFF8A8A8A), height: 1.6)),
          const SizedBox(height: 36),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(),
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFE53935), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(horizontal: 36, vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(50))),
            child: const Text('Go Back', style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold)),
          ),
        ]),
      )),
    );
  }
}

// ── Pulsing dot animation widget ──
class _PulseDot extends StatefulWidget {
  final Duration delay;
  const _PulseDot({required this.delay});
  @override
  State<_PulseDot> createState() => _PulseDotState();
}

class _PulseDotState extends State<_PulseDot> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 900))..repeat(reverse: true);
    _anim = Tween<double>(begin: 0.3, end: 1.0).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut));
    Future.delayed(widget.delay, () { if (mounted) _ctrl.forward(); });
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) => FadeTransition(
    opacity: _anim,
    child: Container(
      margin: const EdgeInsets.symmetric(horizontal: 4),
      width: 10, height: 10,
      decoration: const BoxDecoration(color: Color(0xFF25D366), shape: BoxShape.circle),
    ),
  );
}
