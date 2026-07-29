import 'package:flutter/material.dart';

import '../../services/pwa_install.dart';
import '../core/theme/zen_colors.dart';
import '../core/view_models/app_view_model.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, required this.viewModel});

  final AppViewModel viewModel;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class ForcedPasswordScreen extends StatefulWidget {
  const ForcedPasswordScreen({super.key, required this.viewModel});

  final AppViewModel viewModel;

  @override
  State<ForcedPasswordScreen> createState() => _ForcedPasswordScreenState();
}

class TermsAcceptanceScreen extends StatefulWidget {
  const TermsAcceptanceScreen({super.key, required this.viewModel});

  final AppViewModel viewModel;

  @override
  State<TermsAcceptanceScreen> createState() => _TermsAcceptanceScreenState();
}

class _TermsAcceptanceScreenState extends State<TermsAcceptanceScreen> {
  bool acceptedUse = false;
  bool acceptedResponsibility = false;

  bool get canContinue =>
      acceptedUse && acceptedResponsibility && !widget.viewModel.loading;

  Future<void> _accept() async {
    final ok = await widget.viewModel.acceptTerms();
    if (!ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(widget.viewModel.error ??
              'Não foi possível registrar o aceite dos termos.')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final isBarber = widget.viewModel.user?.isManager != true;
    final title = isBarber
        ? 'Termos de Uso do Barbeiro'
        : 'Termos de Uso do Gerente / Proprietário';
    final intro = isBarber
        ? 'Antes de acessar seu painel, leia e aceite as condições de uso do ZenBarber Pro Powered by NextJumpX.'
        : 'Antes de acessar sua gestão, leia e aceite as condições de uso do ZenBarber Pro Powered by NextJumpX.';
    final items = isBarber
        ? const [
            'As informações de agenda, clientes, atendimentos, comissões e faturamento registradas no sistema pertencem à barbearia responsável pelo cadastro.',
            'O acesso é pessoal e não deve ser compartilhado com terceiros.',
            'Alterações indevidas, exclusão de dados sem autorização ou uso incorreto da plataforma podem resultar em bloqueio de acesso.',
            'O ZenBarber Pro Powered by NextJumpX é uma ferramenta de gestão e depende do preenchimento correto das informações pelo usuário.',
          ]
        : const [
            'Você é responsável pela veracidade das informações cadastradas em sua barbearia, incluindo clientes, barbeiros, serviços, comissões e movimentações financeiras.',
            'O ZenBarber Pro Powered by NextJumpX atua como ferramenta de gestão e não substitui decisões administrativas, financeiras ou jurídicas da barbearia.',
            'O acesso à plataforma depende de assinatura ativa e poderá ser suspenso em caso de inadimplência, uso indevido ou violação destes termos.',
            'Você declara estar autorizado a cadastrar e gerenciar os dados da sua unidade dentro da plataforma.',
          ];

    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 760),
            child: _ZenPanel(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(children: [
                    Container(
                      width: 52,
                      height: 52,
                      padding: const EdgeInsets.all(5),
                      decoration: BoxDecoration(
                        color: const Color(0xff090d12),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xffb39138)),
                      ),
                      child: Image.asset(
                          'assets/images/nextjumpx-logo-transparent.png'),
                    ),
                    const SizedBox(width: 14),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('ZENBARBER  PRO',
                              style: TextStyle(
                                  fontSize: 23, fontWeight: FontWeight.w900)),
                          Text(
                              'Powered by NextJumpX • Aceite obrigatório • v1.0',
                              style: TextStyle(
                                  color: Color(0xffaab8cc), fontSize: 12)),
                        ],
                      ),
                    ),
                  ]),
                  const SizedBox(height: 22),
                  Text(title,
                      style: const TextStyle(
                          fontSize: 25, fontWeight: FontWeight.w900)),
                  const SizedBox(height: 8),
                  Text(intro,
                      style: const TextStyle(
                          color: Color(0xffaab8cc), height: 1.4)),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xff091221),
                      border: Border.all(color: const Color(0xff26364c)),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: items
                          .map((item) => Padding(
                                padding:
                                    const EdgeInsets.symmetric(vertical: 6),
                                child: Text('• $item',
                                    style: const TextStyle(height: 1.4)),
                              ))
                          .toList(),
                    ),
                  ),
                  const SizedBox(height: 14),
                  CheckboxListTile(
                    value: acceptedUse,
                    onChanged: (value) =>
                        setState(() => acceptedUse = value == true),
                    contentPadding: EdgeInsets.zero,
                    controlAffinity: ListTileControlAffinity.leading,
                    title: const Text(
                        'Li e aceito os Termos de Uso da plataforma.'),
                  ),
                  CheckboxListTile(
                    value: acceptedResponsibility,
                    onChanged: (value) =>
                        setState(() => acceptedResponsibility = value == true),
                    contentPadding: EdgeInsets.zero,
                    controlAffinity: ListTileControlAffinity.leading,
                    title: const Text(
                        'Confirmo que as informações registradas no sistema são de minha responsabilidade.'),
                  ),
                  const SizedBox(height: 10),
                  _GreenAction(
                    label: widget.viewModel.loading
                        ? 'Salvando aceite...'
                        : 'Aceitar e continuar',
                    onTap: canContinue ? _accept : null,
                  ),
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: widget.viewModel.logout,
                    child: const Text('Sair'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ForcedPasswordScreenState extends State<ForcedPasswordScreen> {
  final _password = TextEditingController();
  final _confirmation = TextEditingController();

  @override
  void dispose() {
    _password.dispose();
    _confirmation.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_password.text.length < 8) {
      _message('A senha precisa ter ao menos 8 caracteres.');
      return;
    }
    if (_password.text != _confirmation.text) {
      _message('A confirmação não confere.');
      return;
    }
    final ok = await widget.viewModel.changePassword(_password.text);
    if (!ok && mounted) {
      _message(widget.viewModel.error ?? 'Não foi possível trocar a senha.');
    }
  }

  void _message(String value) => ScaffoldMessenger.of(context)
      .showSnackBar(SnackBar(content: Text(value)));

  @override
  Widget build(BuildContext context) => Scaffold(
        body: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: _ZenPanel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      'Crie uma nova senha',
                      style:
                          TextStyle(fontSize: 25, fontWeight: FontWeight.w900),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'O administrador gerou uma senha temporária. Antes de continuar, defina sua senha definitiva.',
                      style: TextStyle(color: Color(0xffaab8cc), height: 1.35),
                    ),
                    const SizedBox(height: 18),
                    _LoginField(
                      controller: _password,
                      hint: 'Nova senha',
                      obscureText: true,
                      validator: (_) => null,
                    ),
                    const SizedBox(height: 12),
                    _LoginField(
                      controller: _confirmation,
                      hint: 'Confirmar nova senha',
                      obscureText: true,
                      validator: (_) => null,
                    ),
                    if (widget.viewModel.error != null) ...[
                      const SizedBox(height: 10),
                      Text(widget.viewModel.error!,
                          style: const TextStyle(color: Color(0xffff8585))),
                    ],
                    const SizedBox(height: 16),
                    _GreenAction(
                      label: widget.viewModel.loading
                          ? 'Salvando...'
                          : 'Salvar e continuar',
                      onTap: widget.viewModel.loading ? null : _save,
                    ),
                    const SizedBox(height: 8),
                    TextButton(
                      onPressed: widget.viewModel.logout,
                      child: const Text('Sair'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
}

class _LoginScreenState extends State<LoginScreen> {
  final _login = TextEditingController();
  final _password = TextEditingController();
  final _form = GlobalKey<FormState>();

  @override
  void dispose() {
    _login.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    await widget.viewModel.login(_login.text.trim(), _password.text);
  }

  Future<void> _signup() async {
    final name = TextEditingController();
    final shop = TextEditingController();
    final login = TextEditingController();
    final password = TextEditingController();
    final phone = TextEditingController();
    var plan = 'mensal';
    final signupForm = GlobalKey<FormState>();

    final done = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Criar conta de barbearia'),
        content: SingleChildScrollView(
          child: Form(
            key: signupForm,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: name,
                  decoration: const InputDecoration(labelText: 'Seu nome'),
                  validator: (value) =>
                      value!.trim().isEmpty ? 'Obrigatório' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: shop,
                  decoration:
                      const InputDecoration(labelText: 'Nome da barbearia'),
                  validator: (value) =>
                      value!.trim().isEmpty ? 'Obrigatório' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: login,
                  decoration: const InputDecoration(labelText: 'Login público'),
                  validator: (value) =>
                      value!.trim().isEmpty ? 'Obrigatório' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: phone,
                  decoration: const InputDecoration(labelText: 'WhatsApp'),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: password,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'Senha (mínimo 8 caracteres)',
                  ),
                  validator: (value) => (value?.length ?? 0) < 8
                      ? 'Use ao menos 8 caracteres'
                      : null,
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: plan,
                  items: const [
                    DropdownMenuItem(
                        value: 'mensal', child: Text('Plano mensal')),
                    DropdownMenuItem(
                        value: 'trimestral', child: Text('Plano trimestral')),
                    DropdownMenuItem(
                        value: 'anual', child: Text('Plano anual')),
                  ],
                  onChanged: (value) => plan = value ?? plan,
                  decoration: const InputDecoration(labelText: 'Plano'),
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () async {
              if (!signupForm.currentState!.validate()) return;
              final ok = await widget.viewModel.signup(
                name: name.text.trim(),
                shopName: shop.text.trim(),
                login: login.text.trim(),
                phone: phone.text.trim(),
                password: password.text,
                plan: plan,
              );
              if (ok && dialogContext.mounted) {
                Navigator.pop(dialogContext, true);
              }
            },
            child: const Text('Solicitar acesso'),
          ),
        ],
      ),
    );

    name.dispose();
    shop.dispose();
    login.dispose();
    password.dispose();
    phone.dispose();

    if (done == true && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Cadastro enviado. Aguarde a aprovação do administrador.',
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: const Color(0xff030914),
        body: Stack(
          children: [
            const Positioned.fill(child: _ZenBarberBackdrop()),
            SafeArea(
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final compact = constraints.maxWidth < 900;
                  final phone = constraints.maxWidth < 500;
                  final panels = [
                    const _WelcomePanel(),
                    _LoginPanel(
                      form: _form,
                      login: _login,
                      password: _password,
                      loading: widget.viewModel.loading,
                      error: widget.viewModel.error,
                      onSubmit: _submit,
                      onSignup: _signup,
                    ),
                  ];

                  return Align(
                    alignment: Alignment.topCenter,
                    child: SingleChildScrollView(
                      padding: EdgeInsets.fromLTRB(
                        phone ? 16 : 24,
                        phone ? 18 : (compact ? 28 : 56),
                        phone ? 16 : 24,
                        38,
                      ),
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 980),
                        child: compact
                            ? Column(
                                children: [
                                  panels.first,
                                  const SizedBox(height: 18),
                                  panels.last,
                                ],
                              )
                            : Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(child: panels.first),
                                  const SizedBox(width: 18),
                                  Expanded(child: panels.last),
                                ],
                              ),
                      ),
                    ),
                  );
                },
              ),
            ),
            Positioned(
              right: 26,
              bottom: 22,
              child:
                  _InstallHint(compact: MediaQuery.sizeOf(context).width < 700),
            ),
          ],
        ),
      );
}

