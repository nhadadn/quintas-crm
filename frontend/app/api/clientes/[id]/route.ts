import { NextResponse } from 'next/server';
import { Cliente } from '@/types/erp';

const MOCK_CLIENTE: Cliente = {
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
  date_created: '2023-01-15T10:00:00Z'
};

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  
  // Return mock client with requested ID
  return NextResponse.json({
    data: { ...MOCK_CLIENTE, id: Number(id) || id }
  });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  const body = await request.json();
  
  return NextResponse.json({
    data: { ...MOCK_CLIENTE, id: Number(id) || id, ...body }
  });
}
