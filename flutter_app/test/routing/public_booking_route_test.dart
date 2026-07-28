import 'package:flutter_test/flutter_test.dart';
import 'package:zenbarber/routing/public_booking_route.dart';

void main() {
  test('gera uma rota publica real no mesmo dominio', () {
    final link = publicBookingUri(
      Uri.parse('https://zenbarber.nextjumpx.com.br/dashboard?tab=agenda'),
      ' nathan crestani ',
    );

    expect(
      link.toString(),
      'https://zenbarber.nextjumpx.com.br/book/nathan%20crestani',
    );
  });

  test('le a rota publica nova e mantem compatibilidade com hash antigo', () {
    expect(
      bookingLoginFromUri(
        Uri.parse('https://zenbarber.nextjumpx.com.br/book/nathancrestani'),
      ),
      'nathancrestani',
    );
    expect(
      bookingLoginFromUri(
        Uri.parse('https://zenbarber.nextjumpx.com.br/#book/nathancrestani'),
      ),
      'nathancrestani',
    );
  });

  test('nao trata a pagina comum do painel como agendamento publico', () {
    expect(
      bookingLoginFromUri(
        Uri.parse('https://zenbarber.nextjumpx.com.br/'),
      ),
      isEmpty,
    );
  });
}
