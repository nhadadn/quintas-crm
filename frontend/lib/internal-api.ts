import axios from 'axios';
import { getSession } from 'next-auth/react';

async function waitForAccessToken(timeoutMs = 1500, intervalMs = 150): Promise<string | undefined> {
  let session = await getSession();
  const start = Date.now();
  while ((!session || !session.accessToken) && Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, intervalMs));
    session = await getSession();
  }
  return session?.accessToken as string | undefined;
}

const internalApi = axios.create({
  headers: { 'Content-Type': 'application/json' },
});

internalApi.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined') {
    const hasAuth =
      !!(config.headers as any)?.Authorization || !!(config.headers as any)?.authorization;
    if (!hasAuth) {
      const token = await waitForAccessToken();
      if (token) {
        config.headers = config.headers || {};
        (config.headers as any).Authorization = `Bearer ${token}`;
      }
    }
  }
  return config;
});

internalApi.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config: any = error.config || {};
    if (typeof window !== 'undefined' && error.response?.status === 401 && !config._retry) {
      config._retry = true;
      const token = await waitForAccessToken();
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
        return internalApi(config);
      }
    }
    return Promise.reject(error);
  },
);

export default internalApi;
