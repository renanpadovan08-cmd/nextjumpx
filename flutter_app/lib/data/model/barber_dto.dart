class BarberDto {
  const BarberDto(
      {required this.id,
      required this.name,
      required this.login,
      required this.shopName,
      required this.role,
      this.phone = '',
      this.commissionRate = 0,
      this.workStart = '08:00',
      this.workEnd = '20:00',
      this.offDays = '',
      this.photoUrl = '',
      this.activationNote = ''});
  final String id;
  final String name;
  final String login;
  final String shopName;
  final String role;
  final String phone;
  final double commissionRate;
  final String workStart;
  final String workEnd;
  final String offDays;
  final String photoUrl;
  final String activationNote;
  bool get canSelfBlock =>
      role == 'gerente' ||
      activationNote.toUpperCase().split('|').any(
            (value) => value.trim() == 'AGENDA_SELF_BLOCK=1',
          );

  factory BarberDto.fromJson(Map<String, dynamic> json) => BarberDto(
        id: '${json['id']}',
        name: '${json['name'] ?? ''}',
        login: '${json['login'] ?? ''}',
        shopName: '${json['shop_name'] ?? ''}',
        role: '${json['role'] ?? 'barbeiro'}',
        phone: '${json['phone'] ?? ''}',
        commissionRate: (json['commission_rate'] as num?)?.toDouble() ?? 0,
        workStart: '${json['work_start'] ?? '08:00'}',
        workEnd: '${json['work_end'] ?? '20:00'}',
        offDays: '${json['off_days'] ?? ''}',
        photoUrl: '${json['photo_url'] ?? ''}',
        activationNote: '${json['activation_note'] ?? ''}',
      );
}
