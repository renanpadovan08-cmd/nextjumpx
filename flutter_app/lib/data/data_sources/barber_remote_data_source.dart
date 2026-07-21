import '../model/barber_dto.dart';
import '../../services/api.dart';

class BarberRemoteDataSource {
  const BarberRemoteDataSource(this._api);
  final ApiClient _api;
  Future<List<BarberDto>> list() async => (await _api.get('/barbers') as List).map((item) => BarberDto.fromJson(item as Map<String, dynamic>)).toList();
  Future<BarberDto> create(Map<String, dynamic> input) async => BarberDto.fromJson(await _api.post('/barbers', input) as Map<String, dynamic>);
}
