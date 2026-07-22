import 'package:flutter/material.dart';

import '../core/theme/zen_colors.dart';
import '../core/widgets/zen_card.dart';

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
  const ProModuleScreen({super.key, required this.module});

  final ProModule module;

  @override
  State<ProModuleScreen> createState() => _ProModuleScreenState();
}

class _ProModuleScreenState extends State<ProModuleScreen> {
  final Set<String> _completed = {};

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

  Widget _wallet() => Column(children: [
        _surface(
          'Valores pendentes',
          'Use Bonificar quando decidir isentar uma cobrança. Cancele cobranças erradas sem somar no faturamento.',
          [
            _walletRow(
                'Parcela 1/3 assinatura • R\$ 300,00 • Vitor Santos',
                'Chulé • parcela mensal • vencimento/lembrete: 30/06',
                'R\$ 300,00'),
            _walletRow('Valor a receber • Renan Padovan',
                'Corte + barba • lançamento manual', 'R\$ 75,00'),
          ],
        ),
      ]);

  Widget _walletRow(String name, String detail, String amount) => Container(
        margin: const EdgeInsets.only(top: 14),
        padding: const EdgeInsets.all(17),
        decoration: _inset(),
        child: LayoutBuilder(
          builder: (context, box) => box.maxWidth > 740
              ? Row(children: [
                  Expanded(child: _walletText(name, detail, amount)),
                  const SizedBox(width: 16),
                  _walletActions(name)
                ])
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                      _walletText(name, detail, amount),
                      const SizedBox(height: 13),
                      _walletActions(name)
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
            _action('Marcar recebido', () => _complete(key), green: true),
            _action(
                'Valor a receber', () => _message('Valor pronto para ajuste.'),
                gold: true),
            _action('Bonificar', () => _complete(key), gold: true),
            _action('Cancelar cobrança', () => _complete(key), danger: true),
            _action('Corrigir valor', () => _message('Editor de valor aberto.'))
          ]));

  Widget _whatsapp() => _surface(
          'Central WhatsApp do dia',
          'Ações rápidas para os clientes com atendimento ou cobrança em aberto.',
          [
            _filterBar(['Hoje', 'Confirmações', 'Atrasos', 'Cobranças']),
            _command(
                '09:30 • Nicolas H',
                'Corte • Renan Padovan • aguardando confirmação',
                ['Confirmar', 'Reagendar', 'Atraso', 'Copiar']),
            _command(
                'Cobrança • Vitor Santos',
                'Assinatura mensal • R\$ 300,00 pendente',
                ['Cobrar', 'Copiar', 'Marcar recebido']),
            _command('Cliente ausente • Carol Brava', 'Último corte há 57 dias',
                ['Chamar', 'Copiar']),
          ]);

  Widget _pending() => _surface(
          'Atendimentos pendentes de baixa',
          'Confirme o que aconteceu com cada horário passado antes de fechar o dia.',
          [
            _filterBar(['Hoje', 'Últimos 7 dias', 'Todos os pendentes']),
            _command(
                '15:00 • Cliente de teste',
                'Corte • R\$ 45,00 • horário passou sem baixa',
                ['Dar baixa', 'Valor', 'Carteira', 'Faltou']),
            _command(
                '17:30 • Cliente encaixe',
                'Barba • R\$ 35,00 • aguardando decisão',
                ['Dar baixa', 'Carteira', 'Faltou']),
          ]);

  Widget _commissions() => Column(children: [
        Wrap(spacing: 12, runSpacing: 12, children: [
          _metric('Faturamento bruto', 'R\$ 4.217,91', ZenColors.green),
          _metric('Total comissão', 'R\$ 688,00', const Color(0xfff1be47)),
          _metric('Lucro líquido', 'R\$ 3.529,91', const Color(0xff7ae1ac)),
          _metric('Barbeiros', '3', ZenColors.sky),
        ]),
        const SizedBox(height: 16),
        _surface(
            'Editar comissão dos barbeiros',
            'Defina a porcentagem paga para cada barbeiro. O financeiro desconta esse valor automaticamente.',
            [
              _commission('Vitor Santos',
                  '31 atendimento(s) concluído(s) • Bruto: R\$ 3.071,24', '0'),
              _commission('Renan Padovan',
                  '15 atendimento(s) concluído(s) • Bruto: R\$ 1.146,67', '60'),
              _commission('Barbeiro novo',
                  '0 atendimento(s) concluído(s) • Bruto: R\$ 0,00', '0'),
            ]),
      ]);

  Widget _retention() => Column(children: [
        Wrap(spacing: 12, runSpacing: 12, children: [
          _metric('Clientes em risco', '2', const Color(0xfff3ad46)),
          _metric('Recuperados', '0', ZenColors.green),
          _metric('Taxa de retorno', '0%', ZenColors.sky),
          _metric('Índice ZEN', '7 • Crítico', const Color(0xffee705c))
        ]),
        const SizedBox(height: 16),
        _surface('Clientes para recuperar',
            'Clientes que concluíram atendimento e ainda não retornaram.', [
          _command(
              'Luara',
              'Último corte há 60 dias • Alisamento • Vitor Santos',
              ['Chamar no WhatsApp', 'Marcar recuperado']),
          _command(
              'Nicolas H',
              'Último corte há 60 dias • Corte • Renan Padovan',
              ['Chamar no WhatsApp', 'Marcar recuperado']),
          _command('Carol Brava', 'Último corte há 57 dias • Pontas e escova',
              ['Chamar no WhatsApp', 'Marcar recuperado']),
        ]),
      ]);

  Widget _reports() => Column(children: [
        _surface('Ranking de barbeiros',
            'Faturamento, atendimentos e comissão do mês selecionado.', [
          _rankingRow('#1', 'Vitor Santos', '31 atendimento(s)', 'R\$ 3.071,24',
              const Color(0xffe4bd52)),
          _rankingRow('#2', 'Renan Padovan', '15 atendimento(s)',
              'R\$ 1.146,67', ZenColors.muted),
          _rankingRow('#3', 'Barbeiro novo', '0 atendimento(s)', 'R\$ 0,00',
              const Color(0xffbd784f)),
        ]),
        const SizedBox(height: 16),
        _surface('Resumo financeiro',
            'Selecione o período para comparar os resultados da barbearia.', [
          _filterBar(['Julho/2026', 'Mensal', 'Exportar relatório']),
          Wrap(spacing: 20, runSpacing: 16, children: [
            _miniValue('Faturamento', 'R\$ 4.217,91'),
            _miniValue('Comissão', 'R\$ 688,00'),
            _miniValue('Lucro', 'R\$ 3.529,91')
          ]),
        ]),
      ]);

  Widget _cash() => _surface('Controle de caixa',
          'Acompanhe entradas, saídas e o saldo do período.', [
        Wrap(spacing: 12, runSpacing: 12, children: [
          _metric('Entradas', 'R\$ 4.217,91', ZenColors.green),
          _metric('Saídas', 'R\$ 688,00', const Color(0xffed7268)),
          _metric('Saldo', 'R\$ 3.529,91', ZenColors.sky)
        ]),
        const SizedBox(height: 15),
        _command('Recebimento • Corte', 'Hoje, 10:20 • Renan Padovan',
            ['Ver lançamento']),
        _command('Comissão • Renan Padovan', 'A pagar no fechamento mensal',
            ['Ver lançamento']),
        const SizedBox(height: 12),
        Align(
            alignment: Alignment.centerRight,
            child: _action('Adicionar lançamento',
                () => _message('Novo lançamento financeiro aberto.'),
                green: true)),
      ]);

  Widget _profile() => _surface(
          'Perfil da barbearia',
          'Essas informações aparecem no painel e no link público do cliente.',
          [
            const _ReadOnlyField(
                label: 'Nome da barbearia', value: "Vitu's Barber"),
            const _ReadOnlyField(label: 'Responsável', value: 'Renan Padovan'),
            const _ReadOnlyField(label: 'WhatsApp', value: '(14) 99634-8162'),
            const _ReadOnlyField(label: 'Login público', value: 'renan'),
            Align(
                alignment: Alignment.centerRight,
                child: _action('Salvar configurações',
                    () => _message('Configurações salvas.'),
                    green: true)),
          ]);

  Widget _hours() => _surface(
          'Funcionamento inteligente',
          'Defina horários, pausas e dias fechados; a agenda respeita cada configuração.',
          [
            ...[
              'Segunda-feira',
              'Terça-feira',
              'Quarta-feira',
              'Quinta-feira',
              'Sexta-feira',
              'Sábado'
            ].map((day) => _dayRow(day)),
            _dayRow('Domingo', closed: true),
            const SizedBox(height: 8),
            Align(
                alignment: Alignment.centerRight,
                child: _action('Salvar funcionamento',
                    () => _message('Horários atualizados.'),
                    green: true)),
          ]);

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

  Widget _units() => _surface('Unidades cadastradas',
          'Escolha a unidade ativa ou gerencie dados de cada operação.', [
        _command(
            'Matriz', 'Unidade principal • ativa', ['Gerenciar', 'Selecionar']),
        _command('Unidade CT treinamentos', 'Unidade adicional • ativa',
            ['Gerenciar', 'Selecionar']),
        const SizedBox(height: 10),
        Align(
            alignment: Alignment.centerRight,
            child: _action('Adicionar unidade',
                () => _message('Cadastro de unidade aberto.'),
                green: true)),
      ]);

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

  Widget _commission(String name, String detail, String value) => Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.all(16),
      decoration: _inset(),
      child: LayoutBuilder(
          builder: (context, box) => box.maxWidth > 650
              ? Row(children: [
                  Expanded(
                      child:
                          _walletText(name, detail, 'Comissão atual: $value%')),
                  SizedBox(
                      width: 126,
                      child: TextFormField(
                          initialValue: value,
                          keyboardType: TextInputType.number,
                          textAlign: TextAlign.center,
                          decoration: const InputDecoration(suffixText: '%'))),
                  const SizedBox(width: 10),
                  _action('Salvar', () => _message('Comissão de $name salva.'),
                      green: true)
                ])
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                      _walletText(name, detail, 'Comissão atual: $value%'),
                      const SizedBox(height: 12),
                      TextFormField(
                          initialValue: value,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(suffixText: '%')),
                      const SizedBox(height: 9),
                      _action(
                          'Salvar', () => _message('Comissão de $name salva.'),
                          green: true)
                    ])));

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
