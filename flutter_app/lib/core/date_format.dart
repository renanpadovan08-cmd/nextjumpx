String isoDate(DateTime date) => '${date.year.toString().padLeft(4, '0')}-'
    '${date.month.toString().padLeft(2, '0')}-'
    '${date.day.toString().padLeft(2, '0')}';

String brazilianDate(DateTime date) => '${date.day.toString().padLeft(2, '0')}/'
    '${date.month.toString().padLeft(2, '0')}/'
    '${date.year.toString().padLeft(4, '0')}';

DateTime? parseIsoDate(String value) {
  final parsed = DateTime.tryParse(value.trim());
  return parsed == null
      ? null
      : DateTime(parsed.year, parsed.month, parsed.day);
}

String isoToBrazilianDate(String value) {
  final parsed = parseIsoDate(value);
  return parsed == null ? value : brazilianDate(parsed);
}
