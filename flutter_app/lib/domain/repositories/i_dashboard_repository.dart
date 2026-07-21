import '../../data/model/dashboard_dto.dart';
abstract interface class IDashboardRepository { Future<DashboardDto> load(String month); }
