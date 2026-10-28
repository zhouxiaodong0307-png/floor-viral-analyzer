(async()=>{
 const url='https://muye-guan-jia.onrender.com/?audit_v458='+Date.now();
 try{
  const r=await fetch(url,{headers:{'Cache-Control':'no-cache'}});
  const text=await r.text();
  const version=(text.match(/<meta name="app-version" content="([^"]+)"/)||[])[1];
  console.log('Production delivery:',JSON.stringify({status:r.status,meta:version,hasCompactCss:text.includes('<style id="v456-compact-measure-summary">'),cacheControl:r.headers.get('cache-control'),age:r.headers.get('age'),contentLength:text.length}));
 }catch(e){console.log('Production delivery diagnostic unavailable:',String(e.message||e))}
})();