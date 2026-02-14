'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PagoPerfil } from '@/lib/perfil-api';

interface ModalSolicitarReembolsoProps {
  isOpen: boolean;
  onClose: () => void;
  pago: PagoPerfil | null;
  onSuccess: () => void;
}

export function ModalSolicitarReembolso({ isOpen, onClose, pago, onSuccess }: ModalSolicitarReembolsoProps) {
  const [razon, setRazon] = useState('');
  const [monto, setMonto] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && pago) {
      setMonto(pago.monto);
      setRazon('');
      setError(null);
    }
  }, [isOpen, pago]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pago) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/reembolsos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pago_id: pago.id,
          monto: Number(monto),
          razon,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.errors?.[0]?.message || data.error || 'Error al solicitar reembolso');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!pago) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-slate-900 text-slate-100 border-slate-700">
        <DialogHeader>
          <DialogTitle>Solicitar Reembolso</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <label htmlFor="monto" className="text-sm font-medium">
              Monto a reembolsar
            </label>
            <input
              id="monto"
              type="number"
              max={pago.monto}
              value={monto}
              onChange={(e) => setMonto(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full p-2 rounded-md bg-slate-800 border border-slate-700 text-white"
              required
            />
            <p className="text-xs text-slate-400">Máximo: ${pago.monto}</p>
          </div>
          <div className="grid gap-2">
            <label htmlFor="razon" className="text-sm font-medium">
              Motivo del reembolso
            </label>
            <textarea
              id="razon"
              value={razon}
              onChange={(e) => setRazon(e.target.value)}
              className="w-full p-2 rounded-md bg-slate-800 border border-slate-700 text-white"
              rows={3}
              required
              minLength={5}
            />
          </div>

          {error && <div className="text-red-400 text-sm">{error}</div>}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !monto || !razon}>
              {loading ? 'Enviando...' : 'Solicitar Reembolso'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
