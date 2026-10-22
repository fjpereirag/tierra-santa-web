// Huellas franciscanas · Tierra Santa en 3D — interfaz y narración por scroll.
import { crearMaqueta } from './maqueta.js?v=9';

const D = window.HF;
const portada = (s, k, extra = '') => { const sp = D.sprites[s], col = k % sp.cols, fila = Math.floor(k / sp.cols);
  return `<span class="spr" ${extra} style="background-image:url(${sp.f});background-size:${sp.cols * 100}% ${sp.rows * 100}%;background-position:${sp.cols > 1 ? col / (sp.cols - 1) * 100 : 0}% ${sp.rows > 1 ? fila / (sp.rows - 1) * 100 : 0}%"></span>`; };
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const movil = matchMedia('(max-width: 700px)').matches || matchMedia('(pointer: coarse)').matches && Math.min(innerWidth, innerHeight) < 760;
const estrecho = () => innerWidth <= 700;
const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sitio = id => D.sites.find(s => s.id === id);
const nombreLugar = { emaus: 'Emaús', ramla: 'Ramla', nebo: 'Monte Nebo', betania: 'Betania', jerusalen: 'Jerusalén', belen: 'Belén', ainkarem: 'Ain Karem', nazaret: 'Nazaret', cana: 'Caná', tabor: 'Monte Tabor', galilea: 'Galilea', tabgha: 'Tabgha', cafarnaun: 'Cafarnaún', jordan: 'Río Jordán', jafa: 'Jafa', betfage: 'Betfagé' };
// desplazamiento de etiquetas en vista lejana para evitar solapes (px)
const DESPLAZA = { emaus: [-74, -52], ramla: [34, -58], nebo: [64, 34], jerusalen: [22, -38], belen: [16, 34], ainkarem: [-78, 6], nazaret: [-70, 4], cana: [-40, -34], tabor: [52, 22], galilea: [36, -30], jordan: [40, -14], jafa: [-44, -4] };
const grupoDe = id => D.groups.find(g => g.sites.includes(id));

// Orden de visita de los santuarios (sigue los grupos geográficos)
const ORDEN = D.groups.flatMap(g => g.sites).map(sitio).filter(Boolean);

$('#mision').textContent = D.mission;

// ================= Paradas del recorrido =================
const iconoTau = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16M6 8h12"/></svg>';
$('#paradas').innerHTML = D.journey.map((p, i) => {
  const s = p.sites.map(sitio).filter(Boolean);
  const img = p.image
    ? `<div class="tarjeta-img"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy"><span class="num">${i + 1}</span></div>`
    : `<div class="tarjeta-sin-img"><span class="num">${i + 1}</span></div>`;
  return `<section class="parada ${i % 2 ? 'derecha' : ''}" id="parada-${p.key}" data-camara="parada-${i}">
    <article class="tarjeta">${img}<div class="tarjeta-cuerpo">
      <span class="etapa"><b class="n-movil">${i + 1} · </b>${esc(p.stage)}</span>
      <h3>${esc(p.name)}</h3>
      <p class="tag">${esc(p.tag)}</p>
      <button class="leer-mas" type="button" aria-expanded="false">Leer más${s.length ? ` · ${s.length} santuario${s.length > 1 ? 's' : ''}` : ''}</button>
      <div class="detalle">
      <p>${esc(p.text)}</p>
      <div class="franciscano">${iconoTau}<span>${esc(p.franciscan)}</span></div>
      ${s.length ? `<div class="chips">${s.map(x => `<button class="chip" type="button" data-sitio="${x.id}"><img src="${esc(x.poster)}" alt="" loading="lazy">${esc(x.name.replace(/ \(.*\)$/, ''))}</button>`).join('')}</div>` : ''}
      </div>
    </div></article></section>`;
}).join('');

$('#paradas').addEventListener('click', e => {
  const b = e.target.closest('.leer-mas'); if (!b) return;
  const t = b.closest('.tarjeta'), abierta = t.classList.toggle('abierta');
  b.setAttribute('aria-expanded', String(abierta));
  b.firstChild.textContent = abierta ? 'Cerrar' : 'Leer más';
});

// navegador de las cinco paradas
const pasos = document.createElement('nav');
pasos.id = 'pasos'; pasos.setAttribute('aria-label', 'Paradas del recorrido');
pasos.innerHTML = `<button type="button" class="paso-flecha" data-paso="-1" aria-label="Parada anterior">‹</button>` +
  D.journey.map((p, i) => `<button type="button" class="paso" data-ir="${i}" aria-label="${i + 1}. ${esc(p.name)}"><i>${i + 1}</i><span>${esc(p.name)}</span></button>`).join('') +
  `<button type="button" class="paso-flecha" data-paso="1" aria-label="Parada siguiente">›</button>`;
document.body.append(pasos);
let pasoActual = -1;
const irParada = i => { const sec = $$('.parada')[Math.max(0, Math.min(D.journey.length - 1, i))]; if (sec) scrollTo({ top: sec.offsetTop + sec.offsetHeight * 0.3, behavior: reducido ? 'auto' : 'smooth' }); };
pasos.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.ir) irParada(Number(b.dataset.ir));
  else irParada(pasoActual < 0 ? 0 : pasoActual + Number(b.dataset.paso));
});

// ================= Escena 3D =================
let maqueta = null;
const barra = $('#carga .barra i');
const etiquetas = $('#etiquetas');
const pines = [];

const ENCUADRES = {
  inicio: () => ({ x: 4, z: 6, distancia: estrecho() ? 330 : 150, polar: estrecho() ? 0.8 : 0.92, azimut: 0.35, giro: 0.035, ox: estrecho() ? 0 : 14, oy: estrecho() ? -24 : 0 }),
  vista: () => ({ x: 6, z: 4, distancia: estrecho() ? 300 : 165, polar: 0.62, azimut: 0.05, ox: estrecho() ? 0 : 16, oy: estrecho() ? -10 : 0 }),
  cenital: () => ({ x: 4, z: 0, distancia: 200, polar: 0.12, azimut: 0, giro: 0.02 }),
  historia: () => { const g = D.groups[0]; return { u: g.u, v: g.v, distancia: 70, polar: 1.15, azimut: 0.9, giro: 0.05 }; },
  'jerusalen-cerca': () => { const g = D.groups[0]; return { u: g.u, v: g.v, distancia: estrecho() ? 34 : 22, polar: 0.95, azimut: -0.5, giro: 0.04, ox: estrecho() ? 0 : -16 }; },
  alto: () => ({ x: 0, z: 0, distancia: 250, polar: 0.4, azimut: -0.35, giro: 0.02 }),
  final: () => ({ x: 6, z: 0, distancia: estrecho() ? 220 : 160, polar: 0.85, azimut: 0.55, giro: 0.04 })
};
const AZ_PARADAS = [0.25, -0.35, 0.55, 0.3, -0.25];
D.journey.forEach((p, i) => {
  ENCUADRES['parada-' + i] = () => ({
    u: p.u, v: p.v, distancia: estrecho() ? 120 : (p.key === 'jerusalen' ? 40 : 50), polar: estrecho() ? 0.55 : 0.85, azimut: estrecho() ? 0 : (AZ_PARADAS[i] || 0), giro: estrecho() ? 0 : 0.015,
    ox: estrecho() ? 0 : (i % 2 ? -17 : 17), oy: estrecho() ? -22 : 0
  });
});

let encuadreActual = 'inicio';
function encuadre(nombre, instantaneo = false) {
  encuadreActual = nombre;
  $$('.pin.ruta').forEach(b => b.classList.toggle('activo', nombre === 'parada-' + b.dataset.parada));
  if (maqueta && !document.body.classList.contains('explorando')) maqueta.irA({ ...ENCUADRES[nombre](), instantaneo });
  else if (plano) colocarPlano(objetivoPlano(nombre), instantaneo);
  const ocultar = ['inicio', 'cenital', 'historia', 'alto', 'jerusalen-cerca', 'final'].includes(nombre);
  document.body.classList.toggle('oculta-etiquetas', ocultar);
}


