# CONTEXTO TÉCNICO PERMANENTE — ZENBARBER

## 1. Finalidade deste documento

Este arquivo serve exclusivamente como memória técnica para futuras sessões do Codex.

- Não faz parte do carregamento da aplicação.
- Não deve ser incluído em `index.html`, `manifest.json`, `sw.js` ou em qualquer módulo JavaScript.
- Não deve alterar o funcionamento, a publicação ou a identidade visual do ZenBarber.
- Não substitui a inspeção da base oficial recebida em cada tarefa.

## 2. Base oficial atual

Base oficial auditada em 15/07/2026:

`ZenBarber_Tarefa001_NETLIFY_Estrutura_Corrigida_v2_2026-07-14.zip`

Local informado na auditoria:

`C:/Users/Renan Padovan/Downloads/ZenBarber_Tarefa001_NETLIFY_Estrutura_Corrigida_v2_2026-07-14.zip`

Para trabalhos futuros, este ZIP deve ser considerado a referência funcional e estrutural atual até que o responsável pelo projeto indique explicitamente uma base mais nova. Não misturar arquivos, conclusões ou versões de outras sessões sem autorização.

## 3. Identificação do projeto

- Produto: ZenBarber.
- Empresa: NextJumpX.
- Hospedagem: Netlify.
- Backend e banco de dados: Supabase.
- Frontend: aplicação web estática em HTML, CSS e JavaScript.
- Recursos identificados: agenda, clientes fixos, caixa, financeiro, relatórios, administração, WhatsApp, agendamento público, suporte, gestão do negócio e PWA.

## 4. Arquitetura identificada

### 4.1 Entrada e carregamento

- `index.html` é o arquivo de entrada e fica diretamente na raiz.
- `css/style.css` concentra os estilos da aplicação.
- O cliente `@supabase/supabase-js@2` é carregado externamente pelo CDN jsDelivr.
- `js/core.js` inicializa recursos globais, o loader, o cliente Supabase, estado e funções compartilhadas.
- Os módulos em `js/modules/` são carregados individualmente e dependem dos globais definidos anteriormente.
- `js/bootstrap.js` inicia o roteamento depois que os módulos foram carregados.
- `sw.js` implementa o service worker e o cache do PWA.
- `manifest.json` contém a configuração instalável do PWA.
- `app.js` na raiz é apenas um aviso sobre a modularização e não é carregado pelo `index.html`.

### 4.2 Ordem principal dos scripts

1. Biblioteca Supabase pelo CDN.
2. `js/core.js`.
3. `js/modules/auth.js`.
4. `js/modules/dashboard.js`.
5. `js/modules/components.js`.
6. `js/modules/cadastros.js`.
7. `js/modules/agenda.js`.
8. `js/modules/caixa.js`.
9. `js/modules/clientesFixos.js`.
10. `js/modules/relatorios.js`.
11. `js/modules/supportChat.js`.
12. `js/modules/admin.js`.
13. `js/modules/meuNegocio.js`.
14. `js/modules/agendamentoPublico.js`.
15. `js/bootstrap.js`.

Alterar essa ordem exige análise prévia das dependências globais entre os arquivos.

### 4.3 Supabase

- A conexão efetiva é criada em `js/core.js` com `supabase.createClient(...)`.
- A URL e a chave publicável do projeto estão definidas diretamente em `js/core.js` na base auditada.
- `js/config.js` contém placeholders e não é carregado pelo `index.html`; portanto, não controla a conexão atual.
- As principais entidades observadas incluem `barbers`, `services` e `appointments`.
- O isolamento e a segurança dos dados dependem das políticas RLS e permissões configuradas no Supabase.

### 4.4 Autenticação e sessão

- A autenticação atual é própria da aplicação e consulta a tabela `barbers`.
- Não foi identificado uso de sessão nativa do Supabase Auth no fluxo principal.
- O login é normalizado e consultado por correspondência exata, com fallback sem diferenciação entre maiúsculas e minúsculas.
- Senhas atuais usam `password_hash`; existe compatibilidade e migração para registros legados.
- O fluxo considera `access_status`, troca obrigatória de senha, aceite de termos e função do usuário.
- A sessão do usuário é armazenada em `sessionStorage` sob a chave `zenbarber_user`.
- O roteamento diferencia administrador, gerente, barbeiro e agendamento público.
- Como a sessão é controlada no navegador, as políticas RLS do Supabase são uma barreira de segurança essencial.

### 4.5 Loader e inicialização

