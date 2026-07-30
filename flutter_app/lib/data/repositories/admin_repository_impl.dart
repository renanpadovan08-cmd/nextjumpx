import '../../domain/repositories/i_admin_repository.dart';
import '../data_sources/admin_remote_data_source.dart';

class AdminRepositoryImpl implements IAdminRepository {
  const AdminRepositoryImpl(this._source);
  final AdminRemoteDataSource _source;

  @override
  Future<Map<String, dynamic>> listShops({
    int page = 1,
    int pageSize = 10,
    String search = '',
  }) =>
      _source.listShops(page: page, pageSize: pageSize, search: search);

  @override
  Future<Map<String, dynamic>> updateAccess(
          String barberId, Map<String, dynamic> value) =>
      _source.updateAccess(barberId, value);

  @override
  Future<void> resetPassword(String barberId, String password) =>
      _source.resetPassword(barberId, password);

  @override
  Future<void> setCashPassword(String barberId, String password) =>
      _source.setCashPassword(barberId, password);

  @override
  Future<Map<String, dynamic>> createAccount(Map<String, dynamic> value) =>
      _source.createAccount(value);

  @override
  Future<Map<String, dynamic>> updateSettings(
          String barberId, Map<String, dynamic> value) =>
      _source.updateSettings(barberId, value);

  @override
  Future<void> markPaid(String barberId, {String? date}) =>
      _source.markPaid(barberId, date: date);

  @override
  Future<void> deleteAccount(String barberId) =>
      _source.deleteAccount(barberId);

  @override
  Future<List<Map<String, dynamic>>> listUnitRequests() =>
      _source.listUnitRequests();

  @override
  Future<Map<String, dynamic>> updateUnitRequest(
          String requestId, String status) =>
      _source.updateUnitRequest(requestId, status);
}
