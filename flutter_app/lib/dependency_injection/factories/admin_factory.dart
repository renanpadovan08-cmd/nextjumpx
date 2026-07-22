import '../../ui/admin/view_models/admin_view_model.dart';
import '../app_dependencies.dart';

class AdminFactory {
  const AdminFactory._();
  static AdminViewModel build() => AdminViewModel(AppDependencies.instance.adminRepository);
}
