import '../../data/model/auth_user_dto.dart';

abstract interface class IAuthRepository {
  Future<({String token, AuthUserDto user})> login(
      String login, String password);
  Future<AuthUserDto> me();
  Future<void> changePassword(String password);
  Future<AuthUserDto> signup(
      {required String name,
      required String login,
      required String password,
      required String phone,
      required String shopName,
      required String plan});
}
