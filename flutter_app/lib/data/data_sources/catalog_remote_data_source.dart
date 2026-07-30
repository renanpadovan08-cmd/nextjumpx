import '../model/service_dto.dart';
import '../../services/api.dart';

class CatalogRemoteDataSource {
  const CatalogRemoteDataSource(this._api);
  final ApiClient _api;
  Future<List<ServiceDto>> list([String? barberId]) async =>
      (await _api.get('/services',
              query: barberId == null ? null : {'barberId': barberId}) as List)
          .map((item) => ServiceDto.fromJson(item as Map<String, dynamic>))
          .toList();
  Future<Map<String, dynamic>> listPage({
    String? barberId,
    int page = 1,
    int pageSize = 10,
  }) async {
    final response = Map<String, dynamic>.from(
      await _api.get('/services', query: {
        'paginated': 'true',
        'page': '$page',
        'pageSize': '$pageSize',
        if (barberId != null) 'barberId': barberId,
      }) as Map,
    );
    return {
      ...response,
      'items': ((response['items'] as List?) ?? const [])
          .map((item) => ServiceDto.fromJson(item as Map<String, dynamic>))
          .toList(),
    };
  }

  Future<ServiceDto> create(Map<String, dynamic> input) async =>
      ServiceDto.fromJson(
          await _api.post('/services', input) as Map<String, dynamic>);
  Future<ServiceDto> update(String id, Map<String, dynamic> input) async =>
      ServiceDto.fromJson(
          await _api.patch('/services/$id', input) as Map<String, dynamic>);
  Future<String> uploadImage(String id, Map<String, dynamic> input) async {
    final result = await _api.post('/uploads/images', {
      ...input,
      'kind': 'service',
      'serviceId': id,
    }) as Map<String, dynamic>;
    return '${result['url'] ?? ''}';
  }

  Future<void> delete(String id) => _api.delete('/services/$id');
}
