import { Lead, ProductConfig } from '../types';

export function calculateLeadScore(lead: Lead, config: ProductConfig): { score: number; breakdown: Lead['scoreBreakdown'] } {
  if (lead.source === 'csv') {
    const isMajorCity = ['zürich', 'zurich', 'geneva', 'genève', 'basel', 'bern', 'lausanne', 'lugano'].some(c => lead.city?.toLowerCase().includes(c));
    const hasEmail = Boolean(lead.email);
    const lowerProduct = (config.productDescription + ' ' + config.productName + ' ' + config.offerType).toLowerCase();
    const hasKeyword = (lead.industry + ' ' + lead.shortNotes).toLowerCase().split(' ').some(w => w.length > 3 && lowerProduct.includes(w));

    const productScore = 20;
    const reviewScore = isMajorCity ? 20 : 10;
    const tenureScore = hasEmail ? 20 : 0;
    const needScore = hasKeyword ? 20 : 10;
    const keywordScore = 20;

    const score = Math.min(100, productScore + reviewScore + tenureScore + needScore + keywordScore);
    return {
      score,
      breakdown: { productScore, reviewScore, tenureScore, needScore, keywordScore }
    };
  } else {
    // Mock eCommerce / marketplace lead scoring
    const sig = lead.businessSignals;
    const productScore = sig.numProducts >= 50 ? 30 : Math.floor((sig.numProducts / 50) * 30);
    const reviewScore = sig.numReviews >= 20 ? 20 : Math.floor((sig.numReviews / 20) * 20);
    const tenureScore = sig.monthsActive >= 6 ? 20 : Math.floor((sig.monthsActive / 6) * 20);
    const needScore = lead.hasNeedSignal ? 20 : 5;
    
    const lowerDesc = config.productDescription.toLowerCase();
    const hasKeyword = lowerDesc.includes('seo') || lowerDesc.includes('convert') || lowerDesc.includes('ai') || lowerDesc.includes('market') || lowerDesc.includes('lead') || lowerDesc.includes('sales');
    const keywordScore = hasKeyword ? 10 : 5;

    const score = Math.min(100, Math.max(15, productScore + reviewScore + tenureScore + needScore + keywordScore));
    return {
      score,
      breakdown: { productScore, reviewScore, tenureScore, needScore, keywordScore }
    };
  }
}
