import 'package:flutter/material.dart';
import 'view_models/dashboard_view_model.dart';

class DashboardScreen extends StatefulWidget { const DashboardScreen({super.key, required this.viewModel}); final DashboardViewModel viewModel; @override State<DashboardScreen> createState() => _DashboardScreenState(); }
class _DashboardScreenState extends State<DashboardScreen> {
  @override void initState() { super.initState(); widget.viewModel.addListener(_refresh); widget.viewModel.load(); }
  void _refresh() { if (mounted) setState(() {}); }
  @override void dispose() { widget.viewModel.removeListener(_refresh); super.dispose(); }
  @override Widget build(BuildContext context) {
    final dashboard = widget.viewModel.data;
    if (widget.viewModel.loading && dashboard == null) return const Center(child: CircularProgressIndicator());
    return RefreshIndicator(onRefresh: widget.viewModel.load, child: ListView(padding: const EdgeInsets.all(16), children: [
      Text('Visão geral', style: Theme.of(context).textTheme.headlineSmall), const SizedBox(height: 16),
      Text('Agendamentos: ${dashboard?.appointments ?? 0}'), Text('Finalizados: ${dashboard?.completed ?? 0}'),
      Text('Faturamento: R\$ ${(dashboard?.revenue ?? 0).toStringAsFixed(2)}'), const SizedBox(height: 16),
      Text('Por barbeiro', style: Theme.of(context).textTheme.titleLarge),
      if (dashboard != null) for (final item in dashboard.byBarber)
        ListTile(leading: const Icon(Icons.content_cut), title: Text('${item['name']}'), trailing: Text('R\$ ${((item['revenue'] as num?) ?? 0).toStringAsFixed(2)}')),
    ]));
  }
}
