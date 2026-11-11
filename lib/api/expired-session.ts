export function redirectExpiredSession(){
  if(typeof window==='undefined'||!/^\/(app|field|verifier|ops|admin|onboarding)(\/|$)/.test(window.location.pathname))return;
  window.location.replace('/signin?state=expired&next='+encodeURIComponent(window.location.pathname+window.location.search));
}
