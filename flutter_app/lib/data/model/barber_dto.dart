class BarberDto {
  const BarberDto({required this.id, required this.name, required this.login, required this.shopName, required this.role, this.phone = '', this.commissionRate = 0, this.workStart = '08:00', this.workEnd = '20:00'});
  final String id;
  final String name;
  final String login;
  final String shopName;
  final String role;
  final String phone;
  final double commissionRate;
  final String workStart;
  final String workEnd;

  factory BarberDto.fromJson(Map<String, dynamic> json) => BarberDto(
    id: '${json['id']}', name: '${json['name'] ?? ''}', login: '${json['login'] ?? ''}', shopName: '${json['shop_name'] ?? ''}', role: '${json['role'] ?? 'barbeiro'}',
    phone: '${json['phone'] ?? ''}', commissionRate: (json['commission_rate'] as num?)?.toDouble() ?? 0, workStart: '${json['work_start'] ?? '08:00'}', workEnd: '${json['work_end'] ?? '20:00'}',
  );
}
