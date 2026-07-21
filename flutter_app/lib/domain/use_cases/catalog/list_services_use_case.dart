import '../../repositories/i_catalog_repository.dart'; import '../../../data/model/service_dto.dart';
class ListServicesUseCase { const ListServicesUseCase(this._repository); final ICatalogRepository _repository; Future<List<ServiceDto>> call(String barberId)=>_repository.list(barberId); }
