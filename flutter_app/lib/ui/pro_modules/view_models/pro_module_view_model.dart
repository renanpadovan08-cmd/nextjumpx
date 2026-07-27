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

  Future<void> load(ProModule module) async {
    final feature = _feature(module);
    if (feature == null &&
        module != ProModule.units &&
        module != ProModule.support &&
        module != ProModule.updates) {
      return;
    }
    loading = true;
    notifyListeners();
    try {
      if (module == ProModule.units) {
        data = await _repository.units();
      } else if (module == ProModule.support) {
        await _loadSupport();
      } else if (module == ProModule.updates) {
        data = await _repository.updates();
      } else {
        data = await _repository.get(feature!);
      }
      error = null;
    } catch (exception) {
      error = '$exception';
    }
    loading = false;
    notifyListeners();
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

  Future<bool> createCashClosure(String month) async {
    try {
      await _repository.createCashClosure({'month': month});
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
}