// ================= Modo ligero =================
// En equipos sin tarjeta gráfica la maqueta 3D se sustituye por el mapa en relieve
// ilustrado, que se desplaza con CSS (sin WebGL). Se puede forzar con ?modo=ligero o ?modo=3d.
const MODO_KEY = 'hf-modo';
const modoPedido = (() => { const q = new URLSearchParams(location.search).get('modo'); if (q) return q; try { return localStorage.getItem(MODO_KEY); } catch (e) { return null; } })();
function graficosDebiles() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2', { failIfMajorPerformanceCaveat: true }) || c.getContext('webgl', { failIfMajorPerformanceCaveat: true });
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(r);
  } catch (e) { return true; }
}
let ligero = modoPedido === 'ligero' || (modoPedido !== '3d' && graficosDebiles());
const guardarModo = m => { try { localStorage.setItem(MODO_KEY, m); } catch (e) {} };
const MAPA = { src: movil ? 'assets3d_relieve-mapa-movil.jpg' : 'assets3d_relieve-mapa.jpg', w: 1842, h: 2809 };
let plano = null, planoObjetivo = { u: 0.5, v: 0.5, z: 1, px: 0.5, py: 0.5 };
function montarPlano() {
  if (plano) return;
  plano = document.createElement('div');
  plano.id = 'plano'; plano.setAttribute('aria-hidden', 'true');
  plano.innerHTML = `<div class="plano-in"><img src="${MAPA.src}" alt="" width="${MAPA.w}" height="${MAPA.h}" decoding="async">` +
    D.journey.map((p, i) => `<span class="plano-pt" style="left:${p.u * 100}%;top:${p.v * 100}%"><i>${i + 1}</i><b>${esc(p.name)}</b></span>`).join('') + '</div>';
  $('#escena').after(plano);
  $('#escena').style.display = 'none';
}
function objetivoPlano(nombre) {
  const e = estrecho(), J = D.groups[0];
  if (nombre.startsWith('parada-')) {
    const i = Number(nombre.slice(7)), p = D.journey[i];
    return { u: p.u, v: p.v, z: e ? 1.9 : 2.6, px: e ? 0.5 : (i % 2 ? 0.33 : 0.67), py: e ? 0.32 : 0.5, activo: i };
  }
  if (nombre === 'jerusalen-cerca') return { u: J.u, v: J.v, z: e ? 2.2 : 3, px: e ? 0.5 : 0.34, py: e ? 0.32 : 0.5 };
  if (nombre === 'historia') return { u: J.u, v: J.v, z: 2.2, px: 0.5, py: 0.5 };
  if (nombre === 'inicio' || nombre === 'vista') return { u: 0.5, v: 0.5, z: 1, px: e ? 0.5 : 0.68, py: 0.5 };
  return { u: 0.5, v: 0.5, z: 1, px: 0.5, py: 0.5 };
}
function colocarPlano(o = planoObjetivo, instantaneo = false) {
  if (!plano) return;
  planoObjetivo = o;
  const W = innerWidth, H = innerHeight;
  const base = Math.max(H / MAPA.h, (estrecho() ? W : W * 0.42) / MAPA.w) * 1.04;
  const s = base * o.z;
  const x = o.px * W - o.u * MAPA.w * s, y = o.py * H - o.v * MAPA.h * s;
  const inn = plano.firstElementChild;
  inn.style.transition = instantaneo || reducido ? 'none' : '';
  inn.style.transform = `translate3d(${x}px,${y}px,0) scale(${s})`;
  inn.style.setProperty('--inv', (1 / s).toFixed(4));
  $$('.plano-pt', inn).forEach((el, i) => el.classList.toggle('activo', i === o.activo));
}
addEventListener('resize', () => { if (plano) colocarPlano(objetivoPlano(encuadreActual), true); });
function avisoModo(texto, boton, accion) {
  const a = document.createElement('div');
  a.className = 'aviso-modo'; a.setAttribute('role', 'status');
  a.innerHTML = `<span>${texto}</span><button type="button" class="btn vidrio">${boton}</button><button type="button" class="cerrar-aviso" aria-label="Cerrar aviso">×</button>`;
  a.querySelector('.btn').onclick = accion;
  a.querySelector('.cerrar-aviso').onclick = () => a.remove();
  document.body.append(a);
  setTimeout(() => a.classList.add('visible'), 50);
  setTimeout(() => { a.classList.remove('visible'); setTimeout(() => a.remove(), 600); }, 12000);
}
function activarLigero(motivo) {
  ligero = true;
  if (maqueta) { maqueta.detener(); maqueta = null; }
  document.body.classList.add('ligero', 'sin-3d');
  etiquetas.innerHTML = ''; pines.length = 0;
  $$('[data-explorar]').forEach(b => b.hidden = true);
  montarPlano();
  colocarPlano(objetivoPlano(encuadreActual), true);
  $('#carga').classList.add('listo');
  actualizarBotonModo();
  if (motivo) avisoModo(motivo, 'Ver en 3D', () => { guardarModo('3d'); location.reload(); });
}
function actualizarBotonModo() {
  const b = $('[data-modo]'); if (!b) return;
  b.textContent = ligero ? 'Ver la maqueta en 3D' : 'Usar el modo ligero (equipos sin tarjeta gráfica)';
}
document.addEventListener('click', e => {
  if (!e.target.closest('[data-modo]')) return;
  guardarModo(ligero ? '3d' : 'ligero'); location.reload();
});
// Vigilancia de fluidez: si la maqueta va a menos de ~20 fotogramas por segundo, pasa a modo ligero.
function vigilarFluidez() {
  if (modoPedido === '3d') return;
  let lentos = 0;
  const medir = () => {
    if (!maqueta) return;
    if (document.hidden) { setTimeout(medir, 2000); return; }
    let n = 0; const t0 = performance.now();
    const cuenta = () => { n++; if (performance.now() - t0 < 2500) requestAnimationFrame(cuenta); else fin(); };
    const fin = () => {
      const fps = n * 1000 / (performance.now() - t0);
      if (fps < 20) lentos++; else lentos = 0;
      if (lentos >= 2) activarLigero('Este equipo mueve la maqueta 3D con dificultad. Hemos activado el modo ligero para que la web vaya fluida.');
      else if (lentos) medir();
    };
    requestAnimationFrame(cuenta);
  };
  setTimeout(medir, 1500);
}

async function iniciar3D() {
  actualizarBotonModo();
  if (ligero) { activarLigero(modoPedido === 'ligero' ? null : 'Este equipo no tiene aceleración gráfica: se muestra el mapa ilustrado en lugar de la maqueta 3D.'); return; }
  try {
    maqueta = await crearMaqueta($('#escena'), { movil, alProgreso: p => { barra.style.width = Math.round(p * 100) + '%'; } });
  } catch (e) {
    console.warn('No se pudo iniciar la maqueta 3D', e);
    activarLigero(null);
    return;
  }
  // faros y etiquetas
  D.groups.forEach(g => {
    maqueta.faro(g.u, g.v, g.sites.length > 2 ? 9 : 6, g.sites.length > 2 ? 0.55 : 0.4);
    const b = document.createElement('button');
    b.className = 'pin grupo'; b.type = 'button';
    b.innerHTML = `<span class="hilo"></span><span class="punto"></span><b>${esc(g.name)}<i>${g.sites.length}</i></b>`;
    b.setAttribute('aria-label', `${g.name}: ${g.sites.length} santuario${g.sites.length > 1 ? 's' : ''} en vídeo`);
    b.onclick = () => abrirLugar(g, b);
    etiquetas.append(b);
    pines.push({ el: b, p: maqueta.puntoUV(g.u, g.v, 0.4), grupo: g, off: DESPLAZA[g.key] || [0, 0] });
  });
  // las cinco paradas del recorrido (solo fuera del modo exploración)
  const DESPLAZA_RUTA = { jerusalen: [0, -38], belen: [18, 34], nazaret: [-44, -6], galilea: [34, -30], jordan: [44, 0] };
  D.journey.forEach((p, i) => {
    const b = document.createElement('a');
    b.className = 'pin ruta'; b.href = '#parada-' + p.key; b.dataset.parada = i;
    b.innerHTML = `<span class="hilo"></span><span class="punto"></span><b><i>${i + 1}</i>${esc(p.name)}</b>`;
    etiquetas.append(b);
    pines.push({ el: b, p: maqueta.puntoUV(p.u, p.v, 0.4), off: DESPLAZA_RUTA[p.key] || [0, 0], ruta: i });
  });
  D.places.filter(p => !D.groups.some(g => g.key === p.key) && !['galilea'].includes(p.key)).forEach(p => {
    const b = document.createElement('div');
    b.className = 'pin menor'; b.innerHTML = `<b>${esc(p.name)}</b>`;
    etiquetas.append(b);
    pines.push({ el: b, p: maqueta.puntoUV(p.u, p.v, 0.2), menor: true });
  });
  maqueta.crearRuta(D.journey);
  maqueta.alFotograma = actualizarPines;
  encuadre(encuadreActual);
  setTimeout(() => $('#carga').classList.add('listo'), 250);
  vigilarFluidez();
}

