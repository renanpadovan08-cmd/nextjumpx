abstract interface class IAdminRepository {
  Future<List<Map<String, dynamic>>> listShops();
  Future<Map<String, dynamic>> updateAccess(String barberId, Map<String, dynamic> value);
  Future<void> resetPassword(String barberId, String password);
}
