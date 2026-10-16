import 'dart:convert';
import 'dart:math';

import 'package:http/http.dart' as http;

class PortalApi {
  static const String baseUrl =
      'https://lethabo-portal-api-g6dzc3gphwbsameu.southafricanorth-01.azurewebsites.net';

  static const String portalUrl =
      'https://client-project-portal-a28c.onrender.com';

  static String sixDigitCode() {
    final value = Random.secure().nextInt(900000) + 100000;
    return value.toString();
  }

  static Future<ApiResult> post(
    String path,
    Map<String, dynamic> body, {
    String? token,
  }) {
    return _send('POST', path, body: body, token: token);
  }

  static Future<ApiResult> get(String path, {String? token}) {
    return _send('GET', path, token: token);
  }

  static Future<ApiResult> _send(
    String method,
    String path, {
    Map<String, dynamic>? body,
    String? token,
  }) async {
    try {
      final headers = <String, String>{'Content-Type': 'application/json'};
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }

      final uri = Uri.parse('$baseUrl$path');
      final response = method == 'GET'
          ? await http.get(uri, headers: headers)
          : await http.post(uri, headers: headers, body: jsonEncode(body));

      Object? data;
      if (response.body.isNotEmpty) {
        data = jsonDecode(response.body);
      }

      return ApiResult(statusCode: response.statusCode, data: data);
    } catch (_) {
      return ApiResult(
        statusCode: 0,
        data: {'message': 'Unable to connect to the server. Please try again.'},
      );
    }
  }
}

class ApiResult {
  final int statusCode;
  final Object? data;

  const ApiResult({required this.statusCode, required this.data});

  bool get ok => statusCode >= 200 && statusCode < 300;

  Map<String, dynamic> get map =>
      data is Map<String, dynamic> ? data as Map<String, dynamic> : {};

  List<dynamic> get list => data is List ? data as List : const [];

  String get message {
    final value = map['message'];
    if (value is String && value.isNotEmpty) return value;
    if (statusCode == 404) return 'This action is not available on the server yet.';
    if (statusCode == 0) return 'Unable to connect to the server. Please try again.';
    return 'The request could not be completed.';
  }
}

class PortalUser {
  final String id;
  final String name;
  final String email;
  final String role;
  final String clientId;
  final String memberId;
  final String title;
  final String token;

  const PortalUser({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.clientId,
    required this.memberId,
    required this.title,
    required this.token,
  });

  bool get isAdministrator => role.toLowerCase() == 'administrator';

  factory PortalUser.fromLogin(Map<String, dynamic> body) {
    final user = body['user'];
    final record = user is Map<String, dynamic> ? user : <String, dynamic>{};
    return PortalUser(
      id: record['id']?.toString() ?? '',
      name: record['name']?.toString() ?? '',
      email: record['email']?.toString() ?? '',
      role: record['role']?.toString() ?? '',
      clientId: record['clientId']?.toString() ?? '',
      memberId: record['memberId']?.toString() ?? '',
      title: record['title']?.toString() ?? '',
      token: body['token']?.toString() ?? '',
    );
  }
}
