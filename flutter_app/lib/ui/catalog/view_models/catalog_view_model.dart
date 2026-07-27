import 'package:flutter/foundation.dart';
import '../../../data/model/service_dto.dart';
import '../../../domain/repositories/i_catalog_repository.dart';

class CatalogViewModel extends ChangeNotifier {
  CatalogViewModel(this._repository);
  final ICatalogRepository _repository;
  List<ServiceDto> items = const [];
  bool loading = false;
  String? error;
  String? barberId;
  Future<void> load([String? selectedBarberId]) async {
    loading = true;
    error = null;
    barberId = selectedBarberId;
    notifyListeners();
    try {
      items = await _repository.list(barberId);
    } catch (e) {
      error = '$e';
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> create(Map<String, dynamic> input) async {
    await _repository.create(input);
    await load(barberId);
  }

  Future<void> update(String id, Map<String, dynamic> input) async {
    await _repository.update(id, input);
    await load(barberId);
  }

  Future<void> reorder(
      String firstId, int firstOrder, String secondId, int secondOrder) async {
    await _repository.update(firstId, {'display_order': firstOrder});
    await _repository.update(secondId, {'display_order': secondOrder});
    await load(barberId);
  }

  Future<void> delete(String id) async {
    await _repository.delete(id);
    await load(barberId);
  }
}
