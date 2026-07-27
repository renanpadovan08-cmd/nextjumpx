import 'package:flutter/widgets.dart';
import '../dependency_injection/factories/app_view_model_factory.dart';
import '../ui/auth/login_screen.dart';
import '../ui/core/app_shell.dart';

class AppPages {
  const AppPages._();
  static Widget login() => LoginScreen(viewModel: AppViewModelFactory.build());
  static Widget shell() => AppShell(app: AppViewModelFactory.build());
}
