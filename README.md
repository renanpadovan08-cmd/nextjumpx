# NextJumpX

Este repositório reúne os dois sites na mesma branch:

- `/` — landing page da NextJumpX.
- `/zenbarber` — aplicação ZenBarber.

## Netlify

Use a mesma branch `main` em dois projetos:

| Projeto | Diretório de publicação |
| --- | --- |
| Landing NextJumpX | `.` |
| ZenBarber | `zenbarber` |

O projeto do domínio `zenbarber.nextjumpx.com.br` deve publicar exclusivamente
a pasta `zenbarber`. A landing continua publicando a raiz do repositório.

O ZenBarber também pode ser aberto em `/zenbarber/` durante desenvolvimento
local. Manifest, ícones e Service Worker usam caminhos relativos para funcionar
nos dois modos.

## Validação do login

Execute:

```powershell
node --test tests/password-auth.test.js
```
