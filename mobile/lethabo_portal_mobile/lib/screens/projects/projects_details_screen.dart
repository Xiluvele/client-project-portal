import 'package:flutter/material.dart';

import '../../api/portal_api.dart';

class ProjectWorkspaceScreen extends StatefulWidget {
  final String projectId;
  final String token;
  final Map<String, dynamic> summary;

  const ProjectWorkspaceScreen({
    super.key,
    required this.projectId,
    required this.token,
    required this.summary,
  });

  @override
  State<ProjectWorkspaceScreen> createState() => _ProjectWorkspaceScreenState();
}

class _ProjectWorkspaceScreenState extends State<ProjectWorkspaceScreen> {
  static const yellow = Color(0xFFFFEE0B);
  static const black = Color(0xFF0D0D0D);
  static const cardColor = Color(0xFF1A1A1A);
  static const green = Color(0xFF3DDC97);
  static const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  static const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  static const openDecisions = {'submitted', 'under_review', 'clarification'};
  static const laneOrder = ['backlog', 'in_progress', 'in_review', 'done'];
  static const laneLabel = {
    'backlog': 'To do',
    'in_progress': 'In progress',
    'in_review': 'In review',
    'done': 'Done',
  };

  Map<String, dynamic> _project = {};
  bool _loading = true;
  String? _error;
  bool _busy = false;
  final _open = <String>{'tasks'};
  String? _assigningId;
  final _reminded = <String>{};
  final _reply = TextEditingController();
  final _requirement = TextEditingController();

  @override
  void initState() {
    super.initState();
    _project = Map<String, dynamic>.from(widget.summary);
    _load();
  }

