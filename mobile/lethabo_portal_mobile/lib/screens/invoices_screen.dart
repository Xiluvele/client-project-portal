import 'package:flutter/material.dart';

import '../api/portal_api.dart';

class InvoicesScreen extends StatefulWidget {
  final String token;
  final bool canDecide;

  const InvoicesScreen({super.key, required this.token, this.canDecide = false});

  @override
  State<InvoicesScreen> createState() => _InvoicesScreenState();
}

class _InvoicesScreenState extends State<InvoicesScreen> {
  static const yellow = Color(0xFFFFEE0B);
  static const black = Color(0xFF0D0D0D);
  static const cardColor = Color(0xFF1A1A1A);

  List<Map<String, dynamic>> _invoices = [];
  List<Map<String, dynamic>> _projects = [];
  List<Map<String, dynamic>> _clients = [];
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
    final invoices = await PortalApi.get('/api/invoices', token: widget.token);
    final projects = await PortalApi.get('/api/projects', token: widget.token);
    final clients = await PortalApi.get('/api/clients', token: widget.token);
    if (!mounted) return;
    setState(() {
      _loading = false;
      if (!invoices.ok) {
        _error = invoices.message;
      } else {
        _invoices = invoices.list.map(_map).toList();
        _projects = projects.ok ? projects.list.map(_map).toList() : [];
        _clients = clients.ok ? clients.list.map(_map).toList() : [];
      }
    });
  }

  Map<String, dynamic> _map(dynamic item) => item is Map ? Map<String, dynamic>.from(item) : <String, dynamic>{};

  String _text(Map<String, dynamic> item, String camel, String pascal) => '${item[camel] ?? item[pascal] ?? ''}';

  Map<String, dynamic>? _find(List<Map<String, dynamic>> rows, String id) {
    for (final row in rows) {
      if (_text(row, 'id', 'Id') == id) return row;
    }
    return null;
  }

  num _total(Map<String, dynamic> invoice) {
    final items = invoice['items'] ?? invoice['Items'];
    if (items is! List) return 0;
    num sum = 0;
    for (final item in items) {
      if (item is! Map) continue;
      final row = Map<String, dynamic>.from(item);
      final qty = num.tryParse('${row['qty'] ?? row['Qty'] ?? 1}') ?? 1;
      final amount = num.tryParse('${row['amount'] ?? row['Amount'] ?? 0}') ?? 0;
      sum += qty * amount;
    }
    return sum;
  }

  String _money(num value) {
    final digits = value.round().toString();
    final buffer = StringBuffer('R ');
    for (var index = 0; index < digits.length; index++) {
      final remaining = digits.length - index;
      if (index > 0 && remaining % 3 == 0) buffer.write(' ');
      buffer.write(digits[index]);
    }
    return buffer.toString();
  }

  String _status(Map<String, dynamic> invoice) {
    final stored = _text(invoice, 'status', 'Status').toLowerCase();
    if (stored == 'pending') return 'sent';
    return stored.isEmpty ? 'sent' : stored;
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'sent':
        return 'Sent';
      case 'approved':
        return 'Approved';
      case 'declined':
        return 'Declined';
      case 'paid':
        return 'Paid';
      case 'cancelled':
        return 'Cancelled';
      case 'draft':
        return 'Draft';
      case 'overdue':
        return 'Overdue';
      default:
        return status;
    }
  }

  Future<void> _decide(Map<String, dynamic> invoice, String status) async {
    final result = await PortalApi.post(
      '/api/invoices/${_text(invoice, 'id', 'Id')}/decision',
      {'status': status},
      token: widget.token,
    );
    if (!mounted) return;
    if (!result.ok) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(result.message)));
      return;
    }
    await _load();
  }

  Future<void> _generate() async {
    if (_clients.isEmpty || _projects.isEmpty) return;
    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: cardColor,
      builder: (context) => _GenerateSheet(token: widget.token, clients: _clients, projects: _projects),
    );
    if (created == true && mounted) await _load();
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
                    Row(
                      children: [
                        const Expanded(
                          child: Text('Invoices', style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold)),
                        ),
                        if (!widget.canDecide)
                          TextButton(
                            onPressed: _generate,
                            child: const Text('Generate', style: TextStyle(color: yellow, fontWeight: FontWeight.bold)),
                          ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      widget.canDecide
                          ? 'Approve or decline invoices sent for your projects.'
                          : 'Invoices for your projects, tracked until they are paid.',
                      style: const TextStyle(color: Colors.grey),
                    ),
                    const SizedBox(height: 16),
                    if (_error != null) Text(_error!, style: const TextStyle(color: yellow)),
                    if (_invoices.isEmpty && _error == null)
                      const Text('No invoices yet.', style: TextStyle(color: Colors.grey)),
                    for (final invoice in _invoices) _card(invoice),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _card(Map<String, dynamic> invoice) {
    final client = _find(_clients, _text(invoice, 'clientId', 'ClientId'));
    final project = _find(_projects, _text(invoice, 'projectId', 'ProjectId'));
    final status = _status(invoice);
    final open = {'sent', 'pending', 'overdue'}.contains(status);
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: cardColor, borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  _text(invoice, 'number', 'Number'),
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                ),
              ),
              Text(_money(_total(invoice)), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            '${client == null ? 'Client' : _text(client, 'name', 'Name')} · ${project == null ? 'Project' : _text(project, 'name', 'Name')}',
            style: const TextStyle(color: Colors.grey),
          ),
          const SizedBox(height: 8),
          Text(
            '${_statusLabel(status)} · Due ${_text(invoice, 'dueLabel', 'DueLabel')}',
            style: TextStyle(color: status == 'approved' || status == 'paid' ? const Color(0xFF8DFF8A) : yellow, fontWeight: FontWeight.w700),
          ),
          if (widget.canDecide && open) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                TextButton(onPressed: () => _decide(invoice, 'approved'), child: const Text('Approve', style: TextStyle(color: yellow))),
                TextButton(onPressed: () => _decide(invoice, 'declined'), child: const Text('Decline', style: TextStyle(color: Colors.white))),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _GenerateSheet extends StatefulWidget {
  final String token;
  final List<Map<String, dynamic>> clients;
  final List<Map<String, dynamic>> projects;

  const _GenerateSheet({required this.token, required this.clients, required this.projects});

  @override
  State<_GenerateSheet> createState() => _GenerateSheetState();
}

