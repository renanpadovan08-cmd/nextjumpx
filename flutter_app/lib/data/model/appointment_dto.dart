class AppointmentDto {
  const AppointmentDto({required this.id, required this.barberId, required this.serviceId, required this.clientName, required this.clientPhone, required this.date, required this.time, required this.status, this.serviceName = '', this.servicePrice = 0});
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
  factory AppointmentDto.fromJson(Map<String, dynamic> json) {
    final service = json['services'] as Map<String, dynamic>? ?? const {};
    return AppointmentDto(id: '${json['id']}', barberId: '${json['barber_id']}', serviceId: '${json['service_id']}', clientName: '${json['client_name'] ?? ''}', clientPhone: '${json['client_phone'] ?? ''}', date: '${json['date']}', time: '${json['time']}', status: '${json['status']}', serviceName: '${service['name'] ?? ''}', servicePrice: (service['price'] as num?)?.toDouble() ?? 0);
  }
}