- O loader inicial já está presente e visível no HTML antes do carregamento dos scripts.
- `js/core.js` oferece `showZenLoader`, `hideZenLoader`, `forceHideZenLoader` e `withZenLoader`.
- O controle usa tokens para suportar operações simultâneas.
- Há atraso configurável, tempo mínimo de exibição e ocultação forçada em falhas.
- `js/bootstrap.js` impede inicialização duplicada, executa `route()` e marca a aplicação como pronta.
- Existe watchdog de 30 segundos com tela de erro e opção para recarregar.

### 4.6 Clientes fixos

- O módulo principal é `js/modules/clientesFixos.js`.
- Na arquitetura auditada, clientes fixos não usam uma tabela exclusiva.
- Horários, bloqueios e cobranças são representados por registros em `appointments`.
- Serviços auxiliares e valores são representados em `services`.
- Contratos recebem códigos no padrão `ZB-XXXXXX`, incorporados aos nomes usados para agrupamento.
- O módulo suporta recorrência semanal, quinzenal e mensal, contratos de 1 a 24 meses, conflitos de agenda, parcelas, edição, cancelamento e indicadores financeiros.
- Bloqueios de agenda usam valor zero; cobranças são lançadas separadamente para evitar contaminar o faturamento com o valor do bloqueio.
- Os modos de recebimento identificados são mensal, semanal, integral no início e integral no final.

### 4.7 PWA

- `manifest.json` define nome, ícones, cores, modo standalone e atalhos.
- `sw.js` mantém um app shell com os arquivos ativos da aplicação.
- HTML, JavaScript, CSS e JSON usam estratégia de rede primeiro, com cache como fallback.
- Imagens usam cache primeiro.
- A aplicação registra o service worker após o evento `load`.

## 5. Regras permanentes

1. Não alterar a identidade visual sem autorização.
2. Não remover funcionalidades existentes.
3. Não alterar Supabase, autenticação, domínio, permissões, RLS ou variáveis de ambiente sem autorização.
4. Analisar dependências antes de modificar qualquer funcionalidade.
5. Fazer somente a tarefa solicitada.
6. Não remover automaticamente código morto, arquivos experimentais, backups ou duplicações; apenas relatar, salvo autorização expressa.
7. Validar sintaxe, referências, console, responsividade e possíveis regressões após mudanças.
8. Preservar o funcionamento atual antes de qualquer refatoração.
9. Quando a solicitação for apenas auditoria, não modificar arquivos.
10. Quando a solicitação for apenas de empacotamento, não implementar correções funcionais.
11. Não usar bases de sessões anteriores quando o responsável indicar um ZIP como única base oficial.
12. Antes de entregar, comparar o resultado com o escopo autorizado e registrar claramente o que foi ou não alterado.

## 6. Padrão obrigatório de entrega para Netlify

Toda entrega publicável deve:

