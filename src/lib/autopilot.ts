import { Lead, ProductConfig } from '../types';
import { getDailySentCount, recordDailySentCount } from './quotaManager';

export interface AutopilotRunResult {
  status: 'success' | 'skipped' | 'noop' | 'error';
  message: string;
  processedCount: number;
  updatedLeads: Lead[];
  runAt?: string;
  simulated?: boolean;
}

/**
 * Executes an autopilot run by calling /api/autopilot/run
 */
export async function executeAutopilotRun(
  leads: Lead[],
  config: ProductConfig,
  forceRun: boolean = false
): Promise<AutopilotRunResult> {
  if (!config.autoOutreach && !forceRun) {
    return {
      status: 'skipped',
      message: 'Autopilot disattivato nelle impostazioni.',
      processedCount: 0,
      updatedLeads: [],
    };
  }

  const dailySentCount = getDailySentCount();

  try {
    const res = await fetch('/api/autopilot/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        leads,
        config,
        dailySentCount,
        forceRun,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        status: 'error',
        message: errData.error || `Errore HTTP ${res.status} durante l'autopilot`,
        processedCount: 0,
        updatedLeads: [],
      };
    }

    const data: AutopilotRunResult = await res.json();

    if (data.status === 'success' && data.processedCount > 0) {
      recordDailySentCount(data.processedCount);
    }

    return data;
  } catch (err: any) {
    return {
      status: 'error',
      message: err?.message || 'Impossibile contattare il server per l\'autopilot',
      processedCount: 0,
      updatedLeads: [],
    };
  }
}
