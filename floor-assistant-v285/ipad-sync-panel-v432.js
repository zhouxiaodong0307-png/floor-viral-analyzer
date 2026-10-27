/* V432 — iPad sync popover viewport containment. Layout only, no cloud business changes. */
(()=>{
 'use strict';
 const init=()=>{
  const details=document.getElementById('dataSyncPanel');
  const popup=details?.querySelector('.data-sync-popover');
  if(!details||!popup)return;
  const ipad=window.matchMedia('(min-width:700px) and (max-width:1400px) and (any-pointer:coarse)');
  const props=['left','right','width','max-width','box-sizing'];
  const reset=()=>props.forEach(k=>popup.style.removeProperty(k));
  const layout=()=>{
   if(!details.open||!ipad.matches){reset();return}
   const view=window.visualViewport;
   const viewportLeft=Math.max(0,view?.offsetLeft||0);
   const viewportWidth=Math.min(document.documentElement.clientWidth||window.innerWidth,view?.width||window.innerWidth);
   if(!Number.isFinite(viewportWidth)||viewportWidth<=24)return;
   const gutter=12;
   const width=Math.min(740,viewportWidth-2*gutter);
   const anchor=details.getBoundingClientRect();
   // Keep its right edge near the status control unless that would clip the left edge.
   const left=Math.max(viewportLeft+gutter,Math.min(anchor.right-width,viewportLeft+viewportWidth-gutter-width));
   // Position absolute within the existing details element, without relocating its content.
   popup.style.setProperty('box-sizing','border-box','important');
   popup.style.setProperty('width',width+'px','important');
   popup.style.setProperty('max-width',width+'px','important');
   popup.style.setProperty('left',(left-anchor.left)+'px','important');
   popup.style.setProperty('right','auto','important');
  };
  details.addEventListener('toggle',layout);
  details.querySelector('summary')?.addEventListener('click',()=>requestAnimationFrame(layout));
  window.addEventListener('resize',layout,{passive:true});
  window.addEventListener('orientationchange',layout,{passive:true});
  window.visualViewport?.addEventListener('resize',layout,{passive:true});
  window.visualViewport?.addEventListener('scroll',layout,{passive:true});
  window.muyeIPadSyncPanelV432={layout,status:()=>({enabled:true,active:details.open&&ipad.matches})};
  if(details.open)layout();
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
