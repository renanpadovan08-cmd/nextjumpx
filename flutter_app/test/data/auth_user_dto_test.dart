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

  test('reconhece aliases antigos e o proprietario migrado como gerente', () {
    for (final role in [' Gerente ', 'manager', 'owner', 'dono']) {
      final manager = AuthUserDto.fromJson({
        'id': 'manager-1',
        'role': role,
      });
      expect(manager.role, 'gerente');
      expect(manager.isManager, isTrue);
    }

    final migratedOwner = AuthUserDto.fromJson({
      'id': 'owner-1',
      'shop_id': 'owner-1',
      'role': 'barbeiro',
    });
    final regularBarber = AuthUserDto.fromJson({
      'id': 'barber-2',
      'shop_id': 'owner-1',
      'role': 'barbeiro',
    });

    expect(migratedOwner.isManager, isTrue);
    expect(regularBarber.isManager, isFalse);
  });

  test('respeita a permissao legada de bloqueio proprio da agenda', () {
    final allowed = AuthUserDto.fromJson({
      'id': 'barber-1',
      'name': 'Profissional',
      'login': 'profissional',
      'shop_name': 'Barbearia',
      'role': 'barber',
      'access_status': 'ativo',
      'activation_note': 'observacao | AGENDA_SELF_BLOCK=1',
    });
    final blocked = AuthUserDto.fromJson({
      'id': 'barber-2',
      'name': 'Profissional 2',
      'login': 'profissional-2',
      'shop_name': 'Barbearia',
      'role': 'barber',
      'access_status': 'ativo',
    });

    expect(allowed.canSelfBlockAgenda, isTrue);
    expect(blocked.canSelfBlockAgenda, isFalse);
  });

  test('recepcionista visualiza a equipe sem receber poder de gerente', () {
    final receptionist = AuthUserDto.fromJson({
      'id': 'reception-1',
      'role': 'recepcao',
      'shop_id': 'shop-1',
    });

    expect(receptionist.role, 'recepcionista');
    expect(receptionist.isManager, isFalse);
    expect(receptionist.canViewTeamAgenda, isTrue);
  });
}
