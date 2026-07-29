import 'package:flutter/material.dart';

import '../../core/date_format.dart';
import '../../data/model/auth_user_dto.dart';
import '../barbers/view_models/barbers_view_model.dart';
import '../core/theme/zen_colors.dart';
import '../core/widgets/zen_card.dart';
import '../core/widgets/zen_page.dart';
import '../features/view_models/feature_view_models.dart';

class FixedClientsScreen extends StatefulWidget {
  const FixedClientsScreen(
      {super.key,
      required this.viewModel,
      required this.user,
      required this.barbers});

  final FixedClientsViewModel viewModel;
  final AuthUserDto user;
  final BarbersViewModel barbers;

  @override
  State<FixedClientsScreen> createState() => _FixedClientsScreenState();
}

class _FixedClientsScreenState extends State<FixedClientsScreen> {
  @override
  void initState() {
    super.initState();
    widget.viewModel
      ..addListener(_refresh)
      ..load();
    widget.barbers
      ..addListener(_refresh)
      ..load();
  }

  @override
  void dispose() {
    widget.viewModel.removeListener(_refresh);
    widget.barbers.removeListener(_refresh);
    super.dispose();
  }

  void _refresh() {
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    if (widget.viewModel.loading) {
      return const Center(child: CircularProgressIndicator());
    }

    return RefreshIndicator(
      onRefresh: widget.viewModel.load,
      child: ZenPage(
        title: 'Clientes fixos',
        actions: [
          FilledButton.icon(
            onPressed: _create,
            icon: const Icon(Icons.add),
            label: const Text('Nova assinatura'),
          ),
        ],
        children: [
          if (widget.viewModel.error != null)
            ZenCard(child: Text(widget.viewModel.error!)),
          if (widget.viewModel.items.isEmpty)
            const ZenEmptyState(
              message: 'Nenhum contrato recorrente ativo',
              icon: Icons.repeat,
            ),
          for (final contract in widget.viewModel.items)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: ZenCard(
                padding: EdgeInsets.zero,
                child: ExpansionTile(
                  shape: const Border(),
                  collapsedShape: const Border(),
                  leading:
                      const CircleAvatar(child: Icon(Icons.workspace_premium)),
                  title: Text(
                    '${contract['clientName']}',
                    style: const TextStyle(fontWeight: FontWeight.w900),
                  ),
                  subtitle: Text(
                    '${contract['barberName']} · ${contract['code']}',
                    style: const TextStyle(color: ZenColors.muted),
                  ),
                  children: [
                    for (final payment in (contract['payments'] as List? ?? []))
                      ListTile(
                        title: Text(
                          '${isoToBrazilianDate('${payment['date']}')} · R\$ ${((payment['services']?['price'] as num?) ?? 0).toStringAsFixed(2)}',
                        ),
                        trailing: ['concluido', 'finalizado']
                                .contains(payment['status'])
                            ? const ZenStatusPill(
                                label: 'Pago', color: ZenColors.green)
                            : payment['status'] == 'bonificado'
                                ? const ZenStatusPill(
                                    label: 'Bonificado',
                                    color: ZenColors.muted,
                                  )
                                : FilledButton(
                                    onPressed: () => widget.viewModel
                                        .pay('${payment['id']}'),
                                    child: const Text('Receber'),
                                  ),
                      ),
                    Padding(
                      padding: const EdgeInsets.all(12),
                      child: Align(
                        alignment: Alignment.centerRight,
                        child: Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            if (contract['editable'] == true)
                              FilledButton.tonalIcon(
                                onPressed: () => _edit(
                                  Map<String, dynamic>.from(contract as Map),
                                ),
                                icon: const Icon(Icons.edit_outlined),
                                label: const Text('Editar pacote'),
                              ),
                            OutlinedButton.icon(
                              onPressed: () => _cancel('${contract['code']}'),
                              icon: const Icon(Icons.cancel_outlined),
                              label: const Text('Cancelar pacote'),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _create() async {
    final name = TextEditingController();
    final phone = TextEditingController();
    final value = TextEditingController();
    var selectedDate = DateTime.now();
    final date = TextEditingController(
      text: brazilianDate(selectedDate),
    );
    var selectedBillingDate = selectedDate;
    final billingDate = TextEditingController(
      text: brazilianDate(selectedBillingDate),
    );
    final time = TextEditingController(text: '09:00');
    final package = TextEditingController(text: 'Plano mensal');
    final duration = TextEditingController(text: '30');
    final months = TextEditingController(text: '6');
    var frequency = 'weekly';
    var paymentMode = 'monthly';
    var barberId = widget.barbers.items
            .where((barber) => barber.id == widget.user.id)
            .isNotEmpty
        ? widget.user.id
        : (widget.barbers.items.isEmpty ? '' : widget.barbers.items.first.id);

    final data = await showDialog<Map<String, String>>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Nova assinatura'),
        content: StatefulBuilder(
          builder: (context, setDialogState) => SingleChildScrollView(
              child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                  controller: name,
                  decoration: const InputDecoration(labelText: 'Cliente')),
              const SizedBox(height: 8),
              TextField(
                  controller: phone,
                  decoration: const InputDecoration(labelText: 'WhatsApp')),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                initialValue: barberId.isEmpty ? null : barberId,
                items: widget.barbers.items
                    .map((barber) => DropdownMenuItem(
                        value: barber.id, child: Text(barber.name)))
                    .toList(),
                onChanged: (value) => barberId = value ?? barberId,
                decoration: const InputDecoration(labelText: 'Profissional'),
              ),
              const SizedBox(height: 8),
              TextField(
                  controller: package,
                  decoration:
                      const InputDecoration(labelText: 'Nome do pacote')),
              const SizedBox(height: 8),
              TextField(
                controller: value,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Valor mensal'),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: duration,
                keyboardType: TextInputType.number,
                decoration:
                    const InputDecoration(labelText: 'Duração do atendimento'),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: months,
                keyboardType: TextInputType.number,
                decoration:
                    const InputDecoration(labelText: 'Quantidade de meses'),
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                initialValue: frequency,
                items: const [
                  DropdownMenuItem(value: 'weekly', child: Text('Toda semana')),
                  DropdownMenuItem(
                      value: 'biweekly', child: Text('A cada 15 dias')),
                  DropdownMenuItem(
                      value: 'monthly', child: Text('Uma vez por mês')),
                ],
                onChanged: (value) =>
                    setDialogState(() => frequency = value ?? frequency),
                decoration: const InputDecoration(labelText: 'Frequência'),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: date,
                readOnly: true,
                decoration: const InputDecoration(
                  labelText: 'Início (DD/MM/AAAA)',
                  suffixIcon: Icon(Icons.calendar_month),
                ),
                onTap: () async {
                  final picked = await showDatePicker(
                    context: context,
                    initialDate: selectedDate,
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 3650)),
                    locale: const Locale('pt', 'BR'),
                  );
                  if (picked != null) {
                    setDialogState(() {
                      selectedDate = picked;
                      date.text = brazilianDate(picked);
                    });
                  }
                },
              ),
              const SizedBox(height: 8),
              TextField(
                  controller: time,
                  decoration:
                      const InputDecoration(labelText: 'Horário (HH:MM)')),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                initialValue: paymentMode,
                items: const [
                  DropdownMenuItem(
                    value: 'monthly',
                    child: Text('Cobrança mensal'),
                  ),
                  DropdownMenuItem(
                    value: 'weekly',
                    child: Text('Cobrança semanal'),
                  ),
                  DropdownMenuItem(
                    value: 'start',
                    child: Text('Receber contrato no início'),
                  ),
                  DropdownMenuItem(
                    value: 'end',
                    child: Text('Cobrar contrato no final'),
                  ),
                ],
                onChanged: (value) => setDialogState(
                  () => paymentMode = value ?? paymentMode,
                ),
                decoration:
                    const InputDecoration(labelText: 'Forma de pagamento'),
              ),
              if (['monthly', 'weekly'].contains(paymentMode)) ...[
                const SizedBox(height: 8),
                TextField(
                  controller: billingDate,
                  readOnly: true,
                  decoration: const InputDecoration(
                    labelText: 'Primeira cobrança (DD/MM/AAAA)',
                    suffixIcon: Icon(Icons.calendar_month),
                  ),
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: selectedBillingDate,
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 3650)),
                      locale: const Locale('pt', 'BR'),
                    );
                    if (picked != null) {
                      setDialogState(() {
                        selectedBillingDate = picked;
                        billingDate.text = brazilianDate(picked);
                      });
                    }
                  },
                ),
              ],
            ],
          )),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancelar')),
          FilledButton(
            onPressed: () => Navigator.pop(context, {
              'name': name.text.trim(),
              'phone': phone.text.trim(),
              'value': value.text.trim(),
              'date': date.text.trim(),
              'time': time.text.trim(),
              'barberId': barberId,
              'packageName': package.text.trim(),
              'duration': duration.text.trim(),
              'months': months.text.trim(),
              'frequency': frequency,
              'paymentMode': paymentMode,
              'firstBillingDate': isoDate(selectedBillingDate),
              'startDate': isoDate(selectedDate),
            }),
            child: const Text('Criar'),
          ),
        ],
      ),
    );
    name.dispose();
    phone.dispose();
    value.dispose();
    date.dispose();
    time.dispose();
    package.dispose();
    duration.dispose();
    months.dispose();
    billingDate.dispose();
    if (data == null || data['name']!.isEmpty) return;

    try {
      await widget.viewModel.create({
        'barberId': data['barberId'],
        'clientName': data['name'],
        'clientPhone': data['phone'],
        'startDate': data['startDate'],
        'time': data['time'],
        'monthlyValue': double.tryParse(data['value'] ?? '') ?? 0,
        'packageName': data['packageName'],
        'duration': int.tryParse(data['duration'] ?? '') ?? 30,
        'months': int.tryParse(data['months'] ?? '') ?? 1,
        'frequency': data['frequency'],
        'paymentMode': data['paymentMode'],
        'firstBillingDate': data['firstBillingDate'],
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Assinatura criada.')),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }

  Future<void> _edit(Map<String, dynamic> contract) async {
    final name = TextEditingController(text: '${contract['clientName'] ?? ''}');
    final phone =
        TextEditingController(text: '${contract['clientPhone'] ?? ''}');
    final package =
        TextEditingController(text: '${contract['packageName'] ?? ''}');
    final value = TextEditingController(
      text: '${(contract['paymentValue'] as num?) ?? 0}',
    );
    final duration = TextEditingController(
      text: '${(contract['duration'] as num?) ?? 30}',
    );
    final time = TextEditingController(text: '${contract['time'] ?? '09:00'}');
    var selectedDate =
        parseIsoDate('${contract['startDate'] ?? ''}') ?? DateTime.now();
    if (selectedDate.isBefore(DateTime.now())) selectedDate = DateTime.now();
    final date = TextEditingController(text: brazilianDate(selectedDate));
    var selectedBillingDate =
        parseIsoDate('${contract['firstBillingDate'] ?? ''}') ?? selectedDate;
    if (selectedBillingDate.isBefore(DateTime.now())) {
      selectedBillingDate = selectedDate;
    }
    final billingDate =
        TextEditingController(text: brazilianDate(selectedBillingDate));
    var barberId = '${contract['barberId'] ?? ''}';
    if (!widget.barbers.items.any((barber) => barber.id == barberId)) {
      barberId =
          widget.barbers.items.isEmpty ? '' : widget.barbers.items.first.id;
    }

    final data = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Editar cliente fixo'),
        content: StatefulBuilder(
          builder: (context, setDialogState) => SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'As alterações serão aplicadas somente aos horários e cobranças futuras.',
                  style: TextStyle(color: ZenColors.muted),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: name,
                  decoration: const InputDecoration(labelText: 'Cliente'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: phone,
                  decoration: const InputDecoration(labelText: 'WhatsApp'),
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  initialValue: barberId.isEmpty ? null : barberId,
                  items: widget.barbers.items
                      .map((barber) => DropdownMenuItem(
                            value: barber.id,
                            child: Text(barber.name),
                          ))
                      .toList(),
                  onChanged: (newValue) => barberId = newValue ?? barberId,
                  decoration: const InputDecoration(labelText: 'Profissional'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: package,
                  decoration:
                      const InputDecoration(labelText: 'Nome do pacote'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: value,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  decoration:
                      const InputDecoration(labelText: 'Valor por cobrança'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: duration,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                      labelText: 'Duração do atendimento'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: date,
                  readOnly: true,
                  decoration: const InputDecoration(
                    labelText: 'Próximo atendimento (DD/MM/AAAA)',
                    suffixIcon: Icon(Icons.calendar_month),
                  ),
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: selectedDate,
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 3650)),
                      locale: const Locale('pt', 'BR'),
                    );
                    if (picked != null) {
                      setDialogState(() {
                        selectedDate = picked;
                        date.text = brazilianDate(picked);
                      });
                    }
                  },
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: time,
                  decoration:
                      const InputDecoration(labelText: 'Horário (HH:MM)'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: billingDate,
                  readOnly: true,
                  decoration: const InputDecoration(
                    labelText: 'Próxima cobrança (DD/MM/AAAA)',
                    suffixIcon: Icon(Icons.calendar_month),
                  ),
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: selectedBillingDate,
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 3650)),
                      locale: const Locale('pt', 'BR'),
                    );
                    if (picked != null) {
                      setDialogState(() {
                        selectedBillingDate = picked;
                        billingDate.text = brazilianDate(picked);
                      });
                    }
                  },
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, {
              'barberId': barberId,
              'clientName': name.text.trim(),
              'clientPhone': phone.text.trim(),
              'packageName': package.text.trim(),
              'paymentValue': double.tryParse(
                    value.text.replaceAll(',', '.'),
                  ) ??
                  0,
              'duration': int.tryParse(duration.text) ?? 30,
              'startDate': isoDate(selectedDate),
              'firstBillingDate': isoDate(selectedBillingDate),
              'time': time.text.trim(),
            }),
            child: const Text('Salvar alterações'),
          ),
        ],
      ),
    );
    name.dispose();
    phone.dispose();
    package.dispose();
    value.dispose();
    duration.dispose();
    time.dispose();
    date.dispose();
    billingDate.dispose();
    if (data == null || '${data['clientName']}'.trim().isEmpty) return;
    try {
      await widget.viewModel.update('${contract['code']}', data);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Cliente fixo atualizado.')),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }

  Future<void> _cancel(String code) async {
    try {
      await widget.viewModel.cancel(code);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Pacote cancelado.')),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }
}
