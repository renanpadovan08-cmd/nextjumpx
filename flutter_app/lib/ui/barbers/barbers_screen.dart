import 'package:flutter/material.dart';
import '../../data/model/auth_user_dto.dart';
import '../core/theme/zen_colors.dart';
import '../core/widgets/zen_card.dart';
import '../core/widgets/zen_page.dart';
import 'view_models/barbers_view_model.dart';

class BarbersScreen extends StatefulWidget { const BarbersScreen({super.key,required this.user,required this.viewModel}); final AuthUserDto user; final BarbersViewModel viewModel; @override State<BarbersScreen> createState()=>_BarbersScreenState(); }
class _BarbersScreenState extends State<BarbersScreen>{@override void initState(){super.initState();widget.viewModel..addListener(_reload)..load();}void _reload(){if(mounted)setState((){});}@override void dispose(){widget.viewModel.removeListener(_reload);super.dispose();}@override Widget build(BuildContext context){if(widget.viewModel.loading&&widget.viewModel.items.isEmpty)return const Center(child:CircularProgressIndicator());return ZenPage(title:'Equipe',children:[if(widget.viewModel.items.isEmpty)const ZenEmptyState(message:'Nenhum profissional cadastrado',icon:Icons.groups_outlined),for(final barber in widget.viewModel.items)Padding(padding:const EdgeInsets.only(bottom:10),child:ZenCard(child:ListTile(contentPadding:EdgeInsets.zero,leading:CircleAvatar(backgroundColor:ZenColors.green.withValues(alpha:.18),child:const Icon(Icons.person,color:ZenColors.green)),title:Text(barber.name,style:const TextStyle(fontWeight:FontWeight.w900)),subtitle:Text('${barber.role} · ${barber.workStart}–${barber.workEnd}',style:const TextStyle(color:ZenColors.muted)),trailing:ZenStatusPill(label:'${barber.commissionRate.toStringAsFixed(0)}%',color:ZenColors.sky))))]);}}
