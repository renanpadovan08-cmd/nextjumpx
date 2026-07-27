import '../model/auth_user_dto.dart';
import '../../services/api.dart';

class AuthRemoteDataSource {
  const AuthRemoteDataSource(this._api);
  final ApiClient _api;
  Future<({String token, AuthUserDto user})> login(
      String login, String password) async {
    final data =
        await _api.post('/auth/login', {'login': login, 'password': password})
            as Map<String, dynamic>;
    return (
      token: '${data['token']}',
      user: AuthUserDto.fromJson(data['user'] as Map<String, dynamic>)
    );
  }

  Future<AuthUserDto> me() async =>
      AuthUserDto.fromJson(await _api.get('/auth/me') as Map<String, dynamic>);
  Future<void> changePassword(String password) =>
      _api.post('/auth/change-password', {'password': password});
  Future<AuthUserDto> acceptTerms() async =>
      AuthUserDto.fromJson(await _api.post('/auth/accept-terms', {
        'accepted': true,
        'responsibilityConfirmed': true,
      }) as Map<String, dynamic>);
  Future<AuthUserDto> signup(
          {required String name,
          required String login,
          required String password,
          required String phone,
          required String shopName,
          required String plan}) async =>
      AuthUserDto.fromJson(await _api.post('/auth/signup', {
        'name': name,
        'login': login,
        'password': password,
        'phone': phone,
        'shopName': shopName,
        'plan': plan
      }) as Map<String, dynamic>);
}
