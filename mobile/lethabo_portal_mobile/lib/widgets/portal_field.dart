import 'package:flutter/material.dart';

class PasswordField extends StatefulWidget {
  final String label;
  final TextEditingController controller;
  final String hint;

  const PasswordField({
    super.key,
    required this.label,
    required this.controller,
    required this.hint,
  });

  @override
  State<PasswordField> createState() => _PasswordFieldState();
}

class _PasswordFieldState extends State<PasswordField> {
  bool _hide = true;

  @override
  Widget build(BuildContext context) {
    return PortalField(
      label: widget.label,
      controller: widget.controller,
      hint: widget.hint,
      obscure: _hide,
      suffix: IconButton(
        onPressed: () => setState(() => _hide = !_hide),
        icon: Icon(
          _hide ? Icons.visibility_off_outlined : Icons.visibility_outlined,
          color: Colors.grey,
        ),
      ),
    );
  }
}

class PortalField extends StatelessWidget {
  final String label;
  final TextEditingController controller;
  final String hint;
  final bool obscure;
  final TextInputType keyboard;
  final Widget? suffix;
  final int? maxLength;
  final bool readOnly;

  const PortalField({
    super.key,
    required this.label,
    required this.controller,
    required this.hint,
    this.obscure = false,
    this.keyboard = TextInputType.text,
    this.suffix,
    this.maxLength,
    this.readOnly = false,
  });

  static const Color yellow = Color(0xFFFFEE0B);

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: controller,
          obscureText: obscure,
          readOnly: readOnly,
          keyboardType: keyboard,
          maxLength: maxLength,
          autocorrect: false,
          style: const TextStyle(color: Colors.white),
          decoration: InputDecoration(
            counterText: '',
            hintText: hint,
            hintStyle: TextStyle(color: Colors.grey.shade600),
            suffixIcon: suffix,
            filled: true,
            fillColor: const Color(0xFF1A1A1A),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: yellow, width: 1.5),
            ),
          ),
        ),
      ],
    );
  }
}
