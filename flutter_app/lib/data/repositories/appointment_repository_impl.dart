import '../../domain/repositories/i_appointment_repository.dart';
import '../data_sources/appointment_remote_data_source.dart';
import '../model/appointment_dto.dart';
class AppointmentRepositoryImpl implements IAppointmentRepository { const AppointmentRepositoryImpl(this._source); final AppointmentRemoteDataSource _source; @override Future<List<AppointmentDto>> list({String? barberId, String? date}) => _source.list(barberId: barberId, date: date); @override Future<AppointmentDto> create(Map<String, dynamic> input) => _source.create(input); @override Future<AppointmentDto> update(String id, Map<String, dynamic> input) => _source.update(id, input); }
