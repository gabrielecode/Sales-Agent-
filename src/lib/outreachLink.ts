import { FunnelStage } from '../types';

/**
 * Regola condivisa per stabilire se includere o meno il link al prodotto nell'email.
 * Nel primo contatto (stage === 'awareness'), il link NON è incluso a meno che
 * config.includeLinkInFirstContact sia esplicitamente true.
 */
export function shouldIncludeLink(stage: FunnelStage, config: any): boolean {
  return stage !== 'awareness' || Boolean(config?.includeLinkInFirstContact);
}
