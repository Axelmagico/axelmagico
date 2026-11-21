
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const URL = 'https://hxyyvxmockrioesyymhe.supabase.co';
const KEY = 'sb_publishable_NfOs6-XQiiY3_GfLEyZP1A_Z1Bu8DLs';
const BOOKING_FUNCTION = URL + '/functions/v1/axel-confirmar-agendar';

const db = createClient(URL, KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

const $=id=>document.getElementById(id);
const TABLES={precios:'axel_precios',ciudades:'axel_ciudades',planes:'axel_planes',instrucciones:'axel_instrucciones',conocimientos:'axel_conocimientos',reservas:'axel_solicitudes_reserva'};
const TITLES={precios:['Precios y cobertura','Modificá precios existentes y registrá nuevas combinaciones ciudad/plan.'],ciudades:['Ciudades','Agregá o editá las localidades de cobertura.'],planes:['Planes','Actualizá duraciones, nombres e inclusiones.'],instrucciones:['Instrucciones IA','Guardá reglas comerciales y de conversación.'],conocimientos:['Conocimientos','Mantené la información que utilizará Axel IA.'],reservas:['Solicitudes y contrataciones','Registrá contratos de Meta Ads / WhatsApp y administrá estados. Solo Confirmar y agendar bloquea Google Calendar.']};
let tab='precios',records=[],cities=[],plans=[],columns=[],pk='id',editing=null,admin=false;
function say(msg,err=false,id='notice'){const el=$(id);el.textContent=msg;el.classList.toggle('error',err)}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function label(k){return ({codigo:'Código',nombre:'Nombre',duracion_minutos:'Duración (minutos)',incluye:'Qué incluye',precio_guaranies:'Precio (Gs.)',ciudad_id:'Ciudad',plan_id:'Plan',activo:'Activo',creado_en:'Creado',contenido:'Contenido',titulo:'Título',texto:'Texto',instruccion:'Instrucción',prioridad:'Prioridad'}[k]||k.replaceAll('_',' '))}
async function check(){const {data:{session}}=await db.auth.getSession();if(!session){$('login').hidden=false;$('dashboard').hidden=true;return}const {data,error}=await db.rpc('axel_es_admin');if(error||data!==true){await db.auth.signOut();$('login').hidden=false;$('dashboard').hidden=true;say('Esta cuenta no tiene permisos de administrador. Verificá que estés usando la cuenta autorizada.',true,'loginMsg');return}admin=true;$('login').hidden=true;$('dashboard').hidden=false;await load()}
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();say('Comprobando acceso…',false,'loginMsg');const {error}=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});$('password').value='';if(error){say('No se pudo iniciar sesión: '+error.message,true,'loginMsg');return}await check()});
$('logout').onclick=async()=>{await db.auth.signOut();admin=false;records=[];await check()};
document.querySelectorAll('.tab').forEach(b=>b.onclick=async()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');tab=b.dataset.tab;editing=null;await load()});$('refresh').onclick=()=>load();
async function getAll(table){const {data,error}=await db.from(table).select('*').limit(1000);if(error)throw Error(error.message);return data||[]}
async function load(){if(!admin)return;say('Cargando…');$('sectionTitle').textContent=TITLES[tab][0];$('sectionHint').textContent=TITLES[tab][1];$('tableArea').innerHTML='';$('editorArea').innerHTML='';try{if(tab==='reservas'){await loadReservas();return;}[cities,plans,records]=await Promise.all([getAll(TABLES.ciudades),getAll(TABLES.planes),getAll(TABLES[tab])]);columns=Object.keys(records[0]||{});pk=columns.includes('id')?'id':columns.includes('codigo')?'codigo':columns[0];renderFilters();renderTable();say(`${records.length} registros cargados.`)}catch(e){say('Error al consultar Supabase: '+e.message,true)}}
const nameBy=(arr,id)=>arr.find(x=>String(x.id)===String(id))?.nombre||id;
function renderFilters(){const f=$('filters');if(tab!=='precios'){f.innerHTML='<input id="search" placeholder="Buscar en los registros…"><button id="new" class="outline">+ Nuevo registro</button>'; $('search').oninput=renderTable;$('new').onclick=()=>edit(null);return}f.innerHTML='<select id="cityFilter"><option value="">Todas las ciudades</option>'+cities.map(c=>`<option value="${esc(c.id)}">${esc(c.nombre)}</option>`).join('')+'</select><select id="planFilter"><option value="">Todos los planes</option>'+plans.map(p=>`<option value="${esc(p.id)}">${esc(p.nombre)}</option>`).join('')+'</select><button id="new" class="outline">+ Nuevo precio</button>';$('cityFilter').onchange=renderTable;$('planFilter').onchange=renderTable;$('new').onclick=()=>edit(null)}
function renderTable(){let rows=records;if(tab==='precios'){const c=$('cityFilter')?.value,p=$('planFilter')?.value;rows=rows.filter(r=>(!c||String(r.ciudad_id)===c)&&(!p||String(r.plan_id)===p))}else{const q=($('search')?.value||'').toLowerCase();rows=rows.filter(r=>JSON.stringify(r).toLowerCase().includes(q))}const display=tab==='precios'?['ciudad_id','plan_id','precio_guaranies']:columns.filter(k=>!['creado_en','actualizado_en'].includes(k)).slice(0,5);if(!display.length){$('tableArea').innerHTML='<p class="empty">Todavía no hay registros en esta tabla. Podés crear el primero.</p>';return}let html='<div class="tablewrap"><table><thead><tr>'+display.map(k=>`<th>${esc(label(k))}</th>`).join('')+'<th>Acción</th></tr></thead><tbody>';for(const [i,r] of rows.entries()){html+='<tr>'+display.map(k=>{let v=r[k];if(k==='ciudad_id')v=nameBy(cities,v);if(k==='plan_id')v=nameBy(plans,v);if(typeof v==='boolean')v=v?'Sí':'No';if(k==='precio_guaranies')v=v==null?'Pendiente':'Gs. '+Number(v).toLocaleString('es-PY');return `<td>${esc(String(v??'—').slice(0,130))}</td>`}).join('')+`<td><button class="outline editbtn" data-i="${i}">Editar</button></td></tr>`}html+='</tbody></table></div>';$('tableArea').innerHTML=html;$('tableArea').querySelectorAll('.editbtn').forEach(b=>b.onclick=()=>edit(rows[Number(b.dataset.i)]))}
function fieldsFor(r){if(tab==='precios')return ['ciudad_id','plan_id','precio_guaranies',...columns.filter(k=>!['id','ciudad_id','plan_id','precio_guaranies','creado_en','actualizado_en'].includes(k))];if(columns.length)return columns.filter(k=>!['id','creado_en','actualizado_en'].includes(k));return ({ciudades:['nombre','activo'],planes:['codigo','nombre','duracion_minutos','incluye','activo'],instrucciones:['titulo','contenido'],conocimientos:['titulo','contenido']}[tab]||[])}
function inputFor(k,v){if(k==='ciudad_id'||k==='plan_id'){const arr=k==='ciudad_id'?cities:plans;return `<select name="${esc(k)}" required><option value="">Elegí una opción</option>${arr.map(x=>`<option value="${esc(x.id)}" ${String(x.id)===String(v)?'selected':''}>${esc(x.nombre)}</option>`).join('')}</select>`}if(typeof v==='boolean'||k==='activo')return `<select name="${esc(k)}"><option value="true" ${v!==false?'selected':''}>Sí</option><option value="false" ${v===false?'selected':''}>No</option></select>`;if(['incluye','contenido','texto','instruccion','descripcion'].includes(k))return `<textarea name="${esc(k)}">${esc(v??'')}</textarea>`;let type=['precio_guaranies','duracion_minutos','prioridad','orden'].includes(k)?'number':'text';return `<input name="${esc(k)}" type="${type}" ${type==='number'?'min="0" step="1"':''} value="${esc(v??'')}">`}
function edit(r){editing=r;const keys=fieldsFor(r);$('editorArea').innerHTML=`<form id="editForm" class="editor"><h3>${r?'Editar registro':'Crear registro'}</h3><div class="formgrid">${keys.map(k=>`<div class="${['incluye','contenido','texto','instruccion','descripcion'].includes(k)?'wide':''}"><label>${esc(label(k))}${inputFor(k,r?.[k])}</label></div>`).join('')}</div><div class="actions"><button type="submit">Guardar cambios</button><button type="button" id="cancel" class="outline">Cancelar</button></div><p class="msg" id="saveMsg" role="status"></p></form>`;$('cancel').onclick=()=>{$('editorArea').innerHTML=''};$('editForm').onsubmit=save;$('editorArea').scrollIntoView({behavior:'smooth',block:'nearest'})}
async function save(e){e.preventDefault();if(!admin)return;const form=e.currentTarget;const data={};for(const el of form.elements){if(!el.name)continue;const raw=el.value.trim();if(el.name==='precio_guaranies')data[el.name]=raw===''?null:Number(raw);else if(['duracion_minutos','prioridad','orden'].includes(el.name))data[el.name]=raw===''?null:Number(raw);else if(el.name==='activo')data[el.name]=raw==='true';else if(['ciudad_id','plan_id'].includes(el.name))data[el.name]=Number(raw);else data[el.name]=raw}if(tab==='precios'&&!editing&&records.some(r=>String(r.ciudad_id)===String(data.ciudad_id)&&String(r.plan_id)===String(data.plan_id))){say('Ya existe esta combinación de ciudad y plan. Editá el registro existente.',true,'saveMsg');return}say('Guardando…',false,'saveMsg');let q;if(editing){if(!pk){say('No se encontró una clave primaria para actualizar.',true,'saveMsg');return}q=db.from(TABLES[tab]).update(data).eq(pk,editing[pk])}else q=db.from(TABLES[tab]).insert(data);const {error}=await q;if(error){say('No se pudo guardar: '+error.message,true,'saveMsg');return}await load();say('Cambios guardados correctamente en Supabase.')}


// Registro manual: la RPC valida sesión, permisos, catálogo y precio dentro de Supabase.
// El navegador nunca inserta directamente en la tabla privada.
async function showManualBookingForm(){
 if(!admin)return;
 const root=$('editorArea');root.replaceChildren();
 const form=document.createElement('form');form.className='editor manual-booking';form.id='manualBookingForm';
 const h=document.createElement('h3');h.textContent='Nueva contratación manual';form.append(h);
 const intro=document.createElement('p');intro.className='muted';intro.textContent='Para consultas de Meta Ads / WhatsApp. Registrar no bloquea el horario: primero guardá el contacto y, cuando corresponda, usá «Confirmar y agendar».';form.append(intro);
 const grid=document.createElement('div');grid.className='formgrid';form.append(grid);
 function field(title,type,name,required=true){
  const box=document.createElement('div'),label=document.createElement('label'),input=document.createElement('input');
  label.textContent=title;input.type=type;input.name=name;input.required=required;input.autocomplete='off';
  label.append(input);box.append(label);grid.append(box);return input;
 }
 function dropdown(title,name,choices){
  const box=document.createElement('div'),label=document.createElement('label'),select=document.createElement('select');
  label.textContent=title;select.name=name;select.required=true;
  for(const [value,text] of choices){const opt=document.createElement('option');opt.value=String(value);opt.textContent=text;select.append(opt)}
  label.append(select);box.append(label);grid.append(box);return select;
 }
 const origin=dropdown('Origen de contratación','origen',[
  ['meta_ads_whatsapp','Meta Ads / WhatsApp'],['directo','Contratación directa'],['otro','Otro canal']]);
 const name=field('Nombre y apellido','text','nombre');name.maxLength=100;
 const phone=field('WhatsApp del cliente','tel','telefono');phone.maxLength=30;
 const city=dropdown('Ciudad','ciudad',[['','Seleccioná una ciudad']]);
 const plan=dropdown('Plan','plan',[['','Seleccioná un plan']]);
 const price=document.createElement('p');price.className='manual-price';price.setAttribute('role','status');price.textContent='Precio: elegí ciudad y plan';grid.append(price);
 const day=field('Fecha del evento','date','fecha');
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Asuncion',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 day.min=today;
 const time=field('Hora del evento','time','hora');
 const state=dropdown('Estado inicial','estado',[['pendiente','Pendiente'],['contratado','Contratado (aún no agendado)']]);
 const address=field('Dirección (opcional)','text','direccion',false);address.maxLength=250;
 const noteBox=document.createElement('div');noteBox.className='wide';
 const noteLabel=document.createElement('label');noteLabel.textContent='Notas / referencia de Meta Ads (opcional)';
 const notes=document.createElement('textarea');notes.maxLength=500;notes.rows=3;notes.name='notas';noteLabel.append(notes);noteBox.append(noteLabel);grid.append(noteBox);
 const actions=document.createElement('div');actions.className='actions';
 const save=document.createElement('button');save.type='submit';save.textContent='Guardar contratación';
 const cancel=document.createElement('button');cancel.type='button';cancel.className='outline';cancel.textContent='Cancelar';cancel.onclick=()=>root.replaceChildren();
 actions.append(save,cancel);form.append(actions);
 const feedback=document.createElement('p');feedback.className='msg';feedback.setAttribute('role','status');form.append(feedback);
 root.append(form);root.scrollIntoView({behavior:'smooth',block:'nearest'});
 let catalogCities=[],catalogPlans=[],catalogPrices=[];
 function options(select,choices,placeholder){select.replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent=placeholder;select.append(empty);
  for(const [v,title] of choices){const item=document.createElement('option');item.value=String(v);item.textContent=title;select.append(item)}
 }
 function plansForCity(){
  const enabled=catalogPrices.filter(x=>String(x.ciudad_id)===city.value && x.disponible===true);
  const allowed=new Set(enabled.map(x=>String(x.plan_id)));
  options(plan,catalogPlans.filter(x=>x.activo===true&&allowed.has(String(x.id))).map(x=>[x.id,x.nombre]),'Seleccioná un plan');
  price.textContent='Precio: elegí un plan';
 }
 city.onchange=plansForCity;
 plan.onchange=()=>{
  const row=catalogPrices.find(x=>String(x.ciudad_id)===city.value&&String(x.plan_id)===plan.value&&x.disponible===true);
  price.textContent=row?'Precio vigente: Gs. '+Number(row.precio_guaranies).toLocaleString('es-PY'):'Precio no disponible';
 };
 feedback.textContent='Cargando catálogo vigente…';save.disabled=true;
 try{
  [catalogCities,catalogPlans,catalogPrices]=await Promise.all([
   getAll(TABLES.ciudades),getAll(TABLES.planes),getAll(TABLES.precios)]);
  options(city,catalogCities.filter(x=>x.activo===true).map(x=>[x.id,x.nombre]),'Seleccioná una ciudad');
  feedback.textContent='';save.disabled=false;
 }catch(err){feedback.classList.add('error');feedback.textContent='No se pudo cargar el catálogo: '+err.message;return;}
 form.onsubmit=async e=>{
  e.preventDefault();if(save.disabled||!form.reportValidity())return;
  if(!catalogPrices.some(x=>String(x.ciudad_id)===city.value&&String(x.plan_id)===plan.value&&x.disponible===true)){
   feedback.textContent='La combinación ciudad/plan no está habilitada.';feedback.classList.add('error');return;
  }
  const fullName=name.value.trim().replace(/\s+/g,' '),digits=phone.value.replace(/\D/g,'');
  if(fullName.length<3||!fullName.includes(' ')){feedback.textContent='Ingresá nombre y apellido.';feedback.classList.add('error');return}
  if(digits.length<9||digits.length>15){feedback.textContent='Ingresá un WhatsApp válido.';feedback.classList.add('error');return}
  if(!window.confirm('¿Guardar contratación de '+fullName+' como «'+statusLabel(state.value)+'»? No se creará aún el evento en Google Calendar.'))return;
  save.disabled=true;feedback.classList.remove('error');feedback.textContent='Guardando en Supabase…';
  try{
   const {data,error}=await db.rpc('axel_crear_solicitud_manual',{
    p_nombre:fullName,p_telefono:phone.value.trim(),p_ciudad_id:Number(city.value),p_plan_id:Number(plan.value),
    p_fecha:day.value,p_hora:time.value,p_estado:state.value,p_origen:origin.value,
    p_direccion:address.value.trim(),p_notas:notes.value.trim()});
   if(error)throw Error(error.message);
   await loadReservas();
   say('Contratación manual registrada. ID: '+data+' · Para bloquear la fecha, marcá Contratado y usá «Confirmar y agendar».');
  }catch(err){save.disabled=false;feedback.classList.add('error');feedback.textContent='No se pudo guardar: '+(err instanceof Error?err.message:'Error desconocido');}
 };
}

// Panel privado: consulta de solicitudes. No confirma reservas ni modifica Calendar.
async function loadReservas(){
 const {data,error}=await db.from('axel_solicitudes_reserva')
  .select('id,creado_en,nombre_cliente,telefono,ciudad,direccion,plan_codigo,plan_nombre,precio_guaranies,fecha_evento,hora_evento,duracion_minutos,estado,notas,calendar_event_id,agendado_en,origen')
  .order('creado_en',{ascending:false}).limit(200);
 if(error)throw Error(error.message);
 records=data||[];
 const f=$('filters');f.replaceChildren();
 const search=document.createElement('input');search.id='reservationSearch';search.type='search';search.placeholder='Buscar cliente, teléfono o ciudad…';search.setAttribute('aria-label','Buscar solicitudes');
 const filter=document.createElement('select');filter.id='reservationFilter';filter.setAttribute('aria-label','Filtrar por estado');
 for(const [value,title] of [['','Todos los estados'],['pendiente','Pendientes'],['contratado','Contratados'],['no_contrato','No contrató'],['confirmada','Confirmadas (histórico)'],['rechazada','Rechazadas (histórico)'],['cancelada','Canceladas (histórico)']]){
  const option=document.createElement('option');option.value=value;option.textContent=title;filter.append(option)
 }
 search.addEventListener('input',renderReservations);filter.addEventListener('change',renderReservations);
 const originFilter=document.createElement('select');originFilter.id='reservationOrigin';originFilter.setAttribute('aria-label','Filtrar por origen');
 for(const [value,title] of [['','Todos los orígenes'],['axel_ia','Axel IA / Web'],['meta_ads_whatsapp','Meta Ads / WhatsApp'],['directo','Contratación directa'],['otro','Otro']]){
  const option=document.createElement('option');option.value=value;option.textContent=title;originFilter.append(option);
 }
 originFilter.addEventListener('change',renderReservations);
 const add=document.createElement('button');add.type='button';add.textContent='+ Nueva contratación manual';add.addEventListener('click',showManualBookingForm);
 f.append(search,filter,originFilter,add);
 renderReservations();say(`${records.length} solicitudes cargadas (máximo 200).`);
}
function originLabel(s){return ({axel_ia:'Axel IA / Web',meta_ads_whatsapp:'Meta Ads / WhatsApp',directo:'Contratación directa',otro:'Otro'})[s]||'Axel IA / Web'}
function statusLabel(s){return ({pendiente:'Pendiente',contratado:'Contratado',no_contrato:'No contrató',confirmada:'Confirmada (histórico)',rechazada:'Rechazada (histórico)',cancelada:'Cancelada (histórico)'})[s]||s||'Pendiente'}
function phoneToWa(raw){
 let digits=String(raw||'').replace(/\D/g,'');
 if(/^0?9\d{8}$/.test(digits))digits='595'+digits.replace(/^0/,'');
 if(!/^\d{9,15}$/.test(digits))return null;
 return digits;
}
function reservationLabelDate(value){
 if(!value)return 'Sin fecha';
 const d=String(value).slice(0,10).split('-');return d.length===3?`${d[2]}/${d[1]}/${d[0]}`:String(value);
}
function renderReservations(){
 const root=$('tableArea');root.replaceChildren();$('editorArea').replaceChildren();
 const status=$('reservationFilter')?.value||'';
 const origin=$('reservationOrigin')?.value||'';
 const query=($('reservationSearch')?.value||'').trim().toLocaleLowerCase('es');
 const rows=records.filter(r=>(!status||r.estado===status)&&(!origin||(r.origen||'axel_ia')===origin)&&(!query||[r.nombre_cliente,r.telefono,r.ciudad,r.plan_nombre,r.id].some(v=>String(v||'').toLocaleLowerCase('es').includes(query))));
 const summary=document.createElement('div');summary.className='reservation-summary';
 const pending=records.filter(r=>r.estado==='pendiente').length;
 const hired=records.filter(r=>r.estado==='contratado').length;
 const expired=records.filter(r=>r.estado==='no_contrato').length;
 summary.textContent=`${rows.length} resultados · ${pending} pendientes · ${hired} contratados · ${expired} no contrataron (últimos ${records.length} registros)`;
 root.append(summary);
 if(!rows.length){const p=document.createElement('p');p.className='empty';p.textContent='No hay solicitudes para estos filtros.';root.append(p);return}
 const wrap=document.createElement('div');wrap.className='tablewrap';
 const table=document.createElement('table');
 const head=document.createElement('thead'),tr=document.createElement('tr');
 for(const title of ['Recibida','Cliente','Contacto','Evento','Servicio','Precio','Origen','Estado','Detalles']){const th=document.createElement('th');th.textContent=title;tr.append(th)}head.append(tr);table.append(head);
 const body=document.createElement('tbody');
 for(const r of rows){
  const row=document.createElement('tr');
  const fecha=reservationLabelDate(r.fecha_evento)+' · '+String(r.hora_evento||'').slice(0,5);
  const values=[new Date(r.creado_en).toLocaleString('es-PY',{timeZone:'America/Asuncion'}),r.nombre_cliente||'—',r.telefono||'—',fecha+' · '+(r.ciudad||''),r.plan_nombre||r.plan_codigo||'—',r.precio_guaranies==null?'A confirmar':'Gs. '+Number(r.precio_guaranies).toLocaleString('es-PY'),originLabel(r.origen),statusLabel(r.estado)];
  for(const value of values){const td=document.createElement('td');td.textContent=value;row.append(td)}
  const td=document.createElement('td'),button=document.createElement('button');button.className='outline';button.type='button';button.textContent='Ver';button.addEventListener('click',()=>showReservation(r));td.append(button);row.append(td);body.append(row);
 }
 table.append(body);wrap.append(table);root.append(wrap);
}
function showReservation(r){
 const root=$('editorArea');root.replaceChildren();const section=document.createElement('section');section.className='editor';
 const h=document.createElement('h3');h.textContent='Detalle de solicitud';section.append(h);
 const fields=[['ID',r.id],['Recibida',new Date(r.creado_en).toLocaleString('es-PY',{timeZone:'America/Asuncion'})],['Nombre',r.nombre_cliente],['WhatsApp',r.telefono],['Ciudad',r.ciudad],['Dirección',r.direccion],['Plan',r.plan_nombre||r.plan_codigo],['Precio',r.precio_guaranies==null?'A confirmar':'Gs. '+Number(r.precio_guaranies).toLocaleString('es-PY')],['Fecha',reservationLabelDate(r.fecha_evento)],['Hora',String(r.hora_evento||'').slice(0,5)],['Duración (min)',r.duracion_minutos],['Estado',statusLabel(r.estado)],['Origen',originLabel(r.origen)],['En Google Calendar',r.calendar_event_id?'Sí · '+r.calendar_event_id:'No'],['Agendada el',r.agendado_en?new Date(r.agendado_en).toLocaleString('es-PY',{timeZone:'America/Asuncion'}):'—'],['Notas',r.notas]];
 for(const [name,value] of fields){const p=document.createElement('p');const strong=document.createElement('strong');strong.textContent=name+': ';p.append(strong,document.createTextNode(String(value??'—')));section.append(p)}
 const note=document.createElement('p');note.className='muted';note.textContent='Contratado es un estado comercial. Solo Confirmar y agendar bloquea la fecha en Google Calendar. Las pendientes vencen a los 30 días.';section.append(note);
 if(['pendiente','contratado','no_contrato'].includes(r.estado) && !r.calendar_event_id){
   const form=document.createElement('form');form.className='reservation-state-form';
   const label=document.createElement('label');label.textContent='Cambiar estado comercial';
   const select=document.createElement('select');select.setAttribute('aria-label','Estado de la solicitud');
   for(const [code,title] of [['pendiente','Pendiente'],['contratado','Contratado'],['no_contrato','No contrató']]){
     const option=document.createElement('option');option.value=code;option.textContent=title;option.selected=r.estado===code;select.append(option);
   }
   const saveButton=document.createElement('button');saveButton.type='submit';saveButton.textContent='Guardar estado';
   const feedback=document.createElement('p');feedback.className='msg';feedback.setAttribute('role','status');
   label.append(select);form.append(label,saveButton,feedback);
   form.addEventListener('submit',async event=>{
     event.preventDefault();if(!admin||saveButton.disabled)return;
     if(select.value===r.estado){feedback.textContent='El estado ya tiene ese valor.';return;}
     if(!window.confirm('¿Cambiar la solicitud a «'+statusLabel(select.value)+'»?'))return;
     saveButton.disabled=true;feedback.textContent='Guardando cambio…';
     const {data,error}=await db.rpc('axel_cambiar_estado_solicitud',{p_id:r.id,p_estado:select.value});
     saveButton.disabled=false;
     if(error){feedback.textContent='No se pudo modificar el estado: '+error.message;feedback.classList.add('error');return;}
     r.estado=data||select.value;
     feedback.classList.remove('error');feedback.textContent='Estado actualizado en Supabase.';
     renderReservations();showReservation(r);
     say('Estado de solicitud actualizado correctamente.');
   });
   section.append(form);
 }
 if(r.estado==='contratado'){
  const panel=document.createElement('div');panel.className='booking-confirm-panel';
  const head=document.createElement('strong');head.textContent='📅 Google Calendar';panel.append(head);
  const status=document.createElement('p');status.className='muted';
  status.textContent=r.calendar_event_id?'Esta solicitud ya fue agendada. No se creará un segundo evento.':'Todavía no se bloqueó la fecha. Verificaremos el horario y el margen de 90 minutos antes de crear el evento.';panel.append(status);
  if(!r.calendar_event_id){
   const btn=document.createElement('button');btn.type='button';btn.textContent='✓ Confirmar y agendar';btn.className='booking-confirm-btn';
   const feedback=document.createElement('p');feedback.className='msg';feedback.setAttribute('role','status');panel.append(btn,feedback);
   btn.onclick=async()=>{
    if(!admin||btn.disabled)return;
    const question=`¿Confirmar y agendar la contratación de ${r.nombre_cliente} para ${reservationLabelDate(r.fecha_evento)} a las ${String(r.hora_evento||'').slice(0,5)}? Esta acción creará un evento en Google Calendar.`;
    if(!window.confirm(question))return;
    btn.disabled=true;feedback.textContent='Comprobando disponibilidad y agendando…';feedback.classList.remove('error');
    try{
     const {data:{session},error:sessionError}=await db.auth.getSession();
     if(sessionError||!session?.access_token)throw Error('Volvé a iniciar sesión de administrador.');
     const res=await fetch(BOOKING_FUNCTION,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY,'Authorization':'Bearer '+session.access_token},body:JSON.stringify({solicitud_id:r.id}),signal:AbortSignal.timeout(45000)});
     const body=await res.json().catch(()=>({}));
     if(!res.ok||body.ok!==true)throw Error(body.mensaje||'No se pudo agendar (HTTP '+res.status+').');
     r.calendar_event_id=body.calendar_event_id;r.agendado_en=body.agendado_en||new Date().toISOString();
     say('Reserva creada en Google Calendar.');renderReservations();showReservation(r);
    }catch(e){feedback.classList.add('error');feedback.textContent=e instanceof Error?e.message:'Error al agendar.';btn.disabled=false;}
   };
  }
  section.append(panel);
 }
 const digits=phoneToWa(r.telefono);
 if(digits){const a=document.createElement('a');const message=`Hola ${r.nombre_cliente||''}, te escribimos de Mago Axel por tu solicitud ${r.id}. Queremos coordinar tu ${r.plan_nombre||'show'} del ${reservationLabelDate(r.fecha_evento)} a las ${String(r.hora_evento||'').slice(0,5)} en ${r.ciudad||'tu ciudad'}.`;
  a.href='https://wa.me/'+digits+'?text='+encodeURIComponent(message);a.target='_blank';a.rel='noopener noreferrer';a.className='reservation-link';a.textContent='💬 Contactar al cliente por WhatsApp';section.append(a)
 }
 root.append(section);section.scrollIntoView({behavior:'smooth',block:'nearest'});
}

check();
