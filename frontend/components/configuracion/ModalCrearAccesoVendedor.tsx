'use client';

import React, { useState } from 'react';
import { createUserVendedor, findUserByEmail } from '@/lib/users-api';
import { linkVendedorUsuario } from '@/lib/vendedores-api';

interface ModalCrearAccesoVendedorProps {
  open: boolean;
  onClose: () => void;
  vendedor: { id: string; email: string };
  onSuccess?: (userId?: string) => void;
}

export default function ModalCrearAccesoVendedor({
  open,
  onClose,
  vendedor,
  onSuccess,
}: ModalCrearAccesoVendedorProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleCreate = async () => {
    setError(null);
    if (!password || !confirm) {
      setError('Ingresa y confirma la contraseña');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    try {
      setSubmitting(true);
      const exists = await findUserByEmail(vendedor.email);
      if (exists) {
        setError('Ya existe un usuario con este email');
        setSubmitting(false);
        return;
      }
      const user = await createUserVendedor(vendedor.email, password);
      await linkVendedorUsuario(vendedor.id, user.id);
      onSuccess?.(user.id);
    } catch (e: any) {
      setError(e?.message || 'Error creando acceso');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="w-full max-w-lg bg-card rounded-2xl border border-border shadow-xl">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Crear acceso</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            Cerrar
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="text-sm text-muted-foreground">
            Se creará una cuenta de sistema para: <b>{vendedor.email}</b>
          </div>
          {error && (
            <div className="p-3 rounded-lg border border-danger/30 text-danger text-sm">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1 text-muted-foreground">Contraseña</label>
              <div className="flex gap-2">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-border bg-background"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="px-3 py-2 rounded-xl border border-border bg-background"
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1 text-muted-foreground">Confirmar contraseña</label>
              <div className="flex gap-2">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-border bg-background"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((s) => !s)}
                  className="px-3 py-2 rounded-xl border border-border bg-background"
                >
                  {showConfirm ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-border flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border bg-background hover:bg-background-subtle"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleCreate}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold shadow-warm hover:bg-primary-dark disabled:opacity-50"
          >
            Crear acceso
          </button>
        </div>
      </div>
    </div>
  );
}
