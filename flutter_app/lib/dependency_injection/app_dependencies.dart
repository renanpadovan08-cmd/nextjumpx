import '../data/data_sources/appointment_remote_data_source.dart';
import '../data/data_sources/auth_remote_data_source.dart';
import '../data/data_sources/barber_remote_data_source.dart';
import '../data/data_sources/catalog_remote_data_source.dart';
import '../data/data_sources/dashboard_remote_data_source.dart';
import '../data/repositories/appointment_repository_impl.dart';
import '../data/repositories/auth_repository_impl.dart';
import '../data/repositories/barber_repository_impl.dart';
import '../data/repositories/catalog_repository_impl.dart';
import '../data/repositories/dashboard_repository_impl.dart';
import '../services/api.dart';

/// Composition root: data sources and repositories are wired once here.
class AppDependencies {
  AppDependencies._() : api = ApiClient() {
    authRepository = AuthRepositoryImpl(AuthRemoteDataSource(api));
    catalogRepository = CatalogRepositoryImpl(CatalogRemoteDataSource(api));
    barberRepository = BarberRepositoryImpl(BarberRemoteDataSource(api));
    appointmentRepository = AppointmentRepositoryImpl(AppointmentRemoteDataSource(api));
    dashboardRepository = DashboardRepositoryImpl(DashboardRemoteDataSource(api));
  }

  static final instance = AppDependencies._();
  final ApiClient api;
  late final AuthRepositoryImpl authRepository;
  late final CatalogRepositoryImpl catalogRepository;
  late final BarberRepositoryImpl barberRepository;
  late final AppointmentRepositoryImpl appointmentRepository;
  late final DashboardRepositoryImpl dashboardRepository;
}
