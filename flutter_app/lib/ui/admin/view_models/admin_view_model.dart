import 'package:flutter/foundation.dart';

import '../../../domain/repositories/i_admin_repository.dart';

class AdminViewModel extends ChangeNotifier {
  AdminViewModel(this._repository);
  final IAdminRepository _repository;

  List<Map<String, dynamic>> items = [];
  List<Map<String, dynamic>> unitRequests = [];
  Map<String, dynamic> summary = const {};
  bool loading = false;
  String? error;
  int page = 1;
  int pageSize = 24;
  int filteredTotal = 0;
  int totalPages = 1;
  bool hasNext = false;
  String search = '';
  bool _unitRequestsLoaded = false;
  int _loadGeneration = 0;

  Future<List<Map<String, dynamic>>> _safeUnitRequests() async {
    try {
      return await _repository.listUnitRequests();
    } catch (_) {
      // The account panel remains available while the optional unit module
      // is unavailable or still being migrated.
      return const [];
    }
  }

  Future<void> load({int? targetPage, String? searchQuery}) async {
    final generation = ++_loadGeneration;
    final requestedPage = targetPage ?? page;
    final requestedSearch = searchQuery ?? search;
    loading = true;
    notifyListeners();
    try {
      final futures = <Future<dynamic>>[
        _repository.listShops(
          page: requestedPage,
          pageSize: pageSize,
          search: requestedSearch,
        ),
        if (!_unitRequestsLoaded) _safeUnitRequests(),
      ];
      final results = await Future.wait(futures);
      if (generation != _loadGeneration) return;
      final response = Map<String, dynamic>.from(results.first as Map);
      items = List<Map<String, dynamic>>.from(
        (response['items'] as List?) ?? const [],
      );
      summary = Map<String, dynamic>.from(
        (response['summary'] as Map?) ?? const {},
      );
      page = response['page'] as int? ?? requestedPage;
      filteredTotal = response['filteredTotal'] as int? ?? items.length;
      totalPages = response['totalPages'] as int? ?? 1;
      hasNext = response['hasNext'] == true;
      search = requestedSearch;
      if (results.length > 1) {
        unitRequests = List<Map<String, dynamic>>.from(results[1] as List);
        _unitRequestsLoaded = true;
      }
      error = null;
    } catch (exception) {
      if (generation != _loadGeneration) return;
      error = '$exception';
    }
    if (generation != _loadGeneration) return;
    loading = false;
    notifyListeners();
  }

  Future<void> nextPage() async {
    if (!loading && hasNext) await load(targetPage: page + 1);
  }

  Future<void> previousPage() async {
    if (!loading && page > 1) await load(targetPage: page - 1);
  }

  Future<void> searchFor(String value) =>
      load(targetPage: 1, searchQuery: value.trim());

  void _adjustStatusCount(String? previous, String? next) {
    const keys = {
      'ativo': 'active',
      'pendente': 'pending',
      'bloqueado': 'blocked',
    };
    final updated = Map<String, dynamic>.from(summary);
    final previousKey = keys[previous];
    final nextKey = keys[next];
    if (previousKey != null && previousKey != nextKey) {
      updated[previousKey] = ((updated[previousKey] as num?)?.toInt() ?? 0) - 1;
    }
    if (nextKey != null && previousKey != nextKey) {
      updated[nextKey] = ((updated[nextKey] as num?)?.toInt() ?? 0) + 1;
    }
    summary = updated;
  }

  Future<bool> updateAccess(String id, Map<String, dynamic> patch) async {
    try {
      final updated = await _repository.updateAccess(id, patch);
      final itemIndex = items.indexWhere((item) => '${item['id']}' == id);
      if (itemIndex >= 0) {
        final previousStatus = '${items[itemIndex]['access_status'] ?? ''}';
        items[itemIndex] = {...items[itemIndex], ...updated};
        _adjustStatusCount(
          previousStatus,
          '${items[itemIndex]['access_status'] ?? ''}',
        );
      }
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
      final index = items.indexWhere((item) => '${item['id']}' == id);
      if (index >= 0) {
        items[index] = {...items[index], 'cashPasswordConfigured': true};
      }
      error = null;
      notifyListeners();
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
      summary = {
        ...summary,
        'total': ((summary['total'] as num?)?.toInt() ?? 0) + 1,
      };
      filteredTotal += 1;
      final pages = (filteredTotal / pageSize).ceil();
      totalPages = pages < 1 ? 1 : pages;
      hasNext = page < totalPages;
      _adjustStatusCount(null, '${created['access_status'] ?? ''}');
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
      final index = items.indexWhere((item) => '${item['id']}' == id);
      if (index >= 0) {
        final settings = items[index]['settings'] is Map
            ? Map<String, dynamic>.from(items[index]['settings'] as Map)
            : <String, dynamic>{};
        items[index] = {
          ...items[index],
          'settings': {
            ...settings,
            'last_payment_at':
                DateTime.now().toIso8601String().substring(0, 10),
            'subscription_status': 'ativo',
          },
        };
      }
      error = null;
      notifyListeners();
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
      final index = items.indexWhere((item) => '${item['id']}' == id);
      if (index >= 0) {
        final previousStatus = '${items[index]['access_status'] ?? ''}';
        items[index] = {...items[index], 'access_status': 'bloqueado'};
        _adjustStatusCount(previousStatus, 'bloqueado');
      }
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
