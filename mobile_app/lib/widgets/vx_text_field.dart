import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class VxTextField extends StatefulWidget {
  const VxTextField({
    super.key,
    required this.label,
    required this.hint,
    this.icon,
    this.isPassword = false,
    this.keyboardType = TextInputType.text,
    this.controller,
    this.validator,
    this.textInputAction = TextInputAction.next,
    this.onFieldSubmitted,
    this.maxLines = 1,
    this.readOnly = false,
  });

  final String label;
  final String hint;
  final IconData? icon;
  final bool isPassword;
  final TextInputType keyboardType;
  final TextEditingController? controller;
  final String? Function(String?)? validator;
  final TextInputAction textInputAction;
  final void Function(String)? onFieldSubmitted;
  final int maxLines;
  final bool readOnly;

  @override
  State<VxTextField> createState() => _VxTextFieldState();
}

class _VxTextFieldState extends State<VxTextField> {
  bool _obscure = true;
  bool _focused = false;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(widget.label.toUpperCase(), style: AppTextStyles.label),
        const SizedBox(height: 5),
        Focus(
          onFocusChange: (v) => setState(() => _focused = v),
          child: TextFormField(
            controller: widget.controller,
            obscureText: widget.isPassword && _obscure,
            keyboardType: widget.keyboardType,
            textInputAction: widget.textInputAction,
            onFieldSubmitted: widget.onFieldSubmitted,
            style: AppTextStyles.inputText,
            validator: widget.validator,
            maxLines: widget.isPassword ? 1 : widget.maxLines,
            readOnly: widget.readOnly,
            decoration: InputDecoration(
              hintText: widget.hint,
              hintStyle: const TextStyle(
                color: Color(0xFFAEC8B4),
                fontSize: 13,
                fontFamily: 'Poppins',
              ),
              prefixIcon: widget.icon != null
                  ? Icon(widget.icon,
                      size: 18,
                      color: _focused
                          ? AppColors.primaryGreen
                          : AppColors.textMuted)
                  : null,
              suffixIcon: widget.isPassword
                  ? IconButton(
                      icon: Icon(
                        _obscure
                            ? Icons.visibility_outlined
                            : Icons.visibility_off_outlined,
                        size: 18,
                        color: AppColors.textMuted,
                      ),
                      onPressed: () => setState(() => _obscure = !_obscure),
                    )
                  : null,
              filled: true,
              fillColor: _focused ? Colors.white : AppColors.cardBg,
              contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16, vertical: 14),
              border: OutlineInputBorder(
                borderRadius:
                    BorderRadius.circular(AppDimens.radiusInput),
                borderSide: const BorderSide(color: AppColors.inputBorder, width: 1.8),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius:
                    BorderRadius.circular(AppDimens.radiusInput),
                borderSide: const BorderSide(color: AppColors.inputBorder, width: 1.8),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius:
                    BorderRadius.circular(AppDimens.radiusInput),
                borderSide:
                    const BorderSide(color: AppColors.inputFocus, width: 2),
              ),
              errorBorder: OutlineInputBorder(
                borderRadius:
                    BorderRadius.circular(AppDimens.radiusInput),
                borderSide:
                    const BorderSide(color: AppColors.errorRed, width: 1.8),
              ),
              focusedErrorBorder: OutlineInputBorder(
                borderRadius:
                    BorderRadius.circular(AppDimens.radiusInput),
                borderSide:
                    const BorderSide(color: AppColors.errorRed, width: 2),
              ),
              errorStyle: const TextStyle(
                fontFamily: 'Poppins',
                fontSize: 10.5,
                color: AppColors.errorRed,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
