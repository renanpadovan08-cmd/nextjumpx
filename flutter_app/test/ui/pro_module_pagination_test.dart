import 'package:flutter_test/flutter_test.dart';
import 'package:zenbarber/domain/repositories/i_operations_repository.dart';
import 'package:zenbarber/ui/pro_modules/pro_module_screen.dart';
import 'package:zenbarber/ui/pro_modules/view_models/pro_module_view_model.dart';

class _OperationsRepositoryFake implements IOperationsRepository {
  final List<int> requestedPages = [];

  @override
  Future<dynamic> get(String feature, {Map<String, String>? query}) async {
    final page = int.parse(query?['page'] ?? '1');
    requestedPages.add(page);
    return {
      'items': [
        {'id': '$feature-$page'}
      ],
      'page': page,
      'pageSize': 10,
      'total': 20,
      'totalPages': 2,
      'hasNext': page < 2,
    };
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  test('carteira carrega mais dez registros sem substituir os anteriores',
      () async {
    final repository = _OperationsRepositoryFake();
    final viewModel = ProModuleViewModel(repository);

    await viewModel.load(ProModule.wallet);
    expect((viewModel.data as List).single['id'], 'wallet-1');
    expect(viewModel.hasMore, isTrue);

    await viewModel.loadMore(ProModule.wallet);
    expect(
      (viewModel.data as List).map((item) => item['id']),
      ['wallet-1', 'wallet-2'],
    );
    expect(viewModel.hasMore, isFalse);
    expect(repository.requestedPages, [1, 2]);
  });
}
