import '../../data/model/barber_dto.dart';
abstract interface class IBarberRepository { Future<List<BarberDto>> list(); Future<BarberDto> create(Map<String, dynamic> input); }
