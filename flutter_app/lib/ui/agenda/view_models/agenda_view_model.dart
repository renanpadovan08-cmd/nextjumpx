import 'package:flutter/foundation.dart';
import '../../../data/model/appointment_dto.dart';
import '../../../domain/repositories/i_appointment_repository.dart';

class AgendaViewModel extends ChangeNotifier {
  AgendaViewModel(this._repository);

  final IAppointmentRepository _repository;
  List<AppointmentDto> items = const [];
  bool loading = false;
  String? error;
  String selectedDate = DateTime.now().toIso8601String().substring(0, 10);
  String? selectedBarberId;
  List<Map<String, dynamic>> lastAffectedByBlock = const [];

  Future<void> load({
    String? barberId,
    String? date,
    bool allBarbers = false,
  }) async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      selectedDate = date ?? selectedDate;
      if (allBarbers) {
        selectedBarberId = null;
      } else if (barberId != null) {
        selectedBarberId = barberId;
      }
      items = await _repository.list(
        barberId: selectedBarberId,
        date: selectedDate,
      );
    } catch (e) {
      error = '$e';
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> setDate(String date) async {
    if (selectedDate == date) return;
    selectedDate = date;
    await load(date: date);
  }

  int get appointmentCount => items.length;

  num get revenue => items
      .where((item) => ['agendado', 'encaixe', 'em_andamento', 'concluido']
          .contains(item.status))
      .fold(0, (total, item) => total + item.servicePrice);

  int get totalMinutes =>
      items.fold(0, (total, item) => total + item.serviceDuration);

  bool get isToday =>
      selectedDate == DateTime.now().toIso8601String().substring(0, 10);

  int _minutes(String time) {
    final parts = time.split(':').map(int.tryParse).toList();
    final hours = parts[0] ?? 0;
    final minutes = parts.length > 1 ? parts[1] ?? 0 : 0;
    return hours * 60 + minutes;
  }

  int get _nowMinutes {
    final now = DateTime.now();
    return now.hour * 60 + now.minute;
  }

  List<AppointmentDto> get overdueUnconfirmed {
    if (!isToday) return [];
    return items.where((item) {
      if (!['agendado', 'encaixe'].contains(item.status)) return false;
      if (item.status == 'bloqueio') return false;
      return _minutes(item.time) + 15 < _nowMinutes;
    }).toList();
  }

  AppointmentDto? get nextAppointment {
    final now = _nowMinutes;
    final candidates = items.where((item) {
      if (item.status == 'bloqueio') return false;
      return ['agendado', 'encaixe', 'em_andamento'].contains(item.status);
    }).toList();
    if (candidates.isEmpty) return null;
    final upcoming = candidates
        .where((item) => _minutes(item.time) + item.serviceDuration >= now)
        .toList();
    if (upcoming.isNotEmpty) {
      upcoming.sort((a, b) => a.time.compareTo(b.time));
      return upcoming.first;
    }
    candidates.sort((a, b) => a.time.compareTo(b.time));
    return candidates.first;
  }

  List<AppointmentDto> get pastAppointments {
    if (!isToday) return [];
    return items
        .where(
            (item) => _minutes(item.time) + item.serviceDuration < _nowMinutes)
        .toList();
  }

  Map<String, List<AppointmentDto>> get groupedAppointments {
    final groups = <String, List<AppointmentDto>>{};
    for (final item in items) {
      if (item.status == 'bloqueio') continue;
      final label = _periodLabel(item.time);
      groups.putIfAbsent(label, () => []).add(item);
    }
    for (final list in groups.values) {
      list.sort((a, b) => a.time.compareTo(b.time));
    }
    return {
      '☀️ Manhã': groups['☀️ Manhã'] ?? [],
      '🌤️ Tarde': groups['🌤️ Tarde'] ?? [],
      '🌙 Noite': groups['🌙 Noite'] ?? [],
    };
  }

  String _periodLabel(String time) {
    final minutes = _minutes(time);
    if (minutes < 12 * 60) return '☀️ Manhã';
    if (minutes < 18 * 60) return '🌤️ Tarde';
    return '🌙 Noite';
  }

  Future<void> finish(AppointmentDto item) async {
    await _repository.update(item.id, {'status': 'concluido'});
    await load();
  }

  Future<void> create(Map<String, dynamic> value) async {
    await _repository.create(value);
    await load();
  }

  Future<void> update(String id, Map<String, dynamic> value) async {
    await _repository.update(id, value);
    await load();
  }

  Future<void> createSelfClosure(Map<String, dynamic> value) async {
    final result = await _repository.createSelfClosure(value);
    lastAffectedByBlock = List<Map<String, dynamic>>.from(
      (result['affected'] as List?) ?? const [],
    );
    await load();
  }
}
