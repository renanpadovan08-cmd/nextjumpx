import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

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
  units
}

class ProModuleScreen extends StatefulWidget {
  const ProModuleScreen(
      {super.key, required this.module, required this.viewModel});

  final ProModule module;
  final ProModuleViewModel viewModel;

  @override
  State<ProModuleScreen> createState() => _ProModuleScreenState();
}

class _ProModuleScreenState extends State<ProModuleScreen> {
  final Set<String> _completed = {};
  final Map<String, String> _commissionInputs = {};
  final Map<String, String> _currentInputs = {};

  @override
  void initState() {
    super.initState();
    widget.viewModel
      ..addListener(_refresh)
      ..load(widget.module);
  }

  void _refresh() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    widget.viewModel.removeListener(_refresh);
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
                          '${row['services']?['name'] ?? 'Serviço'} • ${row['barbers']?['name'] ?? ''} • lembrete: ${row['reminder_date'] ?? 'não definido'}',
                          _money(row['received_amount'] ??
                              row['services']?['price']))),
                  const SizedBox(width: 16),
                  _walletActions('${row['id']}')
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
                      _walletActions('${row['id']}')
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

  Widget _walletActions(String key) => SizedBox(
      width: 360,
      child: Wrap(
          spacing: 8,
          runSpacing: 8,
          alignment: WrapAlignment.end,
          children: [
            _action('Cobrar no WhatsApp',
                () => _message('Mensagem de cobrança preparada.')),
            _action('Marcar recebido',
                () => _operation(ProModule.wallet, key, {'action': 'received'}),
                green: true),
            _action(
                'Valor a receber', () => _message('Valor pronto para ajuste.'),
                gold: true),
            _action('Bonificar',
                () => _operation(ProModule.wallet, key, {'action': 'bonify'}),
                gold: true),
            _action('Cancelar cobrança',
                () => _operation(ProModule.wallet, key, {'action': 'cancel'}),
                danger: true),
            _action('Corrigir valor', () => _message('Editor de valor aberto.'))
          ]));

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
    final today = List<Map<String, dynamic>>.from((_object['today'] as List?) ?? const []);
    final wallet = List<Map<String, dynamic>>.from((_object['wallet'] as List?) ?? const []);
    return _surface('Central WhatsApp do dia', 'Mensagens prontas para confirmar, reagendar e cobrar, usando os dados reais da agenda.', [
      _filterBar(['Hoje', 'Confirmações', 'Atrasos', 'Cobranças']),
      if (today.isEmpty && wallet.isEmpty) const Padding(padding: EdgeInsets.all(16), child: Text('Nenhuma ação de WhatsApp pendente hoje.', style: TextStyle(color: ZenColors.muted))),
      ...today.map((row) => _whatsappRow(row, false)),
      ...wallet.map((row) => _whatsappRow(row, true)),
    ]);
  }

  Widget _whatsappRow(Map<String, dynamic> row, bool charge) => Container(margin: const EdgeInsets.only(top: 10), padding: const EdgeInsets.all(14), decoration: _inset(), child: LayoutBuilder(builder: (context, box) => box.maxWidth > 630 ? Row(children: [Expanded(child: _walletText('${charge ? 'Cobrança' : row['time'] ?? '--:--'} • ${row['client_name'] ?? 'Cliente'}', '${row['services']?['name'] ?? 'Serviço'} • ${row['barbers']?['name'] ?? ''} • ${row['client_phone'] ?? 'sem telefone'}', '')), const SizedBox(width: 10), Wrap(spacing: 7, runSpacing: 7, children: [_action(charge ? 'Cobrar' : 'Confirmar', () => _copyWhats(row, charge ? 'charge' : 'confirm'), green: true), _action('Reagendar', () => _copyWhats(row, 'reschedule')), _action('Copiar', () => _copyWhats(row, charge ? 'charge' : 'confirm'))])]) : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [_walletText('${charge ? 'Cobrança' : row['time'] ?? '--:--'} • ${row['client_name'] ?? 'Cliente'}', '${row['services']?['name'] ?? 'Serviço'} • ${row['client_phone'] ?? 'sem telefone'}', ''), const SizedBox(height: 10), Wrap(spacing: 7, runSpacing: 7, children: [_action(charge ? 'Cobrar' : 'Confirmar', () => _copyWhats(row, charge ? 'charge' : 'confirm'), green: true), _action('Reagendar', () => _copyWhats(row, 'reschedule')), _action('Copiar', () => _copyWhats(row, charge ? 'charge' : 'confirm'))])])));

  Future<void> _copyWhats(Map<String, dynamic> row, String type) async {
    final name = '${row['client_name'] ?? 'cliente'}'.split(' ').first;
    final shop = '${row['barbers']?['shop_name'] ?? 'barbearia'}';
    final time = '${row['time'] ?? ''}';
    final service = '${row['services']?['name'] ?? 'serviço'}';
    final message = switch (type) {
      'charge' => 'Olá $name, tudo bem? Passando para lembrar do valor de ${_money(row['received_amount'] ?? row['services']?['price'])} referente ao $service na $shop.',
      'reschedule' => 'Olá $name, tudo bem? Precisamos ajustar seu horário na $shop. Me chama por aqui para remarcarmos o melhor horário.',
      _ => 'Olá $name, tudo bem? Passando para confirmar seu horário na $shop hoje às $time. Posso confirmar?',
    };
    await Clipboard.setData(ClipboardData(text: message));
    if (mounted) _message('Mensagem copiada. Abra o WhatsApp e envie para o cliente.');
  }

  Widget _pending() => _surface(
          'Atendimentos pendentes de baixa',
          'Confirme o que aconteceu com cada horário passado antes de fechar o dia.',
          [
            _filterBar(['Hoje', 'Últimos 7 dias', 'Todos os pendentes']),
            if (_rows.isEmpty)
              const Padding(
                  padding: EdgeInsets.all(16),
                  child: Text('Nenhum atendimento pendente de baixa.',
                      style: TextStyle(color: ZenColors.muted)))
            else
              ..._rows.map(_pendingRow),
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
        _metric('Clientes em risco', '${risk.length}', const Color(0xfff3ad46)),
        _metric('Recuperados', '${_object['recovered'] ?? 0}', ZenColors.green),
        _metric(
            'Taxa de retorno', '${_object['returnRate'] ?? 0}%', ZenColors.sky),
        _metric('Índice ZEN', '${_object['zenIndex'] ?? 10}',
            const Color(0xffee705c))
      ]),
      const SizedBox(height: 16),
      _surface('Clientes para recuperar',
          'Clientes que concluíram atendimento e ainda não retornaram.', [
        if (risk.isEmpty)
          const Padding(
              padding: EdgeInsets.all(16),
              child: Text('Nenhum cliente em risco no momento.',
                  style: TextStyle(color: ZenColors.muted)))
        else
          ...risk.map((row) => _command(
              '${row['client_name'] ?? 'Cliente'}',
              'Último atendimento há ${row['daysAway'] ?? 0} dias • ${row['services']?['name'] ?? 'Serviço'} • ${row['barbers']?['name'] ?? ''}',
              ['Chamar no WhatsApp', 'Marcar recuperado'])),
      ]),
    ]);
  }

  Widget _reports() {
    final ordered = [..._rows]..sort((a, b) => ((b['gross'] as num?) ?? 0).compareTo((a['gross'] as num?) ?? 0));
    final gross = ordered.fold<num>(0, (sum, row) => sum + ((row['gross'] as num?) ?? 0));
    final commissions = ordered.fold<num>(0, (sum, row) => sum + ((row['commission'] as num?) ?? 0));
    return Column(children: [
      _surface('Ranking de barbeiros', 'Faturamento, atendimentos e comissão do mês selecionado.', [
        if (ordered.isEmpty) const Padding(padding: EdgeInsets.all(16), child: Text('Ainda não há resultados no período.', style: TextStyle(color: ZenColors.muted))) else ...ordered.take(5).toList().asMap().entries.map((entry) => _rankingRow('#${entry.key + 1}', '${entry.value['name'] ?? 'Barbeiro'}', '${entry.value['appointments'] ?? 0} atendimento(s)', _money(entry.value['gross']), entry.key == 0 ? const Color(0xffe4bd52) : ZenColors.muted)),
      ]),
      const SizedBox(height: 16),
      _surface('Resumo financeiro', 'Resultados consolidados da operação no mês atual.', [
        Wrap(spacing: 20, runSpacing: 16, children: [_miniValue('Faturamento', _money(gross)), _miniValue('Comissão', _money(commissions)), _miniValue('Lucro', _money(gross - commissions))]),
      ]),
    ]);
  }

  Widget _cash() => _surface('Controle de caixa',
          'Acompanhe entradas, saídas e o saldo do período.', [
        Wrap(spacing: 12, runSpacing: 12, children: [
          _metric('Entradas', _money(_object['entries']), ZenColors.green),
          _metric('Saídas', _money(_object['commissions']),
              const Color(0xffed7268)),
          _metric('Saldo', _money(_object['balance']), ZenColors.sky)
        ]),
        const SizedBox(height: 15),
        ...List<Map<String,dynamic>>.from((_object['manual'] as List?)??const[]).map((entry)=>_command('${entry['type']=='entrada'?'Entrada':'Saída'} • ${entry['description']??''}','${entry['entry_date']??''} • ${_money(entry['amount'])}',['Ver lançamento'])),
        const SizedBox(height: 12),
        Align(
            alignment: Alignment.centerRight,
            child: _action('Adicionar lançamento',_createCashDialog,
                green: true)),
      ]);

  Future<void> _createCashDialog()async{final description=TextEditingController();final amount=TextEditingController();var type='entrada';final data=await showDialog<Map<String,String>>(context:context,builder:(context)=>AlertDialog(title:const Text('Lançamento de caixa'),content:StatefulBuilder(builder:(context,setDialog)=>Column(mainAxisSize:MainAxisSize.min,children:[TextField(controller:description,decoration:const InputDecoration(labelText:'Descrição')),const SizedBox(height:10),TextField(controller:amount,keyboardType:TextInputType.number,decoration:const InputDecoration(labelText:'Valor')),const SizedBox(height:10),DropdownButtonFormField<String>(initialValue:type,items:const[DropdownMenuItem(value:'entrada',child:Text('Entrada')),DropdownMenuItem(value:'saida',child:Text('Saída'))],onChanged:(value)=>setDialog(()=>type=value??type),decoration:const InputDecoration(labelText:'Tipo'))])),actions:[TextButton(onPressed:()=>Navigator.pop(context),child:const Text('Cancelar')),FilledButton(onPressed:()=>Navigator.pop(context,{'description':description.text.trim(),'amount':amount.text.trim(),'type':type}),child:const Text('Salvar'))]));description.dispose();amount.dispose();if(data==null||data['description']!.isEmpty)return;final ok=await widget.viewModel.createCashEntry({'description':data['description'],'amount':double.tryParse(data['amount']??'')??0,'type':data['type']});if(mounted)_message(ok?'Lançamento registrado.':'Não foi possível registrar o lançamento.');}

  Widget _profile() => _surface('Perfil da barbearia', 'Informações do profissional autenticado e sua identidade no painel.', [
        _currentField('name', 'Responsável', '${_object['name'] ?? ''}'),
        _currentField('phone', 'WhatsApp', '${_object['phone'] ?? ''}'),
        _currentField('photoUrl', 'URL da foto', '${_object['photo_url'] ?? ''}'),
        _currentField('backgroundUrl', 'URL do fundo público', '${_object['background_url'] ?? ''}'),
        const SizedBox(height: 4),
        Text('Login público: ${_object['login'] ?? ''} • Barbearia: ${_object['shop_name'] ?? ''}', style: const TextStyle(color: ZenColors.muted, fontSize: 12)),
        const SizedBox(height: 12),
        Align(alignment: Alignment.centerRight, child: _action('Salvar configurações', () => _saveCurrent(ProModule.profile), green: true)),
      ]);

  Widget _hours() => _surface('Funcionamento inteligente', 'Defina expediente, pausa e dias fechados; a agenda respeita cada configuração.', [
        LayoutBuilder(builder: (context, box) => Wrap(spacing: 12, runSpacing: 12, children: [SizedBox(width: box.maxWidth > 600 ? 220 : double.infinity, child: _currentField('workStart', 'Início do expediente', '${_object['work_start'] ?? '09:00'}', time: true)), SizedBox(width: box.maxWidth > 600 ? 220 : double.infinity, child: _currentField('workEnd', 'Fim do expediente', '${_object['work_end'] ?? '19:00'}', time: true)), SizedBox(width: box.maxWidth > 600 ? 220 : double.infinity, child: _currentField('breakStart', 'Início da pausa', '${_object['break_start'] ?? ''}', time: true)), SizedBox(width: box.maxWidth > 600 ? 220 : double.infinity, child: _currentField('breakEnd', 'Fim da pausa', '${_object['break_end'] ?? ''}', time: true))])),
        const SizedBox(height: 12),
        _currentField('offDays', 'Dias fechados (0=domingo, 6=sábado; separe por vírgula)', '${_object['off_days'] ?? ''}'),
        const SizedBox(height: 12),
        Align(alignment: Alignment.centerRight, child: _action('Salvar funcionamento', () => _saveCurrent(ProModule.hours), green: true)),
      ]);

  Widget _currentField(String key, String label, String initial, {bool time = false}) => Padding(padding: const EdgeInsets.only(bottom: 10), child: TextFormField(initialValue: _currentInputs[key] ?? initial, keyboardType: time ? TextInputType.datetime : TextInputType.text, onChanged: (value) => _currentInputs[key] = value, decoration: InputDecoration(labelText: label, hintText: time ? 'HH:MM' : null)));

  Future<void> _saveCurrent(ProModule module) async {
    final allowed = module == ProModule.profile ? ['name', 'phone', 'photoUrl', 'backgroundUrl'] : ['workStart', 'workEnd', 'breakStart', 'breakEnd', 'offDays'];
    final body = <String, dynamic>{for (final key in allowed) if (_currentInputs.containsKey(key)) key: _currentInputs[key]};
    if (body.isEmpty) { _message('Altere algum campo antes de salvar.'); return; }
    final ok = await widget.viewModel.saveCurrent(module, body);
    if (mounted) _message(ok ? 'Configurações salvas.' : 'Não foi possível salvar as configurações.');
  }

  Widget _support() => _surface('Como podemos ajudar?',
          'Envie sua dúvida para o suporte ou acesse respostas rápidas.', [
        _command(
            'Falar com suporte',
            'Nossa equipe responde pelo WhatsApp em horário comercial.',
            ['Abrir WhatsApp']),
        _command(
            'Central de ajuda',
            'Dúvidas sobre agenda, carteira, clientes e configurações.',
            ['Abrir ajuda']),
        _command(
            'Status da conta', 'Plano ZenBarber Pro ativo.', ['Ver detalhes']),
      ]);

  Widget _units() => _surface('Unidades cadastradas', 'Solicitações e unidades vinculadas a esta barbearia.', [
        if (_rows.isEmpty) const Padding(padding: EdgeInsets.all(16), child: Text('Nenhuma unidade adicional cadastrada.', style: TextStyle(color: ZenColors.muted))) else ..._rows.map((row) => _command('${row['unit_name'] ?? 'Unidade'}', '${row['city'] ?? ''}/${row['state'] ?? ''} • status: ${row['status'] ?? 'pendente'}', ['Selecionar'])),
        const SizedBox(height: 10),
        Align(alignment: Alignment.centerRight, child: _action('Adicionar unidade', _createUnitDialog, green: true)),
      ]);

  Future<void> _createUnitDialog() async {
    final name = TextEditingController();
    final city = TextEditingController();
    final state = TextEditingController();
    final amount = TextEditingController(text: '1');
    final value = await showDialog<Map<String, String>>(context: context, builder: (context) => AlertDialog(title: const Text('Nova unidade'), content: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [TextField(controller: name, decoration: const InputDecoration(labelText: 'Nome da unidade')), const SizedBox(height: 10), TextField(controller: city, decoration: const InputDecoration(labelText: 'Cidade')), const SizedBox(height: 10), TextField(controller: state, decoration: const InputDecoration(labelText: 'UF')), const SizedBox(height: 10), TextField(controller: amount, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Quantidade de barbeiros'))])), actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')), FilledButton(onPressed: () => Navigator.pop(context, {'name': name.text.trim(), 'city': city.text.trim(), 'state': state.text.trim(), 'amount': amount.text.trim()}), child: const Text('Solicitar'))]));
    name.dispose(); city.dispose(); state.dispose(); amount.dispose();
    if (value == null || (value['name'] ?? '').isEmpty) return;
    final ok = await widget.viewModel.createUnit({'unitName': value['name'], 'city': value['city'], 'state': value['state'], 'barberCount': int.tryParse(value['amount'] ?? '') ?? 1});
    if (mounted) _message(ok ? 'Solicitação de unidade enviada.' : 'Não foi possível criar a solicitação.');
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
                  onPressed: () => _message('Filtro $item aplicado.'),
                  child: Text(item)))
              .toList()));

  Widget _command(String heading, String subheading, List<String> actions) =>
      Container(
          margin: const EdgeInsets.only(top: 10),
          padding: const EdgeInsets.all(14),
          decoration: _inset(),
          child: LayoutBuilder(
              builder: (context, box) => box.maxWidth > 620
                  ? Row(children: [
                      Expanded(child: _walletText(heading, subheading, '')),
                      const SizedBox(width: 10),
                      Wrap(
                          spacing: 7,
                          runSpacing: 7,
                          alignment: WrapAlignment.end,
                          children: actions
                              .map((label) => _action(
                                  label, () => _complete('$heading:$label'),
                                  green: label.contains('Confirmar') ||
                                      label.contains('baixa') ||
                                      label.contains('recebido') ||
                                      label.contains('recuperado')))
                              .toList())
                    ])
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                          _walletText(heading, subheading, ''),
                          const SizedBox(height: 10),
                          Wrap(
                              spacing: 7,
                              runSpacing: 7,
                              children: actions
                                  .map((label) => _action(label,
                                      () => _complete('$heading:$label')))
                                  .toList())
                        ])));

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

  void _complete(String id) {
    setState(() => _completed.add(id));
    _message('Ação registrada com sucesso.');
  }
}

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
