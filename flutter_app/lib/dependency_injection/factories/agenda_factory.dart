import '../../data/model/auth_user_dto.dart';
import '../../ui/agenda/agenda_screen.dart';
import '../../ui/agenda/view_models/agenda_view_model.dart';
import '../../ui/catalog/view_models/catalog_view_model.dart';
import '../../ui/barbers/view_models/barbers_view_model.dart';
import '../app_dependencies.dart';

class AgendaFactory {
  const AgendaFactory._();
  static AgendaScreen build(AuthUserDto user) => AgendaScreen(
      user: user,
      viewModel:
          AgendaViewModel(AppDependencies.instance.appointmentRepository),
      catalog: CatalogViewModel(AppDependencies.instance.catalogRepository),
      barbers: BarbersViewModel(AppDependencies.instance.barberRepository));
}
