import 'package:flutter/material.dart';

import '../api/portal_api.dart';

class AuditTrailScreen extends StatefulWidget {
  final String token;
  final bool embedded;

  const AuditTrailScreen({super.key, required this.token, this.embedded = false});

  @override
  State<AuditTrailScreen> createState() => _AuditTrailScreenState();
}

class _AuditTrailScreenState extends State<AuditTrailScreen> {
  static const Color yellow = Color(0xFFFFEE0B);
  static const Color black = Color(0xFF0D0D0D);

  static const _filters = [
    ('signins', 'User access'),
    ('all', 'Everything'),
    ('accounts', 'Accounts'),
  ];

  String _category = 'signins';
  bool _loading = true;
  String _error = '';
  List<Map<String, dynamic>> _events = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = '';
    });
    final query = _category == 'all' ? '' : '?category=$_category';
    final result = await PortalApi.get('/api/audit$query', token: widget.token);
    if (!mounted) return;

    if (!result.ok) {
      setState(() {
        _loading = false;
        _error = result.message;
        _events = [];
      });
      return;
    }

    setState(() {
      _loading = false;
      _events = result.list
          .whereType<Map<String, dynamic>>()
          .toList();
    });
  }

  String _sentence(Map<String, dynamic> event) {
    final actor = event['actor']?.toString() ?? 'Someone';
    final target = event['target']?.toString() ?? '';
    switch (event['type']?.toString()) {
      case 'signin':
        return '$actor signed in';
      case 'signin_failed':
        return 'A failed sign-in was recorded for $target';
      case 'signout':
        return '$actor signed out';
      case 'user_added':
        return '$actor added $target to the team';
      case 'account_ready':
        return '$actor chose a password and activated $target';
      case 'password_reset':
        return '$actor reset the password for $target';
      default:
        return '$actor updated $target';
    }
  }

  String _when(Object? value) {
    final parsed = DateTime.tryParse(value?.toString() ?? '');
    if (parsed == null) return '';
    final local = parsed.toLocal();
    final hour = local.hour.toString().padLeft(2, '0');
    final minute = local.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }

  @override
  Widget build(BuildContext context) {
    final content = Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (widget.embedded)
            const Padding(
              padding: EdgeInsets.fromLTRB(22, 16, 22, 4),
              child: Text('Audit trail', style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold)),
            ),
          const Padding(
            padding: EdgeInsets.fromLTRB(22, 8, 22, 12),
            child: Text(
              'Who signed in, who was blocked, and which accounts changed.',
              style: TextStyle(color: Colors.grey),
            ),
          ),
          SizedBox(
            height: 46,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: _filters.map((filter) {
                final selected = _category == filter.$1;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(filter.$2),
                    selected: selected,
                    selectedColor: yellow,
                    backgroundColor: const Color(0xFF1A1A1A),
                    labelStyle: TextStyle(
                      color: selected ? black : Colors.white,
                      fontWeight: FontWeight.w600,
                    ),
                    onSelected: (_) {
                      setState(() => _category = filter.$1);
                      _load();
                    },
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: yellow))
                : _error.isNotEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Text(_error, style: const TextStyle(color: Colors.white)),
                        ),
                      )
                    : _events.isEmpty
                        ? const Center(
                            child: Text(
                              'No events in this view yet.',
                              style: TextStyle(color: Colors.grey),
                            ),
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.all(16),
                            itemCount: _events.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 10),
                            itemBuilder: (context, index) {
                              final event = _events[index];
                              return Container(
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF1A1A1A),
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        _sentence(event),
                                        style: const TextStyle(color: Colors.white),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Text(
                                      _when(event['at']),
                                      style: const TextStyle(color: Colors.grey, fontSize: 12),
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
          ),
        ],
      );
    if (widget.embedded) {
      return ColoredBox(color: black, child: SafeArea(child: content));
    }
    return Scaffold(
      backgroundColor: black,
      appBar: AppBar(
        backgroundColor: black,
        foregroundColor: Colors.white,
        title: const Text('Audit trail'),
      ),
      body: content,
    );
  }
}
