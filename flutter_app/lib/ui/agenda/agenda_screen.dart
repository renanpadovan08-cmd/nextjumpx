import 'package:flutter/material.dart';

import '../../data/model/auth_user_dto.dart';
import '../catalog/view_models/catalog_view_model.dart';
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
  });

  final AuthUserDto user;
  final AgendaViewModel viewModel;
  final CatalogViewModel catalog;

  @override
  State<AgendaScreen> createState() => _AgendaScreenState();
}

class _AgendaScreenState extends State<AgendaScreen> {
  @override
  void initState() {
    super.initState();
    widget.viewModel
      ..addListener(_refresh)
      ..load();
    widget.catalog
      ..addListener(_refresh)
      ..load(widget.user.id);
  }

  @override
  void dispose() {
    widget.viewModel.removeListener(_refresh);
    widget.catalog.removeListener(_refresh);
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
          if (widget.viewModel.items.isEmpty)
            const ZenEmptyState(
              message: 'Nenhum horário para este dia',
              icon: Icons.calendar_today,
            ),
          ...widget.viewModel.items.map(
            (item) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: ZenCard(
                child: ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: ZenColors.green.withValues(alpha: .12),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Text(
                      item.time,
                      style: const TextStyle(fontWeight: FontWeight.w900),
                    ),
                  ),
                  title: Text(
                    item.clientName,
                    style: const TextStyle(fontWeight: FontWeight.w900),
                  ),
                  subtitle: Text(
                    '${item.date} · ${item.serviceName}',
                    style: const TextStyle(color: ZenColors.muted),
                  ),
                  trailing: Wrap(
                    spacing: 6,
                    children: [
                      if (item.status != 'concluido' &&
                          item.status != 'finalizado')
                        FilledButton(
                          onPressed: () => widget.viewModel.finish(item),
                          child: const Text('Finalizar'),
                        ),
                      IconButton(
                        onPressed: () => _cancel(item.id),
                        icon: const Icon(
                          Icons.cancel_outlined,
                          color: ZenColors.red,
                        ),
                        tooltip: 'Cancelar',
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _create() async {
    if (widget.catalog.items.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Cadastre ao menos um serviço antes de agendar.')),
      );
      return;
    }

    final name = TextEditingController();
    final phone = TextEditingController();
    final date = TextEditingController(
      text: DateTime.now().toIso8601String().substring(0, 10),
    );
    final time = TextEditingController(text: '09:00');
    var service = widget.catalog.items.first.id;

    final data = await showDialog<Map<String, String>>(
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
              TextField(
                  controller: date,
                  decoration:
                      const InputDecoration(labelText: 'Data (AAAA-MM-DD)')),
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
              'date': date.text.trim(),
              'time': time.text.trim(),
              'service': service,
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
        'barberId': widget.user.id,
        'serviceId': data['service'],
        'clientName': data['name'],
        'clientPhone': data['phone'],
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
}
