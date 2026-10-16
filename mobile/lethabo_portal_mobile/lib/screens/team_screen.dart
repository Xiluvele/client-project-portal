import 'package:flutter/material.dart';

import '../api/portal_api.dart';

class TeamScreen extends StatefulWidget {
  final String token;

  const TeamScreen({super.key, required this.token});

  @override
  State<TeamScreen> createState() => _TeamScreenState();
}

class _TeamScreenState extends State<TeamScreen> {
  static const yellow = Color(0xFFFFEE0B);
  static const black = Color(0xFF0D0D0D);
  static const cardColor = Color(0xFF1A1A1A);

  List<Map<String, dynamic>> _members = [];
  List<Map<String, dynamic>> _projects = [];
  bool _loading = true;
  String? _error;

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
    final members = await PortalApi.get('/api/team-members', token: widget.token);
    final projects = await PortalApi.get('/api/projects', token: widget.token);
    if (!mounted) return;
    setState(() {
      _loading = false;
      if (!members.ok) {
        _error = members.message;
      } else {
        _members = members.list.map(_map).toList();
        _projects = projects.ok ? projects.list.map(_map).toList() : [];
      }
    });
  }

  Map<String, dynamic> _map(dynamic item) => item is Map ? Map<String, dynamic>.from(item) : <String, dynamic>{};

  String _text(Map<String, dynamic> item, String camel, String pascal) => '${item[camel] ?? item[pascal] ?? ''}';

  int _activeCount(String memberId) {
    var count = 0;
    for (final project in _projects) {
      if (_text(project, 'status', 'Status') == 'done') continue;
      final linked = project['memberIds'] ?? project['MemberIds'];
      if (linked is List && linked.map((item) => item.toString()).contains(memberId)) count += 1;
    }
    return count;
  }

  @override
  Widget build(BuildContext context) {
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
                    const Text('Team', style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 6),
                    const Text(
                      'Developers, designers, and content — the people assigned across client work.',
                      style: TextStyle(color: Colors.grey),
                    ),
                    const SizedBox(height: 16),
                    if (_error != null) Text(_error!, style: const TextStyle(color: yellow)),
                    if (_members.isEmpty && _error == null)
                      const Text('No team members are on file yet.', style: TextStyle(color: Colors.grey)),
                    for (final member in _members) _card(member),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _card(Map<String, dynamic> member) {
    final id = _text(member, 'id', 'Id');
    final count = _activeCount(id);
    final allocated = member['allocated'] == true || member['Allocated'] == true;
    final initials = _text(member, 'initials', 'Initials');
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: cardColor, borderRadius: BorderRadius.circular(16)),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: yellow,
            foregroundColor: black,
            child: Text(initials.isEmpty ? 'LM' : initials, style: const TextStyle(fontWeight: FontWeight.bold)),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(_text(member, 'name', 'Name'), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                Text(_text(member, 'role', 'Role'), style: const TextStyle(color: Colors.grey)),
                const SizedBox(height: 6),
                Text(
                  '$count active project${count == 1 ? '' : 's'}',
                  style: const TextStyle(color: Colors.white),
                ),
                Text(
                  allocated ? 'Allocated this week' : 'Available',
                  style: const TextStyle(color: Colors.grey, fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
