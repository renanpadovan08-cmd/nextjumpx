import 'package:flutter/material.dart';

import '../../data/model/auth_user_dto.dart';
import '../core/theme/zen_colors.dart';
import '../core/widgets/zen_card.dart';
import '../core/widgets/zen_page.dart';
import 'view_models/barbers_view_model.dart';

class BarbersScreen extends StatefulWidget {
  const BarbersScreen({super.key, required this.user, required this.viewModel});
  final AuthUserDto user;
  final BarbersViewModel viewModel;
  @override
  State<BarbersScreen> createState() => _BarbersScreenState();
}

class _BarbersScreenState extends State<BarbersScreen> {
  @override
  void initState() { super.initState(); widget.viewModel..addListener(_reload)..load(); }
  void _reload() { if (mounted) setState(() {}); }
  @override
  void dispose() { widget.viewModel.removeListener(_reload); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    if (widget.viewModel.loading && widget.viewModel.items.isEmpty) return const Center(child: CircularProgressIndicator());
    return ZenPage(
      title: 'Equipe',
      actions: [FilledButton.icon(onPressed: _create, icon: const Icon(Icons.person_add_alt_1), label: const Text('Novo barbeiro'))],
      children: [
        if (widget.viewModel.items.isEmpty) const ZenEmptyState(message: 'Nenhum profissional cadastrado', icon: Icons.groups_outlined),
        for (final barber in widget.viewModel.items)
          Padding(padding: const EdgeInsets.only(bottom: 10), child: ZenCard(child: ListTile(contentPadding: EdgeInsets.zero, leading: CircleAvatar(backgroundColor: ZenColors.green.withValues(alpha: .18), child: const Icon(Icons.person, color: ZenColors.green)), title: Text(barber.name, style: const TextStyle(fontWeight: FontWeight.w900)), subtitle: Text('${barber.role} · ${barber.workStart}–${barber.workEnd}', style: const TextStyle(color: ZenColors.muted)), trailing: ZenStatusPill(label: '${barber.commissionRate.toStringAsFixed(0)}%', color: ZenColors.sky)))),
      ],
    );
  }

  Future<void> _create() async {
    final name = TextEditingController(), login = TextEditingController(), password = TextEditingController(), phone = TextEditingController(), commission = TextEditingController(text: '0');
    final data = await showDialog<Map<String, String>>(context: context, builder: (context) => AlertDialog(title: const Text('Novo barbeiro'), content: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [_field(name, 'Nome'), _field(login, 'Login'), _field(password, 'Senha', obscure: true), _field(phone, 'WhatsApp'), _field(commission, 'Comissão (%)', number: true)])), actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')), FilledButton(onPressed: () => Navigator.pop(context, {'name': name.text.trim(), 'login': login.text.trim(), 'password': password.text, 'phone': phone.text.trim(), 'commission': commission.text.trim()}), child: const Text('Cadastrar'))]));
    name.dispose(); login.dispose(); password.dispose(); phone.dispose(); commission.dispose();
    if (data == null || data['name']!.isEmpty || data['login']!.isEmpty || data['password']!.isEmpty) return;
    try {
      await widget.viewModel.create({'name': data['name'], 'login': data['login'], 'password': data['password'], 'phone': data['phone'], 'commissionRate': double.tryParse(data['commission'] ?? '') ?? 0});
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Barbeiro cadastrado.')));
    } catch (error) { if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error'))); }
  }

  Widget _field(TextEditingController controller, String label, {bool obscure = false, bool number = false}) => Padding(padding: const EdgeInsets.only(bottom: 9), child: TextField(controller: controller, obscureText: obscure, keyboardType: number ? TextInputType.number : TextInputType.text, decoration: InputDecoration(labelText: label)));
}
