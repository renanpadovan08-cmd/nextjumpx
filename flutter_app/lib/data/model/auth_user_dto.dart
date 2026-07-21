class AuthUserDto {
  const AuthUserDto({required this.id, required this.name, required this.login, required this.shopName, required this.role, required this.accessStatus});

  final String id;
  final String name;
  final String login;
  final String shopName;
  final String role;
  final String accessStatus;

  bool get isAdmin => role == 'admin' || role == 'admin_master';
  bool get isManager => isAdmin || role == 'gerente' || role == 'manager' || role == 'owner';

  factory AuthUserDto.fromJson(Map<String, dynamic> json) => AuthUserDto(
    id: '${json['id']}', name: '${json['name'] ?? ''}', login: '${json['login'] ?? ''}',
    shopName: '${json['shop_name'] ?? ''}', role: '${json['role'] ?? 'barbeiro'}', accessStatus: '${json['access_status'] ?? ''}',
  );
}