function actualizarPines() {
  if (etiquetas.scrollTop || etiquetas.scrollLeft) etiquetas.scrollTop = etiquetas.scrollLeft = 0;
  const explorando = document.body.classList.contains('explorando');
  for (const pin of pines) {
    const r = maqueta.proyectar(pin.p);
    const lejos = !r.visible || (pin.menor && r.dist > (explorando ? 150 : 0)) || r.x < -150 || r.x > innerWidth + 150 || r.y < -80 || r.y > innerHeight + 80;
    if (pin.el.classList.contains('lejos') !== lejos) { pin.el.classList.toggle('lejos', lejos); pin.el.style.visibility = lejos ? 'hidden' : ''; }
    if (!lejos) {
      const f = pin.off ? (r.dist < 18 ? 0.5 : 1) : 0;
      const dx = pin.off ? pin.off[0] * f : 0, dy = pin.off ? pin.off[1] * f : 0;
      pin.el.style.transform = `translate(${r.x.toFixed(1)}px,${r.y.toFixed(1)}px)`;
      if (pin.off) {
        const lx = dx, ly = dy - 16, largo = Math.hypot(lx, ly), ang = Math.atan2(ly, lx);
        pin.el.style.setProperty('--dx', dx.toFixed(1) + 'px'); pin.el.style.setProperty('--dy', dy.toFixed(1) + 'px');
        pin.el.style.setProperty('--largo', largo.toFixed(1) + 'px'); pin.el.style.setProperty('--ang', ang.toFixed(3) + 'rad');
      }
    }
  }
}

// ================= Narración por scroll =================
const escenas = () => $$('[data-camara]');
let progresoRutaObjetivo = 0, progresoRutaActual = 0;
function alDesplazar() {
  const centro = innerHeight * 0.5;
  let elegido = null;
  for (const s of escenas()) {
    const r = s.getBoundingClientRect();
    if (r.top <= centro && r.bottom >= centro) { elegido = s; break; }
  }
  if (elegido && elegido.dataset.camara !== encuadreActual) encuadre(elegido.dataset.camara);
  // la ruta se dibuja mientras avanzan las paradas
  const paradas = $$('.parada');
  if (paradas.length) {
    const ini = $('#recorrido').getBoundingClientRect().top;
    const fin = paradas[paradas.length - 1].getBoundingClientRect().top;
    const p = (centro - ini) / Math.max(1, fin - ini);
    progresoRutaObjetivo = Math.max(0, Math.min(1, p));
  }
  $('.cabecera').classList.toggle('solida', scrollY > 40);
  const enRecorrido = encuadreActual.startsWith('parada-') || encuadreActual === 'vista';
  document.body.classList.toggle('en-recorrido', enRecorrido);
  pasoActual = encuadreActual.startsWith('parada-') ? Number(encuadreActual.slice(7)) : -1;
  $$('#pasos .paso').forEach((b, i) => { b.classList.toggle('activo', i === pasoActual); b.classList.toggle('hecho', i < pasoActual); });
  const ids = ['recorrido', 'santuarios', 'historia', 'franciscanos', 'revista', 'cien-anos', 'objetos', 'escucha'];
  let activo = null;
  ids.forEach(id => { const r = $('#' + id).getBoundingClientRect(); if (r.top < centro) activo = id; });
  if ($$('.parada').some(p => { const r = p.getBoundingClientRect(); return r.top < centro && r.bottom > centro; })) activo = 'recorrido';
  $$('.menu a').forEach(a => a.classList.toggle('actual', a.getAttribute('href') === '#' + activo));
  animarHistoria();
}
addEventListener('scroll', alDesplazar, { passive: true });
let anchoPrevio = innerWidth;
addEventListener('resize', () => { if (Math.abs(innerWidth - anchoPrevio) < 2) return; anchoPrevio = innerWidth; encuadre(encuadreActual); construirCarrusel(); construirTorre(); });
(function lazo() {
  progresoRutaActual += (progresoRutaObjetivo - progresoRutaActual) * 0.06;
  if (maqueta) maqueta.progresoRuta(progresoRutaActual);
  requestAnimationFrame(lazo);
})();

// tarjetas que aparecen
const obs = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && e.target.classList.add('visible')), { threshold: 0.25 });
$$('.tarjeta').forEach(t => obs.observe(t));

// ================= Carrusel de santuarios =================
const anillo = $('#anillo');
let giro = 0, giroObjetivo = 0, radio = 600, pasoAng = 360 / ORDEN.length, frente = 0;
function construirCarrusel() {
  const w = Math.max(200, Math.min(300, innerWidth * 0.62)), h = w * 0.62 + 50;
  radio = Math.round((w / 2) / Math.tan(Math.PI / ORDEN.length) + 24);
  anillo.innerHTML = ORDEN.map((s, i) => `<button class="poster" type="button" data-i="${i}" data-sitio="${s.id}" style="--w:${w}px;--h:${h}px;transform:rotateY(${i * pasoAng}deg) translateZ(${radio}px)" aria-label="Ver ${esc(s.name)}">
    <img src="${esc(s.poster)}" alt="" loading="lazy" draggable="false"><span class="play"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span>
    <span><small>${esc(nombreLugar[s.place] || s.placeName)}</small>${esc(s.name)}</span></button>`).join('');
  pintarCarrusel(true);
}
function pintarCarrusel() {
  anillo.style.transform = `translateZ(${-radio}px) rotateY(${giro}deg)`;
  const f = ((Math.round(-giro / pasoAng) % ORDEN.length) + ORDEN.length) % ORDEN.length;
  if (f !== frente || !anillo.dataset.ok) {
    frente = f; anillo.dataset.ok = 1;
    $$('.poster', anillo).forEach((p, i) => {
      const d = Math.min(Math.abs(i - f), ORDEN.length - Math.abs(i - f));
      p.classList.toggle('frente', d === 0); p.classList.toggle('oculto', d > 2);
      p.tabIndex = d === 0 ? 0 : -1;
    });
    const s = ORDEN[f];
    $('#carruselNombre').innerHTML = `${esc(s.name)}<small>${esc(nombreLugar[s.place] || s.placeName)} · ${s.nuevo ? 'vídeo' : 'vídeo con música'}</small>`;
    $$('#filtros button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.grupo === grupoDe(s.id)?.key)));
  }
}
function girarA(i) { giroObjetivo = -i * pasoAng; }
(function animCarrusel() {
  giro += (giroObjetivo - giro) * (reducido ? 1 : 0.1);
  pintarCarrusel();
  requestAnimationFrame(animCarrusel);
})();
$('#filtros').innerHTML = D.groups.map(g => `<button type="button" role="tab" data-grupo="${g.key}">${esc(g.name)} · ${g.sites.length}</button>`).join('');
$('#filtros').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  const g = D.groups.find(x => x.key === b.dataset.grupo);
  const i = ORDEN.findIndex(s => s.id === g.sites[0]);
  const actual = Math.round(-giroObjetivo / pasoAng);
  const n = ORDEN.length, delta = ((i - actual) % n + n + n / 2) % n - n / 2;
  girarA(actual + delta);
};
$$('[data-giro]').forEach(b => b.onclick = () => girarA(Math.round(-giroObjetivo / pasoAng) + Number(b.dataset.giro)));
$('#carrusel').addEventListener('keydown', e => {
  if (e.key === 'ArrowRight') { girarA(Math.round(-giroObjetivo / pasoAng) + 1); e.preventDefault(); }
  if (e.key === 'ArrowLeft') { girarA(Math.round(-giroObjetivo / pasoAng) - 1); e.preventDefault(); }
  if (e.key === 'Enter') abrirSitio(ORDEN[frente].id);
});
arrastrable($('#carrusel'), dx => { giroObjetivo += dx * 0.18; giro = giroObjetivo; }, () => { giroObjetivo = Math.round(giroObjetivo / pasoAng) * pasoAng; });
anillo.addEventListener('click', e => {
  const p = e.target.closest('.poster'); if (!p || arrastre.movido) return;
  const i = Number(p.dataset.i);
  if (i === frente) abrirSitio(p.dataset.sitio);
  else { const actual = Math.round(-giroObjetivo / pasoAng), n = ORDEN.length; girarA(actual + (((i - actual) % n + n + n / 2) % n - n / 2)); }
});

