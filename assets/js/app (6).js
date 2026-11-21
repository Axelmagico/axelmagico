'use strict';
const $=s=>document.querySelector(s), fmt=n=>'Gs. '+Number(n).toLocaleString('es-PY');
const defaultMedia={slides:[],photos:[],videos:[]};let media=defaultMedia, catalog=null, slideIndex=0, slideTimer;
const emojiByTheme={school:'🏫',food:'🎩',venue:'✨',extras:'🍿'};
async function loadJSON(path,fallback){try{const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw Error('No se pudo cargar '+path);return await r.json()}catch(e){console.warn(e);return fallback}}
function safeUrl(path){if(typeof path!=='string')return '';const s=path.trim();if(!s||s.startsWith('//')||/^(javascript|data):/i.test(s))return '';if(/^https?:\/\//i.test(s))return s;if(s.startsWith('/')||s.includes('..'))return '';return s}
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e}
function renderSlides(){
 const root=$('#slides'),dots=$('#dots');if(!root||!dots)return;
 root.replaceChildren();dots.replaceChildren();const slides=Array.isArray(media.slides)?media.slides:[];
 if(!slides.length){root.append(el('div','empty-media','Pronto compartiremos nuestras experiencias mágicas.'));return}
 slideIndex%=slides.length;const s=slides[slideIndex];
 const article=el('article','slide'),pic=el('div','slide-media '+(s.theme||''));
 const url=safeUrl(s.image);if(url){const img=el('img');img.src=url;img.alt=s.title||'Experiencia Mago Axel';img.loading=slideIndex===0?'eager':'lazy';img.decoding='async';img.onerror=()=>{img.remove();pic.append(el('span','slide-symbol',emojiByTheme[s.theme]||'✨'))};pic.append(img)}else pic.append(el('span','slide-symbol',emojiByTheme[s.theme]||'✨'));
 const sparkle=el('div','slide-sparkles');sparkle.setAttribute('aria-hidden','true');for(let j=0;j<8;j++)sparkle.append(el('span','sparkle'));pic.append(sparkle);
 const content=el('div','slide-content');content.append(el('small','',s.category||'EXPERIENCIA MÁGICA'),el('h3','',s.title||''),el('p','',s.subtitle||''));
 const a=el('a','slide-cta','✨ Consultar este servicio');a.href='#asistente';a.dataset.slideInterest=s.interest||s.title||'Experiencia Mago Axel';
 a.addEventListener('click',()=>{addBubble('Me interesa: '+a.dataset.slideInterest,'user');selectedPlan=planIds[a.dataset.slideInterest]||null;if(selectedCity&&selectedPlan)showPlan(selectedCity,selectedPlan);else addBubble('¡Qué buena elección! Contame en qué ciudad será el evento para continuar.')});
 content.append(a);article.append(pic,content);root.append(article);
 slides.forEach((_,i)=>{const b=el('button',i===slideIndex?'active':'');b.type='button';b.setAttribute('aria-label','Ir a diapositiva '+(i+1)+' de '+slides.length);b.setAttribute('aria-current',String(i===slideIndex));b.addEventListener('click',()=>setSlide(i));dots.append(b)});
 const prev=$('#prev'),next=$('#next');if(prev)prev.hidden=slides.length<2;if(next)next.hidden=slides.length<2;
}
function setSlide(i){if(!media.slides?.length)return;slideIndex=(i+media.slides.length)%media.slides.length;renderSlides();restartTimer()}
function restartTimer(){clearInterval(slideTimer);if(media.slides?.length>1&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches)slideTimer=setInterval(()=>{if(!document.hidden&&!sliderPaused){slideIndex=(slideIndex+1)%media.slides.length;renderSlides()}},5000)}
let sliderPaused=false;
function setupSliderInteractions(){const wrap=document.querySelector('.slider-wrap');if(!wrap)return;
 wrap.addEventListener('mouseenter',()=>sliderPaused=true);wrap.addEventListener('mouseleave',()=>sliderPaused=false);
 wrap.addEventListener('focusin',()=>sliderPaused=true);wrap.addEventListener('focusout',e=>{if(!wrap.contains(e.relatedTarget))sliderPaused=false});
 wrap.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();setSlide(slideIndex+1)}if(e.key==='ArrowLeft'){e.preventDefault();setSlide(slideIndex-1)}});
 let x=null;wrap.addEventListener('touchstart',e=>{x=e.changedTouches[0].clientX},{passive:true});wrap.addEventListener('touchend',e=>{if(x===null)return;const delta=e.changedTouches[0].clientX-x;if(Math.abs(delta)>55)setSlide(slideIndex+(delta<0?1:-1));x=null},{passive:true});
}
function renderPhotos(){const root=$('#photo-grid');root.replaceChildren();const photos=media.photos||[];if(!photos.length){root.append(empty('📸','Aquí aparecerán tus fotografías reales. Agregalas en data/media.json.'));return}photos.forEach(p=>{const url=safeUrl(p.image);if(!url)return;const fig=el('figure','photo'),img=el('img');img.src=url;img.alt=p.title||'Show de Mago Axel';img.loading='lazy';const cap=el('figcaption','',p.title||p.category||'Mago Axel');fig.append(img,cap);root.append(fig)})}
function empty(icon,msg){const box=el('div','empty-media');box.append(el('span','',icon),el('p','',msg));return box}
function youtubeEmbed(url){try{const u=new URL(url);let id='';if(['youtube.com','www.youtube.com','m.youtube.com'].includes(u.hostname)){id=u.searchParams.get('v')||u.pathname.match(/^\/shorts\/([\w-]+)/)?.[1]||''}else if(u.hostname==='youtu.be')id=u.pathname.slice(1);return /^[\w-]{11}$/.test(id)?'https://www.youtube-nocookie.com/embed/'+id:''}catch{return ''}}
function renderVideos(){const root=$('#video-grid');root.replaceChildren();const videos=media.videos||[];if(!videos.length){root.append(empty('🎬','Próximamente: videos de nuestros shows. Agregá enlaces de YouTube o archivos MP4 en data/media.json.'));return}videos.forEach(v=>{const card=el('article','video-card'),url=safeUrl(v.url);if(!url)return;const embed=youtubeEmbed(url);if(embed){const frame=el('iframe');frame.src=embed;frame.title=v.title||'Video de Mago Axel';frame.loading='lazy';frame.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';frame.allowFullscreen=true;card.append(frame)}else if(/\.mp4(\?.*)?$/i.test(url)){const vid=el('video');vid.controls=true;vid.preload='metadata';vid.src=url;card.append(vid)}else return;card.append(el('h3','',v.title||'Show Mago Axel'));root.append(card)})}
const normalized=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
// Datos comerciales públicos: lectura limitada a una función RPC de Supabase.
// La clave publicable no concede acceso a las tablas privadas.
const SUPABASE_URL='https://hxyyvxmockrioesyymhe.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_NfOs6-XQiiY3_GfLEyZP1A_Z1Bu8DLs';
let livePrices=new Map(),liveCities=new Map(),pricesReady=false;
async function loadCommercialData(){
 try{
  const response=await fetch(SUPABASE_URL+'/rest/v1/rpc/axel_catalogo_publico',{method:'POST',headers:{'apikey':SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:'{}',cache:'no-store'});
  if(!response.ok)throw new Error('Consulta comercial no disponible: '+response.status);
  const rows=await response.json();if(!Array.isArray(rows))throw new Error('Formato comercial inválido');
  const nextPrices=new Map(),nextCities=new Map();
  for(const row of rows){
   if(!row.ciudad||!row.codigo||!Object.hasOwn(names,row.codigo))continue;
   const cityKey=normalized(row.ciudad),plan=row.codigo;
   if(!nextCities.has(cityKey))nextCities.set(cityKey,{name:row.ciudad,plans:[]});
   if(!nextCities.get(cityKey).plans.includes(plan))nextCities.get(cityKey).plans.push(plan);
   const amount=row.precio_guaranies;
   nextPrices.set(cityKey+'|'+plan,typeof amount==='number'&&Number.isSafeInteger(amount)&&amount>0?amount:null);
  }
  livePrices=nextPrices;liveCities=nextCities;pricesReady=true;
 }catch(error){console.error('Axel IA: no se pudieron cargar los precios públicos',error);pricesReady=false}
}
const names={escolar:'Show para cumple en escuela',express:'Show Express',full_fest:'Show Full Fest',full_fest_acomp:'Show Full Fest + Acompañamiento',combo_total:'Combo Diversión Total'};
function groupOf(city){const c=normalized(city);for(const [group,data] of Object.entries(catalog?.grupos||{})){if((data.ciudades||[]).some(x=>normalized(x)===c))return group}return 'D'}
function optionsFor(city,group){
 if(!pricesReady)return [];
 return liveCities.get(normalized(city))?.plans||[];
}
function priceFor(city,plan,group){
 if(!pricesReady)return null;
 return livePrices.get(normalized(city)+'|'+plan)??null;
}
function planNote(city,plan){
 const c=normalized(city);
 const entry=Object.entries(catalog?.cobertura_especifica||{}).find(([name])=>normalized(name)===c)?.[1];
 return entry?.notas?.[plan]||'';
}
let selectedPlan=null, selectedCity=null, requestedDate=null, phase='city';
const planIds={'Show para cumple en escuela':'escolar','Show Express':'express','Show Full Fest':'full_fest','Full Fest + Acompañamiento':'full_fest_acomp','Combo Diversión Total':'combo_total'};
const planDetails={
 escolar:{duration:'30 minutos',includes:'Magia participativa, juegos, animación y Tito Patito, adaptados a celebraciones escolares.'},
 express:{duration:'40 minutos',includes:'Juegos de magia interactivos, animación y momentos divertidos con el público.'},
 full_fest:{duration:'50 minutos',includes:'Magia interactiva, títeres y aparición de Sacachispas.'},
 full_fest_acomp:{duration:'50 minutos de show, más acompañamiento durante momentos del festejo',includes:'Show Full Fest, acompañamiento para cantar el cumpleaños, apoyo en piñata y entrega de sorpresitas.'},
 combo_total:{duration:'50 minutos de show, más acompañamiento; servicios complementarios durante 2 horas',includes:'Full Fest con acompañamiento, Globo Loco inflable de 4 × 4 metros, algodón de azúcar y pororó.'}
};
function addBubble(text,who='bot'){const chat=$('#chat');chat.append(el('div','bubble '+who,text));chat.scrollTop=chat.scrollHeight}
function addWhatsapp(city,plan,date){const a=el('a','btn gold','Continuar por WhatsApp ↗');const detail=plan?names[plan]:'una experiencia mágica';a.href='https://wa.me/595961871700?text='+encodeURIComponent('Hola, mi evento será en '+(city||'una ciudad por confirmar')+'. Me interesa '+detail+(date?'. Fecha: '+date:'')+'. Quisiera confirmar disponibilidad y reserva.');a.target='_blank';a.rel='noopener noreferrer';a.style.cssText='align-self:flex-start;font-size:.8rem;background:#25D366;color:#fff;border:0;border-radius:40px;text-decoration:none;';$('#chat').append(a);$('#chat').scrollTop=$('#chat').scrollHeight}
function hideCityControls(){const btn=$('#consult');if(btn)btn.hidden=!!selectedCity;const label=document.querySelector('label[for="city"]');const sel=$('#city');if(label)label.hidden=!!selectedCity;if(sel)sel.hidden=!!selectedCity}
function addPlanChoices(city,opts){
 if(!pricesReady){addBubble('La lista de planes no está disponible temporalmente. Te ayudo por WhatsApp.');addWhatsapp(city);return}
 if(!opts.length){addBubble('Todavía no hay planes habilitados para '+city+'. Consultá una cotización personalizada por WhatsApp.');addWhatsapp(city);return}
 const box=el('div','chat-plan-actions');
 box.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:10px;width:100%;margin:10px 0;';
 opts.forEach(id=>{
  const amount=priceFor(city,id,groupOf(city));
  const b=el('button','axel-plan-choice');b.type='button';
  b.style.cssText='display:flex;flex-direction:column;align-items:stretch;gap:7px;padding:14px;border:1px solid #cbb5dc;border-radius:15px;background:#fff;color:#261331;text-align:left;cursor:pointer;box-shadow:0 3px 12px rgba(35,12,55,.08);font:inherit;white-space:normal;opacity:1;visibility:visible;';
  const title=el('strong','',names[id]);title.style.cssText='font-size:14px;color:#261331;line-height:1.4;';
  const price=el('span','',amount?fmt(amount):'Precio a confirmar');price.style.cssText='font-size:15px;font-weight:800;color:#6530a1;';
  const action=el('span','','Ver detalles →');action.style.cssText='align-self:flex-start;border-radius:20px;padding:6px 12px;background:#ffce6d;color:#251334;font-weight:800;font-size:12px;';
  b.append(title,price,action);
  b.setAttribute('aria-label','Ver detalles de '+names[id]+' en '+city+', '+(amount?fmt(amount):'precio a confirmar'));
  b.addEventListener('mouseenter',()=>{b.style.borderColor='#8845bc';b.style.boxShadow='0 5px 18px rgba(85,40,130,.22)'});
  b.addEventListener('mouseleave',()=>{b.style.borderColor='#cbb5dc';b.style.boxShadow='0 3px 12px rgba(35,12,55,.08)'});
  b.addEventListener('click',()=>{requestedDate=null;requestedTime=null;selectedCity=city;selectedPlan=id;hideCityControls();addBubble('Quiero conocer '+names[id],'user');showPlan(city,id)});
  box.append(b);
 });
 $('#chat').append(box);$('#chat').scrollTop=$('#chat').scrollHeight;
}
function offerCityCatalog(city,opts){
 addBubble('¡Con mucho gusto! 🎩✨ Tenemos estos planes para vos en '+city+':');
 addPlanChoices(city,opts);
 if(opts.length)addBubble('¿Cuál de estos planes te gustaría conocer mejor?');
 phase='plan';
}
function showPlan(city,plan){if(!pricesReady){addBubble('En este momento no puedo consultar los precios actualizados. Podés continuar por WhatsApp para recibir una cotización confirmada.');addWhatsapp(city,plan);return}const group=groupOf(city),opts=optionsFor(city,group);if(!opts.includes(plan)){addBubble('Por ahora '+names[plan]+' no tiene cobertura en '+city+'. Puedo ofrecerte estas alternativas disponibles:');addPlanChoices(city,opts);phase='plan';return}
 const detail=planDetails[plan],price=priceFor(city,plan,group),note=planNote(city,plan);
 let out='¡Excelente elección! ✨\n\n'+names[plan]+' en '+city+'.\n\n¿Qué incluye? '+detail.includes+'\n\nDuración: '+detail.duration+'.';
 if(note)out+='\n'+note;
 if(plan==='escolar')out+='\nLa cobertura escolar está sujeta a confirmar el límite de 25 km desde Asunción.';
 out+='\n\nPrecio: '+(price?fmt(price):'a confirmar con nuestro equipo')+'.\n\nElegí la fecha y el horario para consultar la disponibilidad en nuestra agenda. ';
 addBubble(out);eventDateTimeForm();}
// Etapa 4: consulta pública de disponibilidad (solo lectura; no reserva).
const AXEL_AVAILABILITY_URL='https://script.google.com/macros/s/AKfycbyaytKu0aEBOYsC1P0qoe_6r9pRnX-Plf30EFRG1H9tj6_XLDYfq_S_HyHPXPr2AnmM1A/exec';
const PLAN_SHOW_MINUTES={escolar:30,express:40,full_fest:50,full_fest_acomp:50,combo_total:50};
async function checkCalendarAvailability(day,hour,plan){
 const duration=PLAN_SHOW_MINUTES[plan];
 if(!duration)throw Error('Duración de show desconocida');
 const url=new URL(AXEL_AVAILABILITY_URL);
 url.searchParams.set('fecha',day);url.searchParams.set('hora',hour);url.searchParams.set('duracion',String(duration));
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetch(url.toString(),{method:'GET',redirect:'follow',cache:'no-store',signal:controller.signal});
  if(!response.ok)throw Error('Error HTTP '+response.status);
  const data=await response.json();
  if(data.ok!==true||typeof data.disponible!=='boolean')throw Error('Respuesta de disponibilidad inválida');
  return data.disponible;
 }finally{clearTimeout(timeout)}
}
function bookingSummary(city,plan,day,hour){
 const amount=priceFor(city,plan,groupOf(city));
 return 'Ciudad: '+city+'\nPlan: '+names[plan]+'\nPrecio: '+(amount?fmt(amount):'a confirmar')+'\nFecha: '+friendlyDate(day)+'\nHorario: '+hour;
}
async function submitAvailability(day,hour,button,error){
 const city=selectedCity,plan=selectedPlan;
 if(!city||!plan)return;
 if(button){button.disabled=true;button.textContent='Consultando calendario…'}
 if(error)error.textContent='';
 try{
  const available=await checkCalendarAvailability(day,hour,plan);
  if(city!==selectedCity||plan!==selectedPlan)return;
  if(available){
   document.querySelectorAll('.axel-event-form').forEach(f=>f.remove());
   addBubble('✨ El horario consultado figura DISPONIBLE en nuestra agenda.\n\n'+bookingSummary(city,plan,day,hour)+'\n\nLa disponibilidad puede cambiar. La reserva solo queda confirmada cuando nuestro equipo la registre y confirme por WhatsApp.');
   addBookingWhatsapp(city,plan,day,hour);
   phase='followup';
  }else{
   addBubble('📅 Esta fecha no está disponible en el horario seleccionado.\n\nNuestro margen entre shows es de 90 minutos.\n\n✨ ¿Te gustaría elegir otro horario?');
   eventDateTimeForm();
  }
 }catch(err){
  console.warn('Axel IA: consulta de disponibilidad no completada',err);
  addBubble('No pude verificar la agenda automáticamente en este momento. No significa que el horario esté libre ni ocupado. Podés pedir la verificación manual por WhatsApp.');
  addWhatsapp(city,plan,friendlyDate(day)+' a las '+hour+' (disponibilidad sin verificar)');
  phase='followup';
 }finally{if(button){button.disabled=false;button.textContent='Consultar disponibilidad →'}}
}
// Identificación mínima del interesado antes de abrir WhatsApp.
// Los datos se usan solo para redactar el mensaje, sin guardarlos en Supabase.
function addBookingWhatsapp(city,plan,day,hour){
 document.querySelectorAll('.axel-contact-card').forEach(card=>card.remove());
 const chat=$('#chat'),form=el('form','axel-contact-card');
 form.style.cssText='display:grid;gap:12px;width:100%;box-sizing:border-box;background:#fff;border:1px solid #d9c9e6;border-radius:16px;padding:16px;margin:10px 0;color:#281434;';
 const title=el('strong','','🎩 ¡Continuemos con tu contratación!');
 const info=el('p','','Dejanos tu nombre y número de WhatsApp para identificar tu consulta. No se confirmará la reserva hasta que nuestro equipo te responda.');
 info.style.cssText='font-size:13px;line-height:1.5;margin:0;color:#5c4270;';
 function field(labelText,placeholder,type){
  const label=el('label','',labelText),input=el('input');
  label.style.cssText='display:grid;gap:6px;font-size:13px;font-weight:700;color:#281434;';
  input.type=type;input.placeholder=placeholder;input.required=true;input.autocomplete=type==='tel'?'tel':'name';
  input.style.cssText='width:100%;box-sizing:border-box;padding:12px;border:1px solid #bea8d0;border-radius:10px;background:#fff;color:#281434;font:inherit;';
  label.append(input);return {label,input};
 }
 const name=field('Nombre y apellido','Ej.: María González','text');name.input.maxLength=80;
 const phone=field('Número de WhatsApp','Ej.: 0981 123456','tel');phone.input.inputMode='tel';phone.input.maxLength=25;
 const error=el('div');error.setAttribute('role','alert');error.style.cssText='font-size:12px;color:#a51e45;';
 const button=el('button','', '💬 Quiero contratar por WhatsApp →');button.type='submit';
 button.style.cssText='display:block;width:100%;box-sizing:border-box;background:#25D366!important;color:#fff!important;border:0!important;border-radius:50px;padding:15px 18px;font:inherit;font-weight:800;line-height:1.4;cursor:pointer;white-space:normal;';
 form.append(title,info,name.label,phone.label,error,button);
 form.addEventListener('submit',e=>{
  e.preventDefault();
  const client=name.input.value.trim().replace(/\s+/g,' '),rawPhone=phone.input.value.trim();
  const digits=rawPhone.replace(/\D/g,'');
  if(client.length<3){error.textContent='Escribí tu nombre y apellido.';name.input.focus();return;}
  if(digits.length<9||digits.length>15){error.textContent='Ingresá un número de WhatsApp válido, con código de área.';phone.input.focus();return;}
  error.textContent='';
  const message='¡Hola, Mago Axel! 🎩✨ Quiero contratar un show. Consulté un horario que figuraba disponible en Axel IA.\n\nCliente: '+client+'\nWhatsApp del cliente: '+rawPhone+'\n\n'+bookingSummary(city,plan,day,hour)+'\n\n¿Podemos confirmar la disponibilidad y coordinar la reserva?';
  const url='https://wa.me/595961871700?text='+encodeURIComponent(message);
  // Abrir desde la interacción del usuario para evitar bloqueadores de ventanas emergentes.
  const a=el('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';
  document.body.append(a);a.click();a.remove();
 });
 chat.append(form);chat.scrollTop=chat.scrollHeight;
}
// Selector de fecha y hora: no solicita datos personales ni genera reservas.
function isoLocalToday(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function validEventDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const [y,m,d]=value.split('-').map(Number),dt=new Date(y,m-1,d);return dt.getFullYear()===y&&dt.getMonth()===m-1&&dt.getDate()===d&&value>=isoLocalToday()}
function friendlyDate(value){const [y,m,d]=value.split('-');return `${d}/${m}/${y}`}
function eventDateTimeForm(){
 if(!selectedCity||!selectedPlan)return;
 document.querySelectorAll('.axel-event-form').forEach(form=>form.remove());
 const chat=$('#chat'),form=el('form','axel-event-form');
 form.style.cssText='background:#fff;color:#281434;border:1px solid #d9c9e6;border-radius:16px;padding:16px;display:grid;gap:12px;width:100%;box-sizing:border-box;margin:10px 0;';
 const title=el('strong','','📅 Elegí la fecha y el horario de tu evento');title.style.cssText='font-size:15px;color:#281434';
 const summary=el('div','',`${names[selectedPlan]} · ${selectedCity} · ${priceFor(selectedCity,selectedPlan,groupOf(selectedCity))?fmt(priceFor(selectedCity,selectedPlan,groupOf(selectedCity))):'Precio a confirmar'}`);summary.style.cssText='font-size:13px;color:#5c4270;line-height:1.5';
 const grid=el('div');grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;';
 function field(text,type,id,value){const wrap=el('label','',text),input=el('input');wrap.style.cssText='display:grid;gap:6px;font-size:13px;font-weight:700;color:#281434';input.type=type;input.id=id;input.required=true;input.style.cssText='width:100%;box-sizing:border-box;padding:12px;border:1px solid #bea8d0;border-radius:10px;background:white;color:#281434;font:inherit;color-scheme:light';if(value)input.value=value;wrap.append(input);return {wrap,input}}
 const date=field('Fecha del evento','date','axel-event-date',requestedDate&&/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)?requestedDate:'');date.input.min=isoLocalToday();
 const time=field('Horario aproximado','time','axel-event-time',requestedTime||'');
 grid.append(date.wrap,time.wrap);
 const note=el('small','','Consultaremos la agenda. La reserva solo será confirmada por nuestro equipo.');note.style.cssText='color:#674f75;line-height:1.5';
 const error=el('div');error.setAttribute('role','alert');error.style.cssText='font-size:12px;color:#a51e45';
 const btn=el('button','','Consultar disponibilidad →');btn.type='submit';btn.style.cssText='padding:13px;border:0;border-radius:25px;background:#ffce6d;color:#251334;font-weight:800;cursor:pointer;font:inherit';
 form.append(title,summary,grid,note,error,btn);
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(btn.disabled)return;
  const day=date.input.value,hour=time.input.value;
  if(!validEventDate(day)){error.textContent='Elegí una fecha válida a partir de hoy.';return}
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(hour)){error.textContent='Indicá un horario válido.';return}
  requestedDate=day;requestedTime=hour;
  addBubble('Fecha: '+friendlyDate(day)+' · Horario: '+hour,'user');
  await submitAvailability(day,hour,btn,error);
 });
 chat.append(form);chat.scrollTop=chat.scrollHeight;phase='date';
}
function offerAlternatives(city){const opts=optionsFor(city,groupOf(city)).filter(id=>id!==selectedPlan);if(!opts.length){addBubble('Por el momento no hay otras opciones habilitadas para '+city+'.');return}offerCityCatalog(city,opts)}
function consult(){const city=$('#city').value;if(!city){addBubble('Seleccioná la ciudad de tu evento para continuar.');return}selectedCity=city;hideCityControls();addBubble(city,'user');if(city==='Otra ciudad'){addBubble('Para eventos en otras ciudades, consultá una cotización personalizada por WhatsApp.');addWhatsapp('una ciudad por confirmar',selectedPlan);phase='unregisteredcity';return}if(!selectedPlan){offerCityCatalog(city,optionsFor(city,groupOf(city)));return}showPlan(city,selectedPlan)}
function extractEventDate(raw){
 const text=raw.trim();
 const months='enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre';
 const named=text.match(new RegExp('\\b([0-3]?\\d)\\s*(?:de\\s+)?('+months+')(?:\\s+(?:de\\s+)?(20\\d{2}))?\\b','i'));
 if(named)return named[1]+' de '+named[2].toLowerCase()+(named[3]?' de '+named[3]:'');
 const numeric=text.match(/\b([0-3]?\d)[\/-]([01]?\d)(?:[\/-](20\d{2}|\d{2}))?\b/);
 if(numeric)return numeric[1]+'/'+numeric[2]+(numeric[3]?'/'+numeric[3]:'');
 const relative=text.match(/\b(hoy|mañana|pasado mañana)\b/i);
 return relative?relative[0].toLowerCase():null;
}
function extractEventTime(raw){
 const t=raw.match(/\b(?:a\s+las\s+|a\s+la\s+)?([01]?\d|2[0-3])[:.]([0-5]\d)\s*(?:hs?\.?|horas?)?\b/i);
 if(t)return t[1].padStart(2,'0')+':'+t[2];
 const h=raw.match(/\b(?:a\s+las\s+|a\s+la\s+)([1-9]|1[0-2]|2[0-3])\s*(?:hs?\.?|horas?)?\b/i);
 return h?h[1]+':00':null;
}
let requestedTime=null;
function replyAboutPlan(question){
 const detail=planDetails[selectedPlan],price=priceFor(selectedCity,selectedPlan,groupOf(selectedCity));
 if(/(precio|cuanto cuesta|cuanto sale|valor|costo)/.test(question)){addBubble('El precio de '+names[selectedPlan]+' para '+selectedCity+' es '+(price?fmt(price):'a confirmar con nuestro equipo')+'. ¿Querés consultar una fecha?');return true}
 if(/(duracion|cuanto dura|cuantos minutos|tiempo dura)/.test(question)){addBubble(names[selectedPlan]+' tiene una duración de '+detail.duration+'. ¿Te gustaría consultar una fecha?');return true}
 if(/(que incluye|incluye|que trae|en que consiste)/.test(question)){addBubble(names[selectedPlan]+' incluye: '+detail.includes+' ¿Querés saber algo más o consultar una fecha?');return true}
 return false;
}
// Reconoce ciudad y plan en cualquier parte del mensaje, no solo cuando son la respuesta completa.
function detectCity(text){
 const n=normalized(text);
 const cities=[...liveCities.values()].map(x=>x.name).sort((a,b)=>b.length-a.length);
 return cities.find(city=>{const term=normalized(city).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return new RegExp('(^|[^a-z0-9])'+term+'(?=$|[^a-z0-9])').test(n)})||null;
}
function detectPlan(text){
 const n=normalized(text);
 if(/\b(combo diversion total|combo total)\b/.test(n))return 'combo_total';
 if(/\b(full fest|fullfest)\b/.test(n)&&/\b(acompanamiento|acompanar)\b/.test(n))return 'full_fest_acomp';
 if(/\b(full fest|fullfest)\b/.test(n))return 'full_fest';
 if(/\b(express|expres)\b/.test(n))return 'express';
 if(/\b(escolar|show en escuela|cumple en escuela)\b/.test(n))return 'escolar';
 return Object.keys(names).find(id=>n.includes(normalized(names[id])))||null;
}
// Localidades mencionadas expresamente que todavía no figuran en el catálogo.
// Solo se activa ante expresiones de ubicación, nunca ante una palabra suelta.
function detectUnregisteredCity(text){
 const n=normalized(text);
 const patterns=[
  /\b(?:presupuesto|cotizacion|precio|show|evento|fiesta|cumpleanos|servicio)\s+(?:para|en)\s+([a-z][a-z\s-]{2,45})/,
  /\b(?:soy|somos|estoy|estamos|vivo|vivimos)\s+de\s+([a-z][a-z\s-]{2,45})/,
  /\b(?:mi ciudad es|la ciudad es|sera en|seria en|es en|para la ciudad de|en la ciudad de)\s+([a-z][a-z\s-]{2,45})/,
  /^(?:en|para|desde)\s+([a-z][a-z\s-]{2,45})$/
 ];
 for(const re of patterns){
  const match=n.match(re);if(!match)continue;
  let name=match[1].split(/\b(?:y|pero|porque|con|que|quiero|necesito|para|precio|presupuesto|cotizacion|show|evento|fiesta|cumpleanos|el|la|un|una|del|al|por|favor|cuanto|cuesta|sale|tengo)\b/)[0].trim().replace(/[-\s]+$/,'');
  if(name.length<3||name.split(' ').length>5||/^(todo|todos|ahora|hoy|manana|cualquier|otro|otra|mi casa|domicilio|la tarde)$/.test(name))continue;
  const known=[...liveCities.values()].find(c=>normalized(c.name)===name);
  if(known)return null;
  return name.replace(/\b[a-z]/g,c=>c.toUpperCase());
 }
 return null;
}
function quoteUnregisteredCity(city){
 selectedCity=city;requestedDate=null;requestedTime=null;
 hideCityControls();
 addBubble('🎩✨ ¡Gracias por consultar con Mago Axel!\n\nPor el momento no tengo registrada tu ciudad ('+city+') en nuestro sistema de cotizaciones.\n\nHacé clic en el botón de WhatsApp y un representante te preparará una cotización personalizada para el servicio en tu ciudad.');
 const a=el('a','btn gold','Solicitar cotización por WhatsApp ↗');
 a.href='https://wa.me/595961871700?text='+encodeURIComponent('Hola, quisiera una cotización personalizada de Mago Axel para un evento en '+city+(selectedPlan?'. Me interesa '+names[selectedPlan]:'')+'. ¿Podrían indicarme las opciones y precios para esa ciudad?');
 a.target='_blank';a.rel='noopener noreferrer';a.style.cssText='align-self:flex-start;font-size:.8rem;background:#25D366;color:#fff;border:0;border-radius:40px;text-decoration:none;';
 $('#chat').append(a);$('#chat').scrollTop=$('#chat').scrollHeight;
 phase='unregisteredcity';
}
function handleMessage(message){
 const raw=message.trim();if(!raw)return;addBubble(raw,'user');const n=normalized(raw);
 if(phase==='othercity'){quoteUnregisteredCity(raw);return}
 if(phase==='unregisteredcity' && !detectCity(raw) && !detectUnregisteredCity(raw)){addBubble('Para cotizar tu evento en '+selectedCity+', utilizá el botón de WhatsApp que te compartí. Un representante te atenderá personalmente.');return}
 if(/(otra opcion|otras opciones|otro plan|alternativa|mas opciones|cambiar plan)/.test(n)){if(selectedCity)offerAlternatives(selectedCity);else addBubble('Primero contame en qué ciudad será tu evento.');return}
 const mentionedCity=detectCity(raw),mentionedPlan=detectPlan(raw);
 const unregisteredCity=!mentionedCity?detectUnregisteredCity(raw):null;
 if(unregisteredCity){if(mentionedPlan)selectedPlan=mentionedPlan;quoteUnregisteredCity(unregisteredCity);return}
 if(mentionedCity && mentionedCity!==selectedCity){requestedDate=null;requestedTime=null;selectedCity=mentionedCity;$('#city').value=mentionedCity;hideCityControls();}
 if(mentionedPlan && mentionedPlan!==selectedPlan){requestedDate=null;requestedTime=null;selectedPlan=mentionedPlan;}
 if(!selectedCity){addBubble('¿En qué ciudad será el evento?');return}
 if(!selectedPlan){offerCityCatalog(selectedCity,optionsFor(selectedCity,groupOf(selectedCity)));return}
 if(mentionedCity||mentionedPlan){showPlan(selectedCity,selectedPlan);return}
 if(replyAboutPlan(n))return;
 if(/(no se|todavia no|aun no|sin fecha|no tengo fecha|por definir|mas adelante)/.test(n)){addBubble('¡Sin problema! Cuando tengas una fecha, me la podés indicar. ¿Querés saber algo más sobre el show?');phase='followup';return}
 const date=extractEventDate(raw),time=extractEventTime(raw);
 if(date||time){if(date)requestedDate=date;if(time)requestedTime=time;
  let summary='¡Excelente! 🎩✨ Tengo estos datos de tu evento:\n\nPlan: '+names[selectedPlan]+'\nCiudad: '+selectedCity+'\nFecha: '+(requestedDate||'pendiente')+(requestedTime?'\nHorario: '+requestedTime:'');
  summary+='\n\nPara consultar la disponibilidad real, elegí la fecha y el horario en el selector.';
  if(!requestedTime)summary+='\n\n¿Tenés un horario aproximado para el evento?';
  addBubble(summary);eventDateTimeForm();return;
 }
 if(/^(si|claro|dale|quiero reservar|quiero consultar)$/.test(n)){eventDateTimeForm();return}
 if(/(disponib|reserv|fecha|horario|hora)/.test(n)){addBubble('Podés elegir la fecha y el horario para consultar la agenda.');eventDateTimeForm();return}
 if(phase==='time'){addBubble('¿A qué hora sería el evento? Por ejemplo, «17:00». Si todavía no sabés, podés indicarlo más adelante.');return}
 addBubble('Puedo ayudarte con '+names[selectedPlan]+' en '+selectedCity+'. ¿Querés consultar una fecha, conocer otro plan o preguntar algo específico del show?');
}
function populateCities(){const cities=new Set([...liveCities.values()].map(x=>x.name));const sel=$('#city');sel.querySelectorAll('option:not([value=""])').forEach(o=>o.remove());[...cities].sort((a,b)=>a.localeCompare(b,'es')).forEach(c=>{const o=el('option','',c);o.value=c;sel.append(o)});const other=el('option','','Otra ciudad (cotización personalizada)');other.value='Otra ciudad';sel.append(other)}
async function init(){media=await loadJSON('data/media.json',defaultMedia);catalog=await loadJSON('data/catalogo-base.json',{});await loadCommercialData();renderSlides();restartTimer();setupSliderInteractions();renderPhotos();renderVideos();populateCities();$('#year').textContent=new Date().getFullYear();$('#prev').addEventListener('click',()=>setSlide(slideIndex-1));$('#next').addEventListener('click',()=>setSlide(slideIndex+1));$('#consult').addEventListener('click',consult);const freeTextForm=$('#chat-form');if(freeTextForm)freeTextForm.remove();$('#menu').addEventListener('click',()=>$('#nav').classList.toggle('open'));document.querySelectorAll('nav a').forEach(a=>a.addEventListener('click',()=>$('#nav').classList.remove('open')));document.querySelectorAll('[data-interest]').forEach(a=>a.addEventListener('click',()=>{const name=a.dataset.interest;selectedPlan=planIds[name]||null;addBubble('Me interesa: '+name,'user');if(selectedCity&&selectedPlan)showPlan(selectedCity,selectedPlan);else if(!selectedCity)addBubble('¡Excelente elección! 🎩 ¿En qué ciudad será tu evento? Así puedo darte los detalles y el precio de este plan.')}))}
init();
