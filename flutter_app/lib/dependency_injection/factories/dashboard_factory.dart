import 'package:flutter/foundation.dart';

import '../app_dependencies.dart';
import '../../ui/dashboard/dashboard_screen.dart';
import '../../ui/dashboard/view_models/dashboard_view_model.dart';

class DashboardFactory {
  const DashboardFactory._();

  static DashboardScreen build({
    required String userName,
    required bool canManage,
    required ValueChanged<int> onNavigate,
  }) =>
      DashboardScreen(
        viewModel:
            DashboardViewModel(AppDependencies.instance.dashboardRepository),
        userName: userName,
        canManage: canManage,
        onNavigate: onNavigate,
      );
}
