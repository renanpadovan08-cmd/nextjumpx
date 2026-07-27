import '../model/dashboard_dto.dart';
import '../../services/api.dart';

class DashboardRemoteDataSource {
  const DashboardRemoteDataSource(this._api);
  final ApiClient _api;
  Future<DashboardDto> load(String month) async => DashboardDto.fromJson(
      await _api.get('/dashboard/summary', query: {'month': month})
          as Map<String, dynamic>);
}
