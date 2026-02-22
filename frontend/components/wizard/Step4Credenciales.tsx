'use client';

import React, { useMemo, useRef, useState } from 'react';

interface StepCredencialesProps {
  email: string;
  onBack: () => void;
  onNext: (data: { password: string; sendEmail: boolean }) => void;
  portalUrl?: string;
}

function getStrengthLabel(pwd: string): { label: 'débil' | 'media' | 'fuerte'; score: number } {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[A-Z]/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return { label: 'débil', score: 1 };
  if (score === 2) return { label: 'media', score: 2 };
  return { label: 'fuerte', score: 3 };
}

export function Step4Credenciales({ email, onBack, onNext, portalUrl }: StepCredencialesProps) {
  const pwdRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [score, setScore] = useState(0);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [sendEmail, setSendEmail] = useState(true);

  const strength = useMemo(() => {
    if (score <= 1) return { label: 'débil' as const, score: 1 };
    if (score === 2) return { label: 'media' as const, score: 2 };
    return { label: 'fuerte' as const, score: 3 };
  }, [score]);

  const handleNext = () => {
    const pwd = pwdRef.current?.value || '';
    const confirm = confirmRef.current?.value || '';
    if (pwd.length < 8 || !/[0-9]/.test(pwd)) {
      alert('La contraseña debe tener al menos 8 caracteres y 1 número.');
      return;
    }
    if (pwd !== confirm) {
      setConfirmError('Las contraseñas no coinciden');
      return;
    }
    setConfirmError(null);
    onNext({ password: pwd, sendEmail });
  };

  const url = portalUrl || (typeof window !== 'undefined' ? `${window.location.origin}/portal` : '/portal');

  return (
    <div className="max-w-3xl mx-auto bg-card p-8 rounded-2xl shadow-card border border-border">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-2">
        Acceso al Portal del Cliente
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Define las credenciales con las que el cliente podrá consultar su estado de cuenta y pagos en el portal.
      </p>

      <div className="space-y-6">
        <div>
          <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
            Email
          </label>
          <input
            value={email}
            readOnly
            className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-foreground"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Para cambiar el email, vuelve al paso anterior.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
              Contraseña
            </label>
            <div className="relative">
              <input
                ref={pwdRef}
                type={showPwd ? 'text' : 'password'}
                onChange={(e) => {
                  const pwd = e.target.value;
                  let sc = 0;
                  if (pwd.length >= 8) sc++;
                  if (/[0-9]/.test(pwd)) sc++;
                  if (/[A-Z]/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) sc++;
                  setScore(sc);
                }}
                className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-transparent pr-12"
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
              <div
                className={`h-2 w-20 rounded ${strength.score >= 1 ? 'bg-red-400' : 'bg-border'}`}
              />
              <div
                className={`h-2 w-20 rounded ${strength.score >= 2 ? 'bg-yellow-400' : 'bg-border'}`}
              />
              <div
                className={`h-2 w-20 rounded ${strength.score >= 3 ? 'bg-green-500' : 'bg-border'}`}
              />
              <span className="text-xs text-muted-foreground ml-2 capitalize">
                Fortaleza: {strength.label}
              </span>
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
                className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-transparent pr-12"
                onChange={() => setConfirmError(null)}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs"
              >
                {showConfirm ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {confirmError && <p className="text-xs text-red-500 mt-1">{confirmError}</p>}
          </div>
        </div>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={sendEmail}
            onChange={(e) => setSendEmail(e.target.checked)}
            className="w-5 h-5 rounded border-border text-primary focus:ring-primary bg-input"
          />
          <span className="text-sm text-foreground">Enviar credenciales al cliente por email</span>
        </label>

        <div className="bg-background-paper p-4 rounded-xl border border-border">
          <p className="text-sm text-muted-foreground">
            El cliente podrá acceder a su estado de cuenta en: <span className="text-primary">{url}</span>
          </p>
        </div>
      </div>

      <div className="flex justify-between pt-6 border-t border-border mt-8">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-2 rounded-xl border border-border bg-background text-muted-foreground hover:bg-background-subtle transition-colors"
        >
          Atrás
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-semibold shadow-warm hover:bg-primary-dark transition-colors"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
