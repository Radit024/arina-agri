import { pathToFileURL } from 'node:url';

export function normalizeDeploymentUrl(value) {
  if (!value || typeof value !== 'string') {
    throw new Error('DEPLOYMENT_URL is required.');
  }

  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) {
    throw new Error('DEPLOYMENT_URL is required.');
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

async function fetchWithTimeout(fetchImpl, url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkDeployment({
  deploymentUrl,
  fetchImpl = globalThis.fetch,
  timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 10000),
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('A fetch implementation is required.');
  }

  const baseUrl = normalizeDeploymentUrl(deploymentUrl);
  const healthUrl = `${baseUrl}/api/health`;
  const cronUrl = `${baseUrl}/api/cron/news`;

  const healthResponse = await fetchWithTimeout(fetchImpl, healthUrl, timeoutMs);
  if (!healthResponse.ok) {
    throw new Error(`Health check failed with HTTP ${healthResponse.status}`);
  }

  const healthBody = await healthResponse.json().catch(() => null);
  if (!healthBody?.success) {
    throw new Error('Health check failed: response JSON did not include success=true');
  }

  const cronResponse = await fetchWithTimeout(fetchImpl, cronUrl, timeoutMs);
  if (cronResponse.status !== 401) {
    throw new Error(`Cron protection check failed: expected HTTP 401, got ${cronResponse.status}`);
  }

  return { healthUrl, cronUrl };
}

export async function run() {
  const result = await checkDeployment({
    deploymentUrl: process.env.DEPLOYMENT_URL,
  });

  console.log(`Health check passed: ${result.healthUrl}`);
  console.log(`Cron protection check passed: ${result.cronUrl}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
