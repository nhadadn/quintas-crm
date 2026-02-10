'use server';

import { auth } from '@/lib/auth';
import axios from 'axios';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || process.env.DIRECTUS_URL;

export async function registerApp(data: {
  name: string;
  redirect_uris: string[];
  scopes: string[];
}) {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error('Unauthorized');
  }

  try {
    const res = await axios.post(`${DIRECTUS_URL}/developer-portal/register-app`, data, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });

    revalidatePath('/developer-portal/apps');
    return { success: true, data: res.data.data };
  } catch (error: any) {
    console.error('Error registering app:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.errors?.[0]?.message || 'Error registering app',
    };
  }
}

export async function deleteApp(clientId: string) {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error('Unauthorized');
  }

  try {
    await axios.delete(`${DIRECTUS_URL}/developer-portal/apps/${clientId}`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    revalidatePath('/developer-portal/apps');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting app:', error);
    return { success: false, error: error.message };
  }
}

export async function createWebhook(data: {
  client_id?: string;
  app?: string;
  event_type: string;
  url: string;
}) {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error('Unauthorized');
  }

  // Support both client_id and app fields (app is used in form data)
  const client_id = data.client_id || data.app;

  try {
    const res = await axios.post(
      `${DIRECTUS_URL}/developer-portal/webhooks`,
      {
        client_id,
        event_type: data.event_type,
        url: data.url,
      },
      {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      },
    );

    revalidatePath('/developer-portal/webhooks');
    return { success: true, data: res.data.data };
  } catch (error: any) {
    console.error('Error creating webhook:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.errors?.[0]?.message || 'Error creating webhook',
    };
  }
}

export async function rotateAppSecret(clientId: string) {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error('Unauthorized');
  }

  try {
    const res = await axios.post(
      `${DIRECTUS_URL}/developer-portal/apps/${clientId}/rotate-secret`,
      {},
      {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      },
    );

    return { success: true, data: res.data.data };
  } catch (error: any) {
    console.error('Error rotating secret:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.errors?.[0]?.message || 'Error rotating secret',
    };
  }
}
