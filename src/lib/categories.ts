export interface CategoryGroup {
  groupName: string;
  categories: string[];
}

export const SECTOR_GROUPS: CategoryGroup[] = [
  {
    groupName: 'Artigianato, Edilizia & Manutenzioni',
    categories: [
      'Pittura & Imbiancatura',
      'Idraulica & Termoidraulica',
      'Pulizie & Multiservizi',
      'Edilizia & Ristrutturazioni',
      'Elettricisti & Impianti Elettrici',
      'Falegnameria & Serramenti',
      'Fabbri & Carpenteria Metallica',
      'Giardinaggio & Manutenzione Verde',
      'Climatizzazione & Riscaldamento',
      'Spazzacamini & Tetti',
    ],
  },
  {
    groupName: 'Servizi alle Imprese & Professionisti',
    categories: [
      'Multiservizi & Facility Management',
      'Consulenza Aziendale, Fiscale & Fiduciaria',
      'Studi Tecnici, Architetti & Geometri',
      'Informatica, Web & Software',
      'Marketing, Comunicazione & Grafica',
      'Logistica, Trasporti & Traslochi',
      'Sicurezza, Vigilanza & Allarmi',
      'Fotografia & Riprese Video',
    ],
  },
  {
    groupName: 'Commercio, Prodotti & Retail',
    categories: [
      'Alimentare & Enogastronomia',
      'Moda, Abbigliamento & Accessori',
      'Casa, Arredamento & Design',
      'Bellezza & Cosmetica',
      'Gioielli, Orologi & Bijoux',
      'Artigianato & Fatto a Mano',
      'Casa, Decorazioni & Arte',
      'Editoria, Libri & Guide',
      'Sport & Tempo Libero',
      'Infanzia & Giocattoli',
      'Animali & Pet Care',
      'Auto, Moto & Officine Meccaniche',
    ],
  },
  {
    groupName: 'Benessere, Persona & Ospitalità',
    categories: [
      'Ristorazione, Bar & Catering',
      'Hotel, B&B & Ospitalità',
      'Parrucchieri, Barbieri & Hair Salon',
      'Centri Estetici, Spa & Benessere',
      'Salute, Fisioterapia & Poliambulatori',
    ],
  },
];

export const ALL_SECTORS: string[] = SECTOR_GROUPS.flatMap((g) => g.categories);

/**
 * Determines whether a given sector is an artisan, building, or local service business
 * (not an online merchandise retail shop).
 */
export function isLocalOrServiceSector(sector: string = ''): boolean {
  const s = sector.toLowerCase();
  return (
    s.includes('pittur') ||
    s.includes('idraulic') ||
    s.includes('pulizi') ||
    s.includes('multiserviz') ||
    s.includes('facility') ||
    s.includes('ediliz') ||
    s.includes('elettric') ||
    s.includes('falegnam') ||
    s.includes('fabbr') ||
    s.includes('giardin') ||
    s.includes('climatizz') ||
    s.includes('meccanic') ||
    s.includes('ristorazion') ||
    s.includes('parrucchier') ||
    s.includes('estetic') ||
    s.includes('salute') ||
    s.includes('fisioterapi') ||
    s.includes('studi tecnic') ||
    s.includes('architett') ||
    s.includes('fiduciar') ||
    s.includes('consulenz') ||
    s.includes('trasloch') ||
    s.includes('trasport')
  );
}

/**
 * Detects an appropriate category from brand name, notes, url, and raw text.
 */
