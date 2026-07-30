import 'package:flutter_test/flutter_test.dart';
import 'package:zenbarber/core/decimal_parser.dart';

void main() {
  test('aceita valores monetarios com virgula ou ponto', () {
    expect(parseDecimalValue('19,90'), 19.90);
    expect(parseDecimalValue('19.90'), 19.90);
    expect(parseDecimalValue('R\$ 5.000,75'), 5000.75);
    expect(parseDecimalValue(150.25), 150.25);
  });

  test('rejeita valor vazio ou invalido', () {
    expect(parseDecimalValue(''), isNull);
    expect(parseDecimalValue('valor'), isNull);
  });
}
