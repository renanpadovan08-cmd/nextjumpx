import '../../data/model/service_dto.dart';

abstract interface class ICatalogRepository {
  Future<List<ServiceDto>> list([String? barberId]);
  Future<Map<String, dynamic>> listPage({
    String? barberId,
    int page,
    int pageSize,
  });
  Future<ServiceDto> create(Map<String, dynamic> input);
  Future<ServiceDto> update(String id, Map<String, dynamic> input);
  Future<String> uploadImage(String id, Map<String, dynamic> input);
  Future<void> delete(String id);
}
