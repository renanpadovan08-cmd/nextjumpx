import '../../domain/repositories/i_auth_repository.dart';
import '../data_sources/auth_remote_data_source.dart';
import '../model/auth_user_dto.dart';
class AuthRepositoryImpl implements IAuthRepository { const AuthRepositoryImpl(this._source); final AuthRemoteDataSource _source; @override Future<({String token, AuthUserDto user})> login(String login, String password) => _source.login(login, password); @override Future<AuthUserDto> me() => _source.me(); }
