import '../../repositories/i_appointment_repository.dart';
import '../../../data/model/appointment_dto.dart';
class ListAppointmentsUseCase { const ListAppointmentsUseCase(this._repository); final IAppointmentRepository _repository; Future<List<AppointmentDto>> call({String? barberId,String? date}) => _repository.list(barberId: barberId,date: date); }
