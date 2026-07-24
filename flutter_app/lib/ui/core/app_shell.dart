import 'package:flutter/material.dart';

import '../../dependency_injection/factories/agenda_factory.dart';
import '../../dependency_injection/factories/admin_factory.dart';
import '../../dependency_injection/factories/barbers_factory.dart';
import '../../dependency_injection/factories/catalog_factory.dart';
import '../../dependency_injection/factories/dashboard_factory.dart';
import '../../dependency_injection/factories/feature_factories.dart';
import '../../dependency_injection/factories/pro_module_factory.dart';
import '../agenda/agenda_screen.dart';
import '../admin/admin_screen.dart';
import '../barbers/barbers_screen.dart';
import '../catalog/catalog_screen.dart';
import '../dashboard/dashboard_screen.dart';
import '../fixed_clients/fixed_clients_screen.dart';
import '../operations/operations_screen.dart';
import '../public_booking/public_booking_screen.dart';
import '../pro_modules/pro_module_screen.dart';
import 'theme/zen_colors.dart';
import 'view_models/app_view_model.dart';

/// A casca da área logada segue a experiência do ZenBarber Pro: navegação
/// lateral no desktop e os mesmos atalhos em uma barra inferior no celular.
class AppShell extends StatefulWidget {
  const AppShell({super.key, required this.app});

  final AppViewModel app;

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int index = 0;
  bool atendimentoOpen = true;
  bool negocioOpen = true;
  bool suporteOpen = false;

  late final DashboardScreen dashboard;
  late final AgendaScreen agenda = AgendaFactory.build(widget.app.user!);
  late final CatalogScreen catalog = CatalogFactory.build(widget.app.user!);
  late final BarbersScreen barbers = BarbersFactory.build(widget.app.user!);
  late final FixedClientsScreen fixedClients = FixedClientsScreen(
      viewModel: FeatureFactories.fixedClients(), user: widget.app.user!);
  late final OperationsScreen operations =
      OperationsScreen(viewModel: FeatureFactories.operations());
  late final PublicBookingScreen publicBooking =
      PublicBookingScreen(viewModel: FeatureFactories.publicBooking());
  late final ProModuleScreen wallet = ProModuleScreen(
      module: ProModule.wallet, viewModel: ProModuleFactory.build());
  late final ProModuleScreen whatsapp = ProModuleScreen(
      module: ProModule.whatsapp, viewModel: ProModuleFactory.build());
  late final ProModuleScreen pending = ProModuleScreen(
      module: ProModule.pending, viewModel: ProModuleFactory.build());
  late final ProModuleScreen reports = ProModuleScreen(
      module: ProModule.reports, viewModel: ProModuleFactory.build());
  late final ProModuleScreen commissions = ProModuleScreen(
      module: ProModule.commissions, viewModel: ProModuleFactory.build());
  late final ProModuleScreen retention = ProModuleScreen(
      module: ProModule.retention, viewModel: ProModuleFactory.build());
  late final ProModuleScreen cash = ProModuleScreen(
      module: ProModule.cash, viewModel: ProModuleFactory.build());
  late final ProModuleScreen profile = ProModuleScreen(
      module: ProModule.profile, viewModel: ProModuleFactory.build());
  late final ProModuleScreen hours = ProModuleScreen(
      module: ProModule.hours, viewModel: ProModuleFactory.build());
  late final ProModuleScreen support = ProModuleScreen(
      module: ProModule.support, viewModel: ProModuleFactory.build());
  late final ProModuleScreen units = ProModuleScreen(
      module: ProModule.units, viewModel: ProModuleFactory.build());
  late final AdminScreen admin = AdminScreen(viewModel: AdminFactory.build());

  @override
  void initState() {
    super.initState();
    dashboard = DashboardFactory.build(userName: widget.app.user!.name);
    if (widget.app.user!.isAdmin) index = 18;
  }

  List<Widget> get screens => [
        dashboard,
        agenda,
        wallet,
        fixedClients,
        publicBooking,
        whatsapp,
        operations,
        pending,
        reports,
        commissions,
        retention,
        cash,
        barbers,
        catalog,
        profile,
        hours,
        support,
        units,
        if (widget.app.user!.isAdmin) admin,
      ];

