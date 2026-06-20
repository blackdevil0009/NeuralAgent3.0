import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// VaidyaMed-X gradient action button.
class VxButton extends StatelessWidget {
  const VxButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.isLoading = false,
    this.gradient = AppColors.buttonGradient,
    this.textColor = AppColors.white,
    this.outlined = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final LinearGradient gradient;
  final Color textColor;
  final bool outlined;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 50,
      child: outlined
          ? OutlinedButton(
              onPressed: isLoading ? null : onPressed,
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppColors.primaryGreen, width: 2),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppDimens.radiusButton),
                ),
              ),
              child: Text(label,
                  style: AppTextStyles.buttonText
                      .copyWith(color: AppColors.primaryGreen)),
            )
          : DecoratedBox(
              decoration: BoxDecoration(
                gradient: onPressed == null || isLoading
                    ? const LinearGradient(colors: [Colors.grey, Colors.grey])
                    : gradient,
                borderRadius: BorderRadius.circular(AppDimens.radiusButton),
                boxShadow: (onPressed != null && !isLoading)
                    ? [
                        BoxShadow(
                          color: AppColors.primaryGreen.withOpacity(0.4),
                          blurRadius: 18,
                          offset: const Offset(0, 6),
                        ),
                      ]
                    : [],
              ),
              child: ElevatedButton(
                onPressed: isLoading ? null : onPressed,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  shape: RoundedRectangleBorder(
                    borderRadius:
                        BorderRadius.circular(AppDimens.radiusButton),
                  ),
                ),
                child: isLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.5,
                          color: Colors.white,
                        ),
                      )
                    : Text(label, style: AppTextStyles.buttonText),
              ),
            ),
    );
  }
}

/// Page header with logo, tagline & lotus emoji.
class VxHeader extends StatelessWidget {
  const VxHeader({super.key, this.compact = false});

  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.fromLTRB(
        24, compact ? 24 : 32, 24, compact ? 20 : 26),
      decoration: const BoxDecoration(
        gradient: AppColors.headerGradient,
      ),
      child: Column(
        children: [
          Text('VaidyaMed-X', style: AppTextStyles.logo),
          const SizedBox(height: 4),
          const Text('🌿', style: TextStyle(fontSize: 18)),
          const SizedBox(height: 4),
          Text(
            'Bridging Ayurveda with Modern Healthcare',
            style: AppTextStyles.tagline,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

/// Role selector pill tabs (Patient / Doctor).
class VxRoleTabs extends StatelessWidget {
  const VxRoleTabs({
    super.key,
    required this.roles,
    required this.selected,
    required this.onSelect,
  });

  final List<String> roles;
  final int selected;
  final void Function(int) onSelect;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: List.generate(roles.length, (i) {
        final active = i == selected;
        return Expanded(
          child: GestureDetector(
            onTap: () => onSelect(i),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: EdgeInsets.only(
                  left: i == 0 ? 0 : 6, right: i == roles.length - 1 ? 0 : 6),
              padding: const EdgeInsets.symmetric(vertical: 9),
              decoration: BoxDecoration(
                color: active ? AppColors.primaryGreen : Colors.transparent,
                borderRadius: BorderRadius.circular(50),
                border: Border.all(color: AppColors.primaryLight, width: 1.8),
                boxShadow: active
                    ? [
                        BoxShadow(
                          color: AppColors.primaryGreen.withOpacity(0.28),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ]
                    : [],
              ),
              alignment: Alignment.center,
              child: Text(
                roles[i],
                style: TextStyle(
                  fontFamily: 'Poppins',
                  fontSize: 11.5,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.5,
                  color:
                      active ? Colors.white : AppColors.primaryGreen,
                ),
              ),
            ),
          ),
        );
      }),
    );
  }
}

/// Bottom Shloka banner.
class VxShlokaBanner extends StatelessWidget {
  const VxShlokaBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      decoration: const BoxDecoration(
        color: Color(0xFFEAF5EE),
        border: Border(
          top: BorderSide(color: Color(0x1A2D6A4F), width: 1.5),
        ),
      ),
      child: const Text(
        '"सर्वे भवन्तु सुखिनः सर्वे सन्तु निरामयाः"',
        style: AppTextStyles.shloka,
        textAlign: TextAlign.center,
      ),
    );
  }
}
