HOTFIX - VALOR A RECEBER / CARTEIRA

Correção aplicada:
- O botão "Valor a receber" não depende mais somente de a.services.price vindo do join do Supabase.
- Agora busca o valor também pelo service_id no cache de services e por campos alternativos do lançamento, evitando o erro "valor original não cadastrado" em registros antigos ou parcelas/carteira.
- Corrigido também um possível erro de variável indefinida no toast final do recebimento.
- Telas de Carteira e Pendências agora exibem valor/nome do serviço usando o mesmo fallback seguro.

Não alterado:
- Rotas
- Autenticação
- Supabase/schema
- Permissões
- Lógica visual da sidebar