// arrastre genérico (ratón y táctil), respeta el scroll vertical
const arrastre = { movido: false };
function arrastrable(el, alMover, alSoltar) {
  let x0 = null, y0 = 0, horizontal = null;
  el.addEventListener('pointerdown', e => { x0 = e.clientX; y0 = e.clientY; horizontal = null; arrastre.movido = false; });
  addEventListener('pointermove', e => {
    if (x0 === null) return;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    if (horizontal === null && Math.hypot(dx, dy) > 6) horizontal = Math.abs(dx) > Math.abs(dy);
    if (horizontal) { arrastre.movido = true; alMover(dx); x0 = e.clientX; }
  });
  addEventListener('pointerup', () => { if (x0 !== null && arrastre.movido) alSoltar(); x0 = null; setTimeout(() => arrastre.movido = false, 30); });
  addEventListener('pointercancel', () => { x0 = null; });
}

// ================= Historia: túnel en profundidad =================
const etapas = D.history.stages;
$('#tunel').innerHTML = etapas.map((s, i) => `<figure class="etapa3d" data-i="${i}">
  <img src="assets_entrada_historia_${esc(s.image)}" alt="${esc(s.name)}" loading="${i < 2 ? 'eager' : 'lazy'}">
  <figcaption class="rotulo"><small>${esc(s.period)}</small><b>${esc(s.name)}</b></figcaption></figure>`).join('');
$('#regla').innerHTML = etapas.map((s, i) => `<li><button type="button" data-etapa="${i}">${esc(s.period)}</button></li>`).join('');
$('#regla').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  const sec = $('#historia'), alto = sec.offsetHeight - innerHeight;
  scrollTo({ top: sec.offsetTop + alto * (Number(b.dataset.etapa) / (etapas.length - 1)) * 0.92, behavior: reducido ? 'auto' : 'smooth' });
};
function animarHistoria() {
  const sec = $('#historia'), r = sec.getBoundingClientRect();
  const p = Math.max(0, Math.min(1, -r.top / Math.max(1, sec.offsetHeight - innerHeight) / 0.92));
  const bruto = p * (etapas.length - 1), base = Math.floor(bruto), fr = Math.min(1, Math.max(0, (bruto - base - 0.45) / 0.55));
  const pos = Math.min(etapas.length - 1, base + fr * fr * (3 - 2 * fr));
  $$('.etapa3d').forEach((el, i) => {
    const d = i - pos;                       // >0 por delante (lejos), <0 ya atravesada
    const z = -d * 900, lado = (i % 2 ? 1 : -1) * Math.min(Math.abs(d), 1.5) * (estrecho() ? 40 : 160);
    const op = d < -0.35 ? 0 : d < 0 ? 1 + d / 0.35 : Math.max(0, 1 - d * 0.55);
    el.style.transform = `translate3d(${lado}px,-50%,${z}px) rotateY(${-lado * 0.04}deg)`;
    el.style.opacity = op.toFixed(3);
    el.style.zIndex = String(100 - i);
    el.style.filter = d > 0.5 ? `brightness(${Math.max(0.35, 1 - d * 0.35)})` : 'none';
    el.style.visibility = op <= 0 ? 'hidden' : 'visible';
  });
  const act = Math.round(pos);
  $$('#regla button').forEach((b, i) => {
    const era = b.classList.contains('activo'); b.classList.toggle('activo', i === act);
    if (i === act && !era) { const r = $('#regla'); r.scrollTo({ left: b.offsetLeft - (r.clientWidth - b.offsetWidth) / 2, behavior: reducido ? 'auto' : 'smooth' }); }
  });
}

// ================= Presencia: mosaico con inclinación =================
const mosaico = $('#frMosaico');
if (!reducido && matchMedia('(pointer: fine)').matches) {
  mosaico.addEventListener('pointermove', e => {
    const r = mosaico.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    $$('figure', mosaico).forEach(f => { f.style.setProperty('--ry', (x * 14).toFixed(2)); f.style.setProperty('--rx', (-y * 10).toFixed(2)); });
  });
  mosaico.addEventListener('pointerleave', () => $$('figure', mosaico).forEach(f => { f.style.setProperty('--ry', 0); f.style.setProperty('--rx', 0); }));
}

