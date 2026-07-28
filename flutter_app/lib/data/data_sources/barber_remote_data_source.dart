import '../model/barber_dto.dart';
import '../../services/api.dart';

class BarberRemoteDataSource {
  const BarberRemoteDataSource(this._api);
  final ApiClient _api;
  Future<List<BarberDto>> list() async => (await _api.get('/barbers') as List)
      .map((item) => BarberDto.fromJson(item as Map<String, dynamic>))
      .toList();
  Future<BarberDto> create(Map<String, dynamic> input) async =>
      BarberDto.fromJson(
          await _api.post('/barbers', input) as Map<String, dynamic>);
  Future<BarberDto> update(String id, Map<String, dynamic> input) async =>
      BarberDto.fromJson(
          await _api.patch('/barbers/$id', input) as Map<String, dynamic>);
  Future<String> uploadPhoto(String id, Map<String, dynamic> input) async {
    final result = await _api.post('/uploads/images', {
      ...input,
      'kind': 'professional',
      'barberId': id,
    }) as Map<String, dynamic>;
    return '${result['url'] ?? ''}';
  }
}
