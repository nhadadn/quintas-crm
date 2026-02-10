import axios from 'axios';
import { directusClient, DirectusResponse, handleAxiosError } from './directus-api';
import {
  KPIResponse,
  VentasPorMes,
  VentasPorVendedor,
  PagosPorEstatus,
  LotesPorEstatus,
  ComisionesPorVendedor,
  DashboardFilters,
} from '@/types/dashboard';

// Helper to add cache busting
const getParams = (filters?: DashboardFilters) => ({
  ...filters,
  _t: Date.now(), // Cache busting
});

export async function fetchKPIs(filters?: DashboardFilters, token?: string): Promise<KPIResponse> {
  try {
    const response = await axios.get<DirectusResponse<KPIResponse>>(
      '/api/dashboard/kpis',
      {
        params: getParams(filters),
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'fetchKPIs');
    // Return empty data to prevent crash
    return {
      total_ventas: 0,
      total_pagado: 0,
      total_pendiente: 0,
      ventas_mes_actual: 0,
      crecimiento_mes_anterior: 0,
      lotes_vendidos_mes: 0,
      comisiones_pendientes: 0,
    };
  }
}

export async function fetchVentasPorMes(
  filters?: DashboardFilters,
  token?: string,
): Promise<VentasPorMes[]> {
  try {
    const response = await axios.get<DirectusResponse<VentasPorMes[]>>(
      '/api/dashboard/ventas-por-mes',
      {
        params: getParams(filters),
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'fetchVentasPorMes');
    return [];
  }
}

export async function fetchVentasPorVendedor(
  filters?: DashboardFilters,
  token?: string,
): Promise<VentasPorVendedor[]> {
  try {
    const response = await axios.get<DirectusResponse<VentasPorVendedor[]>>(
      '/api/dashboard/ventas-por-vendedor',
      {
        params: getParams(filters),
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'fetchVentasPorVendedor');
    return [];
  }
}

export async function fetchPagosPorEstatus(
  filters?: DashboardFilters,
  token?: string,
): Promise<PagosPorEstatus[]> {
  try {
    const response = await axios.get<DirectusResponse<PagosPorEstatus[]>>(
      '/api/dashboard/pagos-por-estatus',
      {
        params: getParams(filters),
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'fetchPagosPorEstatus');
    return [];
  }
}

export async function fetchLotesPorEstatus(
  filters?: DashboardFilters,
  token?: string,
): Promise<LotesPorEstatus[]> {
  try {
    const response = await axios.get<DirectusResponse<LotesPorEstatus[]>>(
      '/api/dashboard/lotes-por-estatus',
      {
        params: getParams(filters),
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'fetchLotesPorEstatus');
    return [];
  }
}

export async function fetchComisionesPorVendedor(
  filters?: DashboardFilters,
  token?: string,
): Promise<ComisionesPorVendedor[]> {
  try {
    const response = await axios.get<DirectusResponse<ComisionesPorVendedor[]>>(
      '/api/dashboard/comisiones-por-vendedor',
      {
        params: getParams(filters),
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'fetchComisionesPorVendedor');
    return [];
  }
}

export async function fetchVentasRecientes(limit = 10, token?: string): Promise<any[]> {
  try {
    const response = await axios.get<DirectusResponse<any[]>>(
      '/api/dashboard/ventas-recientes',
      {
        params: { limit, _t: Date.now() },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'fetchVentasRecientes');
    return [];
  }
}
