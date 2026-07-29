abstract interface class IFeatureRepository {
  Future<List<dynamic>> fixedClients();
  Future<void> pay(String id);
  Future<void> createFixedClient(Map<String, dynamic> body);
  Future<void> updateFixedClient(String code, Map<String, dynamic> body);
  Future<void> cancelFixedClient(String code);
  Future<dynamic> operations(int tab);
  Future<dynamic> saveBusinessGoal(Map<String, dynamic> body);
  Future<dynamic> publicBooking(String login);
  Future<List<dynamic>> publicAvailability(String barberId, String date);
  Future<dynamic> createPublicAppointment(Map<String, dynamic> body);
}
