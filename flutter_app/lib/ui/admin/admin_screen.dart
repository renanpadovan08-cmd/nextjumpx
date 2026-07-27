import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/theme/zen_colors.dart';
import '../core/widgets/zen_card.dart';
import 'view_models/admin_view_model.dart';

class AdminScreen extends StatefulWidget {
  const AdminScreen({super.key, required this.viewModel});
  final AdminViewModel viewModel;

  @override
  State<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends State<AdminScreen> {
  String filter = '';

  @override
  void initState() {
    super.initState();
    widget.viewModel
      ..addListener(_refresh)
      ..load();
  }

  void _refresh() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    widget.viewModel.removeListener(_refresh);
    super.dispose();
  }

  List<Map<String, dynamic>> get _items {
    final value = filter.trim().toLowerCase();
    if (value.isEmpty) return widget.viewModel.items;
    return widget.viewModel.items
        .where((item) => '${item['name']} ${item['shop_name']} ${item['login']}'
            .toLowerCase()
            .contains(value))
        .toList();
  }

  double get _mrr => widget.viewModel.items
      .where((item) => item['access_status'] == 'ativo')
      .fold<double>(
          0, (total, item) => total + _number(_settings(item)['monthly_fee']));

  Map<String, dynamic> _settings(Map<String, dynamic> item) =>
      item['settings'] is Map
          ? Map<String, dynamic>.from(item['settings'] as Map)
          : {};

  double _number(dynamic value) => value is num
      ? value.toDouble()
      : double.tryParse('${value ?? 0}'.replaceAll(',', '.')) ?? 0;

  String _money(double value) =>
      'R\$ ${value.toStringAsFixed(2).replaceAll('.', ',')}';

