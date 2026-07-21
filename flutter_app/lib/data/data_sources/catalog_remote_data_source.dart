import '../model/service_dto.dart';
import '../../services/api.dart';

class CatalogRemoteDataSource {
  const CatalogRemoteDataSource(this._api);
  final ApiClient _api;
  Future<List<ServiceDto>> list(String barberId) async => (await _api.get('/services', query: {'barberId': barberId}) as List).map((item) => ServiceDto.fromJson(item as Map<String, dynamic>)).toList();
  Future<ServiceDto> create(Map<String, dynamic> input) async => ServiceDto.fromJson(await _api.post('/services', input) as Map<String, dynamic>);
  Future<void> delete(String id) => _api.delete('/services/$id');
}
