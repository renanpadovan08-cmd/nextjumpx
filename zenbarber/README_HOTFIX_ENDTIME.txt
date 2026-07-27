HOTFIX endTime undefined

Correção aplicada:
- Adicionada função global endTime(time, duration) usada pelos cards de clientes fixos.
- Fallback seguro para dados antigos que não possuem horário final salvo.
- O horário final passa a ser calculado automaticamente por hora inicial + duração do serviço.

Objetivo:
Evitar erro "endTime is not defined" ao abrir painel de gerente/barbeiro.
