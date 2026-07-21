import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/app_config.dart';

class ApiException implements Exception {
  const ApiException(this.message, this.statusCode);
  final String message;
  final int statusCode;
  @override String toString() => message;
}

class ApiClient {
  ApiClient({http.Client? httpClient}) : _http = httpClient ?? http.Client();
  final http.Client _http;
  String? _token;
  void setToken(String? value) => _token = value;

  Future<dynamic> get(String path, {Map<String, String>? query}) => _send('GET', path, query: query);
  Future<dynamic> post(String path, Map<String, dynamic> body) => _send('POST', path, body: body);
  Future<dynamic> patch(String path, Map<String, dynamic> body) => _send('PATCH', path, body: body);
  Future<void> delete(String path) async => _send('DELETE', path);

  Future<dynamic> _send(String method, String path, {Map<String, String>? query, Map<String, dynamic>? body}) async {
    final uri = Uri.parse('${AppConfig.apiBaseUrl}$path').replace(queryParameters: query);
    final request = http.Request(method, uri)..headers['Content-Type'] = 'application/json';
    if (_token != null) request.headers['Authorization'] = 'Bearer $_token';
    if (body != null) request.body = jsonEncode(body);
    final streamed = await _http.send(request);
    final response = await http.Response.fromStream(streamed);
    final decoded = response.body.isEmpty ? null : jsonDecode(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) throw ApiException(decoded is Map ? '${decoded['message'] ?? 'Falha na requisicao'}' : 'Falha na requisicao', response.statusCode);
    return decoded;
  }
}
