import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/vx_widgets.dart';

class ReportScreen extends StatefulWidget {
  const ReportScreen({super.key});

  @override
  State<ReportScreen> createState() => _ReportScreenState();
}

class _ReportScreenState extends State<ReportScreen> {
  List<dynamic> _reports = [];
  bool _isLoading = false;
  bool _isUploading = false;
  String? _errorMsg;

  @override
  void initState() {
    super.initState();
    _loadReports();
  }

  Future<void> _loadReports() async {
    setState(() {
      _isLoading = true;
      _errorMsg = null;
    });

    try {
      final res = await ApiClient.get(ApiConfig.reports);
      if (res.ok && res.data != null) {
        setState(() {
          _reports = res.data!['data']?['reports'] ?? [];
        });
      } else {
        setState(() {
          _errorMsg = res.data?['message'] ?? res.error ?? 'Failed to load health records.';
        });
      }
    } catch (e) {
      setState(() {
        _errorMsg = 'Connection error. Check your network.';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _pickAndUploadReport() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png'],
        withData: true,
      );

      if (result == null || result.files.isEmpty) return;

      final file = result.files.first;

      setState(() => _isUploading = true);

      final res = await ApiClient.postMultipart(
        ApiConfig.reports,
        {'displayName': file.name.split('.').first},
        fileField: 'files',
        filePath: file.path,
        fileBytes: file.bytes,
        fileName: file.name,
      );

      setState(() => _isUploading = false);

      if (res.ok && res.data != null) {
        final reportsList = res.data!['data']?['reports'] as List?;
        if (reportsList != null && reportsList.isNotEmpty) {
          final newReportId = reportsList.first['id'].toString();
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('File uploaded successfully! Starting AI analysis...'),
            backgroundColor: AppColors.primaryGreen,
          ));
          await _analyzeReport(newReportId);
        } else {
          _loadReports();
        }
      } else {
        final error = res.data?['message'] ?? res.error ?? 'Failed to upload report.';
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(error),
          backgroundColor: AppColors.errorRed,
        ));
      }
    } catch (e) {
      setState(() => _isUploading = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Upload failed: $e'),
        backgroundColor: AppColors.errorRed,
      ));
    }
  }

  Future<void> _analyzeReport(String reportId) async {
    // Show AI Analyzer Dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return WillPopScope(
          onWillPop: () async => false,
          child: Dialog(
            backgroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const SizedBox(
                    width: 60,
                    height: 60,
                    child: CircularProgressIndicator(
                      color: AppColors.primaryGreen,
                      strokeWidth: 3,
                    ),
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'AI OCR Scanner',
                    style: TextStyle(
                      fontFamily: 'PlayfairDisplay',
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primaryGreen,
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Extracting text, analyzing abnormal markers, and parsing wellness recommendations. Please wait...',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontFamily: 'Poppins',
                      fontSize: 12,
                      color: AppColors.textMuted,
                      height: 1.5,
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );

    try {
      final res = await ApiClient.post(ApiConfig.analyzeReport(reportId), {});
      Navigator.of(context).pop(); // Close analyzing dialog

      if (res.ok) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('✅ Report AI analysis completed successfully!'),
          backgroundColor: AppColors.primaryGreen,
        ));
        _loadReports();
      } else {
        final error = res.data?['message'] ?? res.error ?? 'AI Analysis failed.';
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(error),
          backgroundColor: AppColors.errorRed,
        ));
        _loadReports();
      }
    } catch (e) {
      Navigator.of(context).pop(); // Close dialog
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('AI Analysis error: $e'),
        backgroundColor: AppColors.errorRed,
      ));
      _loadReports();
    }
  }

  Future<void> _deleteReport(String reportId) async {
    try {
      final res = await ApiClient.delete(ApiConfig.deleteReport(reportId));
      if (res.ok) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Report deleted successfully'),
          backgroundColor: AppColors.primaryGreen,
        ));
        _loadReports();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(res.error ?? 'Failed to delete report.'),
          backgroundColor: AppColors.errorRed,
        ));
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Delete failed: $e'),
        backgroundColor: AppColors.errorRed,
      ));
    }
  }

  void _viewReportInsights(Map<String, dynamic> report) {
    Map<String, dynamic> parsedInsights = {};
    List<dynamic> parsedAbnormal = [];

    try {
      if (report['insights'] != null && report['insights'] is String) {
        parsedInsights = jsonDecode(report['insights']);
      } else if (report['insights'] is Map) {
        parsedInsights = Map<String, dynamic>.from(report['insights']);
      }
    } catch (_) {}

    try {
      if (report['abnormalValues'] != null && report['abnormalValues'] is String) {
        parsedAbnormal = jsonDecode(report['abnormalValues']);
      } else if (report['abnormalValues'] is List) {
        parsedAbnormal = report['abnormalValues'];
      }
    } catch (_) {}

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.85,
          minChildSize: 0.5,
          maxChildSize: 0.95,
          builder: (_, controller) {
            return Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: DefaultTabController(
                length: 3,
                child: Column(
                  children: [
                    Container(
                      width: 40,
                      height: 4,
                      margin: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade300,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  report['name'] ?? 'Medical Report',
                                  style: const TextStyle(
                                    fontFamily: 'PlayfairDisplay',
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.textDark,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                Text(
                                  'Analyzed on ${report['date'] ?? ''}',
                                  style: const TextStyle(
                                    fontFamily: 'Poppins',
                                    fontSize: 11,
                                    color: AppColors.textMuted,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          _riskPill(report['riskLevel']?.toString() ?? 'unknown'),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    const TabBar(
                      labelColor: AppColors.primaryGreen,
                      unselectedLabelColor: AppColors.textMuted,
                      indicatorColor: AppColors.primaryGreen,
                      labelStyle: TextStyle(
                        fontFamily: 'Poppins',
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                      tabs: [
                        Tab(text: 'General AI Insight'),
                        Tab(text: 'Ayurvedic Wellness'),
                        Tab(text: 'Abnormal Markers'),
                      ],
                    ),
                    Expanded(
                      child: TabBarView(
                        children: [
                          // Tab 1: General Allopathic Summary
                          ListView(
                            controller: controller,
                            padding: const EdgeInsets.all(20),
                            children: [
                              _sectionTitle('📋 Executive Summary'),
                              const SizedBox(height: 8),
                              _bulletList(parsedInsights['reportSummary']),
                              const SizedBox(height: 20),
                              _sectionTitle('⚠️ Possible Concerns'),
                              const SizedBox(height: 8),
                              _bulletList(parsedInsights['possibleConcerns']),
                              const SizedBox(height: 20),
                              _sectionTitle('💡 Clinical Suggestions'),
                              const SizedBox(height: 8),
                              _bulletList(parsedInsights['suggestions']),
                            ],
                          ),
                          // Tab 2: Ayurvedic Insights
                          ListView(
                            controller: controller,
                            padding: const EdgeInsets.all(20),
                            children: [
                              _sectionTitle('🌿 Ayurvedic Prakriti Impact'),
                              const SizedBox(height: 8),
                              _bulletList(parsedInsights['dietRecommendations']),
                              const SizedBox(height: 20),
                              _sectionTitle('💧 Hydration Guidance'),
                              const SizedBox(height: 8),
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: Colors.blue.shade50,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: Colors.blue.shade100),
                                ),
                                child: Text(
                                  parsedInsights['hydrationAdvice'] ?? 'Maintain regular hydration unless restricted by your doctor.',
                                  style: const TextStyle(
                                    fontFamily: 'Poppins',
                                    fontSize: 12,
                                    color: Colors.blue,
                                    height: 1.5,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 20),
                              _sectionTitle('🧘 Lifestyle Recommendations'),
                              const SizedBox(height: 8),
                              _bulletList(parsedInsights['lifestyleGuidance']),
                            ],
                          ),
                          // Tab 3: Abnormal Markers
                          parsedAbnormal.isEmpty
                              ? Center(
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(Icons.check_circle, size: 48, color: Colors.green.shade400),
                                      const SizedBox(height: 12),
                                      const Text(
                                        'All parameters are normal!',
                                        style: TextStyle(
                                          fontFamily: 'Poppins',
                                          fontSize: 13,
                                          fontWeight: FontWeight.w600,
                                          color: AppColors.textDark,
                                        ),
                                      ),
                                    ],
                                  ),
                                )
                              : ListView.builder(
                                  controller: controller,
                                  padding: const EdgeInsets.all(20),
                                  itemCount: parsedAbnormal.length,
                                  itemBuilder: (context, index) {
                                    final val = parsedAbnormal[index];
                                    return Container(
                                      margin: const EdgeInsets.only(bottom: 12),
                                      padding: const EdgeInsets.all(14),
                                      decoration: BoxDecoration(
                                        color: Colors.red.shade50,
                                        borderRadius: BorderRadius.circular(12),
                                        border: Border.all(color: Colors.red.shade100),
                                      ),
                                      child: Row(
                                        children: [
                                          Icon(Icons.warning_amber_rounded, color: Colors.red.shade600),
                                          const SizedBox(width: 12),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  val['name']?.toString() ?? 'Flagged Parameter',
                                                  style: TextStyle(
                                                    fontFamily: 'Poppins',
                                                    fontSize: 13,
                                                    fontWeight: FontWeight.w600,
                                                    color: Colors.red.shade900,
                                                  ),
                                                ),
                                                const SizedBox(height: 2),
                                                Text(
                                                  'Value: ${val['value'] ?? ''} ${val['unit'] ?? ''} (Range: ${val['ref_range'] ?? ''})',
                                                  style: TextStyle(
                                                    fontFamily: 'Poppins',
                                                    fontSize: 11,
                                                    color: Colors.red.shade700,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                            decoration: BoxDecoration(
                                              color: Colors.red.shade100,
                                              borderRadius: BorderRadius.circular(8),
                                            ),
                                            child: Text(
                                              val['status']?.toString().toUpperCase() ?? 'ABNORMAL',
                                              style: TextStyle(
                                                fontFamily: 'Poppins',
                                                fontSize: 9,
                                                fontWeight: FontWeight.bold,
                                                color: Colors.red.shade900,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    );
                                  },
                                ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _sectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontFamily: 'Poppins',
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: AppColors.textDark,
      ),
    );
  }

  Widget _bulletList(dynamic items) {
    if (items == null) {
      return const Text('- None', style: TextStyle(fontFamily: 'Poppins', fontSize: 12, color: AppColors.textMuted));
    }
    List<dynamic> list = [];
    if (items is List) {
      list = items;
    } else if (items is String) {
      try {
        list = jsonDecode(items);
      } catch (_) {
        list = [items];
      }
    }

    if (list.isEmpty) {
      return const Text('- Normal/No insights', style: TextStyle(fontFamily: 'Poppins', fontSize: 12, color: AppColors.textMuted));
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: list.map((item) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('• ', style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.primaryGreen)),
              Expanded(
                child: Text(
                  item.toString(),
                  style: const TextStyle(
                    fontFamily: 'Poppins',
                    fontSize: 12,
                    color: AppColors.textDark,
                    height: 1.5,
                  ),
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _riskPill(String level) {
    Color bg = Colors.grey.shade100;
    Color fg = Colors.grey.shade700;
    String txt = level.toUpperCase();

    if (level.toLowerCase() == 'high') {
      bg = Colors.red.shade50;
      fg = Colors.red;
    } else if (level.toLowerCase() == 'moderate') {
      bg = Colors.orange.shade50;
      fg = Colors.orange;
    } else if (level.toLowerCase() == 'low') {
      bg = Colors.green.shade50;
      fg = Colors.green;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: fg.withValues(alpha: 0.2)),
      ),
      child: Text(
        txt,
        style: TextStyle(
          fontFamily: 'Poppins',
          fontSize: 10,
          fontWeight: FontWeight.bold,
          color: fg,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      body: SafeArea(
        child: Column(
          children: [
            _buildUploadBanner(context),
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator(color: AppColors.primaryGreen))
                  : _errorMsg != null
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.all(24),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(_errorMsg!, textAlign: TextAlign.center, style: const TextStyle(fontFamily: 'Poppins', color: AppColors.errorRed)),
                                const SizedBox(height: 12),
                                ElevatedButton(
                                  onPressed: _loadReports,
                                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryGreen),
                                  child: const Text('Retry'),
                                ),
                              ],
                            ),
                          ),
                        )
                      : _reports.isEmpty
                          ? Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.library_books_outlined, size: 54, color: Colors.grey.shade300),
                                  const SizedBox(height: 12),
                                  const Text(
                                    'No medical reports uploaded yet.',
                                    style: TextStyle(fontFamily: 'Poppins', fontSize: 13, color: AppColors.textMuted),
                                  ),
                                ],
                              ),
                            )
                          : ListView.builder(
                              padding: const EdgeInsets.all(16),
                              physics: const BouncingScrollPhysics(),
                              itemCount: _reports.length,
                              itemBuilder: (context, index) {
                                final r = _reports[index];
                                return _buildReportCard(r);
                              },
                            ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildUploadBanner(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: AppColors.backgroundGradient,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: AppColors.primaryGreen.withValues(alpha: 0.2), blurRadius: 15, offset: const Offset(0, 8))],
      ),
      child: Column(
        children: [
          const Icon(Icons.cloud_upload_outlined, size: 42, color: Colors.white),
          const SizedBox(height: 10),
          const Text('Upload Medical Report', style: TextStyle(fontFamily: 'Poppins', fontSize: 15, fontWeight: FontWeight.w600, color: Colors.white)),
          const SizedBox(height: 6),
          Text(
            'Keep all your health records organized. AI OCR will scan and extract vital information.',
            textAlign: TextAlign.center,
            style: TextStyle(fontFamily: 'Poppins', fontSize: 11, color: Colors.white.withValues(alpha: 0.9)),
          ),
          const SizedBox(height: 14),
          ElevatedButton(
            onPressed: _isUploading ? null : _pickAndUploadReport,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: AppColors.primaryGreen,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
            ),
            child: _isUploading
                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: AppColors.primaryGreen, strokeWidth: 2))
                : const Text('Select File', style: TextStyle(fontFamily: 'Poppins', fontSize: 12, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  Widget _buildReportCard(dynamic r) {
    final status = r['status']?.toString() ?? 'Pending';
    final isAnalyzed = status == 'Analysed';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.inputBorder.withValues(alpha: 0.5)),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.01), blurRadius: 5, offset: const Offset(0, 2))],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isAnalyzed ? const Color(0xFFEAF5EE) : const Color(0xFFFFF9E6),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              isAnalyzed ? Icons.check_circle_outline : Icons.pending_outlined,
              color: isAnalyzed ? AppColors.primaryGreen : Colors.orange,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  r['name'] ?? 'Report Document',
                  style: const TextStyle(fontFamily: 'Poppins', fontSize: 13.5, fontWeight: FontWeight.w600, color: AppColors.textDark),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  '${r['size'] ?? ''} • ${r['date'] ?? ''}',
                  style: const TextStyle(fontFamily: 'Poppins', fontSize: 11, color: AppColors.textMuted),
                ),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: isAnalyzed ? Colors.green.shade50 : Colors.orange.shade50,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    isAnalyzed ? 'AI ANALYZED' : 'PENDING ANALYSIS',
                    style: TextStyle(
                      fontFamily: 'Poppins',
                      fontSize: 8,
                      fontWeight: FontWeight.bold,
                      color: isAnalyzed ? AppColors.primaryGreen : Colors.orange,
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (isAnalyzed)
            IconButton(
              icon: const Icon(Icons.analytics_outlined, color: AppColors.primaryGreen),
              onPressed: () => _viewReportInsights(r),
              tooltip: 'View AI Insights',
            )
          else
            IconButton(
              icon: const Icon(Icons.auto_fix_high, color: Colors.orange),
              onPressed: () => _analyzeReport(r['id'].toString()),
              tooltip: 'Run AI OCR Analysis',
            ),
          IconButton(
            icon: const Icon(Icons.delete_outline, color: Colors.redAccent),
            onPressed: () => _deleteReport(r['id'].toString()),
            tooltip: 'Delete Report',
          ),
        ],
      ),
    );
  }
}