class _WelcomePanel extends StatelessWidget {
  const _WelcomePanel();

  @override
  Widget build(BuildContext context) {
    final compact = MediaQuery.sizeOf(context).width < 500;
    return _ZenPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _ZenBarberBrand(),
          SizedBox(height: compact ? 20 : 25),
          Text(
            'Organize sua barbearia em um só lugar.',
            style: TextStyle(
              color: Colors.white,
              fontSize: compact ? 26 : 29,
              fontWeight: FontWeight.w900,
              height: 1.1,
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Agenda, serviços, barbeiros, carteira, link público e WhatsApp integrados.',
            style: TextStyle(
              color: Color(0xffaab8cc),
              fontSize: 16,
              height: 1.3,
            ),
          ),
          const SizedBox(height: 20),
          const _Feature(text: 'Link para clientes'),
          const SizedBox(height: 10),
          const _Feature(text: 'Agenda por barbeiro'),
          const SizedBox(height: 10),
          const _Feature(text: 'Bloqueio por duração do serviço'),
        ],
      ),
    );
  }
}

class _LoginPanel extends StatelessWidget {
  const _LoginPanel({
    required this.form,
    required this.login,
    required this.password,
    required this.loading,
    required this.error,
    required this.onSubmit,
    required this.onSignup,
  });

