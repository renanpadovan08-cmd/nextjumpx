double? parseDecimalValue(Object? value) {
  if (value is num) return value.toDouble();
  var text = '${value ?? ''}'.trim().replaceAll(RegExp(r'[^\d,.\-]'), '');
  if (text.isEmpty || text == '-') return null;
  final comma = text.lastIndexOf(',');
  final dot = text.lastIndexOf('.');
  if (comma >= 0 && dot >= 0) {
    if (comma > dot) {
      text = text.replaceAll('.', '').replaceAll(',', '.');
    } else {
      text = text.replaceAll(',', '');
    }
  } else if (comma >= 0) {
    text = text.replaceAll(',', '.');
  }
  return double.tryParse(text);
}
