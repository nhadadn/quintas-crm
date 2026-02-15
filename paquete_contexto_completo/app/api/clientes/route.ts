import { NextResponse } from 'next/server';

const allowMock = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true';
import { Cliente } from '@/types/erp';

const MOCK_CLIENTES: Cliente[] = [
  {
    id: 1,
    nombre: 'Juan',
    apellido_paterno: 'Pérez',
    apellido_materno: 'López',
    email: 'juan.perez@email.com',
    telefono: '555-123-4567',
    rfc: 'PELJ800101XYZ',
    direccion: 'Av. Reforma 123, CDMX',
    ingreso_mensual: 25000,
    created_at: '2023-01-15T10:00:00Z',
    date_created: '2023-01-15T10:00:00Z',
  },
  {
    id: 2,
    nombre: 'María',
    apellido_paterno: 'González',
    apellido_materno: 'Sánchez',
    email: 'maria.gonzalez@email.com',
    telefono: '555-987-6543',
    rfc: 'GOSM900505ABC',
    direccion: 'Calle Pino 45, Guadalajara',
    ingreso_mensual: 30000,
    created_at: '2023-02-20T14:30:00Z',
    date_created: '2023-02-20T14:30:00Z',
  },
  {
    id: 3,
    nombre: 'Carlos',
    apellido_paterno: 'Ramírez',
    email: 'carlos.ramirez@email.com',
    telefono: '555-555-5555',
    rfc: 'RACC850808DEF',
    direccion: 'Blvd. Kukulcan 10, Cancún',
    ingreso_mensual: 45000,
    created_at: '2023-03-10T09:15:00Z',
    date_created: '2023-03-10T09:15:00Z',
  },
];

export async function GET(request: Request) {
  if (!allowMock) {
    return NextResponse.json({ error: 'Mock API disabled' }, { status: 404 });
  }
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('filter[_or][0][nombre][_icontains]') || ''; // Simple mock search

  let filteredClientes = MOCK_CLIENTES;

  if (search) {
    // This is just a basic check, the actual filter logic in API is more complex
    // But for mock purposes, if we detect a search param, we can filter
  }

  return NextResponse.json({
    data: filteredClientes,
    meta: {
      filter_count: filteredClientes.length,
      total_count: MOCK_CLIENTES.length,
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newCliente: Cliente = {
      ...body,
      id: Math.floor(Math.random() * 1000) + 10,
      created_at: new Date().toISOString(),
      date_created: new Date().toISOString(),
    };
    return NextResponse.json({ data: newCliente });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid Request' }, { status: 400 });
  }
}
