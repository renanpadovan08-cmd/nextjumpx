import 'package:flutter/material.dart';
import 'zen_colors.dart';

abstract final class ZenTheme {
  static ThemeData dark() {
    final scheme = ColorScheme.fromSeed(
        seedColor: ZenColors.green,
        brightness: Brightness.dark,
        surface: ZenColors.surfaceElevated);
    final base = ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        colorScheme: scheme,
        scaffoldBackgroundColor: ZenColors.background,
        fontFamily: 'Inter');
    return base.copyWith(
      textTheme: base.textTheme
          .apply(bodyColor: ZenColors.text, displayColor: ZenColors.text)
          .copyWith(
              headlineSmall: const TextStyle(
                  fontSize: 30,
                  fontWeight: FontWeight.w900,
                  letterSpacing: -1.2)),
      cardTheme: CardThemeData(
          color: ZenColors.surfaceElevated.withValues(alpha: .88),
          elevation: 0,
          margin: EdgeInsets.zero,
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(24),
              side: const BorderSide(color: ZenColors.outline))),
      inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: ZenColors.surface,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: ZenColors.outline)),
          enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: ZenColors.outline)),
          focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: ZenColors.green))),
      filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
              backgroundColor: ZenColors.green,
              foregroundColor: const Color(0xff06140a),
              textStyle: const TextStyle(fontWeight: FontWeight.w900),
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14)))),
      navigationBarTheme: const NavigationBarThemeData(
          backgroundColor: Color(0xdd070c15),
          indicatorColor: Color(0x3322c55e),
          labelTextStyle:
              WidgetStatePropertyAll(TextStyle(fontWeight: FontWeight.w800))),
    );
  }
}
