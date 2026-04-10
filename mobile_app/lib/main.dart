import 'package:flutter/material.dart';
import 'constants/app_theme.dart';
import 'pages/home_page.dart';

void main() {
  runApp(const VaidyaMedApp());
}

class VaidyaMedApp extends StatelessWidget {
  const VaidyaMedApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'VaidyaMed-X',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: const HomePage(),
    );
  }
}
