import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/date_format.dart';
import '../../data/model/auth_user_dto.dart';
import '../../data/model/appointment_dto.dart';
import '../catalog/view_models/catalog_view_model.dart';
import '../barbers/view_models/barbers_view_model.dart';
import '../core/theme/zen_colors.dart';
import '../core/widgets/zen_card.dart';
import '../core/widgets/zen_page.dart';
import 'view_models/agenda_view_model.dart';

class AgendaScreen extends StatefulWidget {
  const AgendaScreen({
    super.key,
    required this.user,
    required this.viewModel,
    required this.catalog,
    required this.barbers,
  });

  final AuthUserDto user;
  final AgendaViewModel viewModel;
  final CatalogViewModel catalog;
  final BarbersViewModel barbers;

  @override
  State<AgendaScreen> createState() => _AgendaScreenState();
}

class _AgendaScreenState extends State<AgendaScreen> {
  String? _selectedBarberId;

  @override
  void initState() {
    super.initState();
    widget.viewModel.addListener(_refresh);
    widget.catalog.addListener(_refresh);
    widget.barbers.addListener(_refresh);
    _initialize();
  }

  Future<void> _initialize() async {
    await widget.barbers.load();
    if (!mounted) return;
    final ids = widget.barbers.items.map((item) => item.id).toSet();
    _selectedBarberId =
        ids.contains(widget.user.id) ? widget.user.id : ids.firstOrNull;
    if (_selectedBarberId == null) return;
    await Future.wait([
      widget.viewModel.load(barberId: _selectedBarberId),
      widget.catalog.load(_selectedBarberId!),
    ]);
  }

  Future<void> _selectBarber(String id) async {
    setState(() => _selectedBarberId = id);
    await Future.wait([
      widget.viewModel.load(barberId: id),
      widget.catalog.load(id),
    ]);
  }

  @override
  void dispose() {
    widget.viewModel.removeListener(_refresh);
    widget.catalog.removeListener(_refresh);
    widget.barbers.removeListener(_refresh);
    super.dispose();
  }

