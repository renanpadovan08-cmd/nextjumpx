class AppConfig {
  const AppConfig._();

  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000/api',
  );

  static const supportWhatsApp = String.fromEnvironment(
    'SUPPORT_WHATSAPP',
    defaultValue: '5500000000000',
  );
}