  void _navigate(int page) => setState(() => index = page);

  String get _title => switch (index) {
        0 => 'Dashboard',
        1 => 'Agendamentos',
        2 => 'Clientes em carteira',
        3 => 'Clientes fixos',
        4 => 'Link do cliente',
        5 => 'Central WhatsApp',
        6 => 'Meu negocio',
        7 => 'Pendencias / Baixa',
        8 => 'Ranking / Comissao',
        9 => 'Comissoes',
        10 => 'Retencao',
        11 => 'Controle de caixa',
        12 => 'Barbeiros',
        13 => 'Servicos',
        14 => 'Perfil / Configuracoes',
        15 => 'Funcionamento',
        16 => 'Suporte / Chat',
        17 => 'Unidades',
        18 => 'Gestao PRO',
        _ => 'Dashboard',
      };

  void _unavailable(String label) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('$label estará disponível em breve.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final desktop = MediaQuery.sizeOf(context).width >= 920;
    if (!desktop) return _mobileShell();

    return Scaffold(
      body: SafeArea(
        child: Row(
          children: [
            SizedBox(width: 260, child: _sidebar()),
            const VerticalDivider(width: 1, color: Color(0xff1d2c3b)),
            Expanded(
              child: Stack(
                children: [
                  Column(
                    children: [
                      _desktopHeader(),
                      const Divider(height: 1, color: Color(0xff1d2c3b)),
                      Expanded(
                        child: IndexedStack(index: index, children: screens),
                      ),
                    ],
                  ),
                  const Positioned(
                      right: 24, bottom: 22, child: _InstallPill()),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _mobileShell() => Scaffold(
        appBar: AppBar(
          title: Text('$_title · ${widget.app.user!.shopName}'),
          actions: [
            IconButton(
                onPressed: widget.app.logout, icon: const Icon(Icons.logout)),
          ],
        ),
        body: IndexedStack(index: index, children: screens),
        bottomNavigationBar: NavigationBar(
          selectedIndex: index > 4 ? 0 : index,
          onDestinationSelected: _navigate,
          destinations: const [
            NavigationDestination(
                icon: Icon(Icons.dashboard_outlined),
                selectedIcon: Icon(Icons.dashboard),
                label: 'Início'),
            NavigationDestination(
                icon: Icon(Icons.calendar_today_outlined),
                selectedIcon: Icon(Icons.calendar_today),
                label: 'Agenda'),
            NavigationDestination(
                icon: Icon(Icons.content_cut), label: 'Serviços'),
            NavigationDestination(
                icon: Icon(Icons.groups_outlined),
                selectedIcon: Icon(Icons.groups),
                label: 'Equipe'),
            NavigationDestination(icon: Icon(Icons.repeat), label: 'Fixos'),
          ],
        ),
      );

  Widget _desktopHeader() => Container(
        height: 148,
        padding: const EdgeInsets.fromLTRB(32, 24, 30, 20),
        child: LayoutBuilder(
          builder: (context, constraints) => Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(_title,
                        style: const TextStyle(
                            fontSize: 32,
                            fontWeight: FontWeight.w900,
                            letterSpacing: -1.35)),
                    const SizedBox(height: 12),
                    Text(widget.app.user!.shopName,
                        style: const TextStyle(
                            color: ZenColors.muted, fontSize: 16)),
                  ],
                ),
              ),
              if (constraints.maxWidth >= 740) ...[
                const _UnitPicker(),
                const SizedBox(width: 10),
                _HeaderButton(label: 'Gerenciar', onTap: () => _navigate(17)),
                const SizedBox(width: 12),
                _HeaderButton(
                    label: '🔔 Novidades',
                    onTap: () => _unavailable('Novidades')),
                const SizedBox(width: 12),
                _HeaderButton(
                    label: 'Atualizar', onTap: () => _navigate(index)),
              ],
            ],
          ),
        ),
      );

  Widget _sidebar() => Container(
        color: const Color(0xff06101a),
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 16),
        child: Column(
          children: [
            _brand(),
            const SizedBox(height: 16),
            const Divider(color: Color(0xff1c2a3a), height: 1),
            const SizedBox(height: 14),
            Expanded(
              child: Scrollbar(
                thumbVisibility: true,
                child: ListView(
                  children: [
                    _section(
                        'ATENDIMENTO',
                        atendimentoOpen,
                        () =>
                            setState(() => atendimentoOpen = !atendimentoOpen)),
                    if (atendimentoOpen) ...[
                      _nav('Agenda Premium', Icons.calendar_month_rounded, 1),
                      _nav('Clientes em carteira',
                          Icons.account_balance_wallet_outlined, 2),
                      _nav('Clientes fixos', Icons.repeat_rounded, 3),
                      _nav('Link do cliente', Icons.link_rounded, 4),
                      _nav('Central WhatsApp',
                          Icons.chat_bubble_outline_rounded, 5),
                    ],
                    const SizedBox(height: 10),
                    _section('NEGÓCIO', negocioOpen,
                        () => setState(() => negocioOpen = !negocioOpen)),
                    if (negocioOpen) ...[
                      _nav('Dashboard PRO', Icons.grid_view_rounded, 0),
                      if (widget.app.user!.isAdmin)
                        _nav('Gestao PRO', Icons.admin_panel_settings_outlined,
                            18),
                      _nav('Pendências / Baixa', Icons.assignment_late_outlined,
                          7),
                      _nav(
                          'Ranking / Comissão', Icons.emoji_events_outlined, 8),
                      _nav('Comissões', Icons.payments_outlined, 9),
                      _nav('Retenção', Icons.track_changes_rounded, 10),
                      _nav('Meu Negócio', Icons.storefront_outlined, 6),
                      _nav('Unidades', Icons.apartment_rounded, 17),
                      _nav('Controle de Caixa', Icons.point_of_sale_outlined,
                          11),
                      _nav('Barbeiros', Icons.content_cut_rounded, 12),
                      _nav('Serviços', Icons.design_services_outlined, 13),
                      _nav('Perfil / Configurações',
                          Icons.manage_accounts_outlined, 14),
                      _nav('Funcionamento', Icons.schedule_outlined, 15),
                    ],
                    const SizedBox(height: 10),
                    _section('SUPORTE', suporteOpen,
                        () => setState(() => suporteOpen = !suporteOpen)),
                    if (suporteOpen)
                      _nav('Suporte / Chat', Icons.support_agent_rounded, 16),
                  ],
                ),
              ),
            ),
            _versionCard(),
            const SizedBox(height: 10),
            _exitButton(),
          ],
        ),
      );

  Widget _brand() => Row(
        children: [
          Container(
            width: 43,
            height: 43,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                  colors: [Color(0xff54ee88), Color(0xff25b95d)]),
              borderRadius: BorderRadius.circular(13),
            ),
            child: const Icon(Icons.content_cut_rounded,
                color: Color(0xff042114), size: 27),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('ZENBARBER',
                    style: TextStyle(
                        fontFamily: 'Georgia',
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                        letterSpacing: .4)),
                Container(
                  margin: const EdgeInsets.only(top: 2),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 7, vertical: 1),
                  decoration: BoxDecoration(
                      border: Border.all(color: const Color(0xffe5bd4d)),
                      borderRadius: BorderRadius.circular(20)),
                  child: const Text('PRO',
                      style: TextStyle(
                          color: Color(0xffffd464),
                          fontSize: 9,
                          fontWeight: FontWeight.w900)),
                ),
                const SizedBox(height: 5),
                Text(widget.app.user!.name,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        color: Color(0xff9cadc3), fontSize: 11)),
                const SizedBox(height: 3),
                const Text('Powered by NextJumpX',
                    style: TextStyle(
                        color: Color(0xffa17d2d),
                        fontSize: 9,
                        fontWeight: FontWeight.w800)),
              ],
            ),
          ),
        ],
      );

  Widget _section(String label, bool expanded, VoidCallback onTap) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          height: 48,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
              color: const Color(0xff0b1622),
              borderRadius: BorderRadius.circular(12)),
          child: Row(children: [
            Text(label,
                style:
                    const TextStyle(fontSize: 12, fontWeight: FontWeight.w900)),
            const Spacer(),
            Icon(expanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                color: ZenColors.muted, size: 18)
          ]),
        ),
      );

  Widget _nav(String label, IconData icon, int target) {
    final selected = index == target;
    return Padding(
      padding: const EdgeInsets.only(top: 5, left: 10),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _navigate(target),
          borderRadius: BorderRadius.circular(11),
          child: Ink(
            height: 36,
            padding: const EdgeInsets.symmetric(horizontal: 10),
            decoration: BoxDecoration(
              color:
                  selected ? const Color(0xff063624) : const Color(0xff0a1420),
              border: Border.all(
                  color: selected ? ZenColors.green : Colors.transparent),
              borderRadius: BorderRadius.circular(11),
            ),
            child: Row(children: [
              Icon(icon,
                  size: 15,
                  color: selected
                      ? const Color(0xff5bff90)
                      : const Color(0xff7d91ac)),
              const SizedBox(width: 9),
              Expanded(
                  child: Text(label,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          color: selected
                              ? const Color(0xff8fffb1)
                              : const Color(0xffb5c2d3))))
            ]),
          ),
        ),
      ),
    );
  }

  Widget _versionCard() => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
            color: const Color(0xff09141b),
            border: Border.all(color: const Color(0xff1c2b32)),
            borderRadius: BorderRadius.circular(12)),
        child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('ZenBarber Pro v2',
                  style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w900,
                      color: Color(0xffa9b7c7))),
              SizedBox(height: 4),
              Text('Powered by NextJumpX © 2026',
                  style: TextStyle(fontSize: 8, color: Color(0xff657587)))
            ]),
      );

  Widget _exitButton() => SizedBox(
        width: double.infinity,
        height: 38,
        child: OutlinedButton(
          onPressed: widget.app.logout,
          style: OutlinedButton.styleFrom(
              foregroundColor: const Color(0xffffdad8),
              side: const BorderSide(color: Color(0xff753032)),
              backgroundColor: const Color(0xff351215),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10))),
          child: const Text('Sair',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900)),
        ),
      );
}

