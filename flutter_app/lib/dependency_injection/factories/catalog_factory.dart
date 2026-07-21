import '../app_dependencies.dart'; import '../../data/model/auth_user_dto.dart'; import '../../ui/catalog/catalog_screen.dart'; import '../../ui/catalog/view_models/catalog_view_model.dart';
class CatalogFactory { const CatalogFactory._(); static CatalogScreen build(AuthUserDto user)=>CatalogScreen(user:user,viewModel:CatalogViewModel(AppDependencies.instance.catalogRepository)); }
