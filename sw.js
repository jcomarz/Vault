// App shell cache + Android share target. Shared videos are held in browser
// storage (never a gallery folder) until the vault is unlocked and you save them.
const CACHE='wg-v4';
const SHELL=['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).catch(()=>{}))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n.startsWith('wg-v')&&n!==CACHE).map(n=>caches.delete(n)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  if(e.request.method==='POST'&&url.pathname.endsWith('/share-target')){
    e.respondWith((async()=>{
      try{
        const fd=await e.request.formData();
        const files=fd.getAll('media').filter(f=>f&&f.size);
        const meta={title:fd.get('title')||'',text:fd.get('text')||'',url:fd.get('url')||''};
        const c=await caches.open('wg-share');const stamp=Date.now();
        for(let i=0;i<files.length;i++){const f=files[i];
          await c.put('in-'+stamp+'-'+i,new Response(f,{headers:{'Content-Type':f.type||'application/octet-stream','X-Name':encodeURIComponent(f.name||'')}}));}
        if(meta.url||/https?:\/\//.test(meta.text))await c.put('link-'+stamp,new Response(JSON.stringify(meta),{headers:{'Content-Type':'application/json'}}));
      }catch(err){}
      return Response.redirect('./index.html?shared=1',303);
    })());
    return;
  }
  if(e.request.method!=='GET'||url.origin!==location.origin)return;
  e.respondWith(fetch(e.request).then(r=>{if(r.ok){const cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp))}return r}).catch(()=>caches.match(e.request).then(m=>m||caches.match('./index.html'))));
});
