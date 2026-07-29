// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use

import 'dart:html' as html;

String? readLocalPreference(String key) => html.window.localStorage[key];

void writeLocalPreference(String key, String value) {
  html.window.localStorage[key] = value;
}

void removeLocalPreference(String key) {
  html.window.localStorage.remove(key);
}

String? readSessionPreference(String key) => html.window.sessionStorage[key];

void writeSessionPreference(String key, String value) {
  html.window.sessionStorage[key] = value;
}

void removeSessionPreference(String key) {
  html.window.sessionStorage.remove(key);
}