class _UnitPicker extends StatelessWidget {
  const _UnitPicker();
  @override
  Widget build(BuildContext context) => Container(
        height: 70,
        padding: const EdgeInsets.symmetric(horizontal: 10),
        decoration: BoxDecoration(
            border: Border.all(color: const Color(0xff253140)),
            borderRadius: BorderRadius.circular(15)),
        child: Row(children: [
          const Text('UNIDADE',
              style: TextStyle(
                  color: Color(0xff9cacbe),
                  fontSize: 11,
                  fontWeight: FontWeight.w900)),
          const SizedBox(width: 10),
          Container(
              width: 230,
              padding: const EdgeInsets.symmetric(horizontal: 13),
              decoration: BoxDecoration(
                  color: const Color(0xff0a1019),
                  border: Border.all(color: const Color(0xff283443)),
                  borderRadius: BorderRadius.circular(14)),
              child: const Row(children: [
                Expanded(
                    child: Text('Todas as unidades',
                        style: TextStyle(
                            fontSize: 14, fontWeight: FontWeight.w700))),
                Icon(Icons.keyboard_arrow_down_rounded)
              ]))
        ]),
      );
}

class _HeaderButton extends StatelessWidget {
  const _HeaderButton({required this.label, required this.onTap});
  final String label;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => SizedBox(
      height: 52,
      child: OutlinedButton(
          onPressed: onTap,
          style: OutlinedButton.styleFrom(
              side: const BorderSide(color: Color(0xff263342)),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14))),
          child: Text(label,
              style: const TextStyle(fontWeight: FontWeight.w900))));
}

class _InstallPill extends StatelessWidget {
  const _InstallPill();
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
        decoration: BoxDecoration(
            color: const Color(0xf0122423),
            border: Border.all(color: const Color(0xff49685d)),
            borderRadius: BorderRadius.circular(99),
            boxShadow: const [
              BoxShadow(color: Color(0x99000000), blurRadius: 22)
            ]),
        child: const Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(Icons.install_desktop_rounded, color: ZenColors.green, size: 20),
          SizedBox(width: 7),
          Text('Instalar ZenBarber',
              style: TextStyle(fontWeight: FontWeight.w900))
        ]),
      );
}
