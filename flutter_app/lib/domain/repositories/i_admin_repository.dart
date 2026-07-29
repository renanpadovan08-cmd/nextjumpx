abstract interface class IAdminRepository {
  Future<List<Map<String, dynamic>>> listShops();
  Future<Map<String, dynamic>> updateAccess(
      String barberId, Map<String, dynamic> value);
  Future<void> resetPassword(String barberId, String password);
  Future<void> setCashPassword(String barberId, String password);
  Future<Map<String, dynamic>> createAccount(Map<String, dynamic> value);
  Future<Map<String, dynamic>> updateSettings(
      String barberId, Map<String, dynamic> value);
  Future<void> markPaid(String barberId, {String? date});
  Future<void> deleteAccount(String barberId);
  Future<List<Map<String, dynamic>>> listUnitRequests();
  Future<Map<String, dynamic>> updateUnitRequest(
      String requestId, String status);
}
