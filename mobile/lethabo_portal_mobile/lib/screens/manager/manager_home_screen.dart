import 'package:flutter/material.dart';

import '../../api/portal_api.dart';
import '../projects/projects_details_screen.dart';

class ManagerHomeScreen extends StatefulWidget {
  final String userId;
  final String name;
  final String email;
  final String role;
  final String token;

  const ManagerHomeScreen({
    super.key,
    required this.userId,
    required this.name,
    required this.email,
    required this.role,
    required this.token,
  });

  @override
  State<ManagerHomeScreen> createState() => _ManagerHomeScreenState();
}

class _ManagerHomeScreenState extends State<ManagerHomeScreen> {
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
  List<Map<String, dynamic>> _clients = [];
  List<Map<String, dynamic>> _members = [];
  List<Map<String, dynamic>> _notices = [];
  String _status = 'all';
  bool _loading = true;
  String? _error;

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

  String get _initials {
    final parts = widget.name.trim().split(RegExp(r'\s+')).where((part) => part.isNotEmpty);
    final letters = parts.take(2).map((part) => part[0].toUpperCase()).join();
    return letters.isEmpty ? 'LM' : letters;
  }

  int get _unread => _notices.where((item) => item['read'] != true).length;

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    final projects = await PortalApi.get('/api/projects', token: widget.token);
    final clients = await PortalApi.get('/api/clients', token: widget.token);
    final members = await PortalApi.get('/api/team-members', token: widget.token);
    final notices = await PortalApi.get('/api/notifications', token: widget.token);

