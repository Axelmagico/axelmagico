
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const URL = 'https://hxyyvxmockrioesyymhe.supabase.co';
const KEY = 'sb_publishable_NfOs6-XQiiY3_GfLEyZP1A_Z1Bu8DLs';
const BOOKING_FUNCTION = URL + '/functions/v1/axel-confirmar-agendar';
const MANAGEMENT_FUNCTION = URL + '/functions/v1/axel-gestionar-reserva';

const db = createClient(URL, KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

const $=id=>document.getElementById(id);
const TABLES={precios:'axel_precios',ciudades:'axel_ciudades',planes:'axel_planes',instrucciones:'axel_instrucciones',conocimientos:'axel_conocimientos',reservas:'axel_solicitudes_reserva'};
const TITLES={precios:['Precios y cobertura','Modificá precios existentes y registrá nuevas combinaciones ciudad/plan.'],ciudades:['Ciudades','Agregá o editá las localidades de cobertura.'],planes:['Planes','Actualizá duraciones, nombres e inclusiones.'],instrucciones:['Instrucciones IA','Guardá reglas comerciales y de conversación.'],conocimientos:['Conocimientos','Mantené la información que utilizará Axel IA.'],reservas:['Solicitudes y contrataciones','Registrá contratos de Meta Ads / WhatsApp y administrá estados. Solo Confirmar y agendar bloquea Google Calendar.'],videos:['Videos del sitio · V9','Administrá videos MP4 verticales 9:16. Cambiá el orden arrastrando y guardá las posiciones.']};
let tab='precios',records=[],cities=[],plans=[],columns=[],pk='id',editing=null,admin=false;
// Archivado V6: solo lectura/listado mediante RPC; las escrituras pasan por la RPC de administrador.
let archivedReservationIds=new Set();
function say(msg,err=false,id='notice'){const el=$(id);el.textContent=msg;el.classList.toggle('error',err)}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function label(k){return ({codigo:'Código',nombre:'Nombre',duracion_minutos:'Duración (minutos)',incluye:'Qué incluye',precio_guaranies:'Precio (Gs.)',ciudad_id:'Ciudad',plan_id:'Plan',activo:'Activo',creado_en:'Creado',contenido:'Contenido',titulo:'Título',texto:'Texto',instruccion:'Instrucción',prioridad:'Prioridad'}[k]||k.replaceAll('_',' '))}
async function check(){const {data:{session}}=await db.auth.getSession();if(!session){$('login').hidden=false;$('dashboard').hidden=true;return}const {data,error}=await db.rpc('axel_es_admin');if(error||data!==true){await db.auth.signOut();$('login').hidden=false;$('dashboard').hidden=true;say('Esta cuenta no tiene permisos de administrador. Verificá que estés usando la cuenta autorizada.',true,'loginMsg');return}admin=true;$('login').hidden=true;$('dashboard').hidden=false;await load()}
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();say('Comprobando acceso…',false,'loginMsg');const {error}=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});$('password').value='';if(error){say('No se pudo iniciar sesión: '+error.message,true,'loginMsg');return}await check()});
$('logout').onclick=async()=>{await db.auth.signOut();admin=false;records=[];await check()};
// V9: se agrega una pestaña sin modificar la estructura existente de index.html.
const axelTabReferencia=document.querySelector('.tab[data-tab="reservas"]')||document.querySelector('.tab');
if(axelTabReferencia){
 const b=document.createElement('button');b.type='button';b.className='tab';b.dataset.tab='videos';b.textContent='🎬 Videos del sitio';
 axelTabReferencia.parentElement.append(b);
}
document.querySelectorAll('.tab').forEach(b=>b.onclick=async()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');tab=b.dataset.tab;editing=null;await load()});$('refresh').onclick=()=>load();
async function getAll(table){const {data,error}=await db.from(table).select('*').limit(1000);if(error)throw Error(error.message);return data||[]}
async function load(){if(!admin)return;say('Cargando…');$('sectionTitle').textContent=TITLES[tab][0];$('sectionHint').textContent=TITLES[tab][1];$('tableArea').innerHTML='';$('editorArea').innerHTML='';try{if(tab==='reservas'){await loadReservas();return;}if(tab==='videos'){await axelV9LoadVideos();return;}[cities,plans,records]=await Promise.all([getAll(TABLES.ciudades),getAll(TABLES.planes),getAll(TABLES[tab])]);columns=Object.keys(records[0]||{});pk=columns.includes('id')?'id':columns.includes('codigo')?'codigo':columns[0];renderFilters();renderTable();say(`${records.length} registros cargados.`)}catch(e){say('Error al consultar Supabase: '+e.message,true)}}
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
  const occasion=dropdown('Ocasión del evento','ocasion',[['','Seleccioná la ocasión'],['cumpleanos','Cumpleaños'],['dia_nino','Día del Niño'],['empresarial','Empresarial']]);
  const relation=dropdown('Vínculo de quien contrata','vinculo',[['','Seleccioná vínculo'],['mama','Mamá'],['papa','Papá'],['abuelos','Abuelos'],['tios','Tíos'],['padrinos','Padrinos'],['otros','Otros']]);
  const relationParent=relation.closest('div');
 const origin=dropdown('Origen de contratación','origen',[
  ['meta_ads_whatsapp','Meta Ads / WhatsApp'],['directo','Contratación directa'],['otro','Otro canal']]);
 const name=field('Nombre y apellido','text','nombre');name.maxLength=100;
 const phone=field('WhatsApp del cliente','tel','telefono');phone.maxLength=30;
  const childName=field('Nombre del niño/a','text','cumpleanero');childName.maxLength=200;
  const age=field('Edad que cumple','number','edad');age.min=0;age.max=120;age.step=1;
  const childParent=childName.closest('div'),ageParent=age.closest('div');
  function toggleChild(){const show=occasion.value==='cumpleanos';relationParent.hidden=!show;relation.required=show;childParent.hidden=!show;ageParent.hidden=!show;childName.required=show;age.required=show;if(!show){relation.value='';childName.value='';age.value='';}}
  occasion.addEventListener('change',toggleChild);toggleChild();

 const city=dropdown('Ciudad','ciudad',[['','Seleccioná una ciudad']]);
 const plan=dropdown('Plan','plan',[['','Seleccioná un plan']]);
 const price=document.createElement('p');price.className='manual-price';price.setAttribute('role','status');price.textContent='Precio: elegí ciudad y plan';grid.append(price);
 const day=field('Fecha del evento','date','fecha');
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Asuncion',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 day.min=today;
 const time=field('Hora del evento','time','hora');
 const state=dropdown('Estado inicial','estado',[['pendiente','Pendiente'],['contratado','Contratado (aún no agendado)']]);
 const address=field('Dirección (opcional)','text','direccion',false);address.maxLength=250;
  const placeType=dropdown('Tipo de lugar','tipo_lugar',[['salon','Salón'],['residencia','Residencia'],['quinta','Quinta'],['escuela','Escuela'],['otro','Otro']]);
  const placeName=field('Nombre del lugar (opcional)','text','nombre_lugar',false);placeName.maxLength=300;
  const mapLink=field('Enlace del mapa (opcional)','url','mapa',false);mapLink.maxLength=2048;

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
   const {data,error}=await db.rpc('axel_v6_crear_contratacion_completa',{
     p_nombre:fullName,p_telefono:phone.value.trim(),p_ciudad_id:Number(city.value),p_plan_id:Number(plan.value),
     p_fecha:day.value,p_hora:time.value,p_estado:state.value,p_origen:origin.value,
     p_direccion:address.value.trim(),p_notas:notes.value.trim(),
     p_ocasion:occasion.value,p_vinculo:occasion.value==='cumpleanos'?relation.value:null,
     p_cumpleanero:occasion.value==='cumpleanos'?childName.value.trim():null,
     p_edad:occasion.value==='cumpleanos'?Number(age.value):null,
     p_tipo_lugar:placeType.value,p_nombre_lugar:placeName.value.trim(),p_mapa_url:mapLink.value.trim()});
    if(error)throw Error(error.message);
   await loadReservas();
   say('Contratación manual registrada. ID: '+data+' · Para bloquear la fecha, marcá Contratado y usá «Confirmar y agendar».');
  }catch(err){save.disabled=false;feedback.classList.add('error');feedback.textContent='No se pudo guardar: '+(err instanceof Error?err.message:'Error desconocido');}
 };
}

