import 'package:flutter/material.dart';
import '../constants/app_colors.dart';

class GradientBackground extends StatelessWidget {
  final Widget child;
  final List<Color>? colors;

  const GradientBackground({
    super.key,
    required this.child,
    this.colors,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: colors ?? [
            AppColors.gDark,
            AppColors.gMid,
            AppColors.gGreen,
            const Color(0xFF111E13),
          ],
        ),
      ),
      child: Stack(
        children: [
          // Subtle decorative circles (mimicking the web's radial gradients)
          Positioned(
            top: -100,
            left: -100,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.gLight.withOpacity(0.15),
              ),
            ),
          ),
          Positioned(
            bottom: -50,
            right: -50,
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.gold.withOpacity(0.1),
              ),
            ),
          ),
          child,
        ],
      ),
    );
  }
}
