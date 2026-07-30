import 'package:flutter_test/flutter_test.dart';
import 'package:zenbarber/domain/repositories/i_admin_repository.dart';
import 'package:zenbarber/ui/admin/view_models/admin_view_model.dart';

class _AdminRepositoryFake implements IAdminRepository {
  final List<int> requestedPages = [];
  final List<String> deletedIds = [];

  @override
  Future<Map<String, dynamic>> listShops({
    int page = 1,
    int pageSize = 10,
    String search = '',
  }) async {
    requestedPages.add(page);
    return {
      'items': [
        {
          'id': 'shop-$page',
          'shop_name': 'Barbearia $page',
          'access_status': 'ativo',
        },
      ],
      'page': page,
      'pageSize': pageSize,
      'filteredTotal': 20,
      'totalPages': 2,
      'hasNext': page < 2,
      'summary': {
        'total': 20,
        'active': 12,
        'pending': 5,
        'blocked': 3,
      },
    };
  }

  @override
  Future<List<Map<String, dynamic>>> listUnitRequests() async => const [];

  @override
  Future<void> deleteAccount(String barberId) async {
    deletedIds.add(barberId);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  test('admin acrescenta a próxima página ao chegar no fim', () async {
    final repository = _AdminRepositoryFake();
    final viewModel = AdminViewModel(repository);

    await viewModel.load();
    expect(viewModel.page, 1);
    expect(viewModel.items.single['id'], 'shop-1');
    expect(viewModel.hasNext, isTrue);
    expect(viewModel.summary['total'], 20);

    await viewModel.nextPage();
    expect(viewModel.page, 2);
    expect(viewModel.items.map((item) => item['id']), ['shop-1', 'shop-2']);
    expect(viewModel.hasNext, isFalse);
    expect(repository.requestedPages, [1, 2]);
  });

  test('admin exclui o perfil e recarrega a primeira pagina', () async {
    final repository = _AdminRepositoryFake();
    final viewModel = AdminViewModel(repository);

    await viewModel.load();
    await viewModel.nextPage();
    final deleted = await viewModel.deleteAccount('shop-1');

    expect(deleted, isTrue);
    expect(repository.deletedIds, ['shop-1']);
    expect(repository.requestedPages, [1, 2, 1]);
    expect(viewModel.page, 1);
  });
}
