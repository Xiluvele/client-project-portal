import 'package:flutter/material.dart';

import '../api/portal_api.dart';
import '../widgets/portal_field.dart';
import 'add_user_screen.dart';
import 'audit_trail_screen.dart';

class AdminHomeScreen extends StatefulWidget {
  final String token;
  final String userId;

  const AdminHomeScreen({super.key, required this.token, required this.userId});

  @override
  State<AdminHomeScreen> createState() => _AdminHomeScreenState();
}

class _AdminHomeScreenState extends State<AdminHomeScreen> {
  static const yellow = Color(0xFFFFEE0B);
  static const black = Color(0xFF0D0D0D);
  static const cardColor = Color(0xFF1A1A1A);

  final _search = TextEditingController();
  List<Map<String, dynamic>> _people = [];
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

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final result = await PortalApi.get('/api/accounts', token: widget.token);
    if (!mounted) return;
    setState(() {
      _loading = false;
      if (result.ok) {
        _people = result.list
            .map(
              (item) => item is Map
                  ? Map<String, dynamic>.from(item)
                  : <String, dynamic>{},
            )
            .toList();
      } else {
        _error = result.message;
      }
    });
  }

  List<Map<String, dynamic>> get _filtered {
    final query = _search.text.trim().toLowerCase();
    if (query.isEmpty) return _people;
    return _people.where((person) {
      final haystack = [
        person['name'],
        person['email'],
        person['role'],
        person['company'],
      ].join(' ').toLowerCase();
      return haystack.contains(query);
    }).toList();
  }

  String _roleLabel(Object? role) {
    switch ('$role'.toLowerCase()) {
      case 'administrator':
        return 'Administrator';
      case 'manager':
        return 'Project Manager';
      case 'developer':
        return 'Developer';
      case 'client':
        return 'Client';
      default:
        return '$role';
    }
  }

  Future<void> _add() async {
    final note = await Navigator.push<String>(
      context,
      MaterialPageRoute(
        builder: (context) => AddUserScreen(token: widget.token),
      ),
    );
    if (!mounted || note == null || note.isEmpty) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(note), backgroundColor: cardColor));
    await _load();
  }

  Future<void> _open(Map<String, dynamic> person) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: cardColor,
      builder: (context) => _PersonSheet(
        token: widget.token,
        person: person,
        currentUserId: widget.userId,
      ),
    );
    if (mounted) _load();
  }

  @override
  Widget build(BuildContext context) {
    final people = _filtered;
    return SafeArea(
      child: _loading
          ? const Center(child: CircularProgressIndicator(color: yellow))
          : RefreshIndicator(
              color: yellow,
              backgroundColor: cardColor,
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(22, 20, 22, 32),
                children: [
                  const Text(
                    'Team & Access',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'The same people, roles, and audit trail as the website.',
                    style: TextStyle(color: Colors.grey),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _search,
                    onChanged: (_) => setState(() {}),
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      hintText: 'Search users and clients',
                      hintStyle: const TextStyle(color: Colors.grey),
                      filled: true,
                      fillColor: cardColor,
                      prefixIcon: const Icon(Icons.search, color: Colors.grey),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  _action(
                    Icons.person_add_alt_1_rounded,
                    'Add user',
                    'Send an activation email.',
                    _add,
                  ),
                  const SizedBox(height: 10),
                  _action(
                    Icons.fact_check_outlined,
                    'Audit trail',
                    'User access and recorded changes.',
                    () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) =>
                              AuditTrailScreen(token: widget.token),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 18),
                  if (_error != null)
                    Text(_error!, style: const TextStyle(color: yellow)),
                  if (people.isEmpty)
                    Text(
                      _people.isEmpty
                          ? 'No users are in the system yet.'
                          : 'No people match that search.',
                      style: const TextStyle(color: Colors.grey),
                    ),
                  for (final person in people)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Material(
                        color: cardColor,
                        borderRadius: BorderRadius.circular(16),
                        child: ListTile(
                          onTap: () => _open(person),
                          title: Text(
                            '${person['name'] ?? ''}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          subtitle: Text(
                            '${person['email'] ?? ''}${_company(person)}',
                            style: const TextStyle(color: Colors.grey),
                          ),
                          trailing: Text(
                            _roleLabel(person['role']),
                            style: const TextStyle(
                              color: yellow,
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
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

  String _company(Map<String, dynamic> person) {
    final company = '${person['company'] ?? ''}'.trim();
    return company.isEmpty ? '' : ' · $company';
  }

  Widget _action(
    IconData icon,
    String title,
    String subtitle,
    VoidCallback onTap,
  ) {
    return Material(
      color: cardColor,
      borderRadius: BorderRadius.circular(16),
      child: ListTile(
        leading: Icon(icon, color: yellow),
        title: Text(
          title,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
          ),
        ),
        subtitle: Text(subtitle, style: const TextStyle(color: Colors.grey)),
        trailing: const Icon(Icons.chevron_right_rounded, color: Colors.grey),
        onTap: onTap,
      ),
    );
  }
}

class _PersonSheet extends StatefulWidget {
  final String token;
  final Map<String, dynamic> person;
  final String currentUserId;

  const _PersonSheet({
    required this.token,
    required this.person,
    required this.currentUserId,
  });

  @override
  State<_PersonSheet> createState() => _PersonSheetState();
}

class _PersonSheetState extends State<_PersonSheet> {
  static const yellow = Color(0xFFFFEE0B);
  static const black = Color(0xFF0D0D0D);

  late final TextEditingController _name;
  late final TextEditingController _email;
  late final TextEditingController _phone;
  late final TextEditingController _company;
  late String _role;
  bool _saving = false;
  String? _error;

  bool get _hasAccount => widget.person['hasAccount'] != false;
  bool get _active => widget.person['active'] != false;
  bool get _self => '${widget.person['id'] ?? ''}' == widget.currentUserId;

  @override
  void initState() {
    super.initState();
    _name = TextEditingController(text: '${widget.person['name'] ?? ''}');
    _email = TextEditingController(text: '${widget.person['email'] ?? ''}');
    _phone = TextEditingController(text: '${widget.person['phone'] ?? ''}');
    _company = TextEditingController(text: '${widget.person['company'] ?? ''}');
    _role = '${widget.person['role'] ?? 'developer'}';
  }

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _phone.dispose();
    _company.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_name.text.trim().length < 2 || !_email.text.contains('@')) {
      setState(() => _error = 'Name and a valid email are required.');
      return;
    }
    if (_role == 'client' && _company.text.trim().isEmpty) {
      setState(() => _error = 'A client account needs a company name.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    final result = await PortalApi.put('/api/accounts/${widget.person['id']}', {
      'name': _name.text.trim(),
      'email': _email.text.trim(),
      'role': _role,
      'phone': _phone.text.trim(),
      'company': _company.text.trim(),
    }, token: widget.token);
    if (!mounted) return;
    setState(() => _saving = false);
    if (!result.ok) {
      setState(() => _error = result.message);
      return;
    }
    Navigator.pop(context);
  }

  Future<void> _status(bool active) async {
    setState(() => _saving = true);
    final result = await PortalApi.post(
      '/api/accounts/${widget.person['id']}/status',
      {'active': active},
      token: widget.token,
    );
    if (!mounted) return;
    setState(() => _saving = false);
    if (!result.ok) {
      setState(() => _error = result.message);
      return;
    }
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        16,
        20,
        20 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${widget.person['name'] ?? 'Person'}',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              _hasAccount
                  ? '${widget.person['email'] ?? ''}'
                  : 'Client record without a sign-in',
              style: const TextStyle(color: Colors.grey),
            ),
            if (_error != null) ...[
              const SizedBox(height: 10),
              Text(_error!, style: const TextStyle(color: yellow)),
            ],
            if (_hasAccount) ...[
              const SizedBox(height: 14),
              PortalField(controller: _name, label: 'Name', hint: 'Full name'),
              const SizedBox(height: 10),
              PortalField(
                controller: _email,
                label: 'Email',
                hint: 'name@company.co.za',
              ),
              const SizedBox(height: 10),
              PortalField(
                controller: _phone,
                label: 'Phone',
                hint: '082 123 4567',
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                initialValue: _role,
                dropdownColor: const Color(0xFF1A1A1A),
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  labelText: 'Role',
                  labelStyle: TextStyle(color: Colors.grey),
                ),
                items: const [
                  DropdownMenuItem(
                    value: 'administrator',
                    child: Text('Administrator'),
                  ),
                  DropdownMenuItem(
                    value: 'manager',
                    child: Text('Project manager'),
                  ),
                  DropdownMenuItem(
                    value: 'developer',
                    child: Text('Developer'),
                  ),
                  DropdownMenuItem(value: 'client', child: Text('Client')),
                ],
                onChanged: (value) => setState(() => _role = value ?? _role),
              ),
              if (_role == 'client') ...[
                const SizedBox(height: 10),
                PortalField(
                  controller: _company,
                  label: 'Company',
                  hint: 'Company name',
                ),
              ],
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: yellow,
                    foregroundColor: black,
                  ),
                  onPressed: _saving ? null : _save,
                  child: Text(_saving ? 'Saving...' : 'Save'),
                ),
              ),
              if (!_self) ...[
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: TextButton(
                    onPressed: _saving ? null : () => _status(!_active),
                    child: Text(
                      _active ? 'Deactivate account' : 'Activate account',
                      style: const TextStyle(color: yellow),
                    ),
                  ),
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }
}
