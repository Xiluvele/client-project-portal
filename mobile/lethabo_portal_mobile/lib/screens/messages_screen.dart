import 'package:flutter/material.dart';

import '../api/portal_api.dart';
import '../project_access.dart';
import 'projects/projects_details_screen.dart';

class MessagesScreen extends StatefulWidget {
  final String token;
  final String role;
  final String clientId;
  final String memberId;
  final String userId;
  final String email;

  const MessagesScreen({
    super.key,
    required this.token,
    required this.role,
    required this.clientId,
    required this.memberId,
    required this.userId,
    required this.email,
  });

  @override
  State<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends State<MessagesScreen> {
  static const yellow = Color(0xFFFFEE0B);
  static const black = Color(0xFF0D0D0D);
  static const cardColor = Color(0xFF1A1A1A);

  bool _loading = true;
  String? _error;
  List<_Thread> _threads = [];

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
    final projectsResult = await PortalApi.get('/api/projects', token: widget.token);
    final noticesResult = await PortalApi.get('/api/notifications', token: widget.token);
    final clientsResult = await PortalApi.get('/api/clients', token: widget.token);
    final membersResult = await PortalApi.get('/api/team-members', token: widget.token);
    if (!mounted) return;

    if (!projectsResult.ok && !noticesResult.ok) {
      setState(() {
        _loading = false;
        _error = projectsResult.message;
      });
      return;
    }

    final projects = projectsResult.list.map(_map).toList();
    final visible = visibleProjects(
      projects: projects,
      role: widget.role,
      clientId: widget.clientId,
      memberId: widget.memberId,
      userId: widget.userId,
      email: widget.email,
      clients: clientsResult.list.map(_map).toList(),
      members: membersResult.list.map(_map).toList(),
    );
    final threads = <_Thread>[];
    for (final project in visible) {
      final comments = project['comments'] ?? project['Comments'];
      if (comments is! List) continue;
      for (final comment in comments) {
        if (comment is! Map) continue;
        threads.add(_Thread(
          projectId: '${project['id'] ?? ''}',
          projectName: '${project['name'] ?? 'Project'}',
          title: '${comment['authorName'] ?? 'Message'}',
          body: '${comment['body'] ?? ''}',
          createdAt: DateTime.tryParse('${comment['createdAt'] ?? ''}'),
          summary: project,
        ));
      }
    }
    for (final notice in noticesResult.list.map(_map)) {
      final projectId = '${notice['projectId'] ?? ''}';
      final match = visible.cast<Map<String, dynamic>?>().firstWhere(
            (item) => '${item?['id'] ?? ''}' == projectId,
            orElse: () => null,
          );
      threads.add(_Thread(
        projectId: projectId,
        projectName: '${match?['name'] ?? 'Notification'}',
        title: 'Notification',
        body: '${notice['text'] ?? ''}',
        createdAt: DateTime.tryParse('${notice['createdAt'] ?? ''}'),
        summary: match ?? const {},
        noticeId: '${notice['id'] ?? ''}',
      ));
    }
    threads.sort((left, right) => (right.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0)).compareTo(left.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0)));
    setState(() {
      _loading = false;
      _threads = threads.where((item) => item.body.trim().isNotEmpty).toList();
    });
  }

  Map<String, dynamic> _map(dynamic item) => item is Map ? Map<String, dynamic>.from(item) : <String, dynamic>{};

  Future<void> _open(_Thread thread) async {
    if (thread.noticeId.isNotEmpty) {
      await PortalApi.post('/api/notifications/${thread.noticeId}/read', {}, token: widget.token);
    }
    if (!mounted || thread.projectId.isEmpty) return;
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ProjectWorkspaceScreen(
          projectId: thread.projectId,
          token: widget.token,
          summary: thread.summary,
          role: widget.role,
        ),
      ),
    );
    if (mounted) _load();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: _loading
          ? const Center(child: CircularProgressIndicator(color: yellow))
          : RefreshIndicator(
              color: yellow,
              backgroundColor: cardColor,
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(22, 28, 22, 32),
                children: [
                  const Text('Messages', style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  const Text('Comments and notices from the projects you can open.', style: TextStyle(color: Colors.grey)),
                  const SizedBox(height: 18),
                  if (_error != null) Text(_error!, style: const TextStyle(color: yellow)),
                  if (_threads.isEmpty)
                    const Padding(
                      padding: EdgeInsets.only(top: 24),
                      child: Text('No messages yet.', style: TextStyle(color: Colors.grey)),
                    ),
                  for (final thread in _threads)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Material(
                        color: cardColor,
                        borderRadius: BorderRadius.circular(16),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(16),
                          onTap: () => _open(thread),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(thread.projectName, style: const TextStyle(color: yellow, fontSize: 12, fontWeight: FontWeight.w700)),
                                const SizedBox(height: 6),
                                Text(thread.title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                                const SizedBox(height: 4),
                                Text(thread.body, style: const TextStyle(color: Colors.grey)),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
    );
  }
}

class _Thread {
  final String projectId;
  final String projectName;
  final String title;
  final String body;
  final DateTime? createdAt;
  final Map<String, dynamic> summary;
  final String noticeId;

  const _Thread({
    required this.projectId,
    required this.projectName,
    required this.title,
    required this.body,
    required this.createdAt,
    required this.summary,
    this.noticeId = '',
  });
}
