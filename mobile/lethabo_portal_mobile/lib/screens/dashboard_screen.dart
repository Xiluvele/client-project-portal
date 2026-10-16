import 'package:flutter/material.dart';

import 'admin_home_screen.dart';
import 'manager/manager_home_screen.dart';
import 'messages_screen.dart';
import 'profile_screen.dart';
import 'role_home_screen.dart';

class DashboardScreen extends StatefulWidget {
  final String userId;
  final String name;
  final String email;
  final String role;
  final String clientId;
  final String memberId;
  final String title;
  final String token;

  const DashboardScreen({
    super.key,
    required this.userId,
    required this.name,
    required this.email,
    required this.role,
    required this.clientId,
    required this.memberId,
    required this.title,
    this.token = '',
  });

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  static const yellow = Color(0xFFFFEE0B);
  static const black = Color(0xFF0D0D0D);

  int _selectedIndex = 0;

  bool get _isAdministrator {
    final role = widget.role.trim().toLowerCase();
    return role == 'administrator' || role == 'admin';
  }

  bool get _isManager {
    final role = widget.role.trim().toLowerCase();
    return role == 'manager' || role == 'projectmanager' || role == 'project manager';
  }

  @override
  Widget build(BuildContext context) {
    final home = _isAdministrator
        ? AdminHomeScreen(token: widget.token, userId: widget.userId)
        : _isManager
            ? ManagerHomeScreen(
                userId: widget.userId,
                name: widget.name,
                email: widget.email,
                role: widget.role,
                token: widget.token,
              )
            : RoleHomeScreen(
                name: widget.name,
                email: widget.email,
                role: widget.role,
                clientId: widget.clientId,
                memberId: widget.memberId,
                userId: widget.userId,
                token: widget.token,
              );

    return Scaffold(
      backgroundColor: black,
      body: IndexedStack(
        index: _selectedIndex,
        children: [
          home,
          MessagesScreen(
            token: widget.token,
            role: _isAdministrator ? 'administrator' : widget.role,
            clientId: widget.clientId,
            memberId: widget.memberId,
            userId: widget.userId,
            email: widget.email,
          ),
          ProfileScreen(name: widget.name, email: widget.email, role: widget.role),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: (index) => setState(() => _selectedIndex = index),
        backgroundColor: const Color(0xFF151515),
        selectedItemColor: yellow,
        unselectedItemColor: Colors.grey,
        type: BottomNavigationBarType.fixed,
        showUnselectedLabels: true,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home_rounded), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.chat_bubble_outline_rounded), label: 'Messages'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline_rounded), label: 'Profile'),
        ],
      ),
    );
  }
}
