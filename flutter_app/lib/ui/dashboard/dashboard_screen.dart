import 'package:flutter/material.dart';

import '../core/theme/zen_colors.dart';
import '../core/widgets/zen_card.dart';
import 'view_models/dashboard_view_model.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({
    super.key,
    required this.viewModel,
    required this.userName,
    required this.canManage,
    required this.onNavigate,
  });
  final DashboardViewModel viewModel;
  final String userName;
  final bool canManage;
  final ValueChanged<int> onNavigate;

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
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

  String money(num value) =>
      'R\$ ${value.toStringAsFixed(2).replaceAll('.', ',')}';

  String _greeting() {
    final brasiliaTime =
        DateTime.now().toUtc().subtract(const Duration(hours: 3));
    final hour = brasiliaTime.hour;
    if (hour >= 18) return 'Boa noite';
    if (hour >= 12) return 'Boa tarde';
    return 'Bom dia';
  }

  String get _heroTitle {
    final name = widget.userName.trim();
    final displayName = name.isEmpty ? 'Renan' : name;
    return '${_greeting()}, $displayName';
  }

  @override
  Widget build(BuildContext context) {
    final data = widget.viewModel.data;
    return RefreshIndicator(
      onRefresh: widget.viewModel.load,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(32, 26, 32, 90),
        children: [
          if (widget.viewModel.error != null)
            Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: _notice(widget.viewModel.error!)),
          _hero(),
          const SizedBox(height: 18),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              _metric('Faturamento hoje', money(data?.todayRevenue ?? 0),
                  'concluído no dia', Icons.payments_outlined, ZenColors.green),
              _metric(
                  'Recorrência prevista',
                  money(data?.walletAmount ?? 0),
                  '${data?.walletCount ?? 0} cobrança(s) em carteira',
                  Icons.repeat_rounded,
                  const Color(0xfff5bf42)),
              _metric(
                  'Agenda de hoje',
                  '${data?.todayAppointments ?? 0}',
                  '${data?.todayCompleted ?? 0} concluído(s)',
                  Icons.calendar_month_outlined,
                  ZenColors.sky),
              _metric(
                  'Clientes em risco',
                  '${data?.risk ?? 0}',
                  'oportunidades de retorno',
                  Icons.track_changes_rounded,
                  const Color(0xfff09c4d)),
            ],
          ),
          const SizedBox(height: 18),
          _financialSummary(data),
          const SizedBox(height: 18),
          LayoutBuilder(
            builder: (context, box) => box.maxWidth > 840
                ? Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Expanded(flex: 3, child: _recommendedActions(data)),
                    const SizedBox(width: 16),
                    Expanded(flex: 2, child: _retention(data))
                  ])
                : Column(children: [
                    _recommendedActions(data),
                    const SizedBox(height: 16),
                    _retention(data)
                  ]),
          ),
          const SizedBox(height: 18),
          _ranking(data?.byBarber ?? const []),
        ],
      ),
    );
  }

  Widget _hero() => Container(
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xff0c3c25), Color(0xff061711)]),
          border: Border.all(color: const Color(0xff178743)),
          borderRadius: BorderRadius.circular(25),
          boxShadow: [
            BoxShadow(
                color: ZenColors.green.withValues(alpha: .08), blurRadius: 30)
          ],
        ),
        child: LayoutBuilder(
          builder: (context, constraints) => constraints.maxWidth > 660
              ? Row(children: [
                  Expanded(child: _heroText()),
                  const SizedBox(width: 24),
                  _nextAppointment()
                ])
              : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  _heroText(),
                  const SizedBox(height: 18),
                  _nextAppointment()
                ]),
        ),
      );

  Widget _heroText() =>
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('ZENBARBER PRO • OPERAÇÃO AO VIVO',
            style: TextStyle(
                color: Color(0xff47df79),
                fontSize: 11,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.05)),
        const SizedBox(height: 7),
        Row(
          children: [
            Flexible(
              child: Text(
                _heroTitle,
                style: const TextStyle(
                  fontSize: 27,
                  fontWeight: FontWeight.w900,
                  letterSpacing: -.7,
                ),
              ),
            ),
            const SizedBox(width: 8),
            const Icon(
              Icons.waving_hand_rounded,
              color: Color(0xffffc857),
              size: 25,
            ),
          ],
        ),
        const SizedBox(height: 7),
        const Text(
            'Painel executivo com agenda, dinheiro, WhatsApp e oportunidades de retorno em uma única tela.',
            style: TextStyle(color: Color(0xffb1c1d1), height: 1.35)),
        const SizedBox(height: 18),
        Wrap(spacing: 9, runSpacing: 9, children: [
          _quick('Abrir agenda', Icons.calendar_month_rounded, 1),
          if (widget.canManage) ...[
            _quick('Central WhatsApp', Icons.chat_bubble_outline_rounded, 5),
            _quick('Retenção', Icons.track_changes_rounded, 10),
          ],
        ]),
      ]);

  Widget _quick(String label, IconData icon, int destination) =>
      OutlinedButton.icon(
          onPressed: () => widget.onNavigate(destination),
          icon: Icon(icon, size: 17),
          label: Text(label),
          style: OutlinedButton.styleFrom(
              foregroundColor: const Color(0xffeaffef),
              side: const BorderSide(color: Color(0xff287447)),
              padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 12),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12))));

  Widget _nextAppointment() {
    final next = widget.viewModel.data?.nextAppointment;
    return Container(
      width: 220,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: const Color(0x8c071810),
          border: Border.all(color: const Color(0xff275039)),
          borderRadius: BorderRadius.circular(18)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('PRÓXIMO HORÁRIO',
            style: TextStyle(
                fontSize: 10,
                color: Color(0xff8fbba0),
                fontWeight: FontWeight.w900,
                letterSpacing: .8)),
        const SizedBox(height: 10),
        Text(next == null ? 'Livre' : '${next['time']}',
            style: const TextStyle(fontSize: 23, fontWeight: FontWeight.w900)),
        const SizedBox(height: 2),
        Text(
            next == null
                ? 'sem próximo atendimento'
                : '${next['client_name']} · ${next['services']?['name'] ?? 'Serviço'}',
            style: const TextStyle(color: Color(0xffaabbb1), fontSize: 12))
      ]),
    );
  }

  Widget _metric(String label, String value, String hint, IconData icon,
          Color color) =>
      SizedBox(
        width: 220,
        child: Container(
          padding: const EdgeInsets.all(17),
          decoration: BoxDecoration(
              color: const Color(0xff0b1522),
              border: Border.all(color: color.withValues(alpha: .36)),
              borderRadius: BorderRadius.circular(18)),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Icon(icon, size: 20, color: color),
            const SizedBox(height: 13),
            Text(label.toUpperCase(),
                style: const TextStyle(
                    color: Color(0xff9bacbf),
                    fontSize: 11,
                    fontWeight: FontWeight.w900)),
            const SizedBox(height: 6),
            Text(value,
                style:
                    const TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
            const SizedBox(height: 6),
            Text(hint,
                style: const TextStyle(color: ZenColors.muted, fontSize: 11))
          ]),
        ),
      );

  Widget _financialSummary(dynamic data) => ZenCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Resumo financeiro do mês',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
          const SizedBox(height: 5),
          const Text(
              'Visão premium da operação, com os principais indicadores atualizados.',
              style: TextStyle(color: ZenColors.muted)),
          const SizedBox(height: 18),
          LayoutBuilder(
            builder: (context, box) =>
                Wrap(spacing: 26, runSpacing: 18, children: [
              _value('Faturamento bruto', money(data?.revenue ?? 0),
                  ZenColors.green),
              _value('Comissões a pagar', money(data?.totalCommission ?? 0),
                  const Color(0xfff2be3f)),
              _value('Lucro da barbearia', money(data?.profit ?? 0),
                  const Color(0xff79e4ac)),
              _value(
                  'Atendimentos concluídos',
                  '${data?.completed ?? 0} de ${data?.appointments ?? 0}',
                  ZenColors.sky),
            ]),
          ),
          const SizedBox(height: 20),
          Container(
              height: 82,
              alignment: Alignment.bottomCenter,
              decoration: const BoxDecoration(
                  border: Border(bottom: BorderSide(color: Color(0xff1f3041)))),
              child: CustomPaint(
                  size: const Size(double.infinity, 82),
                  painter: _ChartPainter())),
        ]),
      );

  Widget _value(String label, String value, Color color) => SizedBox(
      width: 180,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label,
            style: const TextStyle(color: ZenColors.muted, fontSize: 12)),
        const SizedBox(height: 5),
        Text(value,
            style: TextStyle(
                color: color, fontSize: 20, fontWeight: FontWeight.w900))
      ]));

  Widget _recommendedActions(dynamic data) => ZenCard(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Row(children: [
          Expanded(
              child: Text('Ações recomendadas de hoje',
                  style: TextStyle(fontSize: 19, fontWeight: FontWeight.w900))),
          _CountPill('3 ações')
        ]),
        const SizedBox(height: 6),
        const Text('A home mostra o que precisa de atenção na operação.',
            style: TextStyle(color: ZenColors.muted)),
        const SizedBox(height: 15),
        _action(
            Icons.calendar_month_rounded,
            '${data?.todayAppointments ?? 0} atendimento(s) na agenda de hoje',
            'Use a agenda para aproveitar horários livres e aumentar o faturamento.',
            'Agenda',
            1),
        if (widget.canManage) ...[
          const Divider(color: Color(0xff1d2b3a)),
          _action(
              Icons.receipt_long_outlined,
              '${data?.pending ?? 0} agendamento(s) aguardando baixa',
              'Confirme pagamento, carteira ou falta de cada cliente.',
              'Abrir',
              7),
          const Divider(color: Color(0xff1d2b3a)),
          _action(
              Icons.chat_bubble_outline_rounded,
              'Central WhatsApp do dia',
              'Ações rápidas para confirmar, reagendar ou cobrar.',
              'WhatsApp',
              5),
        ],
      ]));

  Widget _action(IconData icon, String title, String body, String button,
          int destination) =>
      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
                color: ZenColors.green.withValues(alpha: .13),
                borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, color: ZenColors.green, size: 18)),
        const SizedBox(width: 10),
        Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w900)),
          const SizedBox(height: 3),
          Text(body,
              style: const TextStyle(
                  color: ZenColors.muted, fontSize: 12, height: 1.25))
        ])),
        const SizedBox(width: 8),
        TextButton(
            onPressed: () => widget.onNavigate(destination),
            child: Text(button))
      ]);

  Widget _retention(dynamic data) => ZenCard(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Retenção de clientes',
            style: TextStyle(fontSize: 19, fontWeight: FontWeight.w900)),
        const SizedBox(height: 6),
        const Text(
            'Controle de clientes em risco, recuperados e taxa de retorno.',
            style: TextStyle(color: ZenColors.muted, fontSize: 12)),
        const SizedBox(height: 18),
        Row(children: [
          _retentionMetric(
              'Em risco', '${data?.risk ?? 0}', const Color(0xfff5b446)),
          _retentionMetric(
              'Recuperados', '${data?.recovered ?? 0}', ZenColors.green)
        ]),
        const SizedBox(height: 15),
        const Text('ÍNDICE ZEN',
            style: TextStyle(
                color: ZenColors.muted,
                fontSize: 10,
                fontWeight: FontWeight.w900)),
        const SizedBox(height: 5),
        Text('${data?.zenIndex ?? 10} · Índice atual',
            style: const TextStyle(
                color: Color(0xfff2b65c),
                fontSize: 20,
                fontWeight: FontWeight.w900)),
        const SizedBox(height: 13),
        if (widget.canManage)
          SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                  onPressed: () => widget.onNavigate(10),
                  child: const Text('Abrir Retenção')))
      ]));

  Widget _retentionMetric(String label, String value, Color color) => Expanded(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label,
            style: const TextStyle(color: ZenColors.muted, fontSize: 11)),
        const SizedBox(height: 4),
        Text(value,
            style: TextStyle(
                color: color, fontWeight: FontWeight.w900, fontSize: 24))
      ]));

  Widget _ranking(List<Map<String, dynamic>> items) => ZenCard(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Row(children: [
          Expanded(
              child: Text('Ranking de barbeiros',
                  style: TextStyle(fontSize: 19, fontWeight: FontWeight.w900))),
          Text('Ver ranking completo',
              style: TextStyle(
                  color: ZenColors.green,
                  fontSize: 12,
                  fontWeight: FontWeight.w800))
        ]),
        const SizedBox(height: 5),
        const Text('Faturamento, atendimentos e comissão do mês selecionado.',
            style: TextStyle(color: ZenColors.muted)),
        const SizedBox(height: 12),
        if (items.isEmpty)
          const Text('Nenhum atendimento concluído neste mês.',
              style: TextStyle(color: ZenColors.muted))
        else
          ...items.take(4).toList().asMap().entries.map((entry) {
            final item = entry.value;
            return Container(
                margin: const EdgeInsets.only(top: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                    color: const Color(0xff09131e),
                    borderRadius: BorderRadius.circular(13)),
                child: Row(children: [
                  Container(
                      width: 30,
                      height: 30,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                          color: const Color(0xff173024),
                          borderRadius: BorderRadius.circular(9)),
                      child: Text('#${entry.key + 1}',
                          style: const TextStyle(
                              color: ZenColors.green,
                              fontSize: 11,
                              fontWeight: FontWeight.w900))),
                  const SizedBox(width: 11),
                  Expanded(
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                        Text('${item['name'] ?? 'Barbeiro'}',
                            style:
                                const TextStyle(fontWeight: FontWeight.w900)),
                        Text(
                            '${item['appointments'] ?? 0} atendimento(s) • Comissão ${item['commissionRate'] ?? 0}%',
                            style: const TextStyle(
                                color: ZenColors.muted, fontSize: 11))
                      ])),
                  Text(money((item['revenue'] as num?) ?? 0),
                      style: const TextStyle(
                          color: ZenColors.green, fontWeight: FontWeight.w900))
                ]));
          })
      ]));

  Widget _notice(String text) => Container(
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
          color: const Color(0xff3e1c1f),
          border: Border.all(color: const Color(0xff8b4145)),
          borderRadius: BorderRadius.circular(12)),
      child: Text(text));
}

