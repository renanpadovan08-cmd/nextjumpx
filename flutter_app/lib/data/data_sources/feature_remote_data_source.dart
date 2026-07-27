import '../../services/api.dart';

class FeatureRemoteDataSource {
  const FeatureRemoteDataSource(this._api);
  final ApiClient _api;
  Future<List<dynamic>> fixedClients() =>
      _api.get('/fixed-clients').then((v) => v as List<dynamic>);
  Future<void> pay(String id) => _api.patch('/fixed-clients/payments/$id', {});
  Future<void> createFixedClient(Map<String, dynamic> body) =>
      _api.post('/fixed-clients', body);
  Future<void> cancelFixedClient(String code) =>
      _api.delete('/fixed-clients/$code');
  Future<dynamic> operations(int tab) => _api.get(tab == 0
      ? '/business/goals'
      : tab == 1
          ? '/units/requests'
          : '/dashboard/summary');
  Future<dynamic> saveBusinessGoal(Map<String, dynamic> body) =>
      _api.put('/business/goals', body);
  Future<dynamic> publicBooking(String login) =>
      _api.get('/public/booking/$login');
  Future<List<dynamic>> publicAvailability(String barberId, String date) =>
      _api.get('/public/availability', query: {
        'barberId': barberId,
        'date': date
      }).then((value) => value as List<dynamic>);
  Future<dynamic> createPublicAppointment(Map<String, dynamic> body) =>
      _api.post('/public/appointments', body);
}
