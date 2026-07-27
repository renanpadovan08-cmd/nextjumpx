import '../../domain/repositories/i_dashboard_repository.dart';
import '../data_sources/dashboard_remote_data_source.dart';
import '../model/dashboard_dto.dart';

class DashboardRepositoryImpl implements IDashboardRepository {
  const DashboardRepositoryImpl(this._source);
  final DashboardRemoteDataSource _source;
  @override
  Future<DashboardDto> load(String month) => _source.load(month);
}
