import '../../services/api.dart';

class AdminRemoteDataSource {
  const AdminRemoteDataSource(this._api);
  final ApiClient _api;

  Future<List<Map<String, dynamic>>> listShops() async =>
      List<Map<String, dynamic>>.from(await _api.get('/admin/barbers') as List);

  Future<Map<String, dynamic>> updateAccess(
    String barberId,
    Map<String, dynamic> value,
  ) async => Map<String, dynamic>.from(
      await _api.patch('/admin/barbers/$barberId/access', value) as Map,
    );

  Future<void> resetPassword(String barberId, String password) async {
    await _api.post('/admin/barbers/$barberId/password-reset', {'password': password});
  }
}
