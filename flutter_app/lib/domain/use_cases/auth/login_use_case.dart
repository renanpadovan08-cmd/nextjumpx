import '../../repositories/i_auth_repository.dart';
import '../../../data/model/auth_user_dto.dart';

class LoginUseCase {
  const LoginUseCase(this._repository);
  final IAuthRepository _repository;
  Future<({String token, AuthUserDto user})> call(
          String login, String password) =>
      _repository.login(login, password);
}
