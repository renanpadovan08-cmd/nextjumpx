import 'dart:async';
import 'dart:convert';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../config/app_config.dart';
import '../../core/date_format.dart';
import '../../routing/public_booking_route.dart';
import '../../services/local_preferences.dart';
import '../../services/whatsapp_templates.dart';
import '../core/theme/zen_colors.dart';
import '../core/widgets/zen_card.dart';
import 'view_models/pro_module_view_model.dart';

enum ProModule {
  wallet,
  whatsapp,
  pending,
  commissions,
  retention,
  reports,
  cash,
  profile,
  hours,
  support,
  units,
  updates
}

class ProModuleScreen extends StatefulWidget {
  const ProModuleScreen({
    super.key,
    required this.module,
    required this.viewModel,
    this.currentUserIsAdmin = false,
    this.currentUserCanManage = false,
    this.shopName = '',
    this.bookingLogin = '',
    this.onOpenAgenda,
  });

  final ProModule module;
  final ProModuleViewModel viewModel;
  final bool currentUserIsAdmin;
  final bool currentUserCanManage;
  final String shopName;
  final String bookingLogin;
  final VoidCallback? onOpenAgenda;

  @override
  State<ProModuleScreen> createState() => _ProModuleScreenState();
}

class _ProModuleScreenState extends State<ProModuleScreen> {
  final Map<String, String> _commissionInputs = {};
  final Map<String, String> _currentInputs = {};
  final TextEditingController _supportMessage = TextEditingController();
  final TextEditingController _cashPassword = TextEditingController();
  Timer? _supportRefreshTimer;
  String _activeFilter = 'Todos';
  List<Map<String, dynamic>>? _weeklySchedule;
  late final WhatsappTemplateStore _templateStore;
  late Map<String, String> _whatsTemplates;

  @override
  void initState() {
    super.initState();
    _templateStore = WhatsappTemplateStore(
      shopName: widget.shopName,
      login: widget.bookingLogin,
    );
    _whatsTemplates = _templateStore.load();
    if (widget.module == ProModule.cash) {
      final token = readSessionPreference(_cashSessionKey);
      if (token != null && token.isNotEmpty) {
        widget.viewModel.restoreCashToken(token);
      }
    }
    widget.viewModel
      ..addListener(_refresh)
      ..load(widget.module);
    if (widget.module == ProModule.support) {
      _supportRefreshTimer = Timer.periodic(const Duration(seconds: 10), (_) {
        if (mounted && !widget.viewModel.loading) {
          widget.viewModel.load(ProModule.support);
        }
      });
    }
  }