  final GlobalKey<FormState> form;
  final TextEditingController login;
  final TextEditingController password;
  final bool loading;
  final String? error;
  final Future<void> Function() onSubmit;
  final Future<void> Function() onSignup;

  @override
  Widget build(BuildContext context) => _ZenPanel(
        child: Form(
          key: form,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Entrar',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 25,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 20),
              _LoginField(
                controller: login,
                hint: 'Login',
                validator: (value) =>
                    value!.trim().isEmpty ? 'Informe o login' : null,
              ),
              const SizedBox(height: 12),
              _LoginField(
                controller: password,
                hint: 'Senha',
                obscureText: true,
                onSubmitted: (_) => loading ? null : onSubmit(),
                validator: (value) => value!.isEmpty ? 'Informe a senha' : null,
              ),
              if (error != null) ...[
                const SizedBox(height: 10),
                Text(
                  error!,
                  style: const TextStyle(
                    color: Color(0xffff8585),
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
              const SizedBox(height: 12),
              _GreenAction(
                label: loading ? 'Entrando...' : 'Entrar',
                onTap: loading ? null : onSubmit,
              ),
              const SizedBox(height: 12),
              _SecondaryAction(
                label: 'Criar conta de barbearia',
                onTap: loading ? null : onSignup,
              ),
              const SizedBox(height: 18),
              const Divider(color: Color(0xff1d2b3b), height: 1),
              const SizedBox(height: 16),
              const Text(
                'POWERED BY NEXTJUMPX',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Color(0xff8290a4),
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.1,
                ),
              ),
            ],
          ),
        ),
      );
}

