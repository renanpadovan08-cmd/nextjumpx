import 'dart:convert';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';

import '../../core/decimal_parser.dart';
import '../../data/model/auth_user_dto.dart';
import '../../data/model/service_dto.dart';
import '../barbers/view_models/barbers_view_model.dart';
import '../core/theme/zen_colors.dart';
import '../core/widgets/zen_card.dart';
import '../core/widgets/zen_page.dart';
import 'view_models/catalog_view_model.dart';

class CatalogScreen extends StatefulWidget {
  const CatalogScreen(
      {super.key,
      required this.user,
      required this.viewModel,
      required this.barbers});

  final AuthUserDto user;
  final CatalogViewModel viewModel;
  final BarbersViewModel barbers;

  @override
  State<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends State<CatalogScreen> {
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    widget.viewModel.addListener(_reload);
    widget.barbers.addListener(_reload);
    _scrollController.addListener(_loadNextPage);
    _initialize();
  }

  Future<void> _initialize() async {
    await widget.barbers.load();
    await widget.viewModel
        .loadPaginated(widget.user.isManager ? null : widget.user.id);
  }

  void _loadNextPage() {
    if (_scrollController.hasClients &&
        _scrollController.position.extentAfter <= 320) {
      widget.viewModel.loadMore();
    }
  }

  @override
  void dispose() {
    widget.viewModel.removeListener(_reload);
    widget.barbers.removeListener(_reload);
    _scrollController
      ..removeListener(_loadNextPage)
      ..dispose();
    super.dispose();
  }