// Panel privado: consulta de solicitudes. No confirma reservas ni modifica Calendar.
async function loadReservas(){
 // Si falla la consulta privada de archivados, no mostrar un listado potencialmente incorrecto.
 const [reservasResult,archivoResult]=await Promise.all([
  db.from('axel_solicitudes_reserva')
   .select('id,creado_en,nombre_cliente,telefono,ciudad,direccion,plan_codigo,plan_nombre,precio_guaranies,fecha_evento,hora_evento,duracion_minutos,estado,notas,calendar_event_id,agendado_en,origen')
   .order('creado_en',{ascending:false}).limit(200),
  db.rpc('axel_v6_listar_archivados')
 ]);
 if(reservasResult.error)throw Error(reservasResult.error.message);
 if(archivoResult.error)throw Error('No se pudo verificar el archivado: '+archivoResult.error.message);
 records=reservasResult.data||[];
 archivedReservationIds=new Set((archivoResult.data||[]).map(x=>String(x.solicitud_id)));
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
 const archiveView=document.createElement('select');archiveView.id='reservationArchiveView';archiveView.setAttribute('aria-label','Vista de archivados');
 for(const [value,title] of [['principal','Listado principal'],['archivados','Ver archivados']]){
  const option=document.createElement('option');option.value=value;option.textContent=title;archiveView.append(option);
 }
 archiveView.addEventListener('change',renderReservations);
 const add=document.createElement('button');add.type='button';add.textContent='+ Nueva contratación manual';add.addEventListener('click',showManualBookingForm);
 f.append(search,filter,originFilter,archiveView,add);
 renderReservations();say(`${records.length} solicitudes cargadas (máximo 200). Archivados actuales: ${archivedReservationIds.size}.`);
}
// No elimina registros, ni cancela ni reabre reservas. Seguridad y auditoría en Supabase.
async function changeReservationArchive(r,accion,button){
 if(!admin||button.disabled)return;
 let motivo=null;
 if(accion==='archivar'){
  if(r.estado!=='cancelada'||r.calendar_event_id){say('Solo se archivan cancelaciones sin evento activo de Calendar.',true);return;}
  const respuesta=window.prompt('¿Archivar la contratación cancelada de '+(r.nombre_cliente||'este cliente')+'? Dejará de aparecer en el listado principal, pero no se eliminará de Supabase. Motivo (opcional, máximo 500 caracteres):','');
  if(respuesta===null)return;
  motivo=respuesta.trim();
  if(motivo.length>500){say('El motivo supera 500 caracteres.',true);return;}
  if(!window.confirm('Confirmá ARCHIVAR esta contratación cancelada. Los pagos, documentos y Calendar no se modificarán.'))return;
 }else{
  if(!window.confirm('¿Restaurar la visibilidad de esta contratación? Seguirá CANCELADA y no volverá a Google Calendar.'))return;
 }
 button.disabled=true;say(accion==='archivar'?'Archivando contratación…':'Restaurando visibilidad…');
 try{
  const {data,error}=await db.rpc('axel_v6_gestionar_archivo',{
   p_solicitud_id:r.id,p_accion:accion,p_motivo:motivo
  });
  if(error)throw Error(error.message);
  if(data?.ok!==true)throw Error('Supabase no confirmó la operación.');
  await loadReservas();
  say(accion==='archivar'?'Contratación archivada. Se conservó todo su historial.':'Contratación restaurada al listado principal; continúa cancelada.');
 }catch(err){
  button.disabled=false;
  say('No se completó el archivado: '+(err instanceof Error?err.message:String(err)),true);
 }
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
 const archiveView=$('reservationArchiveView')?.value||'principal';
 const status=$('reservationFilter')?.value||'';
 const origin=$('reservationOrigin')?.value||'';
 const query=($('reservationSearch')?.value||'').trim().toLocaleLowerCase('es');
 const rows=records.filter(r=>(archiveView==='archivados'?archivedReservationIds.has(String(r.id)):!archivedReservationIds.has(String(r.id)))&&(!status||r.estado===status)&&(!origin||(r.origen||'axel_ia')===origin)&&(!query||[r.nombre_cliente,r.telefono,r.ciudad,r.plan_nombre,r.id].some(v=>String(v||'').toLocaleLowerCase('es').includes(query))));
 const summary=document.createElement('div');summary.className='reservation-summary';
 const pending=records.filter(r=>r.estado==='pendiente').length;
 const hired=records.filter(r=>r.estado==='contratado').length;
 const expired=records.filter(r=>r.estado==='no_contrato').length;
 summary.textContent=`${archiveView==='archivados'?'Archivados':'Listado principal'} · ${rows.length} resultados · ${pending} pendientes · ${hired} contratados · ${expired} no contrataron · ${archivedReservationIds.size} archivados en total (últimos ${records.length} registros visibles)`;
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
  const td=document.createElement('td'),button=document.createElement('button');button.className='outline';button.type='button';button.textContent='Ver';button.addEventListener('click',()=>showReservation(r));td.append(button);
  if(archiveView==='archivados'){
   const restore=document.createElement('button');restore.className='outline';restore.type='button';restore.textContent='Restaurar';restore.style.marginLeft='6px';
   restore.addEventListener('click',()=>changeReservationArchive(r,'restaurar',restore));td.append(restore);
  }else if(r.estado==='cancelada'&&!r.calendar_event_id){
   const archive=document.createElement('button');archive.className='outline';archive.type='button';archive.textContent='Archivar';archive.style.marginLeft='6px';
   archive.addEventListener('click',()=>changeReservationArchive(r,'archivar',archive));td.append(archive);
  }
  row.append(td);body.append(row);
 }
 table.append(body);wrap.append(table);root.append(wrap);
}
function showReservation(r){
 const root=$('editorArea');root.replaceChildren();const section=document.createElement('section');section.className='editor';
 const h=document.createElement('h3');h.textContent='Detalle de solicitud';section.append(h);
 const fields=[['ID',r.id],['Recibida',new Date(r.creado_en).toLocaleString('es-PY',{timeZone:'America/Asuncion'})],['Nombre',r.nombre_cliente],['WhatsApp',r.telefono],['Ciudad',r.ciudad],['Dirección',r.direccion],['Plan',r.plan_nombre||r.plan_codigo],['Precio',r.precio_guaranies==null?'A confirmar':'Gs. '+Number(r.precio_guaranies).toLocaleString('es-PY')],['Fecha',reservationLabelDate(r.fecha_evento)],['Hora',String(r.hora_evento||'').slice(0,5)],['Duración (min)',r.duracion_minutos],['Estado',statusLabel(r.estado)],['Origen',originLabel(r.origen)],['En Google Calendar',r.calendar_event_id?'Sí · '+r.calendar_event_id:'No'],['Agendada el',r.agendado_en?new Date(r.agendado_en).toLocaleString('es-PY',{timeZone:'America/Asuncion'}):'—'],['Notas',r.notas]];
 for(const [name,value] of fields){const p=document.createElement('p');const strong=document.createElement('strong');strong.textContent=name+': ';p.append(strong,document.createTextNode(String(value??'—')));section.append(p)}
 // Los datos de ubicación de la ficha V6 se muestran también en el detalle principal.
 // La misma consulta segura de la ficha actualizará este bloque al cargar/guardar.
 const locationBox=document.createElement('div');
 locationBox.className='v6-location-detail';
 locationBox.dataset.v6LocationDetail='';
 const locationTitle=document.createElement('h4');locationTitle.textContent='📍 Lugar del evento';
 const locationInfo=document.createElement('p');locationInfo.className='muted';
 locationInfo.textContent='Cargando ubicación de la ficha V6…';
 locationBox.append(locationTitle,locationInfo);section.append(locationBox);
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
 // V5: toda modificación se ejecuta mediante RPC/Edge Function, nunca solo en la pantalla.
 if(['pendiente','contratado','no_contrato'].includes(r.estado)){
  const controls=document.createElement('div');controls.className='v5-actions';
  const h=document.createElement('h4');h.textContent='Gestión de la reserva';controls.append(h);
  const hint=document.createElement('p');hint.className='muted';
  hint.textContent=r.calendar_event_id?'Los cambios actualizarán el evento existente en Google Calendar.':'Esta solicitud aún no figura en Google Calendar; los cambios se guardarán en Supabase.';
  controls.append(hint);
   const editHint=document.createElement('p');editHint.className='muted';editHint.textContent='Fecha y hora se modifican aquí con Reprogramar; el lugar y la dirección se editan abajo en la Ficha V6. El cambio del lugar no sincroniza automáticamente la ubicación de Google Calendar.';controls.append(editHint);
  const dateLabel=document.createElement('label');dateLabel.textContent='Nueva fecha';
  const newDate=document.createElement('input');newDate.type='date';newDate.value=String(r.fecha_evento||'').slice(0,10);dateLabel.append(newDate);
  const hourLabel=document.createElement('label');hourLabel.textContent='Nueva hora';
  const newHour=document.createElement('input');newHour.type='time';newHour.value=String(r.hora_evento||'').slice(0,5);hourLabel.append(newHour);
  const actions=document.createElement('div');actions.className='actions';
  const move=document.createElement('button');move.type='button';move.textContent='↻ Reprogramar';
  const cancel=document.createElement('button');cancel.type='button';cancel.className='outline';cancel.textContent='✕ Cancelar reserva';
  const msg=document.createElement('p');msg.className='msg';msg.setAttribute('role','status');
  async function runV5(tipo){
   if(!admin||move.disabled)return;
   const payload={solicitud_id:r.id,tipo};
   if(tipo==='reprogramar'){
    if(!newDate.value||!newHour.value){msg.textContent='Completá fecha y hora';msg.classList.add('error');return}
    payload.fecha=newDate.value;payload.hora=newHour.value;
   }
   const prompt=tipo==='cancelar'?'¿Cancelar esta reserva? Si está agendada también se eliminará el evento de Google Calendar.':`¿Reprogramar para ${reservationLabelDate(payload.fecha)} a las ${payload.hora}? Si está agendada se actualizará Google Calendar.`;
   if(!window.confirm(prompt))return;
   move.disabled=true;cancel.disabled=true;msg.textContent='Procesando y sincronizando…';msg.classList.remove('error');
   try{
    if(r.calendar_event_id){
     const {data:{session},error:sessionError}=await db.auth.getSession();
     if(sessionError||!session?.access_token)throw Error('Volvé a iniciar sesión.');
     const response=await fetch(MANAGEMENT_FUNCTION,{method:'POST',headers:{'Content-Type':'application/json',apikey:KEY,Authorization:'Bearer '+session.access_token},body:JSON.stringify(payload),signal:AbortSignal.timeout(45000)});
     const result=await response.json().catch(()=>({}));
     if(!response.ok||result.ok!==true)throw Error(result.mensaje||'No se pudo sincronizar la reserva');
    }else{
     const {error}=await db.rpc('axel_v5_sin_agenda',{p_id:r.id,p_tipo:tipo,p_fecha:payload.fecha||null,p_hora:payload.hora||null});
     if(error)throw Error(error.message);
    }
    await loadReservas();
    const updated=records.find(x=>x.id===r.id);
    if(updated)showReservation(updated);
    say(tipo==='cancelar'?'Reserva cancelada.':'Reserva reprogramada y guardada.');
   }catch(err){msg.textContent='No se completó: '+(err instanceof Error?err.message:String(err));msg.classList.add('error');move.disabled=false;cancel.disabled=false;}
  }
  move.addEventListener('click',()=>runV5('reprogramar'));
  cancel.addEventListener('click',()=>runV5('cancelar'));
  actions.append(move,cancel);controls.append(dateLabel,hourLabel,actions,msg);section.append(controls);
 }
 const digits=phoneToWa(r.telefono);
 if(digits){const a=document.createElement('a');const message=`Hola ${r.nombre_cliente||''}, te escribimos de Mago Axel por tu solicitud ${r.id}. Queremos coordinar tu ${r.plan_nombre||'show'} del ${reservationLabelDate(r.fecha_evento)} a las ${String(r.hora_evento||'').slice(0,5)} en ${r.ciudad||'tu ciudad'}.`;
  a.href='https://wa.me/'+digits+'?text='+encodeURIComponent(message);a.target='_blank';a.rel='noopener noreferrer';a.className='reservation-link';a.textContent='💬 Contactar al cliente por WhatsApp';section.append(a)
 }
 appendV6Cierre(section,r);
 appendV6Ficha(section,r);
 root.append(section);section.scrollIntoView({behavior:'smooth',block:'nearest'});
}


