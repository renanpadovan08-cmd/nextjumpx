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
    return ZenPage(title:'Serviços', children: [
      for (final service in widget.viewModel.items)
        Padding(padding:const EdgeInsets.only(bottom:10),child:ZenCard(child:ListTile(contentPadding:EdgeInsets.zero,leading:const CircleAvatar(child:Icon(Icons.content_cut)),title:Text(service.name,style:const TextStyle(fontWeight:FontWeight.w900)),subtitle:Text('${service.duration} minutos',style:const TextStyle(color:ZenColors.muted)),trailing:Text('R\$ ${service.price.toStringAsFixed(2)}',style:const TextStyle(color:ZenColors.jade,fontWeight:FontWeight.w900))))),
    ]);
  }
}
