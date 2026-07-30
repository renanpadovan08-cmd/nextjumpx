abstract interface class IOperationsRepository {
  Future<dynamic> get(String feature, {Map<String, String>? query});
  Future<dynamic> patch(String feature, String id, Map<String, dynamic> body);
  Future<dynamic> patchBarber(String id, Map<String, dynamic> body);
  Future<dynamic> patchCurrent(String feature, Map<String, dynamic> body);
  Future<List<dynamic>> units();
  Future<Map<String, dynamic>> unitConfiguration();
  Future<dynamic> createUnit(Map<String, dynamic> body);
  Future<dynamic> assignBarberUnit(String barberId, String? unitId);
  Future<dynamic> createCashEntry(Map<String, dynamic> body);
  Future<dynamic> updateCashEntry(String id, Map<String, dynamic> body);
  Future<void> deleteCashEntry(String id, String reason);
  Future<dynamic> disableCashRecurrence(String id, String reason);
  Future<Map<String, dynamic>> cashAuditReport(String month);
  Future<dynamic> createCashClosure(Map<String, dynamic> body);
  Future<dynamic> updateCashReceipt(String id, Map<String, dynamic> body);
  Future<Map<String, dynamic>> cashAccess();
  Future<String> unlockCash(String password);
  void setCashToken(String? token);
  Future<dynamic> backup();
  Future<dynamic> createHoursClosure(Map<String, dynamic> body);
  Future<void> deleteHoursClosure(String id);
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
