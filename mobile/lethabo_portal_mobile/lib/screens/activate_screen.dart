import 'package:flutter/material.dart';

import '../api/portal_api.dart';
import '../widgets/portal_field.dart';

class ActivateScreen extends StatefulWidget {
  const ActivateScreen({super.key});

  @override
  State<ActivateScreen> createState() => _ActivateScreenState();
}

class _ActivateScreenState extends State<ActivateScreen> {
  static const Color yellow = Color(0xFFFFEE0B);
  static const Color black = Color(0xFF0D0D0D);

  final _email = TextEditingController();
  final _code = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  bool _loading = false;
  bool _hide = true;

  @override
  void dispose() {
    _email.dispose();
    _code.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_password.text != _confirm.text) {
      _message('The passwords do not match.');
      return;
    }
    if (_password.text.length < 8) {
      _message('The password must be at least 8 characters.');
      return;
    }
    if (_code.text.trim().length != 6) {
      _message('Please enter the 6-digit activation code.');
      return;
    }

    setState(() => _loading = true);
    final result = await PortalApi.post('/api/accounts/activate', {
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

    _message('Your password is saved. Sign in with it.');
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
        title: const Text('Activate account'),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(28),
          children: [
            Text(
              'Enter the code from the email an administrator sent, then choose a password.',
              style: TextStyle(color: Colors.grey.shade400, fontSize: 15),
            ),
            const SizedBox(height: 28),
            PortalField(
              label: 'Email address',
              controller: _email,
              hint: 'name@company.co.za',
              keyboard: TextInputType.emailAddress,
            ),
            const SizedBox(height: 18),
            PortalField(
              label: 'Activation code',
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
            const SizedBox(height: 24),
            SizedBox(
              height: 55,
              child: ElevatedButton(
                onPressed: _loading ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: yellow,
                  foregroundColor: black,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: Text(
                  _loading ? 'Activating...' : 'Activate and continue',
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