  @override
  Widget build(BuildContext context) => RefreshIndicator(
        onRefresh: widget.viewModel.load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(32, 26, 32, 92),
          children: [
            const Text('Gestao PRO',
                style: TextStyle(
                    fontSize: 25,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -.9)),
            const SizedBox(height: 5),
            const Text(
                'Contas, mensalidades, multiunidade, cobrancas e solicitacoes.',
                style: TextStyle(color: ZenColors.muted)),
            const SizedBox(height: 16),
            Wrap(spacing: 12, runSpacing: 12, children: [
              _metric('Cadastros', '${widget.viewModel.items.length}',
                  ZenColors.sky),
              _metric(
                  'Ativos',
                  '${widget.viewModel.items.where((item) => item['access_status'] == 'ativo').length}',
                  ZenColors.green),
              _metric(
                  'Pendentes',
                  '${widget.viewModel.items.where((item) => item['access_status'] == 'pendente').length}',
                  const Color(0xfff0bd45)),
              _metric(
                  'Bloqueados',
                  '${widget.viewModel.items.where((item) => item['access_status'] == 'bloqueado').length}',
                  const Color(0xffee7474)),
              _metric('MRR', _money(_mrr), const Color(0xffb79cff)),
            ]),
            const SizedBox(height: 16),
            ZenCard(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Row(children: [
                    const Expanded(
                        child: Text('Barbearias e acessos',
                            style: TextStyle(
                                fontSize: 20, fontWeight: FontWeight.w900))),
                    _button('Nova barbearia', _createDialog, green: true),
                  ]),
                  const SizedBox(height: 5),
                  const Text(
                      'Configure plano, multiunidade, cobranca e permissoes de cada conta.',
                      style: TextStyle(color: ZenColors.muted)),
                  const SizedBox(height: 16),
                  TextField(
                      onChanged: (value) => setState(() => filter = value),
                      decoration: const InputDecoration(
                          prefixIcon: Icon(Icons.search_rounded),
                          hintText: 'Buscar barbearia, responsavel ou login')),
                  const SizedBox(height: 12),
                  if (widget.viewModel.loading)
                    const Center(
                        child: Padding(
                            padding: EdgeInsets.all(24),
                            child: CircularProgressIndicator()))
                  else if (widget.viewModel.error != null)
                    _error(widget.viewModel.error!)
                  else if (_items.isEmpty)
                    const Padding(
                        padding: EdgeInsets.all(22),
                        child: Center(
                            child: Text('Nenhum cadastro encontrado.',
                                style: TextStyle(color: ZenColors.muted))))
                  else
                    ..._items.map(_account),
                ])),
            const SizedBox(height: 16),
            _unitRequestsCard(),
          ],
        ),
      );

  Widget _account(Map<String, dynamic> item) {
    final status = '${item['access_status'] ?? 'pendente'}';
    final role = '${item['role'] ?? 'barbeiro'}';
    final color = switch (status) {
      'ativo' => ZenColors.green,
      'bloqueado' || 'rejeitado' => ZenColors.red,
      _ => const Color(0xfff0bd45),
    };
    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
          color: const Color(0xff09131f),
          border: Border.all(color: const Color(0xff223142)),
          borderRadius: BorderRadius.circular(16)),
      child: LayoutBuilder(
          builder: (context, box) => box.maxWidth > 900
              ? Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Expanded(child: _accountInfo(item, status, role, color)),
                  const SizedBox(width: 12),
                  _accountActions(item, status, role)
                ])
              : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  _accountInfo(item, status, role, color),
                  const SizedBox(height: 12),
                  _accountActions(item, status, role)
                ])),
    );
  }

  Widget _accountInfo(
      Map<String, dynamic> item, String status, String role, Color color) {
    final settings = _settings(item);
    return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Container(
          width: 42,
          height: 42,
          alignment: Alignment.center,
          decoration: BoxDecoration(
              color: color.withValues(alpha: .16),
              borderRadius: BorderRadius.circular(13)),
          child: Icon(Icons.storefront_rounded, color: color)),
      const SizedBox(width: 11),
      Expanded(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('${item['shop_name'] ?? 'Barbearia sem nome'}',
            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15)),
        const SizedBox(height: 3),
        Text('${item['name'] ?? 'Responsavel'} - @${item['login'] ?? ''}',
            style: const TextStyle(color: ZenColors.muted, fontSize: 12)),
        const SizedBox(height: 7),
        Wrap(spacing: 6, runSpacing: 6, children: [
          _pill(status, color),
          _pill(role, const Color(0xff7da9e8)),
          if (settings['monthly_fee'] != null)
            _pill(_money(_number(settings['monthly_fee'])),
                const Color(0xfff0bd45)),
          if (settings['multiunit_enabled'] == true)
            _pill('Multiunidade', const Color(0xffb79cff)),
          if (item['expires_at'] != null && '${item['expires_at']}'.isNotEmpty)
            _pill('Expira: ${item['expires_at']}', ZenColors.muted),
        ]),
      ])),
    ]);
  }

  Widget _accountActions(
          Map<String, dynamic> item, String status, String role) =>
      SizedBox(
          width: 390,
          child: Wrap(
              alignment: WrapAlignment.end,
              spacing: 7,
              runSpacing: 7,
              children: [
                _button(
                    status == 'ativo' ? 'Bloquear' : 'Liberar',
                    status == 'ativo'
                        ? () => _change(item, {'access_status': 'bloqueado'})
                        : () => _change(item, {'access_status': 'ativo'}),
                    danger: status == 'ativo',
                    green: status != 'ativo'),
                _button('Plano', () => _planDialog(item)),
                _button('Cobranca', () => _billingMessage(item)),
                _button('Pago', () => _markPaid(item), green: true),
                _button('Papel', () => _roleDialog(item, role)),
                _button('Validade', () => _expiryDialog(item)),
                _button('Nova senha', () => _passwordDialog(item)),
                _button('Desativar', () => _deleteDialog(item), danger: true),
              ]));

  Widget _unitRequestsCard() => ZenCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Solicitacoes de unidade',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
          const SizedBox(height: 5),
          const Text(
              'Aprove uma unidade para liberar multiunidade na conta do gerente.',
              style: TextStyle(color: ZenColors.muted)),
          const SizedBox(height: 10),
          if (widget.viewModel.unitRequests.isEmpty)
            const Text('Nenhuma solicitacao de unidade.',
                style: TextStyle(color: ZenColors.muted))
          else
            ...widget.viewModel.unitRequests.map((item) => Container(
                  margin: const EdgeInsets.only(top: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                      color: const Color(0xff09131f),
                      borderRadius: BorderRadius.circular(12)),
                  child: LayoutBuilder(
                    builder: (context, box) => box.maxWidth > 700
                        ? Row(children: [
                            Expanded(child: _unitInfo(item)),
                            _unitActions(item)
                          ])
                        : Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                                _unitInfo(item),
                                const SizedBox(height: 8),
                                _unitActions(item)
                              ]),
                  ),
                )),
        ]),
      );

  Widget _unitInfo(Map<String, dynamic> item) =>
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('${item['unit_name'] ?? 'Unidade'} - ${item['shop_name'] ?? ''}',
            style: const TextStyle(fontWeight: FontWeight.w800)),
        Text(
            '${item['manager_name'] ?? ''}  ${item['city'] ?? ''}/${item['state'] ?? ''} - ${item['status'] ?? 'pendente'}',
            style: const TextStyle(color: ZenColors.muted, fontSize: 12)),
        if ('${item['notes'] ?? ''}'.isNotEmpty)
          Text('${item['notes']}',
              style: const TextStyle(color: ZenColors.muted, fontSize: 12)),
      ]);

  Widget _unitActions(Map<String, dynamic> item) =>
      Wrap(spacing: 6, runSpacing: 6, children: [
        _button('Aprovar', () => _setUnitStatus(item, 'aprovado'), green: true),
        _button('Aguardar pag.',
            () => _setUnitStatus(item, 'aguardando_pagamento')),
        _button('Rejeitar', () => _setUnitStatus(item, 'rejeitado'),
            danger: true),
        _button('Bloquear', () => _setUnitStatus(item, 'bloqueado'),
            danger: true),
      ]);

  Widget _metric(String label, String value, Color color) => SizedBox(
      width: 166,
      child: Container(
          padding: const EdgeInsets.all(15),
          decoration: BoxDecoration(
              color: const Color(0xff0a1521),
              border: Border.all(color: color.withValues(alpha: .35)),
              borderRadius: BorderRadius.circular(17)),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label.toUpperCase(),
                style: const TextStyle(
                    color: ZenColors.muted,
                    fontSize: 10,
                    fontWeight: FontWeight.w900)),
            const SizedBox(height: 7),
            Text(value,
                style: TextStyle(
                    fontSize: 20, fontWeight: FontWeight.w900, color: color))
          ])));

  Widget _pill(String label, Color color) => Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
          color: color.withValues(alpha: .13),
          borderRadius: BorderRadius.circular(99)),
      child: Text(label,
          style: TextStyle(
              color: color, fontSize: 10, fontWeight: FontWeight.w900)));

  Widget _button(String label, VoidCallback onTap,
          {bool danger = false, bool green = false}) =>
      OutlinedButton(
          onPressed: onTap,
          style: OutlinedButton.styleFrom(
              foregroundColor: danger
                  ? const Color(0xffffc3c3)
                  : green
                      ? const Color(0xffa8ffc1)
                      : Colors.white,
              backgroundColor: danger
                  ? const Color(0xff46191d)
                  : green
                      ? const Color(0xff0e482a)
                      : const Color(0xff151d27),
              side: BorderSide(
                  color: danger
                      ? const Color(0xff873c41)
                      : green
                          ? const Color(0xff298a4e)
                          : const Color(0xff394654)),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10))),
          child: Text(label,
              style:
                  const TextStyle(fontSize: 11, fontWeight: FontWeight.w900)));

  Widget _error(String value) => Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
          color: const Color(0xff421b20),
          borderRadius: BorderRadius.circular(11)),
      child: Text(value));

  Future<void> _change(
      Map<String, dynamic> item, Map<String, dynamic> value) async {
    final ok = await widget.viewModel.updateAccess('${item['id']}', value);
    if (mounted) {
      _snack(
          ok ? 'Acesso atualizado.' : 'Nao foi possivel atualizar o acesso.');
    }
  }

  Future<void> _createDialog() async {
    final name = TextEditingController();
    final shop = TextEditingController();
    final login = TextEditingController();
    final password = TextEditingController();
    final phone = TextEditingController();
    final data = await showDialog<Map<String, dynamic>>(
        context: context,
        builder: (context) => AlertDialog(
                title: const Text('Nova barbearia'),
                content: SingleChildScrollView(
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                  _field(name, 'Responsavel'),
                  _field(shop, 'Barbearia'),
                  _field(login, 'Login'),
                  _field(password, 'Senha (minimo 8)', obscure: true),
                  _field(phone, 'Telefone')
                ])),
                actions: [
                  TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Cancelar')),
                  FilledButton(
                      onPressed: () => Navigator.pop(context, {
                            'name': name.text.trim(),
                            'shop_name': shop.text.trim(),
                            'login': login.text.trim(),
                            'password': password.text,
                            'phone': phone.text.trim()
                          }),
                      child: const Text('Criar'))
                ]));
    name.dispose();
    shop.dispose();
    login.dispose();
    password.dispose();
    phone.dispose();
    if (data == null) return;
    final ok = await widget.viewModel.createAccount(data);
    if (mounted) {
      _snack(ok ? 'Barbearia criada.' : 'Nao foi possivel criar a barbearia.');
    }
  }

  Future<void> _planDialog(Map<String, dynamic> item) async {
    final settings = _settings(item);
    final fee = TextEditingController(text: '${settings['monthly_fee'] ?? 0}');
    final dueDay = TextEditingController(text: '${settings['due_day'] ?? 10}');
    final method =
        TextEditingController(text: '${settings['payment_method'] ?? 'Pix'}');
    final note =
        TextEditingController(text: '${settings['internal_note'] ?? ''}');
    var status = '${settings['subscription_status'] ?? 'ativo'}';
    var multiunit = settings['multiunit_enabled'] == true;
    final data = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Plano - ${item['shop_name']}'),
        content: StatefulBuilder(
          builder: (context, setDialog) => SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              _field(fee, 'Mensalidade (R\$)', number: true),
              _field(dueDay, 'Dia de vencimento (1 a 28)', number: true),
              _field(method, 'Metodo de pagamento'),
              DropdownButtonFormField<String>(
                initialValue: status,
                decoration: const InputDecoration(labelText: 'Situacao'),
                items: const [
                  DropdownMenuItem(value: 'ativo', child: Text('Ativo')),
                  DropdownMenuItem(value: 'trial', child: Text('Trial')),
                  DropdownMenuItem(
                      value: 'bonificado', child: Text('Bonificado')),
                  DropdownMenuItem(
                      value: 'bloqueado', child: Text('Bloqueado')),
                ],
                onChanged: (value) => setDialog(() => status = value ?? status),
              ),
              SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Multiunidade liberada'),
                  value: multiunit,
                  onChanged: (value) => setDialog(() => multiunit = value)),
              _field(note, 'Observacao interna'),
            ]),
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancelar')),
          FilledButton(
              onPressed: () => Navigator.pop(context, {
                    'monthly_fee': _number(fee.text),
                    'due_day': int.tryParse(dueDay.text) ?? 10,
                    'payment_method': method.text.trim(),
                    'subscription_status': status,
                    'multiunit_enabled': multiunit,
                    'internal_note': note.text.trim()
                  }),
              child: const Text('Salvar')),
        ],
      ),
    );
    fee.dispose();
    dueDay.dispose();
    method.dispose();
    note.dispose();
    if (data == null) return;
    final ok = await widget.viewModel.updateSettings('${item['id']}', data);
    if (mounted) {
      _snack(ok
          ? 'Plano atualizado.'
          : 'Nao foi possivel atualizar o plano. Execute o SQL do Admin PRO no Supabase.');
    }
  }

  Future<void> _markPaid(Map<String, dynamic> item) async {
    final ok = await widget.viewModel.markPaid('${item['id']}');
    if (mounted) {
      _snack(ok
          ? 'Pagamento registrado.'
          : 'Nao foi possivel registrar o pagamento.');
    }
  }

  Future<void> _billingMessage(Map<String, dynamic> item) async {
    final settings = _settings(item);
    final due = settings['due_day'] ?? 10;
    final fee = _money(_number(settings['monthly_fee']));
    final message =
        'Ola, ${item['name'] ?? ''}! A mensalidade da ${item['shop_name'] ?? 'barbearia'} no valor de $fee vence dia $due. Pagamento: ${settings['payment_method'] ?? 'Pix'}.';
    await Clipboard.setData(ClipboardData(text: message));
    if (mounted) {
      _snack(
          'Mensagem de cobranca copiada. Abra o WhatsApp e cole para enviar.');
    }
  }

  Future<void> _deleteDialog(Map<String, dynamic> item) async {
    final confirm = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
                title: const Text('Desativar barbearia?'),
                content: Text(
                    'A conta ${item['shop_name'] ?? ''} será bloqueada sem apagar agenda, caixa ou histórico.'),
                actions: [
                  TextButton(
                      onPressed: () => Navigator.pop(context, false),
                      child: const Text('Cancelar')),
                  FilledButton(
                      onPressed: () => Navigator.pop(context, true),
                      style: FilledButton.styleFrom(
                          backgroundColor: ZenColors.red),
                      child: const Text('Desativar'))
                ]));
    if (confirm != true) return;
    final ok = await widget.viewModel.deleteAccount('${item['id']}');
    if (mounted) {
      _snack(ok
          ? 'Barbearia desativada.'
          : 'Nao foi possivel desativar a barbearia.');
    }
  }

  Future<void> _setUnitStatus(Map<String, dynamic> item, String status) async {
    final ok =
        await widget.viewModel.updateUnitRequest('${item['id']}', status);
    if (mounted) {
      _snack(ok
          ? 'Solicitacao atualizada.'
          : 'Nao foi possivel atualizar a solicitacao.');
    }
  }

  Future<void> _roleDialog(Map<String, dynamic> item, String role) async {
    var selected = role == 'admin_master' ? 'admin' : role;
    final value = await showDialog<String>(
        context: context,
        builder: (context) => AlertDialog(
                title: const Text('Papel de acesso'),
                content: StatefulBuilder(
                    builder: (context, setDialog) => DropdownButtonFormField<
                            String>(
                        initialValue: selected,
                        decoration: const InputDecoration(labelText: 'Papel'),
                        items: const [
                          DropdownMenuItem(
                              value: 'admin', child: Text('Administrador')),
                          DropdownMenuItem(
                              value: 'gerente', child: Text('Gerente')),
                          DropdownMenuItem(
                              value: 'barbeiro', child: Text('Barbeiro'))
                        ],
                        onChanged: (newValue) =>
                            setDialog(() => selected = newValue ?? selected))),
                actions: [
                  TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Cancelar')),
                  FilledButton(
                      onPressed: () => Navigator.pop(context, selected),
                      child: const Text('Salvar'))
                ]));
    if (value != null) await _change(item, {'role': value});
  }

  Future<void> _expiryDialog(Map<String, dynamic> item) async {
    final controller =
        TextEditingController(text: '${item['expires_at'] ?? ''}');
    final value = await showDialog<String>(
        context: context,
        builder: (context) => AlertDialog(
                title: const Text('Validade do acesso'),
                content: _field(controller, 'Data AAAA-MM-DD'),
                actions: [
                  TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Cancelar')),
                  FilledButton(
                      onPressed: () =>
                          Navigator.pop(context, controller.text.trim()),
                      child: const Text('Salvar'))
                ]));
    controller.dispose();
    if (value != null) await _change(item, {'expires_at': value});
  }

  Future<void> _passwordDialog(Map<String, dynamic> item) async {
    final controller = TextEditingController();
    final value = await showDialog<String>(
        context: context,
        builder: (context) => AlertDialog(
                title: const Text('Gerar nova senha'),
                content:
                    _field(controller, 'Nova senha (minimo 8)', obscure: true),
                actions: [
                  TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Cancelar')),
                  FilledButton(
                      onPressed: () => Navigator.pop(context, controller.text),
                      child: const Text('Salvar senha'))
                ]));
    controller.dispose();
    if (value == null || value.length < 8) return;
    final ok = await widget.viewModel.resetPassword('${item['id']}', value);
    if (mounted) {
      _snack(ok ? 'Senha redefinida.' : 'Nao foi possivel redefinir a senha.');
    }
  }

  Widget _field(TextEditingController controller, String label,
          {bool obscure = false, bool number = false}) =>
      Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: TextField(
              controller: controller,
              obscureText: obscure,
              keyboardType: number ? TextInputType.number : null,
              decoration: InputDecoration(labelText: label)));
  void _snack(String value) => ScaffoldMessenger.of(context)
      .showSnackBar(SnackBar(content: Text(value)));
}
