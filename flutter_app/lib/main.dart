import 'package:flutter/material.dart';
import 'dependency_injection/factories/app_view_model_factory.dart';
import 'routing/app_navigator.dart';
import 'routing/app_routes.dart';
import 'ui/core/theme/zen_theme.dart';
import 'ui/core/widgets/zen_app_background.dart';
import 'ui/auth/login_screen.dart';
import 'ui/core/app_shell.dart';
import 'ui/core/view_models/app_view_model.dart';

void main() { WidgetsFlutterBinding.ensureInitialized(); runApp(const ZenBarberApp()); }
class ZenBarberApp extends StatefulWidget { const ZenBarberApp({super.key}); @override State<ZenBarberApp> createState() => _ZenBarberAppState(); }
class _ZenBarberAppState extends State<ZenBarberApp> { late final AppViewModel app; @override void initState() { super.initState(); app = AppViewModelFactory.build()..addListener(_refresh); app.restoreSession(); } void _refresh() { if (mounted) setState(() {}); } @override void dispose() { app.dispose(); super.dispose(); } @override Widget build(BuildContext context) => MaterialApp(navigatorKey:navigatorKey,scaffoldMessengerKey:scaffoldMessengerKey,debugShowCheckedModeBanner: false, title: 'ZenBarber', initialRoute: AppRoutes.login, onGenerateRoute: AppRoutes.generateRoute, theme: ZenTheme.dark(), builder:(context,child)=>ZenAppBackground(child:child??const SizedBox()), home: app.loading ? const Scaffold(body: Center(child: CircularProgressIndicator())) : app.authenticated ? AppShell(app: app) : LoginScreen(viewModel: app)); }
