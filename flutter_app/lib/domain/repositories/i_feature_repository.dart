abstract interface class IFeatureRepository { Future<List<dynamic>> fixedClients(); Future<void> pay(String id); Future<dynamic> operations(int tab); Future<dynamic> publicBooking(String login); }
