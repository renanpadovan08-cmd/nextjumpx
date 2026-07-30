import 'package:flutter_test/flutter_test.dart';
import 'package:zenbarber/domain/repositories/i_admin_repository.dart';
import 'package:zenbarber/ui/admin/view_models/admin_view_model.dart';

class _AdminRepositoryFake implements IAdminRepository {
  final List<int> requestedPages = [];

  @override
  Future<Map<String, dynamic>> listShops({
    int page = 1,
    int pageSize = 24,
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
      'filteredTotal': 48,
      'totalPages': 2,
      'hasNext': page < 2,
      'summary': {
        'total': 48,
        'active': 40,
        'pending': 5,
        'blocked': 3,
      },
    };
  }

  @override
  Future<List<Map<String, dynamic>>> listUnitRequests() async => const [];

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  test('admin mantém somente uma página de contas em memória', () async {
    final repository = _AdminRepositoryFake();
    final viewModel = AdminViewModel(repository);

    await viewModel.load();
    expect(viewModel.page, 1);
    expect(viewModel.items.single['id'], 'shop-1');
    expect(viewModel.hasNext, isTrue);
    expect(viewModel.summary['total'], 48);

    await viewModel.nextPage();
    expect(viewModel.page, 2);
    expect(viewModel.items.single['id'], 'shop-2');
    expect(viewModel.hasNext, isFalse);
    expect(repository.requestedPages, [1, 2]);
  });
}
