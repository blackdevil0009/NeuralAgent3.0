import 'package:flutter/material.dart';

class AppColors {
  // Brand Colors (Ayurvedic Green Palette)
  static const Color gDark = Color(0xFF0D2410);
  static const Color gMid = Color(0xFF1A4228);
  static const Color gGreen = Color(0xFF2D6A4F);
  static const Color gLight = Color(0xFF52B788);
  static const Color gPale = Color(0xFFB7E4C7);

  // Accent Colors
  static const Color gold = Color(0xFFC9A84C);
  static const Color amber = Color(0xFFE9C46A);

  // Background & Surfaces
  static const Color white = Color(0xFFFFFFFF);
  static const Color offWhite = Color(0xFFF7FDF9);

  // Text Colors
  static const Color textDark = Color(0xFF1A2E1A);
  static const Color textMid = Color(0xFF3D5C3D);
  static const Color textMute = Color(0xFF6B8F71);

  // Gradients
  static const LinearGradient mainGradient = LinearGradient(
    colors: [gDark, gMid, gGreen],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient accentGradient = LinearGradient(
    colors: [gLight, gGreen],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient goldGradient = LinearGradient(
    colors: [gold, amber],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