// ================= Revista: buscador en el texto completo (solo muestra portadas) =================
const BR = { cat: null, shards: {}, pagina: 0, lista: [], filtro: null, orden: 'relevancia', ultima: null };
const brNorm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const BR_STOP = new Set('que los las del por con una para como mas pero sus este esta estos estas ese esa eso esos esas entre cuando muy sin sobre tambien hasta hay donde quien desde todo todos todas toda nos durante uno unos unas les contra otros otras otra otro ante ellos ella ellas esto antes algo tanto mucho muchos muchas nada poco cual cuales sido ser son fue fueron era eran han habia haber siempre ademas asi aqui alli solo cada mismo misma tan bien puede pues porque segun sea sino tras vez veces dicho dicha mientras luego entonces aun'.split(' '));
async function brCatalogo() {
  if (!BR.cat) BR.cat = fetch('assets_buscador_catalogo.json').then(r => { if (!r.ok) throw 0; return r.json(); });
  return BR.cat;
}
function brShard(cat, w) {
  const p = w.slice(0, 2); let lo = 0;
  for (let i = 0; i < cat.starts.length; i++) if (cat.starts[i] <= p) lo = i; else break;
  if (!BR.shards[lo]) BR.shards[lo] = fetch(`assets_buscador_i${String(lo).padStart(2, '0')}.json`).then(r => { if (!r.ok) throw 0; return r.json(); });
  return BR.shards[lo];
}
function brDecod(s) { // lista «delta[.menciones]» en base 36 → Map(número → menciones)
  const m = new Map(); let d = -1;
  for (const t of s.split(',')) { const [a, b] = t.split('.'); d += parseInt(a, 36) + 1; m.set(d, b ? parseInt(b, 36) : 1); }
  return m;
}
function brVariantes(w) { // singular / plural sencillos, y comodín final «*»
  if (w.endsWith('*')) return { pref: w.slice(0, -1) };
  const v = new Set([w, w + 's', w + 'es']);
  if (w.endsWith('es') && w.length > 4) v.add(w.slice(0, -2));
  if (w.endsWith('s') && w.length > 3) v.add(w.slice(0, -1));
  return { set: v };
}
async function brBuscar(q) {
  const res = $('#brRes');
  const palabras = [...new Set((brNorm(q).match(/[a-zñ0-9*]+/g) || []).filter(w => (w.length >= 3 || /^\d{4}$/.test(w)) && !BR_STOP.has(w)))].slice(0, 6);
  if (!palabras.length) { res.innerHTML = `<p class="br-nada">Escribe al menos una palabra de tres letras o más.</p>`; return; }
  res.innerHTML = `<p class="br-cargando">Buscando en un siglo de revista…</p>`;
  let cat;
  try {
    cat = await brCatalogo();
    const porPalabra = await Promise.all(palabras.map(async w => {
      const sh = await brShard(cat, w.replace('*', '')), v = brVariantes(w), tot = new Map();
      const claves = v.pref ? (v.pref.length >= 3 ? Object.keys(sh).filter(k => k.startsWith(v.pref)) : []) : [...v.set].filter(k => sh[k]);
      for (const k of claves) for (const [d, n] of brDecod(sh[k])) tot.set(d, (tot.get(d) || 0) + n);
      return tot;
    }));
    const N = cat.docs.length, idf = porPalabra.map(m => Math.log(1 + N / (1 + m.size)));
    const todos = new Map();
    porPalabra.forEach((m, i) => m.forEach((n, d) => { const t = todos.get(d) || { d, n: 0, k: 0, s: 0 }; t.n += n; t.k++; t.s += Math.log(1 + n) * idf[i]; todos.set(d, t); }));
    let lista = [...todos.values()].filter(t => t.k === palabras.length), parcial = false;
    if (!lista.length && palabras.length > 1) { lista = [...todos.values()]; parcial = true; }
    BR.lista = lista; BR.filtro = null; BR.pagina = 1; BR.ultima = { palabras, parcial, texto: q.trim().replace(/\s+/g, ' ') };
    brPintar(cat);
  } catch (e) {
    res.innerHTML = `<p class="br-nada">No se ha podido cargar el buscador. Comprueba la conexión e inténtalo de nuevo.</p>`;
  }
}
function brTarjeta(cat, t) {
  const [num, fecha, , slug, s, k] = cat.docs[t.d], sp = cat.sprites[s], col = k % sp.cols, fila = Math.floor(k / sp.cols);
  return `<a class="br-tarjeta" href="https://revistatierrasanta.com/revistas/revista-${esc(slug)}/" target="_blank" rel="noopener" aria-label="Tierra Santa nº ${esc(num)}, ${esc(fecha)}: ${t.n} menciones. Abre la revista en la hemeroteca oficial">
    <span class="br-port" style="background-image:url(${sp.f});background-size:${sp.cols * 100}% ${sp.rows * 100}%;background-position:${col / (sp.cols - 1) * 100}% ${sp.rows > 1 ? fila / (sp.rows - 1) * 100 : 0}%"></span>
    <span class="br-dato"><b>nº ${esc(num)}</b><small>${esc(fecha)}</small><em>${t.n} ${t.n === 1 ? 'mención' : 'menciones'}</em></span>
    <span class="br-ir" aria-hidden="true">Hemeroteca oficial ↗</span></a>`;
}
function brPintar(cat) {
  const res = $('#brRes'), { parcial, texto } = BR.ultima;
  if (!BR.lista.length) {
    res.innerHTML = `<p class="br-nada">Ninguna revista contiene «${esc(texto)}». Prueba con otra forma de la palabra, sin tildes o con un asterisco al final (por ejemplo <b>francisc*</b>).</p>`; return;
  }
  const dec = new Map(); BR.lista.forEach(t => { const d = Math.floor(cat.docs[t.d][2] / 10) * 10; dec.set(d, (dec.get(d) || 0) + 1); });
  const decs = [...new Set(cat.docs.map(x => Math.floor(x[2] / 10) * 10))].sort((a, b) => a - b), max = Math.max(...dec.values());
  let lista = BR.filtro == null ? BR.lista : BR.lista.filter(t => Math.floor(cat.docs[t.d][2] / 10) * 10 === BR.filtro);
  lista = [...lista].sort(BR.orden === 'fecha' ? (a, b) => a.d - b.d : (a, b) => b.s - a.s || a.d - b.d);
  const ver = lista.slice(0, BR.pagina * 24);
  const total = BR.lista.length;
  res.innerHTML = `<div class="br-cabeza">
      <p class="br-resumen">${parcial ? `Ningún número reúne todas las palabras; <b>${total}</b> ${total === 1 ? 'tiene' : 'tienen'} alguna de ellas.` : `«${esc(texto)}» aparece en <b>${total}</b> ${total === 1 ? 'número' : 'números'} de la revista.`}</p>
      <div class="br-orden" role="group" aria-label="Ordenar resultados"><button type="button" data-br-orden="relevancia" aria-pressed="${BR.orden === 'relevancia'}">Más menciones</button><button type="button" data-br-orden="fecha" aria-pressed="${BR.orden === 'fecha'}">Por fecha</button></div>
    </div>
    <div class="br-decadas" role="group" aria-label="Filtrar por década">${decs.map(d => { const n = dec.get(d) || 0; return `<button type="button" data-br-dec="${d}" aria-pressed="${BR.filtro === d}" ${n ? '' : 'disabled'} title="${n} ${n === 1 ? 'número' : 'números'} en los ${d}s"><i><b style="--h:${n / max}"></b></i><span>${String(d).slice(2)}s</span><small>${n || ''}</small></button>`; }).join('')}</div>
    ${BR.filtro != null ? `<p class="br-filtro">Solo los ${BR.filtro}s · <button type="button" class="enlace-modo" data-br-dec="todas">ver todas las décadas</button></p>` : ''}
    <div class="br-rejilla">${ver.map(t => brTarjeta(cat, t)).join('')}</div>
    ${lista.length > ver.length ? `<div class="acciones centro"><button type="button" class="btn vidrio" data-br-mas>Ver ${Math.min(24, lista.length - ver.length)} más (quedan ${lista.length - ver.length})</button></div>` : ''}
    <p class="br-nota">El buscador solo indica en qué números aparece cada palabra; el texto de la revista se lee en la <a href="https://revistatierrasanta.com/hemeroteca/" target="_blank" rel="noopener">hemeroteca oficial</a>. El texto se ha obtenido por reconocimiento automático y puede tener erratas.</p>`;
}
(function montarBuscador() {
  const f = $('#brForm'), q = $('#brQ'); if (!f) return;
  f.addEventListener('submit', e => { e.preventDefault(); brBuscar(q.value); });
  q.addEventListener('focus', () => brCatalogo().catch(() => { BR.cat = null; }), { once: true });
  $('#buscaRev').addEventListener('click', e => {
    const ej = e.target.closest('[data-br]'); if (ej) { q.value = ej.dataset.br; brBuscar(q.value); return; }
    const o = e.target.closest('[data-br-orden]'); if (o) { BR.orden = o.dataset.brOrden; BR.pagina = 1; brCatalogo().then(brPintar); return; }
    const d = e.target.closest('[data-br-dec]'); if (d) { const v = d.dataset.brDec; BR.filtro = v === 'todas' || BR.filtro === +v ? null : +v; BR.pagina = 1; brCatalogo().then(brPintar); return; }
    if (e.target.closest('[data-br-mas]')) { BR.pagina++; brCatalogo().then(brPintar); }
  });
})();

