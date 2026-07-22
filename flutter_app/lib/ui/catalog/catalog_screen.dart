import 'package:flutter/material.dart';

import '../../data/model/auth_user_dto.dart';
import 'view_models/catalog_view_model.dart';
import '../core/widgets/zen_card.dart';
import '../core/widgets/zen_page.dart';
import '../core/theme/zen_colors.dart';

class CatalogScreen extends StatefulWidget {
  const CatalogScreen({super.key, required this.user, required this.viewModel});
  final AuthUserDto user;
  final CatalogViewModel viewModel;
  @override State<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends State<CatalogScreen> {
  @override void initState() { super.initState(); widget.viewModel.addListener(_reload); widget.viewModel.load(widget.user.id); }
  void _reload() { if (mounted) setState(() {}); }
  @override void dispose() { widget.viewModel.removeListener(_reload); super.dispose(); }
  @override Widget build(BuildContext context) {
    if (widget.viewModel.loading && widget.viewModel.items.isEmpty) return const Center(child: CircularProgressIndicator());
    return ZenPage(title:'Serviços', actions:[FilledButton.icon(onPressed:_create,icon:const Icon(Icons.add),label:const Text('Novo serviço'))], children: [
      for (final service in widget.viewModel.items)
        Padding(padding:const EdgeInsets.only(bottom:10),child:ZenCard(child:ListTile(contentPadding:EdgeInsets.zero,leading:const CircleAvatar(child:Icon(Icons.content_cut)),title:Text(service.name,style:const TextStyle(fontWeight:FontWeight.w900)),subtitle:Text('${service.duration} minutos',style:const TextStyle(color:ZenColors.muted)),trailing:Wrap(spacing:8,crossAxisAlignment:WrapCrossAlignment.center,children:[Text('R\$ ${service.price.toStringAsFixed(2)}',style:const TextStyle(color:ZenColors.jade,fontWeight:FontWeight.w900)),IconButton(onPressed:()=>_delete(service.id),icon:const Icon(Icons.delete_outline,color:ZenColors.red),tooltip:'Excluir serviço')]))),
    ]);
  }

  Future<void> _create() async { final name=TextEditingController();final price=TextEditingController();final duration=TextEditingController(text:'30');final values=await showDialog<Map<String,String>>(context:context,builder:(context)=>AlertDialog(title:const Text('Novo serviço'),content:SingleChildScrollView(child:Column(mainAxisSize:MainAxisSize.min,children:[TextField(controller:name,decoration:const InputDecoration(labelText:'Nome')),const SizedBox(height:10),TextField(controller:price,keyboardType:TextInputType.number,decoration:const InputDecoration(labelText:'Preço')),const SizedBox(height:10),TextField(controller:duration,keyboardType:TextInputType.number,decoration:const InputDecoration(labelText:'Duração em minutos'))])),actions:[TextButton(onPressed:()=>Navigator.pop(context),child:const Text('Cancelar')),FilledButton(onPressed:()=>Navigator.pop(context,{'name':name.text.trim(),'price':price.text.trim(),'duration':duration.text.trim()}),child:const Text('Salvar'))]));name.dispose();price.dispose();duration.dispose();if(values==null||values['name']!.isEmpty)return;try{await widget.viewModel.create({'barberId':widget.user.id,'name':values['name'],'price':double.tryParse(values['price']??'')??0,'duration':int.tryParse(values['duration']??'')??30});if(mounted)ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Serviço cadastrado.')));}catch(e){if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text('$e')));}}
  Future<void> _delete(String id) async {try{await widget.viewModel.delete(id,widget.user.id);if(mounted)ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Serviço excluído.')));}catch(e){if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text('$e')));}}
}
