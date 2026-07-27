HOTFIX ACEITE DE TERMOS - ZenBarber

O que foi adicionado:
1. Modal obrigatório de aceite para gerente/proprietário.
2. Modal obrigatório de aceite para barbeiro funcionário.
3. Registro no Supabase em barbers:
   - accepted_terms
   - accepted_terms_at
   - accepted_terms_version
4. Checkbox de aceite no agendamento público do cliente.
5. Versionamento dos termos pela constante ZEN_TERMS_VERSION = "v1.0".

Importante:
- O SQL está no arquivo SQL_HOTFIX_ACEITE_TERMOS.sql.
- Se as colunas já foram criadas, não precisa rodar novamente.
- O SQL usa IF NOT EXISTS, então não duplica colunas.
- Quando alterar os termos no futuro, trocar ZEN_TERMS_VERSION para "v2.0" para exigir novo aceite.
