import 'package:flutter/material.dart';
import '../theme/zen_colors.dart';
import 'zen_card.dart';

class ZenPage extends StatelessWidget {
  const ZenPage(
      {super.key,
      required this.title,
      required this.children,
      this.actions = const [],
      this.controller});
  final String title;
  final List<Widget> children;
  final List<Widget> actions;
  final ScrollController? controller;
  @override
  Widget build(BuildContext context) => LayoutBuilder(
        builder: (context, constraints) {
          final compact = constraints.maxWidth < 600;
          final heading = Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 4),
              const Text(
                'ZenBarber Pro',
                style: TextStyle(
                  color: ZenColors.green,
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.1,
                ),
              ),
            ],
          );

          return ListView(
            controller: controller,
            padding: EdgeInsets.fromLTRB(
              compact ? 14 : 20,
              compact ? 16 : 22,
              compact ? 14 : 20,
              40,
            ),
            children: [
              if (compact) ...[
                heading,
                if (actions.isNotEmpty) ...[
                  const SizedBox(height: 14),
                  for (var index = 0; index < actions.length; index++) ...[
                    actions[index],
                    if (index < actions.length - 1) const SizedBox(height: 8),
                  ],
                ],
              ] else
                Row(
                  children: [
                    Expanded(child: heading),
                    ...actions,
                  ],
                ),
              const SizedBox(height: 18),
              ...children,
            ],
          );
        },
      );
}

class ZenEmptyState extends StatelessWidget {
  const ZenEmptyState(
      {super.key, required this.message, this.icon = Icons.inbox_outlined});
  final String message;
  final IconData icon;
  @override
  Widget build(BuildContext c) => ZenCard(
      child: Center(
          child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Icon(icon, size: 34, color: ZenColors.muted),
                const SizedBox(height: 8),
                Text(message,
                    style: const TextStyle(
                        color: ZenColors.muted, fontWeight: FontWeight.w700))
              ]))));
}
