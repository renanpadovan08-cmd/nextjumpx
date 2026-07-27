class AuthUserDto {
  const AuthUserDto(
      {required this.id,
      required this.name,
      required this.login,
      required this.shopName,
      required this.role,
      required this.accessStatus,
      this.mustChangePassword = false,
      this.acceptedTerms = false,
      this.acceptedTermsVersion = ''});

  final String id;
  final String name;
  final String login;
  final String shopName;
  final String role;
  final String accessStatus;
  final bool mustChangePassword;
  final bool acceptedTerms;
  final String acceptedTermsVersion;

  static const currentTermsVersion = 'v1.0';
  bool get requiresTermsAcceptance =>
      !isAdmin &&
      (!acceptedTerms || acceptedTermsVersion != currentTermsVersion);

  bool get isAdmin => role == 'admin' || role == 'admin_master';
  bool get isManager =>
      isAdmin || role == 'gerente' || role == 'manager' || role == 'owner';

  factory AuthUserDto.fromJson(Map<String, dynamic> json) => AuthUserDto(
        id: '${json['id']}',
        name: '${json['name'] ?? ''}',
        login: '${json['login'] ?? ''}',
        shopName: '${json['shop_name'] ?? ''}',
        role: '${json['role'] ?? 'barbeiro'}',
        accessStatus: '${json['access_status'] ?? ''}',
        mustChangePassword: json['must_change_password'] == true,
        acceptedTerms: json['accepted_terms'] == true,
        acceptedTermsVersion: '${json['accepted_terms_version'] ?? ''}',
      );
}
