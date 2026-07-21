import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../data/model/auth_user_dto.dart';
import '../../../domain/repositories/i_auth_repository.dart';
import '../../../services/api.dart';

class AppViewModel extends ChangeNotifier {
  AppViewModel(this._authRepository, this._api);
  final IAuthRepository _authRepository;
  final ApiClient _api;
  AuthUserDto? user;
  bool loading = true;
  String? error;
  bool get authenticated => user != null;

  Future<void> restoreSession() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    if (token != null) {
      _api.setToken(token);
      try { user = await _authRepository.me(); } catch (_) { await prefs.remove('token'); _api.setToken(null); }
    }
    loading = false;
    notifyListeners();
  }

  Future<bool> login(String login, String password) async {
    error = null; loading = true; notifyListeners();
    try {
      final result = await _authRepository.login(login, password);
      _api.setToken(result.token);
      await (await SharedPreferences.getInstance()).setString('token', result.token);
      user = result.user;
      return true;
    } on ApiException catch (exception) { error = exception.message; return false; }
    finally { loading = false; notifyListeners(); }
  }

  Future<void> logout() async { _api.setToken(null); await (await SharedPreferences.getInstance()).remove('token'); user = null; notifyListeners(); }
}
