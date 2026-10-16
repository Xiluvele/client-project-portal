import 'package:flutter/material.dart';

import '../api/portal_api.dart';
import '../widgets/portal_field.dart';

class AddUserScreen extends StatefulWidget {
  final String token;

  const AddUserScreen({super.key, required this.token});

  @override
  State<AddUserScreen> createState() => _AddUserScreenState();
}

class _AddUserScreenState extends State<AddUserScreen> {
  static const Color yellow = Color(0xFFFFEE0B);
  static const Color black = Color(0xFF0D0D0D);

  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _company = TextEditingController();
  String _role = 'developer';
  bool _loading = false;

  static const _roles = [
    ('administrator', 'Administrator'),
    ('manager', 'Project manager'),
    ('developer', 'Developer'),
    ('client', 'Client'),
  ];

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _phone.dispose();
    _company.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_name.text.trim().length < 2 || !_email.text.contains('@')) {
      _message('Name and a valid email are required.');
      return;
    }
    if (_role == 'client' && _company.text.trim().isEmpty) {
      _message('A client account needs a company name.');
      return;
    }
    if (widget.token.isEmpty) {
      _message('Sign in again. This session cannot add people.');
      return;
    }

    setState(() => _loading = true);
    final result = await PortalApi.post(
      '/api/accounts',
      {
        'name': _name.text.trim(),
        'email': _email.text.trim(),
        'role': _role,
        'phone': _phone.text.trim(),
        'company': _company.text.trim(),
        'link': '${PortalApi.portalUrl}/activate',
      },
      token: widget.token,
    );
    if (!mounted) return;
    setState(() => _loading = false);

    if (!result.ok) {
      _message(result.message);
      return;
    }

    final emailed = result.map['emailed'] == true;
    _message(
      emailed
          ? 'An activation email was sent to ${_email.text.trim()}.'
          : result.message,
    );
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
        title: const Text('Add user'),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(28),
          children: [
            Text(
              'Only an administrator can add someone. They receive a code and choose their own password.',
              style: TextStyle(color: Colors.grey.shade400, fontSize: 15),
            ),
            const SizedBox(height: 28),
            PortalField(label: 'Full name', controller: _name, hint: 'Full name'),
            const SizedBox(height: 18),
            PortalField(
              label: 'Email address',
              controller: _email,
              hint: 'name@company.co.za',
              keyboard: TextInputType.emailAddress,
            ),
            const SizedBox(height: 18),
            PortalField(
              label: 'Phone',
              controller: _phone,
              hint: 'Optional',
              keyboard: TextInputType.phone,
            ),
            const SizedBox(height: 18),
            const Text(
              'Role',
              style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 10),
            DropdownButtonFormField<String>(
              initialValue: _role,
              dropdownColor: const Color(0xFF1A1A1A),
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                filled: true,
                fillColor: const Color(0xFF1A1A1A),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide.none,
                ),
              ),
              items: _roles
                  .map((role) => DropdownMenuItem(value: role.$1, child: Text(role.$2)))
                  .toList(),
              onChanged: (value) {
                if (value != null) setState(() => _role = value);
              },
            ),
            if (_role == 'client') ...[
              const SizedBox(height: 18),
              PortalField(
                label: 'Company',
                controller: _company,
                hint: 'Company name',
              ),
            ],
            const SizedBox(height: 24),
            SizedBox(
              height: 55,
              child: ElevatedButton(
                onPressed: _loading ? null : _save,
                style: ElevatedButton.styleFrom(
                  backgroundColor: yellow,
                  foregroundColor: black,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: Text(
                  _loading ? 'Saving...' : 'Send activation email',
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
