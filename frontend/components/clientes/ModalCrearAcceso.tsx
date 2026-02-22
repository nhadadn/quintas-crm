'use client';

import React, { useMemo, useRef, useState } from 'react';
import { createUserCliente, findUserByEmail } from '@/lib/users-api';
import { updateCliente } from '@/lib/clientes-api';

interface ModalCrearAccesoProps {
  open: boolean;
  onClose: () => void;
  cliente: { id: string | number; email: string; nombre?: string };
  token?: string;
  onSuccess?: (userId: string) => void;
}

function strength(pwd: string) {
  let s = 0;
  if (pwd.length >= 8) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[A-Z]/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) s++;
  return s;
}

export default function ModalCrearAcceso({
  open,
  onClose,
  cliente,
  token,
  onSuccess,
}: ModalCrearAccesoProps) {
  const pwdRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [score, setScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const s = score;

  if (!open) return null;

  const handleCreate = async () => {
    const pwd = pwdRef.current?.value || '';
    const confirm = confirmRef.current?.value || '';
    if (pwd.length < 8 || !/[0-9]/.test(pwd)) {
      alert('La contraseña debe tener al menos 8 caracteres y 1 número.');
      return;
    }
    if (pwd !== confirm) {
      alert('Las contraseñas no coinciden.');
      return;
    }
    setSubmitting(true);
    try {
      const existing = await findUserByEmail(cliente.email, token);
      let userId: string;
      if (existing) {
        userId = existing.id;
      } else {
        const created = await createUserCliente(cliente.email, pwd, token);
        userId = created.id;
      }
      await updateCliente(String(cliente.id), { user_id: userId } as any, token);
      onSuccess?.(userId);
      alert('Acceso creado. El cliente puede ingresar al portal con su email.');
      onClose();
    } catch (e) {
      console.error('Error creando acceso:', e);
      alert('No se pudo crear el acceso. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-card w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-foreground mb-1">Crear acceso al portal</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Se crearán credenciales para {cliente.email}
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
              Email
            </label>
            <input
              value={cliente.email}
              readOnly
              className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-foreground"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
              Contraseña
            </label>
            <div className="relative">
              <input
                ref={pwdRef}
                type={showPwd ? 'text' : 'password'}
                onChange={(e) => {
                  const v = e.target.value;
                  let sc = 0;
                  if (v.length >= 8) sc++;
                  if (/[0-9]/.test(v)) sc++;
                  if (/[A-Z]/.test(v) || /[^A-Za-z0-9]/.test(v)) sc++;
                  setScore(sc);
                }}
                className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-foreground pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs"
              >
                {showPwd ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className={`h-2 w-16 rounded ${s >= 1 ? 'bg-red-400' : 'bg-border'}`} />
              <div className={`h-2 w-16 rounded ${s >= 2 ? 'bg-yellow-400' : 'bg-border'}`} />
              <div className={`h-2 w-16 rounded ${s >= 3 ? 'bg-green-500' : 'bg-border'}`} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
              Confirmar Contraseña
            </label>
            <div className="relative">
              <input
                ref={confirmRef}
                type={showConfirm ? 'text' : 'password'}
                className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-foreground pr-12"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs"
              >
                {showConfirm ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
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
