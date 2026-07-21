import 'package:flutter/material.dart';
import '../theme/zen_colors.dart';
class ZenAppBackground extends StatelessWidget { const ZenAppBackground({super.key,required this.child}); final Widget child; @override Widget build(BuildContext context)=>DecoratedBox(decoration:const BoxDecoration(gradient:RadialGradient(center:Alignment(-.85,-1),radius:1.35,colors:[Color(0x3325c963),ZenColors.background,Color(0xff02040a)],stops:[0,.36,1])),child:child); }
