import '../../domain/repositories/i_admin_repository.dart';
import '../data_sources/admin_remote_data_source.dart';

class AdminRepositoryImpl implements IAdminRepository {
  const AdminRepositoryImpl(this._source);
  final AdminRemoteDataSource _source;

  @override
  Future<List<Map<String, dynamic>>> listShops() => _source.listShops();

  @override
  Future<Map<String, dynamic>> updateAccess(String barberId, Map<String, dynamic> value) =>
      _source.updateAccess(barberId, value);

  @override
  Future<void> resetPassword(String barberId, String password) =>
      _source.resetPassword(barberId, password);
}
