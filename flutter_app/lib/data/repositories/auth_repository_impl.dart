import '../../domain/repositories/i_auth_repository.dart';
import '../data_sources/auth_remote_data_source.dart';
import '../model/auth_user_dto.dart';

class AuthRepositoryImpl implements IAuthRepository {
  const AuthRepositoryImpl(this._source);
  final AuthRemoteDataSource _source;
  @override
  Future<({String token, AuthUserDto user})> login(
          String login, String password) =>
      _source.login(login, password);
  @override
  Future<AuthUserDto> me() => _source.me();
  @override
  Future<void> changePassword(String password) =>
      _source.changePassword(password);
  @override
  Future<AuthUserDto> signup(
          {required String name,
          required String login,
          required String password,
          required String phone,
          required String shopName,
          required String plan}) =>
      _source.signup(
          name: name,
          login: login,
          password: password,
          phone: phone,
          shopName: shopName,
          plan: plan);
}
