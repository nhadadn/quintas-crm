import { z } from 'zod';

export const createSubscriptionSchema = z.object({
  cliente_id: z.string().uuid({ message: 'cliente_id debe ser un UUID válido' }),
  venta_id: z.string().uuid({ message: 'venta_id debe ser un UUID válido' }),
  plan_id: z.string().uuid({ message: 'plan_id debe ser un UUID válido' }),
});

export const changePlanSchema = z.object({
  plan_id: z.string().uuid({ message: 'plan_id debe ser un UUID válido' }),
});

export const refundSchema = z.object({
  pago_id: z.string().uuid({ message: 'pago_id debe ser un UUID válido' }),
  monto: z.number().positive({ message: 'El monto debe ser positivo' }),
  razon: z.string().min(5, { message: 'La razón debe tener al menos 5 caracteres' }),
});

export const refundApprovalSchema = z.object({
  aprobado: z.boolean(),
  notas: z.string().optional(),
});

export const rejectRefundSchema = z.object({
  motivo: z.string().min(5, { message: 'El motivo de rechazo debe tener al menos 5 caracteres' }),
});

export const reportSchema = z.object({
  fecha_inicio: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Formato de fecha inválido (YYYY-MM-DD)' }),
  fecha_fin: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Formato de fecha inválido (YYYY-MM-DD)' }),
  agrupacion: z.enum(['dia', 'semana', 'mes']).optional(),
  formato: z.enum(['json', 'excel', 'pdf']).optional().default('json'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().optional().default(100),
});

export const createPaymentIntentSchema = z
  .object({
    venta_id: z.union([z.string(), z.number()]).optional(),
    numero_pago: z.number().int().positive().optional(),
    pago_id: z.union([z.string(), z.number()]).optional(),
    cliente_id: z.union([z.string(), z.number()]),
  })
  .refine((data) => (data.venta_id && data.numero_pago) || data.pago_id, {
    message: 'Debe proporcionar pago_id O (venta_id Y numero_pago)',
  });

export const registerPaymentSchema = z
  .object({
    venta_id: z.union([z.string().uuid(), z.number()]).optional(),
    pago_id: z.union([z.string().uuid(), z.number()]).optional(),
    monto: z
      .number()
      .positive({ message: 'El monto debe ser positivo' })
      .refine((val) => Number(val.toFixed(2)) === val, {
        message: 'El monto debe tener máximo 2 decimales',
      }),
    fecha_pago: z
      .string()
      .refine((date) => new Date(date) <= new Date(), {
        message: 'La fecha de pago no puede ser futura',
      })
      .optional(),
    metodo_pago: z.enum(['transferencia', 'efectivo', 'cheque', 'tarjeta', 'deposito'], {
      message: 'Método de pago inválido',
    }),
    referencia: z.string().optional(),
    tipo_pago: z
      .enum(['cuota_mensual', 'abono_capital', 'enganche', 'liquidacion', 'otros'])
      .optional(),
    notas: z.string().optional(),
  })
  .refine(
    (data) => {
      if (
        ['transferencia', 'cheque', 'tarjeta', 'deposito'].includes(data.metodo_pago) &&
        !data.referencia
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'La referencia es obligatoria para transferencia, cheque, tarjeta o depósito',
      path: ['referencia'],
    }
  )
  .refine((data) => data.venta_id || data.pago_id, {
    message: 'Debe especificar venta_id o pago_id',
    path: ['venta_id'],
  });
