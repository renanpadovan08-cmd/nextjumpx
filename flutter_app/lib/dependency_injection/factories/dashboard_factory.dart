import '../app_dependencies.dart'; import '../../ui/dashboard/dashboard_screen.dart'; import '../../ui/dashboard/view_models/dashboard_view_model.dart';
class DashboardFactory { const DashboardFactory._(); static DashboardScreen build()=>DashboardScreen(viewModel:DashboardViewModel(AppDependencies.instance.dashboardRepository)); }
