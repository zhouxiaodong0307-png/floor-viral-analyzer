/* V412: iPad touch numeric entry. iPhone native keypad and hardware keyboards stay native. */
(function(){
 'use strict';
 const ua=navigator.userAgent||'';
 const supported=(/iPad/i.test(ua)||(/Macintosh/i.test(ua)&&navigator.maxTouchPoints>1))&&/AppleWebKit/i.test(ua);
 if(!supported){window.muyeIPadNumericV412={enabled:false};return;}
 const selector='input[type="number"],input.mexpr,input.stair-platform,input.muye-spec-numeric,input#spec,input#aqSpec,input#cSpec,input#pSpec,input#costSpec,input#installEditSpec,input[data-field="spec"],input#installEditArea';
 let active=null, original=null, dirty=false;
 const panel=document.createElement('section');
 panel.id='muye-ipad-numeric-v412';panel.hidden=true;
 panel.setAttribute('role','group');panel.setAttribute('aria-label','数字输入键盘');
 panel.innerHTML='<div class="muye-ipad-pad-head"><span>数字输入</span><button type="button" data-action="system">系统键盘</button><button type="button" data-action="next">下一项</button><button type="button" class="done" data-action="done">完成</button></div>'+
 '<div class="muye-ipad-pad-keys">'+['1','2','3','4','5','6','7','8','9','.','0','⌫'].map(k=>'<button type="button" data-key="'+k+'" aria-label="'+(k==='⌫'?'删除上一位':k)+'">'+k+'</button>').join('')+'</div>'+
 '<div class="muye-ipad-pad-extras"><button type="button" data-key="×" class="symbol">×</button><button type="button" data-key="+" class="symbol">+</button><button type="button" data-key="−" class="negative">−</button><button type="button" data-action="clear" class="clear">清空</button></div>';
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
 panel.addEventListener('click',e=>{
   const btn=e.target.closest('button');if(!btn||btn.hidden)return;
   e.preventDefault();e.stopPropagation();
   if(btn.dataset.key)edit(btn.dataset.key);
   else if(btn.dataset.action==='clear'){if(active){active.value='';dirty=true;active.dispatchEvent(new Event('input',{bubbles:true}));}}
   else if(btn.dataset.action==='next')goNext();
   else if(btn.dataset.action==='done')close();
   else if(btn.dataset.action==='system'){
     const el=active;close();if(el)try{el.focus({preventScroll:true})}catch(_){}
   }
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
 window.muyeIPadNumericV412={enabled:true,status:()=>({visible:!panel.hidden,field:active?.id||active?.className||null}),dismiss:close};
})();
