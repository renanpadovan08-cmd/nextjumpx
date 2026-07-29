import 'package:flutter/foundation.dart';

import '../../../domain/repositories/i_admin_repository.dart';

class AdminViewModel extends ChangeNotifier {
  AdminViewModel(this._repository);
  final IAdminRepository _repository;

  List<Map<String, dynamic>> items = [];
  List<Map<String, dynamic>> unitRequests = [];
  bool loading = false;
  String? error;

  Future<void> load() async {
    loading = true;
    notifyListeners();
    try {
      items = await _repository.listShops();
      try {
        unitRequests = await _repository.listUnitRequests();
      } catch (_) {
        // The account panel still works while the optional unit migration is pending.
        unitRequests = [];
      }
      error = null;
    } catch (exception) {
      error = '$exception';
    }
    loading = false;
    notifyListeners();
  }

  Future<bool> updateAccess(String id, Map<String, dynamic> patch) async {
    try {
      final updated = await _repository.updateAccess(id, patch);
      final itemIndex = items.indexWhere((item) => '${item['id']}' == id);
      if (itemIndex >= 0) items[itemIndex] = {...items[itemIndex], ...updated};
      notifyListeners();
      return true;
    } catch (exception) {
      error = '$exception';
      notifyListeners();
      return false;
    }
  }

  Future<bool> resetPassword(String id, String password) async {
    try {
      await _repository.resetPassword(id, password);
      return true;
    } catch (exception) {
      error = '$exception';
      notifyListeners();
      return false;
    }
  }

  Future<bool> setCashPassword(String id, String password) async {
    try {
      await _repository.setCashPassword(id, password);
      await load();
      return true;
    } catch (exception) {
      error = '$exception';
      notifyListeners();
      return false;
    }
  }

  Future<bool> createAccount(Map<String, dynamic> value) async {
    try {
      final created = await _repository.createAccount(value);
      items = [created, ...items];
      error = null;
      notifyListeners();
      return true;
    } catch (exception) {
      error = '$exception';
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateSettings(String id, Map<String, dynamic> value) async {
    try {
      final updated = await _repository.updateSettings(id, value);
      final index = items.indexWhere((item) => '${item['id']}' == id);
      if (index >= 0) items[index] = updated;
      error = null;
      notifyListeners();
      return true;
    } catch (exception) {
      error = '$exception';
      notifyListeners();
      return false;
    }
  }

  Future<bool> markPaid(String id) async {
    try {
      await _repository.markPaid(id);
      await load();
      return true;
    } catch (exception) {
      error = '$exception';
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteAccount(String id) async {
    try {
      await _repository.deleteAccount(id);
      items.removeWhere((item) => '${item['id']}' == id);
      error = null;
      notifyListeners();
      return true;
    } catch (exception) {
      error = '$exception';
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateUnitRequest(String id, String status) async {
    try {
      final updated = await _repository.updateUnitRequest(id, status);
      final index = unitRequests.indexWhere((item) => '${item['id']}' == id);
      if (index >= 0) unitRequests[index] = updated;
      error = null;
      notifyListeners();
      return true;
    } catch (exception) {
      error = '$exception';
      notifyListeners();
      return false;
    }
  }
}
