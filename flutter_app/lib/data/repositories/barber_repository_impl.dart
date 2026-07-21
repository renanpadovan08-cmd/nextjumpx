import '../../domain/repositories/i_barber_repository.dart';
import '../data_sources/barber_remote_data_source.dart';
import '../model/barber_dto.dart';
class BarberRepositoryImpl implements IBarberRepository { const BarberRepositoryImpl(this._source); final BarberRemoteDataSource _source; @override Future<List<BarberDto>> list() => _source.list(); @override Future<BarberDto> create(Map<String, dynamic> input) => _source.create(input); }
