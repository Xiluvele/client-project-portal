List<Map<String, dynamic>> visibleProjects({
  required List<Map<String, dynamic>> projects,
  required String role,
  required String clientId,
  required String memberId,
  required String userId,
  required String email,
  List<Map<String, dynamic>> clients = const [],
  List<Map<String, dynamic>> members = const [],
}) {
  final normalised = role.trim().toLowerCase();
  if (normalised == 'manager' || normalised == 'projectmanager' || normalised == 'project manager') {
    return projects;
  }

  if (normalised == 'client') {
    final ids = <String>{};
    if (clientId.trim().isNotEmpty) ids.add(clientId.trim());
    final address = email.trim().toLowerCase();
    for (final client in clients) {
      final clientEmail = '${client['email'] ?? client['Email'] ?? ''}'.toLowerCase();
      if (address.isNotEmpty && clientEmail == address) {
        final id = '${client['id'] ?? client['Id'] ?? ''}';
        if (id.isNotEmpty) ids.add(id);
      }
    }
    return projects.where((project) => ids.contains('${project['clientId'] ?? project['ClientId'] ?? ''}')).toList();
  }

  if (normalised == 'developer') {
    final ids = <String>{memberId.trim(), userId.trim()}.where((id) => id.isNotEmpty).toSet();
    final address = email.trim().toLowerCase();
    for (final member in members) {
      final memberEmail = '${member['email'] ?? member['Email'] ?? ''}'.toLowerCase();
      if (address.isNotEmpty && memberEmail == address) {
        final id = '${member['id'] ?? member['Id'] ?? ''}';
        if (id.isNotEmpty) ids.add(id);
      }
    }
    return projects.where((project) {
      final linked = project['memberIds'] ?? project['MemberIds'];
      if (linked is List && linked.map((item) => item.toString()).any(ids.contains)) return true;
      final tasks = project['tasks'] ?? project['Tasks'];
      if (tasks is! List) return false;
      return tasks.any((task) {
        if (task is! Map) return false;
        final assignee = '${task['assigneeId'] ?? task['AssigneeId'] ?? ''}';
        return ids.contains(assignee);
      });
    }).toList();
  }

  return const [];
}