    if (!mounted) return;
    setState(() {
      _loading = false;
      if (!projects.ok) {
        _error = projects.message;
      } else {
        _projects = projects.list.map(_map).toList();
      }
      _clients = clients.ok ? clients.list.map(_map).toList() : [];
      _members = members.ok ? members.list.map(_map).toList() : [];
      _notices = notices.ok ? notices.list.map(_map).toList() : [];
    });
  }

  Map<String, dynamic> _map(dynamic item) =>
      item is Map ? Map<String, dynamic>.from(item) : <String, dynamic>{};

  String _statusKey(Object? value) {
    final raw = (value ?? '').toString().trim().toLowerCase().replaceAll(' ', '_');
    if (raw == 'completed' || raw == 'complete') return 'done';
    return raw;
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

  List<Map<String, dynamic>> get _filtered {
    final query = _search.text.trim().toLowerCase();
    return _projects.where((project) {
      final matchesStatus = _status == 'all' || _statusKey(project['status']) == _status;
      final haystack = [
        project['name'],
        project['service'],
        project['clientName'],
        project['dueLabel'],
      ].join(' ').toLowerCase();
      return matchesStatus && (query.isEmpty || haystack.contains(query));
    }).toList();
  }

  Future<void> _openProject(Map<String, dynamic> project) async {
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
    if (mounted) _load();
  }

  Future<void> _createProject() async {
    final created = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: cardColor,
      builder: (context) => _NewProjectSheet(
        token: widget.token,
        clients: _clients,
        members: _members,
      ),
    );
    if (!mounted || created == null || created.isEmpty) return;
    await _load();
    final match = _projects.cast<Map<String, dynamic>?>().firstWhere(
          (item) => item?['id']?.toString() == created,
          orElse: () => null,
        );
    if (!mounted) return;
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ProjectWorkspaceScreen(
          projectId: created,
          token: widget.token,
          summary: match ?? {'id': created, 'name': 'Project'},
          role: widget.role,
        ),
      ),
    );
    if (mounted) _load();
  }

  Future<void> _openBell() async {
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: cardColor,
      builder: (context) {
        final items = _notices.take(5).toList();
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Notifications',
                  style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),
                if (items.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 18),
                    child: Text('No notifications yet.', style: TextStyle(color: Colors.grey)),
                  ),
                ...items.map((item) {
                  final unread = item['read'] != true;
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(
                      item['text']?.toString() ?? '',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: unread ? FontWeight.w700 : FontWeight.w500,
                      ),
                    ),
                    subtitle: Text(
                      _relative(item['createdAt']?.toString()),
                      style: const TextStyle(color: Colors.grey, fontSize: 12),
                    ),
                    onTap: () async {
                      Navigator.pop(context);
                      await _markRead(item['id']?.toString() ?? '');
                    },
                  );
                }),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _markRead(String id) async {
    if (id.isEmpty) return;
    await PortalApi.post('/api/notifications/$id/read', {}, token: widget.token);
    if (!mounted) return;
    setState(() {
      _notices = _notices
          .map((item) => item['id']?.toString() == id ? {...item, 'read': true} : item)
          .toList();
    });
  }

  String _relative(String? iso) {
    final parsed = DateTime.tryParse(iso ?? '');
    if (parsed == null) return '';
    final delta = DateTime.now().difference(parsed.toLocal());
    if (delta.inMinutes < 1) return 'Just now';
    if (delta.inMinutes < 60) return '${delta.inMinutes} min ago';
    if (delta.inHours < 24) return '${delta.inHours} hours ago';
    if (delta.inDays == 1) return 'Yesterday';
    if (delta.inDays < 7) return '${delta.inDays} days ago';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${parsed.day} ${months[parsed.month - 1]}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: black,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 12, 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '$_greeting, $_firstName',
                          style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          "Here's what's happening across all client projects today.",
                          style: TextStyle(color: Colors.grey, fontSize: 14),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: _openBell,
                    icon: Badge(
                      isLabelVisible: _unread > 0,
                      label: Text('$_unread'),
                      backgroundColor: yellow,
                      textColor: black,
                      child: const Icon(Icons.notifications_none_rounded, color: Colors.white),
                    ),
                  ),
                  CircleAvatar(
                    backgroundColor: yellow,
                    foregroundColor: black,
                    child: Text(_initials, style: const TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
              child: TextField(
                controller: _search,
                style: const TextStyle(color: Colors.white),
                onChanged: (_) => setState(() {}),
                decoration: InputDecoration(
                  hintText: 'Search projects, clients, invoices',
                  hintStyle: const TextStyle(color: Colors.grey),
                  prefixIcon: const Icon(Icons.search, color: Colors.grey),
                  filled: true,
                  fillColor: cardColor,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: yellow),
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _createProject,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: yellow,
                    foregroundColor: black,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  icon: const Icon(Icons.add),
                  label: const Text('New Project', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ),
            SizedBox(
              height: 48,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: [
                  for (final status in statuses)
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(status.$2),
                        selected: _status == status.$1,
                        selectedColor: yellow,
                        backgroundColor: cardColor,
                        labelStyle: TextStyle(
                          color: _status == status.$1 ? black : Colors.white,
                          fontWeight: FontWeight.w600,
                        ),
                        side: BorderSide.none,
                        onSelected: (_) => setState(() => _status = status.$1),
                      ),
                    ),
                ],
              ),
            ),
            Expanded(child: _body()),
          ],
        ),
      ),
    );
  }

  Widget _body() {
    if (_loading) return const Center(child: CircularProgressIndicator(color: yellow));
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: Colors.white)),
              const SizedBox(height: 16),
              ElevatedButton(onPressed: _load, child: const Text('Try again')),
            ],
          ),
        ),
      );
    }

    final projects = _filtered;
    if (projects.isEmpty) {
      return const Center(child: Text('No projects match this view.', style: TextStyle(color: Colors.grey)));
    }

    return RefreshIndicator(
      color: yellow,
      backgroundColor: cardColor,
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        itemCount: projects.length,
        itemBuilder: (context, index) => _card(projects[index]),
      ),
    );
  }

  Widget _card(Map<String, dynamic> project) {
    final progress = int.tryParse('${project['progress'] ?? 0}') ?? 0;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: cardColor,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => _openProject(project),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            project['name']?.toString() ?? 'Project',
                            style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            project['clientName']?.toString() ?? '',
                            style: const TextStyle(color: Colors.grey, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right_rounded, color: Colors.grey),
                  ],
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: yellow.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    _statusLabel(project['status']),
                    style: const TextStyle(color: yellow, fontSize: 11, fontWeight: FontWeight.w700),
                  ),
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    const Text('Work done', style: TextStyle(color: Colors.grey, fontSize: 12)),
                    const Spacer(),
                    Text('$progress%', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: LinearProgressIndicator(
                    value: (progress.clamp(0, 100)) / 100,
                    minHeight: 7,
                    backgroundColor: const Color(0xFF333333),
                    color: yellow,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Due ${project['dueLabel'] ?? ''}',
                  style: const TextStyle(color: Colors.grey, fontSize: 12),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _NewProjectSheet extends StatefulWidget {
  final String token;
  final List<Map<String, dynamic>> clients;
  final List<Map<String, dynamic>> members;

  const _NewProjectSheet({
    required this.token,
    required this.clients,
    required this.members,
  });

  @override
  State<_NewProjectSheet> createState() => _NewProjectSheetState();
}

class _NewProjectSheetState extends State<_NewProjectSheet> {
  static const yellow = Color(0xFFFFEE0B);
  static const black = Color(0xFF0D0D0D);
  static const services = [
    'Web development',
    'Brand identity',
    'Mobile app',
    'E-commerce',
    'Content and social',
    'Graphic design',
  ];

  final _name = TextEditingController();
  final _description = TextEditingController();
  String? _clientId;
  String? _service;
  String? _memberId;
  DateTime? _due;
  bool _saving = false;
  String? _error;

  List<Map<String, dynamic>> get _developers => widget.members.where((member) {
        final role = (member['role'] ?? '').toString().toLowerCase();
        return role.contains('developer') && member['allocated'] != true;
      }).toList();

  @override
  void dispose() {
    _name.dispose();
    _description.dispose();
    super.dispose();
  }

  String _label(DateTime date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    final day = date.day.toString().padLeft(2, '0');
    return '$day ${months[date.month - 1]}';
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _due ?? DateTime.now().add(const Duration(days: 14)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365 * 3)),
      builder: (context, child) {
        return Theme(
          data: ThemeData.dark().copyWith(
            colorScheme: const ColorScheme.dark(primary: yellow, onPrimary: black, surface: Color(0xFF1A1A1A)),
          ),
          child: child ?? const SizedBox.shrink(),
        );
      },
    );
    if (picked != null) setState(() => _due = picked);
  }

  Future<void> _save() async {
    final developers = _developers;
    if (_clientId == null) return setState(() => _error = 'Select a client.');
    if (_name.text.trim().isEmpty) return setState(() => _error = 'Enter a project title.');
    if (_description.text.trim().isEmpty) return setState(() => _error = 'Enter a description.');
    if (_service == null) return setState(() => _error = 'Select a service offered by Lethabo M Solutions.');
    if (_due == null) return setState(() => _error = 'Choose a due date.');
    if (developers.isEmpty) return setState(() => _error = 'No available developer.');
    if (_memberId == null) return setState(() => _error = 'Select an available developer.');

    final today = DateTime.now();
    final start = DateTime(today.year, today.month, today.day);
    final due = DateTime(_due!.year, _due!.month, _due!.day);
    final days = due.difference(start).inDays;

    setState(() {
      _saving = true;
      _error = null;
    });

    final result = await PortalApi.post('/api/projects', {
      'clientId': _clientId,
      'name': _name.text.trim(),
      'service': _service,
      'description': _description.text.trim(),
      'status': 'in_progress',
      'stage': 'discovery',
      'startedLabel': _label(start),
      'dueLabel': _label(due),
      'dueThisWeek': days >= 0 && days <= 7,
      'progress': 8,
      'memberIds': [_memberId],
    }, token: widget.token);

    if (!mounted) return;
    if (!result.ok) {
      setState(() {
        _saving = false;
        _error = result.message;
      });
      return;
    }
    Navigator.pop(context, result.map['id']?.toString() ?? '');
  }

  @override
  Widget build(BuildContext context) {
    final developers = _developers;
    return Padding(
      padding: EdgeInsets.only(left: 20, right: 20, top: 16, bottom: MediaQuery.of(context).viewInsets.bottom + 20),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('New project', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            _dropdown(
              label: 'Client',
              value: _clientId,
              items: widget.clients
                  .map((client) => DropdownMenuItem(value: client['id']?.toString(), child: Text(client['name']?.toString() ?? '')))
                  .toList(),
              onChanged: (value) => setState(() => _clientId = value),
            ),
            _field('Project title', _name, 'Website Rebuild'),
            _field('Description', _description, 'What this engagement covers'),
            _dropdown(
              label: 'Service',
              value: _service,
              items: services.map((service) => DropdownMenuItem(value: service, child: Text(service))).toList(),
              onChanged: (value) => setState(() => _service = value),
            ),
            const Text('Due date', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: _pickDate,
              style: OutlinedButton.styleFrom(foregroundColor: Colors.white, side: const BorderSide(color: Color(0xFF333333))),
              child: Text(_due == null ? 'Choose a due date' : _label(_due!)),
            ),
            const SizedBox(height: 14),
            _dropdown(
              label: 'Developer',
              value: _memberId,
              items: developers
                  .map((member) => DropdownMenuItem(value: member['id']?.toString(), child: Text(member['name']?.toString() ?? '')))
                  .toList(),
              onChanged: (value) => setState(() => _memberId = value),
            ),
            if (_error != null) Text(_error!, style: const TextStyle(color: yellow)),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _saving ? null : _save,
                style: ElevatedButton.styleFrom(backgroundColor: yellow, foregroundColor: black, padding: const EdgeInsets.symmetric(vertical: 14)),
                child: Text(_saving ? 'Saving...' : 'Create project', style: const TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _field(String label, TextEditingController controller, String hint) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: TextField(
        controller: controller,
        style: const TextStyle(color: Colors.white),
        decoration: InputDecoration(
          labelText: label,
          hintText: hint,
          labelStyle: const TextStyle(color: Colors.grey),
          hintStyle: const TextStyle(color: Colors.grey),
          enabledBorder: const UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFF333333))),
          focusedBorder: const UnderlineInputBorder(borderSide: BorderSide(color: yellow)),
        ),
      ),
    );
  }

  Widget _dropdown({
    required String label,
    required String? value,
    required List<DropdownMenuItem<String>> items,
    required ValueChanged<String?> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: DropdownButtonFormField<String>(
        initialValue: value,
        dropdownColor: const Color(0xFF1A1A1A),
        style: const TextStyle(color: Colors.white),
        decoration: InputDecoration(
          labelText: label,
          labelStyle: const TextStyle(color: Colors.grey),
          enabledBorder: const UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFF333333))),
          focusedBorder: const UnderlineInputBorder(borderSide: BorderSide(color: yellow)),
        ),
        items: items,
        onChanged: onChanged,
      ),
    );
  }
}
