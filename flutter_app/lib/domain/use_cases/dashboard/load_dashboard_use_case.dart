import '../../repositories/i_dashboard_repository.dart'; import '../../../data/model/dashboard_dto.dart';
class LoadDashboardUseCase { const LoadDashboardUseCase(this._repository); final IDashboardRepository _repository; Future<DashboardDto> call(String month)=>_repository.load(month); }
