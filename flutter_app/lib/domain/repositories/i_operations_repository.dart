abstract interface class IOperationsRepository {
  Future<dynamic> get(String feature, {Map<String, String>? query});
  Future<dynamic> patch(String feature, String id, Map<String, dynamic> body);
  Future<dynamic> patchBarber(String id, Map<String, dynamic> body);
  Future<dynamic> patchCurrent(String feature, Map<String, dynamic> body);
  Future<List<dynamic>> units();
  Future<dynamic> createUnit(Map<String, dynamic> body);
  Future<dynamic> createCashEntry(Map<String, dynamic> body);
  Future<void> deleteCashEntry(String id);
  Future<dynamic> createCashClosure(Map<String, dynamic> body);
  Future<dynamic> createRetentionAction(Map<String, dynamic> body);
  Future<dynamic> uploadImage(Map<String, dynamic> body);
  Future<List<dynamic>> supportConversations();
  Future<List<dynamic>> supportMessages(String conversationId);
  Future<dynamic> sendSupportMessage(
      String conversationId, Map<String, dynamic> body);
  Future<dynamic> updateSupportConversation(
      String conversationId, Map<String, dynamic> body);
  Future<List<dynamic>> updates();
  Future<void> markUpdateViewed(String updateId);
}
