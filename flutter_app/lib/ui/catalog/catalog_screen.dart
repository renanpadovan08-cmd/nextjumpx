import 'package:flutter/material.dart';

import '../../data/model/auth_user_dto.dart';
import 'view_models/catalog_view_model.dart';

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
    return ListView(padding: const EdgeInsets.all(16), children: [
      Text('Serviços', style: Theme.of(context).textTheme.headlineSmall),
      for (final service in widget.viewModel.items)
        ListTile(leading: const Icon(Icons.content_cut), title: Text(service.name), subtitle: Text('${service.duration} minutos'), trailing: Text('R\$ ${service.price.toStringAsFixed(2)}')),
    ]);
  }
}
