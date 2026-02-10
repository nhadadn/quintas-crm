import { NextResponse } from 'next/server';

const mockPagos = [
  {
    id: 1,
    numero_pago: 1,
    fecha_vencimiento: '2023-11-15',
    monto: 5000,
    estatus: 'pagado',
    venta: {
      id: 101,
      lote: { numero_lote: 'A-01' },
      cliente: { nombre: 'Juan', apellido: 'Perez' }
    }
  },
  {
    id: 2,
    numero_pago: 2,
    fecha_vencimiento: '2023-12-15',
    monto: 5000,
    estatus: 'pendiente',
    venta: {
      id: 101,
      lote: { numero_lote: 'A-01' },
      cliente: { nombre: 'Juan', apellido: 'Perez' }
    }
  },
  {
    id: 3,
    numero_pago: 1,
    fecha_vencimiento: '2023-11-20',
    monto: 4500,
    estatus: 'pagado',
    venta: {
      id: 102,
      lote: { numero_lote: 'B-05' },
      cliente: { nombre: 'Maria', apellido: 'Lopez' }
    }
  },
  {
    id: 4,
    numero_pago: 2,
    fecha_vencimiento: '2023-12-20',
    monto: 4500,
    estatus: 'vencido',
    venta: {
      id: 102,
      lote: { numero_lote: 'B-05' },
      cliente: { nombre: 'Maria', apellido: 'Lopez' }
    }
  },
  {
    id: 5,
    numero_pago: 3,
    fecha_vencimiento: '2024-01-20',
    monto: 4500,
    estatus: 'pendiente',
    venta: {
      id: 102,
      lote: { numero_lote: 'B-05' },
      cliente: { nombre: 'Maria', apellido: 'Lopez' }
    }
  }
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (id) {
    const pago = mockPagos.find(p => p.id === Number(id));
    if (pago) {
      return NextResponse.json({ data: pago });
    }
    return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });
  }

  return NextResponse.json({ data: mockPagos });
}
