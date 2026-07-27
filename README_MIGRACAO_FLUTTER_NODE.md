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

## Substituição definitiva da versão legada

Esta branch cobre os fluxos comerciais que existiam na `main`:

- autenticação, cadastro comercial, aprovação administrativa e troca obrigatória de senha;
- dashboard, agenda por profissional, encaixe, status e bloqueio pela duração real;
- link público, seleção de profissional/serviço/data/horário e confirmação do agendamento;
- equipe, serviços com imagem/ícone/ordem, perfil e funcionamento semanal;
- clientes fixos, recorrência semanal/quinzenal/mensal, carteira e pagamentos;
- pendências, WhatsApp, comissões, ranking, retenção, caixa, metas e unidades;
- painel administrativo, planos, vencimentos, pagamentos e solicitações.
- aceite obrigatório dos Termos de Uso, chat persistente de suporte, Central de
  Novidades e instalação PWA pelo navegador.

Contas criadas pelo site antigo continuam acessando normalmente. A API reconhece
o hash `zb_sha256_v1$` usado na `main` e o substitui por bcrypt depois do primeiro
login válido. Senhas antigas em texto puro também são migradas e removidas.

Antes do corte de produção:

1. Aplique `SQL_MIGRACAO_DEFINITIVA_FLUTTER_NODE.sql` no mesmo Supabase da
   instalação atual. Ele consolida as alterações necessárias sem remover dados.
2. Aplique `SQL_CUTOVER_PARIDADE_MAIN.sql`. Ele preserva as tabelas existentes
   e acrescenta, de forma idempotente, os campos de aceite, suporte e novidades.
3. Configure no backend `JWT_SECRET`, `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY` e `CORS_ORIGIN`.
4. Gere o Flutter com `API_BASE_URL=/api` quando frontend e API estiverem no
   mesmo domínio.
5. Valide login de administrador, gerente e barbeiro, depois realize um
   agendamento completo pelo link público.

Esta branch não deve ser publicada por arrastar a pasta no Netlify Drop: o
deploy precisa executar `scripts/netlify-build.sh` e publicar também a Function
Node.js definida em `netlify.toml`. Conecte o repositório ao Netlify, configure
as variáveis de ambiente e deixe o build do Git gerar
`flutter_app/build/web`.

## Validação automatizada

```powershell
cd backend_api
npm test

cd ../flutter_app
flutter analyze
flutter test
flutter build web --release --dart-define=API_BASE_URL=/api
```

Essas verificações cobrem a arquitetura Flutter, conversão do dashboard,
compatibilidade do login legado, papéis de acesso, expediente semanal, folgas,
intervalos, sobreposição por duração, datas inválidas e fuso de São Paulo.
