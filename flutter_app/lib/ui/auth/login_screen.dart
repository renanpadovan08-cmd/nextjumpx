import 'package:flutter/material.dart';
import '../core/view_models/app_view_model.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, required this.viewModel});
  final AppViewModel viewModel;
  @override State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _login = TextEditingController();
  final _password = TextEditingController();
  final _form = GlobalKey<FormState>();
  @override void dispose() { _login.dispose(); _password.dispose(); super.dispose(); }
  Future<void> _submit() async { if (_form.currentState!.validate()) await widget.viewModel.login(_login.text, _password.text); }
  @override Widget build(BuildContext context) => Scaffold(
    body: Center(child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 420), child: Card(child: Padding(
      padding: const EdgeInsets.all(28), child: Form(key: _form, child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text('ZenBarber', style: Theme.of(context).textTheme.headlineMedium), const SizedBox(height: 8), const Text('Gestão completa para sua barbearia'), const SizedBox(height: 24),
        TextFormField(controller: _login, decoration: const InputDecoration(labelText: 'Login'), validator: (value) => value!.trim().isEmpty ? 'Informe o login' : null), const SizedBox(height: 12),
        TextFormField(controller: _password, obscureText: true, decoration: const InputDecoration(labelText: 'Senha'), validator: (value) => value!.isEmpty ? 'Informe a senha' : null),
        if (widget.viewModel.error != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(widget.viewModel.error!, style: TextStyle(color: Theme.of(context).colorScheme.error))), const SizedBox(height: 20),
        FilledButton(onPressed: widget.viewModel.loading ? null : _submit, child: Text(widget.viewModel.loading ? 'Entrando...' : 'Entrar')),
      ])),
    )))),
  );
}
