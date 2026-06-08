ZENBARBER — HOTFIX COMISSÕES DO GERENTE

O QUE FOI ADICIONADO:
- Nova aba: Comissões
- Gerente/dono consegue editar a porcentagem de comissão de cada barbeiro
- Dashboard / Financeiro agora mostra:
  • Faturamento bruto
  • Comissões a pagar
  • Lucro da barbearia
  • Em carteira
- Resumo por barbeiro com bruto, comissão e lucro
- Ranking / Comissão também mostra lucro após comissão

SUPABASE:
- Se você já rodou o SQL_ATUALIZACAO_FINAL.sql anteriormente, NÃO precisa rodar nada novo.
- Se der erro falando que commission_rate não existe, rode o SQL_ATUALIZACAO_FINAL.sql que já está dentro do ZIP.

IMPORTANTE:
- Comissão é calculada somente em atendimentos com status concluído.
- Atendimento em carteira ainda não entra como faturamento recebido.
