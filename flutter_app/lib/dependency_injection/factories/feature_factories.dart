import '../app_dependencies.dart';
import '../../domain/use_cases/features/feature_use_cases.dart';
import '../../ui/features/view_models/feature_view_models.dart';
import '../../ui/barbers/view_models/barbers_view_model.dart';

class FeatureFactories {
  const FeatureFactories._();
  static FixedClientsViewModel fixedClients() => FixedClientsViewModel(
      LoadFixedClientsUseCase(AppDependencies.instance.featureRepository),
      PayFixedClientUseCase(AppDependencies.instance.featureRepository));
  static BarbersViewModel fixedClientsBarbers() =>
      BarbersViewModel(AppDependencies.instance.barberRepository);
  static OperationsViewModel operations() => OperationsViewModel(
      LoadOperationsUseCase(AppDependencies.instance.featureRepository));
  static PublicBookingViewModel publicBooking() => PublicBookingViewModel(
      LoadPublicBookingUseCase(AppDependencies.instance.featureRepository));
}
