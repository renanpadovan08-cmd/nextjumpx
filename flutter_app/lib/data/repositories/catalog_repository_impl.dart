import '../../domain/repositories/i_catalog_repository.dart';
import '../data_sources/catalog_remote_data_source.dart';
import '../model/service_dto.dart';

class CatalogRepositoryImpl implements ICatalogRepository {
  const CatalogRepositoryImpl(this._source);
  final CatalogRemoteDataSource _source;
  @override
  Future<List<ServiceDto>> list([String? barberId]) => _source.list(barberId);
  @override
  Future<Map<String, dynamic>> listPage({
    String? barberId,
    int page = 1,
    int pageSize = 10,
  }) =>
      _source.listPage(
        barberId: barberId,
        page: page,
        pageSize: pageSize,
      );
  @override
  Future<ServiceDto> create(Map<String, dynamic> input) =>
      _source.create(input);
  @override
  Future<ServiceDto> update(String id, Map<String, dynamic> input) =>
      _source.update(id, input);
  @override
  Future<String> uploadImage(String id, Map<String, dynamic> input) =>
      _source.uploadImage(id, input);
  @override
  Future<void> delete(String id) => _source.delete(id);
}
