import 'package:flutter_test/flutter_test.dart';
import 'package:zenbarber/data/model/auth_user_dto.dart';
import 'package:zenbarber/data/model/barber_dto.dart';
import 'package:zenbarber/dependency_injection/factories/agenda_factory.dart';
import 'package:zenbarber/dependency_injection/factories/barbers_factory.dart';
import 'package:zenbarber/dependency_injection/factories/catalog_factory.dart';
import 'package:zenbarber/domain/repositories/i_barber_repository.dart';
import 'package:zenbarber/ui/barbers/view_models/barbers_view_model.dart';

void main() {
  test('equipe, serviços e agenda compartilham a lista de barbeiros', () async {
    final repository = _MemoryBarberRepository();
    final team = BarbersViewModel(repository);
    const user = AuthUserDto(
      id: 'manager-1',
      name: 'Gerente',
      login: 'gerente',
      shopName: 'Barbearia Teste',
      role: 'gerente',
      accessStatus: 'ativo',
    );

    final barbersScreen = BarbersFactory.build(user, viewModel: team);
    final catalogScreen = CatalogFactory.build(user, barbers: team);
    final agendaScreen = AgendaFactory.build(user, barbers: team);

    expect(identical(barbersScreen.viewModel, team), isTrue);
    expect(identical(catalogScreen.barbers, team), isTrue);
    expect(identical(agendaScreen.barbers, team), isTrue);

    await team.create({
      'id': 'barber-1',
      'name': 'Novo barbeiro',
      'login': 'novo.barbeiro',
    });

    expect(catalogScreen.barbers.items.single.name, 'Novo barbeiro');
    expect(agendaScreen.barbers.items.single.id, 'barber-1');
  });
}

class _MemoryBarberRepository implements IBarberRepository {
  final List<BarberDto> _items = [];

  @override
  Future<List<BarberDto>> list() async => List.unmodifiable(_items);

  @override
  Future<BarberDto> create(Map<String, dynamic> input) async {
    final barber = BarberDto(
      id: '${input['id']}',
      name: '${input['name']}',
      login: '${input['login']}',
      shopName: 'Barbearia Teste',
      role: 'barbeiro',
    );
    _items.add(barber);
    return barber;
  }

  @override
  Future<BarberDto> update(String id, Map<String, dynamic> input) async {
    throw UnimplementedError();
  }
}
