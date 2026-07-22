import 'package:flutter/material.dart';
import '../../data/model/auth_user_dto.dart';
import '../core/theme/zen_colors.dart';
import '../core/widgets/zen_card.dart';
import '../core/widgets/zen_page.dart';
import '../features/view_models/feature_view_models.dart';
class FixedClientsScreen extends StatefulWidget { const FixedClientsScreen({super.key,required this.viewModel,required this.user}); final FixedClientsViewModel viewModel; final AuthUserDto user; @override State<FixedClientsScreen> createState()=>_FixedClientsScreenState(); }
class _FixedClientsScreenState extends State<FixedClientsScreen> {
  @override void initState(){super.initState();widget.viewModel..addListener(_refresh)..load();}
  void _refresh(){if(mounted)setState((){});}
  @override void dispose(){widget.viewModel.removeListener(_refresh);super.dispose();}
  @override Widget build(BuildContext c) {
    if(widget.viewModel.loading)return const Center(child:CircularProgressIndicator());
    return RefreshIndicator(onRefresh:widget.viewModel.load,child:ZenPage(title:'Clientes fixos',actions:[FilledButton.icon(onPressed:_create,icon:const Icon(Icons.add),label:const Text('Nova assinatura'))],children:[
      if(widget.viewModel.error!=null) ZenCard(child:Text(widget.viewModel.error!)),
      if(widget.viewModel.items.isEmpty) const ZenEmptyState(message:'Nenhum contrato recorrente ativo',icon:Icons.repeat),
      for(final contract in widget.viewModel.items) Padding(padding:const EdgeInsets.only(bottom:12),child:ZenCard(padding:EdgeInsets.zero,child:ExpansionTile(
        shape:const Border(),collapsedShape:const Border(),leading:const CircleAvatar(child:Icon(Icons.workspace_premium)),
        title:Text('${contract['clientName']}',style:const TextStyle(fontWeight:FontWeight.w900)),
        subtitle:Text('${contract['barberName']} · ${contract['code']}',style:const TextStyle(color:ZenColors.muted)),
        children:[for(final payment in (contract['payments'] as List? ?? [])) ListTile(
          title:Text('${payment['date']} · R\$ ${((payment['services']?['price'] as num?)??0).toStringAsFixed(2)}'),
          trailing:payment['status']=='concluido'?const ZenStatusPill(label:'Pago',color:ZenColors.green):FilledButton(onPressed:()=>widget.viewModel.pay('${payment['id']}'),child:const Text('Receber')),
        ),Padding(padding:const EdgeInsets.all(12),child:Align(alignment:Alignment.centerRight,child:OutlinedButton.icon(onPressed:()=>_cancel('${contract['code']}'),icon:const Icon(Icons.cancel_outlined),label:const Text('Cancelar pacote')))],
      ))),
    ]));
  }
  Future<void> _create()async{final name=TextEditingController();final phone=TextEditingController();final value=TextEditingController();final date=TextEditingController(text:DateTime.now().toIso8601String().substring(0,10));final time=TextEditingController(text:'09:00');final data=await showDialog<Map<String,String>>(context:context,builder:(context)=>AlertDialog(title:const Text('Nova assinatura'),content:SingleChildScrollView(child:Column(mainAxisSize:MainAxisSize.min,children:[TextField(controller:name,decoration:const InputDecoration(labelText:'Cliente')),const SizedBox(height:8),TextField(controller:phone,decoration:const InputDecoration(labelText:'WhatsApp')),const SizedBox(height:8),TextField(controller:value,keyboardType:TextInputType.number,decoration:const InputDecoration(labelText:'Valor mensal')),const SizedBox(height:8),TextField(controller:date,decoration:const InputDecoration(labelText:'Início (AAAA-MM-DD)')),const SizedBox(height:8),TextField(controller:time,decoration:const InputDecoration(labelText:'Horário (HH:MM)'))])),actions:[TextButton(onPressed:()=>Navigator.pop(context),child:const Text('Cancelar')),FilledButton(onPressed:()=>Navigator.pop(context,{'name':name.text.trim(),'phone':phone.text.trim(),'value':value.text.trim(),'date':date.text.trim(),'time':time.text.trim()}),child:const Text('Criar'))]));name.dispose();phone.dispose();value.dispose();date.dispose();time.dispose();if(data==null||data['name']!.isEmpty)return;try{await widget.viewModel.create({'barberId':widget.user.id,'clientName':data['name'],'clientPhone':data['phone'],'startDate':data['date'],'time':data['time'],'monthlyValue':double.tryParse(data['value']??'')??0});if(mounted)ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Assinatura criada.')));}catch(e){if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text('$e')));}}
  Future<void> _cancel(String code)async{try{await widget.viewModel.cancel(code);if(mounted)ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Pacote cancelado.')));}catch(e){if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text('$e')));}}
}
