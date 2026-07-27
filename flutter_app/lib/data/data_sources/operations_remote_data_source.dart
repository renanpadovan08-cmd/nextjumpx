import '../../services/api.dart';

class OperationsRemoteDataSource {
  const OperationsRemoteDataSource(this._api);
  final ApiClient _api;

  Future<dynamic> get(String feature, {Map<String, String>? query}) =>
      _api.get('/operations/$feature', query: query);

  Future<dynamic> patch(String feature, String id, Map<String, dynamic> body) =>
      _api.patch('/operations/$feature/$id', body);

  Future<dynamic> patchBarber(String id, Map<String, dynamic> body) =>
      _api.patch('/barbers/$id', body);

  Future<dynamic> patchCurrent(String feature, Map<String, dynamic> body) =>
      _api.patch('/operations/$feature', body);

  Future<List<dynamic>> units() async =>
      await _api.get('/units/requests') as List<dynamic>;
  Future<dynamic> createUnit(Map<String, dynamic> body) =>
      _api.post('/units/requests', body);
  Future<dynamic> createCashEntry(Map<String, dynamic> body) =>
      _api.post('/operations/cash/entries', body);
  Future<void> deleteCashEntry(String id) =>
      _api.delete('/operations/cash/entries/$id');
  Future<dynamic> createCashClosure(Map<String, dynamic> body) =>
      _api.post('/operations/cash/closures', body);
  Future<dynamic> createRetentionAction(Map<String, dynamic> body) =>
      _api.post('/operations/retention/actions', body);
  Future<dynamic> uploadImage(Map<String, dynamic> body) =>
      _api.post('/uploads/images', body);
}
