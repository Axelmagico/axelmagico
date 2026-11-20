
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const URL = 'https://hxyyvxmockrioesyymhe.supabase.co';
const KEY = 'sb_publishable_NfOs6-XQiiY3_GfLEyZP1A_Z1Bu8DLs';

const db = createClient(URL, KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

const $=id=>document.getElementById(id);
const TABLES={precios:'axel_precios',ciudades:'axel_ciudades',planes:'axel_planes',instrucciones:'axel_instrucciones',conocimientos:'axel_conocimientos',reservas:'axel_solicitudes_reserva'};
const TITLES={precios:['Precios y cobertura','Modificá precios existentes y registrá nuevas combinaciones ciudad/plan.'],ciudades:['Ciudades','Agregá o editá las localidades de cobertura.'],planes:['Planes','Actualizá duraciones, nombres e inclusiones.'],instrucciones:['Instrucciones IA','Guardá reglas comerciales y de conversación.'],conocimientos:['Conocimientos','Mantené la información que utilizará Axel IA.'],reservas:['Solicitudes de reserva','Revisá las solicitudes recibidas. La aprobación y el registro en Calendar se habilitarán en una próxima etapa.']};
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

// Etapa 5A: lectura privada de solicitudes; ninguna acción confirma ni crea eventos.
async function loadReservas(){
 const {data,error}=await db.from('axel_solicitudes_reserva').select('id,creado_en,nombre_cliente,telefono,ciudad,direccion,plan_codigo,plan_nombre,precio_guaranies,fecha_evento,hora_evento,duracion_minutos,estado,notas').order('creado_en',{ascending:false}).limit(200);
 if(error)throw Error(error.message);
 records=data||[];
 const f=$('filters');f.replaceChildren();
 const filter=document.createElement('select');filter.id='reservationFilter';
 for(const [value,title] of [['','Todos los estados'],['pendiente','Pendientes'],['confirmada','Confirmadas'],['rechazada','Rechazadas'],['cancelada','Canceladas']]){const option=document.createElement('option');option.value=value;option.textContent=title;filter.append(option)}
 filter.addEventListener('change',renderReservations);f.append(filter);
 renderReservations();say(`${records.length} solicitudes cargadas (máximo 200).`);
}
function renderReservations(){
 const root=$('tableArea');root.replaceChildren();$('editorArea').replaceChildren();
 const status=$('reservationFilter')?.value||'';
 const rows=records.filter(r=>!status||r.estado===status);
 if(!rows.length){const p=document.createElement('p');p.className='empty';p.textContent='No hay solicitudes para este filtro.';root.append(p);return}
 const wrap=document.createElement('div');wrap.className='tablewrap';
 const table=document.createElement('table');
 const head=document.createElement('thead'),tr=document.createElement('tr');
 for(const title of ['Recibida','Cliente','Contacto','Evento','Servicio','Precio','Estado','Detalles']){const th=document.createElement('th');th.textContent=title;tr.append(th)}head.append(tr);table.append(head);
 const body=document.createElement('tbody');
 for(const r of rows){const row=document.createElement('tr');
 const dateText=r.fecha_evento?String(r.fecha_evento).split('-').reverse().join('/')+' '+String(r.hora_evento||'').slice(0,5):'Sin fecha';
 const values=[new Date(r.creado_en).toLocaleString('es-PY'),r.nombre_cliente||'—',r.telefono||'—',dateText+' · '+(r.ciudad||''),r.plan_nombre||r.plan_codigo||'—',r.precio_guaranies==null?'A confirmar':'Gs. '+Number(r.precio_guaranies).toLocaleString('es-PY'),r.estado||'pendiente'];
 for(const value of values){const td=document.createElement('td');td.textContent=value;row.append(td)}
 const td=document.createElement('td'),button=document.createElement('button');button.className='outline';button.type='button';button.textContent='Ver';button.addEventListener('click',()=>showReservation(r));td.append(button);row.append(td);body.append(row);
 }
 table.append(body);wrap.append(table);root.append(wrap);
}
function showReservation(r){
 const root=$('editorArea');root.replaceChildren();const section=document.createElement('section');section.className='editor';
 const h=document.createElement('h3');h.textContent='Detalle de solicitud';section.append(h);
 const fields=[['ID',r.id],['Nombre',r.nombre_cliente],['WhatsApp',r.telefono],['Ciudad',r.ciudad],['Dirección',r.direccion],['Plan',r.plan_nombre||r.plan_codigo],['Precio',r.precio_guaranies==null?'A confirmar':'Gs. '+Number(r.precio_guaranies).toLocaleString('es-PY')],['Fecha',r.fecha_evento],['Hora',r.hora_evento],['Duración (min)',r.duracion_minutos],['Estado',r.estado],['Notas',r.notas]];
 for(const [name,value] of fields){const p=document.createElement('p');const strong=document.createElement('strong');strong.textContent=name+': ';p.append(strong,document.createTextNode(String(value??'—')));section.append(p)}
 const note=document.createElement('p');note.className='muted';note.textContent='Esta versión permite revisar solicitudes. No aprueba reservas ni crea eventos en Google Calendar.';section.append(note);
 if(r.telefono){const digits=String(r.telefono).replace(/\D/g,'');if(digits.length>=9&&digits.length<=15){const a=document.createElement('a');a.href='https://wa.me/'+digits+'?text='+encodeURIComponent('Hola, te escribimos de Mago Axel por tu solicitud de reserva.');a.target='_blank';a.rel='noopener noreferrer';a.className='reservation-link';a.textContent='Conversar por WhatsApp ↗';section.append(a)}}
 root.append(section);section.scrollIntoView({behavior:'smooth',block:'nearest'});
}

check();
