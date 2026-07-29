import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/date_format.dart';
import '../../data/model/auth_user_dto.dart';
import '../../data/model/appointment_dto.dart';
import '../../routing/public_booking_route.dart';
import '../../services/local_preferences.dart';
import '../../services/whatsapp_templates.dart';
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
  late final WhatsappTemplateStore _templateStore;
  late Map<String, String> _whatsTemplates;

  @override
  void initState() {
    super.initState();
    _templateStore = WhatsappTemplateStore(
      shopName: widget.user.shopName,
      login: widget.user.login,
    );
    _whatsTemplates = _templateStore.load();
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
    if (!mounted) return;
    final ids = widget.barbers.items.map((barber) => barber.id).toSet();
    if (_selectedBarberId != null && !ids.contains(_selectedBarberId)) {
      final next = ids.firstOrNull;
      _selectedBarberId = next;
      if (next == null) {
        widget.viewModel
          ..items = const []
          ..selectedBarberId = null;
      } else {
        Future.microtask(() => _selectBarber(next));
      }
    }
    setState(() {});
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
          if (widget.user.isManager)
            OutlinedButton.icon(
              onPressed: _editWhatsTemplates,
              icon: const Icon(Icons.chat_outlined),
              label: const Text('Modelos WhatsApp'),
            ),
          if (widget.user.canSelfBlockAgenda &&
              _selectedBarberId == widget.user.id)
            OutlinedButton.icon(
              onPressed: _createSelfClosure,
              icon: const Icon(Icons.event_busy),
              label: const Text('Bloquear minha agenda'),
            ),
          FilledButton.icon(
            onPressed: () => _create(),
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
          _quickSlots(),
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
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    final identity = Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _timeBadge(item.time, alert: true),
                        const SizedBox(width: 12),
                        Expanded(child: _appointmentDetails(item)),
                      ],
                    );
                    final action = FilledButton(
                      onPressed: () => _copyWhats(item, 'confirm'),
                      child: const Text('Confirmar WhatsApp'),
                    );
                    if (constraints.maxWidth < 560) {
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          identity,
                          const SizedBox(height: 12),
                          action,
                        ],
                      );
                    }
                    return Row(
                      children: [
                        Expanded(child: identity),
                        const SizedBox(width: 12),
                        action,
                      ],
                    );
                  },
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
            onPressed: () => _edit(next),
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
          title: LayoutBuilder(
            builder: (context, constraints) {
              final identity = Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _timeBadge(item.time),
                  const SizedBox(width: 12),
                  Expanded(child: _appointmentDetails(item)),
                ],
              );
              final status = ZenStatusPill(
                label: _statusLabel(item.status),
                color: _statusColor(item.status),
              );
              final draggable =
                  ['agendado', 'encaixe', 'em_andamento'].contains(item.status);

              if (constraints.maxWidth < 520) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    identity,
                    const SizedBox(height: 9),
                    Row(
                      children: [
                        status,
                        const Spacer(),
                        if (draggable) _dragHandle(item),
                      ],
                    ),
                  ],
                );
              }
              return Row(
                children: [
                  Expanded(child: identity),
                  const SizedBox(width: 10),
                  status,
                  if (draggable) _dragHandle(item),
                ],
              );
            },
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
                        onPressed: () => _finish(item),
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

  Widget _timeBadge(String time, {bool alert = false}) => Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color:
              (alert ? ZenColors.red : ZenColors.green).withValues(alpha: .15),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Text(
          time,
          style: const TextStyle(fontWeight: FontWeight.w900),
        ),
      );

  Widget _appointmentDetails(AppointmentDto item) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            item.clientName,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 4),
          Text(
            '${item.serviceName} • ${item.barberName}',
            style: const TextStyle(color: ZenColors.muted),
          ),
        ],
      );

  Widget _dragHandle(AppointmentDto item) => Draggable<AppointmentDto>(
        data: item,
        feedback: Material(
          color: Colors.transparent,
          child: Container(
            width: 230,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xff102033),
              border: Border.all(color: ZenColors.green),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text('${item.time} • ${item.clientName}'),
          ),
        ),
        childWhenDragging: const Icon(
          Icons.drag_indicator,
          color: ZenColors.muted,
        ),
        child: const Padding(
          padding: EdgeInsets.only(left: 8),
          child: Icon(Icons.drag_indicator),
        ),
      );

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

  Future<void> _createSelfClosure() async {
    final selected =
        parseIsoDate(widget.viewModel.selectedDate) ?? DateTime.now();
    var date = selected.isBefore(
      DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day),
    )
        ? DateTime.now()
        : selected;
    final currentBarber = widget.barbers.items
        .where((barber) => barber.id == widget.user.id)
        .firstOrNull;
    TimeOfDay parseTime(String value, TimeOfDay fallback) {
      final parts = value.split(':').map(int.tryParse).toList();
      if (parts.length < 2 || parts.any((part) => part == null)) {
        return fallback;
      }
      return TimeOfDay(hour: parts[0]!, minute: parts[1]!);
    }

    var start = parseTime(
      currentBarber?.workStart ?? '',
      const TimeOfDay(hour: 8, minute: 0),
    );
    var end = parseTime(
      currentBarber?.workEnd ?? '',
      const TimeOfDay(hour: 20, minute: 0),
    );
    final reason = TextEditingController(text: 'compromisso inesperado');
    String timeValue(TimeOfDay value) =>
        '${value.hour.toString().padLeft(2, '0')}:'
        '${value.minute.toString().padLeft(2, '0')}';

    final data = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Bloquear minha agenda'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Data'),
                subtitle: Text(brazilianDate(date)),
                trailing: const Icon(Icons.calendar_month),
                onTap: () async {
                  final picked = await showDatePicker(
                    context: context,
                    initialDate: date,
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 365)),
                    locale: const Locale('pt', 'BR'),
                  );
                  if (picked != null) setDialogState(() => date = picked);
                },
              ),
              Row(
                children: [
                  Expanded(
                    child: ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Início'),
                      subtitle: Text(timeValue(start)),
                      onTap: () async {
                        final picked = await showTimePicker(
                          context: context,
                          initialTime: start,
                        );
                        if (picked != null) {
                          setDialogState(() => start = picked);
                        }
                      },
                    ),
                  ),
                  Expanded(
                    child: ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Fim'),
                      subtitle: Text(timeValue(end)),
                      onTap: () async {
                        final picked = await showTimePicker(
                          context: context,
                          initialTime: end,
                        );
                        if (picked != null) setDialogState(() => end = picked);
                      },
                    ),
                  ),
                ],
              ),
              TextField(
                controller: reason,
                decoration: const InputDecoration(labelText: 'Motivo'),
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
                'date': isoDate(date),
                'start': timeValue(start),
                'end': timeValue(end),
                'reason': reason.text.trim(),
              }),
              child: const Text('Confirmar bloqueio'),
            ),
          ],
        ),
      ),
    );
    reason.dispose();
    if (data == null) return;
    try {
      await widget.viewModel.createSelfClosure(data);
      final affected = widget.viewModel.lastAffectedByBlock;
      if (affected.isNotEmpty) {
        final shop = widget.user.shopName;
        final messages = affected.map((row) {
          final name = '${row['client_name'] ?? 'cliente'}';
          final firstName = name.trim().split(RegExp(r'\s+')).first;
          return 'WhatsApp: ${row['client_phone'] ?? ''}\n'
              'Olá $firstName, tudo bem? Precisei bloquear minha agenda '
              'por motivo de ${data['reason']}. Seu horário de '
              '${brazilianDate(date)} às ${row['time']} na $shop precisa '
              'ser reagendado. Peço desculpas pelo transtorno.';
        }).join('\n\n---\n\n');
        await Clipboard.setData(ClipboardData(text: messages));
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              affected.isEmpty
                  ? 'Agenda bloqueada.'
                  : 'Agenda bloqueada. ${affected.length} mensagem(ns) para clientes foram copiadas.',
            ),
          ),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$error')));
      }
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

    final barberName = widget.barbers.items
        .where((barber) => barber.id == item.barberId)
        .map((barber) => barber.name)
        .firstOrNull;
    final replacements = {
      'cliente': item.clientName,
      'primeiro_nome': firstName,
      'barbearia': shop,
      'data': date,
      'horario': item.time,
      'servico': service,
      'barbeiro': barberName ?? 'barbeiro',
      'valor': price,
      'link': publicBookingUri(Uri.base, widget.user.login).toString(),
    };
    return _templateStore.fill(_whatsTemplates, type, replacements);
  }

  Widget _quickSlots() {
    final selected = widget.barbers.items
        .where((barber) => barber.id == _selectedBarberId)
        .firstOrNull;
    if (selected == null) return const SizedBox.shrink();
    int minutes(String value) {
      final parts = value.split(':').map(int.tryParse).toList();
      return (parts.first ?? 0) * 60 + (parts.length > 1 ? parts[1] ?? 0 : 0);
    }

    final start = minutes(selected.workStart);
    final end = minutes(selected.workEnd);
    final slots = <String>[];
    for (var value = start; value + 30 <= end; value += 30) {
      final time =
          '${(value ~/ 60).toString().padLeft(2, '0')}:${(value % 60).toString().padLeft(2, '0')}';
      if (_slotAvailable(time, 30)) slots.add(time);
    }
    if (slots.isEmpty) return const SizedBox.shrink();
    return ZenCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Horários livres rápidos',
            style: TextStyle(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 6),
          const Text(
            'Clique para agendar ou arraste um cliente pelo ícone para remarcar.',
            style: TextStyle(color: ZenColors.muted),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final time in slots.take(18))
                DragTarget<AppointmentDto>(
                  onWillAcceptWithDetails: (details) => _slotAvailable(
                      time, details.data.serviceDuration,
                      ignoreId: details.data.id),
                  onAcceptWithDetails: (details) =>
                      _moveToSlot(details.data, time),
                  builder: (context, candidates, _) => OutlinedButton(
                    style: candidates.isEmpty
                        ? null
                        : OutlinedButton.styleFrom(
                            backgroundColor:
                                ZenColors.green.withValues(alpha: .18),
                            side: const BorderSide(color: ZenColors.green),
                          ),
                    onPressed: () => _create(initialTime: time),
                    child: Text(time),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  bool _slotAvailable(String time, int duration, {String? ignoreId}) {
    int minutes(String value) {
      final parts = value.split(':').map(int.tryParse).toList();
      return (parts.first ?? 0) * 60 + (parts.length > 1 ? parts[1] ?? 0 : 0);
    }

    final start = minutes(time);
    final end = start + duration;
    return !widget.viewModel.items.any((item) {
      if (item.id == ignoreId ||
          !['agendado', 'encaixe', 'em_andamento', 'bloqueio']
              .contains(item.status)) {
        return false;
      }
      final otherStart = minutes(item.time);
      final otherEnd = otherStart + item.serviceDuration;
      return start < otherEnd && otherStart < end;
    });
  }

  Future<void> _moveToSlot(AppointmentDto item, String time) async {
    try {
      await widget.viewModel.update(item.id, {
        'barberId': _selectedBarberId,
        'date': widget.viewModel.selectedDate,
        'time': time,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${item.clientName} remarcado para $time.')),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }

  Future<void> _editWhatsTemplates() async {
    const labels = <String, String>{
      'confirm': 'Confirmar horário',
      'reminder': 'Lembrete',
      'delay': 'Atraso / passou do horário',
      'reschedule': 'Reagendar',
      'charge': 'Cobrança',
      'comeback': 'Cliente ausente',
      'thanks': 'Agradecimento',
    };
    final controllers = {
      for (final key in labels.keys)
        key: TextEditingController(text: _whatsTemplates[key]),
    };
    final action = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Modelos de WhatsApp'),
        content: SizedBox(
          width: 680,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Variáveis: {primeiro_nome}, {cliente}, {barbearia}, {data}, {horario}, {servico}, {barbeiro}, {valor}, {link}',
                  style: TextStyle(color: ZenColors.muted),
                ),
                const SizedBox(height: 12),
                for (final entry in labels.entries) ...[
                  TextField(
                    controller: controllers[entry.key],
                    minLines: 3,
                    maxLines: 7,
                    decoration: InputDecoration(labelText: entry.value),
                  ),
                  const SizedBox(height: 10),
                ],
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, 'reset'),
            child: const Text('Restaurar padrão'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, 'save'),
            child: const Text('Salvar modelos'),
          ),
        ],
      ),
    );
    if (action == 'save') {
      final updated = {
        for (final entry in controllers.entries)
          entry.key: entry.value.text.trim(),
      };
      _templateStore.save(updated);
      if (mounted) setState(() => _whatsTemplates = updated);
    } else if (action == 'reset') {
      _templateStore.reset();
      if (mounted) {
        setState(() {
          _whatsTemplates =
              Map<String, String>.from(WhatsappTemplateStore.defaults);
        });
      }
    }
    for (final controller in controllers.values) {
      controller.dispose();
    }
  }

  String get _agendaDraftKey =>
      'zenbarber_agenda_draft_${widget.user.shopName.toLowerCase().replaceAll(RegExp(r'[^a-z0-9_-]+'), '_')}';

  Map<String, dynamic> _readAgendaDraft() {
    try {
      final value = readSessionPreference(_agendaDraftKey);
      return value == null
          ? <String, dynamic>{}
          : Map<String, dynamic>.from(jsonDecode(value) as Map);
    } catch (_) {
      return <String, dynamic>{};
    }
  }

  Future<void> _create({String? initialTime}) async {
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

    final draft = _readAgendaDraft();
    final name = TextEditingController(text: '${draft['name'] ?? ''}');
    final phone = TextEditingController(text: '${draft['phone'] ?? ''}');
    var selectedDate = parseIsoDate(
          '${draft['date'] ?? widget.viewModel.selectedDate}',
        ) ??
        DateTime.now();
    final date = TextEditingController(text: brazilianDate(selectedDate));
    final time = TextEditingController(
      text: initialTime ?? '${draft['time'] ?? '09:00'}',
    );
    var service = widget.catalog.items.any(
      (item) => item.id == '${draft['serviceId'] ?? ''}',
    )
        ? '${draft['serviceId']}'
        : widget.catalog.items.first.id;
    var status = ['agendado', 'encaixe'].contains(draft['status'])
        ? '${draft['status']}'
        : 'agendado';

    void saveDraft() {
      writeSessionPreference(
        _agendaDraftKey,
        jsonEncode({
          'name': name.text,
          'phone': phone.text,
          'date': isoDate(selectedDate),
          'time': time.text,
          'serviceId': service,
          'status': status,
          'savedAt': DateTime.now().toIso8601String(),
        }),
      );
    }

    name.addListener(saveDraft);
    phone.addListener(saveDraft);
    time.addListener(saveDraft);

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
                onChanged: (value) {
                  service = value ?? service;
                  saveDraft();
                },
                decoration: const InputDecoration(labelText: 'Serviço'),
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                initialValue: status,
                items: const [
                  DropdownMenuItem(value: 'agendado', child: Text('Agendado')),
                  DropdownMenuItem(value: 'encaixe', child: Text('Encaixe')),
                ],
                onChanged: (value) {
                  status = value ?? status;
                  saveDraft();
                },
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
                    saveDraft();
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
      removeSessionPreference(_agendaDraftKey);
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

  Future<void> _finish(AppointmentDto item) async {
    var reminderDays = 15;
    final action = await showDialog<String>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Como foi o pagamento?'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Dê baixa agora, informe outro valor final ou envie a cobrança para a carteira.',
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () => Navigator.pop(context, 'received'),
                child: const Text('Recebido agora'),
              ),
              const SizedBox(height: 8),
              OutlinedButton(
                onPressed: () => Navigator.pop(context, 'amount'),
                child: const Text('Valor a receber'),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<int>(
                initialValue: reminderDays,
                decoration: const InputDecoration(labelText: 'Lembrar em'),
                items: const [
                  DropdownMenuItem(value: 15, child: Text('15 dias')),
                  DropdownMenuItem(value: 30, child: Text('30 dias')),
                  DropdownMenuItem(value: 45, child: Text('45 dias')),
                ],
                onChanged: (value) => setDialogState(
                  () => reminderDays = value ?? reminderDays,
                ),
              ),
              const SizedBox(height: 8),
              OutlinedButton(
                onPressed: () => Navigator.pop(context, 'wallet'),
                child: const Text('Enviar para carteira'),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Voltar'),
            ),
          ],
        ),
      ),
    );
    if (action == null) return;

    if (action == 'wallet') {
      await _sendToWallet(item, reminderDays: reminderDays);
      return;
    }

    var receivedAmount = item.servicePrice;
    if (action == 'amount') {
      if (!mounted) return;
      final controller = TextEditingController(
        text: item.servicePrice.toStringAsFixed(2).replaceAll('.', ','),
      );
      final amount = await showDialog<double>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Valor final recebido'),
          content: TextField(
            controller: controller,
            autofocus: true,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: InputDecoration(
              labelText: 'Valor a receber',
              helperText: 'Valor original: ${_money(item.servicePrice)}',
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancelar'),
            ),
            FilledButton(
              onPressed: () {
                final normalized = controller.text
                    .replaceAll('R\$', '')
                    .replaceAll(' ', '')
                    .replaceAll(',', '.');
                Navigator.pop(context, double.tryParse(normalized));
              },
              child: const Text('Confirmar'),
            ),
          ],
        ),
      );
      controller.dispose();
      if (amount == null) return;
      if (amount < 0) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Informe um valor válido.')),
          );
        }
        return;
      }
      receivedAmount = amount;
    }

    try {
      await widget.viewModel.update(item.id, {
        'status': 'concluido',
        'received_amount': receivedAmount,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Recebimento registrado: ${_money(receivedAmount)}.'),
          ),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }

  Future<void> _sendToWallet(
    AppointmentDto item, {
    int? reminderDays,
  }) async {
    var days = reminderDays;
    days ??= await showDialog<int>(
      context: context,
      builder: (context) => SimpleDialog(
        title: const Text('Quando lembrar da cobrança?'),
        children: [
          for (final value in const [15, 30, 45])
            SimpleDialogOption(
              onPressed: () => Navigator.pop(context, value),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 7),
                child: Text('Lembrar em $value dias'),
              ),
            ),
        ],
      ),
    );
    if (days == null) return;

    try {
      final now = DateTime.now();
      final reminderDate =
          now.add(Duration(days: days)).toIso8601String().split('T')[0];
      await widget.viewModel.update(item.id, {
        'status': 'em_carteira',
        'reminderDays': days,
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
    var selectedBarber = item?.barberId ?? _selectedBarberId ?? widget.user.id;
    var service = item?.serviceId ?? widget.catalog.items.first.id;
    var status = item?.status ?? 'agendado';

    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(item == null ? 'Novo horário' : 'Editar / remarcar'),
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
                if (item != null && widget.user.isManager) ...[
                  DropdownButtonFormField<String>(
                    key: ValueKey('barber-$selectedBarber'),
                    initialValue: selectedBarber,
                    items: widget.barbers.items
                        .map(
                          (barber) => DropdownMenuItem(
                            value: barber.id,
                            child: Text(barber.name),
                          ),
                        )
                        .toList(),
                    onChanged: (value) async {
                      if (value == null || value == selectedBarber) return;
                      selectedBarber = value;
                      await widget.catalog.load(value);
                      service = widget.catalog.items.firstOrNull?.id ?? '';
                      if (context.mounted) setDialogState(() {});
                    },
                    decoration:
                        const InputDecoration(labelText: 'Profissional'),
                  ),
                  const SizedBox(height: 8),
                ],
                DropdownButtonFormField<String>(
                  key: ValueKey('service-$selectedBarber-$service'),
                  initialValue: service.isEmpty ? null : service,
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
                    DropdownMenuItem(
                        value: 'agendado', child: Text('Agendado')),
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
                  decoration:
                      const InputDecoration(labelText: 'Horário (HH:MM)'),
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
              onPressed: service.isEmpty
                  ? null
                  : () => Navigator.pop(context, {
                        'barberId': selectedBarber,
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
      ),
    );

    if (_selectedBarberId != null &&
        widget.catalog.barberId != _selectedBarberId) {
      await widget.catalog.load(_selectedBarberId);
    }
    name.dispose();
    phone.dispose();
    date.dispose();
    time.dispose();
    return result;
  }
}
