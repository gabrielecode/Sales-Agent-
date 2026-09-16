import { Lead, FunnelStage } from '../types';

/**
 * Maps a lead to one of the 3 funnel stages:
 * - Awareness: discovered, contacted, awaiting_reply
 * - Evaluation: replied with intent 'interested' or 'info_requested'
 * - Purchase: in_negotiation, ready_to_close intent, or won
 */
export function getFunnelStage(lead: Lead): FunnelStage {
  const status = lead.status;
  const intent = lead.response?.intent;

  // 1. Purchase stage
  if (status === 'in_negotiation' || status === 'won' || intent === 'ready_to_close') {
    return 'purchase';
  }

  // 2. Evaluation stage
  if (status === 'replied' && (intent === 'interested' || intent === 'info_requested')) {
    return 'evaluation';
  }

  // 3. Awareness stage (default for discovered, contacted, awaiting_reply, or initial outreach)
  return 'awareness';
}

export function getFunnelStageLabel(stage: FunnelStage): string {
  switch (stage) {
    case 'awareness':
      return 'Awareness';
    case 'evaluation':
      return 'Evaluation';
    case 'purchase':
      return 'Purchase';
  }
}

export const FUNNEL_STAGE_LABELS: Record<FunnelStage, string> = {
  awareness: 'Awareness',
  evaluation: 'Evaluation',
  purchase: 'Purchase',
};

export const FUNNEL_STAGE_COLORS: Record<FunnelStage, string> = {
  awareness: 'bg-pink-50 text-pink-700 border-pink-200',
  evaluation: 'bg-rose-50 text-rose-700 border-rose-200',
  purchase: 'bg-amber-50 text-amber-800 border-amber-200',
};

export function getFunnelStageDescription(stage: FunnelStage): string {
  switch (stage) {
    case 'awareness':
      return 'Contenuti educativi & soft (guida, checklist, report)';
    case 'evaluation':
      return 'Contenuti di valutazione (case study, demo, FAQ)';
    case 'purchase':
      return 'Offerte di chiusura (free trial, call, codice partner)';
  }
}

/**
 * Returns consistent Tailwind color classes:
 * - Awareness: rosa / magenta (fuchsia/pink)
 * - Evaluation: rosso (rose/red)
 * - Purchase: giallo / ocra (amber/yellow)
 */
export function getFunnelStageBadgeStyles(stage: FunnelStage): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  switch (stage) {
    case 'awareness':
      return {
        bg: 'bg-pink-50',
        text: 'text-pink-700',
        border: 'border-pink-200',
        dot: 'bg-pink-500',
      };
    case 'evaluation':
      return {
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200',
        dot: 'bg-rose-500',
      };
    case 'purchase':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
      };
  }
}
