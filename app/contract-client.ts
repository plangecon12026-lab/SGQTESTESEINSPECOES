export function browserContract(){return typeof window==='undefined'?'s11d':new URLSearchParams(window.location.search).get('contrato')||'s11d';}
export function contractURL(path:string,id=browserContract()){
 const url=new URL(path,window.location.href);
 if(url.origin===window.location.origin&&!url.searchParams.has('contrato'))url.searchParams.set('contrato',id);
 return url.href;
}
export function contractFetch(input:RequestInfo|URL,init?:RequestInit):Promise<Response>{
 if(typeof window==='undefined')return fetch(input,init);
 const original=input instanceof Request?input.url:String(input);const url=new URL(original,window.location.href);
 if(url.origin===window.location.origin&&url.pathname.startsWith('/api/')&&!url.searchParams.has('contrato'))url.searchParams.set('contrato',browserContract());
 return fetch(input instanceof Request?new Request(url,input):url,init);
}
function storageKey(key:string){const id=browserContract();return id==='s11d'?key:`contract:${id}:${key}`;}
export const contractStorage={getItem:(key:string)=>localStorage.getItem(storageKey(key)),setItem:(key:string,value:string)=>localStorage.setItem(storageKey(key),value)};