class _GenerateSheetState extends State<_GenerateSheet> {
  static const yellow = Color(0xFFFFEE0B);
  static const black = Color(0xFF0D0D0D);

  late String _clientId;
  String? _projectId;
  final _amount = TextEditingController();
  final _due = TextEditingController();
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _clientId = _text(widget.clients.first, 'id', 'Id');
    final due = DateTime.now().add(const Duration(days: 14));
    _due.text = '${due.year.toString().padLeft(4, '0')}-${due.month.toString().padLeft(2, '0')}-${due.day.toString().padLeft(2, '0')}';
  }

  @override
  void dispose() {
    _amount.dispose();
    _due.dispose();
    super.dispose();
  }

  String _text(Map<String, dynamic> item, String camel, String pascal) => '${item[camel] ?? item[pascal] ?? ''}';

  List<Map<String, dynamic>> get _clientProjects => widget.projects
      .where((project) => _text(project, 'clientId', 'ClientId') == _clientId)
      .toList();

  Future<void> _save() async {
    final projectId = _projectId ?? (_clientProjects.isEmpty ? '' : _text(_clientProjects.first, 'id', 'Id'));
    final amount = num.tryParse(_amount.text.trim()) ?? 0;
    if (projectId.isEmpty || amount <= 0) {
      setState(() => _error = 'Choose a project and enter an amount.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    final result = await PortalApi.post(
      '/api/projects/$projectId/invoices',
      {
        'title': 'Invoice',
        'amount': amount,
        'dueLabel': _due.text.trim(),
        'status': 'pending',
        'items': [
          {'description': 'Invoice', 'qty': 1, 'amount': amount},
        ],
      },
      token: widget.token,
    );
    if (!mounted) return;
    setState(() => _saving = false);
    if (!result.ok) {
      setState(() => _error = result.message);
      return;
    }
    Navigator.pop(context, true);
  }

  @override
  Widget build(BuildContext context) {
    final projects = _clientProjects;
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 16, 20, 16 + MediaQuery.viewInsetsOf(context).bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Generate invoice', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: _clientId,
            dropdownColor: const Color(0xFF1A1A1A),
            style: const TextStyle(color: Colors.white),
            decoration: const InputDecoration(labelText: 'Client', labelStyle: TextStyle(color: Colors.grey)),
            items: [
              for (final client in widget.clients)
                DropdownMenuItem(value: _text(client, 'id', 'Id'), child: Text(_text(client, 'name', 'Name'))),
            ],
            onChanged: (value) => setState(() {
              _clientId = value ?? _clientId;
              _projectId = null;
            }),
          ),
          if (projects.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Text('This client has no projects yet.', style: TextStyle(color: Colors.grey)),
            )
          else
            DropdownButtonFormField<String>(
              key: ValueKey(_clientId),
              initialValue: _projectId ?? _text(projects.first, 'id', 'Id'),
              dropdownColor: const Color(0xFF1A1A1A),
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(labelText: 'Project', labelStyle: TextStyle(color: Colors.grey)),
              items: [
                for (final project in projects)
                  DropdownMenuItem(value: _text(project, 'id', 'Id'), child: Text(_text(project, 'name', 'Name'))),
              ],
              onChanged: (value) => setState(() => _projectId = value),
            ),
          TextField(
            controller: _amount,
            keyboardType: TextInputType.number,
            style: const TextStyle(color: Colors.white),
            decoration: const InputDecoration(labelText: 'Amount (R)', labelStyle: TextStyle(color: Colors.grey)),
          ),
          TextField(
            controller: _due,
            style: const TextStyle(color: Colors.white),
            decoration: const InputDecoration(labelText: 'Due date', labelStyle: TextStyle(color: Colors.grey)),
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(_error!, style: const TextStyle(color: yellow)),
          ],
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _saving ? null : _save,
              style: ElevatedButton.styleFrom(backgroundColor: yellow, foregroundColor: black),
              child: Text(_saving ? 'Sending…' : 'Generate & send to client'),
            ),
          ),
        ],
      ),
    );
  }
}