  void _refresh() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    widget.viewModel.removeListener(_refresh);
    _supportRefreshTimer?.cancel();
    _supportMessage.dispose();
    _cashPassword.dispose();
    super.dispose();
  }

  String get title => switch (widget.module) {
        ProModule.wallet => 'Clientes em carteira',
        ProModule.whatsapp => 'Central WhatsApp',
        ProModule.pending => 'Pendências / Baixa',
        ProModule.commissions => 'Comissões',
        ProModule.retention => 'Retenção de clientes',
        ProModule.reports => 'Ranking / Comissão',
        ProModule.cash => 'Controle de caixa',
        ProModule.profile => 'Perfil / Configurações',
        ProModule.hours => 'Funcionamento',
        ProModule.support => 'Suporte / Chat',
        ProModule.units => 'Unidades',
        ProModule.updates => 'Novidades',
      };

  void _message(String value) => ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(value)),
      );

  @override
  Widget build(BuildContext context) => ListView(
        padding: const EdgeInsets.fromLTRB(32, 26, 32, 92),
        children: [
          _eyebrow(),
          const SizedBox(height: 16),
          if (widget.viewModel.error != null) _error(widget.viewModel.error!),
          if (widget.viewModel.loading)
            const Padding(
                padding: EdgeInsets.only(bottom: 14),
                child: LinearProgressIndicator()),
          switch (widget.module) {
            ProModule.wallet => _wallet(),
            ProModule.whatsapp => _whatsapp(),
            ProModule.pending => _pending(),
            ProModule.commissions => _commissions(),
            ProModule.retention => _retention(),
            ProModule.reports => _reports(),
            ProModule.cash => _cash(),
            ProModule.profile => _profile(),
            ProModule.hours => _hours(),
            ProModule.support => _support(),
            ProModule.units => _units(),
            ProModule.updates => _updates(),
          },
        ],
      );

  Widget _error(String value) => Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
              color: const Color(0xff421b20),
              borderRadius: BorderRadius.circular(11)),
          child: Text(value)));

  Widget _eyebrow() =>
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title,
            style: const TextStyle(
                fontSize: 25, fontWeight: FontWeight.w900, letterSpacing: -.9)),
        const SizedBox(height: 5),
        Text(_subtitle(), style: const TextStyle(color: ZenColors.muted)),
      ]);

  String _subtitle() => switch (widget.module) {
        ProModule.wallet =>
          'Cobranças pendentes, recebimentos e ajustes financeiros.',
        ProModule.whatsapp =>
          'Confirme, reagende e cobre clientes sem escrever mensagem do zero.',
        ProModule.pending =>
          'Dê baixa em atendimentos passados e mantenha o financeiro correto.',
        ProModule.commissions => 'Defina o percentual pago a cada barbeiro.',
        ProModule.retention =>
          'Identifique clientes em risco e traga-os de volta.',
        ProModule.reports =>
          'Faturamento, atendimentos e comissão por profissional.',
        ProModule.cash => 'Entradas, saídas e o fechamento da operação.',
        ProModule.profile => 'Dados da barbearia e preferências da conta.',
        ProModule.hours =>
          'Expediente, intervalos e disponibilidade da agenda.',
        ProModule.support => 'Fale com o time NextJumpX quando precisar.',
        ProModule.units => 'Gerencie as unidades e a operação multiunidade.',
        ProModule.updates => 'Acompanhe as melhorias publicadas no ZenBarber.',
      };

  List<Map<String, dynamic>> get _rows =>
      List<Map<String, dynamic>>.from((widget.viewModel.data is List
          ? widget.viewModel.data
          : const <dynamic>[]) as List);
  Map<String, dynamic> get _object => widget.viewModel.data is Map
      ? Map<String, dynamic>.from(widget.viewModel.data as Map)
      : <String, dynamic>{};
  String _money(dynamic value) =>
      'R\$ ${((value as num?) ?? num.tryParse('$value') ?? 0).toStringAsFixed(2).replaceAll('.', ',')}';

  String get _cashSessionKey {
    final shop =
        widget.shopName.isEmpty ? widget.bookingLogin : widget.shopName;
    return 'zenbarber_cash_unlocked_${shop.toLowerCase().replaceAll(RegExp(r'[^a-z0-9_-]+'), '_')}';
  }

  Widget _wallet() => _surface('Valores pendentes',
          'Receba, bonifique, cancele e ajuste cada cobrança pendente.', [
        if (_rows.isEmpty)
          const Padding(
              padding: EdgeInsets.all(16),
              child: Text('Nenhum valor pendente na carteira.',
                  style: TextStyle(color: ZenColors.muted)))
        else
          ..._rows.map((row) => _walletRow(row)),
      ]);

  Widget _walletRow(Map<String, dynamic> row) => Container(
        margin: const EdgeInsets.only(top: 14),
        padding: const EdgeInsets.all(17),
        decoration: _inset(),
        child: LayoutBuilder(
          builder: (context, box) => box.maxWidth > 740
              ? Row(children: [
                  Expanded(
                      child: _walletText(
                          '${row['client_name'] ?? 'Cobrança'}',
                          '${row['services']?['name'] ?? 'Serviço'} • ${row['barbers']?['name'] ?? ''} • lembrete: ${row['reminder_date'] == null ? 'não definido' : isoToBrazilianDate('${row['reminder_date']}')}',
                          _money(row['received_amount'] ??
                              row['services']?['price']))),
                  const SizedBox(width: 16),
                  _walletActions(row)
                ])
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                      _walletText(
                          '${row['client_name'] ?? 'Cobrança'}',
                          '${row['services']?['name'] ?? 'Serviço'} • ${row['barbers']?['name'] ?? ''}',
                          _money(row['received_amount'] ??
                              row['services']?['price'])),
                      const SizedBox(height: 13),
                      _walletActions(row)
                    ]),
        ),
      );

  Widget _walletText(String name, String detail, String amount) =>
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(name,
            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15)),
        const SizedBox(height: 5),
        Text(detail,
            style: const TextStyle(color: ZenColors.muted, fontSize: 12)),
        if (amount.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(amount,
              style: const TextStyle(
                  color: ZenColors.green,
                  fontSize: 18,
                  fontWeight: FontWeight.w900))
        ]
      ]);

  Widget _walletActions(Map<String, dynamic> row) => SizedBox(
      width: 360,
      child: Wrap(
          spacing: 8,
          runSpacing: 8,
          alignment: WrapAlignment.end,
          children: [
            _action('Cobrar no WhatsApp', () => _copyWhats(row, 'charge')),
            _action(
                'Marcar recebido',
                () => _operation(
                    ProModule.wallet, '${row['id']}', {'action': 'received'}),
                green: true),
            _action(
                'Bonificar',
                () => _operation(
                    ProModule.wallet, '${row['id']}', {'action': 'bonify'}),
                gold: true),
            _action(
                'Cancelar cobrança',
                () => _operation(
                    ProModule.wallet, '${row['id']}', {'action': 'cancel'}),
                danger: true),
            _action('Corrigir valor', () => _adjustWallet(row))
          ]));

  Future<void> _adjustWallet(Map<String, dynamic> row) async {
    final amount = TextEditingController(
      text: '${row['received_amount'] ?? row['services']?['price'] ?? 0}',
    );
    final value = await showDialog<double>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Corrigir valor a receber'),
        content: TextField(
          controller: amount,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Novo valor'),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancelar')),
          FilledButton(
              onPressed: () =>
                  Navigator.pop(context, double.tryParse(amount.text)),
              child: const Text('Salvar')),
        ],
      ),
    );
    amount.dispose();
    if (value == null || value < 0) return;
    await _operation(ProModule.wallet, '${row['id']}',
        {'action': 'adjust', 'amount': value});
  }

  Future<void> _operation(
      ProModule module, String id, Map<String, dynamic> body) async {
    final ok = await widget.viewModel.action(module, id, body);
    if (mounted) {
      _message(ok
          ? 'Ação registrada com sucesso.'
          : 'Não foi possível concluir a ação.');
    }
  }

  Widget _whatsapp() {
    final today = List<Map<String, dynamic>>.from(
        (_object['today'] as List?) ?? const []);
    final tomorrow = List<Map<String, dynamic>>.from(
        (_object['tomorrow'] as List?) ?? const []);
    final wallet = List<Map<String, dynamic>>.from(
        (_object['wallet'] as List?) ?? const []);
    final visibleAppointments = _activeFilter == 'Cobranças'
        ? <Map<String, dynamic>>[]
        : [
            ...today.map((row) => {...row, '_period': 'Hoje'}),
            ...tomorrow.map((row) => {...row, '_period': 'Amanhã'}),
          ];
    final visibleWallet =
        _activeFilter == 'Confirmações' ? <Map<String, dynamic>>[] : wallet;
    return _surface(
        'Central WhatsApp do dia',
        'Mensagens prontas para confirmar, reagendar e cobrar, usando os dados reais da agenda.',
        [
          _filterBar(['Todos', 'Confirmações', 'Cobranças']),
          if (visibleAppointments.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  if (today.isNotEmpty)
                    _action(
                      'Copiar confirmações de hoje',
                      () => _copyWhatsBatch(today, 'confirm'),
                      green: true,
                    ),
                  if (tomorrow.isNotEmpty)
                    _action(
                      'Copiar confirmações de amanhã',
                      () => _copyWhatsBatch(tomorrow, 'confirm'),
                    ),
                ],
              ),
            ),
          if (visibleAppointments.isEmpty && visibleWallet.isEmpty)
            const Padding(
                padding: EdgeInsets.all(16),
                child: Text('Nenhuma ação de WhatsApp pendente hoje.',
                    style: TextStyle(color: ZenColors.muted))),
          ...visibleAppointments.map((row) => _whatsappRow(row, false)),
          ...visibleWallet.map((row) => _whatsappRow(row, true)),
        ]);
  }

  Widget _whatsappRow(Map<String, dynamic> row, bool charge) => Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.all(14),
      decoration: _inset(),
      child: LayoutBuilder(
          builder: (context, box) => box.maxWidth > 630
              ? Row(children: [
                  Expanded(
                      child: _walletText(
                          '${charge ? 'Cobrança' : '${row['_period'] ?? 'Hoje'} ${row['time'] ?? '--:--'}'} • ${row['client_name'] ?? 'Cliente'}',
                          '${row['services']?['name'] ?? 'Serviço'} • ${row['barbers']?['name'] ?? ''} • ${row['client_phone'] ?? 'sem telefone'}',
                          '')),
                  const SizedBox(width: 10),
                  Wrap(spacing: 7, runSpacing: 7, children: [
                    _action(charge ? 'Cobrar' : 'Confirmar',
                        () => _copyWhats(row, charge ? 'charge' : 'confirm'),
                        green: true),
                    _action('Reagendar', () => _copyWhats(row, 'reschedule')),
                    _action('Copiar',
                        () => _copyWhats(row, charge ? 'charge' : 'confirm'))
                  ])
                ])
              : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  _walletText(
                      '${charge ? 'Cobrança' : '${row['_period'] ?? 'Hoje'} ${row['time'] ?? '--:--'}'} • ${row['client_name'] ?? 'Cliente'}',
                      '${row['services']?['name'] ?? 'Serviço'} • ${row['client_phone'] ?? 'sem telefone'}',
                      ''),
                  const SizedBox(height: 10),
                  Wrap(spacing: 7, runSpacing: 7, children: [
                    _action(charge ? 'Cobrar' : 'Confirmar',
                        () => _copyWhats(row, charge ? 'charge' : 'confirm'),
                        green: true),
                    _action('Reagendar', () => _copyWhats(row, 'reschedule')),
                    _action('Copiar',
                        () => _copyWhats(row, charge ? 'charge' : 'confirm'))
                  ])
                ])));

  Future<void> _copyWhats(Map<String, dynamic> row, String type) async {
    final message = _whatsMessage(row, type);
    await Clipboard.setData(ClipboardData(text: message));
    final digits = '${row['client_phone'] ?? ''}'.replaceAll(
      RegExp(r'\D'),
      '',
    );
    final destination =
        digits.length == 10 || digits.length == 11 ? '55$digits' : digits;
    var opened = false;
    if (destination.isNotEmpty) {
      opened = await launchUrl(
        Uri.https('wa.me', '/$destination', {'text': message}),
        mode: LaunchMode.externalApplication,
        webOnlyWindowName: '_blank',
      );
    }
    if (mounted) {
      _message(opened
          ? 'WhatsApp aberto e mensagem copiada.'
          : 'Mensagem copiada. Confira o telefone do cliente.');
    }
  }

  String _whatsMessage(Map<String, dynamic> row, String type) {
    final client = '${row['client_name'] ?? 'cliente'}';
    final name = client.trim().split(RegExp(r'\s+')).first;
    final shop = widget.shopName.isNotEmpty
        ? widget.shopName
        : '${row['barbers']?['shop_name'] ?? 'barbearia'}';
    final time = '${row['time'] ?? ''}';
    final service = '${row['services']?['name'] ?? 'serviço'}';
    final templateType = type == 'retention' ? 'comeback' : type;
    return _templateStore.fill(_whatsTemplates, templateType, {
      'cliente': client,
      'primeiro_nome': name,
      'barbearia': shop,
      'data': isoToBrazilianDate('${row['date'] ?? ''}'),
      'horario': time,
      'servico': service,
      'barbeiro': '${row['barbers']?['name'] ?? 'barbeiro'}',
      'valor': _money(row['received_amount'] ?? row['services']?['price']),
      'link': widget.bookingLogin.isEmpty
          ? ''
          : publicBookingUri(Uri.base, widget.bookingLogin).toString(),
    });
  }

  Future<void> _copyWhatsBatch(
    List<Map<String, dynamic>> rows,
    String type,
  ) async {
    final content = rows.map((row) {
      final phone = '${row['client_phone'] ?? 'sem telefone'}';
      return '$phone\n${_whatsMessage(row, type)}';
    }).join('\n\n--------------------\n\n');
    await Clipboard.setData(ClipboardData(text: content));
    if (mounted) {
      _message('${rows.length} confirmação(ões) copiadas.');
    }
  }

  List<Map<String, dynamic>> get _visiblePending {
    final now = DateTime.now();
    return _rows.where((row) {
      final date = DateTime.tryParse('${row['date']}');
      if (date == null || _activeFilter == 'Todos') return true;
      final days = now.difference(date).inDays;
      return _activeFilter == 'Últimos 7 dias' ? days <= 7 : days > 7;
    }).toList();
  }

  Widget _pending() => _surface(
          'Atendimentos pendentes de baixa',
          'Confirme o que aconteceu com cada horário passado antes de fechar o dia.',
          [
            _filterBar(['Todos', 'Últimos 7 dias', 'Mais antigos']),
            if (_visiblePending.isEmpty)
              const Padding(
                  padding: EdgeInsets.all(16),
                  child: Text('Nenhum atendimento pendente de baixa.',
                      style: TextStyle(color: ZenColors.muted)))
            else
              ..._visiblePending.map(_pendingRow),
          ]);

  Widget _pendingRow(Map<String, dynamic> row) => Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.all(14),
      decoration: _inset(),
      child: LayoutBuilder(
          builder: (context, box) => box.maxWidth > 620
              ? Row(children: [
                  Expanded(
                      child: _walletText(
                          '${row['time'] ?? '--:--'} • ${row['client_name'] ?? 'Cliente'}',
                          '${row['services']?['name'] ?? 'Serviço'} • ${_money(row['services']?['price'])}',
                          '')),
                  const SizedBox(width: 10),
                  Wrap(spacing: 7, runSpacing: 7, children: [
                    _action(
                        'Dar baixa',
                        () => _operation(ProModule.pending, '${row['id']}',
                            {'action': 'received'}),
                        green: true),
                    _action(
                        'Carteira',
                        () => _operation(ProModule.pending, '${row['id']}',
                            {'action': 'wallet'}),
                        gold: true),
                    _action(
                        'Faltou',
                        () => _operation(ProModule.pending, '${row['id']}',
                            {'action': 'no_show'}),
                        danger: true)
                  ])
                ])
              : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  _walletText(
                      '${row['time'] ?? '--:--'} • ${row['client_name'] ?? 'Cliente'}',
                      '${row['services']?['name'] ?? 'Serviço'} • ${_money(row['services']?['price'])}',
                      ''),
                  const SizedBox(height: 10),
                  Wrap(spacing: 7, runSpacing: 7, children: [
                    _action(
                        'Dar baixa',
                        () => _operation(ProModule.pending, '${row['id']}',
                            {'action': 'received'}),
                        green: true),
                    _action(
                        'Carteira',
                        () => _operation(ProModule.pending, '${row['id']}',
                            {'action': 'wallet'}),
                        gold: true),
                    _action(
                        'Faltou',
                        () => _operation(ProModule.pending, '${row['id']}',
                            {'action': 'no_show'}),
                        danger: true)
                  ])
                ])));

  Widget _commissions() {
    final total =
        _rows.fold<num>(0, (sum, row) => sum + ((row['gross'] as num?) ?? 0));
    final commissions = _rows.fold<num>(
        0, (sum, row) => sum + ((row['commission'] as num?) ?? 0));
    return Column(children: [
      Wrap(spacing: 12, runSpacing: 12, children: [
        _metric('Faturamento bruto', _money(total), ZenColors.green),
        _metric('Total comissão', _money(commissions), const Color(0xfff1be47)),
        _metric('Lucro líquido', _money(total - commissions),
            const Color(0xff7ae1ac)),
        _metric('Barbeiros', '${_rows.length}', ZenColors.sky),
      ]),
      const SizedBox(height: 16),
      _surface(
          'Editar comissão dos barbeiros',
          'Defina a porcentagem paga para cada barbeiro. O financeiro desconta esse valor automaticamente.',
          [
            if (_rows.isEmpty)
              const Padding(
                  padding: EdgeInsets.all(14),
                  child: Text('Nenhum barbeiro disponível.',
                      style: TextStyle(color: ZenColors.muted)))
            else
              ..._rows.map((row) => _commission(
                  '${row['id']}',
                  '${row['name'] ?? 'Barbeiro'}',
                  '${row['appointments'] ?? 0} atendimento(s) concluído(s) • Bruto: ${_money(row['gross'])}',
                  '${row['commission_rate'] ?? 0}')),
          ]),
    ]);
  }

  Widget _retention() {
    final risk =
        List<Map<String, dynamic>>.from((_object['risk'] as List?) ?? const []);
    return Column(children: [
      Wrap(spacing: 12, runSpacing: 12, children: [
        _metric(
            'Clientes ativos', '${_object['active'] ?? 0}', ZenColors.green),
        _metric('Clientes em risco', '${_object['atRisk'] ?? 0}',
            const Color(0xfff3ad46)),
        _metric('Clientes perdidos', '${_object['lost'] ?? 0}',
            const Color(0xffee705c)),
        _metric('Recuperados', '${_object['recovered'] ?? 0}', ZenColors.green),
        _metric(
            'Taxa de retorno', '${_object['returnRate'] ?? 0}%', ZenColors.sky),
        _metric('Índice ZEN', '${_object['zenIndex'] ?? 100}/100',
            const Color(0xffee705c))
      ]),
      if (_object['components'] is Map) ...[
        const SizedBox(height: 12),
        _surface(
          'Como o Índice ZEN é calculado',
          '40% retorno • 20% ocupação • 20% faturamento • 20% comparecimento',
          [
            Text(
              'Retorno ${_object['components']['retention'] ?? 0}%  •  '
              'Ocupação ${_object['components']['occupation'] ?? 0}%  •  '
              'Faturamento ${_object['components']['revenue'] ?? 0}%  •  '
              'Comparecimento ${_object['components']['attendance'] ?? 0}%',
              style: const TextStyle(color: ZenColors.muted),
            ),
          ],
        ),
      ],
      const SizedBox(height: 16),
      _surface('Clientes para recuperar',
          'Clientes que concluíram atendimento e ainda não retornaram.', [
        if (risk.isEmpty)
          const Padding(
              padding: EdgeInsets.all(16),
              child: Text('Nenhum cliente em risco no momento.',
                  style: TextStyle(color: ZenColors.muted)))
        else
          ...risk.map(_retentionRow),
      ]),
    ]);
  }

  Widget _retentionRow(Map<String, dynamic> row) => Container(
        margin: const EdgeInsets.only(top: 10),
        padding: const EdgeInsets.all(14),
        decoration: _inset(),
        child: LayoutBuilder(
          builder: (context, constraints) {
            final details = _walletText(
              '${row['client_name'] ?? 'Cliente'}',
              '${row['statusLabel'] ?? ''} • Último atendimento há ${row['daysAway'] ?? 0} dias • ${row['services']?['name'] ?? 'Serviço'} • ${row['barbers']?['name'] ?? ''}',
              '${row['visits'] ?? 0} visita(s) • Média ${_money(row['averageSpend'])} • Total ${_money(row['totalSpend'])}',
            );
            final actions = Wrap(
              spacing: 7,
              runSpacing: 7,
              children: [
                _action(
                    'Chamar no WhatsApp', () => _retentionAction(row, false)),
                _action('Agendar', () {
                  widget.onOpenAgenda?.call();
                  _message(
                      'Crie o horário para ${row['client_name'] ?? 'o cliente'} na agenda.');
                }, green: true),
                _action('Histórico', () => _showRetentionHistory(row)),
              ],
            );
            if (constraints.maxWidth < 700) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  details,
                  const SizedBox(height: 12),
                  actions,
                ],
              );
            }
            return Row(
              children: [
                Expanded(child: details),
                const SizedBox(width: 10),
                actions,
              ],
            );
          },
        ),
      );

  Future<void> _showRetentionHistory(Map<String, dynamic> row) async {
    final history = List<Map<String, dynamic>>.from(
      (row['history'] as List?) ?? const [],
    );
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Histórico de ${row['client_name'] ?? 'cliente'}'),
        content: SizedBox(
          width: 520,
          child: history.isEmpty
              ? const Text('Nenhum atendimento concluído.')
              : ListView.separated(
                  shrinkWrap: true,
                  itemCount: history.length,
                  separatorBuilder: (_, __) => const Divider(),
                  itemBuilder: (context, index) {
                    final item = history[index];
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text('${item['service'] ?? 'Serviço'}'),
                      subtitle: Text(
                        '${isoToBrazilianDate('${item['date'] ?? ''}')} '
                        '${item['time'] ?? ''} • ${item['barber'] ?? ''}',
                      ),
                      trailing: Text(_money(item['value'])),
                    );
                  },
                ),
        ),
        actions: [
          FilledButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Fechar'),
          ),
        ],
      ),
    );
  }

  Future<void> _retentionAction(
      Map<String, dynamic> row, bool recovered) async {
    if (!recovered) await _copyWhats(row, 'retention');
    final ok = await widget.viewModel.createRetentionAction({
      'clientKey': row['clientKey'],
      'clientName': row['client_name'],
      'clientPhone': row['client_phone'],
      'action': recovered ? 'recovered' : 'contacted',
      'daysAway': row['daysAway'],
      'barberId': row['barber_id'],
    });
    if (mounted) {
      _message(ok
          ? recovered
              ? 'Cliente marcado como recuperado.'
              : 'Contato de retenção registrado.'
          : 'Não foi possível registrar a ação.');
    }
  }

  Widget _reports() {
    final ordered = [..._rows]..sort((a, b) =>
        ((b['gross'] as num?) ?? 0).compareTo((a['gross'] as num?) ?? 0));
    final gross =
        ordered.fold<num>(0, (sum, row) => sum + ((row['gross'] as num?) ?? 0));
    final commissions = ordered.fold<num>(
        0, (sum, row) => sum + ((row['commission'] as num?) ?? 0));
    return Column(children: [
      _surface('Ranking de barbeiros',
          'Faturamento, atendimentos e comissão do mês selecionado.', [
        if (ordered.isEmpty)
          const Padding(
              padding: EdgeInsets.all(16),
              child: Text('Ainda não há resultados no período.',
                  style: TextStyle(color: ZenColors.muted)))
        else
          ...ordered.take(5).toList().asMap().entries.map((entry) =>
              _rankingRow(
                  '#${entry.key + 1}',
                  '${entry.value['name'] ?? 'Barbeiro'}',
                  '${entry.value['appointments'] ?? 0} atendimento(s)',
                  _money(entry.value['gross']),
                  entry.key == 0 ? const Color(0xffe4bd52) : ZenColors.muted)),
      ]),
      const SizedBox(height: 16),
      _surface('Resumo financeiro',
          'Resultados consolidados da operação no mês atual.', [
        Wrap(spacing: 20, runSpacing: 16, children: [
          _miniValue('Faturamento', _money(gross)),
          _miniValue('Comissão', _money(commissions)),
          _miniValue('Lucro', _money(gross - commissions))
        ]),
        const SizedBox(height: 14),
        Wrap(
          alignment: WrapAlignment.end,
          spacing: 10,
          runSpacing: 10,
          children: [
            _action('Copiar relatório CSV', _copyReportCsv),
            _action('CSV da agenda', _copyAgendaCsv),
            _action('CSV de clientes', _copyClientsCsv),
            _action('Auditoria PRO', _showProAudit),
            _action('Copiar backup JSON', _copyBackupJson, gold: true),
          ],
        ),
      ]),
    ]);
  }

  Future<void> _copyReportCsv() async {
    final lines = <String>[
      'profissional;atendimentos;faturamento;comissao;lucro',
      for (final row in _rows)
        [
          '${row['name'] ?? ''}'.replaceAll(';', ','),
          '${row['appointments'] ?? 0}',
          '${row['gross'] ?? 0}',
          '${row['commission'] ?? 0}',
          '${row['profit'] ?? 0}',
        ].join(';'),
    ];
    await Clipboard.setData(ClipboardData(text: lines.join('\n')));
    if (mounted) _message('Relatório CSV copiado.');
  }

  Future<void> _copyBackupJson() async {
    final backup = await widget.viewModel.createBackupJson();
    if (backup == null) {
      if (mounted) _message('Não foi possível gerar o backup.');
      return;
    }
    await Clipboard.setData(ClipboardData(text: backup));
    if (mounted) {
      _message('Backup JSON copiado. Salve o conteúdo em um local seguro.');
    }
  }

  Future<void> _copyAgendaCsv() async {
    final backup = await widget.viewModel.backupData();
    if (backup == null) {
      if (mounted) _message('Não foi possível gerar o CSV da agenda.');
      return;
    }
    final appointments = List<Map<String, dynamic>>.from(
      (backup['appointments'] as List?) ?? const [],
    );
    final services = {
      for (final service in List<Map<String, dynamic>>.from(
        (backup['services'] as List?) ?? const [],
      ))
        '${service['id']}': service,
    };
    final barbers = {
      for (final barber in List<Map<String, dynamic>>.from(
        (backup['barbers'] as List?) ?? const [],
      ))
        '${barber['id']}': barber,
    };
    final lines = <String>[
      'data;horario;cliente;telefone;profissional;servico;status;valor',
      for (final row in appointments)
        [
          row['date'],
          row['time'],
          row['client_name'],
          row['client_phone'],
          barbers['${row['barber_id']}']?['name'],
          services['${row['service_id']}']?['name'],
          row['status'],
          row['received_amount'] ??
              services['${row['service_id']}']?['price'] ??
              0,
        ].map((value) => '"${'$value'.replaceAll('"', '""')}"').join(';'),
    ];
    await Clipboard.setData(ClipboardData(text: lines.join('\n')));
    if (mounted) _message('${appointments.length} agendamento(s) copiados.');
  }

  Future<void> _copyClientsCsv() async {
    final backup = await widget.viewModel.backupData();
    if (backup == null) {
      if (mounted) _message('Não foi possível gerar o CSV de clientes.');
      return;
    }
    final services = {
      for (final service in List<Map<String, dynamic>>.from(
        (backup['services'] as List?) ?? const [],
      ))
        '${service['id']}': service,
    };
    final clients = <String, Map<String, dynamic>>{};
    for (final row in List<Map<String, dynamic>>.from(
      (backup['appointments'] as List?) ?? const [],
    )) {
      final key = '${row['client_phone'] ?? row['client_name']}'.trim();
      if (key.isEmpty) continue;
      final current = clients.putIfAbsent(
          key,
          () => {
                'name': row['client_name'] ?? '',
                'phone': row['client_phone'] ?? '',
                'last': '',
                'appointments': 0,
                'spent': 0.0,
              });
      current['appointments'] = (current['appointments'] as int) + 1;
      if ('${row['date']}'.compareTo('${current['last']}') > 0) {
        current['last'] = row['date'];
        current['name'] = row['client_name'] ?? current['name'];
      }
      if (['concluido', 'finalizado'].contains(row['status'])) {
        current['spent'] = (current['spent'] as double) +
            ((row['received_amount'] as num?)?.toDouble() ??
                (services['${row['service_id']}']?['price'] as num?)
                    ?.toDouble() ??
                0);
      }
    }
    final lines = <String>[
      'cliente;telefone;ultimo_atendimento;total_agendamentos;gasto_concluido',
      for (final row in clients.values)
        [
          row['name'],
          row['phone'],
          row['last'],
          row['appointments'],
          row['spent'],
        ].map((value) => '"${'$value'.replaceAll('"', '""')}"').join(';'),
    ];
    await Clipboard.setData(ClipboardData(text: lines.join('\n')));
    if (mounted) _message('${clients.length} cliente(s) copiados.');
  }

  Future<void> _showProAudit() async {
    final backup = await widget.viewModel.backupData();
    if (backup == null || !mounted) {
      if (mounted) _message('Não foi possível executar a auditoria.');
      return;
    }
    final audit = List<Map<String, dynamic>>.from(
      (backup['audit'] as List?) ?? const [],
    );
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(backup['auditHealthy'] == true
            ? 'Auditoria PRO: tudo certo'
            : 'Auditoria PRO: atenção necessária'),
        content: SizedBox(
          width: 620,
          child: ListView.separated(
            shrinkWrap: true,
            itemCount: audit.length,
            separatorBuilder: (_, __) => const Divider(),
            itemBuilder: (context, index) {
              final item = audit[index];
              final ok = item['ok'] == true;
              return ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(
                  ok ? Icons.check_circle : Icons.warning_amber_rounded,
                  color: ok ? ZenColors.green : ZenColors.gold,
                ),
                title: Text('${item['label']} • ${item['value'] ?? 0}'),
                subtitle: ok ? null : Text('${item['fix'] ?? ''}'),
              );
            },
          ),
        ),
        actions: [
          FilledButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Fechar'),
          ),
        ],
      ),
    );
  }

  Widget _cash() {
    if (!widget.viewModel.cashConfigured) {
      return _surface(
        'Controle de caixa',
        'Área protegida por senha exclusiva do dono.',
        const [
          Padding(
            padding: EdgeInsets.all(16),
            child: Text(
              'A senha do caixa ainda não foi criada pelo Admin NextJumpX. Entre no Painel ADM e configure a senha desta barbearia.',
              style: TextStyle(color: ZenColors.muted),
            ),
          ),
        ],
      );
    }
    if (!widget.viewModel.cashUnlocked) return _cashLock();
    return _surface(
        'Controle de caixa',
        'Acompanhe o caixa aberto, altere recebimentos com auditoria e faça o fechamento.',
        [
          Wrap(spacing: 12, runSpacing: 12, children: [
            _metric('Entradas', _money(_object['entries']), ZenColors.green),
            _metric('Saídas', _money(_object['commissions']),
                const Color(0xffed7268)),
            _metric('Saldo', _money(_object['balance']), ZenColors.sky),
            _metric(
              'Alterações',
              '${((_object['adjustments'] as List?) ?? const []).length}',
              ZenColors.gold,
            ),
          ]),
          const SizedBox(height: 15),
          if (((_object['receipts'] as List?) ?? const []).isNotEmpty) ...[
            const Text(
              'Recebimentos em aberto',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
            ),
            ...List<Map<String, dynamic>>.from(
              (_object['receipts'] as List?) ?? const [],
            ).map(_cashReceipt),
            const SizedBox(height: 18),
          ],
          if (((_object['manual'] as List?) ?? const []).isNotEmpty)
            const Text(
              'Lançamentos em aberto',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
            ),
          ...List<Map<String, dynamic>>.from(
                  (_object['manual'] as List?) ?? const [])
              .map(_cashEntry),
          if (((_object['adjustments'] as List?) ?? const []).isNotEmpty) ...[
            const SizedBox(height: 18),
            const Text(
              'Alterações de recebimento',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
            ),
            ...List<Map<String, dynamic>>.from(
              (_object['adjustments'] as List?) ?? const [],
            ).map(
              (entry) => ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.edit_note, color: ZenColors.gold),
                title: Text(
                  '${entry['client_name'] ?? 'Recebimento'} · ${_money(entry['old_amount'])} → ${_money(entry['new_amount'])}',
                ),
                subtitle: Text('${entry['reason'] ?? ''}'),
              ),
            ),
          ],
          if (((_object['closures'] as List?) ?? const []).isNotEmpty) ...[
            const SizedBox(height: 18),
            const Text('Fechamentos realizados',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
            ...List<Map<String, dynamic>>.from(
                    (_object['closures'] as List?) ?? const [])
                .map((closure) => ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: const Icon(Icons.lock_clock_outlined),
                      title: Text(
                          '${isoToBrazilianDate('${closure['period_start']}')} a ${isoToBrazilianDate('${closure['period_end']}')}'),
                      subtitle:
                          Text('Saldo fechado: ${_money(closure['balance'])}'),
                    )),
          ],
          const SizedBox(height: 12),
          Wrap(
            alignment: WrapAlignment.end,
            spacing: 10,
            runSpacing: 10,
            children: [
              _action('Bloquear tela', _lockCash),
              _action('Fechar caixa', _closeCash),
              _action('Adicionar lançamento', _createCashDialog, green: true),
            ],
          ),
        ]);
  }

  Widget _cashLock() => _surface(
        'Controle de caixa',
        'Área protegida por senha exclusiva do dono da barbearia.',
        [
          TextField(
            controller: _cashPassword,
            obscureText: true,
            decoration: const InputDecoration(labelText: 'Senha do dono'),
            onSubmitted: (_) => _unlockCash(),
          ),
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.centerRight,
            child: FilledButton.icon(
              onPressed: _unlockCash,
              icon: const Icon(Icons.lock_open),
              label: const Text('Entrar no caixa'),
            ),
          ),
        ],
      );

  Future<void> _unlockCash() async {
    final password = _cashPassword.text;
    if (password.isEmpty) return;
    final token = await widget.viewModel.unlockCash(password);
    if (token != null && token.isNotEmpty) {
      _cashPassword.clear();
      writeSessionPreference(_cashSessionKey, token);
    } else if (mounted) {
      _message(widget.viewModel.error ?? 'Senha do caixa incorreta.');
    }
  }

  void _lockCash() {
    removeSessionPreference(_cashSessionKey);
    widget.viewModel.lockCash();
  }

  Widget _cashReceipt(Map<String, dynamic> receipt) => Container(
        margin: const EdgeInsets.only(top: 10),
        padding: const EdgeInsets.all(14),
        decoration: _inset(),
        child: Row(
          children: [
            Expanded(
              child: _walletText(
                '${receipt['client_name'] ?? 'Cliente'}',
                '${isoToBrazilianDate('${receipt['date']}')} ${receipt['time'] ?? ''} · ${receipt['services']?['name'] ?? 'Serviço'} · ${receipt['barbers']?['name'] ?? ''}',
                _money(
                  receipt['received_amount'] ?? receipt['services']?['price'],
                ),
              ),
            ),
            _action(
              'Alterar recebimento',
              () => _editCashReceipt(receipt),
              gold: true,
            ),
          ],
        ),
      );

  Widget _cashEntry(Map<String, dynamic> entry) => Container(
        margin: const EdgeInsets.only(top: 10),
        padding: const EdgeInsets.all(14),
        decoration: _inset(),
        child: Row(
          children: [
            Expanded(
              child: _walletText(
                '${entry['type'] == 'entrada' ? 'Entrada' : 'Saída'} • ${entry['description'] ?? ''}',
                '${entry['entry_date'] ?? ''}',
                _money(entry['amount']),
              ),
            ),
            if (entry['source'] == 'manual')
              IconButton(
                onPressed: () => _deleteCashEntry('${entry['id']}'),
                icon: const Icon(Icons.delete_outline, color: ZenColors.red),
                tooltip: 'Cancelar lançamento',
              ),
          ],
        ),
      );

  Future<void> _deleteCashEntry(String id) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancelar lançamento?'),
        content: const Text(
            'O lançamento será preservado no histórico de auditoria e retirado do saldo.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancelar')),
          FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Cancelar lançamento')),
        ],
      ),
    );
    if (confirmed != true) return;
    final ok = await widget.viewModel.deleteCashEntry(id);
    if (mounted) {
      _message(ok
          ? 'Lançamento cancelado.'
          : 'Não foi possível cancelar o lançamento.');
    }
  }

  Future<void> _closeCash() async {
    final month = '${_object['month'] ?? ''}';
    if (month.isEmpty) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Fechar o caixa aberto?'),
        content: const Text(
            'Os recebimentos e lançamentos abertos serão arquivados. Um relatório CSV será copiado para a área de transferência.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Voltar')),
          FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Confirmar fechamento')),
        ],
      ),
    );
    if (confirmed != true) return;
    final ok = await widget.viewModel.createCashClosure(month);
    if (mounted) {
      if (ok && widget.viewModel.lastCashCsv.isNotEmpty) {
        await Clipboard.setData(
          ClipboardData(text: widget.viewModel.lastCashCsv),
        );
      }
      _message(ok
          ? 'Caixa fechado. Relatório CSV copiado.'
          : 'Não foi possível fechar o caixa.');
    }
  }

  Future<void> _editCashReceipt(Map<String, dynamic> receipt) async {
    final original = (receipt['received_amount'] as num?) ??
        (receipt['services']?['price'] as num?) ??
        0;
    final amount = TextEditingController(
      text: original.toStringAsFixed(2).replaceAll('.', ','),
    );
    final reason = TextEditingController();
    final data = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Alterar recebimento'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: amount,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(labelText: 'Novo valor'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: reason,
              maxLines: 2,
              decoration:
                  const InputDecoration(labelText: 'Motivo obrigatório'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, {
              'amount': double.tryParse(
                    amount.text.replaceAll('R\$', '').replaceAll(',', '.'),
                  ) ??
                  -1,
              'reason': reason.text.trim(),
            }),
            child: const Text('Salvar alteração'),
          ),
        ],
      ),
    );
    amount.dispose();
    reason.dispose();
    if (data == null) return;
    final ok = await widget.viewModel.updateCashReceipt(
      '${receipt['id']}',
      data,
    );
    if (mounted) {
      _message(ok
          ? 'Recebimento alterado e registrado na auditoria.'
          : 'Não foi possível alterar o recebimento.');
    }
  }

  Future<void> _createCashDialog() async {
    final description = TextEditingController();
    final amount = TextEditingController();
    final reason = TextEditingController();
    var type = 'entrada';
    final data = await showDialog<Map<String, String>>(
        context: context,
        builder: (context) => AlertDialog(
                title: const Text('Lançamento de caixa'),
                content: StatefulBuilder(
                    builder: (context, setDialog) =>
                        Column(mainAxisSize: MainAxisSize.min, children: [
                          TextField(
                              controller: description,
                              decoration: const InputDecoration(
                                  labelText: 'Descrição')),
                          const SizedBox(height: 10),
                          TextField(
                              controller: amount,
                              keyboardType: TextInputType.number,
                              decoration:
                                  const InputDecoration(labelText: 'Valor')),
                          const SizedBox(height: 10),
                          DropdownButtonFormField<String>(
                              initialValue: type,
                              items: const [
                                DropdownMenuItem(
                                    value: 'entrada', child: Text('Entrada')),
                                DropdownMenuItem(
                                    value: 'saida', child: Text('Saída'))
                              ],
                              onChanged: (value) =>
                                  setDialog(() => type = value ?? type),
                              decoration:
                                  const InputDecoration(labelText: 'Tipo')),
                          const SizedBox(height: 10),
                          TextField(
                              controller: reason,
                              decoration: const InputDecoration(
                                  labelText: 'Observação opcional'))
                        ])),
                actions: [
                  TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Cancelar')),
                  FilledButton(
                      onPressed: () => Navigator.pop(context, {
                            'description': description.text.trim(),
                            'amount': amount.text.trim(),
                            'type': type,
                            'reason': reason.text.trim(),
                          }),
                      child: const Text('Salvar'))
                ]));
    description.dispose();
    amount.dispose();
    reason.dispose();
    if (data == null || data['description']!.isEmpty) return;
    final ok = await widget.viewModel.createCashEntry({
      'description': data['description'],
      'amount': double.tryParse(data['amount'] ?? '') ?? 0,
      'type': data['type'],
      'reason': data['reason'],
    });
    if (mounted) {
      _message(ok
          ? 'Lançamento registrado.'
          : 'Não foi possível registrar o lançamento.');
    }
  }

  Widget _profile() => _surface(
          widget.currentUserCanManage
              ? 'Configurações da barbearia'
              : 'Meu perfil',
          widget.currentUserCanManage
              ? 'Identidade da barbearia usada no painel e no link público.'
              : 'Informações do seu perfil profissional.',
          [
            _currentField('name', 'Responsável', '${_object['name'] ?? ''}'),
            _currentField('phone', 'WhatsApp', '${_object['phone'] ?? ''}'),
            if (widget.currentUserCanManage)
              _currentField(
                'shopName',
                'Nome da barbearia',
                '${_object['shop_name'] ?? ''}',
              ),
            _profileImageField(
              'photoUrl',
              widget.currentUserCanManage
                  ? 'Logo/foto da barbearia'
                  : 'Foto do perfil',
              '${_object['photo_url'] ?? ''}',
              kind: 'logo',
              aspectRatio: 3,
            ),
            if (widget.currentUserCanManage)
              _profileImageField(
                'backgroundUrl',
                'Imagem de fundo do link público',
                '${_object['background_url'] ?? ''}',
                kind: 'background',
                aspectRatio: 16 / 6,
              ),
            const SizedBox(height: 4),
            Text(
                'Login público: ${_object['login'] ?? ''} • Barbearia: ${_object['shop_name'] ?? ''}',
                style: const TextStyle(color: ZenColors.muted, fontSize: 12)),
            const SizedBox(height: 12),
            Align(
                alignment: Alignment.centerRight,
                child: _action(
                    widget.currentUserCanManage
                        ? 'Salvar configurações'
                        : 'Salvar perfil',
                    () => _saveCurrent(ProModule.profile),
                    green: true)),
          ]);

  Widget _hours() {
    _weeklySchedule ??= _decodeWeeklySchedule();
    const names = [
      'Domingo',
      'Segunda',
      'Terça',
      'Quarta',
      'Quinta',
      'Sexta',
      'Sábado'
    ];
    return _surface(
      'Funcionamento inteligente',
      'Defina expediente e pausa de cada dia; agenda e link público usam esta configuração.',
      [
        for (var index = 0; index < names.length; index++)
          Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(12),
            decoration: _inset(),
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(names[index],
                          style: const TextStyle(fontWeight: FontWeight.w900)),
                    ),
                    Text(_weeklySchedule![index]['open'] == true
                        ? 'Aberto'
                        : 'Fechado'),
                    Switch(
                      value: _weeklySchedule![index]['open'] == true,
                      onChanged: (value) => setState(
                          () => _weeklySchedule![index]['open'] = value),
                    ),
                  ],
                ),
                if (_weeklySchedule![index]['open'] == true)
                  Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: [
                      _scheduleField(index, 'start', 'Início'),
                      _scheduleField(index, 'end', 'Fim'),
                      _scheduleField(index, 'break_start', 'Início da pausa'),
                      _scheduleField(index, 'break_end', 'Fim da pausa'),
                    ],
                  ),
              ],
            ),
          ),
        Align(
          alignment: Alignment.centerRight,
          child:
              _action('Salvar funcionamento', _saveWeeklySchedule, green: true),
        ),
        const SizedBox(height: 24),
        Row(
          children: [
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Horários especiais',
                    style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'Feche feriados, férias ou períodos específicos sem apagar os atendimentos existentes.',
                    style: TextStyle(color: ZenColors.muted),
                  ),
                ],
              ),
            ),
            _action('Fechar período', _createHoursClosure, gold: true),
          ],
        ),
        const SizedBox(height: 10),
        if (((_object['closures'] as List?) ?? const []).isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Text(
              'Nenhum fechamento futuro.',
              style: TextStyle(color: ZenColors.muted),
            ),
          )
        else
          ...List<Map<String, dynamic>>.from(
            (_object['closures'] as List?) ?? const [],
          ).map(
            (closure) => ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.event_busy, color: ZenColors.gold),
              title: Text(
                '${isoToBrazilianDate('${closure['date']}')} · ${closure['barbers']?['name'] ?? ''}',
              ),
              subtitle: Text('${closure['client_name'] ?? 'Agenda fechada'}'),
              trailing: IconButton(
                onPressed: () => _deleteHoursClosure('${closure['id']}'),
                icon: const Icon(Icons.lock_open_outlined),
                tooltip: 'Reabrir agenda',
              ),
            ),
          ),
      ],
    );
  }

  List<Map<String, dynamic>> _decodeWeeklySchedule() {
    final raw = '${_object['off_days'] ?? ''}';
    final legacyClosed = raw.split(',').map((value) => value.trim()).toSet();
    List<dynamic>? parsed;
    if (raw.startsWith('SCHEDULE_JSON:')) {
      try {
        final value = jsonDecode(raw.substring('SCHEDULE_JSON:'.length));
        if (value is List) parsed = value;
      } catch (_) {
        parsed = null;
      }
    }
    return List.generate(7, (index) {
      final current =
          parsed != null && index < parsed.length && parsed[index] is Map
              ? Map<String, dynamic>.from(parsed[index] as Map)
              : <String, dynamic>{};
      return {
        'open': current['open'] ?? !legacyClosed.contains('$index'),
        'start': current['start'] ?? _object['work_start'] ?? '09:00',
        'end': current['end'] ?? _object['work_end'] ?? '19:00',
        'break_start': current['break_start'] ?? '',
        'break_end': current['break_end'] ?? '',
      };
    });
  }

  Widget _scheduleField(int day, String key, String label) => SizedBox(
        width: 180,
        child: TextFormField(
          key: ValueKey('$day-$key-${_weeklySchedule![day][key]}'),
          initialValue: '${_weeklySchedule![day][key] ?? ''}',
          keyboardType: TextInputType.datetime,
          onChanged: (value) => _weeklySchedule![day][key] = value,
          decoration: InputDecoration(labelText: label, hintText: 'HH:MM'),
        ),
      );

  Future<void> _saveWeeklySchedule() async {
    final firstOpen = _weeklySchedule!.firstWhere(
      (day) => day['open'] == true,
      orElse: () => {'start': '09:00', 'end': '19:00'},
    );
    final ok = await widget.viewModel.saveCurrent(ProModule.hours, {
      'workStart': firstOpen['start'],
      'workEnd': firstOpen['end'],
      'offDays': 'SCHEDULE_JSON:${jsonEncode(_weeklySchedule)}',
    });
    if (mounted) {
      _message(ok
          ? 'Funcionamento semanal salvo.'
          : 'Não foi possível salvar o funcionamento.');
    }
  }

  Future<void> _createHoursClosure() async {
    var startDate = DateTime.now();
    var endDate = startDate;
    var barberId = '';
    final reason = TextEditingController(text: 'Feriado / agenda fechada');
    final barbers = List<Map<String, dynamic>>.from(
      (_object['barbers'] as List?) ?? const [],
    );
    final data = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Fechar agenda por período'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<String>(
                  initialValue: barberId,
                  items: [
                    const DropdownMenuItem(
                      value: '',
                      child: Text('Todos os profissionais'),
                    ),
                    ...barbers.map(
                      (barber) => DropdownMenuItem(
                        value: '${barber['id']}',
                        child: Text('${barber['name']}'),
                      ),
                    ),
                  ],
                  onChanged: (value) =>
                      setDialogState(() => barberId = value ?? ''),
                  decoration: const InputDecoration(labelText: 'Profissional'),
                ),
                const SizedBox(height: 10),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Data inicial'),
                  subtitle: Text(brazilianDate(startDate)),
                  trailing: const Icon(Icons.calendar_month),
                  onTap: () async {
                    final selected = await showDatePicker(
                      context: context,
                      initialDate: startDate,
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 3650)),
                      locale: const Locale('pt', 'BR'),
                    );
                    if (selected != null) {
                      setDialogState(() {
                        startDate = selected;
                        if (endDate.isBefore(startDate)) endDate = startDate;
                      });
                    }
                  },
                ),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Data final'),
                  subtitle: Text(brazilianDate(endDate)),
                  trailing: const Icon(Icons.calendar_month),
                  onTap: () async {
                    final selected = await showDatePicker(
                      context: context,
                      initialDate: endDate,
                      firstDate: startDate,
                      lastDate: startDate.add(const Duration(days: 365)),
                      locale: const Locale('pt', 'BR'),
                    );
                    if (selected != null) {
                      setDialogState(() => endDate = selected);
                    }
                  },
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: reason,
                  decoration: const InputDecoration(labelText: 'Motivo'),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancelar'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, {
                'startDate': isoDate(startDate),
                'endDate': isoDate(endDate),
                if (barberId.isNotEmpty) 'barberId': barberId,
                'reason': reason.text.trim(),
              }),
              child: const Text('Fechar agenda'),
            ),
          ],
        ),
      ),
    );
    reason.dispose();
    if (data == null) return;
    final ok = await widget.viewModel.createHoursClosure(data);
    if (mounted) {
      _message(ok
          ? 'Período fechado na agenda.'
          : 'Não foi possível fechar o período.');
    }
  }

  Future<void> _deleteHoursClosure(String id) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reabrir esta agenda?'),
        content: const Text(
          'O bloqueio especial será cancelado e novos horários voltarão a ficar disponíveis.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Voltar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Reabrir'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    final ok = await widget.viewModel.deleteHoursClosure(id);
    if (mounted) {
      _message(
          ok ? 'Agenda reaberta.' : 'Não foi possível reabrir esta agenda.');
    }
  }

  Widget _currentField(String key, String label, String initial,
          {bool time = false}) =>
      Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: TextFormField(
              initialValue: _currentInputs[key] ?? initial,
              keyboardType: time ? TextInputType.datetime : TextInputType.text,
              onChanged: (value) => _currentInputs[key] = value,
              decoration: InputDecoration(
                  labelText: label, hintText: time ? 'HH:MM' : null)));

  Widget _profileImageField(
    String key,
    String label,
    String initial, {
    required String kind,
    required double aspectRatio,
  }) {
    final value = _currentInputs[key] ?? initial;
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: _inset(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontWeight: FontWeight.w900)),
          const SizedBox(height: 10),
          if (value.isNotEmpty) ...[
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: AspectRatio(
                aspectRatio: aspectRatio,
                child: Image.network(
                  value,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => const ColoredBox(
                    color: Color(0xff111d29),
                    child: Center(
                      child: Text(
                        'Não foi possível carregar esta URL.',
                        style: TextStyle(color: ZenColors.muted),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 10),
          ],
          TextFormField(
            key: ValueKey('$key-$value'),
            initialValue: value,
            onChanged: (text) => _currentInputs[key] = text.trim(),
            decoration: const InputDecoration(
              labelText: 'URL pública (opcional)',
            ),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: widget.viewModel.uploading
                ? null
                : () => _pickAndUploadImage(key, kind),
            icon: widget.viewModel.uploading
                ? const SizedBox.square(
                    dimension: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.upload_file),
            label: Text(
              widget.viewModel.uploading
                  ? 'Enviando imagem...'
                  : 'Selecionar imagem',
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'JPG, PNG, WEBP ou GIF, com no máximo 4 MB.',
            style: TextStyle(color: ZenColors.muted, fontSize: 12),
          ),
        ],
      ),
    );
  }

  Future<void> _pickAndUploadImage(String key, String kind) async {
    final selection = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: const ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      allowMultiple: false,
      withData: true,
    );
    if (selection == null || selection.files.isEmpty) return;

    final file = selection.files.single;
    final bytes = file.bytes;
    if (bytes == null || bytes.isEmpty) {
      _message('Não foi possível ler a imagem selecionada.');
      return;
    }
    if (bytes.length > 4 * 1024 * 1024) {
      _message('A imagem deve ter no máximo 4 MB.');
      return;
    }

    final url = await widget.viewModel.uploadImage({
      'fileName': file.name,
      'data': base64Encode(bytes),
      'kind': kind,
    });
    if (!mounted) return;
    if (url == null || url.isEmpty) {
      _message(widget.viewModel.error ?? 'Não foi possível enviar a imagem.');
      return;
    }

    setState(() => _currentInputs[key] = url);
    final saved = await widget.viewModel.saveCurrent(
      ProModule.profile,
      {key: url},
    );
    if (mounted) {
      _message(saved
          ? 'Imagem enviada e salva com sucesso.'
          : 'A imagem foi enviada, mas não foi possível salvar no perfil.');
    }
  }

  Future<void> _saveCurrent(ProModule module) async {
    final allowed = module == ProModule.profile
        ? [
            'name',
            'phone',
            'photoUrl',
            if (widget.currentUserCanManage) 'backgroundUrl'
          ]
        : ['workStart', 'workEnd', 'breakStart', 'breakEnd', 'offDays'];
    final body = <String, dynamic>{
      for (final key in allowed)
        if (_currentInputs.containsKey(key)) key: _currentInputs[key]
    };
    if (body.isEmpty) {
      _message('Altere algum campo antes de salvar.');
      return;
    }
    final ok = await widget.viewModel.saveCurrent(module, body);
    if (mounted) {
      _message(ok
          ? 'Configurações salvas.'
          : 'Não foi possível salvar as configurações.');
    }
  }

  Widget _support() {
    final conversations = widget.viewModel.supportConversations;
    final activeId = widget.viewModel.activeConversationId;
    final active = conversations.cast<Map<String, dynamic>?>().firstWhere(
          (row) => '${row?['id']}' == activeId,
          orElse: () => null,
        );
    final messages = widget.viewModel.supportMessages;

    return _surface(
      'Atendimento NextJumpX',
      'Conversa persistente entre a barbearia e a equipe de suporte.',
      [
        if (conversations.isEmpty && !widget.viewModel.loading)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 18),
            child: Text(
              'Nenhuma conversa disponível.',
              style: TextStyle(color: ZenColors.muted),
            ),
          ),
        if (widget.currentUserIsAdmin && conversations.isNotEmpty)
          DropdownButtonFormField<String>(
            initialValue: activeId,
            decoration: const InputDecoration(
              labelText: 'Barbearia atendida',
              prefixIcon: Icon(Icons.storefront_outlined),
            ),
            items: conversations
                .map(
                  (conversation) => DropdownMenuItem(
                    value: '${conversation['id']}',
                    child: Text(
                      '${conversation['shop_name'] ?? 'Barbearia'} · ${conversation['status'] ?? 'aberta'}',
                    ),
                  ),
                )
                .toList(),
            onChanged: (id) {
              if (id != null) {
                widget.viewModel.selectSupportConversation(id);
              }
            },
          ),
        if (active != null) ...[
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: Text(
                  '${active['shop_name'] ?? 'Barbearia'}'
                  '${active['anydesk_code'] == null || '${active['anydesk_code']}'.isEmpty ? '' : ' · AnyDesk: ${active['anydesk_code']}'}',
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
              ),
              IconButton(
                tooltip: 'Cadastrar AnyDesk',
                onPressed: () =>
                    _editAnydesk('${active['anydesk_code'] ?? ''}'),
                icon: const Icon(Icons.desktop_windows_outlined),
              ),
              IconButton(
                tooltip: 'Atualizar conversa',
                onPressed: widget.viewModel.loading
                    ? null
                    : () => widget.viewModel.load(ProModule.support),
                icon: const Icon(Icons.refresh_rounded),
              ),
              PopupMenuButton<String>(
                tooltip: 'Alterar situação',
                onSelected: (status) => widget.viewModel
                    .updateSupportConversation({'status': status}),
                itemBuilder: (_) => const [
                  PopupMenuItem(value: 'aberta', child: Text('Aberta')),
                  PopupMenuItem(value: 'aguardando', child: Text('Aguardando')),
                  PopupMenuItem(value: 'resolvida', child: Text('Resolvida')),
                ],
                child: ZenStatusPill(
                  label: '${active['status'] ?? 'aberta'}',
                  color: active['status'] == 'resolvida'
                      ? ZenColors.green
                      : ZenColors.gold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            height: 360,
            padding: const EdgeInsets.all(12),
            decoration: _inset(),
            child: messages.isEmpty
                ? const Center(
                    child: Text(
                      'Envie a primeira mensagem para o suporte.',
                      style: TextStyle(color: ZenColors.muted),
                    ),
                  )
                : ListView.separated(
                    itemCount: messages.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 9),
                    itemBuilder: (_, messageIndex) {
                      final message = messages[messageIndex];
                      final sentByAdmin = message['sender_role'] == 'admin';
                      final mine = widget.currentUserIsAdmin
                          ? sentByAdmin
                          : !sentByAdmin;
                      return Align(
                        alignment:
                            mine ? Alignment.centerRight : Alignment.centerLeft,
                        child: Container(
                          constraints: const BoxConstraints(maxWidth: 520),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 13, vertical: 10),
                          decoration: BoxDecoration(
                            color: mine
                                ? const Color(0xff0b4b32)
                                : const Color(0xff152232),
                            border: Border.all(
                              color: mine
                                  ? const Color(0xff277c52)
                                  : const Color(0xff293b50),
                            ),
                            borderRadius: BorderRadius.circular(13),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${message['sender_name'] ?? (sentByAdmin ? 'NextJumpX' : 'Barbearia')}',
                                style: const TextStyle(
                                    fontSize: 11,
                                    color: ZenColors.muted,
                                    fontWeight: FontWeight.w800),
                              ),
                              const SizedBox(height: 4),
                              if ('${message['body'] ?? ''}'.isNotEmpty)
                                Text('${message['body']}'),
                              if ('${message['attachment_url'] ?? ''}'
                                  .isNotEmpty) ...[
                                const SizedBox(height: 8),
                                InkWell(
                                  onTap: () => _openExternal(Uri.parse(
                                      '${message['attachment_url']}')),
                                  child: ClipRRect(
                                    borderRadius: BorderRadius.circular(9),
                                    child: Image.network(
                                      '${message['attachment_url']}',
                                      width: 260,
                                      height: 180,
                                      fit: BoxFit.cover,
                                      errorBuilder: (_, __, ___) => const Text(
                                        'Abrir imagem anexada',
                                        style:
                                            TextStyle(color: ZenColors.green),
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              IconButton.filledTonal(
                tooltip: 'Anexar imagem',
                onPressed:
                    widget.viewModel.uploading ? null : _sendSupportAttachment,
                icon: const Icon(Icons.attach_file_rounded),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  controller: _supportMessage,
                  minLines: 1,
                  maxLines: 4,
                  maxLength: 4000,
                  decoration: const InputDecoration(
                    labelText: 'Mensagem',
                    hintText: 'Digite como podemos ajudar...',
                  ),
                  onSubmitted: (_) => _sendSupportMessage(),
                ),
              ),
              const SizedBox(width: 10),
              FilledButton.icon(
                onPressed:
                    widget.viewModel.loading ? null : _sendSupportMessage,
                icon: const Icon(Icons.send_rounded),
                label: const Text('Enviar'),
              ),
            ],
          ),
        ],
        const Divider(height: 34),
        ListTile(
          contentPadding: EdgeInsets.zero,
          leading: const CircleAvatar(child: Icon(Icons.phone_in_talk)),
          title: const Text('Atendimento pelo WhatsApp'),
          subtitle: const Text('Canal alternativo em horário comercial.'),
          trailing: OutlinedButton(
            onPressed: () => _openExternal(Uri.parse(
                'https://wa.me/${AppConfig.supportWhatsApp}?text=${Uri.encodeComponent('Olá! Preciso de ajuda com o ZenBarber.')}')),
            child: const Text('Abrir'),
          ),
        ),
      ],
    );
  }

  Future<void> _sendSupportMessage() async {
    final text = _supportMessage.text.trim();
    if (text.isEmpty) return;
    final sent = await widget.viewModel.sendSupportMessage(text);
    if (sent) {
      _supportMessage.clear();
    } else if (mounted) {
      _message(widget.viewModel.error ?? 'Não foi possível enviar a mensagem.');
    }
  }

  Future<void> _sendSupportAttachment() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: const ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      withData: true,
    );
    final file = result?.files.single;
    final bytes = file?.bytes;
    if (file == null || bytes == null) return;
    if (bytes.length > 4 * 1024 * 1024) {
      _message('A imagem deve ter no máximo 4 MB.');
      return;
    }

    final url = await widget.viewModel.uploadImage({
      'fileName': file.name,
      'data': base64Encode(bytes),
      'kind': 'support',
    });
    if (url == null || url.isEmpty) {
      if (mounted) {
        _message(widget.viewModel.error ?? 'Não foi possível enviar a imagem.');
      }
      return;
    }
    final sent = await widget.viewModel.sendSupportMessage(
      '',
      attachmentUrl: url,
    );
    if (!sent && mounted) {
      _message(widget.viewModel.error ?? 'Não foi possível anexar a imagem.');
    }
  }

  Future<void> _editAnydesk(String currentCode) async {
    final controller = TextEditingController(text: currentCode);
    final value = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Código AnyDesk'),
        content: TextField(
          controller: controller,
          autofocus: true,
          maxLength: 80,
          decoration: const InputDecoration(
            hintText: 'Ex: 123 456 789',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () =>
                Navigator.pop(dialogContext, controller.text.trim()),
            child: const Text('Salvar'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (value == null) return;
    final saved = await widget.viewModel
        .updateSupportConversation({'anydeskCode': value});
    if (mounted) {
      _message(saved
          ? (value.isEmpty ? 'AnyDesk removido.' : 'AnyDesk salvo.')
          : 'Não foi possível salvar o AnyDesk.');
    }
  }

  Widget _updates() => _surface(
        'Histórico de novidades',
        'Recursos, correções e melhorias entregues no sistema.',
        [
          if (_rows.isEmpty && !widget.viewModel.loading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 18),
              child: Text(
                'Nenhuma novidade publicada.',
                style: TextStyle(color: ZenColors.muted),
              ),
            )
          else
            ..._rows.map((update) {
              final viewed = update['viewed'] == true;
              final notes = update['notes'] is List
                  ? List<dynamic>.from(update['notes'] as List)
                  : const <dynamic>[];
              return Container(
                margin: const EdgeInsets.only(top: 14),
                padding: const EdgeInsets.all(18),
                decoration: _inset(),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            '${update['title'] ?? 'Atualização'}',
                            style: const TextStyle(
                                fontSize: 18, fontWeight: FontWeight.w900),
                          ),
                        ),
                        if (!viewed)
                          const ZenStatusPill(
                              label: 'NOVA', color: ZenColors.green),
                        const SizedBox(width: 8),
                        Text(
                          '${update['version'] ?? ''}',
                          style: const TextStyle(
                              color: ZenColors.gold,
                              fontWeight: FontWeight.w900),
                        ),
                      ],
                    ),
                    if ('${update['description'] ?? ''}'.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text(
                        '${update['description']}',
                        style: const TextStyle(color: ZenColors.muted),
                      ),
                    ],
                    if (notes.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      ...notes.map(
                        (note) => Padding(
                          padding: const EdgeInsets.only(bottom: 7),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(Icons.check_circle,
                                  size: 17, color: ZenColors.green),
                              const SizedBox(width: 8),
                              Expanded(child: Text('$note')),
                            ],
                          ),
                        ),
                      ),
                    ],
                    if (!viewed) ...[
                      const SizedBox(height: 8),
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton.icon(
                          onPressed: () => widget.viewModel
                              .markUpdateViewed('${update['id']}'),
                          icon: const Icon(Icons.done_all),
                          label: const Text('Marcar como vista'),
                        ),
                      ),
                    ],
                  ],
                ),
              );
            }),
        ],
      );

  Future<void> _openExternal(Uri uri) async {
    final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!opened && mounted) _message('Não foi possível abrir o link.');
  }

  Widget _units() {
    final units = List<Map<String, dynamic>>.from(
      (_object['units'] as List?) ?? const [],
    );
    final barbers = List<Map<String, dynamic>>.from(
      (_object['barbers'] as List?) ?? const [],
    );
    final requests = List<Map<String, dynamic>>.from(
      (_object['requests'] as List?) ?? const [],
    );
    return Column(
      children: [
        _surface(
          'Unidades cadastradas',
          'Unidades aprovadas pelo Admin e disponíveis para a operação.',
          [
            if (units.isEmpty)
              const Padding(
                padding: EdgeInsets.all(16),
                child: Text(
                  'Nenhuma unidade adicional aprovada.',
                  style: TextStyle(color: ZenColors.muted),
                ),
              )
            else
              ...units.map((unit) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const CircleAvatar(child: Icon(Icons.storefront)),
                    title: Text('${unit['name'] ?? 'Unidade'}'),
                    subtitle:
                        Text('${unit['city'] ?? ''}/${unit['state'] ?? ''}'),
                    trailing: const ZenStatusPill(
                      label: 'Ativa',
                      color: ZenColors.green,
                    ),
                  )),
            const SizedBox(height: 10),
            Align(
              alignment: Alignment.centerRight,
              child:
                  _action('Solicitar unidade', _createUnitDialog, green: true),
            ),
          ],
        ),
        if (units.isNotEmpty) ...[
          const SizedBox(height: 14),
          _surface(
            'Vincular profissionais',
            'Escolha em qual filial cada profissional atende. A seleção do topo filtra Agenda e Dashboard.',
            [
              for (final barber in barbers)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text('${barber['name'] ?? 'Profissional'}'),
                  subtitle: Text('@${barber['login'] ?? ''}'),
                  trailing: SizedBox(
                    width: 230,
                    child: DropdownButtonFormField<String>(
                      initialValue: '${barber['unit_id'] ?? ''}',
                      items: [
                        const DropdownMenuItem(
                          value: '',
                          child: Text('Sem unidade definida'),
                        ),
                        ...units.map((unit) => DropdownMenuItem(
                              value: '${unit['id']}',
                              child: Text('${unit['name']}'),
                            )),
                      ],
                      onChanged: (value) => widget.viewModel.assignBarberUnit(
                        '${barber['id']}',
                        value == null || value.isEmpty ? null : value,
                      ),
                      decoration: const InputDecoration(labelText: 'Unidade'),
                    ),
                  ),
                ),
            ],
          ),
        ],
        if (requests.isNotEmpty) ...[
          const SizedBox(height: 14),
          _surface(
            'Solicitações',
            'Acompanhe a análise de novas filiais.',
            [
              ...requests.map((request) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text('${request['unit_name'] ?? 'Nova unidade'}'),
                    subtitle: Text(
                        '${request['city'] ?? ''}/${request['state'] ?? ''}'),
                    trailing: ZenStatusPill(
                      label: '${request['status'] ?? 'pendente'}',
                      color: request['status'] == 'aprovado'
                          ? ZenColors.green
                          : ZenColors.gold,
                    ),
                  )),
            ],
          ),
        ],
      ],
    );
  }

  Future<void> _createUnitDialog() async {
    final name = TextEditingController();
    final city = TextEditingController();
    final state = TextEditingController();
    final amount = TextEditingController(text: '1');
    final value = await showDialog<Map<String, String>>(
        context: context,
        builder: (context) => AlertDialog(
                title: const Text('Nova unidade'),
                content: SingleChildScrollView(
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                  TextField(
                      controller: name,
                      decoration:
                          const InputDecoration(labelText: 'Nome da unidade')),
                  const SizedBox(height: 10),
                  TextField(
                      controller: city,
                      decoration: const InputDecoration(labelText: 'Cidade')),
                  const SizedBox(height: 10),
                  TextField(
                      controller: state,
                      decoration: const InputDecoration(labelText: 'UF')),
                  const SizedBox(height: 10),
                  TextField(
                      controller: amount,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                          labelText: 'Quantidade de barbeiros'))
                ])),
                actions: [
                  TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Cancelar')),
                  FilledButton(
                      onPressed: () => Navigator.pop(context, {
                            'name': name.text.trim(),
                            'city': city.text.trim(),
                            'state': state.text.trim(),
                            'amount': amount.text.trim()
                          }),
                      child: const Text('Solicitar'))
                ]));
    name.dispose();
    city.dispose();
    state.dispose();
    amount.dispose();
    if (value == null || (value['name'] ?? '').isEmpty) return;
    final ok = await widget.viewModel.createUnit({
      'unitName': value['name'],
      'city': value['city'],
      'state': value['state'],
      'barberCount': int.tryParse(value['amount'] ?? '') ?? 1
    });
    if (mounted) {
      _message(ok
          ? 'Solicitação de unidade enviada.'
          : 'Não foi possível criar a solicitação.');
    }
  }

  Widget _surface(String heading, String description, List<Widget> children) =>
      ZenCard(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(heading,
            style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w900)),
        const SizedBox(height: 6),
        Text(description,
            style: const TextStyle(color: ZenColors.muted, height: 1.35)),
        const SizedBox(height: 13),
        ...children
      ]));

  Widget _commission(String id, String name, String detail, String value) =>
      Container(
          margin: const EdgeInsets.only(top: 10),
          padding: const EdgeInsets.all(16),
          decoration: _inset(),
          child: LayoutBuilder(
              builder: (context, box) => box.maxWidth > 650
                  ? Row(children: [
                      Expanded(
                          child: _walletText(
                              name, detail, 'Comissão atual: $value%')),
                      SizedBox(
                          width: 126,
                          child: TextFormField(
                              initialValue: value,
                              onChanged: (newValue) =>
                                  _commissionInputs[id] = newValue,
                              keyboardType: TextInputType.number,
                              textAlign: TextAlign.center,
                              decoration:
                                  const InputDecoration(suffixText: '%'))),
                      const SizedBox(width: 10),
                      _action('Salvar', () => _saveCommission(id, name, value),
                          green: true)
                    ])
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                          _walletText(name, detail, 'Comissão atual: $value%'),
                          const SizedBox(height: 12),
                          TextFormField(
                              initialValue: value,
                              onChanged: (newValue) =>
                                  _commissionInputs[id] = newValue,
                              keyboardType: TextInputType.number,
                              decoration:
                                  const InputDecoration(suffixText: '%')),
                          const SizedBox(height: 9),
                          _action(
                              'Salvar', () => _saveCommission(id, name, value),
                              green: true)
                        ])));

  Future<void> _saveCommission(String id, String name, String current) async {
    final value = num.tryParse(_commissionInputs[id] ?? current);
    if (value == null || value < 0 || value > 100) {
      _message('Informe uma comissão entre 0 e 100%.');
      return;
    }
    final ok = await widget.viewModel.saveCommission(id, value);
    if (mounted) {
      _message(ok
          ? 'Comissão de $name salva.'
          : 'Não foi possível salvar a comissão.');
    }
  }

  Widget _filterBar(List<String> filters) => Padding(
      padding: const EdgeInsets.only(bottom: 5),
      child: Wrap(
          spacing: 8,
          runSpacing: 8,
          children: filters
              .map((item) => OutlinedButton(
                  onPressed: () => setState(() => _activeFilter = item),
                  style: OutlinedButton.styleFrom(
                    backgroundColor: _activeFilter == item
                        ? ZenColors.green.withValues(alpha: .18)
                        : null,
                    side: BorderSide(
                      color: _activeFilter == item
                          ? ZenColors.green
                          : const Color(0xff354251),
                    ),
                  ),
                  child: Text(item)))
              .toList()));

  // ignore: unused_element
  Widget _dayRow(String day, {bool closed = false}) => Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 11),
      decoration: _inset(),
      child: Row(children: [
        Expanded(
            child:
                Text(day, style: const TextStyle(fontWeight: FontWeight.w800))),
        Text(closed ? 'Fechado' : '09:00 – 19:00',
            style: TextStyle(
                color: closed ? const Color(0xffe47a7a) : ZenColors.muted)),
        const SizedBox(width: 10),
        Switch(value: !closed, onChanged: (_) => _message('$day atualizado.'))
      ]));

  Widget _rankingRow(String place, String name, String appointments,
          String value, Color color) =>
      Container(
          margin: const EdgeInsets.only(top: 9),
          padding: const EdgeInsets.all(14),
          decoration: _inset(),
          child: Row(children: [
            Container(
                width: 34,
                height: 34,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                    color: color.withValues(alpha: .16),
                    borderRadius: BorderRadius.circular(10)),
                child: Text(place,
                    style: TextStyle(
                        color: color,
                        fontWeight: FontWeight.w900,
                        fontSize: 11))),
            const SizedBox(width: 11),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text(name,
                      style: const TextStyle(fontWeight: FontWeight.w900)),
                  Text(appointments,
                      style:
                          const TextStyle(color: ZenColors.muted, fontSize: 12))
                ])),
            Text(value,
                style: const TextStyle(
                    color: ZenColors.green, fontWeight: FontWeight.w900))
          ]));

  Widget _metric(String label, String value, Color color) => SizedBox(
      width: 200,
      child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
              color: const Color(0xff0b1522),
              border: Border.all(color: color.withValues(alpha: .38)),
              borderRadius: BorderRadius.circular(18)),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label.toUpperCase(),
                style: const TextStyle(
                    color: ZenColors.muted,
                    fontSize: 10,
                    fontWeight: FontWeight.w900)),
            const SizedBox(height: 8),
            Text(value,
                style: TextStyle(
                    color: color, fontSize: 20, fontWeight: FontWeight.w900))
          ])));

  Widget _miniValue(String label, String value) => SizedBox(
      width: 170,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label,
            style: const TextStyle(color: ZenColors.muted, fontSize: 12)),
        const SizedBox(height: 4),
        Text(value,
            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 19))
      ]));

  Widget _action(String label, VoidCallback onTap,
          {bool green = false, bool gold = false, bool danger = false}) =>
      OutlinedButton(
          onPressed: onTap,
          style: OutlinedButton.styleFrom(
              foregroundColor: danger
                  ? const Color(0xffffc6c6)
                  : gold
                      ? const Color(0xffffd270)
                      : green
                          ? const Color(0xffb7ffca)
                          : Colors.white,
              side: BorderSide(
                  color: danger
                      ? const Color(0xff82383b)
                      : gold
                          ? const Color(0xff80601b)
                          : green
                              ? const Color(0xff258247)
                              : const Color(0xff354251)),
              backgroundColor: danger
                  ? const Color(0xff45191b)
                  : gold
                      ? const Color(0xff4a3510)
                      : green
                          ? const Color(0xff0d4a29)
                          : const Color(0xff151d27),
              padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 11),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(11))),
          child: Text(label,
              style:
                  const TextStyle(fontSize: 12, fontWeight: FontWeight.w900)));

  BoxDecoration _inset() => BoxDecoration(
      color: const Color(0xff08121d),
      border: Border.all(color: const Color(0xff213041)),
      borderRadius: BorderRadius.circular(16));
}

// ignore: unused_element
class _ReadOnlyField extends StatelessWidget {
  const _ReadOnlyField({required this.label, required this.value});
  final String label;
  final String value;
  @override
  Widget build(BuildContext context) => Padding(
      padding: const EdgeInsets.only(bottom: 11),
      child: TextFormField(
          initialValue: value, decoration: InputDecoration(labelText: label)));
}
