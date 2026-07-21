import 'package:flutter/material.dart';
import '../core/theme/zen_colors.dart';
import '../core/widgets/zen_card.dart';
import '../core/widgets/zen_page.dart';
import '../features/view_models/feature_view_models.dart';
class FixedClientsScreen extends StatefulWidget { const FixedClientsScreen({super.key,required this.viewModel}); final FixedClientsViewModel viewModel; @override State<FixedClientsScreen> createState()=>_FixedClientsScreenState(); }
class _FixedClientsScreenState extends State<FixedClientsScreen> {
  @override void initState(){super.initState();widget.viewModel..addListener(_refresh)..load();}
  void _refresh(){if(mounted)setState((){});}
  @override void dispose(){widget.viewModel.removeListener(_refresh);super.dispose();}
  @override Widget build(BuildContext c) {
    if(widget.viewModel.loading)return const Center(child:CircularProgressIndicator());
    return RefreshIndicator(onRefresh:widget.viewModel.load,child:ZenPage(title:'Clientes fixos',children:[
      if(widget.viewModel.error!=null) ZenCard(child:Text(widget.viewModel.error!)),
      if(widget.viewModel.items.isEmpty) const ZenEmptyState(message:'Nenhum contrato recorrente ativo',icon:Icons.repeat),
      for(final contract in widget.viewModel.items) Padding(padding:const EdgeInsets.only(bottom:12),child:ZenCard(padding:EdgeInsets.zero,child:ExpansionTile(
        shape:const Border(),collapsedShape:const Border(),leading:const CircleAvatar(child:Icon(Icons.workspace_premium)),
        title:Text('${contract['clientName']}',style:const TextStyle(fontWeight:FontWeight.w900)),
        subtitle:Text('${contract['barberName']} · ${contract['code']}',style:const TextStyle(color:ZenColors.muted)),
        children:[for(final payment in (contract['payments'] as List? ?? [])) ListTile(
          title:Text('${payment['date']} · R\$ ${((payment['services']?['price'] as num?)??0).toStringAsFixed(2)}'),
          trailing:payment['status']=='concluido'?const ZenStatusPill(label:'Pago',color:ZenColors.green):FilledButton(onPressed:()=>widget.viewModel.pay('${payment['id']}'),child:const Text('Receber')),
        )],
      ))),
    ]));
  }
}
