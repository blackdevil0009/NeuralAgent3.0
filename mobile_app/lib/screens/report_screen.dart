import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class ReportScreen extends StatefulWidget {
  const ReportScreen({super.key});

  @override
  State<ReportScreen> createState() => _ReportScreenState();
}

class _ReportScreenState extends State<ReportScreen> {
  final List<Map<String, String>> _reports = [
    {'title': 'Blood Test (CBC)', 'date': '12 Oct 2023', 'center': 'Pathology Lab'},
    {'title': 'Ayurvedic Prakriti Analysis', 'date': '05 Sep 2023', 'center': 'Dr. Sharma Clinic'},
    {'title': 'X-Ray Chest', 'date': '22 Aug 2023', 'center': 'City Hospital'},
  ];

  bool _isUploading = false;

  void _simulateUpload() async {
    setState(() => _isUploading = true);
    
    // Simulate file picker & upload delay
    await Future.delayed(const Duration(seconds: 2));
    
    if (mounted) {
      setState(() {
        _isUploading = false;
        _reports.insert(0, {
          'title': 'New Lab Report (Uploaded)',
          'date': 'Just now',
          'center': 'User Upload',
        });
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('File uploaded successfully!'), backgroundColor: AppColors.primaryGreen)
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      physics: const BouncingScrollPhysics(),
      children: [
        _buildUploadBanner(context),
        const SizedBox(height: 24),
        const Text('Recent Reports', style: TextStyle(fontFamily: 'Poppins', fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textDark)),
        const SizedBox(height: 12),
        ..._reports.map((r) => _buildReportCard(r['title']!, r['date']!, r['center']!)),
      ],
    );
  }

  Widget _buildUploadBanner(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: AppColors.backgroundGradient,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: AppColors.primaryGreen.withValues(alpha: 0.2), blurRadius: 15, offset: const Offset(0, 8))],
      ),
      child: Column(
        children: [
          const Icon(Icons.cloud_upload_outlined, size: 48, color: Colors.white),
          const SizedBox(height: 12),
          const Text('Upload Medical Report', style: TextStyle(fontFamily: 'Poppins', fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white)),
          const SizedBox(height: 8),
          Text('Keep all your health records organized and accessible.', textAlign: TextAlign.center, style: TextStyle(fontFamily: 'Poppins', fontSize: 12, color: Colors.white.withValues(alpha: 0.9))),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _isUploading ? null : _simulateUpload,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: AppColors.primaryGreen,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
            ),
            child: _isUploading 
                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: AppColors.primaryGreen, strokeWidth: 2))
                : const Text('Select File', style: TextStyle(fontFamily: 'Poppins', fontSize: 13, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  Widget _buildReportCard(String title, String date, String center) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.inputBorder.withValues(alpha: 0.5)),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 5, offset: const Offset(0, 2))],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: const Color(0xFFEAF5EE), borderRadius: BorderRadius.circular(12)),
            child: const Icon(Icons.picture_as_pdf_outlined, color: AppColors.primaryGreen),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontFamily: 'Poppins', fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textDark)),
                const SizedBox(height: 4),
                Text('$center • $date', style: const TextStyle(fontFamily: 'Poppins', fontSize: 11, color: AppColors.textMuted)),
              ],
            ),
          ),
          IconButton(icon: const Icon(Icons.download_outlined, color: AppColors.primaryGreen), onPressed: () {}),
        ],
      ),
    );
  }
}