  void _refresh() {
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    if (widget.viewModel.loading && widget.viewModel.items.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    return RefreshIndicator(
      onRefresh: () => widget.viewModel.load(),
      child: ZenPage(
        title: 'Agenda premium',
        actions: [
          FilledButton.icon(
            onPressed: _create,
            icon: const Icon(Icons.add),
            label: const Text('Novo horário'),
          ),
        ],
        children: [
          if (widget.viewModel.error != null)
            ZenCard(child: Text(widget.viewModel.error!)),
          if (widget.barbers.items.length > 1) ...[
            DropdownButtonFormField<String>(
              initialValue: _selectedBarberId,
              items: widget.barbers.items
                  .map((barber) => DropdownMenuItem(
                        value: barber.id,
                        child: Text(barber.name),
                      ))
                  .toList(),
              onChanged: (value) {
                if (value != null) _selectBarber(value);
              },
              decoration:
                  const InputDecoration(labelText: 'Agenda do profissional'),
            ),
            const SizedBox(height: 16),
          ],
          _dateChips(),
          const SizedBox(height: 16),
          _kpiGrid(),
          const SizedBox(height: 16),
          if (widget.viewModel.overdueUnconfirmed.isNotEmpty) _overdueCard(),
          const SizedBox(height: 12),
          _nextClientCard(),
          const SizedBox(height: 18),
          _agendaTimeline(),
        ],
      ),
    );
  }

  Widget _dateChips() {
    final selected = widget.viewModel.selectedDate;
    final now = DateTime.now();
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: List.generate(11, (index) {
          final date = now.add(Duration(days: index - 3));
          final iso = date.toIso8601String().substring(0, 10);
          final selectedChip = iso == selected;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(
              labelPadding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              selected: selectedChip,
              onSelected: (_) => widget.viewModel.setDate(iso),
              selectedColor: ZenColors.green,
              padding: const EdgeInsets.symmetric(horizontal: 8),
              backgroundColor: const Color(0xff0f1b26),
              label: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(_dayShort(date.weekday),
                      style: TextStyle(
                          color: selectedChip ? Colors.black : ZenColors.muted,
                          fontSize: 12,
                          fontWeight: FontWeight.w900)),
                  const SizedBox(height: 4),
                  Text(date.day.toString().padLeft(2, '0'),
                      style: TextStyle(
                          color: selectedChip ? Colors.black : Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.w900)),
                ],
              ),
            ),
          );
        }),
      ),
    );
  }

  Widget _kpiGrid() {
    final revenue = widget.viewModel.revenue;
    final totalMinutes = widget.viewModel.totalMinutes;
    final hours = totalMinutes ~/ 60;
    final minutes = totalMinutes % 60;
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: [
        _kpiCard(
            'Clientes no dia',
            '${widget.viewModel.appointmentCount}',
            '${widget.viewModel.overdueUnconfirmed.length} em atraso',
            Icons.calendar_month_outlined,
            ZenColors.sky),
        _kpiCard('Previsão do dia', _money(revenue), 'Renda estimada',
            Icons.payments_outlined, ZenColors.green),
        _kpiCard(
            'Tempo vendido',
            '${hours}h${minutes.toString().padLeft(2, '0')}',
            'Duração dos serviços',
            Icons.schedule,
            const Color(0xfff5bf42)),
        _kpiCard(
            'Aguardando ação',
            '${widget.viewModel.overdueUnconfirmed.length}',
            'Sem confirmação há mais de 15 min',
            Icons.warning_amber_rounded,
            const Color(0xfff09c4d)),
      ],
    );
  }

  Widget _kpiCard(
      String label, String value, String hint, IconData icon, Color color) {
    return SizedBox(
      width: 220,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xff0f1924),
          border: Border.all(color: color.withValues(alpha: .25)),
          borderRadius: BorderRadius.circular(18),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(icon, size: 20, color: color),
          const SizedBox(height: 12),
          Text(label.toUpperCase(),
              style: const TextStyle(
                  color: ZenColors.muted,
                  fontSize: 11,
                  fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          Text(value,
              style:
                  const TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
          const SizedBox(height: 6),
          Text(hint,
              style: const TextStyle(color: ZenColors.muted, fontSize: 11)),
        ]),
      ),
    );
  }

  Widget _overdueCard() {
    final overdue = widget.viewModel.overdueUnconfirmed;
    return ZenCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Passou sem confirmação',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          const Text('Agendamentos que precisam de atenção imediata.',
              style: TextStyle(color: ZenColors.muted)),
          const SizedBox(height: 12),
          ...overdue.map((item) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: ZenColors.red.withValues(alpha: .15),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Text(item.time,
                        style: const TextStyle(fontWeight: FontWeight.w900)),
                  ),
                  title: Text(item.clientName,
                      style: const TextStyle(fontWeight: FontWeight.w900)),
                  subtitle: Text('${item.serviceName} • ${item.barberName}',
                      style: const TextStyle(color: ZenColors.muted)),
                  trailing: FilledButton(
                    onPressed: () => _copyWhats(item, 'confirm'),
                    child: const Text('Confirmar WhatsApp'),
                  ),
                ),
              ))
        ],
      ),
    );
  }

  Widget _nextClientCard() {
    final next = widget.viewModel.nextAppointment;
    if (next == null) {
      return ZenCard(
        child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Text('Próximo cliente',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
              SizedBox(height: 10),
              Text('Nenhum cliente agendado para este dia.',
                  style: TextStyle(color: ZenColors.muted)),
            ]),
      );
    }

    return ZenCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Próximo cliente',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
        const SizedBox(height: 10),
        Text('${next.time} • ${next.clientName}',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
        const SizedBox(height: 6),
        Text('${next.serviceName} • ${next.barberName}',
            style: const TextStyle(color: ZenColors.muted)),
        const SizedBox(height: 10),
        Text(_timeUntil(next), style: const TextStyle(color: ZenColors.green)),
        const SizedBox(height: 14),
        Wrap(spacing: 10, runSpacing: 10, children: [
          FilledButton.icon(
            onPressed: () => _copyWhats(next, 'confirm'),
            icon: const Icon(Icons.send),
            label: const Text('Confirmar'),
          ),
          OutlinedButton(
            onPressed: () => _copyWhats(next, 'reschedule'),
            child: const Text('Remarcar'),
          ),
          if (['agendado', 'encaixe'].contains(next.status))
            OutlinedButton(
              onPressed: () =>
                  widget.viewModel.update(next.id, {'status': 'em_andamento'}),
              child: const Text('Iniciar'),
            ),
          if (['agendado', 'encaixe', 'em_andamento'].contains(next.status))
            OutlinedButton(
              onPressed: () =>
                  widget.viewModel.update(next.id, {'status': 'faltou'}),
              child: const Text('Faltou'),
            ),
        ]),
      ]),
    );
  }

  Widget _agendaTimeline() {
    if (widget.viewModel.items.isEmpty) {
      return const ZenEmptyState(
          message: 'Nenhum horário para este dia', icon: Icons.calendar_today);
    }

    final groups = widget.viewModel.groupedAppointments;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ...groups.entries
            .where((entry) => entry.value.isNotEmpty)
            .map((entry) => _timelineGroup(entry.key, entry.value)),
        if (widget.viewModel.items.any((item) => item.status == 'bloqueio'))
          _blockedGroup(widget.viewModel.items
              .where((item) => item.status == 'bloqueio')
              .toList()),
      ],
    );
  }

  Widget _timelineGroup(String title, List<AppointmentDto> items) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Text(title,
              style:
                  const TextStyle(fontSize: 17, fontWeight: FontWeight.w900)),
        ),
        ...items.map(_appointmentCard),
        const SizedBox(height: 18),
      ],
    );
  }

  Widget _blockedGroup(List<AppointmentDto> items) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.only(bottom: 12),
          child: Text('Bloqueios',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900)),
        ),
        ...items.map(_appointmentCard),
        const SizedBox(height: 18),
      ],
    );
  }

  Widget _appointmentCard(AppointmentDto item) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: ZenCard(
        child: ExpansionTile(
          collapsedIconColor: Colors.white,
          iconColor: ZenColors.green,
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: ZenColors.green.withValues(alpha: .12),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Text(item.time,
                    style: const TextStyle(fontWeight: FontWeight.w900)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(item.clientName,
                        style: const TextStyle(fontWeight: FontWeight.w900)),
                    const SizedBox(height: 4),
                    Text('${item.serviceName} • ${item.barberName}',
                        style: const TextStyle(color: ZenColors.muted)),
                  ],
                ),
              ),
              ZenStatusPill(
                  label: _statusLabel(item.status),
                  color: _statusColor(item.status)),
            ],
          ),
          children: [
            Padding(
              padding: const EdgeInsets.only(left: 16, right: 16, bottom: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                      'Duração: ${item.serviceDuration} min • Valor: ${_money(item.servicePrice)}',
                      style: const TextStyle(color: ZenColors.muted)),
                  const SizedBox(height: 10),
                  Wrap(spacing: 10, runSpacing: 10, children: [
                    OutlinedButton(
                      onPressed: () => _copyWhats(item, 'confirm'),
                      child: const Text('Copiar WhatsApp'),
                    ),
                    if (![
                      'concluido',
                      'finalizado',
                      'faltou',
                      'cancelado',
                      'bloqueio'
                    ].contains(item.status))
                      FilledButton(
                        onPressed: () => widget.viewModel.finish(item),
                        child: const Text('Finalizar'),
                      ),
                    if (['agendado', 'encaixe', 'em_andamento']
                        .contains(item.status))
                      OutlinedButton(
                        onPressed: () => _sendToWallet(item),
                        child: const Text('Carteira'),
                      ),
                    if (['agendado', 'encaixe'].contains(item.status))
                      OutlinedButton(
                        onPressed: () => widget.viewModel
                            .update(item.id, {'status': 'em_andamento'}),
                        child: const Text('Iniciar'),
                      ),
                    if (['agendado', 'encaixe', 'em_andamento']
                        .contains(item.status))
                      OutlinedButton(
                        onPressed: () => widget.viewModel
                            .update(item.id, {'status': 'faltou'}),
                        child: const Text('Faltou'),
                      ),
                    if (item.status != 'cancelado')
                      OutlinedButton(
                        onPressed: () => _edit(item),
                        child: const Text('Editar'),
                      ),
                    if (item.status != 'cancelado')
                      OutlinedButton(
                        onPressed: () => _cancel(item.id),
                        child: const Text('Cancelar'),
                      ),
                  ]),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _money(num value) =>
      'R\$ ${value.toStringAsFixed(2).replaceAll('.', ',')}';

  String _timeUntil(AppointmentDto item) {
    final date = widget.viewModel.selectedDate;
    if (date.isEmpty || item.time.isEmpty) return '';
    final now = DateTime.now();
    final when = DateTime.parse('${date}T${item.time}:00');
    final diff = when.difference(now).inMinutes;
    if (diff > 60) {
      return 'Em ${diff ~/ 60}h${(diff % 60).toString().padLeft(2, '0')}';
    }
    if (diff > 0) {
      return 'Em $diff min';
    }
    if (diff > -item.serviceDuration) {
      return 'Agora';
    }
    return 'Atrasado ${diff.abs()} min';
  }

  String _statusLabel(String status) {
    return {
          'agendado': 'Pendente',
          'encaixe': 'Encaixe',
          'em_andamento': 'Em andamento',
          'bloqueio': 'Bloqueio',
          'concluido': 'Pago',
          'finalizado': 'Finalizado',
          'faltou': 'Faltou',
          'cancelado': 'Cancelado',
        }[status] ??
        status;
  }

  Color _statusColor(String status) {
    return {
          'agendado': const Color(0xfff5bf42),
          'encaixe': const Color(0xfff5bf42),
          'em_andamento': ZenColors.sky,
          'bloqueio': ZenColors.muted,
          'concluido': ZenColors.green,
          'finalizado': ZenColors.green,
          'faltou': ZenColors.red,
          'cancelado': ZenColors.red,
        }[status] ??
        ZenColors.muted;
  }

  String _dayShort(int weekday) {
    return ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'][weekday - 1];
  }

  void _copyWhats(AppointmentDto item, String type) {
    final message = _whatsappTemplate(item, type);
    Clipboard.setData(ClipboardData(text: message));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Mensagem copiada para o WhatsApp.')),
      );
    }
  }

  String _whatsappTemplate(AppointmentDto item, String type) {
    final shop =
        widget.user.shopName.isEmpty ? 'barbearia' : widget.user.shopName;
    final firstName = item.clientName
        .trim()
        .split(RegExp(r'\s+'))
        .firstWhere((value) => value.isNotEmpty, orElse: () => 'cliente');
    final service = item.serviceName.isEmpty ? 'serviço' : item.serviceName;
    final price = _money(item.servicePrice);
    final date = isoToBrazilianDate(widget.viewModel.selectedDate);

    final templates = {
      'confirm':
          'Olá $firstName, tudo bem? Passando para confirmar seu horário na $shop hoje às ${item.time}. Posso confirmar?',
      'reminder':
          'Olá $firstName, passando para lembrar do seu horário na $shop: $date às ${item.time}. Serviço: $service.',
      'delay':
          'Olá $firstName, tudo bem? Seu horário na $shop era às ${item.time}. Me avisa se ainda vem ou se prefere remarcar?',
      'reschedule':
          'Olá $firstName, tudo bem? Precisamos ajustar seu horário na $shop. Me chama por aqui para remarcarmos o melhor horário para você.',
      'charge':
          'Olá $firstName, tudo bem? Passando para lembrar do valor de $price referente ao $service na $shop.',
    };
    return templates[type] ?? templates['reminder']!;
  }

  Future<void> _create() async {
    if (_selectedBarberId == null || widget.catalog.items.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Cadastre um profissional e ao menos um serviço.'),
        ),
      );
      return;
    }
    if (widget.catalog.items.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Cadastre ao menos um serviço antes de agendar.')),
      );
      return;
    }

    final name = TextEditingController();
    final phone = TextEditingController();
    var selectedDate =
        parseIsoDate(widget.viewModel.selectedDate) ?? DateTime.now();
    final date = TextEditingController(text: brazilianDate(selectedDate));
    final time = TextEditingController(text: '09:00');
    var service = widget.catalog.items.first.id;

    var status = 'agendado';

    final data = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Novo horário'),
        content: SingleChildScrollView(
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
                initialValue: service,
                items: widget.catalog.items
                    .map(
                      (item) => DropdownMenuItem(
                        value: item.id,
                        child: Text(
                            '${item.name} · R\$ ${item.price.toStringAsFixed(2)}'),
                      ),
                    )
                    .toList(),
                onChanged: (value) => service = value ?? service,
                decoration: const InputDecoration(labelText: 'Serviço'),
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                initialValue: status,
                items: const [
                  DropdownMenuItem(value: 'agendado', child: Text('Agendado')),
                  DropdownMenuItem(value: 'encaixe', child: Text('Encaixe')),
                ],
                onChanged: (value) => status = value ?? status,
                decoration:
                    const InputDecoration(labelText: 'Tipo de agendamento'),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: date,
                readOnly: true,
                onTap: () async {
                  final picked = await showDatePicker(
                    context: context,
                    locale: const Locale('pt', 'BR'),
                    initialDate: selectedDate,
                    firstDate: DateTime(2020),
                    lastDate: DateTime(2100),
                  );
                  if (picked != null) {
                    selectedDate = picked;
                    date.text = brazilianDate(picked);
                  }
                },
                decoration: const InputDecoration(
                  labelText: 'Data',
                  hintText: 'DD/MM/AAAA',
                  suffixIcon: Icon(Icons.calendar_month),
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                  controller: time,
                  decoration:
                      const InputDecoration(labelText: 'Horário (HH:MM)')),
            ],
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancelar')),
          FilledButton(
            onPressed: () => Navigator.pop(context, {
              'name': name.text.trim(),
              'phone': phone.text.trim(),
              'date': isoDate(selectedDate),
              'time': time.text.trim(),
              'service': service,
              'status': status,
            }),
            child: const Text('Agendar'),
          ),
        ],
      ),
    );
    name.dispose();
    phone.dispose();
    date.dispose();
    time.dispose();
    if (data == null || data['name']!.isEmpty) return;

    try {
      await widget.viewModel.create({
        'barberId': _selectedBarberId,
        'serviceId': data['service'],
        'clientName': data['name'],
        'clientPhone': data['phone'],
        'status': data['status'] ?? 'agendado',
        'date': data['date'],
        'time': data['time'],
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Horário agendado.')),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }

  Future<void> _cancel(String id) async {
    try {
      await widget.viewModel.update(id, {'status': 'cancelado'});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Horário cancelado.')),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }

  Future<void> _sendToWallet(AppointmentDto item) async {
    try {
      final now = DateTime.now();
      final reminderDate =
          now.add(const Duration(days: 15)).toIso8601String().split('T')[0];
      await widget.viewModel.update(item.id, {
        'status': 'em_carteira',
        'reminderDays': 15,
        'reminderDate': reminderDate,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Horário enviado para carteira.')),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }

  Future<void> _edit(AppointmentDto item) async {
    final updated = await _showAppointmentForm(item);
    if (updated == null) return;

    try {
      await widget.viewModel.update(item.id, updated);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Horário atualizado.')),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }

  Future<Map<String, dynamic>?> _showAppointmentForm(
      AppointmentDto? item) async {
    final name = TextEditingController(text: item?.clientName ?? '');
    final phone = TextEditingController(text: item?.clientPhone ?? '');
    var selectedDate = parseIsoDate(
          item?.date ?? widget.viewModel.selectedDate,
        ) ??
        DateTime.now();
    final date = TextEditingController(text: brazilianDate(selectedDate));
    final time = TextEditingController(text: item?.time ?? '09:00');
    var service = item?.serviceId ?? widget.catalog.items.first.id;
    var status = item?.status ?? 'agendado';

    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(item == null ? 'Novo horário' : 'Editar horário'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
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
                initialValue: service,
                items: widget.catalog.items
                    .map(
                      (item) => DropdownMenuItem(
                        value: item.id,
                        child: Text(
                            '${item.name} · R\$ ${item.price.toStringAsFixed(2)}'),
                      ),
                    )
                    .toList(),
                onChanged: (value) => service = value ?? service,
                decoration: const InputDecoration(labelText: 'Serviço'),
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                initialValue: status,
                items: const [
                  DropdownMenuItem(value: 'agendado', child: Text('Agendado')),
                  DropdownMenuItem(value: 'encaixe', child: Text('Encaixe')),
                  DropdownMenuItem(
                      value: 'em_andamento', child: Text('Em andamento')),
                  DropdownMenuItem(value: 'concluido', child: Text('Pago')),
                  DropdownMenuItem(
                      value: 'finalizado', child: Text('Finalizado')),
                  DropdownMenuItem(value: 'faltou', child: Text('Faltou')),
                  DropdownMenuItem(
                      value: 'cancelado', child: Text('Cancelado')),
                ],
                onChanged: (value) => status = value ?? status,
                decoration: const InputDecoration(labelText: 'Status'),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: date,
                readOnly: true,
                onTap: () async {
                  final picked = await showDatePicker(
                    context: context,
                    locale: const Locale('pt', 'BR'),
                    initialDate: selectedDate,
                    firstDate: DateTime(2020),
                    lastDate: DateTime(2100),
                  );
                  if (picked != null) {
                    selectedDate = picked;
                    date.text = brazilianDate(picked);
                  }
                },
                decoration: const InputDecoration(
                  labelText: 'Data',
                  hintText: 'DD/MM/AAAA',
                  suffixIcon: Icon(Icons.calendar_month),
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: time,
                decoration: const InputDecoration(labelText: 'Horário (HH:MM)'),
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
              'serviceId': service,
              'clientName': name.text.trim(),
              'clientPhone': phone.text.trim(),
              'status': status,
              'date': isoDate(selectedDate),
              'time': time.text.trim(),
            }),
            child: const Text('Salvar'),
          ),
        ],
      ),
    );

    name.dispose();
    phone.dispose();
    date.dispose();
    time.dispose();
    return result;
  }
}