class _CountPill extends StatelessWidget {
  const _CountPill(this.value);
  final String value;
  @override
  Widget build(BuildContext context) => Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
          color: ZenColors.green.withValues(alpha: .13),
          borderRadius: BorderRadius.circular(99)),
      child: Text(value,
          style: const TextStyle(
              color: ZenColors.green,
              fontSize: 11,
              fontWeight: FontWeight.w900)));
}

class _ChartPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final line = Paint()
      ..color = ZenColors.green
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5;
    final fill = Paint()
      ..color = ZenColors.green.withValues(alpha: .12)
      ..style = PaintingStyle.fill;
    final path = Path()
      ..moveTo(0, size.height * .72)
      ..cubicTo(size.width * .18, size.height * .60, size.width * .24,
          size.height * .85, size.width * .40, size.height * .52)
      ..cubicTo(size.width * .60, size.height * .18, size.width * .72,
          size.height * .74, size.width, size.height * .24)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();
    canvas.drawPath(path, fill);
    final curve = Path()
      ..moveTo(0, size.height * .72)
      ..cubicTo(size.width * .18, size.height * .60, size.width * .24,
          size.height * .85, size.width * .40, size.height * .52)
      ..cubicTo(size.width * .60, size.height * .18, size.width * .72,
          size.height * .74, size.width, size.height * .24);
    canvas.drawPath(curve, line);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
