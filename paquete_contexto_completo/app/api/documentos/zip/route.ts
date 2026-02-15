import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { DocumentoPortal } from '@/lib/documentos-api';
import archiver from 'archiver';

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session || !session.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { documents } = (await request.json()) as { documents: DocumentoPortal[] };

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return NextResponse.json({ error: 'No documents provided' }, { status: 400 });
    }

    // Set up archive
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Sets the compression level.
    });

    // Create a readable stream from the archive
    // We need to pipe this to the response.
    // In Next.js App Router, we can return a ReadableStream or Buffer.
    // However, archiver works with Node streams. We need to bridge this.

    // Alternative: Collect buffer (simple for moderate size) or use TransformStream (complex).
    // Given PDFs are usually small (< 1MB), buffering in memory might be acceptable for < 20 files.
    // But let's try to be streaming-friendly.

    // To return a stream in Next.js response:
    const stream = new ReadableStream({
      start(controller) {
        archive.on('data', (chunk) => {
          controller.enqueue(chunk);
        });
        archive.on('end', () => {
          controller.close();
        });
        archive.on('error', (err) => {
          controller.error(err);
        });
      },
    });

    // Start processing files asynchronously
    (async () => {
      const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

      for (const doc of documents) {
        try {
          let fetchUrl = doc.url_descarga;

          // Determine the correct URL to fetch from
          if (fetchUrl.startsWith('/api/')) {
            // It's an internal API route.
            // We need to map it to the actual source if possible to avoid loopback,
            // or use absolute URL.
            // For receipts: /api/reportes/recibo-pago?id=123 -> Directus /recibos/123/generar

            if (doc.tipo === 'recibo' && doc.metadata?.pago_id) {
              fetchUrl = `${directusUrl}/recibos/${doc.metadata.pago_id}/generar`;
            } else if (doc.tipo === 'estado_cuenta') {
              // Map to Directus extension endpoint if known, or fallback to internal loopback
              // For now, let's use the internal loopback with full URL
              fetchUrl = `${appUrl}${doc.url_descarga}`;
            } else {
              // Default fallback
              fetchUrl = `${appUrl}${doc.url_descarga}`;
            }
          }

          console.log(`Zipping: Fetching ${fetchUrl}`);

          const response = await fetch(fetchUrl, {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
              // Forward cookies if needed for internal routes
              ...(request.headers.get('cookie') ? { Cookie: request.headers.get('cookie')! } : {}),
            },
          });

          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const filename = `${doc.titulo.replace(/[^a-z0-9]/gi, '_')}_${doc.id}.pdf`;
            archive.append(buffer, { name: filename });
          } else {
            console.error(`Failed to fetch ${doc.id}: ${response.status}`);
            // We can append an error text file or skip
            archive.append(Buffer.from(`Error downloading ${doc.titulo}`), {
              name: `ERROR_${doc.id}.txt`,
            });
          }
        } catch (error) {
          console.error(`Error processing ${doc.id}:`, error);
          archive.append(Buffer.from(`Error processing ${doc.titulo}`), {
            name: `ERROR_${doc.id}.txt`,
          });
        }
      }

      await archive.finalize();
    })().catch((err) => console.error('Archive generation error:', err));

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="documentos_quintas.zip"`,
      },
    });
  } catch (error) {
    console.error('ZIP generation error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
