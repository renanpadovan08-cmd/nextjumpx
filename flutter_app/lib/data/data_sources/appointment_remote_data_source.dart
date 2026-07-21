import '../model/appointment_dto.dart';
import '../../services/api.dart';

class AppointmentRemoteDataSource {
  const AppointmentRemoteDataSource(this._api);
  final ApiClient _api;
  Future<List<AppointmentDto>> list({String? barberId, String? date}) async {
    final query = <String, String>{if (barberId != null) 'barberId': barberId, if (date != null) 'date': date};
    return (await _api.get('/appointments', query: query) as List).map((item) => AppointmentDto.fromJson(item as Map<String, dynamic>)).toList();
  }
  Future<AppointmentDto> create(Map<String, dynamic> input) async => AppointmentDto.fromJson(await _api.post('/appointments', input) as Map<String, dynamic>);
  Future<AppointmentDto> update(String id, Map<String, dynamic> input) async => AppointmentDto.fromJson(await _api.patch('/appointments/$id', input) as Map<String, dynamic>);
}
