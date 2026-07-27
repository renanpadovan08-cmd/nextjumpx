import '../app_dependencies.dart';
import '../../data/model/auth_user_dto.dart';
import '../../ui/barbers/barbers_screen.dart';
import '../../ui/barbers/view_models/barbers_view_model.dart';

class BarbersFactory {
  const BarbersFactory._();

  static BarbersViewModel viewModel() =>
      BarbersViewModel(AppDependencies.instance.barberRepository);

  static BarbersScreen build(
    AuthUserDto user, {
    BarbersViewModel? viewModel,
  }) =>
      BarbersScreen(
        user: user,
        viewModel: viewModel ?? BarbersFactory.viewModel(),
      );
}
