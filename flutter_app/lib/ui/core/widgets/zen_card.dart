import 'package:flutter/material.dart';
import '../theme/zen_colors.dart';

class ZenCard extends StatelessWidget {
  const ZenCard(
      {super.key,
      required this.child,
      this.padding = const EdgeInsets.all(18),
      this.onTap});
  final Widget child;
  final EdgeInsets padding;
  final VoidCallback? onTap;
  @override
  Widget build(BuildContext context) => Card(
      child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(24),
          child: Padding(padding: padding, child: child)));
}

class ZenStatusPill extends StatelessWidget {
  const ZenStatusPill({super.key, required this.label, required this.color});
  final String label;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
          color: color.withValues(alpha: .15),
          border: Border.all(color: color.withValues(alpha: .4)),
          borderRadius: BorderRadius.circular(99)),
      child: Text(label,
          style: TextStyle(
              color: color, fontSize: 11, fontWeight: FontWeight.w900)));
}

class ZenMetricCard extends StatelessWidget {
  const ZenMetricCard(
      {super.key,
      required this.icon,
      required this.label,
      required this.value,
      this.color = ZenColors.green});
  final IconData icon;
  final String label, value;
  final Color color;
  @override
  Widget build(BuildContext c) => SizedBox(
      width: 210,
      child: ZenCard(
          child: Row(children: [
        Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
                color: color.withValues(alpha: .14),
                borderRadius: BorderRadius.circular(14)),
            child: Icon(icon, color: color)),
        const SizedBox(width: 12),
        Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label,
              style: const TextStyle(
                  color: ZenColors.muted,
                  fontSize: 12,
                  fontWeight: FontWeight.w800)),
          Text(value,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900))
        ]))
      ])));
}
