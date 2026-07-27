import 'package:flutter/material.dart';
import 'app_pages.dart';

class AppRoutes {
  const AppRoutes._();
  static const login = '/login', home = '/home';
  static Route<dynamic> generateRoute(RouteSettings settings) =>
      MaterialPageRoute(
          builder: (_) =>
              settings.name == login ? AppPages.login() : AppPages.shell(),
          settings: settings);
}
