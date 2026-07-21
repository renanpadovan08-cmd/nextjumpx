import 'package:flutter/material.dart';
import 'view_models/dashboard_view_model.dart';
import '../core/widgets/zen_card.dart';
import '../core/theme/zen_colors.dart';

class DashboardScreen extends StatefulWidget { const DashboardScreen({super.key, required this.viewModel}); final DashboardViewModel viewModel; @override State<DashboardScreen> createState() => _DashboardScreenState(); }
class _DashboardScreenState extends State<DashboardScreen> {
  @override void initState() { super.initState(); widget.viewModel.addListener(_refresh); widget.viewModel.load(); }
  void _refresh() { if (mounted) setState(() {}); }
  @override void dispose() { widget.viewModel.removeListener(_refresh); super.dispose(); }
  @override Widget build(BuildContext context) {
    final dashboard = widget.viewModel.data;
    if (widget.viewModel.loading && dashboard == null) return const Center(child: CircularProgressIndicator());
    return RefreshIndicator(onRefresh: widget.viewModel.load, child: ListView(padding: const EdgeInsets.all(20), children: [
      Text('Visão geral', style: Theme.of(context).textTheme.headlineSmall), const SizedBox(height: 16),
      Wrap(spacing:12,runSpacing:12,children:[ZenMetricCard(icon:Icons.calendar_month,label:'Agendamentos',value:'${dashboard?.appointments ?? 0}'),ZenMetricCard(icon:Icons.check_circle,label:'Finalizados',value:'${dashboard?.completed ?? 0}',color:ZenColors.sky),ZenMetricCard(icon:Icons.payments,label:'Faturamento',value:'R\$ ${(dashboard?.revenue ?? 0).toStringAsFixed(2)}',color:ZenColors.jade)]), const SizedBox(height: 24),
      Text('Por barbeiro', style: Theme.of(context).textTheme.titleLarge),
      if (dashboard != null) for (final item in dashboard.byBarber)
        Padding(padding:const EdgeInsets.only(top:10),child:ZenCard(child:ListTile(contentPadding:EdgeInsets.zero,leading:const CircleAvatar(child:Icon(Icons.content_cut)),title:Text('${item['name']}'),subtitle:const Text('Desempenho do mês',style:TextStyle(color:ZenColors.muted)),trailing:Text('R\$ ${((item['revenue'] as num?) ?? 0).toStringAsFixed(2)}',style:const TextStyle(fontWeight:FontWeight.w900))))),
    ]));
  }
}
