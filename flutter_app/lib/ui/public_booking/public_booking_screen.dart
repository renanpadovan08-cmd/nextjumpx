import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/theme/zen_colors.dart';
import '../core/widgets/zen_card.dart';
import '../core/widgets/zen_page.dart';
import '../features/view_models/feature_view_models.dart';

class PublicBookingScreen extends StatefulWidget {
  const PublicBookingScreen({
    super.key,
    required this.viewModel,
    this.initialLogin = '',
  });

  final PublicBookingViewModel viewModel;
  final String initialLogin;

  @override
  State<PublicBookingScreen> createState() => _PublicBookingScreenState();
}

class _PublicBookingScreenState extends State<PublicBookingScreen> {
  late final TextEditingController _login;
  final _clientName = TextEditingController();
  final _clientPhone = TextEditingController();
  final _date = TextEditingController(
    text: DateTime.now().toIso8601String().substring(0, 10),
  );
  String? _barberId;
  String? _serviceId;
  String? _time;

  @override
  void initState() {
    super.initState();
    _login = TextEditingController(text: widget.initialLogin);
    widget.viewModel.addListener(_refresh);
    if (widget.initialLogin.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _openCatalog());
    }
  }

  @override
  void dispose() {
    widget.viewModel.removeListener(_refresh);
    _login.dispose();
    _clientName.dispose();
    _clientPhone.dispose();
    _date.dispose();
    super.dispose();
  }

  void _refresh() {
    if (mounted) setState(() {});
  }

  List<Map<String, dynamic>> get _barbers =>
      List<Map<String, dynamic>>.from(widget.viewModel.data?['barbers'] ?? []);

  List<Map<String, dynamic>> get _allServices =>
      List<Map<String, dynamic>>.from(widget.viewModel.data?['services'] ?? []);

  List<Map<String, dynamic>> get _services => _allServices
      .where((service) => '${service['barber_id']}' == _barberId)
      .toList();

  Map<String, dynamic>? get _barber {
    for (final barber in _barbers) {
      if ('${barber['id']}' == _barberId) return barber;
    }
    return null;
  }

  Map<String, dynamic>? get _service {
    for (final service in _services) {
      if ('${service['id']}' == _serviceId) return service;
    }
    return null;
  }

  Future<void> _openCatalog() async {
    final login = _login.text.trim();
    if (login.isEmpty) return;
    await widget.viewModel.load(login);
    if (!mounted || widget.viewModel.data == null) return;
    _barberId = _barbers.isEmpty ? null : '${_barbers.first['id']}';
    _serviceId = _services.isEmpty ? null : '${_services.first['id']}';
    _time = null;
    await _loadAvailability();
  }

  Future<void> _selectBarber(String id) async {
    setState(() {
      _barberId = id;
      _serviceId = _services.isEmpty ? null : '${_services.first['id']}';
      _time = null;
    });
    await _loadAvailability();
  }

  Future<void> _selectService(String id) async {
    setState(() {
      _serviceId = id;
      _time = null;
    });
    await _loadAvailability();
  }

  Future<void> _loadAvailability() async {
    if (_barberId == null || _date.text.isEmpty) return;
    await widget.viewModel.loadAvailability(_barberId!, _date.text);
  }

  int _minutes(String value) {
    final parts = value.split(':').map(int.tryParse).toList();
    return (parts.first ?? 0) * 60 + (parts.length > 1 ? parts[1] ?? 0 : 0);
  }

  String _timeLabel(int minutes) =>
      '${(minutes ~/ 60).toString().padLeft(2, '0')}:${(minutes % 60).toString().padLeft(2, '0')}';

  Map<String, dynamic> _scheduleForDate(Map<String, dynamic> barber) {
    final fallback = <String, dynamic>{
      'open': true,
      'start': '${barber['work_start'] ?? '08:00'}',
      'end': '${barber['work_end'] ?? '20:00'}',
      'break_start': '${barber['break_start'] ?? ''}',
      'break_end': '${barber['break_end'] ?? ''}',
    };
    final raw = '${barber['off_days'] ?? ''}';
    final day = DateTime.tryParse(_date.text)?.weekday.remainder(7) ?? 0;
    if (raw.startsWith('SCHEDULE_JSON:')) {
      try {
        final parsed = jsonDecode(raw.substring('SCHEDULE_JSON:'.length));
        if (parsed is List && day < parsed.length && parsed[day] is Map) {
          return {...fallback, ...Map<String, dynamic>.from(parsed[day])};
        }
      } catch (_) {
        return fallback;
      }
    }
    final closed = raw.split(',').map((value) => value.trim()).contains('$day');
    return {...fallback, 'open': !closed};
  }

  List<String> get _availableSlots {
    final barber = _barber;
    final service = _service;
    if (barber == null || service == null) return [];
    final schedule = _scheduleForDate(barber);
    if (schedule['open'] == false) return [];
    final duration = (service['duration'] as num?)?.toInt() ?? 30;
    final start = _minutes('${schedule['start'] ?? '08:00'}');
    final end = _minutes('${schedule['end'] ?? '20:00'}');
    final breakStart = _minutes('${schedule['break_start'] ?? ''}');
    final breakEnd = _minutes('${schedule['break_end'] ?? ''}');
    final hasBreak = '${schedule['break_start'] ?? ''}'.isNotEmpty &&
        '${schedule['break_end'] ?? ''}'.isNotEmpty;
    final selectedDate = DateTime.tryParse(_date.text);
    final now = DateTime.now();

    bool overlaps(int firstStart, int firstDuration, int secondStart,
            int secondDuration) =>
        firstStart < secondStart + secondDuration &&
        firstStart + firstDuration > secondStart;

    return [
      for (var value = start; value + duration <= end; value += 15)
        if (!(selectedDate != null &&
                DateUtils.isSameDay(selectedDate, now) &&
                value <= now.hour * 60 + now.minute) &&
            !(hasBreak &&
                overlaps(value, duration, breakStart, breakEnd - breakStart)) &&
            !widget.viewModel.occupied.any((row) => overlaps(
                  value,
                  duration,
                  _minutes('${row['time']}'),
                  (row['services']?['duration'] as num?)?.toInt() ?? 30,
                )))
          _timeLabel(value),
    ];
  }

  Future<void> _pickDate() async {
    final current = DateTime.tryParse(_date.text) ?? DateTime.now();
    final selected = await showDatePicker(
      context: context,
      initialDate: current.isBefore(DateTime.now()) ? DateTime.now() : current,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (selected == null) return;
    _date.text = selected.toIso8601String().substring(0, 10);
    _time = null;
    await _loadAvailability();
  }

  Future<void> _schedule() async {
    if (_barberId == null ||
        _serviceId == null ||
        _time == null ||
        _clientName.text.trim().isEmpty) {
      _message('Escolha profissional, serviço e horário e informe seu nome.');
      return;
    }
    final ok = await widget.viewModel.schedule({
      'barberId': _barberId,
      'serviceId': _serviceId,
      'clientName': _clientName.text.trim(),
      'clientPhone': _clientPhone.text.trim(),
      'date': _date.text,
      'time': _time,
    });
    if (!mounted) return;
    if (ok) {
      _message('Agendamento confirmado com sucesso.');
      _clientName.clear();
      _clientPhone.clear();
      setState(() => _time = null);
    } else {
      _message(widget.viewModel.error ?? 'Não foi possível agendar.');
    }
  }

  void _message(String message) => ScaffoldMessenger.of(context)
      .showSnackBar(SnackBar(content: Text(message)));

  @override
  Widget build(BuildContext context) {
    final data = widget.viewModel.data;
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: ZenPage(
          title: 'Agendamento público',
          children: [
            if (widget.initialLogin.isEmpty)
              ZenCard(
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _login,
                        decoration: const InputDecoration(
                          labelText: 'Login público da barbearia',
                        ),
                        onSubmitted: (_) => _openCatalog(),
                      ),
                    ),
                    const SizedBox(width: 10),
                    FilledButton(
                      onPressed: widget.viewModel.loading ? null : _openCatalog,
                      child: const Text('Abrir'),
                    ),
                  ],
                ),
              ),
            if (widget.viewModel.error != null) ...[
              const SizedBox(height: 12),
              ZenCard(child: Text(widget.viewModel.error!)),
            ],
            if (widget.viewModel.loading && data == null)
              const Padding(
                padding: EdgeInsets.all(40),
                child: Center(child: CircularProgressIndicator()),
              ),
            if (data != null) ...[
              _catalogHeader(data),
              const SizedBox(height: 14),
              _professionalPicker(),
              const SizedBox(height: 14),
              _servicePicker(),
              const SizedBox(height: 14),
              _dateAndSlots(),
              const SizedBox(height: 14),
              _clientForm(),
            ],
          ],
        ),
      ),
    );
  }

  Widget _catalogHeader(dynamic data) {
    final owner = Map<String, dynamic>.from(data['owner'] as Map);
    final logoUrl = '${owner['photo_url'] ?? ''}'.trim();
    final backgroundUrl = '${owner['background_url'] ?? ''}'.trim();
    return ZenCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (backgroundUrl.isNotEmpty) ...[
            ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: AspectRatio(
                aspectRatio: 16 / 6,
                child: Image.network(
                  backgroundUrl,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                ),
              ),
            ),
            const SizedBox(height: 14),
          ],
          Row(
            children: [
              CircleAvatar(
                radius: 30,
                backgroundColor: ZenColors.green.withValues(alpha: .16),
                child: logoUrl.isEmpty
                    ? const Icon(
                        Icons.storefront,
                        color: ZenColors.green,
                        size: 30,
                      )
                    : ClipOval(
                        child: Image.network(
                          logoUrl,
                          width: 60,
                          height: 60,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => const Icon(
                            Icons.storefront,
                            color: ZenColors.green,
                            size: 30,
                          ),
                        ),
                      ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  '${owner['shop_name']}',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Text(
            'Escolha profissional, serviço, data e horário.',
            style: TextStyle(color: ZenColors.muted),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: _copyPublicLink,
            icon: const Icon(Icons.link),
            label: const Text('Copiar link para compartilhar'),
          ),
        ],
      ),
    );
  }

  Future<void> _copyPublicLink() async {
    final current = Uri.base;
    final base = current.hasScheme
        ? '${current.scheme}://${current.authority}${current.path}'
        : '';
    final link = '$base#book/${Uri.encodeComponent(_login.text.trim())}';
    await Clipboard.setData(ClipboardData(text: link));
    if (mounted) _message('Link público copiado.');
  }

  Widget _professionalPicker() => ZenCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('1. Profissional',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final barber in _barbers)
                  ChoiceChip(
                    avatar: '${barber['photo_url'] ?? ''}'.trim().isEmpty
                        ? const Icon(Icons.person, size: 18)
                        : CircleAvatar(
                            child: ClipOval(
                              child: Image.network(
                                '${barber['photo_url']}',
                                width: 32,
                                height: 32,
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) =>
                                    const Icon(Icons.person, size: 18),
                              ),
                            ),
                          ),
                    label: Text('${barber['name']}'),
                    selected: _barberId == '${barber['id']}',
                    onSelected: (_) => _selectBarber('${barber['id']}'),
                  ),
              ],
            ),
          ],
        ),
      );

  Widget _servicePicker() => ZenCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('2. Serviço',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
            const SizedBox(height: 10),
            if (_services.isEmpty)
              const Text('Nenhum serviço público para este profissional.')
            else
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final service in _services)
                    ChoiceChip(
                      label: Text(
                        '${service['name']} · R\$ ${((service['price'] as num?) ?? 0).toStringAsFixed(2)}',
                      ),
                      selected: _serviceId == '${service['id']}',
                      onSelected: (_) => _selectService('${service['id']}'),
                    ),
                ],
              ),
          ],
        ),
      );

  Widget _dateAndSlots() {
    final slots = _availableSlots;
    return ZenCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('3. Data e horário',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
          const SizedBox(height: 10),
          TextField(
            controller: _date,
            readOnly: true,
            onTap: _pickDate,
            decoration: const InputDecoration(
              labelText: 'Data',
              suffixIcon: Icon(Icons.calendar_month),
            ),
          ),
          const SizedBox(height: 12),
          if (widget.viewModel.loading)
            const Center(child: CircularProgressIndicator())
          else if (slots.isEmpty)
            const Text('Não há horários livres nesta data.')
          else
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final slot in slots)
                  ChoiceChip(
                    label: Text(slot),
                    selected: _time == slot,
                    onSelected: (_) => setState(() => _time = slot),
                  ),
              ],
            ),
        ],
      ),
    );
  }

  Widget _clientForm() => ZenCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('4. Seus dados',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
            const SizedBox(height: 10),
            TextField(
              controller: _clientName,
              decoration: const InputDecoration(labelText: 'Nome'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _clientPhone,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'WhatsApp'),
            ),
            const SizedBox(height: 14),
            FilledButton.icon(
              onPressed: widget.viewModel.loading ? null : _schedule,
              icon: const Icon(Icons.check_circle_outline),
              label: const Text('Confirmar agendamento'),
            ),
          ],
        ),
      );
}
