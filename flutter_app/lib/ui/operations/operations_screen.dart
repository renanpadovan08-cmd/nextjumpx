import 'package:flutter/material.dart';
import '../core/theme/zen_colors.dart';
import '../core/widgets/zen_card.dart';
import '../core/widgets/zen_page.dart';
import '../features/view_models/feature_view_models.dart';

class OperationsScreen extends StatefulWidget {
  const OperationsScreen({
    super.key,
    required this.viewModel,
    this.canManage = true,
  });
  final OperationsViewModel viewModel;
  final bool canManage;
  @override
  State<OperationsScreen> createState() => _OperationsScreenState();
}

class _OperationsScreenState extends State<OperationsScreen> {
  int tab = 0;
  @override
  void initState() {
    super.initState();
    widget.viewModel
      ..addListener(_refresh)
      ..load(tab);
  }

  @override
  void dispose() {
    widget.viewModel.removeListener(_refresh);
    super.dispose();
  }

  void _refresh() {
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext c) {
    final data = widget.viewModel.data;
    final title = ['Meu negócio', 'Multiunidade', 'Relatórios'][tab];
    final items = <Widget>[
      if (widget.viewModel.error != null)
        ZenCard(child: Text(widget.viewModel.error!))
    ];
    if (tab == 0) {
      for (final barber in (data?['barbers'] as List? ?? const [])) {
        final goal = _goalFor('${barber['id']}');
        items.add(Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: ZenCard(
                child: ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.flag, color: ZenColors.green),
                    title: Text('${barber['name']}',
                        style: const TextStyle(fontWeight: FontWeight.w900)),
                    subtitle: Text(
                        'Meta financeira: R\$ ${((goal?['financial_goal'] as num?) ?? 0).toStringAsFixed(2)} • Meta de atendimentos: ${goal?['attendance_goal'] ?? 0}',
                        style: const TextStyle(color: ZenColors.muted)),
                    trailing: IconButton(
                      onPressed: () => _editGoal(barber, goal),
                      icon: const Icon(Icons.edit_outlined),
                      tooltip: 'Editar metas',
                    )))));
      }
    } else if (tab == 1) {
      for (final unit in (data as List? ?? const [])) {
        items.add(Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: ZenCard(
                child: ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.storefront, color: ZenColors.sky),
                    title: Text('${unit['unit_name']}',
                        style: const TextStyle(fontWeight: FontWeight.w900)),
                    subtitle: Text('${unit['city']}/${unit['state']}'),
                    trailing: ZenStatusPill(
                        label: '${unit['status']}', color: ZenColors.gold)))));
      }
    } else {
      items.add(Wrap(spacing: 12, runSpacing: 12, children: [
        ZenMetricCard(
            icon: Icons.payments,
            label: 'Faturamento',
            value:
                'R\$ ${((data?['revenue'] as num?) ?? 0).toStringAsFixed(2)}'),
        ZenMetricCard(
            icon: Icons.calendar_month,
            label: 'Agendamentos',
            value: '${data?['appointments'] ?? 0}',
            color: ZenColors.sky),
        ZenMetricCard(
            icon: Icons.check_circle,
            label: 'Finalizados',
            value: '${data?['completed'] ?? 0}',
            color: ZenColors.jade)
      ]));
    }
    return Column(children: [
      Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
          child: SegmentedButton<int>(
              segments: [
                const ButtonSegment(value: 0, label: Text('Negócio')),
                if (widget.canManage)
                  const ButtonSegment(value: 1, label: Text('Unidades')),
                const ButtonSegment(value: 2, label: Text('Relatórios'))
              ],
              selected: {
                tab
              },
              onSelectionChanged: (v) {
                setState(() => tab = v.first);
                widget.viewModel.load(tab);
              })),
      Expanded(
          child: widget.viewModel.loading
              ? const Center(child: CircularProgressIndicator())
              : ZenPage(title: title, children: items))
    ]);
  }

  Map<String, dynamic>? _goalFor(String barberId) {
    final data = widget.viewModel.data;
    if (data is! Map) return null;
    for (final raw in (data['goals'] as List? ?? const [])) {
      final goal = Map<String, dynamic>.from(raw as Map);
      if ('${goal['barber_id']}' == barberId) return goal;
    }
    return null;
  }

  Future<void> _editGoal(dynamic barber, Map<String, dynamic>? current) async {
    final financial =
        TextEditingController(text: '${current?['financial_goal'] ?? 0}');
    final attendance =
        TextEditingController(text: '${current?['attendance_goal'] ?? 0}');
    final values = await showDialog<Map<String, String>>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Metas de ${barber['name']}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: financial,
              keyboardType: TextInputType.number,
              decoration:
                  const InputDecoration(labelText: 'Meta financeira mensal'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: attendance,
              keyboardType: TextInputType.number,
              decoration:
                  const InputDecoration(labelText: 'Meta de atendimentos'),
            ),
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancelar')),
          FilledButton(
              onPressed: () => Navigator.pop(context, {
                    'financial': financial.text.trim(),
                    'attendance': attendance.text.trim(),
                  }),
              child: const Text('Salvar')),
        ],
      ),
    );
    financial.dispose();
    attendance.dispose();
    if (values == null) return;
    final data = widget.viewModel.data as Map?;
    final ok = await widget.viewModel.saveGoal({
      'barberId': '${barber['id']}',
      'monthKey':
          '${data?['month'] ?? DateTime.now().toIso8601String().substring(0, 7)}',
      'financialGoal': double.tryParse(values['financial'] ?? '') ?? 0,
      'attendanceGoal': int.tryParse(values['attendance'] ?? '') ?? 0,
    });
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(ok ? 'Metas salvas.' : 'Não foi possível salvar metas.'),
      ));
    }
  }
}
