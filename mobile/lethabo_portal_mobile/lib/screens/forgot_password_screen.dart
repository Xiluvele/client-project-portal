import 'package:flutter/material.dart';

import '../api/portal_api.dart';
import '../widgets/portal_field.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  static const Color yellow = Color(0xFFFFEE0B);
  static const Color black = Color(0xFF0D0D0D);

  final _email = TextEditingController();
  final _code = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  bool _sent = false;
  bool _loading = false;
  bool _hide = true;
  String _notice = '';

  @override
  void dispose() {
    _email.dispose();
    _code.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _sendCode() async {
    final email = _email.text.trim();
    if (!email.contains('@')) {
      _message('Enter a valid email address.');
      return;
    }

    setState(() => _loading = true);
    final result = await PortalApi.post('/api/auth/forgot-password', {
      'email': email,
    });
    if (!mounted) return;
    setState(() => _loading = false);

    if (!result.ok) {
      _message(result.message);
      return;
    }

    setState(() {
      _sent = true;
      _notice = result.message;
    });
  }

  Future<void> _save() async {
    if (_password.text != _confirm.text) {
      _message('The passwords do not match.');
      return;
    }
    if (_password.text.length < 8) {
      _message('The password must be at least 8 characters.');
      return;
    }
    if (_code.text.trim().length != 6) {
      _message('Please enter the 6-digit reset code.');
      return;
    }

    setState(() => _loading = true);
    final result = await PortalApi.post('/api/auth/reset-password', {
      'email': _email.text.trim(),
      'code': _code.text.trim(),
      'password': _password.text,
    });
    if (!mounted) return;
    setState(() => _loading = false);

    if (!result.ok) {
      _message(result.message);
      return;
    }

    _message(result.message);
    Navigator.pop(context);
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
        title: const Text('Forgot password'),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(28),
          children: [
            Text(
              _sent
                  ? 'Enter the 6-digit code from the email, then choose a new password. The code expires in 15 minutes.'
                  : 'Enter the email on your account. A code is sent only when that account is active.',
              style: TextStyle(color: Colors.grey.shade400, fontSize: 15),
            ),
            if (_notice.isNotEmpty) ...[
              const SizedBox(height: 16),
              Text(_notice, style: const TextStyle(color: Color(0xFF1F8A4C))),
            ],
            const SizedBox(height: 28),
            PortalField(
              label: 'Email address',
              controller: _email,
              hint: 'name@company.co.za',
              keyboard: TextInputType.emailAddress,
              readOnly: _sent,
            ),
            if (_sent) ...[
              const SizedBox(height: 18),
              PortalField(
                label: 'Reset code',
                controller: _code,
                hint: '6-digit code',
                keyboard: TextInputType.number,
                maxLength: 6,
              ),
              const SizedBox(height: 18),
              PortalField(
                label: 'New password',
                controller: _password,
                hint: 'At least 8 characters',
                obscure: _hide,
                suffix: IconButton(
                  onPressed: () => setState(() => _hide = !_hide),
                  icon: Icon(
                    _hide ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                    color: Colors.grey,
                  ),
                ),
              ),
              const SizedBox(height: 18),
              PortalField(
                label: 'Confirm password',
                controller: _confirm,
                hint: 'Repeat the password',
                obscure: _hide,
              ),
            ],
            const SizedBox(height: 24),
            SizedBox(
              height: 55,
              child: ElevatedButton(
                onPressed: _loading ? null : (_sent ? _save : _sendCode),
                style: ElevatedButton.styleFrom(
                  backgroundColor: yellow,
                  foregroundColor: black,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: Text(
                  _loading
                      ? 'Please wait...'
                      : _sent
                          ? 'Update password'
                          : 'Email reset code',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
