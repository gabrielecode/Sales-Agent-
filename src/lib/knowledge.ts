import fs from 'fs';
import path from 'path';
import { ProductKnowledge, SharedKnowledge } from '../types';

/**
 * Carica la conoscenza condivisa (shared_knowledge.json)
 */
export function loadSharedKnowledge(): SharedKnowledge | null {
  try {
    const p = path.join(process.cwd(), 'knowledge', 'shared_knowledge.json');
    if (!fs.existsSync(p)) return null;
    
    const content = fs.readFileSync(p, 'utf8');
    const data = JSON.parse(content);
    
    // Validazione base
    if (!data.company_name || !data.unsubscribe_lines) {
      console.error('shared_knowledge.json: Struttura non valida (mancano campi obbligatori)');
      return null;
    }
    
    return data as SharedKnowledge;
  } catch (e) {
    console.error('Errore durante il caricamento di shared_knowledge.json:', e);
    return null;
  }
}

/**
 * Elenca e carica tutti i prodotti dalla cartella knowledge/
 */
export function loadProductKnowledge(): ProductKnowledge[] {
  const products: ProductKnowledge[] = [];
  try {
    const dir = path.join(process.cwd(), 'knowledge');
    if (!fs.existsSync(dir)) return [];
    
    const files = fs.readdirSync(dir);
    for (const f of files) {
      if (f.endsWith('_knowledge.json') && f !== 'shared_knowledge.json') {
        try {
          const content = fs.readFileSync(path.join(dir, f), 'utf8');
          const data = JSON.parse(content);
          
          // Validazione minima
          if (data.product_id && data.product_name && data.description) {
            products.push(data as ProductKnowledge);
          } else {
            console.warn(`File knowledge ignorato per struttura incompleta: ${f}`);
          }
        } catch (err) {
          console.error(`Errore nel parsing del file knowledge ${f}:`, err);
        }
      }
    }
  } catch (e) {
    console.error('Errore durante il caricamento dei prodotti knowledge:', e);
  }
  return products;
}

/**
 * Trova un prodotto specifico per ID
 */
export function getProductById(productId: string): ProductKnowledge | null {
  const products = loadProductKnowledge();
  return products.find(p => p.product_id === productId) || null;
}
