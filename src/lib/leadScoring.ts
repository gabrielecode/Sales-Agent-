import { Lead, ProductConfig } from '../types';

export function calculateLeadScore(lead: Partial<Lead>, config: ProductConfig): { score: number; breakdown: Lead['scoreBreakdown'] } {
  if (lead.source === 'csv') {
    const industryScore = 20;
    const cityScore = lead.city && ['zürich', 'zurich', 'geneva', 'genève', 'basel', 'bern', 'lausanne', 'lugano'].some(c => lead.city?.toLowerCase().includes(c)) ? 20 : 10;
    const emailScore = lead.email ? 20 : 0;
    const lowerProduct = (config.productDescription + ' ' + config.productName).toLowerCase();
    const hasKeyword = ((lead.industry || '') + ' ' + (lead.shortNotes || '')).toLowerCase().split(' ').some((w: string) => w.length > 3 && lowerProduct.includes(w));
    const keywordScore = hasKeyword ? 20 : 10;
    const baseScore = 20;

    const score = Math.min(100, industryScore + cityScore + emailScore + keywordScore + baseScore);
    return {
      score,
      breakdown: {
        productScore: industryScore,
        reviewScore: cityScore,
        tenureScore: emailScore,
        needScore: keywordScore,
        keywordScore: baseScore,
      }
    };
  } else {
    const numProducts = lead.businessSignals?.numProducts || 10;
    const numReviews = lead.businessSignals?.numReviews || 5;
    const monthsActive = lead.businessSignals?.monthsActive || 6;
    const hasNeed = lead.hasNeedSignal || false;

    let productScore = numProducts >= 50 ? 30 : Math.floor((numProducts / 50) * 30);
    let reviewScore = numReviews >= 20 ? 20 : Math.floor((numReviews / 20) * 20);
    let tenureScore = monthsActive >= 6 ? 20 : Math.floor((monthsActive / 6) * 20);
    let needScore = hasNeed ? 20 : 0;
    
    const lowerDesc = config.productDescription.toLowerCase();
    const hasKeyword = lowerDesc.includes('seo') || lowerDesc.includes('convert') || lowerDesc.includes('ai') || lowerDesc.includes('market') || lowerDesc.includes('email');
    let keywordScore = hasKeyword ? 10 : 5;

    const score = Math.min(100, Math.max(15, productScore + reviewScore + tenureScore + needScore + keywordScore));
    return {
      score,
      breakdown: {
        productScore,
        reviewScore,
        tenureScore,
        needScore,
        keywordScore,
      }
    };
  }
}
