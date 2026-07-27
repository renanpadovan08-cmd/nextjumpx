import '../app_dependencies.dart';
import '../../data/model/auth_user_dto.dart';
import '../../ui/barbers/barbers_screen.dart';
import '../../ui/barbers/view_models/barbers_view_model.dart';

class BarbersFactory {
  const BarbersFactory._();
  static BarbersScreen build(AuthUserDto user) => BarbersScreen(
      user: user,
      viewModel: BarbersViewModel(AppDependencies.instance.barberRepository));
}
