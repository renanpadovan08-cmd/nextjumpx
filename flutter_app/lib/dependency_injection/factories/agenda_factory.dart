import '../app_dependencies.dart'; import '../../ui/agenda/agenda_screen.dart'; import '../../ui/agenda/view_models/agenda_view_model.dart';
class AgendaFactory { const AgendaFactory._(); static AgendaScreen build()=>AgendaScreen(viewModel:AgendaViewModel(AppDependencies.instance.appointmentRepository)); }
