import 'package:flutter/material.dart';

import '../core/theme/zen_colors.dart';
import '../core/widgets/zen_card.dart';
import 'view_models/admin_view_model.dart';

class AdminScreen extends StatefulWidget {
  const AdminScreen({super.key, required this.viewModel});
  final AdminViewModel viewModel;

  @override
  State<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends State<AdminScreen> {
  String filter = '';

  @override
  void initState() {
    super.initState();
    widget.viewModel..addListener(_refresh)..load();
  }

  void _refresh() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    widget.viewModel.removeListener(_refresh);
    super.dispose();
  }

  List<Map<String, dynamic>> get _items {
    final value = filter.trim().toLowerCase();
    if (value.isEmpty) return widget.viewModel.items;
    return widget.viewModel.items.where((item) => '${item['name']} ${item['shop_name']} ${item['login']}'.toLowerCase().contains(value)).toList();
  }

  @override
  Widget build(BuildContext context) => RefreshIndicator(
        onRefresh: widget.viewModel.load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(32, 26, 32, 92),
          children: [
            const Text('Gestão PRO', style: TextStyle(fontSize: 25, fontWeight: FontWeight.w900, letterSpacing: -.9)),
            const SizedBox(height: 5),
            const Text('Aprovação, status de acesso e suporte administrativo para todas as barbearias.', style: TextStyle(color: ZenColors.muted)),
            const SizedBox(height: 16),
            Wrap(spacing: 12, runSpacing: 12, children: [
              _metric('Cadastros', '${widget.viewModel.items.length}', ZenColors.sky),
              _metric('Ativos', '${widget.viewModel.items.where((item) => item['access_status'] == 'ativo').length}', ZenColors.green),
              _metric('Pendentes', '${widget.viewModel.items.where((item) => item['access_status'] == 'pendente').length}', const Color(0xfff0bd45)),
              _metric('Bloqueados', '${widget.viewModel.items.where((item) => item['access_status'] == 'bloqueado').length}', const Color(0xffee7474)),
            ]),
            const SizedBox(height: 16),
            ZenCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Barbearias e acessos', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
              const SizedBox(height: 5),
              const Text('Acesse cada cadastro, defina papel, libere ou bloqueie a conta e gere uma nova senha.', style: TextStyle(color: ZenColors.muted)),
              const SizedBox(height: 16),
              TextField(onChanged: (value) => setState(() => filter = value), decoration: const InputDecoration(prefixIcon: Icon(Icons.search_rounded), hintText: 'Buscar por barbearia, responsável ou login')),
              const SizedBox(height: 12),
              if (widget.viewModel.loading) const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator()))
              else if (widget.viewModel.error != null) _error(widget.viewModel.error!)
              else if (_items.isEmpty) const Padding(padding: EdgeInsets.all(22), child: Center(child: Text('Nenhum cadastro encontrado.', style: TextStyle(color: ZenColors.muted))))
              else ..._items.map(_account),
            ])),
          ],
        ),
      );

  Widget _account(Map<String, dynamic> item) {
    final status = '${item['access_status'] ?? 'pendente'}';
    final role = '${item['role'] ?? 'barbeiro'}';
    final color = switch (status) { 'ativo' => ZenColors.green, 'bloqueado' => ZenColors.red, 'rejeitado' => ZenColors.red, _ => const Color(0xfff0bd45) };
    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(color: const Color(0xff09131f), border: Border.all(color: const Color(0xff223142)), borderRadius: BorderRadius.circular(16)),
      child: LayoutBuilder(builder: (context, box) => box.maxWidth > 760 ? Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Expanded(child: _accountInfo(item, status, role, color)), const SizedBox(width: 12), _accountActions(item, status, role)]) : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [_accountInfo(item, status, role, color), const SizedBox(height: 12), _accountActions(item, status, role)])),
    );
  }

  Widget _accountInfo(Map<String, dynamic> item, String status, String role, Color color) => Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(width: 42, height: 42, alignment: Alignment.center, decoration: BoxDecoration(color: color.withValues(alpha: .16), borderRadius: BorderRadius.circular(13)), child: Icon(Icons.storefront_rounded, color: color)),
        const SizedBox(width: 11),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('${item['shop_name'] ?? 'Barbearia sem nome'}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15)), const SizedBox(height: 3), Text('${item['name'] ?? 'Responsável'} • @${item['login'] ?? ''}', style: const TextStyle(color: ZenColors.muted, fontSize: 12)), const SizedBox(height: 7), Wrap(spacing: 6, runSpacing: 6, children: [_pill(status, color), _pill(role, const Color(0xff7da9e8)), if (item['expires_at'] != null && '${item['expires_at']}'.isNotEmpty) _pill('Expira: ${item['expires_at']}', ZenColors.muted)])]))
      ]);

  Widget _accountActions(Map<String, dynamic> item, String status, String role) => SizedBox(width: 290, child: Wrap(alignment: WrapAlignment.end, spacing: 7, runSpacing: 7, children: [
        _button(status == 'ativo' ? 'Bloquear' : 'Liberar', status == 'ativo' ? () => _change(item, {'access_status': 'bloqueado'}) : () => _change(item, {'access_status': 'ativo'}), danger: status == 'ativo', green: status != 'ativo'),
        _button('Papel', () => _roleDialog(item, role)),
        _button('Validade', () => _expiryDialog(item)),
        _button('Nova senha', () => _passwordDialog(item)),
      ]));

  Widget _metric(String label, String value, Color color) => SizedBox(width: 166, child: Container(padding: const EdgeInsets.all(15), decoration: BoxDecoration(color: const Color(0xff0a1521), border: Border.all(color: color.withValues(alpha: .35)), borderRadius: BorderRadius.circular(17)), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(label.toUpperCase(), style: const TextStyle(color: ZenColors.muted, fontSize: 10, fontWeight: FontWeight.w900)), const SizedBox(height: 7), Text(value, style: TextStyle(fontSize: 23, fontWeight: FontWeight.w900, color: color))])));

  Widget _pill(String label, Color color) => Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4), decoration: BoxDecoration(color: color.withValues(alpha: .13), borderRadius: BorderRadius.circular(99)), child: Text(label, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w900)));

  Widget _button(String label, VoidCallback onTap, {bool danger = false, bool green = false}) => OutlinedButton(onPressed: onTap, style: OutlinedButton.styleFrom(foregroundColor: danger ? const Color(0xffffc3c3) : green ? const Color(0xffa8ffc1) : Colors.white, backgroundColor: danger ? const Color(0xff46191d) : green ? const Color(0xff0e482a) : const Color(0xff151d27), side: BorderSide(color: danger ? const Color(0xff873c41) : green ? const Color(0xff298a4e) : const Color(0xff394654)), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))), child: Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900)));

  Widget _error(String value) => Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: const Color(0xff421b20), borderRadius: BorderRadius.circular(11)), child: Text(value));

  Future<void> _change(Map<String, dynamic> item, Map<String, dynamic> value) async {
    final ok = await widget.viewModel.updateAccess('${item['id']}', value);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(ok ? 'Acesso atualizado.' : 'Não foi possível atualizar o acesso.')));
  }

  Future<void> _roleDialog(Map<String, dynamic> item, String role) async {
    var selected = role == 'admin_master' ? 'admin' : role;
    final value = await showDialog<String>(context: context, builder: (context) => AlertDialog(title: const Text('Papel de acesso'), content: StatefulBuilder(builder: (context, setDialog) => DropdownButtonFormField<String>(initialValue: selected, decoration: const InputDecoration(labelText: 'Papel'), items: const [DropdownMenuItem(value: 'admin', child: Text('Administrador')), DropdownMenuItem(value: 'gerente', child: Text('Gerente')), DropdownMenuItem(value: 'barbeiro', child: Text('Barbeiro'))], onChanged: (newValue) => setDialog(() => selected = newValue ?? selected))), actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')), FilledButton(onPressed: () => Navigator.pop(context, selected), child: const Text('Salvar'))]));
    if (value != null) await _change(item, {'role': value});
  }

  Future<void> _expiryDialog(Map<String, dynamic> item) async {
    final controller = TextEditingController(text: '${item['expires_at'] ?? ''}');
    final value = await showDialog<String>(context: context, builder: (context) => AlertDialog(title: const Text('Validade do acesso'), content: TextField(controller: controller, decoration: const InputDecoration(labelText: 'Data AAAA-MM-DD', hintText: 'Ex.: 2027-12-31')), actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')), FilledButton(onPressed: () => Navigator.pop(context, controller.text.trim()), child: const Text('Salvar'))]));
    controller.dispose();
    if (value != null) await _change(item, {'expires_at': value});
  }

  Future<void> _passwordDialog(Map<String, dynamic> item) async {
    final controller = TextEditingController();
    final value = await showDialog<String>(context: context, builder: (context) => AlertDialog(title: const Text('Gerar nova senha'), content: TextField(controller: controller, obscureText: true, decoration: const InputDecoration(labelText: 'Nova senha', helperText: 'Mínimo de 8 caracteres')), actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')), FilledButton(onPressed: () => Navigator.pop(context, controller.text), child: const Text('Salvar senha'))]));
    controller.dispose();
    if (value == null || value.length < 8) return;
    final ok = await widget.viewModel.resetPassword('${item['id']}', value);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(ok ? 'Senha redefinida. O usuário deverá trocá-la no próximo acesso.' : 'Não foi possível redefinir a senha.')));
  }
}
