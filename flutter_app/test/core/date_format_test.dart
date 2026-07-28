import 'package:flutter_test/flutter_test.dart';
import 'package:zenbarber/core/date_format.dart';

void main() {
  test('exibe a data no padrao brasileiro e envia em ISO para a API', () {
    final date = DateTime(2026, 7, 28);

    expect(brazilianDate(date), '28/07/2026');
    expect(isoDate(date), '2026-07-28');
    expect(isoToBrazilianDate('2026-07-28'), '28/07/2026');
  });
}
