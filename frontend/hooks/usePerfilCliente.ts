import { useState, useEffect } from 'react';
import { getPerfilCliente, PerfilResponse } from '@/lib/perfil-api';

export function usePerfilCliente(token: string | null) {
  const [data, setData] = useState<PerfilResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setData(null);
      setLoading(false);
      return;
    }

    let mounted = true;

    async function fetchPerfil() {
      setLoading(true);
      setError(null);
      try {
        const result = await getPerfilCliente(token!);
        if (mounted) {
          setData(result);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Error al cargar perfil');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchPerfil();

    return () => {
      mounted = false;
    };
  }, [token]);

  return { perfil: data?.perfil, estadisticas: data?.estadisticas, loading, error };
}
