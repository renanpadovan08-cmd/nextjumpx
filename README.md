# NextJumpX

Este repositório reúne os dois sites na mesma branch:

- `/` — landing page da NextJumpX.
- `/zenbarber` — aplicação ZenBarber.

## Netlify

Publique a raiz do repositório (`.`) no projeto do domínio `nextjumpx.com.br`.
A landing abre o ZenBarber no mesmo domínio, pelo caminho `/zenbarber/`.

O Manifest, os ícones e o Service Worker do ZenBarber usam caminhos relativos,
mantendo o PWA isolado dentro desse diretório.

## Validação do login

Execute:

```powershell
node --test tests/password-auth.test.js
```
