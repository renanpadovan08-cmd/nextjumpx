import 'dart:convert';

import 'package:flutter/foundation.dart';
import '../../../domain/repositories/i_operations_repository.dart';
import '../pro_module_screen.dart';

class ProModuleViewModel extends ChangeNotifier {
  ProModuleViewModel(this._repository);
  final IOperationsRepository _repository;
  dynamic data;
  bool loading = false;
  bool uploading = false;
  String? error;
  String lastCashCsv = '';
  String lastCashAuditCsv = '';
  bool cashConfigured = false;
  bool cashUnlocked = false;
  bool loadingMore = false;
  bool hasMore = false;
  int page = 1;
  int total = 0;
  List<Map<String, dynamic>> supportConversations = [];
  List<Map<String, dynamic>> supportMessages = [];
  String? activeConversationId;

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

  bool _isPaginated(ProModule module) => const {
        ProModule.wallet,
        ProModule.whatsapp,
        ProModule.pending,
        ProModule.retention,
      }.contains(module);

  void _applyPage(
    ProModule module,
    Map<String, dynamic> response, {
    required bool append,
  }) {
    final incoming = List<Map<String, dynamic>>.from(
      (response[module == ProModule.retention ? 'risk' : 'items'] as List?) ??
          const [],
    );
    if (module == ProModule.retention) {
      final previous = append && data is Map
          ? List<Map<String, dynamic>>.from(
              ((data as Map)['risk'] as List?) ?? const [],
            )
          : <Map<String, dynamic>>[];
      data = {
        ...response,
        'risk': [...previous, ...incoming],
      };
    } else if (module == ProModule.whatsapp) {
      final previous = append && data is Map
          ? Map<String, dynamic>.from(data as Map)
          : <String, dynamic>{};
      final today = List<Map<String, dynamic>>.from(
        (previous['today'] as List?) ?? const [],
      );
      final tomorrow = List<Map<String, dynamic>>.from(
        (previous['tomorrow'] as List?) ?? const [],
      );
      final wallet = List<Map<String, dynamic>>.from(
        (previous['wallet'] as List?) ?? const [],
      );
      for (final row in incoming) {
        switch ('${row['_period'] ?? ''}') {
          case 'Carteira':
            wallet.add(row);
            break;
          case 'Hoje':
            today.add(row);
            break;
          default:
            tomorrow.add(row);
        }
      }
      data = {
        'today': today,
        'tomorrow': tomorrow,
        'wallet': wallet,
      };
    } else {
      final previous = append && data is List
          ? List<Map<String, dynamic>>.from(data as List)
          : <Map<String, dynamic>>[];
      data = [...previous, ...incoming];
    }
    page = response['page'] as int? ?? page;
    total = response['total'] as int? ?? incoming.length;
    hasMore = response['hasNext'] == true;
  }

  Future<void> load(ProModule module) async {
    final feature = _feature(module);
    if (feature == null &&
        module != ProModule.units &&
        module != ProModule.support &&
        module != ProModule.updates) {
      return;
    }
    loading = true;
    if (_isPaginated(module)) {
      page = 1;
      total = 0;
      hasMore = false;
    }
    notifyListeners();
    try {
      if (module == ProModule.cash) {
        final access = await _repository.cashAccess();
        cashConfigured = access['configured'] == true;
        if (!cashConfigured || !cashUnlocked) {
          data = {
            'accessConfigured': cashConfigured,
            'locked': cashConfigured,
          };
        } else {
          data = await _repository.get('cash');
        }
      } else if (module == ProModule.units) {
        data = await _repository.unitConfiguration();
      } else if (module == ProModule.support) {
        await _loadSupport();
      } else if (module == ProModule.updates) {
        data = await _repository.updates();
      } else if (_isPaginated(module)) {
        final response = Map<String, dynamic>.from(
          await _repository.get(feature!, query: const {
            'page': '1',
            'pageSize': '10',
          }) as Map,
        );
        _applyPage(module, response, append: false);
      } else {
        data = await _repository.get(feature!);
      }
      error = null;
    } catch (exception) {
      if (module == ProModule.cash && cashUnlocked) {
        cashUnlocked = false;
        _repository.setCashToken(null);
        data = {
          'accessConfigured': cashConfigured,
          'locked': cashConfigured,
        };
      }
      error = '$exception';
    }
    loading = false;
    notifyListeners();
  }

  Future<void> loadMore(ProModule module) async {
    final feature = _feature(module);
    if (!_isPaginated(module) ||
        feature == null ||
        loading ||
        loadingMore ||
        !hasMore) {
      return;
    }
    loadingMore = true;
    notifyListeners();
    try {
      final response = Map<String, dynamic>.from(
        await _repository.get(feature, query: {
          'page': '${page + 1}',
          'pageSize': '10',
        }) as Map,
      );
      _applyPage(module, response, append: true);
      error = null;
    } catch (exception) {
      error = '$exception';
    } finally {
      loadingMore = false;
      notifyListeners();
    }
  }

  Future<void> _loadSupport() async {
    supportConversations = List<Map<String, dynamic>>.from(
        await _repository.supportConversations());
    activeConversationId ??= supportConversations.isEmpty
        ? null
        : '${supportConversations.first['id']}';
    if (activeConversationId != null) {
      supportMessages = List<Map<String, dynamic>>.from(
          await _repository.supportMessages(activeConversationId!));
    } else {
      supportMessages = [];
    }
    data = {
      'conversations': supportConversations,
      'messages': supportMessages,
    };
  }

