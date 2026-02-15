import { NextResponse } from 'next/server';
import { directusClient, handleAxiosError } from '@/lib/directus-api';
import { auth } from '@/lib/auth';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const response = await directusClient.post(
      `/pagos/reembolsos/${params.id}/aprobar`,
      {},
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      },
    );
    return NextResponse.json(response.data);
  } catch (error) {
    return handleAxiosError(error);
  }
}
