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
  Future<Map<String, dynamic>> unitConfiguration() =>
      _source.unitConfiguration();

  @override
  Future<dynamic> createUnit(Map<String, dynamic> body) =>
      _source.createUnit(body);

  @override
  Future<dynamic> assignBarberUnit(String barberId, String? unitId) =>
      _source.assignBarberUnit(barberId, unitId);

  @override
  Future<dynamic> createCashEntry(Map<String, dynamic> body) =>
      _source.createCashEntry(body);
  @override
  Future<void> deleteCashEntry(String id) => _source.deleteCashEntry(id);
  @override
  Future<dynamic> createCashClosure(Map<String, dynamic> body) =>
      _source.createCashClosure(body);
  @override
  Future<dynamic> updateCashReceipt(String id, Map<String, dynamic> body) =>
      _source.updateCashReceipt(id, body);
  @override
  Future<Map<String, dynamic>> cashAccess() => _source.cashAccess();
  @override
  Future<String> unlockCash(String password) => _source.unlockCash(password);
  @override
  void setCashToken(String? token) => _source.setCashToken(token);
  @override
  Future<dynamic> backup() => _source.backup();
  @override
  Future<dynamic> createHoursClosure(Map<String, dynamic> body) =>
      _source.createHoursClosure(body);
  @override
  Future<void> deleteHoursClosure(String id) => _source.deleteHoursClosure(id);
  @override
  Future<dynamic> createRetentionAction(Map<String, dynamic> body) =>
      _source.createRetentionAction(body);
  @override
  Future<dynamic> uploadImage(Map<String, dynamic> body) =>
      _source.uploadImage(body);
  @override
  Future<List<dynamic>> supportConversations() =>
      _source.supportConversations();
  @override
  Future<List<dynamic>> supportMessages(String conversationId) =>
      _source.supportMessages(conversationId);
  @override
  Future<dynamic> sendSupportMessage(
          String conversationId, Map<String, dynamic> body) =>
      _source.sendSupportMessage(conversationId, body);
  @override
  Future<dynamic> updateSupportConversation(
          String conversationId, Map<String, dynamic> body) =>
      _source.updateSupportConversation(conversationId, body);
  @override
  Future<List<dynamic>> updates() => _source.updates();
  @override
  Future<void> markUpdateViewed(String updateId) =>
      _source.markUpdateViewed(updateId);
}
