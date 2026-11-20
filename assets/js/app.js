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
 a.addEventListener('click',()=>{addBubble('Me interesa: '+a.dataset.slideInterest,'user');addBubble('¡Excelente elección! Seleccioná tu ciudad para conocer las opciones y tarifas disponibles.')});
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
const names={escolar:'Show para cumple en escuela',express:'Show Express',full_fest:'Show Full Fest',full_fest_acomp:'Show Full Fest + Acompañamiento',combo_total:'Combo Diversión Total'};
function groupOf(city){const c=normalized(city);for(const [group,data] of Object.entries(catalog?.grupos||{})){if((data.ciudades||[]).some(x=>normalized(x)===c))return group}return 'D'}
function optionsFor(city,group){
 const c=normalized(city);
 const entry=Object.entries(catalog?.cobertura_especifica||{}).find(([name])=>normalized(name)===c)?.[1];
 if(entry)return entry.planes_charlie;
 return catalog?.grupos?.[group]?.planes_charlie||catalog?.grupos?.D?.planes_charlie||['full_fest_acomp'];
}
function priceFor(city,plan,group){
 const c=normalized(city);
 const entry=Object.entries(catalog?.cobertura_especifica||{}).find(([name])=>normalized(name)===c)?.[1];
 if(entry)return typeof entry.precios?.[plan]==='number'?entry.precios[plan]:null;
 const explicit=(catalog?.tarifas_especiales||[]).find(x=>normalized(x.ciudad)===c&&x.plan===plan&&typeof x.precio==='number');
 if(explicit)return explicit.precio;
 if(group==='A'&&plan==='full_fest_acomp')return 650000;
 if(group==='A'&&plan==='combo_total')return 1150000;
 if(group==='A'&&plan==='express')return 450000;
 return null;
}
function planNote(city,plan){
 const c=normalized(city);
 const entry=Object.entries(catalog?.cobertura_especifica||{}).find(([name])=>normalized(name)===c)?.[1];
 return entry?.notas?.[plan]||'';
}
let selectedPlan=null, selectedCity=null;
const planIds={
 'Show para cumple en escuela':'escolar', 'Show Express':'express', 'Show Full Fest':'full_fest',
 'Full Fest + Acompañamiento':'full_fest_acomp', 'Combo Diversión Total':'combo_total'
};
function addBubble(text,who='bot'){const chat=$('#chat');chat.append(el('div','bubble '+who,text));chat.scrollTop=chat.scrollHeight}
function addWhatsapp(city,plan){
 const chat=$('#chat'),a=document.createElement('a');
 const detail=plan?names[plan]:'una experiencia mágica';
 a.href='https://wa.me/595961871700?text='+encodeURIComponent('Hola, soy de '+city+'. Me interesa '+detail+'. Quisiera consultar una reserva con Mago Axel.');
 a.target='_blank';a.rel='noopener noreferrer';a.textContent='Consultar este plan por WhatsApp ↗';a.className='btn gold';a.style.cssText='align-self:flex-start;font-size:.8rem';chat.append(a);chat.scrollTop=chat.scrollHeight;
}
function showPlan(city,plan){
 const group=groupOf(city),opts=optionsFor(city,group);
 if(!opts.includes(plan)){
  addBubble('Por el momento '+names[plan]+' no tiene cobertura en '+city+'. Si querés, puedo mostrarte las alternativas habilitadas para esa ciudad.');
  offerAlternatives(city,opts);return;
 }
 const price=priceFor(city,plan,group),note=planNote(city,plan);
 let out='¡Excelente elección! ✨\n\n'+names[plan]+' para '+city+'.\n'+(price?'Precio: '+fmt(price):'Precio: a confirmar directamente con nuestro equipo.')+(note?'\n'+note:'');
 if(plan==='escolar')out+='\nLa cobertura del show escolar está sujeta a confirmar el límite de 25 km desde Asunción.';
 out+='\n\n¿Te gustaría consultar una fecha para este plan?';
 addBubble(out);addWhatsapp(city,plan);
 const actions=el('div','chat-plan-actions');actions.style.cssText='display:flex;flex-wrap:wrap;gap:8px';const b=el('button','btn ghost dark','Ver otras opciones para '+city);b.type='button';b.style.cssText='font-size:.78rem;padding:10px 13px';b.addEventListener('click',()=>offerAlternatives(city,opts));actions.append(b);$('#chat').append(actions);$('#chat').scrollTop=$('#chat').scrollHeight;
}
function offerAlternatives(city,opts){
 const others=opts.filter(p=>p!==selectedPlan);
 if(!others.length){addBubble('Por ahora no tenemos otros planes habilitados para '+city+'.');return}
 addBubble('También contamos con estas alternativas disponibles en '+city+'. Elegí una si querés conocerla:');
 const box=el('div','chat-plan-actions');box.style.cssText='display:flex;flex-wrap:wrap;gap:8px';
 others.forEach(p=>{const b=el('button','btn ghost dark',names[p]);b.type='button';b.style.cssText='font-size:.78rem;padding:10px 13px';b.addEventListener('click',()=>{selectedPlan=p;addBubble(names[p],'user');showPlan(city,p)});box.append(b)});
 $('#chat').append(box);$('#chat').scrollTop=$('#chat').scrollHeight;
}
function consult(){
 const city=$('#city').value;
 if(!city){addBubble('Seleccioná la ciudad de tu evento para continuar.');return}
 selectedCity=city;addBubble(city,'user');
 if(city==='Otra ciudad'){addBubble('Para tu ciudad necesitamos confirmar cobertura y tarifas de manera personalizada. Escribinos por WhatsApp para ayudarte.');addWhatsapp(city,selectedPlan);return}
 if(!selectedPlan){addBubble('Para evitar confusiones, primero elegí el plan que te interesa en la sección Planes y Servicios. Así te mostraré únicamente esa propuesta.');return}
 showPlan(city,selectedPlan);
}
function populateCities(){const cities=new Set();Object.values(catalog?.grupos||{}).forEach(g=>(g.ciudades||[]).forEach(c=>cities.add(c)));Object.keys(catalog?.cobertura_especifica||{}).forEach(c=>cities.add(c));['Ciudad del Este','Encarnación'].forEach(c=>cities.add(c));const sel=$('#city');[...cities].sort((a,b)=>a.localeCompare(b,'es')).forEach(c=>{const o=el('option','',c);o.value=c;sel.append(o)});const other=el('option','','Otra ciudad (cotización personalizada)');other.value='Otra ciudad';sel.append(other)}
async function init(){media=await loadJSON('data/media.json',defaultMedia);catalog=await loadJSON('data/catalogo-base.json',{});renderSlides();restartTimer();setupSliderInteractions();renderPhotos();renderVideos();populateCities();$('#year').textContent=new Date().getFullYear();$('#prev').addEventListener('click',()=>setSlide(slideIndex-1));$('#next').addEventListener('click',()=>setSlide(slideIndex+1));$('#consult').addEventListener('click',consult);$('#reset-chat').addEventListener('click',()=>{$('#chat').replaceChildren();selectedPlan=null;selectedCity=null;addBubble('¡Hola! 🎩✨ Elegí el plan que te interesa y contame en qué ciudad será tu evento.');$('#city').value='' });$('#menu').addEventListener('click',()=>$('#nav').classList.toggle('open'));document.querySelectorAll('nav a').forEach(a=>a.addEventListener('click',()=>$('#nav').classList.remove('open')));document.querySelectorAll('[data-interest]').forEach(a=>a.addEventListener('click',()=>{const name=a.dataset.interest;selectedPlan=planIds[name]||null;addBubble('Me interesa: '+name,'user');if(selectedCity&&selectedPlan){addBubble('¡Perfecto! Veamos esa opción para '+selectedCity+'.');showPlan(selectedCity,selectedPlan)}else addBubble('¡Excelente elección! 🎩 Seleccioná la ciudad de tu evento para conocer únicamente el precio y la cobertura de este plan.')}))}
init();
