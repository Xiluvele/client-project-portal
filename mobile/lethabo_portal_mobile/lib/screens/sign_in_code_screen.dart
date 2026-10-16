import 'package:flutter/material.dart';

import '../api/portal_api.dart';
import '../widgets/portal_field.dart';
import 'dashboard_screen.dart';

class SignInCodeScreen extends StatefulWidget {
  final PortalUser user;
  final String initialCode;
  final bool emailed;

  const SignInCodeScreen({
    super.key,
    required this.user,
    required this.initialCode,
    required this.emailed,
  });

  @override
  State<SignInCodeScreen> createState() => _SignInCodeScreenState();
}

class _SignInCodeScreenState extends State<SignInCodeScreen> {
  static const Color yellow = Color(0xFFFFEE0B);
  static const Color black = Color(0xFF0D0D0D);

  final _codeController = TextEditingController();
  late String _expected;
  late bool _emailed;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _expected = widget.initialCode;
    _emailed = widget.emailed;
  }

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _confirm() async {
    final code = _codeController.text.trim();
    if (code != _expected) {
      _message('That code does not match the email. Try again.');
      return;
    }

    if (!mounted) return;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (context) => DashboardScreen(
          userId: widget.user.id,
          name: widget.user.name,
          email: widget.user.email,
          role: widget.user.role,
          clientId: widget.user.clientId,
          memberId: widget.user.memberId,
          title: widget.user.title,
          token: widget.user.token,
        ),
      ),
    );
  }

  Future<void> _resend() async {
    setState(() => _loading = true);
    final code = PortalApi.sixDigitCode();
    final result = await PortalApi.post('/api/auth/email-code', {
      'email': widget.user.email,
      'name': widget.user.name,
      'code': code,
      'purpose': 'login',
    });
    if (!mounted) return;
    setState(() {
      _loading = false;
      _expected = code;
      _emailed = result.ok && result.map['sent'] == true;
    });
    _message(
      _emailed
          ? 'A new code was sent to ${widget.user.email}.'
          : 'The email could not be sent. Use this code: $code',
    );
  }

  void _message(String text) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(text), backgroundColor: const Color(0xFF1A1A1A)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: black,
      appBar: AppBar(
        backgroundColor: black,
        foregroundColor: Colors.white,
        title: const Text('Sign-in code'),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(28),
          children: [
            Text(
              _emailed
                  ? 'Enter the 6-digit code sent to ${widget.user.email}. It expires in 10 minutes.'
                  : 'The email could not be sent. Your code is $_expected.',
              style: TextStyle(color: Colors.grey.shade400, fontSize: 15),
            ),
            const SizedBox(height: 28),
            PortalField(
              label: 'Sign-in code',
              controller: _codeController,
              hint: '6-digit code',
              keyboard: TextInputType.number,
              maxLength: 6,
            ),
            const SizedBox(height: 22),
            SizedBox(
              height: 55,
              child: ElevatedButton(
                onPressed: _loading ? null : _confirm,
                style: ElevatedButton.styleFrom(
                  backgroundColor: yellow,
                  foregroundColor: black,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: const Text(
                  'Continue',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ),
            ),
            TextButton(
              onPressed: _loading ? null : _resend,
              child: const Text(
                'Resend code',
                style: TextStyle(color: yellow, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