// ================= Revista: torre helicoidal de portadas =================
const decadas = [...new Set(D.covers.map(c => Math.floor(c.y / 10) * 10))].sort();
const arrastreT = { activo: false };
let decada = decadas[0], giroT = 0, giroTObj = 0, giroTMax = 0, porVuelta = 12, paso = 180;
$('#decadas').innerHTML = decadas.map(d => `<button type="button" role="tab" data-d="${d}" aria-selected="${d === decada}">${d}s</button>`).join('');
$('#decadas').onclick = e => { const b = e.target.closest('button'); if (!b) return; decada = Number(b.dataset.d); $$('#decadas button').forEach(x => x.setAttribute('aria-selected', String(x === b))); construirTorre(); };
function portadasDecada() { return D.covers.filter(c => Math.floor(c.y / 10) * 10 === decada); }
function construirTorre() {
  const lista = portadasDecada();
  $('#torreMarco').classList.toggle('tira', estrecho());
  if (estrecho()) {
    giroT = giroTObj = giroTMax = 0;
    $('#torre').style.transform = '';
    $('#torre').innerHTML = lista.map((c, i) => `<a class="portada-r" href="https://revistatierrasanta.com/hemeroteca/" target="_blank" rel="noopener" data-n="nº ${c.n}" data-i="${i}" draggable="false" aria-label="Tierra Santa nº ${c.n}${c.d ? ', ' + esc(c.d) : ''}. Abre la hemeroteca oficial">
      ${portada(c.s, c.k)}</a>`).join('');
    $('#torreMarco').scrollLeft = 0;
    $('#torreInfo').innerHTML = `${lista.length} números en los ${decada}s · desliza para ver más`;
    return;
  }
  const radioT = estrecho() ? 250 : 380;
  paso = estrecho() ? 150 : 190; porVuelta = estrecho() ? 10 : 12;
  giroT = giroTObj = 0; giroTMax = Math.max(0, (lista.length - 1) * 360 / porVuelta);
  $('#torre').innerHTML = lista.map((c, i) => {
    const ang = i * 360 / porVuelta, y = i * paso / porVuelta;
    return `<a class="portada-r" href="https://revistatierrasanta.com/hemeroteca/" target="_blank" rel="noopener" data-n="nº ${c.n}" data-i="${i}" draggable="false"
      style="transform:rotateY(${ang}deg) translateY(${y}px) translateZ(${radioT}px)" aria-label="Tierra Santa nº ${c.n}${c.d ? ', ' + esc(c.d) : ''}. Abre la hemeroteca oficial">
      ${portada(c.s, c.k)}</a>`;
  }).join('');
  pintarTorre(true);
}
let frenteT = -1;
function pintarTorre(forzar) {
  if (estrecho()) return;
  const lista = portadasDecada();
  $('#torre').style.transform = `translateY(${-giroT / 360 * paso - 20}px) rotateY(${-giroT}deg)`;
  const f = Math.max(0, Math.min(lista.length - 1, Math.round(giroT / (360 / porVuelta))));
  if (f !== frenteT || forzar) {
    frenteT = f; const c = lista[f];
    if (c) $('#torreInfo').innerHTML = `<b>Tierra Santa nº ${c.n}</b>${c.d ? ' · ' + esc(c.d) : ''}${c.pg ? ' · ' + c.pg + ' páginas' : ''} — ${lista.length} números en los ${decada}s`;
  }
}
(function animTorre() {
  if (!reducido && !arrastreT.activo && document.visibilityState === 'visible') {
    const r = $('#revista').getBoundingClientRect();
    if (r.top < innerHeight && r.bottom > 0) giroTObj = Math.min(giroTMax, giroTObj + 0.06);
  }
  giroT += (giroTObj - giroT) * 0.1;
  pintarTorre();
  requestAnimationFrame(animTorre);
})();
arrastrable($('#torreMarco'), dx => { if (estrecho()) return; arrastreT.activo = true; giroTObj = Math.max(0, Math.min(giroTMax, giroTObj - dx * 0.35)); }, () => { arrastreT.activo = false; });
$('#torreMarco').addEventListener('click', e => { if (arrastre.movido && !estrecho()) e.preventDefault(); }, true);
$('#torreMarco').addEventListener('keydown', e => {
  const k = 360 / porVuelta;
  if (e.key === 'ArrowRight') { giroTObj = Math.min(giroTMax, giroTObj + k); e.preventDefault(); }
  if (e.key === 'ArrowLeft') { giroTObj = Math.max(0, giroTObj - k); e.preventDefault(); }
});

// ================= Ventana del santuario =================
const ventana = $('#ventana'), vVideo = $('#vVideo');
let sitioActual = 0;
function abrirSitio(id) {
  const i = ORDEN.findIndex(s => s.id === id); if (i < 0) return;
  sitioActual = i; pintarSitio();
  if (!ventana.open) ventana.showModal();
}
function pintarSitio() {
  const s = ORDEN[sitioActual];
  vVideo.pause(); vVideo.loop = true; vVideo.poster = s.poster; vVideo.src = s.video; vVideo.load();
  $('#vLugar').textContent = nombreLugar[s.place] || s.placeName;
  $('#vTitulo').textContent = s.name;
  const L = s.lesson, F = s.faith;
  let h = '';
  if (L) h += `<h4>El lugar</h4><p>${esc(L.intro)}</p>${L.meaning ? `<h4>Qué recordamos</h4><p>${esc(L.meaning)}</p>` : ''}${L.look ? `<h4>Fíjate en</h4><p>${esc(L.look)}</p>` : ''}`;
  h = botonSonido(s.id) + h;
  h += bloqueSiglo(s);
  if (F) h += `<div class="reflexion"><b>${esc(F.title)}</b>${F.paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}</div>`;
  if (s.mags?.length) h += `<h4>Este lugar en la revista · ${s.magCount} números</h4><div class="v-revistas">${s.mags.map(m => `<a href="https://revistatierrasanta.com/hemeroteca/" target="_blank" rel="noopener" title="Tierra Santa nº ${m.n}">${portada(m.s, m.k, 'role="img" aria-label="Portada nº ' + m.n + '"')}nº ${m.n}</a>`).join('')}</div>`;
  const enlaces = [L?.url && `<a href="${esc(L.url)}" target="_blank" rel="noopener">Custodia de Tierra Santa ↗</a>`, s.source && s.source.includes('custodia') && !L?.url && `<a href="${esc(s.source)}" target="_blank" rel="noopener">Ficha en custodia.org ↗</a>`].filter(Boolean);
  if (enlaces.length) h += `<div class="v-enlaces">${enlaces.join('')}</div>`;
  $('#vTexto').innerHTML = h;
  montarSiglo($('#vTexto'));
  $('.v-cuerpo').scrollTop = 0;
}