class _ZenPanel extends StatelessWidget {
  const _ZenPanel({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final compact = MediaQuery.sizeOf(context).width < 500;
    return Container(
      constraints: BoxConstraints(minHeight: compact ? 0 : 460),
      padding: EdgeInsets.all(compact ? 20 : 28),
      decoration: BoxDecoration(
        color: const Color(0xee09121f),
        border: Border.all(color: const Color(0xff263647)),
        borderRadius: BorderRadius.circular(compact ? 22 : 28),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xf20b1522), Color(0xee060d16)],
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x77000000),
            blurRadius: 40,
            offset: Offset(0, 20),
          ),
        ],
      ),
      child: child,
    );
  }
}

class _ZenBarberBrand extends StatelessWidget {
  const _ZenBarberBrand();

  @override
  Widget build(BuildContext context) => LayoutBuilder(
        builder: (context, constraints) {
          final compact = constraints.maxWidth < 330;
          final logoSize = compact ? 46.0 : 54.0;
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(compact ? 13 : 16),
                    child: Image.asset(
                      'assets/images/nextjumpx-logo-transparent.png',
                      width: logoSize,
                      height: logoSize,
                      fit: BoxFit.cover,
                    ),
                  ),
                  SizedBox(width: compact ? 9 : 12),
                  Expanded(
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'ZENBARBER',
                        style: TextStyle(
                          color: Colors.white,
                          fontFamily: 'Georgia',
                          fontSize: compact ? 23 : 27,
                          fontWeight: FontWeight.w900,
                          letterSpacing: .6,
                        ),
                      ),
                    ),
                  ),
                  SizedBox(width: compact ? 7 : 10),
                  Container(
                    padding: EdgeInsets.symmetric(
                        horizontal: compact ? 8 : 10, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xff4a3512),
                      border: Border.all(color: const Color(0xffe8c55d)),
                      borderRadius: BorderRadius.circular(99),
                    ),
                    child: Text(
                      'PRO',
                      style: TextStyle(
                        color: const Color(0xffffd467),
                        fontSize: compact ? 11 : 13,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ],
              ),
              Padding(
                padding: EdgeInsets.only(
                    left: logoSize + (compact ? 9 : 12), top: 2),
                child: Text(
                  'Powered by NextJumpX',
                  style: TextStyle(
                    color: Color(0xffd9e4f3),
                    fontFamily: 'Georgia',
                    fontSize: compact ? 14 : 16,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(height: 19),
              const Divider(color: Color(0xff213142), height: 1),
            ],
          );
        },
      );
}

class _Feature extends StatelessWidget {
  const _Feature({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) => Container(
        constraints: const BoxConstraints(minHeight: 48),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: const Color(0xff0b1728),
          border: Border.all(color: const Color(0xff263c59)),
          borderRadius: BorderRadius.circular(15),
        ),
        child: Row(
          children: [
            const Icon(Icons.check_box_rounded,
                color: Color(0xff36d23b), size: 21),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                text,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: const Color(0xffeff4fb),
                  fontSize: MediaQuery.sizeOf(context).width < 500 ? 15 : 16,
                  fontWeight: FontWeight.w600,
                  height: 1.2,
                ),
              ),
            ),
          ],
        ),
      );
}

class _LoginField extends StatelessWidget {
  const _LoginField({
    required this.controller,
    required this.hint,
    required this.validator,
    this.obscureText = false,
    this.onSubmitted,
  });

  final TextEditingController controller;
  final String hint;
  final String? Function(String?) validator;
  final bool obscureText;
  final ValueChanged<String>? onSubmitted;

  @override
  Widget build(BuildContext context) => TextFormField(
        controller: controller,
        obscureText: obscureText,
        onFieldSubmitted: onSubmitted,
        validator: validator,
        style: const TextStyle(color: Colors.white),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(color: Color(0xff8390a4)),
          filled: true,
          fillColor: const Color(0xff060e18),
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(15),
            borderSide: const BorderSide(color: Color(0xff29394d)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(15),
            borderSide: const BorderSide(color: ZenColors.green, width: 1.5),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(15),
            borderSide: const BorderSide(color: Color(0xffff8585)),
          ),
        ),
      );
}

