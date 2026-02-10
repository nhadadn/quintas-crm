import axios from 'axios';

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || process.env.DIRECTUS_URL;

export async function getApps(token: string) {
  try {
    const res = await axios.get(`${DIRECTUS_URL}/developer-portal/apps`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data.data;
  } catch (error) {
    console.error('Error fetching apps:', error);
    return [];
  }
}

export async function getWebhooks(token: string) {
  try {
    const res = await axios.get(`${DIRECTUS_URL}/developer-portal/webhooks`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data.data;
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    return [];
  }
}

export async function getAppDetails(token: string, clientId: string) {
  // This might need a specific endpoint or just filter from getApps if no specific endpoint exists
  // Currently developer-portal extension has GET /apps which lists all.
  // We can filter on client side or add GET /apps/:id to backend.
  // For now, let's assume we filter the list or I can add the endpoint later.
  // But wait, GET /apps returns list.
  const apps = await getApps(token);
  return apps.find((app: any) => app.client_id === clientId);
}
