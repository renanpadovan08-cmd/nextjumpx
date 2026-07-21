import 'package:flutter/material.dart';
import '../core/theme/zen_colors.dart';
import '../core/widgets/zen_card.dart';
import '../core/view_models/app_view_model.dart';

class LoginScreen extends StatefulWidget { const LoginScreen({super.key,required this.viewModel}); final AppViewModel viewModel; @override State<LoginScreen> createState()=>_LoginScreenState(); }
class _LoginScreenState extends State<LoginScreen>{
  final login=TextEditingController(),password=TextEditingController(),form=GlobalKey<FormState>();
  @override void dispose(){login.dispose();password.dispose();super.dispose();}
  Future<void> submit()async{if(form.currentState!.validate())await widget.viewModel.login(login.text,password.text);}
  Future<void> signup() async {
    final name=TextEditingController(),shop=TextEditingController(),newLogin=TextEditingController(),newPassword=TextEditingController(),phone=TextEditingController(); final signupForm=GlobalKey<FormState>();
    final done=await showDialog<bool>(context:context,builder:(dialogContext)=>AlertDialog(
      title:const Text('Criar barbearia'),
      content:SingleChildScrollView(child:Form(key:signupForm,child:Column(mainAxisSize:MainAxisSize.min,children:[
        TextFormField(controller:name,decoration:const InputDecoration(labelText:'Seu nome'),validator:(v)=>v!.isEmpty?'Obrigatório':null),
        TextFormField(controller:shop,decoration:const InputDecoration(labelText:'Nome da barbearia'),validator:(v)=>v!.isEmpty?'Obrigatório':null),
        TextFormField(controller:newLogin,decoration:const InputDecoration(labelText:'Login público'),validator:(v)=>v!.isEmpty?'Obrigatório':null),
        TextFormField(controller:phone,decoration:const InputDecoration(labelText:'WhatsApp')),
        TextFormField(controller:newPassword,obscureText:true,decoration:const InputDecoration(labelText:'Senha (mínimo 8 caracteres)'),validator:(v)=>(v?.length??0)<8?'Use ao menos 8 caracteres':null),
      ]))),
      actions:[TextButton(onPressed:()=>Navigator.pop(dialogContext),child:const Text('Cancelar')),FilledButton(onPressed:()async{if(!signupForm.currentState!.validate())return;final ok=await widget.viewModel.signup(name:name.text.trim(),shopName:shop.text.trim(),login:newLogin.text.trim(),phone:phone.text.trim(),password:newPassword.text);if(ok&&dialogContext.mounted)Navigator.pop(dialogContext,true);},child:const Text('Solicitar acesso'))],
    ));
    name.dispose();shop.dispose();newLogin.dispose();newPassword.dispose();phone.dispose();
    if(done==true&&mounted)ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Cadastro enviado. Aguarde a aprovação do administrador.')));
  }
  @override Widget build(BuildContext c)=>Scaffold(body:Center(child:ConstrainedBox(constraints:const BoxConstraints(maxWidth:440),child:ZenCard(padding:const EdgeInsets.all(30),child:Form(key:form,child:Column(mainAxisSize:MainAxisSize.min,crossAxisAlignment:CrossAxisAlignment.stretch,children:[
    Container(width:58,height:58,alignment:Alignment.center,decoration:BoxDecoration(color:ZenColors.green,borderRadius:BorderRadius.circular(18)),child:const Icon(Icons.content_cut,color:Color(0xff06140a),size:30)),const SizedBox(height:20),Text('ZenBarber',style:Theme.of(c).textTheme.headlineSmall),const Text('Gestão premium para sua barbearia',style:TextStyle(color:ZenColors.muted)),const SizedBox(height:26),
    TextFormField(controller:login,decoration:const InputDecoration(labelText:'Login'),validator:(v)=>v!.trim().isEmpty?'Informe o login':null),const SizedBox(height:12),TextFormField(controller:password,obscureText:true,decoration:const InputDecoration(labelText:'Senha'),validator:(v)=>v!.isEmpty?'Informe a senha':null),
    if(widget.viewModel.error!=null)Padding(padding:const EdgeInsets.only(top:12),child:Text(widget.viewModel.error!,style:const TextStyle(color:ZenColors.red,fontWeight:FontWeight.w800))),const SizedBox(height:20),FilledButton(onPressed:widget.viewModel.loading?null:submit,child:Text(widget.viewModel.loading?'Entrando...':'Entrar no painel')),TextButton(onPressed:widget.viewModel.loading?null:signup,child:const Text('Criar minha barbearia')),
  ]))))));
}
