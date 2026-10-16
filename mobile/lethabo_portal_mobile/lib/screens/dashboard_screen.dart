import 'package:flutter/material.dart';
import 'add_user_screen.dart';
import 'audit_trail_screen.dart';
import 'manager/manager_home_screen.dart';
import 'projects/projects_screen.dart';
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
  static const Color yellow = Color(0xFFFFEE0B);
  static const Color black = Color(0xFF0D0D0D);
  static const Color cardColor = Color(0xFF1A1A1A);

  int _selectedIndex = 0;

  String get _displayName =>
      widget.name.trim().isEmpty ? 'User' : widget.name.trim();

  String get _roleLabel {
    final role = widget.role.trim().toLowerCase();

    switch (role) {
      case 'manager':
      case 'projectmanager':
      case 'project manager':
        return 'Project Manager';
      case 'administrator':
      case 'admin':
        return 'Administrator';
      case 'developer':
        return 'Developer';
      case 'client':
        return 'Client';
      default:
        return widget.title.trim().isNotEmpty
            ? widget.title.trim()
            : 'Team Member';
    }
  }

  bool get _isAdministrator => widget.role.trim().toLowerCase() == 'administrator';

  bool get _isManager {
    final role = widget.role.trim().toLowerCase();
    return role == 'manager' ||
        role == 'projectmanager' ||
        role == 'project manager';
  }

  bool get _isClient => widget.role.trim().toLowerCase() == 'client';

  bool get _isDeveloper => widget.role.trim().toLowerCase() == 'developer';

  @override
  Widget build(BuildContext context) {
    if (_isManager) {
      return ManagerHomeScreen(
        userId: widget.userId,
        name: widget.name,
        email: widget.email,
        role: widget.role,
        token: widget.token,
      );
    }

    if (_isClient || _isDeveloper) {
      return RoleHomeScreen(
        name: widget.name,
        role: widget.role,
        clientId: widget.clientId,
        memberId: widget.memberId,
        token: widget.token,
      );
    }

    return Scaffold(
      backgroundColor: black,

      // =========================
      // BODY
      // =========================
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(22, 20, 22, 30),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // =========================
              // HEADER
              // =========================
              Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: yellow,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Center(
                      child: Text(
                        'L',
                        style: TextStyle(
                          color: black,
                          fontSize: 25,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(width: 14),

                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Welcome back,',
                          style: TextStyle(color: Colors.grey, fontSize: 13),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          _displayName,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _roleLabel,
                          style: const TextStyle(
                            color: yellow,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),

                  Container(
                    decoration: BoxDecoration(
                      color: cardColor,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: IconButton(
                      onPressed: () {},
                      icon: const Icon(
                        Icons.notifications_none_rounded,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 32),

              // =========================
              // TITLE
              // =========================
              const Text(
                'Dashboard',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                ),
              ),

              const SizedBox(height: 7),

              Text(
                _isManager
                    ? 'Here\'s what\'s happening across your client projects.'
                    : 'Here\'s what\'s happening with your projects.',
                style: const TextStyle(color: Colors.grey, fontSize: 14),
              ),

              if (_isAdministrator) ...[
                const SizedBox(height: 28),
                _adminAction(
                  icon: Icons.person_add_alt_1_rounded,
                  title: 'Add user',
                  subtitle: 'Send an activation email. Only an administrator can do this.',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => AddUserScreen(token: widget.token),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 12),
                _adminAction(
                  icon: Icons.fact_check_outlined,
                  title: 'Audit trail',
                  subtitle: 'User access, accounts, and everything that was recorded.',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => AuditTrailScreen(token: widget.token),
                      ),
                    );
                  },
                ),
              ],

              const SizedBox(height: 28),

              // =========================
              // PROJECT SUMMARY
              // =========================
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  color: yellow,
                  borderRadius: BorderRadius.circular(22),
                ),
                child: const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Project Overview',
                          style: TextStyle(
                            color: black,
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        Icon(Icons.folder_open_rounded, color: black),
                      ],
                    ),

                    SizedBox(height: 22),

                    Text(
                      '3',
                      style: TextStyle(
                        color: black,
                        fontSize: 40,
                        fontWeight: FontWeight.bold,
                      ),
                    ),

                    Text(
                      'Active Projects',
                      style: TextStyle(color: black, fontSize: 14),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 18),

              // =========================
              // SMALL SUMMARY CARDS
              // =========================
              Row(
                children: [
                  Expanded(
                    child: _summaryCard(
                      icon: Icons.task_alt_rounded,
                      number: '12',
                      label: 'Tasks',
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: _summaryCard(
                      icon: Icons.pending_actions_rounded,
                      number: '4',
                      label: 'Pending',
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 32),

              // =========================
              // ACTIVE PROJECTS TITLE
              // =========================
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Active Projects',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 19,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  TextButton(
                    onPressed: () {},
                    child: const Text(
                      'View all',
                      style: TextStyle(
                        color: yellow,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 12),

              // =========================
              // PROJECT CARD 1
              // =========================
              _projectCard(
                title: 'Company Website',
                category: 'Web Development',
                progress: 0.75,
                progressText: '75%',
                dueDate: '15 Oct 2026',
              ),

              const SizedBox(height: 15),

              // =========================
              // PROJECT CARD 2
              // =========================
              _projectCard(
                title: 'Mobile Application',
                category: 'Mobile Development',
                progress: 0.45,
                progressText: '45%',
                dueDate: '30 Oct 2026',
              ),

              const SizedBox(height: 32),

              // =========================
              // RECENT ACTIVITY
              // =========================
              const Text(
                'Recent Activity',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 19,
                  fontWeight: FontWeight.bold,
                ),
              ),

              const SizedBox(height: 15),

              _activityItem(
                icon: Icons.check_circle_outline,
                title: 'Homepage design approved',
                time: '2 hours ago',
              ),

              const SizedBox(height: 12),

              _activityItem(
                icon: Icons.upload_file_outlined,
                title: 'New project document uploaded',
                time: 'Yesterday',
              ),
            ],
          ),
        ),
      ),

      // =========================
      // BOTTOM NAVIGATION
      // =========================
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: (index) {
          if (index == 1) {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => ProjectsScreen(
                  userId: widget.userId,
                  name: widget.name,
                  email: widget.email,
                  role: widget.role,
                  clientId: widget.clientId,
                  memberId: widget.memberId,
                  title: widget.title,
                ),
              ),
            );
          } else {
            setState(() {
              _selectedIndex = index;
            });
          }
        },
        backgroundColor: const Color(0xFF151515),
        selectedItemColor: yellow,
        unselectedItemColor: Colors.grey,
        type: BottomNavigationBarType.fixed,
        showUnselectedLabels: true,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home_rounded),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.folder_outlined),
            label: 'Projects',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.chat_bubble_outline_rounded),
            label: 'Messages',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person_outline_rounded),
            label: 'Profile',
          ),
        ],
      ),
    );
  }

  Widget _adminAction({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return Material(
      color: cardColor,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Row(
            children: [
              Icon(icon, color: yellow),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(subtitle, style: const TextStyle(color: Colors.grey, fontSize: 12)),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded, color: Colors.grey),
            ],
          ),
        ),
      ),
    );
  }

  // =========================
  // SUMMARY CARD
  // =========================
  Widget _summaryCard({
    required IconData icon,
    required String number,
    required String label,
  }) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: yellow, size: 25),
          const SizedBox(height: 18),
          Text(
            number,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 25,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 3),
          Text(label, style: const TextStyle(color: Colors.grey, fontSize: 13)),
        ],
      ),
    );
  }

  // =========================
  // PROJECT CARD
  // =========================
  Widget _projectCard({
    required String title,
    required String category,
    required double progress,
    required String progressText,
    required String dueDate,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 45,
                height: 45,
                decoration: BoxDecoration(
                  color: yellow.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.folder_outlined, color: yellow),
              ),

              const SizedBox(width: 14),

              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      category,
                      style: const TextStyle(color: Colors.grey, fontSize: 12),
                    ),
                  ],
                ),
              ),

              const Icon(Icons.chevron_right_rounded, color: Colors.grey),
            ],
          ),

          const SizedBox(height: 22),

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Progress',
                style: TextStyle(color: Colors.grey, fontSize: 12),
              ),
              Text(
                progressText,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),

          const SizedBox(height: 9),

          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 7,
              backgroundColor: const Color(0xFF333333),
              valueColor: const AlwaysStoppedAnimation<Color>(yellow),
            ),
          ),

          const SizedBox(height: 18),

          Row(
            children: [
              const Icon(
                Icons.calendar_today_outlined,
                color: Colors.grey,
                size: 15,
              ),
              const SizedBox(width: 7),
              Text(
                'Due $dueDate',
                style: const TextStyle(color: Colors.grey, fontSize: 12),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // =========================
  // ACTIVITY ITEM
  // =========================
  Widget _activityItem({
    required IconData icon,
    required String title,
    required String time,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: yellow.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: yellow, size: 21),
          ),

          const SizedBox(width: 13),

          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  time,
                  style: const TextStyle(color: Colors.grey, fontSize: 11),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
