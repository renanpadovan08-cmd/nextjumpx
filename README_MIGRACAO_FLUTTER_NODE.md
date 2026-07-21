# Migração ZenBarber: Flutter + Node.js

O frontend JavaScript/Supabase legado foi substituído por dois projetos independentes, seguindo a organização do `ecurepair_project`:

```
flutter_app/
  lib/data/              # DTOs, fontes HTTP e repositórios concretos
  lib/domain/            # contratos dos repositórios e casos de uso
  lib/ui/                # telas e ViewModels por recurso
  lib/dependency_injection/
backend_api/
  src/routes/            # contratos HTTP
  src/controllers/       # orquestração de cada recurso
  src/services/          # Supabase e regras compartilhadas
  src/middleware/        # JWT, autorização e tratamento de erro
```

## Como executar

1. Copie `backend_api/.env.example` para `backend_api/.env` e informe as credenciais de servidor do Supabase. Nunca use a `service_role` no Flutter.
2. Rode `npm install` e `npm start` dentro de `backend_api`.
3. Rode `flutter pub get` dentro de `flutter_app`.
4. Em dispositivo real, execute o Flutter com `--dart-define=API_BASE_URL=https://seu-dominio/api`.

## Deploy Web

O frontend de produção é gerado exclusivamente pelo Flutter:

```powershell
cd flutter_app
flutter build web --release --dart-define=API_BASE_URL=https://seu-dominio/api
```

Publique o conteúdo de `flutter_app/build/web/`. Os arquivos HTML, CSS, JavaScript e PWA da raiz eram o frontend legado e foram removidos após a geração validada do build Flutter Web.

O backend conserva as tabelas existentes (`barbers`, `services`, `appointments`) e passa a concentrar credenciais, senha com bcrypt, autorização por JWT e isolamento por barbearia.
