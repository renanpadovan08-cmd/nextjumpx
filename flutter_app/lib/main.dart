import 'package:flutter/material.dart';
import 'dependency_injection/factories/app_view_model_factory.dart';
import 'routing/app_navigator.dart';
import 'ui/core/theme/zen_theme.dart';
import 'ui/core/widgets/zen_app_background.dart';
import 'ui/auth/login_screen.dart';
import 'ui/core/app_shell.dart';
import 'ui/core/view_models/app_view_model.dart';
import 'ui/landing/nextjumpx_landing_screen.dart';
import 'ui/public_booking/public_booking_screen.dart';
import 'dependency_injection/factories/feature_factories.dart';
import 'ui/features/view_models/feature_view_models.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ZenBarberApp());
}

class ZenBarberApp extends StatefulWidget {
  const ZenBarberApp({super.key});
  @override
  State<ZenBarberApp> createState() => _ZenBarberAppState();
}

class _ZenBarberAppState extends State<ZenBarberApp> {
  late final AppViewModel app;
  late final PublicBookingViewModel publicBooking;
  bool showLogin = false;
  @override
  void initState() {
    super.initState();
    app = AppViewModelFactory.build()..addListener(_refresh);
    publicBooking = FeatureFactories.publicBooking();
    app.restoreSession();
  }

  void _refresh() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    app.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final fragment = Uri.base.fragment;
    final bookingLogin = fragment.startsWith('book/')
        ? Uri.decodeComponent(fragment.substring('book/'.length))
        : '';
    return MaterialApp(
        navigatorKey: navigatorKey,
        scaffoldMessengerKey: scaffoldMessengerKey,
        debugShowCheckedModeBanner: false,
        title: 'NextJumpX',
        theme: ZenTheme.dark(),
        builder: (context, child) =>
            ZenAppBackground(child: child ?? const SizedBox()),
        home: bookingLogin.isNotEmpty
            ? PublicBookingScreen(
                viewModel: publicBooking,
                initialLogin: bookingLogin,
              )
            : app.loading
                ? const Scaffold(
                    body: Center(child: CircularProgressIndicator()))
                : app.authenticated
                    ? app.user!.mustChangePassword
                        ? ForcedPasswordScreen(viewModel: app)
                        : app.user!.requiresTermsAcceptance
                            ? TermsAcceptanceScreen(viewModel: app)
                            : AppShell(app: app)
                    : showLogin
                        ? LoginScreen(viewModel: app)
                        : NextJumpXLandingScreen(
                            onZenBarber: () =>
                                setState(() => showLogin = true)));
  }
}
