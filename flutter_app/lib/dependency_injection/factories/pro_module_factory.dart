import '../../ui/pro_modules/view_models/pro_module_view_model.dart';
import '../app_dependencies.dart';

class ProModuleFactory {
  const ProModuleFactory._();
  static ProModuleViewModel build() =>
      ProModuleViewModel(AppDependencies.instance.operationsRepository);
}
