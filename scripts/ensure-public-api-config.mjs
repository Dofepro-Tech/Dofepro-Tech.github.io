const requirePublicApiBaseUrl = process.env.REQUIRE_PUBLIC_API_BASE_URL === 'true';

if (!requirePublicApiBaseUrl) {
  process.exit(0);
}

const explicitApiBaseUrl = process.env.VITE_API_BASE_URL?.trim();
const useSameOriginApi = process.env.VITE_USE_SAME_ORIGIN_API === 'true';

if (useSameOriginApi) {
  process.exit(0);
}

if (!explicitApiBaseUrl) {
  console.error('REQUIRE_PUBLIC_API_BASE_URL=true pero VITE_API_BASE_URL no esta definido. Configura una URL HTTPS publica del backend antes de publicar la web estatica.');
  process.exit(1);
}

if (!/^https:\/\//i.test(explicitApiBaseUrl)) {
  console.error(`VITE_API_BASE_URL debe usar HTTPS para despliegues publicos. Valor recibido: ${explicitApiBaseUrl}`);
  process.exit(1);
}