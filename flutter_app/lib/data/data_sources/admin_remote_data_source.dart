import '../../services/api.dart';

class AdminRemoteDataSource {
  const AdminRemoteDataSource(this._api);
  final ApiClient _api;

  Future<List<Map<String, dynamic>>> listShops() async =>
      List<Map<String, dynamic>>.from(await _api.get('/admin/barbers') as List);

  Future<Map<String, dynamic>> updateAccess(
    String barberId,
    Map<String, dynamic> value,
  ) async =>
      Map<String, dynamic>.from(
        await _api.patch('/admin/barbers/$barberId/access', value) as Map,
      );

  Future<void> resetPassword(String barberId, String password) async {
    await _api.post(
        '/admin/barbers/$barberId/password-reset', {'password': password});
  }

  Future<void> setCashPassword(String barberId, String password) async {
    await _api.put(
      '/admin/barbers/$barberId/cash-password',
      {'password': password},
    );
  }

  Future<Map<String, dynamic>> createAccount(
          Map<String, dynamic> value) async =>
      Map<String, dynamic>.from(
          await _api.post('/admin/barbers', value) as Map);

  Future<Map<String, dynamic>> updateSettings(
    String barberId,
    Map<String, dynamic> value,
  ) async =>
      Map<String, dynamic>.from(
        await _api.put('/admin/barbers/$barberId/settings', value) as Map,
      );

  Future<void> markPaid(String barberId, {String? date}) async {
    await _api.post('/admin/barbers/$barberId/payment', {
      if (date != null && date.isNotEmpty) 'date': date,
    });
  }

  Future<void> deleteAccount(String barberId) =>
      _api.delete('/admin/barbers/$barberId');

  Future<List<Map<String, dynamic>>> listUnitRequests() async =>
      List<Map<String, dynamic>>.from(
          await _api.get('/units/requests') as List);

  Future<Map<String, dynamic>> updateUnitRequest(
    String requestId,
    String status,
  ) async =>
      Map<String, dynamic>.from(
        await _api.patch('/units/requests/$requestId', {'status': status})
            as Map,
      );
}
