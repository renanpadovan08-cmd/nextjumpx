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
      this.acceptedTermsVersion = '',
      this.activationNote = ''});

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
  final String activationNote;

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
    if (const ['recepcionista', 'receptionist', 'recepcao'].contains(value)) {
      return 'recepcionista';
    }
    if (const ['barber', 'barbeiro'].contains(value)) return 'barber';
    return value;
  }

  bool get isAdmin => role == 'admin';
  bool get isManager =>
      isAdmin || role == 'gerente' || (shopId.isNotEmpty && shopId == id);
  bool get canViewTeamAgenda => isManager || role == 'recepcionista';
  bool get canSelfBlockAgenda =>
      isManager ||
      activationNote.toUpperCase().split('|').any(
            (value) => value.trim() == 'AGENDA_SELF_BLOCK=1',
          );

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
        activationNote: '${json['activation_note'] ?? ''}',
      );
}