// V6 Etapa 3: cierre administrativo. La validación y el bloqueo definitivos
// se realizan en las RPC de Supabase; esta interfaz no modifica Google Calendar.
function appendV6Cierre(section,reserva){
 const panel=document.createElement('section');
 panel.className='v6-ficha';
 panel.innerHTML='<h3>✅ Cierre del espectáculo · V6</h3>'+
  '<p class="muted">Registrá «Show realizado con éxito» solo después de realizar efectivamente la actuación. El evento permanece en Google Calendar y los pagos conservan su historial.</p>'+
  '<p class="msg" data-cierre-status role="status">Consultando estado del espectáculo…</p>'+
  '<div data-cierre-content></div>';
 const status=panel.querySelector('[data-cierre-status]');
 const content=panel.querySelector('[data-cierre-content]');
 const controls=section.querySelector('.v5-actions');
 const booking=section.querySelector('.booking-confirm-panel');
 // No mostrar controles de agenda hasta conocer el estado real del cierre.
 for(const element of [controls,booking])if(element)element.style.display='none';
 const setStatus=(text,error=false)=>{status.textContent=text;status.classList.toggle('error',error)};
 const restoreAgenda=()=>{for(const element of [controls,booking])if(element)element.style.removeProperty('display')};
 const formatDate=value=>{
  if(!value)return '—';
  const date=new Date(value);
  return Number.isNaN(date.getTime())?'—':date.toLocaleString('es-PY',{timeZone:'America/Asuncion'});
 };
 // Esta comprobación solo decide si mostramos el botón; la RPC vuelve a validar.
 const eventFinished=()=>{
  if(!reserva.fecha_evento||!reserva.hora_evento||!Number.isFinite(Number(reserva.duracion_minutos)))return false;
  const start=String(reserva.fecha_evento).slice(0,10)+'T'+String(reserva.hora_evento).slice(0,5)+':00';
  const formatter=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Asuncion',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const parts=Object.fromEntries(formatter.formatToParts(new Date()).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  const localNow=parts.year+'-'+parts.month+'-'+parts.day+'T'+parts.hour+':'+parts.minute+':00';
  const finish=new Date(start+'Z').getTime()+Number(reserva.duracion_minutos)*60000;
  return Number.isFinite(finish)&&new Date(localNow+'Z').getTime()>=finish;
 };
 async function consult(){
  setStatus('Consultando cierre en Supabase…');
  content.replaceChildren();
  const {data,error}=await db.rpc('axel_v6_consultar_cierre',{p_solicitud_id:reserva.id});
  // Ante error, mantener deshabilitadas las operaciones de agenda en esta vista.
  if(error){setStatus('No se pudo verificar el cierre: '+error.message,true);return}
  if(data?.cerrado===true){
   setStatus('✅ Show realizado con éxito · Cierre registrado en Supabase.');
   const p=document.createElement('p');
   p.textContent='Registrado: '+formatDate(data.registrado_en)+' · Realizado: '+formatDate(data.realizado_en);
   content.append(p);
   if(data.observaciones){const obs=document.createElement('p');obs.textContent='Observaciones: '+data.observaciones;content.append(obs)}
   const note=document.createElement('p');note.className='muted';note.textContent='La contratación quedó cerrada. No se permite reprogramarla ni cancelarla; los pagos y documentos permanecen disponibles.';content.append(note);
   return;
  }
  restoreAgenda();
  if(reserva.estado!=='contratado'){
   setStatus('Esta contratación no está activa; no corresponde registrar un show realizado.');return;
  }
  if(!reserva.calendar_event_id){
   setStatus('El evento aún no está agendado en Google Calendar; no puede cerrarse.');return;
  }
  if(!eventFinished()){
   setStatus('Pendiente de realizar: el cierre estará disponible después de la hora de finalización del espectáculo.');return;
  }
  setStatus('El evento ya terminó según su horario. Confirmá únicamente si el show se realizó realmente.');
  const label=document.createElement('label');label.textContent='Observaciones del cierre (opcional)';
  const textarea=document.createElement('textarea');textarea.maxLength=2000;textarea.rows=3;
  textarea.placeholder='Ej.: Show realizado sin novedades.';label.append(textarea);content.append(label);
  const btn=document.createElement('button');btn.type='button';btn.textContent='✓ Show realizado con éxito';btn.className='booking-confirm-btn';content.append(btn);
  btn.onclick=async()=>{
   if(!admin||btn.disabled)return;
   const confirmText='¿Confirmás que el espectáculo de '+(reserva.nombre_cliente||'este cliente')+' del '+reservationLabelDate(reserva.fecha_evento)+' se realizó con éxito? Este cierre bloqueará futuras reprogramaciones y cancelaciones de esta contratación, sin borrar Google Calendar ni los pagos.';
   if(!window.confirm(confirmText))return;
   btn.disabled=true;setStatus('Registrando cierre…');
   const {error:saveError}=await db.rpc('axel_v6_registrar_cierre',{
    p_solicitud_id:reserva.id,p_observaciones:textarea.value.trim()||null
   });
   if(saveError){btn.disabled=false;setStatus('No se registró el cierre: '+saveError.message,true);return}
   // La propia base de datos confirma el estado; no se marca como realizado solo en la pantalla.
   await consult();
   say('Cierre del espectáculo registrado en Supabase.');
  };
 }
 section.append(panel);
 consult().catch(e=>setStatus('No se pudo consultar el cierre: '+(e?.message||String(e)),true));
}

