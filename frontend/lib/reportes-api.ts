import { directusClient, handleAxiosError } from './directus-api';

export interface DashboardMetrics {
  subscriptions: {
    new_subscriptions: number;
    canceled_subscriptions: number;
    total_active: number;
  };
  mrr: {
    mrr: number;
    currency: string;
  };
  churn: {
    churn_rate: number;
    start_count: number;
    canceled_count: number;
  };
  revenue: {
    total_revenue: number;
  };
  refunds: {
    refund_count: number;
    refund_amount: number;
  };
  payment_health: {
    failure_rate: number;
    total_attempts: number;
    failed_attempts: number;
  };
}

export interface RevenueForecast {
  date: string;
  predicted_revenue: number;
}

export async function fetchDashboardMetrics(startDate: string, endDate: string, token?: string): Promise<DashboardMetrics> {
  try {
    const response = await directusClient.get('/pagos/reportes/dashboard', {
      params: { fecha_inicio: startDate, fecha_fin: endDate },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'fetchDashboardMetrics');
    throw error;
  }
}

export async function fetchRevenueForecast(token?: string): Promise<RevenueForecast[]> {
  try {
    const response = await directusClient.get('/pagos/reportes/forecast', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'fetchRevenueForecast');
    throw error;
  }
}