  Future<void> selectSupportConversation(String id) async {
    activeConversationId = id;
    loading = true;
    notifyListeners();
    try {
      supportMessages = List<Map<String, dynamic>>.from(
          await _repository.supportMessages(id));
      error = null;
    } catch (exception) {
      error = '$exception';
    }
    loading = false;
    notifyListeners();
  }

  Future<bool> sendSupportMessage(
    String body, {
    String? attachmentUrl,
  }) async {
    final conversationId = activeConversationId;
    if (conversationId == null ||
        (body.trim().isEmpty &&
            (attachmentUrl == null || attachmentUrl.isEmpty))) {
      return false;
    }
    try {
      await _repository.sendSupportMessage(conversationId, {
        'body': body.trim(),
        if (attachmentUrl != null && attachmentUrl.isNotEmpty)
          'attachmentUrl': attachmentUrl,
      });
      await selectSupportConversation(conversationId);
      return true;
    } catch (exception) {
      error = '$exception';
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateSupportConversation(Map<String, dynamic> body) async {
    final conversationId = activeConversationId;
    if (conversationId == null) return false;
    try {
      await _repository.updateSupportConversation(conversationId, body);
      await load(ProModule.support);
      return true;
    } catch (exception) {
      error = '$exception';
      notifyListeners();
      return false;
    }
  }

  Future<void> markUpdateViewed(String id) async {
    try {
      await _repository.markUpdateViewed(id);
      await load(ProModule.updates);
    } catch (exception) {
      error = '$exception';
      notifyListeners();
    }
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

  Future<bool> updateCashEntry(String id, Map<String, dynamic> body) async {
    try {
      await _repository.updateCashEntry(id, body);
      await load(ProModule.cash);
      return true;
    } catch (exception) {
      error = '$exception';
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteCashEntry(String id, String reason) async {
    try {
      await _repository.deleteCashEntry(id, reason);
      await load(ProModule.cash);
      return true;
    } catch (exception) {
      error = '$exception';
      notifyListeners();
      return false;
    }
  }

  Future<bool> disableCashRecurrence(String id, String reason) async {
    try {
      await _repository.disableCashRecurrence(id, reason);
      await load(ProModule.cash);
      return true;
    } catch (exception) {
      error = '$exception';
      notifyListeners();
      return false;
    }
  }

  Future<bool> generateCashAuditReport(String month) async {
    try {
      final result = await _repository.cashAuditReport(month);
      lastCashAuditCsv = '${result['csv'] ?? ''}';
      error = null;
      notifyListeners();
      return true;
    } catch (exception) {
      error = '$exception';
      notifyListeners();
      return false;
    }
  }

  Future<bool> createCashClosure(String month) async {
    try {
      final result = await _repository.createCashClosure({'month': month});
      lastCashCsv = result is Map ? '${result['csv'] ?? ''}' : '';
      await load(ProModule.cash);
      return true;
    } catch (exception) {
      error = '$exception';
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateCashReceipt(String id, Map<String, dynamic> body) async {
    try {
      await _repository.updateCashReceipt(id, body);
      await load(ProModule.cash);
      return true;
    } catch (exception) {
      error = '$exception';
      notifyListeners();
      return false;
    }
  }

  Future<bool> assignBarberUnit(String barberId, String? unitId) async {
    try {
      await _repository.assignBarberUnit(barberId, unitId);
      await load(ProModule.units);
      return true;
    } catch (exception) {
      error = '$exception';
      notifyListeners();
      return false;
    }
  }

  Future<String?> createBackupJson() async {
    try {
      return jsonEncode(await _repository.backup());
    } catch (exception) {
      error = '$exception';
      notifyListeners();
      return null;
    }
  }

  Future<Map<String, dynamic>?> backupData() async {
    try {
      return Map<String, dynamic>.from(
        await _repository.backup() as Map,
      );
    } catch (exception) {
      error = '$exception';
      notifyListeners();
      return null;
    }
  }

  Future<bool> createHoursClosure(Map<String, dynamic> body) async {
    try {
      await _repository.createHoursClosure(body);
      await load(ProModule.hours);
      return true;
    } catch (exception) {
      error = '$exception';
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteHoursClosure(String id) async {
    try {
      await _repository.deleteHoursClosure(id);
      await load(ProModule.hours);
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

  Future<String?> uploadImage(Map<String, dynamic> body) async {
    uploading = true;
    error = null;
    notifyListeners();
    try {
      final result = await _repository.uploadImage(body);
      return result is Map ? '${result['url'] ?? ''}' : null;
    } catch (exception) {
      error = '$exception';
      return null;
    } finally {
      uploading = false;
      notifyListeners();
    }
  }

  void restoreCashToken(String token) {
    if (token.isEmpty) return;
    _repository.setCashToken(token);
    cashUnlocked = true;
  }

  Future<String?> unlockCash(String password) async {
    try {
      final token = await _repository.unlockCash(password);
      if (token.isEmpty) return null;
      cashUnlocked = true;
      error = null;
      await load(ProModule.cash);
      return token;
    } catch (exception) {
      error = '$exception';
      notifyListeners();
      return null;
    }
  }

  void lockCash() {
    _repository.setCashToken(null);
    cashUnlocked = false;
    data = {
      'accessConfigured': cashConfigured,
      'locked': cashConfigured,
    };
    notifyListeners();
  }
}