check();

// Vista de solo lectura. No cambia la ubicación del evento de Google Calendar.
function axelActualizarLugarDetalle(parent,reserva,f){
 const box=parent.querySelector('[data-v6-location-detail]');
 if(!box)return;
 const typeNames={salon:'Salón',residencia:'Residencia',quinta:'Quinta',escuela:'Escuela',otro:'Otro'};
 box.replaceChildren();
 const heading=document.createElement('h4');heading.textContent='📍 Lugar del evento';box.append(heading);
 function field(label,value){
  const p=document.createElement('p');const strong=document.createElement('strong');
  strong.textContent=label+': ';
  p.append(strong,document.createTextNode(String(value||'—')));box.append(p);
 }
 field('Nombre del lugar',f.nombre_lugar);
 field('Tipo de lugar',typeNames[f.tipo_lugar]||f.tipo_lugar);
 field('Dirección',f.direccion_lugar||reserva.direccion);
 field('Ciudad',reserva.ciudad);
 const link=String(f.mapa_url||'').trim();
 if(/^https:\/\//i.test(link)){
  const p=document.createElement('p');const a=document.createElement('a');
  a.href=link;a.target='_blank';a.rel='noopener noreferrer';
  a.textContent='Abrir ubicación en el mapa';p.append(a);box.append(p);
 }
}

// V6 etapa 1: ficha y pagos; deliberadamente no interactúa con Google Calendar.
function appendV6Ficha(parent,reserva){
 const panel=document.createElement('section');panel.className='v6-ficha';
 panel.innerHTML=`<h3>📋 Ficha de contratación · V6</h3><p class="muted">Datos adicionales del festejo y pagos registrados en Supabase. Esta ficha no altera Google Calendar.</p><p class="msg" data-v6-status>Cargando ficha…</p><div data-v6-content hidden></div>`;
 parent.append(panel);
 const status=panel.querySelector('[data-v6-status]');
 const content=panel.querySelector('[data-v6-content]');
 const money=v=>'Gs. '+Number(v||0).toLocaleString('es-PY');
 const isoToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Asuncion',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const setStatus=(message,error=false)=>{status.textContent=message;status.classList.toggle('error',error)};
 async function refresh(){
  const {data,error}=await db.rpc('axel_v6_consultar_ficha',{p_id:reserva.id});
  if(error){content.hidden=true;setStatus('No se pudo cargar ficha V6: '+error.message,true);return}
  const f=data?.ficha||{},pagos=data?.pagos||[];
  axelActualizarLugarDetalle(parent,reserva,f);
  const total=data?.precio,abonado=Number(data?.abonado||0),saldo=data?.saldo;
  content.hidden=false;
  content.innerHTML=`<form class="v6-form" data-v6-ficha>
   <div class="v6-grid">
     <label>Ocasión del evento<select name="ocasion" required><option value="">Seleccioná ocasión</option>${[['cumpleanos','Cumpleaños'],['dia_nino','Día del Niño'],['empresarial','Empresarial']].map(([v,l])=>`<option value="${v}" ${f.ocasion===v?'selected':''}>${l}</option>`).join('')}</select></label>
     <label data-ficha-vinculo>Vínculo de quien contrata<select name="vinculo"><option value="">Seleccioná vínculo</option>${[['mama','Mamá'],['papa','Papá'],['abuelos','Abuelos'],['tios','Tíos'],['padrinos','Padrinos'],['otros','Otros']].map(([v,l])=>`<option value="${v}" ${f.vinculo_contratante===v?'selected':''}>${l}</option>`).join('')}</select></label>
    <label>Nombre y apellido del contratante<input name="contratante" maxlength="200" value="${esc(f.nombre_contratante||reserva.nombre_cliente||'')}"></label>
    <label data-ficha-nino>Nombre del niño/a<input name="cumpleanero" maxlength="200" value="${esc(f.nombre_cumpleanero||'')}"></label>
    <label data-ficha-edad>Edad que cumple<input name="edad" type="number" min="0" max="120" value="${esc(f.edad_cumple??'')}"></label>
    <label>Tipo de lugar<select name="tipo_lugar">${[['salon','Salón'],['residencia','Residencia'],['quinta','Quinta'],['escuela','Escuela'],['otro','Otro']].map(([v,l])=>`<option value="${v}" ${f.tipo_lugar===v?'selected':''}>${l}</option>`).join('')}</select></label>
    <label>Nombre del lugar<input name="nombre_lugar" maxlength="300" value="${esc(f.nombre_lugar||'')}"></label>
    <label>Dirección del evento<input name="direccion" maxlength="1000" value="${esc(f.direccion_lugar||reserva.direccion||'')}"></label>
    <label class="v6-wide">Enlace del mapa (https://)<input name="mapa" type="url" maxlength="2048" placeholder="https://maps.app.goo.gl/..." value="${esc(f.mapa_url||'')}"></label>
    <label class="v6-wide">Detalles y observaciones<textarea name="detalles" maxlength="5000">${esc(f.detalles||'')}</textarea></label>
   </div><button type="submit">Guardar ficha en Supabase</button>
  </form>
  <div class="v6-payments"><h4>💰 Pagos y señas</h4><div class="v6-totals"><span>Precio: <strong>${total==null?'Sin definir':money(total)}</strong></span><span>Abonado: <strong>${money(abonado)}</strong></span><span>Saldo: <strong>${saldo==null?'Sin definir':money(saldo)}</strong></span></div>
  <form data-v6-pago class="v6-form"><div class="v6-grid">
   <label>Monto recibido (Gs.)<input name="monto" type="number" min="1" step="1" max="${Number(saldo||0)}" required></label>
   <label>Tipo de pago<select name="tipo"><option value="sena">Seña</option><option value="saldo">Pago del saldo</option><option value="otro">Otro pago</option></select></label>
   <label>Medio<select name="medio"><option value="transferencia">Transferencia</option><option value="deposito">Depósito bancario</option><option value="efectivo">Efectivo</option><option value="otro">Otro</option></select></label>
   <label>Fecha del pago<input name="fecha" type="date" required max="${isoToday()}" value="${isoToday()}"></label>
   <label>Referencia / comprobante<input name="referencia" maxlength="200"></label>
   <label>Nota del pago<input name="notas" maxlength="1000"></label>
  </div><button type="submit" ${saldo==null||Number(saldo)<=0||!['contratado','confirmada'].includes(reserva.estado)?'disabled':''}>Registrar pago</button></form>
  <h4>Movimientos guardados</h4><div class="v6-list">${pagos.length?pagos.map(p=>`<div class="v6-payment"><div><strong>${money(p.monto_guaranies)}</strong> · ${esc(p.tipo_pago)} · ${esc(p.medio_pago)} · ${esc(p.fecha_pago)} ${p.anulado_en?'<strong>(ANULADO)</strong>':''}<div class="muted">${esc(p.referencia||'Sin referencia')} ${p.motivo_anulacion?'· Motivo: '+esc(p.motivo_anulacion):''}</div></div>${!p.anulado_en?`<button class="outline" type="button" data-v6-anular="${esc(p.id)}">Anular</button>`:''}</div>`).join(''):'<p class="muted">Todavía no hay pagos registrados.</p>'}</div>
  </div>`;
  // Etapa 2: documentos imprimibles; confirmación de envío manual, no automática.
  appendV6Documentos(content,reserva,f,pagos,total,abonado,saldo,money);
  const fichaForm=content.querySelector('[data-v6-ficha]');
   const selectOcasion=fichaForm.elements.namedItem('ocasion');
   const toggleFichaNino=()=>{const mostrar=selectOcasion.value==='cumpleanos';
    fichaForm.querySelector('[data-ficha-vinculo]').hidden=!mostrar;
    fichaForm.elements.namedItem('vinculo').required=mostrar;
    fichaForm.querySelector('[data-ficha-nino]').hidden=!mostrar;
    fichaForm.querySelector('[data-ficha-edad]').hidden=!mostrar;
    fichaForm.elements.namedItem('cumpleanero').required=mostrar;
    fichaForm.elements.namedItem('edad').required=mostrar;
   };
   selectOcasion.addEventListener('change',toggleFichaNino);toggleFichaNino();
  fichaForm.addEventListener('submit',async e=>{
   e.preventDefault();const el=e.currentTarget;const b=el.querySelector('button');const fd=new FormData(el);
   if(!window.confirm('¿Guardar los datos de la ficha de contratación?'))return;
   b.disabled=true;setStatus('Guardando ficha…');
   const age=String(fd.get('edad')).trim();
   const {error}=await db.rpc('axel_v6_guardar_ficha_ampliada',{
    p_id:reserva.id,p_contratante:String(fd.get('contratante')||''),
    p_cumpleanero:String(fd.get('cumpleanero')||''),p_edad:age?Number(age):null,
    p_tipo_lugar:String(fd.get('tipo_lugar')),p_nombre_lugar:String(fd.get('nombre_lugar')||''),
    p_direccion:String(fd.get('direccion')||''),p_mapa_url:String(fd.get('mapa')||''),
    p_detalles:String(fd.get('detalles')||''),
    p_ocasion:String(fd.get('ocasion')||''),
    p_vinculo:String(fd.get('ocasion'))==='cumpleanos'?String(fd.get('vinculo')||''):null});
   b.disabled=false;if(error){setStatus('Error al guardar: '+error.message,true);return}
   setStatus('Ficha guardada en Supabase.');
   // Recuperar datos reales de Supabase y actualizar ubicación, pagos y documentos.
   await refresh();
  });
  const pagoForm=content.querySelector('[data-v6-pago]');
  pagoForm.addEventListener('submit',async e=>{
   e.preventDefault();const el=e.currentTarget;const fd=new FormData(el);const b=el.querySelector('button');
   const monto=Number(fd.get('monto'));
   if(!Number.isSafeInteger(monto)||monto<=0||monto>Number(saldo)){setStatus('Monto inválido o mayor al saldo.',true);return}
   if(!window.confirm('¿Registrar pago de '+money(monto)+'? Los pagos se conservan en historial.'))return;
   b.disabled=true;setStatus('Registrando pago…');
   const {error}=await db.rpc('axel_v6_registrar_pago',{p_id:reserva.id,p_monto:monto,
    p_tipo:String(fd.get('tipo')),p_medio:String(fd.get('medio')),
    p_fecha:String(fd.get('fecha')),p_referencia:String(fd.get('referencia')||''),
    p_notas:String(fd.get('notas')||'')});
   if(error){b.disabled=false;setStatus('No se registró el pago: '+error.message,true);return}
   setStatus('Pago registrado correctamente.');await refresh();
  });
  content.querySelectorAll('[data-v6-anular]').forEach(btn=>btn.addEventListener('click',async()=>{
   const motivo=window.prompt('Motivo de anulación del pago (mínimo 5 caracteres):');
   if(motivo===null)return;
   if(motivo.trim().length<5){setStatus('Escribí un motivo de al menos 5 caracteres.',true);return}
   if(!window.confirm('¿Anular este pago? Se conserva en el historial.'))return;
   btn.disabled=true;setStatus('Anulando pago…');
   const {error}=await db.rpc('axel_v6_anular_pago',{p_pago_id:btn.dataset.v6Anular,p_motivo:motivo.trim()});
   if(error){btn.disabled=false;setStatus('No se pudo anular: '+error.message,true);return}
   setStatus('Pago anulado; historial conservado.');await refresh();
  }));
  setStatus('Ficha lista para editar.');
 }
 refresh().catch(e=>setStatus('Error de conexión: '+e.message,true));
}


