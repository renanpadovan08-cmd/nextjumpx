import 'package:flutter/foundation.dart';
import '../../../data/model/service_dto.dart';
import '../../../domain/repositories/i_catalog_repository.dart';

class CatalogViewModel extends ChangeNotifier {
  CatalogViewModel(this._repository);
  final ICatalogRepository _repository;
  List<ServiceDto> items = const [];
  bool loading = false;
  bool loadingMore = false;
  bool hasMore = false;
  String? error;
  String? barberId;
  int page = 1;
  int total = 0;
  bool _paginated = false;

  Future<void> load([String? selectedBarberId]) async {
    _paginated = false;
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

  Future<void> loadPaginated([String? selectedBarberId]) async {
    _paginated = true;
    barberId = selectedBarberId;
    page = 1;
    total = 0;
    hasMore = false;
    loading = true;
    error = null;
    notifyListeners();
    try {
      await _loadPage(1, append: false);
    } catch (exception) {
      error = '$exception';
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> _loadPage(int targetPage, {required bool append}) async {
    var nextPage = targetPage;
    var newItems = <ServiceDto>[];
    Map<String, dynamic> response;
    do {
      response = await _repository.listPage(
        barberId: barberId,
        page: nextPage,
        pageSize: 10,
      );
      newItems = List<ServiceDto>.from(
        (response['items'] as List?) ?? const [],
      );
      page = response['page'] as int? ?? nextPage;
      total = response['total'] as int? ?? newItems.length;
      hasMore = response['hasNext'] == true;
      nextPage += 1;
    } while (newItems.isEmpty && hasMore);
    items = append ? [...items, ...newItems] : newItems;
  }

  Future<void> loadMore() async {
    if (!_paginated || loading || loadingMore || !hasMore) return;
    loadingMore = true;
    notifyListeners();
    try {
      await _loadPage(page + 1, append: true);
      error = null;
    } catch (exception) {
      error = '$exception';
    } finally {
      loadingMore = false;
      notifyListeners();
    }
  }

  Future<void> _reloadCurrent() =>
      _paginated ? loadPaginated(barberId) : load(barberId);

  Future<ServiceDto> create(Map<String, dynamic> input) async {
    final created = await _repository.create(input);
    await _reloadCurrent();
    return created;
  }

  Future<void> update(String id, Map<String, dynamic> input) async {
    await _repository.update(id, input);
    await _reloadCurrent();
  }

  Future<String> uploadImage(String id, Map<String, dynamic> input) =>
      _repository.uploadImage(id, input);

  Future<void> reorder(
      String firstId, int firstOrder, String secondId, int secondOrder) async {
    await _repository.update(firstId, {'display_order': firstOrder});
    await _repository.update(secondId, {'display_order': secondOrder});
    await _reloadCurrent();
  }

  Future<void> delete(String id) async {
    await _repository.delete(id);
    await _reloadCurrent();
  }
}
