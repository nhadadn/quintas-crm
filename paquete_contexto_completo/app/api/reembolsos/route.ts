import { NextResponse } from 'next/server';
import { directusClient, handleAxiosError } from '@/lib/directus-api';
import { auth } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const user_id = searchParams.get('user_id');

  try {
    const response = await directusClient.get('/pagos/reembolsos', {
      params: { status, user_id },
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });
    return NextResponse.json(response.data);
  } catch (error) {
    return handleAxiosError(error);
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const response = await directusClient.post('/pagos/reembolsos/solicitar', body, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });
    return NextResponse.json(response.data);
  } catch (error) {
    return handleAxiosError(error);
  }
}
