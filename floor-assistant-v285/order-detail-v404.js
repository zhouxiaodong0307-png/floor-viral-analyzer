/* 木业管家 V406 · iOS-style order detail · view-only UI layer.
   Uses existing order business functions and stored order/measurement records. */
(function(){
 'use strict';
 if(window.muyeOrderDetailV404Ready)return;
 const state={id:null,tab:'items',expandedFloors:new Set(),menu:false};
 const root=document.createElement('div');
 root.id='muyeOrderDetailV404';root.className='muye404-root';root.setAttribute('aria-hidden','true');
 root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','订单详情');
 document.body.appendChild(root);
 let originalFocus=null;
 const E=x=>typeof escHtml==='function'?escHtml(String(x==null?'':x)):String(x==null?'':x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const N=x=>Number.isFinite(Number(x))?Number(x):0;
 const M=x=>money(N(x));
 const A=x=>N(x).toLocaleString('zh-CN',{maximumFractionDigits:2});
 const order=()=>typeof orders==='function'?orders().find(o=>String(o.id)===String(state.id)):null;
 const actualArea=o=>N(o.area)>0?N(o.area):normalizeOrderProducts(o).reduce((s,p)=>s+N(p.area),0);
 const priceInfo=o=>{const ps=normalizeOrderProducts(o),ss=normalizeSalesItems(o);return {ps,ss,floor:ps.reduce((n,p)=>n+N(p.subtotal),0),extra:ss.reduce((n,x)=>n+N(x.subtotal),0)};};
 const dateValue=x=>{if(!x)return'—';let v=String(x);return v.includes('T')?v.substring(0,16).replace('T',' '):v};
 const statusText=o=>typeof businessOrderStatus==='function'?businessOrderStatus(o).label:(isCompleted(o)?'已完成':'进行中');
 const cardTitle=s=>`<h3 class="m404-section-title">${s}</h3>`;
 const fieldForLabel=label=>({
 '产品金额':'product','其他销售项目':'sales','项目原价':'eSales','优惠金额':'eDiscount',
 '其他加价':'eSurcharge','最终成交额':'eSales','其他成交额调整':'eSales',
 '退板 / 退款':'refund','交货日期':'eDeliveryDue','交货状态':'eDeliveryDue',
 '开单日期':'eOrderDate','开单人':'eOpener','产品':'product','付款方式':'eSales',
 '已记录成本':'eFloorCostTotal','项目地址':'eCust','地板':'eFloorCostTotal',
 '安装':'eInstallCostTotal','龙骨':'eBattenCostTotal','踢脚线':'eSkirtCostTotal',
 '辅料':'eMaterialCostTotal','运输':'eFreightCostTotal','拆除':'eRemoveCostTotal','其他':'eCostStatus'
 }[label]||'eSales');
 const keyValue=(label,value,cls='')=>`<div class="m404-key-row m406-tappable ${cls}" data-m404="editfocus" data-target="${fieldForLabel(label)}" role="button" tabindex="0" aria-label="编辑${E(label)}"><span>${E(label)}</span><strong>${value}</strong></div>`;
 function floorIcon(){return '<span class="m404-kind-icon m404-wood" aria-hidden="true"></span>';}
 function feeIcon(){return '<span class="m404-kind-icon m404-fee" aria-hidden="true">✦</span>';}
 function itemsPage(o){
  const {ps,ss,floor,extra}=priceInfo(o),original=floor+extra;
  const discount=Math.max(0,N(o.discountAmount)),surcharge=Math.max(0,N(o.surchargeAmount!=null?o.surchargeAmount:o.additionalAmount));
  const refunds=typeof orderReturnTotal==='function'?N(orderReturnTotal(o)):0;
  const final=calcOrderFinalAmount(o),difference=final-(original-discount+surcharge-refunds);
  const products=ps.map((p,i)=>`<div class="m404-line m404-product m406-tappable" data-m404="editfocus" data-target="product" data-index="${i}" role="button" tabindex="0" aria-label="编辑${E(p.species||'地板')}产品"><div class="m404-main"><b>${E(p.species||'木地板')}</b><span>${E(p.spec||'规格未填')}</span><small>实际 ${A(p.area)}㎡${Math.abs(N(p.billArea)-N(p.area))>.0001?' · 计价 '+A(p.billArea)+'㎡':''}</small></div><div class="m404-line-end"><b>${M(p.subtotal)}</b><span>${M(p.price)}/㎡</span></div></div>`).join('');
  const sales=ss.map((x,i)=>`<div class="m404-line m406-tappable" data-m404="editfocus" data-target="sales" data-index="${i}" role="button" tabindex="0" aria-label="编辑${E(x.name||'销售项目')}"><div class="m404-main"><b>${E(x.name||'其他销售项目')}</b><span>${A(x.qty)}${E(x.unit||'项')} · ${M(x.price)}/${E(x.unit||'项')}</span></div><div class="m404-line-end"><b>${M(x.subtotal)}</b></div></div>`).join('');
  const paid=orderPaidValue(o),due=calcOrderReceivable(o),st=orderCostStatus(o),known=isProfitKnown(o),cost=orderRecordedCost(o),prof=known?orderAccurateProfit(o):null;
  return `<section class="m404-card m404-items-card">${cardTitle('项目明细')}${products||'<div class="m404-empty">暂无产品资料</div>'}${sales}<button type="button" class="m404-add-row" data-m404="edit">＋ <span>编辑或添加销售项目</span><span>›</span></button></section>
  <section class="m404-card m404-money">${cardTitle('金额汇总')}<div class="m404-key-list">
    ${keyValue('产品金额',M(floor))}${keyValue('其他销售项目',M(extra))}
    <div class="m404-separator"></div>${keyValue('项目原价',M(original))}
    ${keyValue('优惠金额',discount?'− '+M(discount):'¥0')}${keyValue('其他加价',M(surcharge))}
    ${refunds>0?keyValue('退板 / 退款','− '+M(refunds)):''}
    ${Math.abs(difference)>.01?keyValue('其他成交额调整',(difference>0?'+ ':'− ')+M(Math.abs(difference))):''}
    ${keyValue('最终成交额',M(final),'m404-final')}
  </div></section>
  <section class="m404-finance-card m406-four">
    <div class="m406-tappable" data-m404="editfocus" data-target="ePaid" role="button" tabindex="0" aria-label="编辑已收"><span>已收</span><strong>${M(paid)}</strong></div>
    <div class="m404-highlight m406-tappable" data-m404="pay" role="button" tabindex="0" aria-label="查看待收并收款"><span>待收</span><strong>${M(due)}</strong></div>
    <div class="m406-tappable" data-m404="editfocus" data-target="eFloorCostTotal" role="button" tabindex="0" aria-label="编辑成本"><span>成本</span><strong class="${st!=='complete'?'m404-red':''}">${st==='missing'?'待补':M(cost)}</strong></div>
    <div class="m406-tappable" data-m404="editfocus" data-target="eCostStatus" role="button" tabindex="0" aria-label="查看利润并编辑成本"><span>利润</span><strong>${known?M(prof):'待补成本'}</strong></div></section>`;
 }
 function paymentsPage(o){
  const hist=Array.isArray(o.paymentHistory)?o.paymentHistory:[],paid=orderPaidValue(o),due=calcOrderReceivable(o);
  const rows=hist.slice().reverse().map(x=>`<div class="m404-payment m406-tappable" data-m404="editfocus" data-target="ePaid" role="button" tabindex="0" aria-label="查看收款编辑"><div><b>${E(x.type||'收款')}</b><span>${E(dateValue(x.date))}</span></div><strong>${M(x.amount)}</strong></div>`).join('');
  const untracked=hist.reduce((n,x)=>n+N(x.amount),0),unmatched=Math.abs(paid-untracked)>.01;
  const returns=typeof orderReturnHistory==='function'?orderReturnHistory(o):[];
  return `<section class="m404-card">${cardTitle('收款概况')}<div class="m404-pay-tiles"><div><span>订单金额</span><b>${M(calcOrderFinalAmount(o))}</b></div><div><span>已收</span><b>${M(paid)}</b></div><div><span>待收</span><b>${M(due)}</b></div></div></section>
   <section class="m404-card">${cardTitle('收款记录')}${rows||'<div class="m404-empty">尚无逐笔收款记录</div>'}${unmatched&&paid>0?`<div class="m404-quiet">历史累计已收 ${M(paid)}，逐笔记录合计 ${M(untracked)}。此处不自动补造历史收款。</div>`:''}</section>
   ${returns.length?`<section class="m404-card">${cardTitle('退板 / 退款记录')}${returns.slice().reverse().map(r=>`<div class="m404-payment"><div><b>${E(r.productName||'退款')}</b><span>${E(dateValue(r.date))} ${r.pieces?E(r.pieces)+'片':''}</span></div><strong>− ${M(r.refundAmount)}</strong></div>`).join('')}</section>`:''}`;
 }
 function measurePage(o){
  const snapshot=o.measureSnapshot,rows=Array.isArray(snapshot?.rows)?snapshot.rows.filter(r=>r&&typeof r==='object'):[];
  if(!rows.length)return `<section class="m404-card"><h3 class="m404-section-title">量房明细</h3><div class="m404-empty">此订单没有保存房间量房档案。不会根据订单面积推算或生成房间尺寸。</div></section>`;
  const rawNames=[...(Array.isArray(snapshot.floors)?snapshot.floors.map(f=>typeof f==='string'?f:f?.name):[]),...rows.map(r=>r.floor)];
  const floors=[...new Set(rawNames.filter(f=>f&&rows.some(r=>r.floor===f)))];
  if(rows.some(r=>!r.floor))floors.push('未标注楼层');
  const measured=rows.reduce((n,r)=>n+N(r.area),0);
  const entries=floors.map((f,i)=>{
   const group=rows.filter(r=>r.floor===f||(!r.floor&&f==='未标注楼层'));
   const sum=group.reduce((n,r)=>n+N(r.area),0),opened=!state.expandedFloors.has(i);
   return `<div class="m404-floor"><button type="button" class="m404-floor-head" data-m404="floor" data-floor="${i}" aria-expanded="${opened}"><b>${E(f)}</b><span>${group.length}项</span><strong>${A(sum)}㎡</strong><i>${opened?'⌄':'›'}</i></button>${opened?`<div class="m404-room-list">${group.map(r=>{
    const stair=r.kind==='stair'; const expr=stair?[r.width?'宽'+r.width:'',r.depth?'深'+r.depth:'',r.count?'踏步'+r.count:'',r.riser?'立板'+r.riser:'',r.platform?'平台 '+r.platform:''].filter(Boolean).join(' · '):(r.expr||'未填写尺寸');
    return `<div class="m404-room"><span>${E(r.name||(stair?'楼梯':'未命名区域'))}</span><span>${E(expr)}</span><b>${A(r.area)}㎡</b></div>`;
   }).join('')}</div>`:''}</div>`;
  }).join('');
  const qa=Number(snapshot.quoteActualArea);const adjustment=Number.isFinite(qa)&&Math.abs(qa-measured)>.01;
  return `<section class="m404-card m404-measure-card"><div class="m404-measure-title">${cardTitle('量房明细')}<span>${floors.length}层 · ${rows.length}项 <b>${A(measured)}㎡</b></span></div>${entries}
  <div class="m404-measure-total"><span>原始测量合计</span><b>${A(measured)}㎡</b></div>${adjustment?`<div class="m404-quiet">报价实际面积 ${A(qa)}㎡（可能经人工调整，未覆盖原始测量数据）</div>`:''}</section>`;
 }
 function infoPage(o){
  const note=String(o.quoteNote||o.contractNote||o.customerNote||'').trim(),history=String(o.historyNote||'').trim();
  const plan=o.paymentMode==='staged'&&o.paymentPlan?`定金 ${N(o.paymentPlan.stage1Rate)}% · 到货 ${N(o.paymentPlan.stage2Rate)}% · 完工 ${N(o.paymentPlan.stage3Rate)}%`:'未设置阶段付款计划';
  const entries=Array.isArray(o.eventHistory)?o.eventHistory.slice().reverse().slice(0,15):[];
  const cost=getCostBreakdown(o),costFields=[['地板',cost.floor],['安装',cost.install],['龙骨',cost.batten],['踢脚线',cost.skirt],['辅料',cost.material],['运输',cost.freight],['拆除',cost.remove],['其他',cost.other]];
  return `<section class="m404-card">${cardTitle('交货信息')}${keyValue('交货日期',E(o.deliveryDueDate||'未设置'))}${keyValue('交货状态',E(o.fulfilledAt?'已交货 / 安装':(isCompleted(o)?'订单已完成':'未标记交货')))}${o.address||o.siteAddress||o.deliveryAddress?keyValue('项目地址',E(o.address||o.siteAddress||o.deliveryAddress)):''}</section>
  <section class="m404-card">${cardTitle('其他信息')}${keyValue('开单日期',E(o.date||'—'))}${keyValue('开单人',E(o.opener||'未填写'))}${keyValue('产品',E(orderPrimaryProductText(o)))}${keyValue('付款方式',E(plan))}</section>
  <section class="m404-card">${cardTitle('备注')}${note||history?`<div class="m404-notes">${note?`<div>${E(note)}</div>`:''}${history?`<div>${E(history)}</div>`:''}</div>`:'<div class="m404-empty">未填写备注</div>'}</section>
  <section class="m404-card">${cardTitle('成本记录')}<p class="m404-quiet">${orderCostStatus(o)==='complete'?'成本完整':orderCostStatus(o)==='partial'?'成本不完整':'成本待补'} · 以订单已记录的成本为准</p>${costFields.filter(x=>N(x[1])!==0).map(x=>keyValue(x[0],M(x[1]))).join('')||'<div class="m404-empty">尚未填写成本</div>'}${keyValue('已记录成本',M(orderRecordedCost(o)),'m404-total-row')}</section>
  ${entries.length?`<section class="m404-card">${cardTitle('订单记录')}${entries.map(ev=>`<div class="m404-history"><b>${E(ev.type||'记录')}</b><span>${E(ev.text||'')}</span><small>${E(dateValue(ev.date))}</small></div>`).join('')}</section>`:''}`;
 }
 function render(resetScroll){
  const o=order();if(!o){close();return;}
  const scroller=root.querySelector('.m404-scroll'),scrollY=scroller&&!resetScroll?scroller.scrollTop:0;
  const ps=normalizeOrderProducts(o),species=ps[0]?.species||o.species||'木地板';
  const tabs=[['items','项目明细'],['payments','收款记录'],['measure','量房明细'],['info','其他信息']];
  let content=state.tab==='items'?itemsPage(o):state.tab==='payments'?paymentsPage(o):state.tab==='measure'?measurePage(o):infoPage(o);
  const due=calcOrderReceivable(o),showPay=due>.005;
  root.innerHTML=`<div class="m404-backdrop" data-m404="close"></div><div class="m404-shell"><header class="m404-topbar"><button type="button" class="m404-back" data-m404="close" aria-label="返回订单管理">‹</button><strong>订单详情</strong><button type="button" class="m404-dots" data-m404="more" aria-label="更多订单操作" aria-expanded="${state.menu}">更多</button></header>
  <div class="m404-scroll"><section class="m404-card m404-overview"><div class="m404-overview-top"><div class="m404-cust"><h2 class="m406-tappable" data-m404="editfocus" data-target="eCust" role="button" tabindex="0" aria-label="编辑客户">${E(o.cust||'未命名客户')}</h2><div><span class="m406-tappable" data-m404="editfocus" data-target="product" role="button" tabindex="0">${E(species)}</span> <span>·</span> <span class="m406-tappable" data-m404="editfocus" data-target="eOrderDate" role="button" tabindex="0">${E(o.date||'—')}</span></div></div><span data-m404="editfocus" data-target="ePaid" role="button" tabindex="0" class="m404-status m406-tappable ${isCompleted(o)?'done':''}">${E(statusText(o))}</span></div><div class="m404-overview-grid"><div class="m406-tappable" role="button" tabindex="0" data-m404="editfocus" data-target="eSales"><span>总金额</span><b>${M(calcOrderFinalAmount(o))}</b></div><div class="m406-tappable" role="button" tabindex="0" data-m404="editfocus" data-target="productArea"><span>面积</span><b>${A(actualArea(o))}㎡</b></div><div class="m406-tappable" role="button" tabindex="0" data-m404="editfocus" data-target="eOpener"><span>开单人</span><b>${E(o.opener||'未填写')}</b></div></div></section>
  <nav class="m404-tabs" role="tablist" aria-label="订单信息分类">${tabs.map(([key,title])=>`<button type="button" role="tab" data-m404="tab" data-tab="${key}" aria-selected="${key===state.tab}" class="${key===state.tab?'selected':''}">${title}</button>`).join('')}</nav>
  <div class="m404-page" role="tabpanel">${content}</div><div class="m404-bottom-space"></div></div>
  <div class="m404-bottom"><div class="m404-bottom-actions"><button type="button" class="m404-edit-btn" data-m404="edit">编辑</button><button type="button" class="m404-pay-btn" data-m404="pay" ${showPay?'':'disabled'}>${showPay?'收款':'已收齐'}</button></div><button type="button" class="m404-contract-btn" data-m404="contract">合同发送</button>
  ${state.menu?`<div class="m404-action-menu"><button data-m404="settlement">结算清单</button>${isCompleted(o)?'<button data-m404="reopen">恢复进行中</button>':'<button data-m404="settle">结清完成</button><button data-m404="refund">退板 / 退款</button>'}</div>`:''}</div></div>`;
  const next=root.querySelector('.m404-scroll');if(next)next.scrollTop=resetScroll?0:scrollY;
 }
 function open(id){
  if(typeof orders!=='function'||!orders().some(o=>String(o.id)===String(id)))return;
  originalFocus=document.activeElement;state.id=String(id);state.tab='items';state.menu=false;state.expandedFloors.clear();
  root.classList.add('visible');root.setAttribute('aria-hidden','false');document.body.classList.add('m404-detail-open');
  document.querySelectorAll('.order-table-detail').forEach(el=>el.classList.add('hide'));
  document.querySelectorAll('.order-entry').forEach(el=>el.classList.remove('is-expanded'));
  render(true);
 }
 function close(){state.id=null;state.menu=false;root.classList.remove('visible');root.setAttribute('aria-hidden','true');document.body.classList.remove('m404-detail-open');root.innerHTML='';if(originalFocus&&originalFocus.isConnected&&typeof originalFocus.focus==='function'){try{originalFocus.focus({preventScroll:true})}catch(e){}}}
 function focusOrderField(target,index){
  const found=order();if(!found)return;
  const trueId=found.id;
  if(target==='refund'){openReturnRefund(trueId);return;}
  openOrderEdit(trueId);
  const modal=document.getElementById('orderEditModal');
  if(!modal||modal.classList.contains('hide'))return;
  let el=null;
  if(target==='product'||target==='productArea'){
    const row=modal.querySelectorAll('#editProductRows [data-product-row]')[Number(index)||0]||modal.querySelector('#editProductRows [data-product-row]');
    el=row?.querySelector(target==='productArea'?'[data-field="area"]':'[data-field="species"]')||row?.querySelector('input');
  }else if(target==='sales'){
    const panel=document.getElementById('editSalesPanel');
    if(panel?.classList.contains('hide')&&typeof toggleEditSalesPanel==='function')toggleEditSalesPanel();
    const row=modal.querySelectorAll('#editSalesRows [data-sales-row]')[Number(index)||0];
    el=row?.querySelector('[data-sales-field="name"]')||row?.querySelector('input')||document.getElementById('editSalesToggle');
  }else{
    el=document.getElementById(target)||document.getElementById('eSales');
  }
  if(!el)return;
  requestAnimationFrame(()=>{
    if(!el.isConnected)return;
    try{el.scrollIntoView({block:'center',behavior:'instant'});}catch(_){}
    if(el.matches('input:not([readonly]),textarea,select'))try{el.focus({preventScroll:true});}catch(_){el.focus();}
    else if(el.matches('button'))try{el.focus({preventScroll:true});}catch(_){}
  });
 }
 function invoke(action,id,target,index){
  try{
   const found=order();if(!found)return;id=found.id;
   if(action==='editfocus')focusOrderField(target,index);
   else if(action==='edit')openOrderEdit(id);
   else if(action==='pay'&&calcOrderReceivable(order())>.005)recordPayment(id);
   else if(action==='contract'){close();sendOrderContract(id);}
   else if(action==='settlement')openSettlementList(id);
   else if(action==='settle')settleOrder(id);
   else if(action==='reopen')reopenOrder(id);
   else if(action==='refund')openReturnRefund(id);
  }catch(err){console.error('订单详情操作异常',action,err);if(typeof showToast==='function')showToast('操作未完成，请重试');}
 }
 root.addEventListener('click',ev=>{
  const btn=ev.target.closest('[data-m404]');if(!btn)return;
  const action=btn.dataset.m404,id=state.id;if(!id)return;
  ev.preventDefault();ev.stopPropagation();
  if(action==='close'){close();return;}
  if(action==='tab'){state.tab=btn.dataset.tab;state.menu=false;render(true);return;}
  if(action==='floor'){const f=Number(btn.dataset.floor);state.expandedFloors.has(f)?state.expandedFloors.delete(f):state.expandedFloors.add(f);render(false);return;}
  if(action==='more'){state.menu=!state.menu;render(false);return;}
  state.menu=false;invoke(action,id,btn.dataset.target,btn.dataset.index);
  if(!['edit','editfocus','contract','settlement','refund','pay'].includes(action))render(false);
 });
 root.addEventListener('keydown',ev=>{if((ev.key==='Enter'||ev.key===' ')&&ev.target.matches('[role="button"][data-m404]')){ev.preventDefault();ev.target.click();}});
 document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&state.id&&!document.querySelector('.modal-mask:not(.hide)'))close();});
 const oldToggle=window.toggleOrderRowDetail;
 window.toggleOrderRowDetail=function(id){if(!document.getElementById('muyeOrderDetailV404'))return oldToggle.call(this,id);open(id);};
 const oldRender=window.renderOrders;
 window.renderOrders=function(){const ret=oldRender.apply(this,arguments);if(state.id)render(false);return ret;};
 window.muyeOrderDetailV404={open,close,refresh:()=>state.id&&render(false),getStatus:()=>({opened:!!state.id,tab:state.tab,id:state.id})};
 window.muyeOrderDetailV404Ready=true;
})();