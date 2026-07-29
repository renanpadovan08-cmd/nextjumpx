import 'dart:convert';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';

import '../../data/model/auth_user_dto.dart';
import '../../data/model/barber_dto.dart';
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
  void initState() {
    super.initState();
    widget.viewModel
      ..addListener(_reload)
      ..load();
  }

  void _reload() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    widget.viewModel.removeListener(_reload);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.viewModel.loading && widget.viewModel.items.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }
    return ZenPage(
      title: 'Equipe',
      actions: [
        if (widget.user.isManager)
          FilledButton.icon(
              onPressed: _create,
              icon: const Icon(Icons.person_add_alt_1),
              label: const Text('Novo barbeiro'))
      ],
      children: [
        if (widget.viewModel.items.isEmpty)
          const ZenEmptyState(
              message: 'Nenhum profissional cadastrado',
              icon: Icons.groups_outlined),
        for (final barber in widget.viewModel.items)
          Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child:
                  ZenCard(child: LayoutBuilder(builder: (context, constraints) {
                final avatar = CircleAvatar(
                    backgroundColor: ZenColors.green.withValues(alpha: .18),
                    child: barber.photoUrl.trim().isEmpty
                        ? const Icon(Icons.person, color: ZenColors.green)
                        : ClipOval(
                            child: Image.network(
                              barber.photoUrl,
                              width: 40,
                              height: 40,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => const Icon(
                                  Icons.person,
                                  color: ZenColors.green),
                            ),
                          ));
                final details = Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(barber.name,
                        style: const TextStyle(fontWeight: FontWeight.w900)),
                    const SizedBox(height: 3),
                    Text(
                        '${barber.role} · ${barber.workStart}–${barber.workEnd}',
                        style: const TextStyle(color: ZenColors.muted)),
                  ],
                );
                final controls = [
                  ZenStatusPill(
                      label: '${barber.commissionRate.toStringAsFixed(0)}%',
                      color: ZenColors.sky),
                  if (widget.user.isManager || widget.user.id == barber.id)
                    IconButton(
                      onPressed: () => _edit(barber),
                      icon: const Icon(Icons.edit_outlined),
                      tooltip: 'Editar profissional',
                      visualDensity: VisualDensity.compact,
                    ),
                ];

                if (constraints.maxWidth >= 560) {
                  return Row(children: [
                    avatar,
                    const SizedBox(width: 16),
                    Expanded(child: details),
                    const SizedBox(width: 10),
                    ...controls,
                  ]);
                }
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        avatar,
                        const SizedBox(width: 12),
                        Expanded(child: details),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      alignment: WrapAlignment.end,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 4,
                      children: controls,
                    ),
                  ],
                );
              }))),
      ],
    );
  }

  Future<void> _create() async {
    final name = TextEditingController(),
        login = TextEditingController(),
        password = TextEditingController(),
        phone = TextEditingController(),
        commission = TextEditingController(text: '0');
    final data = await showDialog<Map<String, String>>(
        context: context,
        builder: (context) => AlertDialog(
                title: const Text('Novo barbeiro'),
                content: SingleChildScrollView(
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                  _field(name, 'Nome'),
                  _field(login, 'Login'),
                  _field(password, 'Senha', obscure: true),
                  _field(phone, 'WhatsApp'),
                  _field(commission, 'Comissão (%)', number: true)
                ])),
                actions: [
                  TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Cancelar')),
                  FilledButton(
                      onPressed: () => Navigator.pop(context, {
                            'name': name.text.trim(),
                            'login': login.text.trim(),
                            'password': password.text,
                            'phone': phone.text.trim(),
                            'commission': commission.text.trim()
                          }),
                      child: const Text('Cadastrar'))
                ]));
    name.dispose();
    login.dispose();
    password.dispose();
    phone.dispose();
    commission.dispose();
    if (data == null ||
        data['name']!.isEmpty ||
        data['login']!.isEmpty ||
        data['password']!.isEmpty) {
      return;
    }
    try {
      await widget.viewModel.create({
        'name': data['name'],
        'login': data['login'],
        'password': data['password'],
        'phone': data['phone'],
        'commissionRate': double.tryParse(data['commission'] ?? '') ?? 0
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Barbeiro cadastrado.')));
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }

  Future<void> _edit(BarberDto barber) async {
    final name = TextEditingController(text: barber.name);
    final login = TextEditingController(text: barber.login);
    final password = TextEditingController();
    final phone = TextEditingController(text: barber.phone);
    final commission =
        TextEditingController(text: barber.commissionRate.toString());
    final workStart = TextEditingController(text: barber.workStart);
    final workEnd = TextEditingController(text: barber.workEnd);
    final offDays = TextEditingController(text: barber.offDays);
    final photoUrl = TextEditingController(text: barber.photoUrl);
    var role = ['gerente', 'manager', 'owner'].contains(barber.role)
        ? 'gerente'
        : 'barber';
    var canSelfBlock = barber.canSelfBlock;
    PlatformFile? selectedPhoto;
    final data = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Editar ${barber.name}'),
        content: StatefulBuilder(
          builder: (context, setDialogState) => SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _field(name, 'Nome'),
                if (widget.user.isManager) ...[
                  _field(login, 'Login'),
                  _field(
                    password,
                    'Nova senha (deixe vazio para manter)',
                    obscure: true,
                  ),
                  DropdownButtonFormField<String>(
                    initialValue: role,
                    items: const [
                      DropdownMenuItem(
                        value: 'barber',
                        child: Text('Barbeiro'),
                      ),
                      DropdownMenuItem(
                        value: 'gerente',
                        child: Text('Gerente'),
                      ),
                    ],
                    onChanged: (value) =>
                        setDialogState(() => role = value ?? role),
                    decoration: const InputDecoration(labelText: 'Perfil'),
                  ),
                  const SizedBox(height: 9),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    value: canSelfBlock,
                    onChanged: (value) =>
                        setDialogState(() => canSelfBlock = value),
                    title: const Text('Pode bloquear a própria agenda'),
                    subtitle: const Text(
                      'Libera bloqueios de emergência pelo profissional.',
                    ),
                  ),
                ],
                _field(phone, 'WhatsApp'),
                if (widget.user.isManager)
                  _field(commission, 'Comissão (%)', number: true),
                _field(workStart, 'Início do expediente'),
                _field(workEnd, 'Fim do expediente'),
                _field(offDays, 'Folgas (0=dom, 1=seg...)'),
                const SizedBox(height: 4),
                CircleAvatar(
                  radius: 44,
                  backgroundColor: ZenColors.green.withValues(alpha: .18),
                  child: selectedPhoto?.bytes != null
                      ? ClipOval(
                          child: Image.memory(
                            selectedPhoto!.bytes!,
                            width: 88,
                            height: 88,
                            fit: BoxFit.cover,
                          ),
                        )
                      : photoUrl.text.trim().isEmpty
                          ? const Icon(Icons.person,
                              color: ZenColors.green, size: 42)
                          : ClipOval(
                              child: Image.network(
                                photoUrl.text.trim(),
                                width: 88,
                                height: 88,
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => const Icon(
                                    Icons.person,
                                    color: ZenColors.green,
                                    size: 42),
                              ),
                            ),
                ),
                const SizedBox(height: 10),
                OutlinedButton.icon(
                  onPressed: () async {
                    final selection = await FilePicker.platform.pickFiles(
                      type: FileType.custom,
                      allowedExtensions: const [
                        'jpg',
                        'jpeg',
                        'png',
                        'webp',
                        'gif'
                      ],
                      allowMultiple: false,
                      withData: true,
                    );
                    if (selection == null || selection.files.isEmpty) return;
                    final file = selection.files.single;
                    if (file.bytes == null || file.bytes!.isEmpty) return;
                    if (file.size > 4 * 1024 * 1024) {
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                              content:
                                  Text('A imagem deve ter no máximo 4 MB.')),
                        );
                      }
                      return;
                    }
                    setDialogState(() => selectedPhoto = file);
                  },
                  icon: const Icon(Icons.upload_file),
                  label: Text(selectedPhoto == null
                      ? 'Selecionar foto do computador'
                      : 'Trocar foto selecionada'),
                ),
                const SizedBox(height: 8),
                _field(photoUrl, 'URL pública da foto (opcional)'),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancelar')),
          FilledButton(
            onPressed: () => Navigator.pop(context, {
              'name': name.text.trim(),
              'login': login.text.trim(),
              'password': password.text,
              'role': role,
              'canSelfBlock': canSelfBlock,
              'phone': phone.text.trim(),
              'commission': commission.text.trim(),
              'workStart': workStart.text.trim(),
              'workEnd': workEnd.text.trim(),
              'offDays': offDays.text.trim(),
              'photoUrl': photoUrl.text.trim(),
            }),
            child: const Text('Salvar'),
          ),
        ],
      ),
    );
    name.dispose();
    login.dispose();
    password.dispose();
    phone.dispose();
    commission.dispose();
    workStart.dispose();
    workEnd.dispose();
    offDays.dispose();
    photoUrl.dispose();
    if (data == null || (data['name'] ?? '').isEmpty) return;
    try {
      var resolvedPhotoUrl = '${data['photoUrl'] ?? ''}'.trim();
      if (selectedPhoto?.bytes != null) {
        final uploadedUrl = await widget.viewModel.uploadPhoto(
          barber.id,
          selectedPhoto!.name,
          base64Encode(selectedPhoto!.bytes!),
        );
        if (uploadedUrl == null) {
          throw Exception(widget.viewModel.error ??
              'Não foi possível enviar a foto do profissional.');
        }
        resolvedPhotoUrl = uploadedUrl;
      }
      await widget.viewModel.update(barber.id, {
        'name': data['name'],
        if (widget.user.isManager) 'login': data['login'],
        if (widget.user.isManager && '${data['password']}'.isNotEmpty)
          'password': data['password'],
        if (widget.user.isManager) 'role': data['role'],
        if (widget.user.isManager) 'canSelfBlock': data['canSelfBlock'],
        'phone': data['phone'],
        if (widget.user.isManager)
          'commissionRate': double.tryParse(data['commission'] ?? '') ??
              barber.commissionRate,
        'workStart': data['workStart'],
        'workEnd': data['workEnd'],
        'offDays': data['offDays'],
        'photoUrl': resolvedPhotoUrl,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profissional atualizado.')),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }

  Widget _field(TextEditingController controller, String label,
          {bool obscure = false, bool number = false}) =>
      Padding(
          padding: const EdgeInsets.only(bottom: 9),
          child: TextField(
              controller: controller,
              obscureText: obscure,
              keyboardType: number ? TextInputType.number : TextInputType.text,
              decoration: InputDecoration(labelText: label)));
}
