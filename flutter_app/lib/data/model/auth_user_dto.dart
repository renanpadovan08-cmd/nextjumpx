class AuthUserDto {
  const AuthUserDto(
      {required this.id,
      required this.name,
      required this.login,
      required this.shopName,
      required this.role,
      required this.accessStatus,
      this.shopId = '',
      this.mustChangePassword = false,
      this.acceptedTerms = false,
      this.acceptedTermsVersion = ''});

  final String id;
  final String name;
  final String login;
  final String shopName;
  final String role;
  final String accessStatus;
  final String shopId;
  final bool mustChangePassword;
  final bool acceptedTerms;
  final String acceptedTermsVersion;

  static const currentTermsVersion = 'v1.0';
  bool get requiresTermsAcceptance =>
      !isAdmin &&
      (!acceptedTerms || acceptedTermsVersion != currentTermsVersion);

  static String normalizeRole(Object? role) {
    final value = '${role ?? ''}'.trim().toLowerCase();
    if (const ['admin', 'admin_master', 'master', 'adm'].contains(value)) {
      return 'admin';
    }
    if (const ['gerente', 'manager', 'owner', 'dono'].contains(value)) {
      return 'gerente';
    }
    if (const ['barber', 'barbeiro'].contains(value)) return 'barber';
    return value;
  }

  bool get isAdmin => role == 'admin';
  bool get isManager =>
      isAdmin || role == 'gerente' || (shopId.isNotEmpty && shopId == id);

  factory AuthUserDto.fromJson(Map<String, dynamic> json) => AuthUserDto(
        id: '${json['id']}',
        name: '${json['name'] ?? ''}',
        login: '${json['login'] ?? ''}',
        shopName: '${json['shop_name'] ?? ''}',
        role: normalizeRole(json['role'] ?? 'barbeiro'),
        accessStatus: '${json['access_status'] ?? ''}',
        shopId: '${json['shop_id'] ?? ''}',
        mustChangePassword: json['must_change_password'] == true,
        acceptedTerms: json['accepted_terms'] == true,
        acceptedTermsVersion: '${json['accepted_terms_version'] ?? ''}',
      );
}