  void _reload() {
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    if (widget.viewModel.loading && widget.viewModel.items.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    return ZenPage(
      controller: _scrollController,
      title: 'Serviços',
      actions: [
        FilledButton.icon(
          onPressed: _create,
          icon: const Icon(Icons.add),
          label: const Text('Novo serviço'),
        ),
      ],
      children: [
        for (final service in widget.viewModel.items)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: ZenCard(
              child: _serviceTile(service),
            ),
          ),
        if (widget.viewModel.loadingMore)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 18),
            child: Center(child: CircularProgressIndicator()),
          )
        else if (widget.viewModel.hasMore)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Center(
              child: Text(
                'Role para carregar mais 10 servicos',
                style: TextStyle(color: ZenColors.muted, fontSize: 12),
              ),
            ),
          ),
      ],
    );
  }

  Widget _serviceTile(ServiceDto service) => LayoutBuilder(
        builder: (context, constraints) {
          final avatar = CircleAvatar(
            backgroundImage: service.imageUrl.isEmpty
                ? null
                : NetworkImage(service.imageUrl),
            child: service.imageUrl.isNotEmpty
                ? null
                : Text(
                    service.iconText.isEmpty
                        ? '✂'
                        : service.iconText.substring(
                            0,
                            service.iconText.length > 2
                                ? 2
                                : service.iconText.length,
                          ),
                  ),
          );
          final details = Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                service.name,
                style: const TextStyle(fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 3),
              Text(
                '${service.duration} minutos · ${_barberName(service.barberId)}',
                style: const TextStyle(color: ZenColors.muted),
              ),
            ],
          );
          final price = Text(
            'R\$ ${service.price.toStringAsFixed(2).replaceAll('.', ',')}',
            style: const TextStyle(
              color: ZenColors.jade,
              fontWeight: FontWeight.w900,
            ),
          );
          final actions = _serviceActions(service);

          if (constraints.maxWidth >= 700) {
            return Row(
              children: [
                avatar,
                const SizedBox(width: 16),
                Expanded(child: details),
                const SizedBox(width: 12),
                price,
                const SizedBox(width: 4),
                ...actions,
              ],
            );
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
              const SizedBox(height: 12),
              price,
              const SizedBox(height: 8),
              const Divider(height: 1),
              const SizedBox(height: 4),
              Wrap(
                alignment: WrapAlignment.end,
                spacing: 2,
                runSpacing: 2,
                children: actions,
              ),
            ],
          );
        },
      );

  List<Widget> _serviceActions(ServiceDto service) => [
        _compactIconButton(
          onPressed: () => _move(service, -1),
          icon: Icons.arrow_upward,
          tooltip: 'Mover para cima',
        ),
        _compactIconButton(
          onPressed: () => _move(service, 1),
          icon: Icons.arrow_downward,
          tooltip: 'Mover para baixo',
        ),
        _compactIconButton(
          onPressed: () => _uploadImage(service),
          icon: Icons.add_photo_alternate_outlined,
          tooltip: 'Enviar foto do computador',
        ),
        _compactIconButton(
          onPressed: () => _edit(service),
          icon: Icons.edit_outlined,
          tooltip: 'Editar serviço',
        ),
        _compactIconButton(
          onPressed: () => _delete(service.id),
          icon: Icons.delete_outline,
          color: ZenColors.red,
          tooltip: 'Excluir serviço',
        ),
      ];

  Widget _compactIconButton({
    required VoidCallback onPressed,
    required IconData icon,
    required String tooltip,
    Color? color,
  }) =>
      IconButton(
        onPressed: onPressed,
        icon: Icon(icon, color: color),
        tooltip: tooltip,
        visualDensity: VisualDensity.compact,
        constraints: const BoxConstraints(minWidth: 40, minHeight: 40),
      );

  String _barberName(String id) {
    for (final barber in widget.barbers.items) {
      if (barber.id == id) return barber.name;
    }
    return 'Profissional';
  }

  Future<void> _create() async {
    final name = TextEditingController();
    final price = TextEditingController();
    final duration = TextEditingController(text: '30');
    final icon = TextEditingController();
    final image = TextEditingController();
    final ownBarbers =
        widget.barbers.items.where((barber) => barber.id == widget.user.id);
    var barberId = ownBarbers.isNotEmpty
        ? ownBarbers.first.id
        : (widget.barbers.items.isEmpty ? '' : widget.barbers.items.first.id);
    final values = await showDialog<Map<String, String>>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Novo serviço'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                  controller: name,
                  decoration: const InputDecoration(labelText: 'Nome')),
              const SizedBox(height: 10),
              TextField(
                controller: price,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(labelText: 'Preço'),
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                initialValue: barberId.isEmpty ? null : barberId,
                items: widget.barbers.items
                    .map((barber) => DropdownMenuItem(
                        value: barber.id, child: Text(barber.name)))
                    .toList(),
                onChanged: (value) => barberId = value ?? barberId,
                decoration: const InputDecoration(labelText: 'Profissional'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: icon,
                decoration:
                    const InputDecoration(labelText: 'Ícone curto (opcional)'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: image,
                decoration: const InputDecoration(
                    labelText: 'URL da imagem (opcional)'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: duration,
                keyboardType: TextInputType.number,
                decoration:
                    const InputDecoration(labelText: 'Duração em minutos'),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancelar')),
          FilledButton(
            onPressed: () => Navigator.pop(context, {
              'name': name.text.trim(),
              'price': price.text.trim(),
              'duration': duration.text.trim(),
              'barberId': barberId,
              'iconText': icon.text.trim(),
              'imageUrl': image.text.trim(),
            }),
            child: const Text('Salvar'),
          ),
        ],
      ),
    );
    name.dispose();
    price.dispose();
    duration.dispose();
    icon.dispose();
    image.dispose();
    if (values == null || values['name']!.isEmpty) return;

    try {
      final rawPrice = (values['price'] ?? '').toString().trim();
      final parsedPrice = rawPrice.isEmpty ? 0.0 : parseDecimalValue(rawPrice);
      if (parsedPrice == null || parsedPrice < 0) {
        throw Exception('Informe um preço válido, como 19,90.');
      }
      await widget.viewModel.create({
        'barberId': values['barberId'],
        'name': values['name'],
        'price': parsedPrice,
        'duration': int.tryParse(values['duration'] ?? '') ?? 30,
        'iconText': values['iconText'],
        'imageUrl': values['imageUrl'],
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Serviço cadastrado.')),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }

  Future<void> _edit(ServiceDto service) async {
    final name = TextEditingController(text: service.name);
    final price = TextEditingController(text: service.price.toString());
    final duration = TextEditingController(text: service.duration.toString());
    final icon = TextEditingController(text: service.iconText);
    final image = TextEditingController(text: service.imageUrl);
    final values = await showDialog<Map<String, String>>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Editar serviço'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                  controller: name,
                  decoration: const InputDecoration(labelText: 'Nome')),
              const SizedBox(height: 10),
              TextField(
                  controller: price,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(labelText: 'Preço')),
              const SizedBox(height: 10),
              TextField(
                  controller: duration,
                  keyboardType: TextInputType.number,
                  decoration:
                      const InputDecoration(labelText: 'Duração em minutos')),
              const SizedBox(height: 10),
              TextField(
                  controller: icon,
                  decoration: const InputDecoration(labelText: 'Ícone curto')),
              const SizedBox(height: 10),
              TextField(
                  controller: image,
                  decoration:
                      const InputDecoration(labelText: 'URL da imagem')),
            ],
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancelar')),
          FilledButton(
              onPressed: () => Navigator.pop(context, {
                    'name': name.text.trim(),
                    'price': price.text.trim(),
                    'duration': duration.text.trim(),
                    'iconText': icon.text.trim(),
                    'imageUrl': image.text.trim(),
                  }),
              child: const Text('Salvar')),
        ],
      ),
    );
    name.dispose();
    price.dispose();
    duration.dispose();
    icon.dispose();
    image.dispose();
    if (values == null || (values['name'] ?? '').isEmpty) return;
    try {
      final rawPrice = (values['price'] ?? '').toString().trim();
      final parsedPrice =
          rawPrice.isEmpty ? service.price : parseDecimalValue(rawPrice);
      if (parsedPrice == null || parsedPrice < 0) {
        throw Exception('Informe um preço válido, como 19,90.');
      }
      await widget.viewModel.update(service.id, {
        'name': values['name'],
        'price': parsedPrice,
        'duration': int.tryParse(values['duration'] ?? '') ?? service.duration,
        'icon_text': values['iconText'],
        'image_url': values['imageUrl'],
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Serviço atualizado.')),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }

  Future<void> _move(ServiceDto service, int direction) async {
    final ordered = widget.viewModel.items
        .where((item) => item.barberId == service.barberId)
        .toList()
      ..sort((a, b) => a.displayOrder.compareTo(b.displayOrder));
    final current = ordered.indexWhere((item) => item.id == service.id);
    final target = current + direction;
    if (current < 0 || target < 0 || target >= ordered.length) return;
    final other = ordered[target];
    await widget.viewModel.reorder(
      service.id,
      target,
      other.id,
      current,
    );
  }

  Future<void> _uploadImage(ServiceDto service) async {
    final selection = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: const ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      withData: true,
    );
    final file = selection?.files.single;
    final bytes = file?.bytes;
    if (file == null || bytes == null) return;
    if (bytes.length > 4 * 1024 * 1024) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('A imagem deve ter no máximo 4 MB.')),
        );
      }
      return;
    }
    try {
      final url = await widget.viewModel.uploadImage(service.id, {
        'fileName': file.name,
        'data': base64Encode(bytes),
      });
      if (url.isEmpty) throw Exception('URL da imagem não retornada');
      await widget.viewModel.update(service.id, {'image_url': url});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Foto do serviço atualizada.')),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }

  Future<void> _delete(String id) async {
    try {
      await widget.viewModel.delete(id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Serviço excluído.')),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }
}
