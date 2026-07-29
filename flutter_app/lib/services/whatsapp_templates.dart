import 'dart:convert';

import 'local_preferences.dart';

class WhatsappTemplateStore {
  WhatsappTemplateStore({
    required this.shopName,
    required this.login,
  });

  final String shopName;
  final String login;

  static const defaults = <String, String>{
    'confirm':
        'Olá {primeiro_nome}, tudo bem? 😊\n\nPassando para confirmar seu horário na {barbearia}.\n\n📅 {data}\n⏰ {horario}\n✂️ {servico}\n💈 {barbeiro}\n\nPodemos confirmar sua presença?',
    'reminder':
        'Olá {primeiro_nome}, tudo bem? Só passando para lembrar do seu horário na {barbearia}:\n\n📅 {data}\n⏰ {horario}\n✂️ {servico}\n💈 {barbeiro}\n\nTe esperamos por aqui! ✂️',
    'delay':
        'Olá {primeiro_nome}, tudo bem? Seu horário na {barbearia} era às {horario}.\n\nMe avisa por favor se ainda vem ou se prefere remarcar para outro horário?',
    'reschedule':
        'Olá {primeiro_nome}, tudo bem? Precisamos ajustar seu horário na {barbearia}.\n\nMe chama por aqui para remarcarmos o melhor dia e horário para você. ✂️',
    'charge':
        'Olá {primeiro_nome}, tudo bem? Passando para lembrar do valor de {valor} referente ao {servico} na {barbearia}.\n\nQualquer dúvida é só me chamar por aqui.',
    'comeback':
        'Olá {primeiro_nome}, tudo bem? Faz alguns dias que você não aparece na {barbearia}.\n\nQuer agendar seu próximo horário?\n{link}',
    'thanks':
        'Obrigado pela preferência, {primeiro_nome}! Foi um prazer atender você na {barbearia}.\n\nQuando quiser agendar novamente, é só chamar ou acessar: {link}',
  };

  String get storageKey {
    final shop = shopName.isEmpty ? login : shopName;
    return 'zenbarber_whats_templates_${shop.toLowerCase().replaceAll(RegExp(r'[^a-z0-9_-]+'), '_')}';
  }

  Map<String, String> load() {
    try {
      final stored = readLocalPreference(storageKey);
      if (stored == null || stored.isEmpty) {
        return Map<String, String>.from(defaults);
      }
      final decoded = jsonDecode(stored) as Map<String, dynamic>;
      return {
        ...defaults,
        ...decoded.map((key, value) => MapEntry(key, '$value')),
      };
    } catch (_) {
      return Map<String, String>.from(defaults);
    }
  }

  void save(Map<String, String> templates) {
    writeLocalPreference(storageKey, jsonEncode(templates));
  }

  void reset() {
    removeLocalPreference(storageKey);
  }

  String fill(
    Map<String, String> templates,
    String type,
    Map<String, String> values,
  ) {
    var message = templates[type] ?? templates['reminder'] ?? '';
    for (final entry in values.entries) {
      message = message.replaceAll('{${entry.key}}', entry.value);
    }
    return message;
  }
}