// ================= Hace un siglo: revista de entonces frente a hoy =================
function compSiglo(id, nombre, c) {
  const img = (lado, alt) => `<img src="assets_siglo_${id}_${lado}.webp" alt="${esc(alt)}" loading="lazy" decoding="async">`;
  return `<div class="siglo-cmp" style="--corte:50%">
      ${img('hoy', 'Hoy: ' + nombre)}
      <div class="siglo-antes">${img('antes', c.pie + ' · revista Tierra Santa, ' + c.fecha)}</div>
      <span class="siglo-et e1" aria-hidden="true">${esc(c.fecha.replace(/.* /, ''))}</span><span class="siglo-et e2" aria-hidden="true">Hoy</span>
      <span class="siglo-linea" aria-hidden="true"></span>
      <input type="range" min="0" max="100" value="50" aria-label="${esc(nombre)}: deslizar entre la foto de la revista y la de hoy">
    </div>`;
}
function bloqueSiglo(s) {
  const c = D.siglo?.[s.id];
  if (!c) return '';
  return `<section class="siglo" aria-label="Hace un siglo en la revista">
    <h4>Hace un siglo · ${esc(c.num)}, ${esc(c.fecha)}</h4>
    ${compSiglo(s.id, s.name, c)}
    <p class="siglo-pie">«${esc(c.pie)}», tal como la publicó la revista. Desliza para ver el lugar hoy.</p>
    <blockquote><p>«${esc(c.cita)}»</p><cite>${c.citaNota ? esc(c.citaNota) + ' · ' : ''}Tierra Santa, ${esc(c.num)} · ${esc(c.fecha)}</cite></blockquote>
    <p class="siglo-hoy"><b>Hoy.</b> ${esc(c.hoy)} <a href="${esc(c.credUrl)}" target="_blank" rel="noopener">Foto: ${esc(c.cred)}</a></p>
  </section>`;
}
// sección de portada «Cien años de la revista»
(function montarCien() {
  const rej = $('#cienRejilla');
  if (!rej || !D.siglo) return;
  rej.innerHTML = ORDEN.filter(s => D.siglo[s.id]).map(s => {
    const c = D.siglo[s.id];
    return `<article class="cien-tarjeta">
      ${compSiglo(s.id, s.name, c)}
      <div class="cien-cuerpo">
        <p class="cien-fecha">Tierra Santa · ${esc(c.num)} · ${esc(c.fecha)}</p>
        <h3>${esc(s.name)}</h3>
        <p class="cien-cita">«${esc(c.cita)}»</p>
        <button type="button" class="btn vidrio" data-sitio="${esc(s.id)}">Abrir el santuario</button>
      </div>
    </article>`;
  }).join('');
  montarSiglo(rej);
})();
// ================= Objetos que cuentan: foto con zoom y puntos =================
const OBJ = D.objetos || [];
let obActual = 0, obPunto = -1;
const ob = { s: 1, x: 0, y: 0, base: 1, w: 0, h: 0 };
(function montarObjetos() {
  const rej = $('#obRejilla');
  if (!rej || !OBJ.length) return;
  rej.innerHTML = OBJ.map((o, i) => `<button type="button" class="ob-tarjeta" data-objeto="${i}">
      <img src="assets_objeto_${o.id}-mini.webp" alt="" loading="lazy" decoding="async" width="800" height="${Math.round(800 * o.h / o.w)}">
      <span class="ob-num" aria-hidden="true">${o.puntos.length} detalles</span>
      <span class="ob-txt"><small>${esc(o.lugar)}</small><b>${esc(o.titulo)}</b></span>
    </button>`).join('');
  rej.addEventListener('click', e => { const b = e.target.closest('[data-objeto]'); if (b) abrirObjeto(Number(b.dataset.objeto)); });
  $$('[data-ob]').forEach(b => b.onclick = () => { obActual = (obActual + Number(b.dataset.ob) + OBJ.length) % OBJ.length; pintarObjeto(); });
  $$('[data-zoom]').forEach(b => b.onclick = () => { const z = Number(b.dataset.zoom); if (!z) return encajar(true); zoomEn(ob.s * (z > 0 ? 1.6 : 1 / 1.6), visor().clientWidth / 2, visor().clientHeight / 2, true); });
  const v = visor();
  // arrastrar y pellizcar
  const ptrs = new Map(); let dist0 = 0, s0 = 1;
  v.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    v.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; dist0 = Math.hypot(a.x - b.x, a.y - b.y); s0 = ob.s; }
    v.classList.add('arrastrando');
  });
  v.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    if (ptrs.size === 1) { ob.x += e.clientX - p.x; ob.y += e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; aplicar(false); return; }
    p.x = e.clientX; p.y = e.clientY;
    const [a, b] = [...ptrs.values()], r = v.getBoundingClientRect();
    zoomEn(s0 * Math.hypot(a.x - b.x, a.y - b.y) / dist0, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, false);
  });
  const fin = e => { ptrs.delete(e.pointerId); if (!ptrs.size) v.classList.remove('arrastrando'); };
  v.addEventListener('pointerup', fin); v.addEventListener('pointercancel', fin);
  v.addEventListener('wheel', e => { e.preventDefault(); const r = v.getBoundingClientRect(); zoomEn(ob.s * Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top, false); }, { passive: false });
  v.addEventListener('dblclick', e => { if (e.target.closest('button')) return; const r = v.getBoundingClientRect(); zoomEn(ob.s * 2, e.clientX - r.left, e.clientY - r.top, true); });
  addEventListener('resize', () => { if ($('#objeto').open) encajar(false); });
})();
function visor() { return $('#obVisor'); }
function abrirObjeto(i) {
  obActual = i; const d = $('#objeto');
  if (!d.open) d.showModal();
  pintarObjeto();
}
function pintarObjeto() {
  const o = OBJ[obActual]; obPunto = -1;
  $('#obLugar').textContent = o.lugar; $('#obTitulo').textContent = o.titulo; $('#obIntro').textContent = o.intro;
  $('#obLienzo').innerHTML = `<img src="assets_objeto_${o.id}.webp" alt="${esc(o.titulo)}" width="${o.w}" height="${o.h}" draggable="false">` +
    o.puntos.map((p, k) => `<button type="button" class="ob-pin" style="left:${p.x}%;top:${p.y}%" data-punto="${k}" aria-label="${k + 1}. ${esc(p.t)}">${k + 1}</button>`).join('');
  $('#obPuntos').innerHTML = o.puntos.map((p, k) => `<li><button type="button" data-punto="${k}"><span>${k + 1}</span>${esc(p.t)}</button></li>`).join('');
  $('#obDetalle').innerHTML = '';
  $('#obCred').innerHTML = `Foto: <a href="${esc(o.credUrl)}" target="_blank" rel="noopener">${esc(o.cred)}</a>` + (o.sitio ? ` · <button type="button" class="enlace-modo" data-ir-sitio="${esc(o.sitio)}">Abrir el santuario</button>` : '');
  $$('#objeto [data-punto]').forEach(b => b.onclick = () => elegirPunto(Number(b.dataset.punto)));
  const ir = $('#obCred [data-ir-sitio]'); if (ir) ir.onclick = () => { $('#objeto').close(); abrirSitio(ir.dataset.irSitio); };
  ob.w = o.w; ob.h = o.h;
  requestAnimationFrame(() => encajar(false));
  $('#objeto .v-cuerpo').scrollTop = 0;
}
function elegirPunto(k) {
  const o = OBJ[obActual], p = o.puntos[k]; obPunto = k;
  $$('#objeto [data-punto]').forEach(b => b.classList.toggle('activo', Number(b.dataset.punto) === k));
  $('#obDetalle').innerHTML = `<b>${k + 1}. ${esc(p.t)}</b><p>${esc(p.d)}</p>`;
  const v = visor(), s = Math.max(ob.base * 2.2, Math.min(ob.s, ob.base * 4));
  ob.s = s; ob.x = v.clientWidth / 2 - p.x / 100 * ob.w * s; ob.y = v.clientHeight / 2 - p.y / 100 * ob.h * s;
  aplicar(true);
}
function encajar(animar) {
  const v = visor(); if (!ob.w || !v.clientWidth) return;
  ob.base = Math.min(v.clientWidth / ob.w, v.clientHeight / ob.h); ob.s = ob.base;
  ob.x = (v.clientWidth - ob.w * ob.s) / 2; ob.y = (v.clientHeight - ob.h * ob.s) / 2;
  aplicar(animar);
}
function zoomEn(s, cx, cy, animar) {
  s = Math.max(ob.base, Math.min(ob.base * 6, s));
  ob.x = cx - (cx - ob.x) * s / ob.s; ob.y = cy - (cy - ob.y) * s / ob.s; ob.s = s;
  aplicar(animar);
}
function aplicar(animar) {
  const v = visor(), W = ob.w * ob.s, H = ob.h * ob.s;
  // que la foto no se escape del visor
  ob.x = W <= v.clientWidth ? (v.clientWidth - W) / 2 : Math.min(0, Math.max(v.clientWidth - W, ob.x));
  ob.y = H <= v.clientHeight ? (v.clientHeight - H) / 2 : Math.min(0, Math.max(v.clientHeight - H, ob.y));
  const l = $('#obLienzo');
  l.classList.toggle('animado', !!animar);
  l.style.width = ob.w + 'px'; l.style.height = ob.h + 'px';
  l.style.transform = `translate3d(${ob.x}px,${ob.y}px,0) scale(${ob.s})`;
  l.style.setProperty('--inv', 1 / ob.s);
  v.classList.toggle('ampliado', ob.s > ob.base * 1.05);
}
// ================= Escucha Tierra Santa =================
const SON = D.sonidos || [];
const audio = new Audio(); audio.preload = 'none';
let sonActual = null;
const ico = play => play ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';
function tarjetaSonido(o) {
  const sitio = o.sitio && ORDEN.find(s => s.id === o.sitio);
  return `<article class="es-tarjeta" data-son="${esc(o.id)}">
    <div class="es-cabeza">
      <button type="button" class="es-play" data-son-play="${esc(o.id)}" aria-label="Escuchar: ${esc(o.titulo)}">${ico(true)}</button>
      <div><small>${esc(o.lugar)}</small><h3>${esc(o.titulo)}</h3></div>
    </div>
    <div class="es-onda" aria-hidden="true">${o.picos.map(v => `<i style="--h:${v}"></i>`).join('')}</div>
    <p class="es-tiempo" aria-live="off"><span data-t>0:00</span> · ${o.bucle ? 'en bucle' : '1 min'}${o.binaural ? ' · mejor con cascos' : ''}</p>
    <p class="es-oyes">${esc(o.oyes)}</p>
    <p class="es-cred">Grabación${o.fecha ? ' de ' + esc(o.fecha) : ''}: <a href="${esc(o.url)}" target="_blank" rel="noopener">${esc(o.autor)} · ${esc(o.lic)}</a>${sitio ? ` · <button type="button" class="enlace-modo" data-sitio="${esc(sitio.id)}">Abrir el santuario</button>` : ''}</p>
  </article>`;
}
(function montarEscucha() {
  const rej = $('#esRejilla');
  if (rej && SON.length) rej.innerHTML = SON.map(tarjetaSonido).join('');
  document.addEventListener('click', e => { const b = e.target.closest('[data-son-play]'); if (b) alternarSonido(b.dataset.sonPlay); });
  const mm = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  audio.addEventListener('timeupdate', () => {
    if (!sonActual) return;
    const p = audio.duration ? audio.currentTime / audio.duration : 0;
    $$(`[data-son="${sonActual}"]`).forEach(t => { const s = $('[data-t]', t); if (s) s.textContent = mm(audio.currentTime); const ba = $$('.es-onda i', t); ba.forEach((b, k) => b.classList.toggle('on', k < p * ba.length)); });
  });
  const pintar = () => $$('[data-son-play]').forEach(b => {
    const on = b.dataset.sonPlay === sonActual && !audio.paused;
    b.innerHTML = b.classList.contains('sonido-mini') ? `${ico(!on)}<span>${on ? 'Pausar' : 'Escuchar este lugar'}</span>` : ico(!on);
    b.setAttribute('aria-pressed', on);
    b.closest('[data-son]')?.classList.toggle('sonando', on);
  });
  audio.addEventListener('play', pintar); audio.addEventListener('pause', pintar);
  audio.addEventListener('ended', () => { pintar(); });
  document.addEventListener('play', e => { if (e.target.tagName === 'VIDEO' && !e.target.muted) audio.pause(); }, true);
})();
function alternarSonido(id) {
  const o = SON.find(x => x.id === id); if (!o) return;
  if (sonActual === id && !audio.paused) { audio.pause(); return; }
  if (sonActual !== id) { audio.src = `assets_sonido_${id}.mp3`; audio.loop = !!o.bucle; sonActual = id; }
  $$('video').forEach(v => v.pause());
  audio.play().catch(() => {});
}
function botonSonido(sitioId) {
  const o = SON.find(x => x.sitio === sitioId);
  if (!o) return '';
  const on = sonActual === o.id && !audio.paused;
  return `<div class="sonido-sitio${on ? ' sonando' : ''}" data-son="${esc(o.id)}"><button type="button" class="sonido-mini" data-son-play="${esc(o.id)}" aria-pressed="${on}">${ico(!on)}<span>${on ? 'Pausar' : 'Escuchar este lugar'}</span></button><small>${esc(o.titulo)} · grabación real</small></div>`;
}
function montarSiglo(raiz) { $$('.siglo-cmp', raiz).forEach(montarCmp); }
function montarCmp(cmp) {
  if (cmp.dataset.listo) return; cmp.dataset.listo = 1;
  const r = $('input', cmp);
  const poner = v => cmp.style.setProperty('--corte', v + '%');
  r.addEventListener('input', () => poner(r.value));
  // mover con el dedo o el ratón sobre toda la foto, no solo sobre el tirador
  const desde = e => { const b = cmp.getBoundingClientRect(); r.value = Math.round(Math.min(100, Math.max(0, (e.clientX - b.left) / b.width * 100))); poner(r.value); };
  cmp.addEventListener('pointerdown', e => { desde(e); cmp.setPointerCapture(e.pointerId); cmp.classList.add('arrastrando'); });
  cmp.addEventListener('pointermove', e => { if (cmp.hasPointerCapture(e.pointerId)) desde(e); });
  const fin = e => { cmp.classList.remove('arrastrando'); try { cmp.releasePointerCapture(e.pointerId); } catch (_) {} };
  cmp.addEventListener('pointerup', fin); cmp.addEventListener('pointercancel', fin);
}
$$('[data-v]').forEach(b => b.onclick = () => { sitioActual = (sitioActual + Number(b.dataset.v) + ORDEN.length) % ORDEN.length; pintarSitio(); });
document.addEventListener('click', e => {
  const b = e.target.closest('[data-sitio]');
  if (b && !b.classList.contains('poster')) abrirSitio(b.dataset.sitio);
});
$$('dialog').forEach(d => {
  d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-cerrar]')) d.close(); });
  d.addEventListener('close', () => $$('video', d).forEach(v => v.pause()));
});

