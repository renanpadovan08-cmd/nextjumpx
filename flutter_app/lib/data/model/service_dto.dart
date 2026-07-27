class ServiceDto {
  const ServiceDto(
      {required this.id,
      required this.barberId,
      required this.name,
      required this.price,
      required this.duration,
      this.iconText = '',
      this.imageUrl = '',
      this.displayOrder = 0});
  final String id;
  final String barberId;
  final String name;
  final double price;
  final int duration;
  final String iconText;
  final String imageUrl;
  final int displayOrder;
  factory ServiceDto.fromJson(Map<String, dynamic> json) => ServiceDto(
        id: '${json['id']}',
        barberId: '${json['barber_id'] ?? ''}',
        name: '${json['name'] ?? ''}',
        price: (json['price'] as num?)?.toDouble() ?? 0,
        duration: (json['duration'] as num?)?.toInt() ?? 30,
        iconText: '${json['icon_text'] ?? ''}',
        imageUrl: '${json['image_url'] ?? ''}',
        displayOrder: (json['display_order'] as num?)?.toInt() ?? 0,
      );
}