- conter o projeto completo;
- estar pronta para upload direto na Netlify;
- possuir `index.html` diretamente na raiz do ZIP;
- não possuir pasta contêiner envolvendo o projeto;
- usar somente `/` nos nomes internos do ZIP;
- possuir zero entradas internas com `\`;
- incluir todos os arquivos locais referenciados pelo HTML, manifest e service worker;
- preservar os nomes e a estrutura esperados pelos caminhos publicados;
- ter os JavaScripts e JSON validados antes da entrega;
- ser inspecionada pela tabela interna do ZIP, não apenas pela visualização do Explorador de Arquivos.

Checklist mínimo do ZIP final:

- `index.html` na raiz: sim.
- Pasta contêiner: não.
- Barras invertidas nas entradas: zero.
- Arquivos obrigatórios presentes: sim.
- Referências locais resolvidas: sim.
- Sintaxe JavaScript válida: sim.
- JSON válido: sim.
- Conteúdo completo e sem alterações fora do escopo: sim.

## 7. Tarefas concluídas e verificadas

### Tarefa 001 — correção estrutural para Netlify

- A base oficial recebida está nomeada como estrutura corrigida v2.
- O pacote possui `index.html` diretamente na raiz.
- Não existe pasta contêiner.
- Todas as entradas usam `/`.
- O pacote contém o projeto completo identificado na auditoria.

### Auditoria técnica da base — 15/07/2026

- 157 arquivos inventariados.
- 157 entradas lidas integralmente sem erro de descompressão.
- 24 arquivos JavaScript verificados sem erro de sintaxe.
- 2 arquivos JSON verificados e válidos.
- Referências locais obrigatórias do HTML e do service worker verificadas.
- Ordem de bootstrap analisada.
- Inicialização do Supabase identificada.
- Fluxo de autenticação documentado.
- Loader global analisado.
- Estrutura de clientes fixos documentada.
- Estrutura do ZIP aprovada para upload direto na Netlify.
- Nenhum arquivo da aplicação foi alterado durante essa auditoria.

## 8. Riscos e pontos de atenção conhecidos

### 8.1 Dependências externas

- A inicialização depende do CDN jsDelivr para carregar o cliente Supabase.
- Indisponibilidade, bloqueio ou mudança externa no CDN impede a abertura normal da aplicação.
- A funcionalidade real depende da disponibilidade do projeto Supabase.

### 8.2 Configuração Supabase

- A configuração ativa está embutida em `js/core.js`.
- `js/config.js` possui placeholders e não é utilizado pela aplicação atual.
- Não alterar esse arranjo sem autorização e sem revisar toda a inicialização.

### 8.3 Segurança da autenticação

- A autenticação é implementada no frontend e a sessão fica em `sessionStorage`.
- A proteção dos dados depende das políticas RLS e das permissões do Supabase.
- O ZIP contém arquivos SQL históricos, mas a presença deles não comprova que as políticas correspondentes estejam aplicadas no ambiente remoto.
- Não alterar autenticação, hashes, RLS ou permissões sem autorização explícita e plano de migração.

### 8.4 Estrutura modular baseada em globais

- Os módulos não são ES modules; compartilham funções e estado pelo escopo global.
- Reordenar, renomear ou carregar scripts de forma assíncrona pode quebrar dependências silenciosamente.
- Refatorações devem começar com um mapa de dependências e testes de todas as rotas.

### 8.5 Clientes fixos

- Clientes fixos, bloqueios e parcelas compartilham as estruturas de `appointments` e `services`.
- Alterações em agenda, serviços, caixa ou relatórios podem produzir regressões no módulo de clientes fixos.
- O agrupamento depende de convenções de nomes e códigos de contrato; mudanças nesses textos exigem análise de compatibilidade com dados antigos.

### 8.6 Service worker e cache

- Mudanças em arquivos publicados devem considerar a versão de `CACHE_NAME` e as URLs do app shell.
- Um service worker antigo pode manter arquivos anteriores em clientes já instalados se a estratégia de atualização não for preservada.
- Todo novo arquivo essencial ao funcionamento offline deve ser analisado para inclusão no app shell.

### 8.7 Arquivos auxiliares e históricos

- A base contém backup, demonstração, SQLs, documentação de hotfixes e JavaScripts aparentemente não carregados.
- Esses arquivos não devem ser removidos ou consolidados automaticamente.
- A presença de uma alternativa ou backup não significa que ela seja a versão ativa.

### 8.8 Limites da auditoria estática

- A estrutura e a sintaxe foram verificadas localmente.
- A operação do Supabase, RLS, domínio, CDN e comportamento real na Netlify dependem do ambiente externo.
- Aprovação estrutural do ZIP não substitui teste funcional online após publicação.

## 9. Estado atual do projeto

Em 15/07/2026, com base exclusivamente no ZIP oficial auditado:

- o pacote está estruturalmente pronto para upload direto na Netlify;
- o ponto de entrada está correto;
- os caminhos internos do ZIP estão corretos;
- os arquivos locais necessários ao carregamento estão presentes;
- o bootstrap e o loader apresentam fluxo coerente na análise estática;
- a conexão Supabase é inicializada diretamente em `js/core.js`;
- a autenticação própria usa a tabela `barbers` e sessão no navegador;
- clientes fixos estão integrados a `appointments`, `services`, agenda e financeiro;
- o PWA possui manifesto e service worker;
- não foram encontrados erros de sintaxe JavaScript ou JSON;
- a prontidão funcional em produção permanece condicionada ao CDN, Supabase, esquema, RLS, permissões e domínio reais.

## 10. Procedimento recomendado para futuras sessões do Codex

1. Confirmar qual arquivo ou ZIP foi declarado como base oficial mais recente.
2. Ler este documento apenas como contexto técnico, nunca como substituto da inspeção da base.
3. Inventariar a estrutura antes de alterar qualquer arquivo.
4. Localizar o ponto de entrada e mapear dependências do módulo solicitado.
5. Registrar achados antes de implementar quando a tarefa exigir auditoria prévia.
6. Fazer somente a alteração autorizada.
7. Validar sintaxe, referências, console, responsividade e módulos dependentes.
8. Gerar o ZIP completo com o padrão obrigatório da Netlify.
9. Inspecionar literalmente as entradas internas do ZIP.
10. Informar arquivos alterados, testes executados, riscos restantes e qualquer item que não pôde ser validado.

---

Última atualização deste contexto: 15/07/2026.

Origem das informações: auditoria estática do ZIP oficial informado acima e regras permanentes fornecidas pelo responsável do projeto.