// V6 Etapa 2: el navegador permite imprimir o seleccionar «Guardar como PDF».
// No se envían archivos por WhatsApp automáticamente: se adjuntan manualmente.
const AXEL_AGENTE_WA='595981535023';
function axelDocHTML(reserva,f,pago,info,money){
 const safe=x=>esc(x==null||x===''?'—':x);
 const esRecibo=info.tipo==='recibo';
 const tipo=esRecibo?'RECIBO DE SEÑA / PAGO':'FICHA DE CONTRATACIÓN';
 const item=(label,value)=>`<div class="item"><small>${safe(label)}</small><div>${safe(value)}</div></div>`;
 const date=x=>reservationLabelDate(String(x||'').slice(0,10));
 const horario=String(reserva.hora_evento||'').slice(0,5);
 const contratante=f.nombre_contratante||reserva.nombre_cliente;
 const ocasion=f.ocasion||'';
 const nombreNino=String(f.nombre_cumpleanero||'').trim();
 const pagoConcepto=pago?.tipo_pago==='saldo'?'Pago de saldo':pago?.tipo_pago==='otro'?'Pago':'Seña';
 const motivoTexto=ocasion==='dia_nino'?`${pagoConcepto} para el agendamiento del espectáculo por el Día del Niño`:
  ocasion==='empresarial'?`${pagoConcepto} para el agendamiento de un evento empresarial`:
  nombreNino?`${pagoConcepto} para el agendamiento del espectáculo por el cumpleaños de ${nombreNino}`:'Ocasión no registrada';
 const vinculoNombre=({mama:'Mamá',papa:'Papá',abuelos:'Abuelos',tios:'Tíos',padrinos:'Padrinos',otros:'Otros'})[f.vinculo_contratante]||'—';
 const pagoBlock=pago?`<h2>Pago recibido</h2><div class="grid">${item('Importe recibido',money(pago.monto_guaranies))}${item('Tipo de pago',pago.tipo_pago)}${item('Medio de pago',pago.medio_pago)}${item('Fecha del pago',date(pago.fecha_pago))}${item('Referencia',pago.referencia)}${item('Observación',pago.notas)}</div>`:'';
 const location=f.mapa_url?`<p>Mapa del evento: ${safe(f.mapa_url)}</p>`:'';
 const reciboDetalle=`<h2>Datos del agendamiento</h2>
  <p class="recibo-motivo"><strong>Motivo:</strong> ${safe(motivoTexto)}</p>
  <div class="grid">${item('Nombre de quien contrató',contratante)}${ocasion==='cumpleanos'?item('Vínculo del contratante',vinculoNombre):''}${item('WhatsApp del cliente',reserva.telefono)}${item('Plan / espectáculo',reserva.plan_nombre||reserva.plan_codigo)}${item('Ciudad',reserva.ciudad)}${item('Fecha del evento',date(reserva.fecha_evento))}${item('Hora del evento',horario)}</div>`;
 const fichaDetalle=`<h2>Datos de contratación</h2><div class="grid">${item('Contratante',contratante)}${item('WhatsApp',reserva.telefono)}${item('Ocasión',({cumpleanos:'Cumpleaños',dia_nino:'Día del Niño',empresarial:'Empresarial'})[f.ocasion]||'No indicada')}${f.ocasion==='cumpleanos'?item('Vínculo del contratante',vinculoNombre):''}${f.ocasion==='cumpleanos'?item('Niño/a',f.nombre_cumpleanero)+item('Edad que cumple',f.edad_cumple):''}${item('Plan contratado',reserva.plan_nombre)}${item('Ciudad',reserva.ciudad)}${item('Fecha del evento',date(reserva.fecha_evento))}${item('Horario',horario)}${item('Tipo de lugar',f.tipo_lugar)}${item('Lugar',f.nombre_lugar)}${item('Dirección',f.direccion_lugar||reserva.direccion)}${item('Duración',reserva.duracion_minutos+' min')}</div>${location}`;
 return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${safe(tipo)} - Mago Axel</title><style>
  @page{size:A4;margin:17mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#21152e;margin:0;background:#fff;font-size:13px}
  .bar{display:flex;align-items:center;justify-content:space-between;border-bottom:4px solid #e4ad46;padding-bottom:14px;margin-bottom:15px}h1{font-size:22px;margin:0}h2{font-size:15px;background:#f4edf6;padding:8px;margin:22px 0 10px}.small,small{color:#605568}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.item{border-bottom:1px solid #ddd;padding:4px 0 8px;overflow-wrap:anywhere}.item small{display:block;margin-bottom:5px}.item div{font-weight:600}.totals{display:flex;gap:14px;margin:18px 0;background:#f8f5f0;padding:15px;justify-content:space-around}.totals div{text-align:center}.totals b{display:block;margin-top:5px;font-size:17px}.foot{margin-top:28px;font-size:10px;color:#666;border-top:1px solid #ddd;padding-top:12px} .toolbar{padding:12px;margin-bottom:15px;background:#f3e8ff;border-radius:8px}button{padding:10px 15px;background:#e4ad46;border:0;border-radius:8px;cursor:pointer}.recibo-motivo{font-size:15px;line-height:1.55;border-left:4px solid #e4ad46;padding:12px;background:#fffaf0;overflow-wrap:anywhere}.recibo-intro{font-size:15px;line-height:1.5;margin:14px 0}.recibo-importe{font-size:24px;font-weight:700;margin:8px 0}
  @media print{.toolbar{display:none!important}body{margin:0}} </style></head><body><div class="toolbar"><button onclick="window.print()">Imprimir / Guardar como PDF</button> <span>En destino, elegí «Guardar como PDF» y desactivá encabezados y pies.</span></div>
  <div class="bar"><div><h1>MAGO AXEL</h1><div class="small">Magia y diversión · ${esRecibo?'Comprobante de reserva':'Documento administrativo'}</div></div><strong>${tipo}</strong></div>
  ${item('Documento Nº',info.id)}<div class="small">Emitido: ${safe(info.fecha)}</div>
  ${esRecibo?`<p class="recibo-intro">Recibimos de <strong>${safe(contratante)}</strong> la suma de:</p><div class="recibo-importe">${money(pago.monto_guaranies)}</div>${reciboDetalle}`:fichaDetalle}
  ${pagoBlock}
  <h2>Resumen de contratación</h2><div class="totals"><div>Precio total<b>${money(reserva.precio_guaranies)}</b></div><div>Total abonado vigente<b>${money(info.abonado)}</b></div><div>Saldo pendiente<b>${money(info.saldo)}</b></div></div>
  ${!esRecibo?`<h2>Detalles del evento</h2><p style="white-space:pre-wrap">${safe(f.detalles)}</p>`:''}
  <div class="foot">${esRecibo?'Comprobante de respaldo del pago y agendamiento indicados.':'Registro interno de Mago Axel.'} No constituye factura legal ni comprobante tributario. Datos registrados al momento de su emisión. El envío por WhatsApp requiere adjuntar manualmente el PDF.</div>
 </body></html>`;
}
function appendV6Documentos(content,reserva,f,pagos,total,abonado,saldo,money){
 const area=document.createElement('section');area.className='v6-docs';
 const valid=pagos.filter(p=>!p.anulado_en);
 area.innerHTML=`<h4>📄 Documentos y comprobantes · V6</h4><p class="muted">Imprimí o guardá como PDF. WhatsApp se abre con un mensaje; debés adjuntar el archivo y enviarlo manualmente.</p>
  <div class="v6-doc-actions"><button type="button" data-doc-ficha>Preparar ficha para PDF</button>${valid.length?`<label>Recibo de pago<select data-doc-pago>${valid.map(p=>`<option value="${esc(p.id)}">${money(p.monto_guaranies)} · ${esc(p.referencia||p.fecha_pago)}</option>`).join('')}</select></label><button type="button" data-doc-recibo>Preparar recibo para PDF</button>`:'<span class="muted">No hay pagos vigentes para emitir un recibo.</span>'}</div>
  <p class="msg" data-doc-msg role="status"></p><div data-doc-history></div>`;
 content.append(area);
 const msg=area.querySelector('[data-doc-msg]');const history=area.querySelector('[data-doc-history]');
 const docDate=()=>new Intl.DateTimeFormat('es-PY',{dateStyle:'short',timeStyle:'short',timeZone:'America/Asuncion'}).format(new Date());
 const announce=(s,err=false)=>{msg.textContent=s;msg.classList.toggle('error',err)};
 async function listar(){const {data,error}=await db.rpc('axel_v6_documentos_listar',{p_id:reserva.id});
  if(error){announce('No se pudo cargar historial de documentos: '+error.message,true);return}
  history.replaceChildren();const list=data||[];
  const h=document.createElement('h4');h.textContent='Historial de documentos';history.append(h);
  if(!list.length){const p=document.createElement('p');p.className='muted';p.textContent='Sin documentos preparados todavía.';history.append(p);return}
  for(const doc of list){const row=document.createElement('div');row.className='v6-doc-row';
   const label=document.createElement('span');label.textContent=(doc.tipo==='ficha'?'Ficha':'Recibo')+' · '+new Date(doc.preparado_en).toLocaleString('es-PY')+' · '+(doc.estado==='envio_confirmado'?'Envío confirmado manualmente':'Preparado, envío sin confirmar');row.append(label);
   if(doc.estado==='preparado'){
    // Las fichas se archivan en el WhatsApp del agente; los recibos se entregan al cliente.
    const esRecibo=doc.tipo==='recibo';
    const destino=esRecibo?phoneToWa(reserva.telefono):AXEL_AGENTE_WA;
    const wa=document.createElement('button');wa.className='outline';wa.textContent=esRecibo?'Abrir WhatsApp del cliente':'Abrir WhatsApp del agente';wa.type='button';
    if(!destino){wa.disabled=true;wa.title='Verificá el teléfono del cliente antes de enviar el recibo.';}
    wa.onclick=()=>{
     if(!destino){announce('No se encontró un WhatsApp válido para el cliente.',true);return}
     const message=esRecibo
      ?`Hola ${reserva.nombre_cliente||''}, te enviamos el recibo de tu pago de reserva con Mago Axel para el evento del ${reservationLabelDate(reserva.fecha_evento)} a las ${String(reserva.hora_evento||'').slice(0,5)}. Adjuntamos el comprobante en PDF. ¡Muchas gracias!`
      :'Mago Axel - Ficha de contratación\nDocumento: '+doc.id+'\nContratación: '+reserva.nombre_cliente+'\nAdjunto el PDF para archivar. (Adjuntar archivo manualmente)';
     if(!window.confirm('Se abrirá WhatsApp para '+(esRecibo?'el CLIENTE':'el AGENTE')+' al número +'+destino+'. Verificá que corresponda al destinatario correcto. ¿Continuar?'))return;
     window.open('https://wa.me/'+destino+'?text='+encodeURIComponent(message),'_blank','noopener');
     announce('WhatsApp abierto para +'+destino+'. Adjuntá el PDF y envialo manualmente; luego confirmá el envío acá.');
    };
    const confirm=document.createElement('button');confirm.className='outline';confirm.type='button';confirm.textContent='Confirmar envío realizado';
    if(!destino){confirm.disabled=true;confirm.title='El cliente no tiene un WhatsApp válido.';}
    confirm.onclick=async()=>{
     if(!destino){announce('Corregí el número del cliente antes de confirmar.',true);return}
     if(!window.confirm('Confirmá SOLO si efectivamente enviaste el PDF al '+(esRecibo?'CLIENTE':'AGENTE')+' (+ '+destino+'). ¿Ya se envió?'))return;
     confirm.disabled=true;
     const {error}=await db.rpc('axel_v6_documento_confirmar_envio',{
      p_documento_id:doc.id,p_destinatario:destino,
      p_observaciones:esRecibo?'Recibo enviado manualmente al WhatsApp del cliente':'Ficha enviada manualmente al WhatsApp del agente'});
     if(error){announce('No se confirmó el envío: '+error.message,true);confirm.disabled=false;return}
     announce('Confirmación manual guardada en Supabase.');await listar();
    };row.append(wa,confirm);
   }history.append(row)}
 }
 async function generar(tipo,pago=null){
  if(tipo==='recibo'){
   if(!pago||pago.anulado_en){announce('Seleccioná un pago vigente para generar el recibo.',true);return}
   if(!String(f.nombre_contratante||reserva.nombre_cliente||'').trim()){
    announce('Completá el nombre del contratante y guardá la ficha antes de generar el recibo.',true);return;
   }
   if(!['cumpleanos','dia_nino','empresarial'].includes(f.ocasion)){
    announce('Guardá la ocasión del evento en la ficha antes de generar el recibo.',true);return;
   }
   if(f.ocasion==='cumpleanos'&&!String(f.nombre_cumpleanero||'').trim()){
    announce('Completá el nombre del niño/a y guardá la ficha antes de generar el recibo.',true);return;
   }
   if(!phoneToWa(reserva.telefono)){
    announce('El WhatsApp del cliente no es válido. Verificá el teléfono antes de preparar el recibo.',true);return;
   }
  }
  const preview=window.open('','_blank');if(!preview){announce('El navegador bloqueó la ventana. Permití las ventanas emergentes para este sitio.',true);return}
  preview.document.write('<!doctype html><html lang="es"><meta charset="utf-8"><title>Preparando documento</title><body><p>Preparando documento privado…</p></body></html>');preview.document.close();
  announce('Preparando documento…');
  try{
   const {data,error}=await db.rpc('axel_v6_documento_preparar',{p_id:reserva.id,p_tipo:tipo,p_pago_id:pago?.id||null});
   if(error)throw Error(error.message);
   const html=axelDocHTML(reserva,f,pago,{id:data,tipo,fecha:docDate(),abonado,saldo},money);
   preview.document.open();preview.document.write(html);preview.document.close();
   announce('Documento preparado. En la nueva pestaña, elegí imprimir o guardar como PDF.');await listar();
  }catch(err){preview.close();announce('No se preparó el documento: '+err.message,true)}
 }
 area.querySelector('[data-doc-ficha]').onclick=()=>generar('ficha');
 const recibo=area.querySelector('[data-doc-recibo]');if(recibo)recibo.onclick=()=>generar('recibo',valid.find(p=>p.id===area.querySelector('[data-doc-pago]').value));
 listar();
}


// ─── Mago Axel V9 · Gestión de videos. Aislada de reservas y calendario ───
const AXEL_V9_BUCKET='axel-videos';
const AXEL_V9_LIMIT=50*1024*1024;
let axelV9Busy=false;
let axelV9Videos=[];
function axelV9Styles(){
 if(document.getElementById('axel-v9-video-css'))return;
 const e=document.createElement('style');e.id='axel-v9-video-css';e.textContent=`
 .axel-v9-header{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:14px 0}
 .axel-v9-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:16px;margin:16px 0}
 .axel-v9-card{background:#241633;color:#f9f4ff;border:1px solid #775b8a;border-radius:16px;padding:10px;min-width:0}
 .axel-v9-card[draggable="true"]{cursor:grab}.axel-v9-card.axel-v9-over{outline:3px solid #efc66d}
 .axel-v9-card video{width:100%;aspect-ratio:9 / 16;object-fit:cover;background:#08040d;border-radius:11px}
 .axel-v9-card h4{margin:10px 0 4px;overflow-wrap:anywhere}
 .axel-v9-card small{color:#e1cfed}.axel-v9-row{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}
 .axel-v9-row button{padding:8px;font-size:12px}.axel-v9-form{display:grid;gap:14px;max-width:680px}
 .axel-v9-form label{display:grid;gap:5px;font-weight:600}
 .axel-v9-form input,.axel-v9-form textarea{width:100%;box-sizing:border-box}
 .axel-v9-status{margin:12px 0;padding:10px;border:1px solid #8b6e9a;border-radius:9px;white-space:pre-wrap}
 .axel-v9-status.error{border-color:#c23859;color:#e51f52;background:#fff4f6}
 .axel-v9-pos{font-weight:800;color:#fbd68a}.axel-v9-tip{font-size:13px;opacity:.85}
 `;document.head.append(e);
}
function axelV9Msg(t,error=false){
 const e=document.getElementById('axel-v9-status');if(e){e.textContent=t;e.classList.toggle('error',error)}
}
function axelV9Url(path){return db.storage.from(AXEL_V9_BUCKET).getPublicUrl(path).data.publicUrl;}
async function axelV9Read(){
 const {data,error}=await db.rpc('axel_v9_videos_admin_listar');if(error)throw Error(error.message);
 if(!Array.isArray(data))throw Error('Respuesta inválida al consultar videos');return data;
}
function axelV9Button(text,onClick,cls='outline'){
 const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=text;b.onclick=onClick;return b;
}
function axelV9SetBusy(value){
 axelV9Busy=value;
 const root=document.getElementById('axel-v9-area');if(root)root.querySelectorAll('button,input,textarea').forEach(el=>el.disabled=value);
}
async function axelV9Refresh(){
 axelV9Videos=await axelV9Read();axelV9RenderList();
 axelV9Msg(`${axelV9Videos.length} videos registrados. Los cambios de orden se guardan con «Guardar orden».`);
}
async function axelV9LoadVideos(){
 axelV9Styles();
 $('filters').replaceChildren();$('editorArea').replaceChildren();
 const root=$('tableArea');root.replaceChildren();
 const area=document.createElement('section');area.id='axel-v9-area';
 const bar=document.createElement('div');bar.className='axel-v9-header';
 const title=document.createElement('h3');title.textContent='🎬 Videos verticales 9:16';
 const actions=document.createElement('div');actions.className='axel-v9-row';
 actions.append(axelV9Button('+ Subir video',()=>axelV9Form()),axelV9Button('Guardar orden',()=>axelV9SaveOrder(),'booking-confirm-btn'),axelV9Button('Actualizar',()=>axelV9Refresh().catch(e=>axelV9Msg(e.message,true))));
 bar.append(title,actions);
 const hint=document.createElement('p');hint.className='axel-v9-tip';hint.textContent='Arrastrá las tarjetas para ordenarlas; en celulares utilizá ↑ y ↓. Solo los videos publicados aparecerán en el sitio. MP4 de hasta 50 MB, vertical 9:16.';
 const status=document.createElement('p');status.id='axel-v9-status';status.className='axel-v9-status';status.setAttribute('role','status');
 const list=document.createElement('div');list.id='axel-v9-list';list.className='axel-v9-grid';
 const formArea=document.createElement('div');formArea.id='axel-v9-editor';
 area.append(bar,hint,status,list,formArea);root.append(area);
 try{await axelV9Refresh();say('Panel de videos cargado.')}catch(e){axelV9Msg('No se pudo cargar el panel de videos: '+e.message,true);say('Error al consultar videos.',true)}
}
function axelV9Move(id,dir){
 if(axelV9Busy)return;
 const i=axelV9Videos.findIndex(v=>v.id===id),j=i+dir;
 if(i<0||j<0||j>=axelV9Videos.length)return;
 [axelV9Videos[i],axelV9Videos[j]]=[axelV9Videos[j],axelV9Videos[i]];
 axelV9RenderList();axelV9Msg('Orden modificado localmente. Presioná «Guardar orden» para aplicarlo en el sitio.');
}
function axelV9RenderList(){
 const list=document.getElementById('axel-v9-list');if(!list)return;list.replaceChildren();
 if(!axelV9Videos.length){const e=document.createElement('p');e.textContent='Todavía no hay videos. Elegí «Subir video» para agregar el primero.';list.append(e);return;}
 for(const [i,v] of axelV9Videos.entries()){
  const card=document.createElement('article');card.className='axel-v9-card';card.draggable=!axelV9Busy;card.dataset.id=v.id;
  const pos=document.createElement('div');pos.className='axel-v9-pos';pos.textContent='↕ Posición '+(i+1);
  const video=document.createElement('video');video.src=axelV9Url(v.storage_path);video.controls=true;video.preload='none';video.playsInline=true;
  const name=document.createElement('h4');name.textContent=v.titulo;
  const state=document.createElement('small');state.textContent=v.publicado?'● Publicado':'○ Oculto';
  const row=document.createElement('div');row.className='axel-v9-row';
  row.append(axelV9Button('↑',()=>axelV9Move(v.id,-1)),axelV9Button('↓',()=>axelV9Move(v.id,1)),axelV9Button('Editar',()=>axelV9Form(v)),axelV9Button(v.publicado?'Ocultar':'Publicar',()=>axelV9Toggle(v)),axelV9Button('Eliminar',()=>axelV9Delete(v)));
  card.append(pos,video,name,state,row);
  card.addEventListener('dragstart',ev=>{if(axelV9Busy){ev.preventDefault();return}ev.dataTransfer.setData('text/plain',v.id);ev.dataTransfer.effectAllowed='move'});
  card.addEventListener('dragover',ev=>{ev.preventDefault();card.classList.add('axel-v9-over')});
  card.addEventListener('dragleave',()=>card.classList.remove('axel-v9-over'));
  card.addEventListener('drop',ev=>{ev.preventDefault();card.classList.remove('axel-v9-over');if(axelV9Busy)return;const from=ev.dataTransfer.getData('text/plain');const a=axelV9Videos.findIndex(x=>x.id===from),b=axelV9Videos.findIndex(x=>x.id===v.id);if(a<0||b<0||a===b)return;const [item]=axelV9Videos.splice(a,1);axelV9Videos.splice(b,0,item);axelV9RenderList();axelV9Msg('Orden modificado localmente. Presioná «Guardar orden».')});
  list.append(card);
 }
}
async function axelV9SaveOrder(){
 if(axelV9Busy)return;axelV9SetBusy(true);axelV9Msg('Guardando posiciones…');
 try{
  // Evita guardar un orden viejo si otra sesión añadió o eliminó videos.
  const current=await axelV9Read();
  const incoming=axelV9Videos.map(v=>v.id),existing=current.map(v=>v.id);
  if(incoming.length!==existing.length||incoming.some(id=>!existing.includes(id)))throw Error('El listado cambió desde otra sesión. Actualizá antes de ordenar.');
  const {error}=await db.rpc('axel_v9_videos_reordenar',{p_ids:incoming});if(error)throw Error(error.message);
  await axelV9Refresh();axelV9Msg('✅ Orden guardado en Supabase.');
 }catch(e){axelV9Msg('No se pudo guardar el orden: '+e.message,true)}finally{axelV9SetBusy(false)}
}
// Android puede impedir la lectura de metadata de blobs locales aunque el MP4 sea válido.
// Si la lectura falla, se hace una comprobación básica del contenedor y se solicita
// confirmación explícita; no se rechaza automáticamente el archivo.
async function axelV9ValidateFile(file){
 if(!file)throw Error('Seleccioná un archivo MP4');
 if(!/\.mp4$/i.test(file.name)|| (file.type && file.type!=='video/mp4'))throw Error('Solo se aceptan archivos MP4.');
 if(file.size<=0||file.size>AXEL_V9_LIMIT)throw Error('El MP4 debe pesar entre 1 byte y 50 MB.');
 // Comprobar firma ISO-BMFF/MP4 sin depender del decodificador multimedia.
 const header=new Uint8Array(await file.slice(0,32).arrayBuffer());
 const signature=String.fromCharCode(...header.slice(4,8));
 if(header.length<12||signature!=='ftyp')throw Error('El archivo no parece un MP4 válido.');
 const url=window.URL.createObjectURL(file);
 let video=null,timer=null;
 try{
  video=document.createElement('video');video.preload='metadata';video.muted=true;video.playsInline=true;
  const result=await new Promise(resolve=>{
   const finish=(ok)=>{clearTimeout(timer);resolve(ok)};
   video.addEventListener('loadedmetadata',()=>finish(true),{once:true});
   video.addEventListener('error',()=>finish(false),{once:true});
   timer=setTimeout(()=>finish(false),8000);
   video.src=url;video.load();
  });
  if(result&&video.videoWidth>0&&video.videoHeight>0){
   const ratio=video.videoWidth/video.videoHeight;
   if(Math.abs(ratio-9/16)>0.035)throw Error(`El video debe ser vertical 9:16. Detectado: ${video.videoWidth}×${video.videoHeight}.`);
  }else{
   // El formato puede ser perfectamente reproducible: fallo en el lector local del móvil.
   const proceed=window.confirm('Chrome no pudo leer las dimensiones del MP4 en este dispositivo. Si confirmás que el archivo es un video vertical 9:16, podés intentar subirlo. ¿Continuar?');
   if(!proceed)throw Error('Subida cancelada: no se pudieron verificar las dimensiones del video.');
  }
 }finally{
  clearTimeout(timer);
  if(video){video.removeAttribute('src');video.load();}
  window.URL.revokeObjectURL(url);
 }
}

async function axelV9Upload(file){
 await axelV9ValidateFile(file);
 const path='videos/'+crypto.randomUUID()+'.mp4';
 const {error}=await db.storage.from(AXEL_V9_BUCKET).upload(path,file,{contentType:'video/mp4',upsert:false,cacheControl:'3600'});
 if(error)throw Error('Subida fallida: '+error.message);
 return path;
}
function axelV9Form(current=null){
 if(axelV9Busy)return;
 const area=document.getElementById('axel-v9-editor');if(!area)return;area.replaceChildren();
 const form=document.createElement('form');form.className='editor axel-v9-form';
 const heading=document.createElement('h3');heading.textContent=current?'Editar video':'Subir video 9:16';form.append(heading);
 function field(label,control){const wrap=document.createElement('label');wrap.textContent=label;wrap.append(control);form.append(wrap);return control}
 const title=field('Título',document.createElement('input'));title.required=true;title.maxLength=150;title.value=current?.titulo||'';
 const desc=field('Descripción',document.createElement('textarea'));desc.maxLength=1000;desc.value=current?.descripcion||'';
 const file=field(current?'Reemplazar MP4 (opcional)':'Archivo MP4 9:16',document.createElement('input'));file.type='file';file.accept='video/mp4,.mp4';file.required=!current;
 const publicLabel=document.createElement('label');publicLabel.style.display='flex';publicLabel.style.gap='8px';publicLabel.style.alignItems='center';
 const pub=document.createElement('input');pub.type='checkbox';pub.checked=current?.publicado||false;pub.style.width='auto';publicLabel.append(pub,document.createTextNode('Publicado en la página pública'));form.append(publicLabel);
 const actions=document.createElement('div');actions.className='axel-v9-row';
 const submit=document.createElement('button');submit.type='submit';submit.textContent=current?'Guardar cambios':'Subir y guardar';
 actions.append(submit,axelV9Button('Cancelar',()=>area.replaceChildren()));form.append(actions);area.append(form);
 form.scrollIntoView({behavior:'smooth',block:'nearest'});
 form.onsubmit=async e=>{
  e.preventDefault();if(axelV9Busy||!form.reportValidity())return;
  let newPath=null;
  if(current?.publicado&&!pub.checked){} // Ocultar no borra el MP4.
  axelV9SetBusy(true);axelV9Msg('Validando y guardando video…');
  try{
   if(file.files[0]){axelV9Msg('Validando y subiendo MP4…');newPath=await axelV9Upload(file.files[0]);}
   const path=newPath||current?.storage_path;if(!path)throw Error('Seleccioná un archivo MP4');
   const {error}=await db.rpc('axel_v9_video_guardar',{p_id:current?.id||null,p_titulo:title.value.trim(),p_descripcion:desc.value.trim()||null,p_storage_path:path,p_publicado:pub.checked});
   if(error)throw Error(error.message);
   area.replaceChildren();await axelV9Refresh();
   if(current&&newPath&&current.storage_path!==newPath){
    const {error:delError}=await db.storage.from(AXEL_V9_BUCKET).remove([current.storage_path]);
    if(delError)axelV9Msg('✅ Video reemplazado y guardado, pero el archivo anterior no pudo borrarse. Revisar Storage: '+delError.message,true);
    else axelV9Msg('✅ Video reemplazado y archivo anterior retirado.');
   }else axelV9Msg('✅ Video guardado correctamente.');
  }catch(err){
   if(newPath){const {error:cleanup}=await db.storage.from(AXEL_V9_BUCKET).remove([newPath]);if(cleanup)axelV9Msg('Error: '+err.message+'; archivo nuevo pendiente de limpieza: '+newPath,true);else axelV9Msg('Error: '+err.message,true)}else axelV9Msg('Error: '+err.message,true);
  }finally{axelV9SetBusy(false)}
 };
}
async function axelV9Toggle(v){
 if(axelV9Busy)return;
 axelV9SetBusy(true);axelV9Msg(v.publicado?'Ocultando…':'Publicando…');
 try{const {error}=await db.rpc('axel_v9_video_guardar',{p_id:v.id,p_titulo:v.titulo,p_descripcion:v.descripcion,p_storage_path:v.storage_path,p_publicado:!v.publicado});if(error)throw Error(error.message);await axelV9Refresh();axelV9Msg('✅ Visibilidad actualizada.')}catch(e){axelV9Msg('No se pudo actualizar: '+e.message,true)}finally{axelV9SetBusy(false)}
}
async function axelV9Delete(v){
 if(axelV9Busy)return;
 if(!window.confirm('¿Eliminar DEFINITIVAMENTE el MP4 «'+v.titulo+'»? Esta acción no se puede deshacer.'))return;
 axelV9SetBusy(true);axelV9Msg('Retirando video…');
 try{
  // Primero ocultamos el registro para impedir mostrar un video inexistente.
  if(v.publicado){const {error}=await db.rpc('axel_v9_video_guardar',{p_id:v.id,p_titulo:v.titulo,p_descripcion:v.descripcion,p_storage_path:v.storage_path,p_publicado:false});if(error)throw Error('No se pudo ocultar antes de eliminar: '+error.message)}
  const {error:storageError}=await db.storage.from(AXEL_V9_BUCKET).remove([v.storage_path]);if(storageError)throw Error('No se pudo eliminar el MP4: '+storageError.message);
  const {error:dbError}=await db.rpc('axel_v9_video_eliminar',{p_id:v.id});if(dbError)throw Error('Archivo eliminado, pero no se pudo limpiar el registro: '+dbError.message+'. Conservamos el registro oculto para reintentar.');
  await axelV9Refresh();axelV9Msg('✅ Video y registro eliminados.');
 }catch(e){axelV9Msg('Operación incompleta: '+e.message,true);try{await axelV9Refresh()}catch{}}finally{axelV9SetBusy(false)}
}
