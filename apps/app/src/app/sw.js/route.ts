export const dynamic = "force-dynamic";
export function GET() {
  const pwa = process.env.PWA_ENABLED === "true";
  const push = process.env.PUSH_ENABLED === "true";
  const source = `const PWA=${pwa};const PUSH=${push};
self.addEventListener('install',()=>{});
self.addEventListener('message',e=>{if(e.data?.type==='ACTIVATE_UPDATE')self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil((async()=>{if(!PWA&&!PUSH){await self.registration.unregister();return;}await self.clients.claim()})()));
self.addEventListener('fetch',e=>{if(!PWA||e.request.mode!=='navigate')return;e.respondWith(fetch(e.request).catch(()=>new Response('<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width"><title>Offline</title><h1>Sem conexão</h1><p>Reconecte para acessar seus dados. Nenhum conteúdo privado foi armazenado offline.</p></html>',{headers:{'Content-Type':'text/html; charset=utf-8'}})))});
self.addEventListener('push',e=>{if(!PUSH)return;let p;try{p=e.data.json()}catch{return}const url=typeof p.url==='string'&&p.url.startsWith('/')&&!p.url.startsWith('//')&&!p.url.includes('\\\\')?p.url:'/account';e.waitUntil(self.registration.showNotification(typeof p.title==='string'?p.title.slice(0,100):'Nova notificação',{body:typeof p.body==='string'?p.body.slice(0,200):'Abra o aplicativo para consultar.',tag:typeof p.id==='string'?p.id:undefined,data:{url}}))});
self.addEventListener('notificationclick',e=>{e.notification.close();const target=new URL(e.notification.data?.url||'/account',self.location.origin);if(target.origin!==self.location.origin)return;e.waitUntil((async()=>{const windows=await self.clients.matchAll({type:'window'});for(const client of windows){if(new URL(client.url).origin===target.origin){await client.navigate(target.href);return client.focus()}}return self.clients.openWindow(target.href)})())});`;
  return new Response(source, { headers: { "Content-Type": "application/javascript", "Cache-Control": "no-store", "Service-Worker-Allowed": "/" } });
}
