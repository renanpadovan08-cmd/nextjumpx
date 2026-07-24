class AppointmentDto {
  const AppointmentDto({
    required this.id,
    required this.barberId,
    required this.serviceId,
    required this.clientName,
    required this.clientPhone,
    required this.date,
    required this.time,
    required this.status,
    this.serviceName = '',
    this.servicePrice = 0,
    this.serviceDuration = 30,
    this.barberName = '',
    this.reminderDate = '',
    this.reminderDays = 0,
    this.cancelNote = '',
  });

  final String id;
  final String barberId;
  final String serviceId;
  final String clientName;
  final String clientPhone;
  final String date;
  final String time;
  final String status;
  final String serviceName;
  final double servicePrice;
  final int serviceDuration;
  final String barberName;
  final String reminderDate;
  final int reminderDays;
  final String cancelNote;

  factory AppointmentDto.fromJson(Map<String, dynamic> json) {
    final service = json['services'] as Map<String, dynamic>? ?? const {};
    final barber = json['barbers'] as Map<String, dynamic>? ?? const {};
    return AppointmentDto(
      id: '${json['id']}',
      barberId: '${json['barber_id']}',
      serviceId: '${json['service_id']}',
      clientName: '${json['client_name'] ?? ''}',
      clientPhone: '${json['client_phone'] ?? ''}',
      date: '${json['date']}',
      time: '${json['time']}',
      status: '${json['status']}',
      serviceName: '${service['name'] ?? ''}',
      servicePrice: (service['price'] as num?)?.toDouble() ?? 0,
      serviceDuration: (service['duration'] as num?)?.toInt() ?? 30,
      barberName: '${barber['name'] ?? ''}',
      reminderDate: '${json['reminder_date'] ?? ''}',
      reminderDays: (json['reminder_days'] as num?)?.toInt() ?? 0,
      cancelNote: '${json['cancel_note'] ?? ''}',
    );
  }
}
