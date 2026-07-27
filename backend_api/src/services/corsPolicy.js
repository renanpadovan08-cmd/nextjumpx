function normalizeOrigin(value) {
  try {
    const url = new URL(String(value || '').trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.origin.toLowerCase();
  } catch {
    return null;
  }
}

export function configuredCorsOrigins(environment = process.env) {
  const configuredOrigins = String(environment.CORS_ORIGIN || '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

  const netlifyMainUrl = normalizeOrigin(environment.URL);
  if (netlifyMainUrl) configuredOrigins.push(netlifyMainUrl);

  return new Set(configuredOrigins);
}

export function isCorsOriginAllowed(origin, environment = process.env) {
  // Aplicativos mobile, curl e chamadas entre servidores podem não enviar Origin.
  if (!origin) return true;

  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return false;

  if (configuredCorsOrigins(environment).has(normalizedOrigin)) return true;

  const url = new URL(normalizedOrigin);
  if (['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname)) return true;

  // O Netlify expõe SITE_NAME em runtime. Restringir pelo sufixo evita aceitar
  // qualquer outro site *.netlify.app por engano.
  const siteName = String(environment.SITE_NAME || '').trim().toLowerCase();
  if (!/^[a-z0-9-]+$/.test(siteName)) return false;

  const netlifyHost = `${siteName}.netlify.app`;
  return url.protocol === 'https:'
    && (url.hostname === netlifyHost || url.hostname.endsWith(`--${netlifyHost}`));
}
