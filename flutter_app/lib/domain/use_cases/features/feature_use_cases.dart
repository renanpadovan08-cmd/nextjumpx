import '../../repositories/i_feature_repository.dart';

class LoadFixedClientsUseCase {
  const LoadFixedClientsUseCase(this.r);
  final IFeatureRepository r;
  Future<List<dynamic>> call() => r.fixedClients();
}

class PayFixedClientUseCase {
  const PayFixedClientUseCase(this.r);
  final IFeatureRepository r;
  Future<void> call(String id) => r.pay(id);
}

class LoadOperationsUseCase {
  const LoadOperationsUseCase(this.r);
  final IFeatureRepository r;
  Future<dynamic> call(int tab) => r.operations(tab);
}

class LoadPublicBookingUseCase {
  const LoadPublicBookingUseCase(this.r);
  final IFeatureRepository r;
  Future<dynamic> call(String login) => r.publicBooking(login);
}
