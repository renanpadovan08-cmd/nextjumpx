HOTFIX URGENTE - AGENDA NÃO MOSTRAVA CLIENTES FIXOS FUTUROS

Diagnóstico:
- O banco estava correto: Cleber tinha vários sábados cadastrados para Milton Carriel.
- appointments tinha mais de 3500 registros agendados.
- O problema estava na tela: loadMine fazia select geral em appointments.
- O Supabase limita retornos por padrão em blocos de 1000 linhas.
- Como a consulta vinha ordenada por data, a agenda carregava só parte dos registros e datas futuras sumiam.

Correção:
- Criada função fetchAppointmentsPaged() em js/modules/auth.js.
- Agora os agendamentos são carregados paginados de 1000 em 1000.
- Quando existe shop_id, a consulta filtra direto por shop_id.
- Depois mantém o filtro visual de unidade/barbeiro.

Não foram alterados:
- Estrutura do banco.
- RLS.
- Serviços.
- Clientes fixos.
- Regras de comissão.