  @override
  void dispose() {
    _reply.dispose();
    _requirement.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> _list(String key) {
    final value = _project[key];
    if (value is! List) return [];
    return value.map((item) => item is Map ? Map<String, dynamic>.from(item) : <String, dynamic>{}).toList();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final result = await PortalApi.get('/api/projects/${widget.projectId}', token: widget.token);
    if (!mounted) return;
    setState(() {
      _loading = false;
      if (result.ok && result.map.isNotEmpty) {
        _project = result.map;
      } else {
        _error = result.message;
      }
    });
  }

  Future<void> _act(String path, [Map<String, dynamic>? body]) async {
    setState(() => _busy = true);
    final result = await PortalApi.post(path, body ?? {}, token: widget.token);
    if (!mounted) return;
    setState(() => _busy = false);
    if (result.ok && result.map.containsKey('name')) {
      setState(() => _project = result.map);
      return;
    }
    _toast(result.message);
  }

  void _toast(String text) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(text), backgroundColor: cardColor),
    );
  }

  int? _daysUntil(String label) {
    final match = RegExp(r'(\d{1,2})\s+([A-Za-z]{3})').firstMatch(label);
    if (match == null) return null;
    final month = months.indexOf(match.group(2)!.toLowerCase());
    if (month < 0) return null;
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final target = DateTime(now.year, month + 1, int.parse(match.group(1)!));
    return target.difference(today).inDays;
  }

  String _tracking(List<Map<String, dynamic>> milestones) {
    if (milestones.isEmpty) return 'Add milestones to show where this project stands.';
    final index = milestones.indexWhere((item) => item['status'] != 'complete');
    if (index < 0) return 'Every milestone on this project is complete.';
    final current = milestones[index];
    final previous = index > 0 ? milestones[index - 1] : null;
    final days = _daysUntil('${current['targetLabel'] ?? ''}');
    final name = '${current['name'] ?? ''}'.toLowerCase();
    final title = '${current['name'] ?? ''}';
    final target = '${current['targetLabel'] ?? ''}';
    if (previous != null && days != null && days > 1) return '${previous['name']} is done and $name starts in $days days.';
    if (previous != null && days == 1) return '${previous['name']} is done and $name starts tomorrow.';
    if (previous != null && days == 0) return '${previous['name']} is done and $name starts today.';
    if (previous != null) return '${previous['name']} is done and $title is next${target.isEmpty ? '' : ', due $target'}.';
    if (days != null && days > 1) return '$title starts in $days days.';
    return '$title is the current milestone${target.isEmpty ? '' : ', due $target'}.';
  }

  int _progress(List<Map<String, dynamic>> tasks) {
    if (tasks.isEmpty) return int.tryParse('${_project['progress'] ?? 0}') ?? 0;
    const weights = {'backlog': 0.08, 'in_progress': 0.55, 'in_review': 0.82, 'done': 1.0};
    final total = tasks.fold<double>(0, (sum, task) => sum + (weights['${task['status']}'] ?? 0));
    return (total / tasks.length * 100).round();
  }

  String _speaker(Map<String, dynamic> comment) {
    const known = {
      'client': 'Client',
      'developer': 'Developer',
      'manager': 'Project manager',
      'administrator': 'Administrator',
    };
    final role = '${comment['role'] ?? ''}';
    if (known.containsKey(role)) return known[role]!;
    final initials = '${comment['initials'] ?? ''}';
    final member = _list('members').cast<Map<String, dynamic>?>().firstWhere(
          (item) => item?['initials'] == initials,
          orElse: () => null,
        );
    final memberRole = '${member?['role'] ?? ''}';
    if (memberRole.isEmpty) return 'Team';
    if (memberRole.toLowerCase().contains('develop')) return 'Developer';
    if (memberRole.toLowerCase().contains('manager')) return 'Project manager';
    if (memberRole.toLowerCase().contains('design')) return 'Designer';
    return memberRole;
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
    return '${parsed.day} ${monthLabels[parsed.month - 1]}';
  }

  String _money(Object? value) {
    final amount = value is num ? value.round() : int.tryParse('$value') ?? 0;
    final digits = amount.toString();
    final buffer = StringBuffer();
    for (var i = 0; i < digits.length; i++) {
      if (i > 0 && (digits.length - i) % 3 == 0) buffer.write(' ');
      buffer.write(digits[i]);
    }
    return 'R $buffer';
  }

  String _invoiceStatus(Map<String, dynamic> invoice) {
    final stored = '${invoice['status'] ?? 'pending'}';
    final status = stored == 'pending' ? 'sent' : stored;
    final days = _daysUntil('${invoice['dueLabel'] ?? ''}');
    if (status == 'sent' && days != null && days < 0) return 'overdue';
    return status;
  }

  void _toggle(String id) {
    setState(() {
      if (_open.contains(id)) {
        _open.remove(id);
      } else {
        _open.add(id);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final milestones = _list('milestones');
    final tasks = _list('tasks');
    final files = _list('files');
    final comments = _list('comments');
    final invoices = _list('invoices');
    final requests = _list('changeRequests').where((item) => openDecisions.contains(item['status'])).toList();
    final requirements = _list('requirements');
    final openTasks = tasks.where((task) => task['status'] != 'done').toList();
    final unassigned = openTasks.where((task) => '${task['assigneeId'] ?? ''}'.isEmpty).toList();
    final reviews = openTasks.where((task) => task['status'] == 'in_review').toList();
    final needs = reviews.length + requests.length + unassigned.where((task) => task['status'] != 'in_review').length;
    final progress = _progress(tasks);
    final current = milestones.cast<Map<String, dynamic>?>().firstWhere(
          (item) => item?['status'] != 'complete',
          orElse: () => null,
        );
    final lead = [
      _tracking(milestones),
      if (needs == 1) '1 thing is waiting on you.',
      if (needs > 1) '$needs things are waiting on you.',
    ].join(' ');

    openTasks.sort((a, b) {
      int rank(Map<String, dynamic> task) {
        if ('${task['assigneeId'] ?? ''}'.isEmpty) return 0;
        if (task['status'] == 'in_review') return 1;
        return 2;
      }

      final byAttention = rank(a) - rank(b);
      if (byAttention != 0) return byAttention;
      return laneOrder.indexOf('${a['status']}') - laneOrder.indexOf('${b['status']}');
    });

    return Scaffold(
      backgroundColor: black,
      appBar: AppBar(
        backgroundColor: black,
        foregroundColor: Colors.white,
        title: Text('${_project['name'] ?? 'Project'}'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: yellow))
          : ListView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
              children: [
                Text('${_project['clientName'] ?? ''}', style: const TextStyle(color: Colors.grey)),
                const SizedBox(height: 12),
                Text(lead, style: const TextStyle(color: Colors.white, fontSize: 16, height: 1.35)),
                if (_error != null) ...[
                  const SizedBox(height: 10),
                  Text(_error!, style: const TextStyle(color: yellow)),
                ],
                const SizedBox(height: 16),
                Row(
                  children: [
                    const Text('Work done', style: TextStyle(color: Colors.grey)),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: LinearProgressIndicator(
                          value: progress.clamp(0, 100) / 100,
                          minHeight: 8,
                          backgroundColor: const Color(0xFF333333),
                          color: yellow,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text('$progress%', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 14),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final item in milestones) _pill(item, current?['id'] == item['id']),
                    if (current != null)
                      _textButton('Mark ${current['name']} complete', () => _act('/api/projects/${widget.projectId}/milestones/${current['id']}/complete')),
                    _textButton('Add milestone', _addMilestone),
                  ],
                ),
                const SizedBox(height: 16),
                _panel(
                  id: 'tasks',
                  icon: Icons.assignment_outlined,
                  title: 'Tasks',
                  summary: tasks.isEmpty ? 'No tasks yet' : '$needs waiting · ${openTasks.length} open · ${tasks.length - openTasks.length} done',
                  count: needs,
                  child: Column(
                    children: [
                      for (final request in requests) _row(
                        title: 'Change request: ${'${request['description'] ?? ''}'.split('.').first}',
                        meta: 'Outside the agreed requirements',
                        actions: [
                          _textButton('Approve', () => _act('/api/projects/${widget.projectId}/change-requests/${request['id']}', {'status': 'approved'})),
                          _textButton('Reject', () => _act('/api/projects/${widget.projectId}/change-requests/${request['id']}', {'status': 'rejected'})),
                        ],
                      ),
                      if (openTasks.isEmpty && requests.isEmpty) const _Empty('No open tasks.'),
                      for (final task in openTasks) _taskRow(task),
                      const SizedBox(height: 8),
                      _textButton('New task', _addTask),
                    ],
                  ),
                ),
                _panel(
                  id: 'files',
                  icon: Icons.folder_outlined,
                  title: 'Files and designs',
                  summary: files.isEmpty
                      ? 'No files yet'
                      : '${files.where((file) => file['approval'] == 'pending').length} awaiting approval · ${files.where((file) => file['approval'] == 'approved').length} approved',
                  child: Column(
                    children: [
                      if (files.isEmpty) const _Empty('No files uploaded yet.'),
                      for (final file in [...files.where((file) => file['approval'] == 'pending'), ...files.where((file) => file['approval'] != 'pending')])
                        _row(
                          title: '${file['name'] ?? ''}',
                          meta: '${file['uploadedBy'] ?? ''} · ${_relative(file['createdAt']?.toString())}',
                          actions: [
                            _badge(file['approval'] == 'pending' ? 'Awaiting client' : '${file['approval'] ?? ''}', file['approval'] == 'approved'),
                          ],
                        ),
                      _textButton('Upload file', _addFile),
                    ],
                  ),
                ),
                _panel(
                  id: 'messages',
                  icon: Icons.chat_bubble_outline,
                  title: 'Messages',
                  summary: comments.isEmpty ? 'No messages yet' : 'Last message ${_relative(comments.last['createdAt']?.toString())}',
                  child: Column(
                    children: [
                      if (comments.isEmpty) const _Empty('No messages yet.'),
                      for (final comment in comments)
                        _row(
                          title: '${comment['authorName'] ?? ''} · ${_speaker(comment)}',
                          meta: '${comment['body'] ?? ''}',
                        ),
                      _compose(_reply, 'Write a message', 'Send', () {
                        final body = _reply.text.trim();
                        if (body.isEmpty) return;
                        _reply.clear();
                        _act('/api/projects/${widget.projectId}/comments', {'body': body});
                      }),
                      for (final item in requirements)
                        _row(
                          title: '${item['text'] ?? ''}',
                          actions: [_badge('${item['status'] ?? ''}', item['status'] == 'confirmed')],
                        ),
                      _compose(_requirement, 'What was agreed with the client', 'Record', () {
                        final text = _requirement.text.trim();
                        if (text.isEmpty) return;
                        _requirement.clear();
                        _act('/api/projects/${widget.projectId}/requirements', {'text': text});
                      }),
                    ],
                  ),
                ),
                _panel(
                  id: 'billing',
                  icon: Icons.receipt_long_outlined,
                  title: 'Billing',
                  summary: _billingSummary(invoices),
                  child: Column(
                    children: [
                      if (invoices.isEmpty) const _Empty('No invoices for this project yet.'),
                      for (final invoice in invoices)
                        _row(
                          title: '${invoice['number'] ?? ''} · ${invoice['title'] ?? ''}',
                          meta: _invoiceStatus(invoice) == 'paid' ? 'Paid ${invoice['issuedLabel'] ?? ''}' : 'Due ${invoice['dueLabel'] ?? ''}',
                          actions: [
                            Text(_money(invoice['total']), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                            _badge(_invoiceStatus(invoice), _invoiceStatus(invoice) == 'paid'),
                          ],
                        ),
                      _textButton('Create invoice', _addInvoice),
                    ],
                  ),
                ),
              ],
            ),
    );
  }

  String _billingSummary(List<Map<String, dynamic>> invoices) {
    final unpaid = invoices.where((item) => !{'paid', 'cancelled', 'draft'}.contains(_invoiceStatus(item))).toList();
    if (unpaid.isEmpty) return 'Nothing outstanding';
    final total = unpaid.fold<num>(0, (sum, item) => sum + (item['total'] is num ? item['total'] as num : 0));
    final due = '${unpaid.first['dueLabel'] ?? ''}';
    return '${_money(total)} unpaid${due.isEmpty ? '' : ' · due $due'}';
  }

  Widget _pill(Map<String, dynamic> item, bool now) {
    final done = item['status'] == 'complete';
    final color = done ? green : now ? yellow : Colors.grey;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        done ? '${item['name']}' : '${item['name']}${item['targetLabel'] == null || '${item['targetLabel']}'.isEmpty ? '' : ' · ${item['targetLabel']}'}',
        style: TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 12),
      ),
    );
  }

  Widget _panel({
    required String id,
    required IconData icon,
    required String title,
    required String summary,
    required Widget child,
    int count = 0,
  }) {
    final open = _open.contains(id);
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(color: cardColor, borderRadius: BorderRadius.circular(14)),
      child: Column(
        children: [
          ListTile(
            leading: Icon(icon, color: yellow),
            title: Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            subtitle: Text(summary, style: const TextStyle(color: Colors.grey, fontSize: 12)),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (count > 0)
                  CircleAvatar(
                    radius: 12,
                    backgroundColor: yellow,
                    child: Text('$count', style: const TextStyle(color: black, fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                Icon(open ? Icons.expand_less : Icons.expand_more, color: Colors.grey),
              ],
            ),
            onTap: () => _toggle(id),
          ),
          if (open) Padding(padding: const EdgeInsets.fromLTRB(16, 0, 16, 12), child: child),
        ],
      ),
    );
  }

  Widget _taskRow(Map<String, dynamic> task) {
    final ownerId = '${task['assigneeId'] ?? ''}';
    final owner = _list('members').cast<Map<String, dynamic>?>().firstWhere(
          (item) => item?['id']?.toString() == ownerId,
          orElse: () => null,
        );
    final developers = _list('developers');
    final id = '${task['id']}';
    return _row(
      title: '${task['title'] ?? ''}',
      meta: owner == null ? 'Unassigned' : '${owner['shortName'] ?? owner['name'] ?? ''}',
      actions: [
        if (owner == null && _assigningId == id)
          DropdownButton<String>(
            dropdownColor: cardColor,
            hint: const Text('Choose', style: TextStyle(color: Colors.grey)),
            items: [
              for (final developer in developers)
                DropdownMenuItem(
                  value: '${developer['memberId'] ?? developer['id']}',
                  child: Text('${developer['name']}', style: const TextStyle(color: Colors.white)),
                ),
            ],
            onChanged: (value) {
              if (value == null || value.isEmpty) return;
              setState(() => _assigningId = null);
              _act('/api/projects/${widget.projectId}/tasks/$id/assign', {'assigneeId': value});
            },
          )
        else if (owner == null)
          _textButton('Assign', () => setState(() => _assigningId = id)),
        if (task['status'] == 'in_review')
          _textButton(
            _reminded.contains(id) ? 'Sent' : 'Remind client',
            _reminded.contains(id)
                ? null
                : () async {
                    await _act('/api/projects/${widget.projectId}/tasks/$id/remind');
                    if (mounted) setState(() => _reminded.add(id));
                  },
          ),
        if (task['status'] == 'in_review')
          _textButton('Approve', () => _act('/api/projects/${widget.projectId}/tasks/$id/approve')),
        _badge(laneLabel['${task['status']}'] ?? '${task['status']}', task['status'] == 'done'),
      ],
    );
  }

  Widget _row({required String title, String? meta, List<Widget> actions = const []}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                if (meta != null && meta.isNotEmpty) Text(meta, style: const TextStyle(color: Colors.grey, fontSize: 12)),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Wrap(spacing: 6, runSpacing: 6, alignment: WrapAlignment.end, children: actions),
        ],
      ),
    );
  }

  Widget _badge(String label, bool done) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: (done ? green : yellow).withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(label, style: TextStyle(color: done ? green : yellow, fontSize: 11, fontWeight: FontWeight.w700)),
    );
  }

  Widget _textButton(String label, VoidCallback? onPressed) {
    return TextButton(
      onPressed: _busy ? null : onPressed,
      child: Text(label, style: const TextStyle(color: yellow, fontWeight: FontWeight.w700)),
    );
  }

  Widget _compose(TextEditingController controller, String hint, String action, VoidCallback onSubmit) {
    return Row(
      children: [
        Expanded(
          child: TextField(
            controller: controller,
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(hintText: hint, hintStyle: const TextStyle(color: Colors.grey)),
          ),
        ),
        _textButton(action, onSubmit),
      ],
    );
  }

  Future<void> _prompt(String title, List<_PromptField> fields, Future<void> Function(Map<String, String>) onSave) async {
    final controllers = {for (final field in fields) field.key: TextEditingController()};
    final saved = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: cardColor,
        title: Text(title, style: const TextStyle(color: Colors.white)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final field in fields)
              TextField(
                controller: controllers[field.key],
                keyboardType: field.number ? TextInputType.number : TextInputType.text,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(labelText: field.label, labelStyle: const TextStyle(color: Colors.grey)),
              ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Save', style: TextStyle(color: yellow))),
        ],
      ),
    );
    if (saved == true) {
      await onSave({for (final field in fields) field.key: controllers[field.key]!.text.trim()});
    }
    for (final controller in controllers.values) {
      controller.dispose();
    }
  }

  Future<void> _addTask() {
    return _prompt('New task', [const _PromptField('title', 'Task title')], (values) {
      return _act('/api/projects/${widget.projectId}/tasks', {'title': values['title']});
    });
  }

  Future<void> _addFile() {
    return _prompt('Upload file', [const _PromptField('name', 'File name')], (values) {
      return _act('/api/projects/${widget.projectId}/files', {'name': values['name']});
    });
  }

  Future<void> _addMilestone() {
    return _prompt(
      'Add milestone',
      [const _PromptField('name', 'Milestone name'), const _PromptField('targetLabel', 'Target date')],
      (values) => _act('/api/projects/${widget.projectId}/milestones', values),
    );
  }

  Future<void> _addInvoice() {
    return _prompt(
      'Create invoice',
      [const _PromptField('title', 'Title'), const _PromptField('amount', 'Amount', number: true)],
      (values) => _act('/api/projects/${widget.projectId}/invoices', {
        'title': values['title'],
        'amount': num.tryParse(values['amount'] ?? '') ?? 0,
      }),
    );
  }
}

class _PromptField {
  final String key;
  final String label;
  final bool number;

  const _PromptField(this.key, this.label, {this.number = false});
}

class _Empty extends StatelessWidget {
  final String text;
  const _Empty(this.text);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(text, style: const TextStyle(color: Colors.grey)),
    );
  }
}
