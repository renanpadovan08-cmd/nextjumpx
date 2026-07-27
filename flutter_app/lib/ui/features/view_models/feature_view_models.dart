import 'package:flutter/foundation.dart';
import '../../../domain/use_cases/features/feature_use_cases.dart';

class FixedClientsViewModel extends ChangeNotifier {
  FixedClientsViewModel(this._load, this._pay);
  final LoadFixedClientsUseCase _load;
  final PayFixedClientUseCase _pay;
  List<dynamic> items = [];
  bool loading = false;
  String? error;
  Future<void> load() async {
    loading = true;
    notifyListeners();
    try {
      items = await _load();
      error = null;
    } catch (e) {
      error = '$e';
    }
    loading = false;
    notifyListeners();
  }

  Future<void> pay(String id) async {
    await _pay(id);
    await load();
  }

  Future<void> create(Map<String, dynamic> value) async {
    await _load.r.createFixedClient(value);
    await load();
  }

  Future<void> cancel(String code) async {
    await _load.r.cancelFixedClient(code);
    await load();
  }
}

class OperationsViewModel extends ChangeNotifier {
  OperationsViewModel(this._load);
  final LoadOperationsUseCase _load;
  dynamic data;
  bool loading = false;
  String? error;
  Future<void> load(int tab) async {
    loading = true;
    notifyListeners();
    try {
      data = await _load(tab);
      error = null;
    } catch (e) {
      error = '$e';
    }
    loading = false;
    notifyListeners();
  }

  Future<bool> saveGoal(Map<String, dynamic> body) async {
    try {
      await _load.r.saveBusinessGoal(body);
      await load(0);
      return true;
    } catch (exception) {
      error = '$exception';
      notifyListeners();
      return false;
    }
  }
}

class PublicBookingViewModel extends ChangeNotifier {
  PublicBookingViewModel(this._load);
  final LoadPublicBookingUseCase _load;
  dynamic data;
  List<dynamic> occupied = [];
  String? error;
  bool loading = false;
  Future<void> load(String login) async {
    loading = true;
    notifyListeners();
    try {
      data = await _load(login);
      occupied = [];
      error = null;
    } catch (e) {
      error = '$e';
    }
    loading = false;
    notifyListeners();
  }

  Future<void> loadAvailability(String barberId, String date) async {
    loading = true;
    notifyListeners();
    try {
      occupied = await _load.r.publicAvailability(barberId, date);
      error = null;
    } catch (e) {
      error = '$e';
    }
    loading = false;
    notifyListeners();
  }

  Future<bool> schedule(Map<String, dynamic> body) async {
    loading = true;
    notifyListeners();
    try {
      await _load.r.createPublicAppointment(body);
      await loadAvailability('${body['barberId']}', '${body['date']}');
      error = null;
      return true;
    } catch (e) {
      error = '$e';
      return false;
    } finally {
      loading = false;
      notifyListeners();
    }
  }
}