export function detectSectorSmart(
  shopName: string = '',
  notes: string = '',
  rawIndustry: string = '',
  url: string = '',
  configDefault?: string
): string {
  const cleanRaw = (rawIndustry || '').trim();
  const rawLower = cleanRaw.toLowerCase();

  // If already matches one of the known sectors exactly or closely, return it
  if (cleanRaw && !['e-commerce', 'ecommerce', 'web', 'online', 'non specificato', 'generico', 'altro', 'digitale', 'aziendale'].includes(rawLower)) {
    // Check if it's already one of ALL_SECTORS
    const found = ALL_SECTORS.find((s) => s.toLowerCase() === rawLower);
    if (found) return found;
  }

  const ctx = `${shopName} ${notes} ${url} ${cleanRaw}`.toLowerCase();

  // 1. Pittura & Imbianchini
  if (/(pittur|pittor|imbianchin|verniciat|tintegg|cartongess|decorazion.*edil|facciat)/i.test(ctx)) {
    return 'Pittura & Imbiancatura';
  }
  // 2. Idraulici & Termoidraulica
  if (/(idraulic|plumb|sanitar|tubatur|riscaldament|caldai|pompa.*calor|termoidraulic)/i.test(ctx)) {
    return 'Idraulica & Termoidraulica';
  }
  // 3. Pulizie & Sanificazione & Multiservizi
  if (/(clean|puliz|sanific|disinfez|lavagg|vetri|multiserv|facility|sgomber|tsunami puliz)/i.test(ctx)) {
    return 'Pulizie & Multiservizi';
  }
  // 4. Edilizia & Ristrutturazioni
  if (/(edil|costruzion|ristruttur|murator|cantiere|paviment|piastrell|tetto|tetti|calcestruzz)/i.test(ctx)) {
    return 'Edilizia & Ristrutturazioni';
  }
  // 5. Elettricisti & Impianti Elettrici
  if (/(elettric|elettro|impiant.*elettric|fotovoltaic|domotic|antifurt|allarmi)/i.test(ctx)) {
    return 'Elettricisti & Impianti Elettrici';
  }
  // 6. Falegnameria & Serramenti
  if (/(falegnam|serrament|infiss|porte|finestr|persian|tapparell|legname)/i.test(ctx)) {
    return 'Falegnameria & Serramenti';
  }
  // 7. Fabbri & Carpenteria Metallica
  if (/(fabbr|ferro|carpenteri.*metallic|ringhier|cancell|serratur)/i.test(ctx)) {
    return 'Fabbri & Carpenteria Metallica';
  }
  // 8. Giardinaggio & Cura del Verde
  if (/(giardin|verde|potatur|alber|prat|paesaggist|irrigazion|sfalcio)/i.test(ctx)) {
    return 'Giardinaggio & Manutenzione Verde';
  }
  // 9. Climatizzazione & Riscaldamento
  if (/(climatizz|condizionat|aeraulic|ventilazion|pompe.*calore|clima)/i.test(ctx)) {
    return 'Climatizzazione & Riscaldamento';
  }
  // 10. Auto, Moto & Meccanica
  if (/(auto|moto|officin|meccanic|carrozzer|gommist|tagliand|veicol)/i.test(ctx)) {
    return 'Auto, Moto & Officine Meccaniche';
  }
  // 11. Studi Tecnici, Architetti & Geometri
  if (/(architett|geometr|ingegner|progettazion|studio.*tecnic|perizi|catast)/i.test(ctx)) {
    return 'Studi Tecnici, Architetti & Geometri';
  }
  // 12. Consulenza Fiscale, Fiduciaria & Legale
  if (/(fiduciar|commercialist|contabil|tributar|avvocat|consulenz.*fiscal|revision)/i.test(ctx)) {
    return 'Consulenza Aziendale, Fiscale & Fiduciaria';
  }
  // 13. Ristorazione, Bar & Catering
  if (/(ristorant|pizzeri|osteria|trattori|bar|bistrot|catering|gastronomi|pub|caffetteri)/i.test(ctx)) {
    return 'Ristorazione, Bar & Catering';
  }
  // 14. Parrucchieri & Centri Estetici
  if (/(parrucchier|barber|barbiere|coiffeur|hair|estetic|spa|unghie|solarium|massagg)/i.test(ctx)) {
    return 'Parrucchieri, Barbieri & Hair Salon';
  }
  // 15. Salute, Fisioterapia & Benessere
  if (/(fisioterapi|osteopat|dentist|odontoiatr|medic|policlinic|chiroprat)/i.test(ctx)) {
    return 'Salute, Fisioterapia & Poliambulatori';
  }
  // 16. Logistica & Traslochi
  if (/(trasloc|trasport|corrier|spedizion|logistic|magazzin)/i.test(ctx)) {
    return 'Logistica, Trasporti & Traslochi';
  }
  // 17. Alimentare & Enogastronomia
  if (/(honey|miele|alpi|food|cibo|vino|wine|olio|pasta|dolci|cioccolat|gourmet|caffè|caffe|bio|alimentar|panettone|formagg)/i.test(ctx)) {
    return 'Alimentare & Enogastronomia';
  }
  // 18. Casa, Decorazioni & Arte
  if (/(art|wall\s*art|stampe|poster|quadri|dipint|illustrazion|grafic|foto|decorazioni\s*casa)/i.test(ctx)) {
    return 'Casa, Decorazioni & Arte';
  }
  // 19. Editoria & Libri
  if (/(book|libri|editor|author|autore|guide|romanzo|kdp|racconti|fumetti|publishing)/i.test(ctx)) {
    return 'Editoria, Libri & Guide';
  }
  // 20. Moda & Accessori
  if (/(fashion|moda|accessori|borse|bags|abbigliamento|vestiti|scarpe|tessuti|sartoria|outfit|calzature|pelletteria)/i.test(ctx)) {
    return 'Moda, Abbigliamento & Accessori';
  }
  // 21. Gioielli & Bijoux
  if (/(gioiell|jewel|bijoux|anelli|collane|orecchini|bracciali|preziosi|gemme|orolog)/i.test(ctx)) {
    return 'Gioielli, Orologi & Bijoux';
  }
  // 22. Casa & Arredamento
  if (/(casa|home|arred|mobil|design|interior|lampade|candele|ceramica|cuscini)/i.test(ctx)) {
    return 'Casa, Arredamento & Design';
  }
  // 23. Bellezza & Cosmetica
  if (/(beauty|bellezza|cosmet|skincare|creme|saponi|make-?up|profum|cura\s*corpo)/i.test(ctx)) {
    return 'Bellezza & Cosmetica';
  }
  // 24. Artigianato & Fatto a Mano
  if (/(artigian|handmade|fatto\s*a\s*mano|cuoio|legno|laboratorio)/i.test(ctx)) {
    return 'Artigianato & Fatto a Mano';
  }
  // 25. Sport & Tempo Libero
  if (/(sport|fitness|outdoor|bici|bike|trekking|palestra|montagna|escursion)/i.test(ctx)) {
    return 'Sport & Tempo Libero';
  }
  // 26. Infanzia & Giocattoli
  if (/(kids|bambin|infanzia|giochi|giocattoli|puericultura|neonati)/i.test(ctx)) {
    return 'Infanzia & Giocattoli';
  }
  // 27. Animali & Pet Care
  if (/(pet|cani|gatti|animali|mangimi|accessori\s*animali)/i.test(ctx)) {
    return 'Animali & Pet Care';
  }

  if (cleanRaw && !['e-commerce', 'ecommerce', 'web', 'online', 'non specificato', 'generico'].includes(rawLower)) {
    return cleanRaw;
  }

  if (configDefault && configDefault.trim()) {
    return configDefault.trim();
  }

  return 'Servizi & Imprese Locali';
}
