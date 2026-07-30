import 'package:flutter_test/flutter_test.dart';
import 'package:zenbarber/data/model/barber_dto.dart';

void main() {
  test('carrega expediente e pausa individual do profissional', () {
    final barber = BarberDto.fromJson({
      'id': 'barber-1',
      'name': 'Profissional',
      'login': 'profissional',
      'shop_name': 'Barbearia',
      'role': 'barber',
      'work_start': '09:00',
      'work_end': '19:00',
      'lunch_start': '12:00',
      'lunch_end': '13:00',
    });

    expect(barber.workStart, '09:00');
    expect(barber.workEnd, '19:00');
    expect(barber.lunchStart, '12:00');
    expect(barber.lunchEnd, '13:00');
  });
}
