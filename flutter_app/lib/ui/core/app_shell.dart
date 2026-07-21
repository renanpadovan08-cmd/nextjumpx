import 'package:flutter/material.dart';
import '../../dependency_injection/app_dependencies.dart';
import '../../dependency_injection/factories/agenda_factory.dart';
import '../../dependency_injection/factories/barbers_factory.dart';
import '../../dependency_injection/factories/catalog_factory.dart';
import '../../dependency_injection/factories/dashboard_factory.dart';
import '../fixed_clients/fixed_clients_screen.dart';
import '../operations/operations_screen.dart';
import '../public_booking/public_booking_screen.dart';
import 'view_models/app_view_model.dart';

class AppShell extends StatefulWidget { const AppShell({super.key, required this.app}); final AppViewModel app; @override State<AppShell> createState() => _AppShellState(); }
class _AppShellState extends State<AppShell> { int index = 0; late final screens = [DashboardFactory.build(), AgendaFactory.build(), CatalogFactory.build(widget.app.user!), BarbersFactory.build(widget.app.user!), FixedClientsScreen(api: AppDependencies.instance.api), OperationsScreen(api: AppDependencies.instance.api), PublicBookingScreen(api: AppDependencies.instance.api)]; @override Widget build(BuildContext context) { const labels = ['Início', 'Agenda', 'Serviços', 'Equipe', 'Clientes fixos', 'Gestão', 'Agendamento público']; return Scaffold(appBar: AppBar(title: Text('${labels[index]} · ${widget.app.user!.shopName}'), actions: [IconButton(onPressed: widget.app.logout, icon: const Icon(Icons.logout), tooltip: 'Sair')]), body: IndexedStack(index: index, children: screens), bottomNavigationBar: NavigationBar(selectedIndex: index, onDestinationSelected: (value) => setState(() => index = value), destinations: const [NavigationDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard), label: 'Início'), NavigationDestination(icon: Icon(Icons.calendar_today_outlined), selectedIcon: Icon(Icons.calendar_today), label: 'Agenda'), NavigationDestination(icon: Icon(Icons.content_cut), label: 'Serviços'), NavigationDestination(icon: Icon(Icons.groups_outlined), selectedIcon: Icon(Icons.groups), label: 'Equipe'), NavigationDestination(icon: Icon(Icons.repeat), label: 'Fixos'), NavigationDestination(icon: Icon(Icons.business), label: 'Gestão'), NavigationDestination(icon: Icon(Icons.public), label: 'Público')])); }
}
