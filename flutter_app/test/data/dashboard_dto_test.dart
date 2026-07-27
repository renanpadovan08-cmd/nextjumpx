import 'package:flutter_test/flutter_test.dart';
import 'package:zenbarber/data/model/dashboard_dto.dart';

void main() {
  test('converte o resumo completo retornado pelo backend', () {
    final dto = DashboardDto.fromJson({
      'month': '2026-07',
      'appointments': 12,
      'completed': 9,
      'revenue': 900,
      'totalCommission': 270.5,
      'profit': 629.5,
      'pending': 2,
      'walletCount': 3,
      'walletAmount': 450,
      'byBarber': [
        {'name': 'Ana', 'revenue': 900}
      ],
      'today': {
        'appointments': 4,
        'completed': 2,
        'revenue': 200,
        'nextAppointment': {'time': '15:00', 'client_name': 'Cliente'}
      },
      'retention': {'risk': 5, 'recovered': 2, 'zenIndex': 76}
    });

    expect(dto.month, '2026-07');
    expect(dto.revenue, 900);
    expect(dto.totalCommission, 270.5);
    expect(dto.profit, 629.5);
    expect(dto.todayAppointments, 4);
    expect(dto.walletCount, 3);
    expect(dto.risk, 5);
    expect(dto.nextAppointment?['time'], '15:00');
  });

  test('usa valores seguros quando campos novos nao existem', () {
    final dto = DashboardDto.fromJson({
      'month': '2026-07',
      'appointments': 0,
      'completed': 0,
      'revenue': 0,
    });

    expect(dto.totalCommission, 0);
    expect(dto.todayAppointments, 0);
    expect(dto.zenIndex, 10);
    expect(dto.nextAppointment, isNull);
  });
}
