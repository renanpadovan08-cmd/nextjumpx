import 'dart:js_interop';

@JS('zenPromptInstall')
external JSPromise<JSBoolean> _zenPromptInstall();

Future<bool> promptPwaInstall() async {
  try {
    return (await _zenPromptInstall().toDart).toDart;
  } catch (_) {
    return false;
  }
}
