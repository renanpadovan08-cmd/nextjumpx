import '../../data/model/auth_user_dto.dart';
abstract interface class IAuthRepository {
  Future<({String token, AuthUserDto user})> login(String login, String password);
  Future<AuthUserDto> me();
}
