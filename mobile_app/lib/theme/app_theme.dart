import 'package:flutter/material.dart';

/// VaidyaMed-X Design System – matches the web frontend palette exactly.
class AppColors {
  AppColors._();

  static const Color primaryGreen  = Color(0xFF2D6A4F);
  static const Color primaryDark   = Color(0xFF162E1E);
  static const Color primaryLight  = Color(0xFF52B788);
  static const Color accentGold    = Color(0xFFC9A84C);
  static const Color accentAmber   = Color(0xFFE9C46A);
  static const Color bgDark        = Color(0xFF0B2410);
  static const Color bgMid         = Color(0xFF18402A);
  static const Color inputBorder   = Color(0xFFB7D9C2);
  static const Color inputFocus    = Color(0xFF2D6A4F);
  static const Color errorRed      = Color(0xFFC0392B);
  static const Color textDark      = Color(0xFF1A2E1A);
  static const Color textMuted     = Color(0xFF5A755A);
  static const Color cardBg        = Color(0xFFF7FDF9);
  static const Color white         = Colors.white;

  static const LinearGradient backgroundGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF0B2410), Color(0xFF18402A), Color(0xFF2D6A4F), Color(0xFF162E1E)],
    stops: [0.0, 0.4, 0.72, 1.0],
  );

  static const LinearGradient headerGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF2D6A4F), Color(0xFF162E1E)],
  );

  static const LinearGradient buttonGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF2D6A4F), Color(0xFF162E1E)],
  );
}

class AppTextStyles {
  AppTextStyles._();

  static const String fontFamily = 'Poppins';

  static const TextStyle logo = TextStyle(
    fontFamily: 'PlayfairDisplay',
    fontSize: 26,
    fontWeight: FontWeight.w700,
    color: AppColors.accentGold,
    letterSpacing: 2.5,
  );

  static const TextStyle tagline = TextStyle(
    fontFamily: fontFamily,
    fontSize: 11,
    fontStyle: FontStyle.italic,
    color: Color(0xB3FFFFFF),
    letterSpacing: 0.5,
  );

  static const TextStyle welcomeTitle = TextStyle(
    fontFamily: 'PlayfairDisplay',
    fontSize: 20,
    fontWeight: FontWeight.w700,
    color: AppColors.primaryGreen,
  );

  static const TextStyle sectionSub = TextStyle(
    fontFamily: fontFamily,
    fontSize: 12,
    color: AppColors.textMuted,
  );

  static const TextStyle label = TextStyle(
    fontFamily: fontFamily,
    fontSize: 10.5,
    fontWeight: FontWeight.w600,
    color: AppColors.textMuted,
    letterSpacing: 0.5,
  );

  static const TextStyle inputText = TextStyle(
    fontFamily: fontFamily,
    fontSize: 13.5,
    color: AppColors.textDark,
  );

  static const TextStyle buttonText = TextStyle(
    fontFamily: fontFamily,
    fontSize: 15,
    fontWeight: FontWeight.w600,
    color: AppColors.white,
    letterSpacing: 1.0,
  );

  static const TextStyle link = TextStyle(
    fontFamily: fontFamily,
    fontSize: 12.5,
    fontWeight: FontWeight.w600,
    color: AppColors.primaryGreen,
  );

  static const TextStyle shloka = TextStyle(
    fontFamily: fontFamily,
    fontSize: 11,
    fontStyle: FontStyle.italic,
    color: AppColors.primaryGreen,
    letterSpacing: 0.3,
  );
}

class AppDimens {
  AppDimens._();
  static const double radiusCard   = 24.0;
  static const double radiusInput  = 12.0;
  static const double radiusButton = 50.0;
  static const double paddingH     = 24.0;
  static const double paddingV     = 18.0;
  static const double inputHeight  = 50.0;
}
