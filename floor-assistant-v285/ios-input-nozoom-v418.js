/* V418: prevent iPhone Safari's automatic focus zoom on undersized form fields.
   Intentionally leaves viewport zoom/pinch accessibility unchanged. */
(()=>{
  'use strict';
  const ua=navigator.userAgent||'';
  const supported=/iPhone|iPod/.test(ua)&&/AppleWebKit/.test(ua);
  if(!supported){window.muyeIOSInputZoomV418={enabled:false};return;}
  const minFont=16;
  const selector='input:not([type="hidden"]):not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="image"]):not([type="file"]):not([type="color"]),textarea,select';
  let adjusted=0;
  function ensureSafeFont(el){
    if(!el||el.nodeType!==1||!el.matches(selector))return false;
    const size=parseFloat(getComputedStyle(el).fontSize);
    if(!Number.isFinite(size)||size>=minFont)return false;
    el.style.setProperty('font-size',minFont+'px','important');
    adjusted++;
    return true;
  }
  function scan(root){
    if(!root||![1,9,11].includes(root.nodeType))return;
    if(root.nodeType===1)ensureSafeFont(root);
    root.querySelectorAll?.(selector).forEach(ensureSafeFont);
  }
  function captureBeforeFocus(event){
    const el=event.target?.closest?.(selector);
    if(el)ensureSafeFont(el);
  }
  function start(){
    scan(document);
    const observer=new MutationObserver(records=>{
      for(const record of records){
        for(const node of record.addedNodes)scan(node);
      }
    });
    observer.observe(document.documentElement,{childList:true,subtree:true});
    // Handle CSS overrides applied between render and a tap; capture runs before Safari focuses the field.
    document.addEventListener('pointerdown',captureBeforeFocus,true);
    document.addEventListener('touchstart',captureBeforeFocus,{capture:true,passive:true});
    document.addEventListener('focusin',captureBeforeFocus,true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  window.muyeIOSInputZoomV418={enabled:true,status:()=>({minimumFontPx:minFont,adjusted}),rescan:()=>scan(document)};
})();
