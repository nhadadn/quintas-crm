'use client';

import React, { useMemo, useState } from 'react';
import { createVendedorConUsuario } from '@/lib/vendedores-api';
import { findUserByEmail } from '@/lib/users-api';

interface ModalNuevoVendedorProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ModalNuevoVendedor({ open, onClose, onSuccess }: ModalNuevoVendedorProps) {
  const [form, setForm] = useState({
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    email: '',
    telefono: '',
    password: '',
    confirm: '',
    porcentaje_comision: 5,
    estatus: 'Activo',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const passwordStrength = useMemo(() => {
    const v = form.password;
    let score = 0;
    if (v.length >= 8) score++;
    if (/[A-Z]/.test(v)) score++;
    if (/\d/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;
    return score; // 0-4
  }, [form.password]);

  if (!open) return null;

  const submit = async () => {
    setError(null);
    if (!form.nombre || !form.apellido_paterno || !form.email || !form.password || !form.confirm) {
      setError('Completa los campos obligatorios');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    try {
      setSubmitting(true);
      const exists = await findUserByEmail(form.email);
      if (exists) {
        setError('Ya existe un usuario con este email');
        setSubmitting(false);
        return;
      }
      await createVendedorConUsuario(
        {
          nombre: form.nombre,
          apellido_paterno: form.apellido_paterno,
          apellido_materno: form.apellido_materno || undefined,
          email: form.email,
          telefono: form.telefono || undefined,
          porcentaje_comision: Number(form.porcentaje_comision) || 5,
          estatus: form.estatus === 'Activo' ? 1 : 0,
        } as any,
        form.password,
      );
      onSuccess?.();
    } catch (e: any) {
      setError(e?.message || 'Error creando vendedor');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="w-full max-w-2xl bg-card rounded-2xl border border-border shadow-xl">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Nuevo Vendedor</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            Cerrar
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg border border-danger/30 text-danger text-sm">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1 text-muted-foreground">Nombre *</label>
              <input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background"
              />
            </div>
            <div>
              <label className="block text-sm mb-1 text-muted-foreground">
                Apellido Paterno *
              </label>
              <input
                value={form.apellido_paterno}
                onChange={(e) => setForm({ ...form, apellido_paterno: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background"
              />
            </div>
            <div>
              <label className="block text-sm mb-1 text-muted-foreground">Apellido Materno</label>
              <input
                value={form.apellido_materno}
                onChange={(e) => setForm({ ...form, apellido_materno: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background"
              />
            </div>
            <div>
              <label className="block text-sm mb-1 text-muted-foreground">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background"
              />
            </div>
            <div>
              <label className="block text-sm mb-1 text-muted-foreground">Teléfono</label>
              <input
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background"
              />
            </div>
            <div>
              <label className="block text-sm mb-1 text-muted-foreground">
                Porcentaje de comisión
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.porcentaje_comision}
                onChange={(e) =>
                  setForm({ ...form, porcentaje_comision: Number(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 rounded-xl border border-border bg-background"
              />
            </div>
            <div>
              <label className="block text-sm mb-1 text-muted-foreground">Estado</label>
              <select
                value={form.estatus}
                onChange={(e) => setForm({ ...form, estatus: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background"
              >
                <option>Activo</option>
                <option>Inactivo</option>
              </select>
            </div>
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1 text-muted-foreground">Contraseña *</label>
                <div className="flex gap-2">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
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
                <div className="mt-2 h-1 rounded bg-background-subtle">
                  <div
                    className={`h-1 rounded ${
                      passwordStrength <= 1
                        ? 'bg-danger w-1/4'
                        : passwordStrength === 2
                          ? 'bg-yellow-500 w-2/4'
                          : passwordStrength === 3
                            ? 'bg-emerald-500 w-3/4'
                            : 'bg-emerald-600 w-full'
                    }`}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1 text-muted-foreground">
                  Confirmar Contraseña *
                </label>
                <div className="flex gap-2">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={form.confirm}
                    onChange={(e) => setForm({ ...form, confirm: e.target.value })}
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
            onClick={submit}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold shadow-warm hover:bg-primary-dark disabled:opacity-50"
          >
            Crear vendedor
          </button>
        </div>
      </div>
    </div>
  );
}
