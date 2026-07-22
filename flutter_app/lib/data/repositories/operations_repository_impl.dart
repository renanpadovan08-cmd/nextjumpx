import '../../domain/repositories/i_operations_repository.dart';
import '../data_sources/operations_remote_data_source.dart';

class OperationsRepositoryImpl implements IOperationsRepository {
  const OperationsRepositoryImpl(this._source);
  final OperationsRemoteDataSource _source;
  @override
  Future<dynamic> get(String feature, {Map<String, String>? query}) =>
      _source.get(feature, query: query);
  @override
  Future<dynamic> patch(String feature, String id, Map<String, dynamic> body) =>
      _source.patch(feature, id, body);

  @override
  Future<dynamic> patchBarber(String id, Map<String, dynamic> body) =>
      _source.patchBarber(id, body);

  @override
  Future<dynamic> patchCurrent(String feature, Map<String, dynamic> body) =>
      _source.patchCurrent(feature, body);

  @override
  Future<List<dynamic>> units() => _source.units();

  @override
  Future<dynamic> createUnit(Map<String, dynamic> body) => _source.createUnit(body);

  @override
  Future<dynamic> createCashEntry(Map<String, dynamic> body) => _source.createCashEntry(body);
}
