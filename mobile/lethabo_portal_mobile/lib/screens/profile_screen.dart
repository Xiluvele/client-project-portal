import 'package:flutter/material.dart';

import 'login_screen.dart';

class ProfileScreen extends StatelessWidget {
  final String name;
  final String email;
  final String role;

  const ProfileScreen({
    super.key,
    required this.name,
    required this.email,
    required this.role,
  });

  static const yellow = Color(0xFFFFEE0B);
  static const black = Color(0xFF0D0D0D);
  static const cardColor = Color(0xFF1A1A1A);

  String get _initials {
    final parts = name.trim().split(RegExp(r'\s+')).where((part) => part.isNotEmpty);
    final letters = parts.take(2).map((part) => part[0].toUpperCase()).join();
    return letters.isEmpty ? 'LM' : letters;
  }

  String get _roleLabel {
    switch (role.trim().toLowerCase()) {
      case 'administrator':
      case 'admin':
        return 'Administrator';
      case 'manager':
      case 'projectmanager':
      case 'project manager':
        return 'Project Manager';
      case 'developer':
        return 'Developer';
      case 'client':
        return 'Client';
      default:
        return role.trim().isEmpty ? 'Team member' : role.trim();
    }
  }

  void _logout(BuildContext context) {
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (_) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(22, 28, 22, 32),
        children: [
          const Text('Profile', style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold)),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(color: cardColor, borderRadius: BorderRadius.circular(20)),
            child: Column(
              children: [
                CircleAvatar(
                  radius: 36,
                  backgroundColor: yellow,
                  child: Text(_initials, style: const TextStyle(color: black, fontSize: 22, fontWeight: FontWeight.bold)),
                ),
                const SizedBox(height: 16),
                Text(name.trim().isEmpty ? 'User' : name.trim(), style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                Text(email, style: const TextStyle(color: Colors.grey)),
                const SizedBox(height: 10),
                Text(_roleLabel, style: const TextStyle(color: yellow, fontWeight: FontWeight.w700)),
              ],
            ),
          ),
          const SizedBox(height: 18),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: yellow,
                foregroundColor: black,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              onPressed: () => _logout(context),
              child: const Text('Log out', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }
}
