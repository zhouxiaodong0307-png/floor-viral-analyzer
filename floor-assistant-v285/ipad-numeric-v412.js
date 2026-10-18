/* V414: movable and resizable iPad touch numeric entry. iPhone native keypad and hardware keyboards stay native. */
(function(){
 'use strict';
 const ua=navigator.userAgent||'';
 const supported=(/iPad/i.test(ua)||(/Macintosh/i.test(ua)&&navigator.maxTouchPoints>1))&&/AppleWebKit/i.test(ua);
 if(!supported){window.muyeIPadNumericV412={enabled:false};return;}
 const selector='input[type="number"],input.mexpr,input.stair-platform,input.muye-spec-numeric,input#spec,input#aqSpec,input#cSpec,input#pSpec,input#costSpec,input#installEditSpec,input[data-field="spec"],input#installEditArea';
 let active=null, original=null, dirty=false;
 let lastPlacement=null,lastSize=null,dragging=null,resizing=null;
 const panel=document.createElement('section');
 panel.id='muye-ipad-numeric-v412';panel.hidden=true;
 panel.setAttribute('role','group');panel.setAttribute('aria-label','数字输入键盘');
 panel.innerHTML='<div class="muye-ipad-pad-head" title="按住标题区域拖动键盘"><span class="muye-ipad-pad-drag" tabindex="0" role="button" aria-label="拖动键盘位置，方向键可微调">数字输入</span><button type="button" data-action="system">系统键盘</button><button type="button" data-action="next">下一项</button><button type="button" class="done" data-action="done">完成</button></div>'+
 '<div class="muye-ipad-pad-keys">'+['1','2','3','4','5','6','7','8','9','.','0','⌫'].map(k=>'<button type="button" data-key="'+k+'" aria-label="'+(k==='⌫'?'删除上一位':k)+'">'+k+'</button>').join('')+'</div>'+
 '<div class="muye-ipad-pad-extras"><button type="button" data-key="×" class="symbol">×</button><button type="button" data-key="+" class="symbol">+</button><button type="button" data-key="−" class="negative">−</button><button type="button" data-action="clear" class="clear">清空</button></div>'+
 '<div class="muye-ipad-pad-resize" role="button" tabindex="0" aria-label="拖动右下角调整数字键盘大小，方向键微调" title="拖动调整键盘大小"></div>';
 document.body.appendChild(panel);
 const extraButtons=[...panel.querySelectorAll('.muye-ipad-pad-extras button')];
 const numericAttr=el=>el.matches(selector)&&el.type!=='hidden'&&!el.disabled&&(!el.readOnly||el===active)&&!el.closest('#muye-ipad-numeric-v412');
 function kind(el){
   if(el.matches('input.mexpr,input.stair-platform'))return 'expression';
   if(el.matches('input.muye-spec-numeric,input#spec,input#aqSpec,input#cSpec,input#pSpec,input#costSpec,input#installEditSpec,input[data-field="spec"]'))return 'spec';
   return 'number';
 }
 function configureExtras(el){
   const k=kind(el),min=el.getAttribute('min'),negative=(min==null||Number(min)<0);
   extraButtons[0].hidden=k==='number';extraButtons[1].hidden=k!=='expression';
   extraButtons[2].hidden=k!=='number'||!negative;
   panel.querySelector('.muye-ipad-pad-head>span').textContent=k==='expression'?'面积尺寸输入':k==='spec'?'规格数字输入':'数字输入';
 }
 /* Only the empty/header title region moves the panel. Key and toolbar button taps remain independent. */
 const dragHeader=panel.querySelector('.muye-ipad-pad-head');
 const dragHandle=dragHeader.querySelector('.muye-ipad-pad-drag');
 function viewportLimits(){
   const v=window.visualViewport;
   return {left:v?v.offsetLeft:0,top:v?v.offsetTop:0,
     width:v?v.width:window.innerWidth,height:v?v.height:window.innerHeight};
 }
 function movePanel(left,top){
   if(panel.hidden)return;
   const v=viewportLimits(),rect=panel.getBoundingClientRect(),margin=7;
   const lowX=v.left+margin,highX=Math.max(lowX,v.left+v.width-rect.width-margin);
   const lowY=v.top+margin,highY=Math.max(lowY,v.top+v.height-rect.height-margin);
   const x=Math.max(lowX,Math.min(highX,left)),y=Math.max(lowY,Math.min(highY,top));
   panel.style.left=x+'px';panel.style.top=y+'px';
   panel.style.bottom='auto';panel.style.transform='none';
   lastPlacement={left:x,top:y};
 }
 dragHeader.addEventListener('pointerdown',event=>{
   if(event.target.closest('button')||panel.hidden)return;
   if(event.pointerType==='mouse'&&event.button!==0)return;
   const rect=panel.getBoundingClientRect();
   dragging={id:event.pointerId,startX:event.clientX,startY:event.clientY,left:rect.left,top:rect.top};
   event.preventDefault();
   try{dragHeader.setPointerCapture(event.pointerId)}catch(_){}
 },{passive:false});
 dragHeader.addEventListener('pointermove',event=>{
   if(!dragging||dragging.id!==event.pointerId)return;
   event.preventDefault();
   movePanel(dragging.left+event.clientX-dragging.startX,
             dragging.top+event.clientY-dragging.startY);
 },{passive:false});
 function stopDrag(event){
   if(!dragging||dragging.id!==event.pointerId)return;
   dragging=null;saveLayout();
   try{if(dragHeader.hasPointerCapture(event.pointerId))dragHeader.releasePointerCapture(event.pointerId)}catch(_){}
 }
 dragHeader.addEventListener('pointerup',stopDrag);
 dragHeader.addEventListener('pointercancel',stopDrag);
 dragHeader.addEventListener('lostpointercapture',event=>{if(dragging?.id===event.pointerId){dragging=null;saveLayout()}});
 dragHandle.addEventListener('keydown',event=>{
   const increments={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
   const delta=increments[event.key];
   if(!delta||panel.hidden)return;
   event.preventDefault();event.stopPropagation();
   const rect=panel.getBoundingClientRect(),step=event.shiftKey?48:16;
   movePanel(rect.left+delta[0]*step,rect.top+delta[1]*step);
   saveLayout();
 });
 function keepPanelOnScreen(){
   if(panel.hidden)return;
   if(lastSize){const rect=panel.getBoundingClientRect();resizePanel(lastSize.width,lastSize.height,lastPlacement?.left??rect.left,lastPlacement?.top??rect.top);}
   else if(lastPlacement)movePanel(lastPlacement.left,lastPlacement.top);
 }
 window.addEventListener('resize',keepPanelOnScreen);
 window.visualViewport?.addEventListener('resize',keepPanelOnScreen);
 window.visualViewport?.addEventListener('scroll',keepPanelOnScreen);
 /* V414: size and position are local presentation preferences, not order or cloud data. */
 const resizeHandle=panel.querySelector('.muye-ipad-pad-resize');
 const sizeKey='muye-ipad-keypad-layout-v414';
 function getSavedLayout(){
   try{
     const v=JSON.parse(localStorage.getItem(sizeKey)||'null');
     if(v&&Number.isFinite(v.width)&&Number.isFinite(v.height)&&Number.isFinite(v.left)&&Number.isFinite(v.top)){
       lastSize={width:v.width,height:v.height};lastPlacement={left:v.left,top:v.top};
     }
   }catch(_){}
 }
 function saveLayout(){
   if(!lastPlacement&&!lastSize)return;
   const r=panel.getBoundingClientRect();
   try{localStorage.setItem(sizeKey,JSON.stringify({left:r.left,top:r.top,width:r.width,height:r.height}))}catch(_){}
 }
 function sizeBounds(){
   const v=viewportLimits();
   const maxW=Math.max(0,v.width-14),maxH=Math.max(0,v.height-14);
   return {minW:Math.min(355,maxW),minH:Math.min(315,maxH),maxW,maxH};
 }
 function resizePanel(width,height,left,top){
   if(panel.hidden)return;
   const b=sizeBounds();
   const w=Math.round(Math.max(b.minW,Math.min(b.maxW,width)));
   const h=Math.round(Math.max(b.minH,Math.min(b.maxH,height)));
   panel.style.width=w+'px';panel.style.height=h+'px';
   lastSize={width:w,height:h};
   movePanel(left??panel.getBoundingClientRect().left,top??panel.getBoundingClientRect().top);
 }
 getSavedLayout();
 resizeHandle.addEventListener('pointerdown',event=>{
   if(panel.hidden||event.pointerType==='mouse'&&event.button!==0)return;
   const rect=panel.getBoundingClientRect();
   resizing={id:event.pointerId,startX:event.clientX,startY:event.clientY,
     width:rect.width,height:rect.height,left:rect.left,top:rect.top};
   event.preventDefault();event.stopPropagation();
   try{resizeHandle.setPointerCapture(event.pointerId)}catch(_){}
 },{passive:false});
 resizeHandle.addEventListener('pointermove',event=>{
   if(!resizing||event.pointerId!==resizing.id)return;
   event.preventDefault();
   resizePanel(resizing.width+event.clientX-resizing.startX,
     resizing.height+event.clientY-resizing.startY,resizing.left,resizing.top);
 },{passive:false});
 function stopResize(event){
   if(!resizing||resizing.id!==event.pointerId)return;
   resizing=null;saveLayout();
   try{if(resizeHandle.hasPointerCapture(event.pointerId))resizeHandle.releasePointerCapture(event.pointerId)}catch(_){}
 }
 resizeHandle.addEventListener('pointerup',stopResize);
 resizeHandle.addEventListener('pointercancel',stopResize);
 resizeHandle.addEventListener('lostpointercapture',event=>{
   if(resizing?.id===event.pointerId){resizing=null;saveLayout();}
 });
 resizeHandle.addEventListener('keydown',event=>{
   const increments={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
   const delta=increments[event.key];if(!delta||panel.hidden)return;
   event.preventDefault();event.stopPropagation();
   const r=panel.getBoundingClientRect(),step=event.shiftKey?32:12;
   resizePanel(r.width+delta[0]*step,r.height+delta[1]*step,r.left,r.top);
   saveLayout();
 });
 function restore(){
   if(!active)return;
   const el=active,saved=original;
   active=null;original=null;
   // End editing before restoring type: decimal fragments are transient and must not be lost.
   let val=el.value;
   if(saved.type==='number'){
     if(val==='-'||val==='.'||val==='-.')val='';
     else if(/^-?\d+\.$/.test(val))val=val.slice(0,-1);
     el.value=val;
     el.type='number';
     // Safari may sanitize a number as the input type is restored.
     if(val!==el.value&&val!=='')el.value=String(Number(val));
   }
   el.readOnly=saved.readOnly;el.inputMode=saved.inputMode;
   el.classList.remove('muye-ipad-field-active');
   if(dirty)el.dispatchEvent(new Event('change',{bubbles:true}));
   dirty=false;
 }
 function close(){
   if(!active)return;
   const el=active;
   // Blur before removing readonly so WebKit cannot summon a second keyboard.
   try{el.blur()}catch(_){}
   restore();panel.hidden=true;
   document.body.classList.remove('muye-ipad-pad-visible');
 }
 function open(el){
   if(active===el)return;
   if(active)restore();
   if(!numericAttr(el))return;
   const saved={type:el.type,readOnly:el.readOnly,inputMode:el.inputMode,integer:el.type==='number'&&(el.getAttribute('step')==='1'||el.inputMode==='numeric')};
   active=el;original=saved;dirty=false;
   // iPadOS owns native keyboard layouts. Readonly-before-focus prevents its large QWERTY.
   el.readOnly=true;el.inputMode='none';
   if(saved.type==='number')el.type='text';
   el.classList.add('muye-ipad-field-active');
   configureExtras(el);
   panel.hidden=false;document.body.classList.add('muye-ipad-pad-visible');
   if(lastSize){const rect=panel.getBoundingClientRect();resizePanel(lastSize.width,lastSize.height,lastPlacement?.left??rect.left,lastPlacement?.top??rect.top);}
   else if(lastPlacement)movePanel(lastPlacement.left,lastPlacement.top);
   if(saved.type==='number'){
     requestAnimationFrame(()=>{
       if(active!==el)return;
       try{el.setSelectionRange(0,el.value.length)}catch(_){}
     });
   }
   try{el.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'})}catch(_){}
 }
 function edit(key){
   const el=active;if(!el||!el.isConnected){close();return;}
   let val=el.value;
   const k=kind(el);
   let start=0,end=val.length;
   try{start=el.selectionStart??val.length;end=el.selectionEnd??start}catch(_){}
   const insert=key==='−'?'-':key;
   if(key==='⌫'){
     if(start===end)start=Math.max(0,start-1);
     el.setRangeText('',start,end,'end');
   }else{
     if(insert==='.'&&(original?.integer||(val.includes('.')&&!val.slice(start,end).includes('.'))))return;
     if(insert==='-'&&(k!=='number'||start!==0||val.includes('-')))return;
     if(insert==='.'&&k==='number'&&start===0&&!val.startsWith('0')){el.setRangeText('0.',start,end,'end');}
     else el.setRangeText(insert,start,end,'end');
   }
   dirty=true;
   el.dispatchEvent(new Event('input',{bubbles:true}));
 }
 function goNext(){
   const all=[...document.querySelectorAll(selector)].filter(el=>numericAttr(el)&&el.getClientRects().length>0);
   const index=all.indexOf(active),next=all.slice(index+1)[0];
   if(!next){close();return;}
   // Existing rows and values remain untouched; only move the editing target.
   const previous=active;try{previous.blur()}catch(_){}
   restore();open(next);try{next.focus({preventScroll:true})}catch(_){}
 }
 panel.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'||e.pointerType==='pen')e.preventDefault()},{passive:false});
 let lastTouchAction=null;
 function activateButton(btn){
   if(btn.dataset.key)edit(btn.dataset.key);
   else if(btn.dataset.action==='clear'){if(active){active.value='';dirty=true;active.dispatchEvent(new Event('input',{bubbles:true}));}}
   else if(btn.dataset.action==='next')goNext();
   else if(btn.dataset.action==='done')close();
   else if(btn.dataset.action==='system'){
     const el=active;close();if(el)try{el.focus({preventScroll:true})}catch(_){}
   }
 }
 // iPad Safari can omit the compatibility click after a captured touch drag.
 // Pointer-up guarantees each touchscreen button gets exactly one action.
 panel.addEventListener('pointerup',e=>{
   if(e.pointerType!=='touch'&&e.pointerType!=='pen')return;
   const btn=e.target.closest('button');if(!btn||btn.hidden||btn.disabled)return;
   e.preventDefault();e.stopPropagation();
   lastTouchAction={btn,time:performance.now()};
   activateButton(btn);
 },{passive:false});
 panel.addEventListener('click',e=>{
   const btn=e.target.closest('button');if(!btn||btn.hidden||btn.disabled)return;
   e.preventDefault();e.stopPropagation();
   if(lastTouchAction?.btn===btn&&performance.now()-lastTouchAction.time<650)return;
   activateButton(btn);
 });
 document.addEventListener('pointerdown',e=>{
   if(e.pointerType!=='touch'&&e.pointerType!=='pen')return;
   if(panel.contains(e.target))return;
   const el=e.target.closest?.('input');
   if(el&&numericAttr(el))open(el);
   else if(active&&e.target.closest?.('.measure-inline-symbol,.muye-spec-x'))return;
   else if(active)close();
 },true);
 document.addEventListener('focusout',e=>{
   if(active===e.target)requestAnimationFrame(()=>{
     if(active===e.target&&document.activeElement!==active&&!panel.contains(document.activeElement))close();
   });
 },true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active){e.preventDefault();close();}},true);
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&active)close()});
 window.muyeIPadNumericV412={enabled:true,status:()=>({visible:!panel.hidden,field:active?.id||active?.className||null,movable:true,resizable:true,position:lastPlacement?{...lastPlacement}:null,size:lastSize?{...lastSize}:null}),dismiss:close};
})();
