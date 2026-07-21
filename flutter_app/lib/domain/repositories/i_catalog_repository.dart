import '../../data/model/service_dto.dart';
abstract interface class ICatalogRepository { Future<List<ServiceDto>> list(String barberId); Future<ServiceDto> create(Map<String, dynamic> input); Future<void> delete(String id); }
