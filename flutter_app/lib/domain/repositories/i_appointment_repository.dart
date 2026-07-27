import '../../data/model/appointment_dto.dart';

abstract interface class IAppointmentRepository {
  Future<List<AppointmentDto>> list({String? barberId, String? date});
  Future<AppointmentDto> create(Map<String, dynamic> input);
  Future<AppointmentDto> update(String id, Map<String, dynamic> input);
}
