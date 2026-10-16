import 'package:flutter/material.dart';

import 'admin_home_screen.dart';
import 'audit_trail_screen.dart';
import 'developer_tasks_screen.dart';
import 'invoices_screen.dart';
import 'manager/manager_home_screen.dart';
import 'profile_screen.dart';
import 'role_home_screen.dart';
import 'team_screen.dart';

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

  String get _role => widget.role.trim().toLowerCase();

  bool get _isAdministrator => _role == 'administrator' || _role == 'admin';

  bool get _isManager => _role == 'manager' || _role == 'projectmanager' || _role == 'project manager';

  bool get _isDeveloper => _role == 'developer';

  bool get _isClient => _role == 'client';

  List<_Tab> get _tabs {
    final profile = ProfileScreen(name: widget.name, email: widget.email, role: widget.role);
    if (_isAdministrator) {
      return [
        _Tab('Team & Access', Icons.group_outlined, AdminHomeScreen(token: widget.token, userId: widget.userId)),
        _Tab('Audit trail', Icons.fact_check_outlined, AuditTrailScreen(token: widget.token, embedded: true)),
        _Tab('Profile', Icons.person_outline_rounded, profile),
      ];
    }
    if (_isManager) {
      return [
        _Tab(
          'Projects',
          Icons.folder_outlined,
          ManagerHomeScreen(
            userId: widget.userId,
            name: widget.name,
            email: widget.email,
            role: widget.role,
            token: widget.token,
          ),
        ),
        _Tab('Invoices', Icons.receipt_long_outlined, InvoicesScreen(token: widget.token)),
        _Tab('Team', Icons.groups_outlined, TeamScreen(token: widget.token)),
        _Tab('Profile', Icons.person_outline_rounded, profile),
      ];
    }
    if (_isDeveloper) {
      return [
        _Tab(
          'Projects',
          Icons.folder_outlined,
          RoleHomeScreen(
            name: widget.name,
            email: widget.email,
            role: widget.role,
            clientId: widget.clientId,
            memberId: widget.memberId,
            userId: widget.userId,
            token: widget.token,
          ),
        ),
        _Tab(
          'My tasks',
          Icons.checklist_rounded,
          DeveloperTasksScreen(
            name: widget.name,
            email: widget.email,
            role: widget.role,
            clientId: widget.clientId,
            memberId: widget.memberId,
            userId: widget.userId,
            token: widget.token,
          ),
        ),
        _Tab('Profile', Icons.person_outline_rounded, profile),
      ];
    }
    return [
      _Tab(
        'Dashboard',
        Icons.home_rounded,
        RoleHomeScreen(
          name: widget.name,
          email: widget.email,
          role: _isClient ? widget.role : 'client',
          clientId: widget.clientId,
          memberId: widget.memberId,
          userId: widget.userId,
          token: widget.token,
        ),
      ),
      _Tab('Invoices', Icons.receipt_long_outlined, InvoicesScreen(token: widget.token, canDecide: true)),
      _Tab('Profile', Icons.person_outline_rounded, profile),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final tabs = _tabs;
    final index = _selectedIndex.clamp(0, tabs.length - 1);
    return Scaffold(
      backgroundColor: black,
      body: IndexedStack(
        index: index,
        children: [for (final tab in tabs) tab.page],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: index,
        onTap: (next) => setState(() => _selectedIndex = next),
        backgroundColor: const Color(0xFF151515),
        selectedItemColor: yellow,
        unselectedItemColor: Colors.grey,
        type: BottomNavigationBarType.fixed,
        showUnselectedLabels: true,
        items: [
          for (final tab in tabs) BottomNavigationBarItem(icon: Icon(tab.icon), label: tab.label),
        ],
      ),
    );
  }
}

class _Tab {
  final String label;
  final IconData icon;
  final Widget page;

  const _Tab(this.label, this.icon, this.page);
}