// película de entrada
const pVideo = $('#pVideo');
$$('[data-pelicula]').forEach(b => b.onclick = () => {
  if (!pVideo.src) pVideo.src = estrecho() ? 'assets_entrada_historia_evolucion-movil.mp4' : 'assets_entrada_historia_evolucion-25s-musica.mp4';
  $('#pelicula').showModal(); pVideo.play().catch(() => {});
});

// ================= Modo exploración =================
function explorar(activar) {
  if (!maqueta) return;
  document.body.classList.toggle('explorando', activar);
  $('#explorarUI').hidden = !activar;
  document.body.classList.remove('oculta-etiquetas');
  if (activar) {
    maqueta.irA({ ...ENCUADRES.final(), ox: 0, oy: 0 });
    maqueta.libre(true);
    document.documentElement.style.overflow = 'hidden';
  } else {
    maqueta.libre(false);
    cerrarLugar();
    document.documentElement.style.overflow = '';
    encuadre(encuadreActual);
  }
}
$$('[data-explorar]').forEach(b => b.onclick = () => explorar(true));
$('[data-salir]').onclick = () => explorar(false);
$('[data-encuadre]').onclick = () => { maqueta.encuadreGeneral(); cerrarLugar(); };
addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('explorando') && !$('dialog[open]')) explorar(false); });

function abrirLugar(g, boton) {
  if (!document.body.classList.contains('explorando')) explorar(true);
  $$('.pin').forEach(p => p.classList.toggle('activo', p === boton));
  maqueta.volarLibre(g.u, g.v, estrecho() ? 46 : 32);
  const ss = g.sites.map(sitio).filter(Boolean);
  const parada = D.journey.find(j => j.key === g.key || (g.key === 'galilea' && j.key === 'galilea'));
  const panel = $('#panelLugar');
  panel.innerHTML = `<button class="cerrar" type="button" aria-label="Cerrar">×</button>
    <p class="antetitulo">${ss.length} santuario${ss.length > 1 ? 's' : ''} en vídeo</p><h3>${esc(g.name)}</h3>
    ${parada ? `<p>${esc(parada.text)}</p>` : ''}
    <div class="lista-s">${ss.map(s => `<button class="item-s" type="button" data-sitio="${s.id}"><img src="${esc(s.poster)}" alt="" loading="lazy"><span><b>${esc(s.name)}</b><small>Ver vídeo y reflexión</small></span></button>`).join('')}</div>`;
  panel.hidden = false;
  $('.cerrar', panel).onclick = cerrarLugar;
}
function cerrarLugar() { $('#panelLugar').hidden = true; $$('.pin').forEach(p => p.classList.remove('activo')); }

// ================= Arranque =================
construirCarrusel();
construirTorre();
alDesplazar();
iniciar3D();
