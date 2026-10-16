import 'package:flutter/material.dart';

import '../api/portal_api.dart';
import '../project_access.dart';
import 'messages_screen.dart';
import 'projects/projects_details_screen.dart';

class DeveloperTasksScreen extends StatefulWidget {
  final String name;
  final String email;
  final String role;
  final String clientId;
  final String memberId;
  final String userId;
  final String token;

  const DeveloperTasksScreen({
    super.key,
    required this.name,
    this.email = '',
    required this.role,
    required this.clientId,
    required this.memberId,
    required this.userId,
    required this.token,
  });

  @override
  State<DeveloperTasksScreen> createState() => _DeveloperTasksScreenState();
}

class _DeveloperTasksScreenState extends State<DeveloperTasksScreen> {
  static const yellow = Color(0xFFFFEE0B);
  static const black = Color(0xFF0D0D0D);
  static const cardColor = Color(0xFF1A1A1A);

  static const lanes = [
    ('backlog', 'To Do'),
    ('in_progress', 'In Progress'),
    ('in_review', 'In Review'),
    ('done', 'Done'),
  ];

  List<Map<String, dynamic>> _projects = [];
  List<Map<String, dynamic>> _clients = [];
  List<Map<String, dynamic>> _members = [];
  bool _loading = true;
  String? _error;
  String? _savingId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final projects = await PortalApi.get('/api/projects', token: widget.token);
    final clients = await PortalApi.get('/api/clients', token: widget.token);
    final members = await PortalApi.get('/api/team-members', token: widget.token);
    if (!mounted) return;
    setState(() {
      _loading = false;
      if (projects.ok) {
        _projects = projects.list.map(_map).toList();
        _clients = clients.list.map(_map).toList();
        _members = members.list.map(_map).toList();
      } else {
        _error = projects.message;
      }
    });
  }

  Map<String, dynamic> _map(dynamic item) => item is Map ? Map<String, dynamic>.from(item) : <String, dynamic>{};

  String _text(Map<String, dynamic> item, String camel, String pascal) => '${item[camel] ?? item[pascal] ?? ''}';

  List<Map<String, dynamic>> get _tasks {
    final mine = visibleProjects(
      projects: _projects,
      role: widget.role,
      clientId: widget.clientId,
      memberId: widget.memberId,
      userId: widget.userId,
      email: widget.email,
      clients: _clients,
      members: _members,
    );
    final ids = {widget.memberId.trim(), widget.userId.trim()}.where((id) => id.isNotEmpty).toSet();
    final rows = <Map<String, dynamic>>[];
    for (final project in mine) {
      final tasks = project['tasks'] ?? project['Tasks'];
      if (tasks is! List) continue;
      for (final task in tasks) {
        if (task is! Map) continue;
        final row = Map<String, dynamic>.from(task);
        final assignee = _text(row, 'assigneeId', 'AssigneeId');
        if (!ids.contains(assignee)) continue;
        row['project'] = project;
        rows.add(row);
      }
    }
    return rows;
  }

  Future<void> _move(Map<String, dynamic> task, String status) async {
    final project = task['project'];
    if (project is! Map) return;
    final projectId = _text(Map<String, dynamic>.from(project), 'id', 'Id');
    final taskId = _text(task, 'id', 'Id');
    if (projectId.isEmpty || taskId.isEmpty || _text(task, 'status', 'Status') == status) return;
    setState(() => _savingId = taskId);
    final result = await PortalApi.post(
      '/api/projects/$projectId/tasks/$taskId/status',
      {'status': status},
      token: widget.token,
    );
    if (!mounted) return;
    if (!result.ok) {
      setState(() => _savingId = null);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(result.message)));
      return;
    }
    await _load();
    if (mounted) setState(() => _savingId = null);
  }

  void _openMessages() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => Scaffold(
          backgroundColor: black,
          appBar: AppBar(backgroundColor: black, foregroundColor: Colors.white),
          body: MessagesScreen(
            token: widget.token,
            role: widget.role,
            clientId: widget.clientId,
            memberId: widget.memberId,
            userId: widget.userId,
            email: widget.email,
          ),
        ),
      ),
    );
  }

  Future<void> _open(Map<String, dynamic> project) async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ProjectWorkspaceScreen(
          projectId: _text(project, 'id', 'Id'),
          token: widget.token,
          summary: project,
          role: widget.role,
        ),
      ),
    );
    if (mounted) _load();
  }

  @override
  Widget build(BuildContext context) {
    final tasks = _tasks;
    return ColoredBox(
      color: black,
      child: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: yellow))
            : RefreshIndicator(
                color: yellow,
                backgroundColor: cardColor,
                onRefresh: _load,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
                  children: [
                    Row(
                      children: [
                        const Expanded(
                          child: Text('My tasks', style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold)),
                        ),
                        IconButton(
                          onPressed: _openMessages,
                          icon: const Icon(Icons.notifications_none_rounded, color: Colors.white),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Update a task as you work. Project progress recalculates for the client.',
                      style: TextStyle(color: Colors.grey),
                    ),
                    const SizedBox(height: 16),
                    if (_error != null) Text(_error!, style: const TextStyle(color: yellow)),
                    if (tasks.isEmpty)
                      const Text('No tasks are assigned to you yet.', style: TextStyle(color: Colors.grey)),
                    for (final task in tasks) _card(task),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _card(Map<String, dynamic> task) {
    final project = Map<String, dynamic>.from(task['project'] as Map);
    final clientId = _text(project, 'clientId', 'ClientId');
    final client = _clients.cast<Map<String, dynamic>?>().firstWhere(
          (item) => item != null && _text(item, 'id', 'Id') == clientId,
          orElse: () => null,
        );
    final clientName = client == null ? _text(project, 'clientName', 'ClientName') : _text(client, 'name', 'Name');
    final status = _text(task, 'status', 'Status');
    final taskId = _text(task, 'id', 'Id');
    final progress = project['progress'] ?? project['Progress'] ?? 0;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: cardColor, borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(_text(task, 'title', 'Title'), style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    Text(
                      '$clientName · ${_text(project, 'name', 'Name')}',
                      style: const TextStyle(color: Colors.grey),
                    ),
                    if (_text(task, 'description', 'Description').isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text(_text(task, 'description', 'Description'), style: const TextStyle(color: Colors.white)),
                    ],
                  ],
                ),
              ),
              Text('$progress%', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final lane in lanes)
                ChoiceChip(
                  label: Text(lane.$2),
                  selected: status == lane.$1,
                  selectedColor: yellow,
                  backgroundColor: black,
                  labelStyle: TextStyle(color: status == lane.$1 ? black : Colors.white, fontWeight: FontWeight.w600),
                  onSelected: _savingId == taskId ? null : (_) => _move(task, lane.$1),
                ),
            ],
          ),
          const SizedBox(height: 12),
          OutlinedButton(
            onPressed: () => _open(project),
            style: OutlinedButton.styleFrom(foregroundColor: Colors.white, side: const BorderSide(color: Color(0xFF333333))),
            child: const Text('Open project files'),
          ),
        ],
      ),
    );
  }
}
