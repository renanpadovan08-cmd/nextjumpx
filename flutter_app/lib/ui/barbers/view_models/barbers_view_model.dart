import 'package:flutter/foundation.dart';
import '../../../data/model/barber_dto.dart';
import '../../../domain/repositories/i_barber_repository.dart';
class BarbersViewModel extends ChangeNotifier { BarbersViewModel(this._repository); final IBarberRepository _repository; List<BarberDto> items = const []; bool loading = false; String? error; Future<void> load() async { loading = true; error = null; notifyListeners(); try { items = await _repository.list(); } catch (e) { error = '$e'; } finally { loading = false; notifyListeners(); } } Future<void> create(Map<String, dynamic> input) async { await _repository.create(input); await load(); } }
