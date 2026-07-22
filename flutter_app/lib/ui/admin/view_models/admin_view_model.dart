import 'package:flutter/foundation.dart';

import '../../../domain/repositories/i_admin_repository.dart';

class AdminViewModel extends ChangeNotifier {
  AdminViewModel(this._repository);
  final IAdminRepository _repository;

  List<Map<String, dynamic>> items = [];
  bool loading = false;
  String? error;

  Future<void> load() async {
    loading = true;
    notifyListeners();
    try {
      items = await _repository.listShops();
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
}
