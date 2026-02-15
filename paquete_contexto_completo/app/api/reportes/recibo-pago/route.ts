import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session || !session.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
  }

  try {
    const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';
    // The endpoint in Directus is /recibos/:id/generar
    const response = await fetch(`${directusUrl}/recibos/${id}/generar`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    if (!response.ok) {
      console.error(`Error fetching receipt: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: 'Failed to generate receipt' },
        { status: response.status },
      );
    }

    const contentType = response.headers.get('content-type') || 'application/pdf';
    const blob = await response.blob();
    const buffer = Buffer.from(await blob.arrayBuffer());

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="recibo-${id}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error proxying receipt request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
