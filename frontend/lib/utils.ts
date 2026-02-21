import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const currencyFormatterMXN = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 2,
});

const compactNumberFormatter = new Intl.NumberFormat('es-MX', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrencyMXN(value: number | null | undefined) {
  const n = value == null ? 0 : Number(value);
  if (!Number.isFinite(n)) return currencyFormatterMXN.format(0);
  return currencyFormatterMXN.format(n);
}

export function formatNumberCompact(value: number | null | undefined) {
  const n = value == null ? 0 : Number(value);
  if (!Number.isFinite(n)) return compactNumberFormatter.format(0);
  return compactNumberFormatter.format(n);
}
