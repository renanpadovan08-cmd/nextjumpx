import '../app_dependencies.dart'; import '../../ui/core/view_models/app_view_model.dart';
class AppViewModelFactory { const AppViewModelFactory._(); static AppViewModel build()=>AppViewModel(AppDependencies.instance.authRepository,AppDependencies.instance.api); }
