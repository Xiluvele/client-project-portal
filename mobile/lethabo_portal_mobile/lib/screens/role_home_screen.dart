import 'package:flutter/material.dart';

import '../api/portal_api.dart';
import 'projects/projects_details_screen.dart';

class RoleHomeScreen extends StatefulWidget {
  final String name;
  final String role;
  final String clientId;
  final String memberId;
  final String userId;
  final String token;

  const RoleHomeScreen({
    super.key,
    required this.name,
    required this.role,
    required this.clientId,
    required this.memberId,
    this.userId = '',
    required this.token,
  });

  @override
  State<RoleHomeScreen> createState() => _RoleHomeScreenState();
}

class _RoleHomeScreenState extends State<RoleHomeScreen> {
  static const yellow = Color(0xFFFFEE0B);
  static const black = Color(0xFF0D0D0D);
  static const cardColor = Color(0xFF1A1A1A);

  static const statuses = [
    ('all', 'All'),
    ('in_progress', 'In Progress'),
    ('in_review', 'In Review'),
    ('at_risk', 'At Risk'),
    ('done', 'Done'),
  ];

  final _search = TextEditingController();
  List<Map<String, dynamic>> _projects = [];
  String _status = 'all';
  bool _loading = true;
  String? _error;

  bool get _isClient => widget.role.trim().toLowerCase() == 'client';

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  String get _firstName {
    final name = widget.name.trim();
    if (name.isEmpty) return 'there';
    return name.split(' ').first;
  }

  String get _greeting {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  String _statusKey(Object? value) {
    final text = (value ?? '').toString().trim().toLowerCase().replaceAll(' ', '_');
    if (text == 'inprogress') return 'in_progress';
    if (text == 'inreview') return 'in_review';
    if (text == 'atrisk') return 'at_risk';
    return text;
  }

  String _statusLabel(Object? value) {
    switch (_statusKey(value)) {
      case 'in_progress':
        return 'In Progress';
      case 'in_review':
        return 'In Review';
      case 'at_risk':
        return 'At Risk';
      case 'done':
        return 'Done';
      default:
        final text = (value ?? '').toString().trim();
        return text.isEmpty ? 'In Progress' : text;
    }
  }

  List<Map<String, dynamic>> get _mine {
    if (_isClient) {
      final id = widget.clientId.trim();
      if (id.isEmpty) return [];
      return _projects.where((project) => project['clientId']?.toString() == id).toList();
    }
    final ids = {widget.memberId.trim(), widget.userId.trim()}.where((id) => id.isNotEmpty).toSet();
    if (ids.isEmpty) return [];
    return _projects.where((project) {
      final members = project['memberIds'];
      if (members is List && members.map((item) => item.toString()).any(ids.contains)) return true;
      final tasks = project['tasks'];
      if (tasks is! List) return false;
      return tasks.any((task) {
        if (task is! Map) return false;
        final assignee = task['assigneeId']?.toString() ?? '';
        return ids.contains(assignee);
      });
    }).toList();
  }

  List<Map<String, dynamic>> get _filtered {
    final query = _search.text.trim().toLowerCase();
    return _mine.where((project) {
      final matchesStatus = _status == 'all' || _statusKey(project['status']) == _status;
      final haystack = [project['name'], project['service'], project['clientName'], project['dueLabel']].join(' ').toLowerCase();
      return matchesStatus && (query.isEmpty || haystack.contains(query));
    }).toList();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final result = await PortalApi.get('/api/projects', token: widget.token);
    if (!mounted) return;
    setState(() {
      _loading = false;
      if (result.ok) {
        _projects = result.list.map((item) => item is Map ? Map<String, dynamic>.from(item) : <String, dynamic>{}).toList();
      } else {
        _error = result.message;
      }
    });
  }

  Future<void> _open(Map<String, dynamic> project) async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ProjectWorkspaceScreen(
          projectId: project['id']?.toString() ?? '',
          token: widget.token,
          summary: project,
          role: widget.role,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final projects = _filtered;
    return Scaffold(
      backgroundColor: black,
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: yellow))
            : ListView(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
                children: [
                  Text('$_greeting, $_firstName', style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  Text(
                    _isClient ? 'Your projects and where each one stands.' : 'Projects assigned to you.',
                    style: const TextStyle(color: Colors.grey),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _search,
                    onChanged: (_) => setState(() {}),
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      hintText: 'Search projects',
                      hintStyle: const TextStyle(color: Colors.grey),
                      filled: true,
                      fillColor: cardColor,
                      prefixIcon: const Icon(Icons.search, color: Colors.grey),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final item in statuses)
                        ChoiceChip(
                          label: Text(item.$2),
                          selected: _status == item.$1,
                          selectedColor: yellow,
                          backgroundColor: cardColor,
                          labelStyle: TextStyle(color: _status == item.$1 ? black : Colors.white, fontWeight: FontWeight.w600),
                          onSelected: (_) => setState(() => _status = item.$1),
                        ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  if (_error != null) Text(_error!, style: const TextStyle(color: yellow)),
                  if (projects.isEmpty)
                    Text(
                      _mine.isEmpty
                          ? (_isClient ? 'No projects have been opened for your company yet.' : 'No projects are assigned to you yet.')
                          : 'No projects match this view.',
                      style: const TextStyle(color: Colors.grey),
                    ),
                  for (final project in projects) _card(project),
                ],
              ),
      ),
    );
  }

  Widget _card(Map<String, dynamic> project) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(color: cardColor, borderRadius: BorderRadius.circular(16)),
      child: ListTile(
        title: Text(project['name']?.toString() ?? '', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        subtitle: Text(
          '${project['service'] ?? ''} · Due ${project['dueLabel'] ?? ''}',
          style: const TextStyle(color: Colors.grey),
        ),
        trailing: Text(_statusLabel(project['status']), style: const TextStyle(color: yellow, fontSize: 12, fontWeight: FontWeight.w700)),
        onTap: () => _open(project),
      ),
    );
  }
}
