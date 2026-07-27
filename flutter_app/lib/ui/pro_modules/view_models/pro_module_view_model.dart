import 'package:flutter/foundation.dart';
import '../../../domain/repositories/i_operations_repository.dart';
import '../pro_module_screen.dart';

class ProModuleViewModel extends ChangeNotifier {
  ProModuleViewModel(this._repository);
  final IOperationsRepository _repository;
  dynamic data;
  bool loading = false;
  String? error;

  String? _feature(ProModule module) => switch (module) {
        ProModule.wallet => 'wallet',
        ProModule.pending => 'pending',
        ProModule.commissions => 'commissions',
        ProModule.reports => 'commissions',
        ProModule.retention => 'retention',
        ProModule.cash => 'cash',
        ProModule.whatsapp => 'whatsapp',
        ProModule.profile => 'profile',
        ProModule.hours => 'hours',
        _ => null,
      };

  Future<void> load(ProModule module) async {
    final feature = _feature(module);
    if (feature == null && module != ProModule.units) return;
    loading = true;
    notifyListeners();
    try {
      data = module == ProModule.units
          ? await _repository.units()
          : await _repository.get(feature!);
      error = null;
    } catch (exception) {
      error = '$exception';
    }
    loading = false;
    notifyListeners();
  }

  Future<bool> createUnit(Map<String, dynamic> body) async {
    try {
      await _repository.createUnit(body);
      await load(ProModule.units);
      return true;
    } catch (exception) {
      error = '$exception';
      notifyListeners();
      return false;
    }
  }

  Future<bool> createCashEntry(Map<String, dynamic> body) async {
    try {
      await _repository.createCashEntry(body);
      await load(ProModule.cash);
      return true;
    } catch (exception) {
      error = '$exception';
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteCashEntry(String id) async {
    try {
      await _repository.deleteCashEntry(id);
      await load(ProModule.cash);
      return true;
    } catch (exception) {
      error = '$exception';
      notifyListeners();
      return false;
    }
  }

  Future<bool> createRetentionAction(Map<String, dynamic> body) async {
    try {
      await _repository.createRetentionAction(body);
      await load(ProModule.retention);
      return true;
    } catch (exception) {
      error = '$exception';
      notifyListeners();
      return false;
    }
  }

  Future<bool> action(
      ProModule module, String id, Map<String, dynamic> body) async {
    final feature = _feature(module);
    if (feature == null) return false;
    try {
      await _repository.patch(feature, id, body);
      await load(module);
      return true;
    } catch (exception) {
      error = '$exception';
      notifyListeners();
      return false;
    }
  }

  Future<bool> saveCommission(String barberId, num commissionRate) async {
    try {
      await _repository
          .patchBarber(barberId, {'commissionRate': commissionRate});
      await load(ProModule.commissions);
      return true;
    } catch (exception) {
      error = '$exception';
      notifyListeners();
      return false;
    }
  }

  Future<bool> saveCurrent(ProModule module, Map<String, dynamic> body) async {
    final feature = _feature(module);
    if (feature == null) return false;
    try {
      await _repository.patchCurrent(feature, body);
      await load(module);
      return true;
    } catch (exception) {
      error = '$exception';
      notifyListeners();
      return false;
    }
  }
}
