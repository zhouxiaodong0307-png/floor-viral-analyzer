/* V476: read-only text summaries for intentionally filled floor/accessory entries. */
(function(){
 function init(){
  const quote=document.getElementById('quote');
  const shell=quote?.querySelector('.quote-entry-shell');
  const optional=quote?.querySelector('details.quote-entry-optional:not(.quote-compact-note)');
  const floorToggle=shell?.querySelector('.quote-entry-shell-toggle');
  const auxSummary=optional?.querySelector('summary');
  if(!shell||!optional||!floorToggle||!auxSummary||shell.dataset.v476Ready==='1')return;
  shell.dataset.v476Ready='1';
  const createStatus=()=>{
   const s=document.createElement('span');
   s.className='v476-step-status';s.hidden=true;s.setAttribute('aria-hidden','true');
   return s;
  };
  const floorStatus=createStatus(),auxStatus=createStatus();
  floorToggle.appendChild(floorStatus);
  const arrow=auxSummary.querySelector('.quote-aux-arrow');
  if(arrow)auxSummary.insertBefore(auxStatus,arrow);
  else auxSummary.appendChild(auxStatus);
  const id=name=>document.getElementById(name);
  const positive=value=>Math.max(0,Number(value)||0);
  const chosen=(species,spec,price)=>Boolean(String(species||'').trim()||String(spec||'').trim()||positive(price)>0);
  function refresh(){
   let count=0,area=0;
   if(chosen(id('species')?.value,id('spec')?.value,id('price')?.value))count++;
   quote.querySelectorAll('#quoteExtraProducts [data-quote-extra]').forEach(row=>{
    const v=k=>row.querySelector('[data-field="'+k+'"]')?.value;
    if(chosen(v('species'),v('spec'),v('price')))count++;
   });
   if(count && typeof collectQuoteProducts==='function'){
    collectQuoteProducts().forEach(p=>{
     if(chosen(p.species,p.spec,p.price))area+=positive(p.billArea);
    });
   }
   floorStatus.textContent=count?'已选 '+count+' 项'+(area>0?' · '+Number(area.toFixed(2))+'㎡':''):'';
   floorStatus.hidden=count===0;
   const qtyFields=['batten','skirt','material','freight','remove','quoteOtherFee'];
   const accessories=qtyFields.filter(k=>positive(id(k)?.value)>0).length;
   auxStatus.textContent=accessories?'已选 '+accessories+' 项':'';
   auxStatus.hidden=accessories===0;
  }
  let queued=false;
  function schedule(){
   if(queued)return;queued=true;
   requestAnimationFrame(()=>{queued=false;refresh()});
  }
  quote.addEventListener('input',schedule,true);
  quote.addEventListener('change',schedule,true);
  quote.addEventListener('click',schedule,true);
  optional.addEventListener('toggle',schedule);
  const extras=id('quoteExtraProducts');
  if(extras)new MutationObserver(schedule).observe(extras,{childList:true,subtree:true});
  ['quoteTotal','floorTotal','measureBill','quoteExtraSummary'].forEach(k=>{
   const n=id(k);if(n)new MutationObserver(schedule).observe(n,{childList:true,subtree:true});
  });
  window.addEventListener('pageshow',schedule,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
  schedule();
 }
 if(document.readyState!=='complete')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
