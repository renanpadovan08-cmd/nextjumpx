String bookingLoginFromUri(Uri uri) {
  final segments = uri.pathSegments.where((value) => value.isNotEmpty).toList();
  final bookingIndex = segments.lastIndexOf('book');
  if (bookingIndex >= 0 && bookingIndex + 1 < segments.length) {
    return segments[bookingIndex + 1].trim();
  }

  final fragment = uri.fragment.replaceFirst(RegExp(r'^/'), '');
  if (fragment.startsWith('book/')) {
    return Uri.decodeComponent(fragment.substring('book/'.length)).trim();
  }
  return '';
}

Uri publicBookingUri(Uri current, String login) {
  final normalizedLogin = login.trim();
  if (current.scheme != 'http' && current.scheme != 'https') {
    return current.replace(
      query: null,
      fragment: 'book/${Uri.encodeComponent(normalizedLogin)}',
    );
  }
  return Uri(
    scheme: current.scheme,
    host: current.host,
    port: current.hasPort ? current.port : null,
    pathSegments: ['book', normalizedLogin],
  );
}
