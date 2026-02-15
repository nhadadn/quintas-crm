'use client';

import { useState } from 'react';
import { rotateAppSecret } from '@/lib/actions/developer-portal';
import { Copy, RefreshCw, Eye, EyeOff } from 'lucide-react';

interface AppDetailProps {
  app: any;
}

export function AppDetail({ app }: AppDetailProps) {
  const [secret, setSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  async function handleRotate() {
    if (!confirm('¿Estás seguro? El secret anterior dejará de funcionar inmediatamente.')) return;

    setLoading(true);
    const res = await rotateAppSecret(app.client_id);
    setLoading(false);

    if (res.success) {
      setSecret(res.data.new_client_secret);
      setShowSecret(true);
    } else {
      alert(res.error);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    alert('Copiado al portapapeles');
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-slate-100 mb-4">Credenciales</h2>
        <div className="grid gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Client ID</label>
            <div className="flex gap-2">
              <code className="flex-1 bg-slate-950 px-3 py-2 rounded border border-slate-700 font-mono text-slate-300">
                {app.client_id}
              </code>
              <button
                onClick={() => copyToClipboard(app.client_id)}
                className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
              >
                <Copy size={18} />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Client Secret</label>
            {secret ? (
              <div className="space-y-2">
                <div className="bg-yellow-500/10 border border-yellow-500/50 p-4 rounded-md">
                  <p className="text-yellow-200 text-sm font-medium mb-2">
                    ¡Nuevo Secret Generado! Guárdalo ahora, no podrás verlo de nuevo.
                  </p>
                  <div className="flex gap-2 items-center">
                    <code className="flex-1 bg-slate-950 px-3 py-2 rounded border border-yellow-500/30 font-mono text-yellow-100 break-all">
                      {secret}
                    </code>
                    <button
                      onClick={() => copyToClipboard(secret)}
                      className="p-2 hover:bg-slate-800 rounded text-yellow-200 hover:text-white transition-colors"
                    >
                      <Copy size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="text-slate-500 italic">••••••••••••••••••••••••••••••••</div>
                <button
                  onClick={handleRotate}
                  disabled={loading}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-sm transition-colors border border-slate-700"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                  Rotar Secret
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800 pt-6">
        <h2 className="text-xl font-semibold text-slate-100 mb-4">Configuración</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Nombre</label>
            <p className="text-slate-200">{app.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Creado</label>
            <p className="text-slate-200">
              {new Date(app.created_at || Date.now()).toLocaleDateString()}
            </p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-400 mb-1">Redirect URIs</label>
            <div className="flex flex-wrap gap-2">
              {app.redirect_uris?.map((uri: string, i: number) => (
                <span
                  key={i}
                  className="bg-slate-950 px-2 py-1 rounded border border-slate-700 text-sm text-slate-300 font-mono"
                >
                  {uri}
                </span>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-400 mb-1">Scopes</label>
            <div className="flex flex-wrap gap-2">
              {app.scopes?.map((scope: string, i: number) => (
                <span
                  key={i}
                  className="bg-blue-900/30 px-2 py-1 rounded border border-blue-800/50 text-sm text-blue-300 font-mono"
                >
                  {scope}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
