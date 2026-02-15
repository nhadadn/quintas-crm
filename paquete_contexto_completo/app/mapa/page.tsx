import { MapaSVGInteractivo } from '@/components/mapa-svg/MapaSVGInteractivo';
import { auth } from '@/lib/auth';

export default async function MapaPage() {
  const session = await auth();
  return (
    <main className="w-full h-screen">
      <MapaSVGInteractivo token={session?.accessToken} />
    </main>
  );
}
