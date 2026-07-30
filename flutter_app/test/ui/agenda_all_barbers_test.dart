import 'package:flutter_test/flutter_test.dart';
import 'package:zenbarber/data/model/appointment_dto.dart';
import 'package:zenbarber/domain/repositories/i_appointment_repository.dart';
import 'package:zenbarber/ui/agenda/view_models/agenda_view_model.dart';

class _AppointmentRepositoryFake implements IAppointmentRepository {
  final List<String?> requestedBarbers = [];

  @override
  Future<List<AppointmentDto>> list({
    String? barberId,
    String? date,
  }) async {
    requestedBarbers.add(barberId);
    return const [];
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  test('gerência alterna entre um profissional e todas as agendas', () async {
    final repository = _AppointmentRepositoryFake();
    final viewModel = AgendaViewModel(repository);

    await viewModel.load(barberId: 'barber-1', date: '2026-08-01');
    expect(viewModel.selectedBarberId, 'barber-1');

    await viewModel.load(allBarbers: true);
    expect(viewModel.selectedBarberId, isNull);
    expect(viewModel.selectedDate, '2026-08-01');
    expect(repository.requestedBarbers, ['barber-1', null]);
  });
}
