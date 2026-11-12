/** Conservative checks for terms the equal-household payment engine cannot represent. */
export function unsupportedCommitmentTerms(pages:string[]):string[]{
 const text=pages.join(' ').replace(/\s+/g,' '),warnings:string[]=[];
 if(/household share.{0,40}(?:equals|is)\s*\d+(?:\.\d+)?%/i.test(text)&&/fund share.{0,40}(?:equals|is)\s*\d+(?:\.\d+)?%/i.test(text))warnings.push('This agreement splits payments between households and a separate community fund. Separate beneficiary allocations are not supported yet.');
 if(/(?:in proportion to|weighted by).{0,160}(?:area|survival|contribution)/i.test(text))warnings.push('Payments depend on verified area, survival or contribution. Equal household payments would not satisfy this agreement.');
 if(/(?:no later than|within)\s*\d+\s*calendar days after receipt/i.test(text))warnings.push('The payment deadline depends on the date sale proceeds clear. A reporting-period deadline cannot replace that deadline.');
 return warnings;
}
