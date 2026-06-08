ZenBarber — pacote limpo para auditoria no GitHub

O que foi feito nesta versão:
1. Removidas chaves reais do Supabase do código-fonte.
2. Removidos números reais usados em WhatsApp de ativação/suporte.
3. Criado js/config.js com valores fictícios seguros para commit.
4. Criado js/config.example.js para orientar configuração local/privada.
5. Criado .env.example para referência de variáveis.
6. Criado .gitignore para bloquear .env, backups e arquivos sensíveis.
7. Removido app.js.bak porque era backup antigo e continha credenciais/login admin legado.

Como rodar em ambiente privado:
- Copie js/config.example.js para js/config.js.
- Preencha SUPABASE_URL e SUPABASE_KEY reais.
- Preencha os WhatsApps reais.
- Não publique js/config.js real em GitHub público.

Importante para o auditor:
- Esta versão é para análise de código e segurança.
- As chaves reais foram propositalmente substituídas por placeholders.
- O projeto ainda é front-end estático; a segurança definitiva depende principalmente das regras RLS do Supabase, policies por role/unidade/barbeiro e ausência de Service Role Key no front-end.