class _GreenAction extends StatelessWidget {
  const _GreenAction({required this.label, required this.onTap});

  final String label;
  final Future<void> Function()? onTap;

  @override
  Widget build(BuildContext context) => _ActionSurface(
        gradient: const LinearGradient(
            colors: [Color(0xff35ef68), Color(0xff12a94b)]),
        border: const Color(0xff65ff8e),
        foreground: const Color(0xff06150b),
        label: label,
        onTap: onTap,
      );
}

class _SecondaryAction extends StatelessWidget {
  const _SecondaryAction({required this.label, required this.onTap});

  final String label;
  final Future<void> Function()? onTap;

  @override
  Widget build(BuildContext context) => _ActionSurface(
        gradient: const LinearGradient(
            colors: [Color(0xff313c48), Color(0xff121922)]),
        border: const Color(0xff4c5967),
        foreground: Colors.white,
        label: label,
        onTap: onTap,
      );
}

class _ActionSurface extends StatelessWidget {
  const _ActionSurface({
    required this.gradient,
    required this.border,
    required this.foreground,
    required this.label,
    required this.onTap,
  });

  final Gradient gradient;
  final Color border;
  final Color foreground;
  final String label;
  final Future<void> Function()? onTap;

  @override
  Widget build(BuildContext context) => Opacity(
        opacity: onTap == null ? .55 : 1,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onTap == null ? null : () => onTap!(),
            borderRadius: BorderRadius.circular(15),
            child: Ink(
              height: 52,
              decoration: BoxDecoration(
                gradient: gradient,
                border: Border.all(color: border),
                borderRadius: BorderRadius.circular(15),
              ),
              child: Center(
                child: Text(
                  label,
                  style:
                      TextStyle(color: foreground, fontWeight: FontWeight.w900),
                ),
              ),
            ),
          ),
        ),
      );
}

class _InstallHint extends StatelessWidget {
  const _InstallHint({required this.compact});

  final bool compact;

  Future<void> _install(BuildContext context) async {
    final accepted = await promptPwaInstall();
    if (!accepted && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'A instalação ainda não está disponível. Use o menu do navegador para instalar o aplicativo.',
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) => Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _install(context),
          borderRadius: BorderRadius.circular(99),
          child: Container(
            padding: EdgeInsets.symmetric(
                horizontal: compact ? 12 : 17, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xee0b1515),
              border: Border.all(color: const Color(0xff365249)),
              borderRadius: BorderRadius.circular(99),
              boxShadow: const [
                BoxShadow(color: Color(0x99000000), blurRadius: 20)
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.install_desktop_rounded,
                    color: Color(0xff51dd76), size: 20),
                if (!compact) ...[
                  const SizedBox(width: 8),
                  const Text(
                    'Instalar ZenBarber',
                    style: TextStyle(
                        color: Colors.white, fontWeight: FontWeight.w900),
                  ),
                ],
              ],
            ),
          ),
        ),
      );
}

class _ZenBarberBackdrop extends StatelessWidget {
  const _ZenBarberBackdrop();

  @override
  Widget build(BuildContext context) => CustomPaint(
        painter: const _ZenBarberBackdropPainter(),
        child: const SizedBox.expand(),
      );
}

class _ZenBarberBackdropPainter extends CustomPainter {
  const _ZenBarberBackdropPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final background = Paint()
      ..shader = const RadialGradient(
        center: Alignment(-.9, -.8),
        radius: 1.25,
        colors: [Color(0xff0b453a), Color(0xff061622), Color(0xff030914)],
        stops: [0, .4, 1],
      ).createShader(Offset.zero & size);
    canvas.drawRect(Offset.zero & size, background);

    final line = Paint()
      ..color = const Color(0xff1a6b4b).withValues(alpha: .25)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 8;
    final x = size.width * .89;
    canvas.drawLine(Offset(x, 0), Offset(x, size.height), line);
    canvas.drawLine(Offset(x - 140, size.height * .82),
        Offset(x + 130, size.height * .45), line);
    canvas.drawLine(Offset(x - 150, size.height * .55),
        Offset(x + 128, size.height * .9), line);

    final circle = Paint()
      ..color = const Color(0xff3dbd6c).withValues(alpha: .22);
    for (var y = 70.0; y < size.height; y += 78) {
      canvas.drawOval(
          Rect.fromCenter(center: Offset(x, y), width: 20, height: 72), circle);
    }
    canvas.drawCircle(Offset(size.width * .48, 0), 110, line);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
