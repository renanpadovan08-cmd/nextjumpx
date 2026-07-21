import 'dart:io';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('camadas obrigatorias existem', () {
    for (final path in ['lib/config','lib/data','lib/domain','lib/domain/use_cases','lib/ui','lib/routing','lib/dependency_injection']) {
      expect(Directory(path).existsSync(), isTrue, reason: 'Camada ausente: $path');
    }
  });
  test('UI nao depende diretamente de fontes remotas', () {
    for (final file in Directory('lib/ui').listSync(recursive: true).whereType<File>().where((f) => f.path.endsWith('.dart'))) {
      expect(file.readAsStringSync(), isNot(contains('data/data_sources')), reason: file.path);
    }
  });
}
