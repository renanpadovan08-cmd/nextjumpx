class ServiceDto {
  const ServiceDto({required this.id, required this.barberId, required this.name, required this.price, required this.duration});
  final String id;
  final String barberId;
  final String name;
  final double price;
  final int duration;
  factory ServiceDto.fromJson(Map<String, dynamic> json) => ServiceDto(
    id: '${json['id']}', barberId: '${json['barber_id'] ?? ''}', name: '${json['name'] ?? ''}', price: (json['price'] as num?)?.toDouble() ?? 0, duration: (json['duration'] as num?)?.toInt() ?? 30,
  );
}
