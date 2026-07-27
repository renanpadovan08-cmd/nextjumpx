import 'package:flutter_test/flutter_test.dart';
import 'package:zenbarber/data/model/auth_user_dto.dart';

void main() {
  test('exige os termos atuais para gerente e barbeiro', () {
    final user = AuthUserDto.fromJson({
      'id': 'user-1',
      'name': 'Nathan',
      'login': 'nathancrestani',
      'shop_name': 'ZenBarber',
      'role': 'gerente',
      'access_status': 'ativo',
      'accepted_terms': true,
      'accepted_terms_version': 'v0.9',
    });

    expect(user.requiresTermsAcceptance, isTrue);
  });

  test('libera o usuario que aceitou v1.0 e nao bloqueia administrador', () {
    final accepted = AuthUserDto.fromJson({
      'id': 'user-1',
      'role': 'barber',
      'accepted_terms': true,
      'accepted_terms_version': AuthUserDto.currentTermsVersion,
    });
    final admin = AuthUserDto.fromJson({
      'id': 'admin-1',
      'role': 'admin',
    });

    expect(accepted.requiresTermsAcceptance, isFalse);
    expect(admin.requiresTermsAcceptance, isFalse);
  });
}
