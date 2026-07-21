import 'package:flutter/foundation.dart';
import '../../../data/model/appointment_dto.dart';
import '../../../domain/repositories/i_appointment_repository.dart';
class AgendaViewModel extends ChangeNotifier { AgendaViewModel(this._repository); final IAppointmentRepository _repository; List<AppointmentDto> items = const []; bool loading = false; String? error; Future<void> load({String? barberId, String? date}) async { loading = true; error = null; notifyListeners(); try { items = await _repository.list(barberId: barberId, date: date); } catch (e) { error = '$e'; } finally { loading = false; notifyListeners(); } } Future<void> finish(AppointmentDto item) async { await _repository.update(item.id, {'status': 'finalizado'}); await load(); } }
