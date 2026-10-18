/* V417: per-orientation layout, stable floating position, repeated backspace, overflow caret and format hints. */
(function(){
 'use strict';
 const ua=navigator.userAgent||'';
 const supported=(/iPad/i.test(ua)||(/Macintosh/i.test(ua)&&navigator.maxTouchPoints>1))&&/AppleWebKit/i.test(ua);
 if(!supported){window.muyeIPadNumericV412={enabled:false};return;}
 const selector='input[type="number"],input.mexpr,input.stair-platform,input.muye-spec-numeric,input#spec,input#aqSpec,input#cSpec,input#pSpec,input#costSpec,input#installEditSpec,input[data-field="spec"],input#installEditArea';
 let active=null, original=null, dirty=false, clearUndo=null;
 let lastPlacement=null,lastSize=null,dragging=null,resizing=null;
 let screenMode=window.innerWidth>window.innerHeight?'landscape':'portrait';
 let layoutPrefs={portrait:null,landscape:null},layoutFrame=0;
 const panel=document.createElement('section');
 panel.id='muye-ipad-numeric-v412';panel.hidden=true;
 panel.setAttribute('role','group');panel.setAttribute('aria-label','数字输入键盘');
 panel.innerHTML='<div class="muye-ipad-pad-head" title="按住标题区域拖动键盘"><span class="muye-ipad-pad-drag" tabindex="0" role="button" aria-label="拖动键盘位置，方向键可微调">数字输入</span><button type="button" data-action="system">系统键盘</button><button type="button" data-action="next">下一项</button><button type="button" class="done" data-action="done">完成</button></div>'+
 '<div class="muye-ipad-pad-keys">'+['1','2','3','4','5','6','7','8','9','.','0','⌫'].map(k=>'<button type="button" data-key="'+k+'" aria-label="'+(k==='⌫'?'删除上一位':k)+'">'+k+'</button>').join('')+'</div>'+
 '<div class="muye-ipad-pad-extras"><button type="button" data-key="×" class="symbol">×</button><button type="button" data-key="+" class="symbol">+</button><button type="button" data-key="−" class="negative">−</button><button type="button" data-action="clear" class="clear">清空</button></div>'+
 '<div class="muye-ipad-format-hint" role="status" aria-live="polite" hidden></div>'+ 
 '<div class="muye-ipad-pad-resize" role="button" tabindex="0" aria-label="拖动右下角调整数字键盘大小，方向键微调" title="拖动调整键盘大小"></div>';
 document.body.appendChild(panel);
 const extraButtons=[...panel.querySelectorAll('.muye-ipad-pad-extras button')];
 const clearButton=panel.querySelector('[data-action="clear"]');
 const formatHint=panel.querySelector('.muye-ipad-format-hint');
 function resetClearUndo(){
   clearUndo=null;clearButton.textContent='清空';clearButton.setAttribute('aria-label','清空当前输入');
 }
 const numericAttr=el=>el.matches(selector)&&el.type!=='hidden'&&!el.disabled&&(!el.readOnly||el===active)&&!el.closest('#muye-ipad-numeric-v412');
 function kind(el){
   if(el.matches('input.mexpr,input.stair-platform'))return 'expression';
   if(el.matches('input.muye-spec-numeric,input#spec,input#aqSpec,input#cSpec,input#pSpec,input#costSpec,input#installEditSpec,input[data-field="spec"]'))return 'spec';
   return 'number';
 }
 function formatIssue(el,finished=false){
   if(!el||kind(el)==='number')return '';
   const value=(el.value||'').trim().replace(/\s/g,'').replace(/[xX*]/g,'×');
   if(!value)return '';
   if(/[+×]{2,}/.test(value))return '连续符号，请检查';
   if(/^[+×]/.test(value))return '开头需要数字';
   if(value.split(/[+×]/).some(chunk=>(chunk.match(/\./g)||[]).length>1))return '一个数字只能输入一个小数点';
   if(finished&&/[+×]$/.test(value))return '末尾还缺少数字';
   return '';
 }
 function updateFormatHint(finished=false){
   const issue=formatIssue(active,finished);
   formatHint.textContent=issue;
   formatHint.hidden=!issue;
 }
 function configureExtras(el){
   const k=kind(el),min=el.getAttribute('min'),negative=(min==null||Number(min)<0);
   extraButtons[0].hidden=k==='number';extraButtons[1].hidden=k!=='expression';
   extraButtons[2].hidden=k!=='number'||!negative;
   panel.querySelector('.muye-ipad-pad-head>span').textContent=k==='expression'?'面积尺寸输入':k==='spec'?'规格数字输入':'数字输入';
   updateFormatHint();
 }
 /* Only the empty/header title region moves the panel. Key and toolbar button taps remain independent. */
 const dragHeader=panel.querySelector('.muye-ipad-pad-head');
 const dragHandle=dragHeader.querySelector('.muye-ipad-pad-drag');
 function viewportLimits(){
   const v=window.visualViewport;
   return {left:v?v.offsetLeft:0,top:v?v.offsetTop:0,
     width:v?v.width:window.innerWidth,height:v?v.height:window.innerHeight};
 }
 function movePanel(left,top,remember=true){
   if(panel.hidden)return;
   const v=viewportLimits(),rect=panel.getBoundingClientRect(),margin=7;
   const lowX=v.left+margin,highX=Math.max(lowX,v.left+v.width-rect.width-margin);
   const lowY=v.top+margin,highY=Math.max(lowY,v.top+v.height-rect.height-margin);
   const x=Math.max(lowX,Math.min(highX,left)),y=Math.max(lowY,Math.min(highY,top));
   panel.style.left=x+'px';panel.style.top=y+'px';
   panel.style.bottom='auto';panel.style.transform='none';
   if(remember)lastPlacement={left:x,top:y};
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
 function orientationMode(){return window.innerWidth>window.innerHeight?'landscape':'portrait'}
 function applyLayout(){
   const pref=layoutPrefs[screenMode];
   lastPlacement=pref?{left:pref.left,top:pref.top}:null;
   lastSize=pref?{width:pref.width,height:pref.height}:null;
   for(const p of ['left','top','bottom','transform','width','height'])panel.style.removeProperty(p);
   if(!panel.hidden&&pref)resizePanel(pref.width,pref.height,pref.left,pref.top,false);
 }
 function keepPanelOnScreen(){
   if(panel.hidden||layoutFrame)return;
   layoutFrame=requestAnimationFrame(()=>{
     layoutFrame=0;
     if(panel.hidden||dragging||resizing)return;
     const mode=orientationMode();
     if(mode!==screenMode){screenMode=mode;applyLayout();}
     else {
       const r=panel.getBoundingClientRect(),b=sizeBounds();
       if(r.width>b.maxW+1||r.height>b.maxH+1)resizePanel(r.width,r.height,r.left,r.top,false);
       else movePanel(r.left,r.top,false);
     }
     if(active)ensureFieldUncovered(active);
   });
 }
 window.addEventListener('resize',keepPanelOnScreen);
 window.visualViewport?.addEventListener('resize',keepPanelOnScreen);
 window.visualViewport?.addEventListener('scroll',keepPanelOnScreen);
 /* V414: size and position are local presentation preferences, not order or cloud data. */
 const resizeHandle=panel.querySelector('.muye-ipad-pad-resize');
 const sizeKey='muye-ipad-keypad-layout-v417',legacySizeKey='muye-ipad-keypad-layout-v414';
 function validLayout(v){return v&&['width','height','left','top'].every(k=>Number.isFinite(v[k]))}
 function getSavedLayout(){
   try{
     const v=JSON.parse(localStorage.getItem(sizeKey)||'null');
     if(v&&typeof v==='object'){
       for(const mode of ['portrait','landscape'])if(validLayout(v[mode]))layoutPrefs[mode]={...v[mode]};
     }else{
       const legacy=JSON.parse(localStorage.getItem(legacySizeKey)||'null');
       if(validLayout(legacy))layoutPrefs[screenMode]={...legacy};
     }
   }catch(_){}
   const p=layoutPrefs[screenMode];
   lastSize=p?{width:p.width,height:p.height}:null;
   lastPlacement=p?{left:p.left,top:p.top}:null;
 }
 function saveLayout(){
   if(panel.hidden)return;
   const r=panel.getBoundingClientRect();
   const value={left:r.left,top:r.top,width:r.width,height:r.height};
   layoutPrefs[screenMode]={...value};
   lastSize={width:value.width,height:value.height};
   lastPlacement={left:value.left,top:value.top};
   try{localStorage.setItem(sizeKey,JSON.stringify(layoutPrefs))}catch(_){}
 }
 function sizeBounds(){
   const v=viewportLimits();
   const maxW=Math.max(0,v.width-14),maxH=Math.max(0,v.height-14);
   return {minW:Math.min(445,maxW),minH:Math.min(480,maxH),maxW,maxH};
 }
 function resizePanel(width,height,left,top,remember=true){
   if(panel.hidden)return;
   const b=sizeBounds();
   const w=Math.round(Math.max(b.minW,Math.min(b.maxW,width)));
   const h=Math.round(Math.max(b.minH,Math.min(b.maxH,height)));
   panel.style.width=w+'px';panel.style.height=h+'px';
   if(remember)lastSize={width:w,height:h};
   movePanel(left??panel.getBoundingClientRect().left,top??panel.getBoundingClientRect().top,remember);
 }

 // Keep the edited field visible without permanently changing the user's saved keyboard placement.
 function rectanglesOverlap(a,b){
   return a.left<b.right-3&&a.right>b.left+3&&a.top<b.bottom-3&&a.bottom>b.top+3;
 }
 function scrollFieldBy(el,delta){
   let parent=el.parentElement;
   while(parent&&parent!==document.body){
     const style=getComputedStyle(parent);
     if(/auto|scroll/.test(style.overflowY||'')&&parent.scrollHeight>parent.clientHeight+4){
       const before=parent.scrollTop;parent.scrollTop+=delta;
       return Math.abs(parent.scrollTop-before)>1;
     }
     parent=parent.parentElement;
   }
   const before=window.scrollY;
   window.scrollBy({top:delta,behavior:'instant'});
   return Math.abs(window.scrollY-before)>1;
 }
 function temporarilyPlacePanel(x,y){movePanel(x,y,false)}
 function ensureFieldUncovered(el){
   requestAnimationFrame(()=>{
     if(el!==active||panel.hidden||!el.isConnected)return;
     let field=el.getBoundingClientRect(),pad=panel.getBoundingClientRect();
     if(!rectanglesOverlap(field,pad))return;
     const viewport=viewportLimits(),edge=viewport.top+viewport.height;
     const up=field.bottom-pad.top+14,down=pad.bottom-field.top+14;
     let moved=false;
     if(pad.top-viewport.top>field.height+22)moved=scrollFieldBy(el,up);
     else if(edge-pad.bottom>field.height+22)moved=scrollFieldBy(el,-down);
     // Scrolling can be blocked by a modal or the bottom of a page; then reposition the keyboard.
     requestAnimationFrame(()=>{
       if(el!==active||panel.hidden)return;
       field=el.getBoundingClientRect();pad=panel.getBoundingClientRect();
       if(!rectanglesOverlap(field,pad)){scheduleCaret();return;}
       const v=viewportLimits(),m=8;
       const candidates=[
         {left:pad.left,top:field.bottom+14},
         {left:pad.left,top:field.top-pad.height-14},
         {left:field.right+14,top:pad.top},
         {left:field.left-pad.width-14,top:pad.top},
         {left:v.left+m,top:v.top+m},
         {left:v.left+v.width-pad.width-m,top:v.top+v.height-pad.height-m}
       ].filter(p=>p.left>=v.left+m&&p.top>=v.top+m&&p.left+pad.width<=v.left+v.width-m&&p.top+pad.height<=v.top+v.height-m)
        .filter(p=>!rectanglesOverlap(field,{left:p.left,top:p.top,right:p.left+pad.width,bottom:p.top+pad.height}))
        .sort((a,b)=>(Math.abs(a.left-pad.left)+Math.abs(a.top-pad.top))-(Math.abs(b.left-pad.left)+Math.abs(b.top-pad.top)));
       if(candidates.length)temporarilyPlacePanel(candidates[0].left,candidates[0].top);
       else if(!moved)try{el.scrollIntoView({block:'start',inline:'nearest',behavior:'instant'})}catch(_){}
       scheduleCaret();
     });
   });
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
 /* Safari hides its native caret in readonly fields. Draw a selection-aware caret instead. */
 const caret=document.createElement('span');
 caret.id='muye-ipad-caret-v415';caret.hidden=true;caret.setAttribute('aria-hidden','true');
 document.body.appendChild(caret);
 const canvas=document.createElement('canvas'),measure=canvas.getContext('2d');
 function textGeometry(el,style){
   measure.font=style.font||style.fontSize+' '+style.fontFamily;
   const padL=parseFloat(style.paddingLeft)||0,padR=parseFloat(style.paddingRight)||0;
   const rect=el.getBoundingClientRect(),total=measure.measureText(el.value||'').width;
   const inner=Math.max(1,rect.width-padL-padR);
   let lead=padL;
   if(total<=inner){
     if(style.textAlign==='right'||style.textAlign==='end')lead=rect.width-padR-total;
     else if(style.textAlign==='center')lead=padL+(inner-total)/2;
   }
   return {rect,padL,padR,lead,inner};
 }
 function revealCaret(el,prefix,g){
   const near=g.padL+5,far=g.rect.width-g.padR-5;
   const screenPos=g.lead+prefix-(el.scrollLeft||0);
   if(screenPos>far)el.scrollLeft=(el.scrollLeft||0)+(screenPos-far);
   else if(screenPos<near)el.scrollLeft=Math.max(0,(el.scrollLeft||0)-(near-screenPos));
 }
 let caretFrame=0;
 function updateCaret(){
   caretFrame=0;
   const el=active;
   if(!el||!el.isConnected||panel.hidden){caret.hidden=true;return;}
   const style=getComputedStyle(el),g=textGeometry(el,style),rect=g.rect;
   if(!rect.width||!rect.height||rect.bottom<0||rect.top>innerHeight){caret.hidden=true;return;}
   const selection=typeof el.selectionStart==='number'?el.selectionStart:el.value.length;
   const text=el.value||'',index=Math.min(Math.max(0,selection),text.length);
   const prefix=measure.measureText(text.slice(0,index)).width;
   revealCaret(el,prefix,g);
   const left=rect.left+g.lead+prefix-(el.scrollLeft||0);
   const size=Math.max(13,parseFloat(style.fontSize)||16);
   caret.style.left=Math.max(rect.left+g.padL,Math.min(rect.right-g.padR-2,left))+'px';
   caret.style.top=(rect.top+(rect.height-size*1.18)/2)+'px';
   caret.style.height=Math.min(size*1.18,rect.height-6)+'px';
   caret.hidden=false;
 }
 function scheduleCaret(){
   if(caretFrame)cancelAnimationFrame(caretFrame);
   caretFrame=requestAnimationFrame(updateCaret);
 }
 document.addEventListener('selectionchange',()=>{if(active)scheduleCaret()});
 document.addEventListener('scroll',()=>{if(active)scheduleCaret()},true);
 window.addEventListener('resize',scheduleCaret);
 window.visualViewport?.addEventListener('resize',scheduleCaret);
 window.visualViewport?.addEventListener('scroll',scheduleCaret);
 function restore(){
   if(!active)return;
   resetClearUndo();
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
   for(const p of ['outline','outline-offset','box-shadow']){
     const item=saved.activeStyles?.[p];
     if(item?.value)el.style.setProperty(p,item.value,item.priority);
     else el.style.removeProperty(p);
   }
   caret.hidden=true;
   if(dirty)el.dispatchEvent(new Event('change',{bubbles:true}));
   dirty=false;
 }
 function close(){
   if(!active)return;
   stopBackspaceHold();
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
   const wasOpen=!panel.hidden;
   const mode=orientationMode();
   if(mode!==screenMode){screenMode=mode;const p=layoutPrefs[screenMode];lastPlacement=p?{left:p.left,top:p.top}:null;lastSize=p?{width:p.width,height:p.height}:null;}
   const saved={type:el.type,readOnly:el.readOnly,inputMode:el.inputMode,integer:el.type==='number'&&(el.getAttribute('step')==='1'||el.inputMode==='numeric')};
   active=el;original=saved;dirty=false;resetClearUndo();
   // iPadOS owns native keyboard layouts. Readonly-before-focus prevents its large QWERTY.
   el.readOnly=true;el.inputMode='none';
   if(saved.type==='number')el.type='text';
   el.classList.add('muye-ipad-field-active');
   saved.activeStyles=Object.fromEntries(['outline','outline-offset','box-shadow'].map(p=>[p,{value:el.style.getPropertyValue(p),priority:el.style.getPropertyPriority(p)}]));
   el.style.setProperty('outline','2px solid #007aff','important');
   el.style.setProperty('outline-offset','-2px','important');
   el.style.setProperty('box-shadow','0 0 0 3px rgba(0,119,255,.15)','important');
   configureExtras(el);
   panel.hidden=false;document.body.classList.add('muye-ipad-pad-visible');
   if(!wasOpen)applyLayout();
   if(saved.type==='number'){
     requestAnimationFrame(()=>{
       if(active!==el)return;
       try{el.setSelectionRange(0,el.value.length)}catch(_){}
     });
   }
   try{el.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'})}catch(_){}
   // Keep readonly input without forced iPadOS focus; draw a virtual caret instead.
   scheduleCaret();ensureFieldUncovered(el);
 }
 function canInsertDecimal(el,val,start,end,k){
   if(original?.integer)return false;
   if(k==='number')return !(val.slice(0,start)+val.slice(end)).includes('.');
   const left=val.slice(0,start).split(/[+×xX*]/).pop();
   const right=val.slice(end).split(/[+×xX*]/)[0];
   return !(left+right).includes('.');
 }
 function edit(key){
   const el=active;if(!el||!el.isConnected){close();return;}
   resetClearUndo();
   let val=el.value;
   const k=kind(el);
   let start=0,end=val.length;
   try{start=el.selectionStart??val.length;end=el.selectionEnd??start}catch(_){}
   const insert=key==='−'?'-':key;
   if(key==='⌫'){
     if(start===end)start=Math.max(0,start-1);
     el.setRangeText('',start,end,'end');
   }else{
     if(insert==='.'&&!canInsertDecimal(el,val,start,end,k))return;
     if(insert==='-'&&(k!=='number'||start!==0||val.includes('-')))return;
     if(insert==='.'&&k==='number'&&start===0&&!val.startsWith('0')){el.setRangeText('0.',start,end,'end');}
     else el.setRangeText(insert,start,end,'end');
   }
   dirty=true;
   el.dispatchEvent(new Event('input',{bubbles:true}));
   updateFormatHint();scheduleCaret();
 }
 function goNext(){
   if(!active)return;
   const scope=active.closest('.modal-sheet,.measure-card-v273,.quote-entry-shell,.all-products-editor,.order-detail-panel,.order-detail-modal,section')||document;
   const all=[...scope.querySelectorAll(selector)].filter(el=>{
     if(!numericAttr(el)||!el.getClientRects().length||el.closest('[hidden],[inert],[aria-hidden="true"],.hide'))return false;
     const style=getComputedStyle(el);
     return style.visibility!=='hidden'&&style.display!=='none';
   });
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
   else if(btn.dataset.action==='clear'){
     if(!active)return;
     if(clearUndo?.el===active){
       const prior=clearUndo;active.value=prior.value;
       try{active.setSelectionRange(prior.start,prior.end)}catch(_){}
       resetClearUndo();
     }else{
       if(active.value==='')return;
       clearUndo={el:active,value:active.value,
         start:typeof active.selectionStart==='number'?active.selectionStart:active.value.length,
         end:typeof active.selectionEnd==='number'?active.selectionEnd:active.value.length};
       active.value='';clearButton.textContent='撤销';clearButton.setAttribute('aria-label','撤销清空');
     }
     dirty=true;active.dispatchEvent(new Event('input',{bubbles:true}));updateFormatHint();scheduleCaret();
   }
   else if(btn.dataset.action==='next')goNext();
   else if(btn.dataset.action==='done')close();
   else if(btn.dataset.action==='system'){
     const el=active;close();if(el)try{el.focus({preventScroll:true})}catch(_){}
   }
 }
 // Hold backspace to repeat deletion; short taps still delete one character.
 let backspaceHold=null,lastRepeatedBackspace=null;
 function stopBackspaceHold(pointerId){
   if(!backspaceHold||(pointerId!=null&&backspaceHold.id!==pointerId))return false;
   const repeated=backspaceHold.repeated;
   clearTimeout(backspaceHold.delay);clearInterval(backspaceHold.interval);
   backspaceHold=null;
   return repeated;
 }
 panel.addEventListener('pointerdown',e=>{
   const btn=e.target.closest?.('button[data-key="⌫"]');
   if(!btn||panel.hidden)return;
   stopBackspaceHold();
   const hold={id:e.pointerId,btn,x:e.clientX,y:e.clientY,repeated:false,delay:null,interval:null};
   backspaceHold=hold;
   hold.delay=setTimeout(()=>{
     if(backspaceHold!==hold||!active)return;
     hold.repeated=true;edit('⌫');
     hold.interval=setInterval(()=>{if(backspaceHold===hold&&active)edit('⌫')},85);
   },410);
 },{passive:false});
 panel.addEventListener('pointermove',e=>{
   if(backspaceHold&&backspaceHold.id===e.pointerId&&
       Math.hypot(e.clientX-backspaceHold.x,e.clientY-backspaceHold.y)>28)
     stopBackspaceHold(e.pointerId);
 },{passive:false});
 panel.addEventListener('pointercancel',e=>stopBackspaceHold(e.pointerId));
 document.addEventListener('pointerup',e=>{
   if(backspaceHold&&backspaceHold.id===e.pointerId&&!panel.contains(e.target))
     stopBackspaceHold(e.pointerId);
 },true);
 // iPad Safari may omit compatibility clicks; touch pointer-up triggers one action.
 panel.addEventListener('pointerup',e=>{
   const btn=e.target.closest('button');
   const wasRepeated=stopBackspaceHold(e.pointerId);
   if(!btn||btn.hidden||btn.disabled)return;
   if(wasRepeated){
     lastRepeatedBackspace={btn,time:performance.now()};
     if(e.pointerType==='touch'||e.pointerType==='pen'){
       e.preventDefault();e.stopPropagation();
       lastTouchAction={btn,time:performance.now()};
     }
     return;
   }
   if(e.pointerType!=='touch'&&e.pointerType!=='pen')return;
   e.preventDefault();e.stopPropagation();
   lastTouchAction={btn,time:performance.now()};
   activateButton(btn);
 },{passive:false});
 panel.addEventListener('click',e=>{
   const btn=e.target.closest('button');if(!btn||btn.hidden||btn.disabled)return;
   e.preventDefault();e.stopPropagation();
   if(lastTouchAction?.btn===btn&&performance.now()-lastTouchAction.time<650)return;
   if(lastRepeatedBackspace?.btn===btn&&performance.now()-lastRepeatedBackspace.time<650)return;
   activateButton(btn);
 });
 // Tap a digit position inside a readonly input; Safari otherwise places the virtual caret at the end.
 function placeCaretAtX(el,x){
   if(el!==active||!el.isConnected)return;
   const val=el.value||'',style=getComputedStyle(el),g=textGeometry(el,style);
   const target=x-g.rect.left-g.lead+(el.scrollLeft||0);
   let best=0,distance=Infinity;
   for(let i=0;i<=val.length;i++){
     const d=Math.abs(measure.measureText(val.slice(0,i)).width-target);
     if(d<distance){distance=d;best=i;}
   }
   try{el.setSelectionRange(best,best)}catch(_){}
   scheduleCaret();
 }
 document.addEventListener('pointerup',e=>{
   const el=active;
   if(el&&e.target===el&&(e.pointerType==='touch'||e.pointerType==='pen')){
     const x=e.clientX;requestAnimationFrame(()=>placeCaretAtX(el,x));
   }
 },true);
 document.addEventListener('click',e=>{
   const el=active;
   if(el&&e.target===el&&e.detail===1){
     const x=e.clientX;requestAnimationFrame(()=>placeCaretAtX(el,x));
   }
 },true);
 // Double-tap a numeric component to replace only that part (e.g. 115 in 740×115×17).
 function selectNumberPart(el,x){
   placeCaretAtX(el,x);
   if(el!==active)return;
   const val=el.value||'',i=typeof el.selectionStart==='number'?el.selectionStart:0;
   let from=i,to=i;
   while(from>0&&/[0-9.]/.test(val[from-1]))from--;
   while(to<val.length&&/[0-9.]/.test(val[to]))to++;
   if(to>from){try{el.setSelectionRange(from,to)}catch(_){}scheduleCaret();}
 }
 document.addEventListener('dblclick',e=>{
   const el=active;
   if(el&&e.target===el){
     const x=e.clientX;requestAnimationFrame(()=>selectNumberPart(el,x));
   }
 },true);
 document.addEventListener('pointerdown',e=>{
   if(e.pointerType==='mouse'&&e.button!==0)return;
   if(panel.contains(e.target))return;
   const el=e.target.closest?.('input');
   if(el&&numericAttr(el))open(el);
   else if(active&&e.target.closest?.('.measure-inline-symbol,.muye-spec-x'))return;
   else if(active)close();
 },true);
 // V415: app-owned keyboard closes on outside pointer and Done, not WebKit's spurious readonly blur.
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active){e.preventDefault();close();}},true);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){stopBackspaceHold();if(active)close()}});
 document.addEventListener('input',e=>{if(active&&e.target===active)updateFormatHint()},true);
 window.muyeIPadNumericV412={enabled:true,status:()=>({visible:!panel.hidden,field:active?.id||active?.className||null,movable:true,resizable:true,orientation:screenMode,position:lastPlacement?{...lastPlacement}:null,size:lastSize?{...lastSize}:null}),dismiss:close};
})();
