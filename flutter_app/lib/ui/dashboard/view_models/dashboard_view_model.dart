import 'package:flutter/foundation.dart';
import '../../../data/model/dashboard_dto.dart';
import '../../../domain/repositories/i_dashboard_repository.dart';
class DashboardViewModel extends ChangeNotifier { DashboardViewModel(this._repository); final IDashboardRepository _repository; DashboardDto? data; bool loading = false; String? error; Future<void> load([String? month]) async { loading = true; error = null; notifyListeners(); try { data = await _repository.load(month ?? DateTime.now().toIso8601String().substring(0, 7)); } catch (e) { error = '$e'; } finally { loading = false; notifyListeners(); } } }
