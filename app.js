// Huellas franciscanas · Tierra Santa en 3D — interfaz y narración por scroll.
import { crearMaqueta } from './maqueta.js?v=6';

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
  const ocultar = ['inicio', 'cenital', 'historia', 'alto', 'jerusalen-cerca'].includes(nombre);
  document.body.classList.toggle('oculta-etiquetas', ocultar);
}

async function iniciar3D() {
  try {
    maqueta = await crearMaqueta($('#escena'), { movil, alProgreso: p => { barra.style.width = Math.round(p * 100) + '%'; } });
  } catch (e) {
    console.warn('No se pudo iniciar la maqueta 3D', e);
    document.body.classList.add('sin-3d');
    $('#escena').style.background = 'center/cover no-repeat url(assets_jerusalen-realista.webp)';
    $('#carga').classList.add('listo');
    $$('[data-explorar]').forEach(b => b.hidden = true);
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
  const ids = ['recorrido', 'santuarios', 'historia', 'franciscanos', 'revista'];
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
  if (F) h += `<div class="reflexion"><b>${esc(F.title)}</b>${F.paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}</div>`;
  if (s.mags?.length) h += `<h4>Este lugar en la revista · ${s.magCount} números</h4><div class="v-revistas">${s.mags.map(m => `<a href="https://revistatierrasanta.com/hemeroteca/" target="_blank" rel="noopener" title="Tierra Santa nº ${m.n}">${portada(m.s, m.k, 'role="img" aria-label="Portada nº ' + m.n + '"')}nº ${m.n}</a>`).join('')}</div>`;
  const enlaces = [L?.url && `<a href="${esc(L.url)}" target="_blank" rel="noopener">Custodia de Tierra Santa ↗</a>`, s.source && s.source.includes('custodia') && !L?.url && `<a href="${esc(s.source)}" target="_blank" rel="noopener">Ficha en custodia.org ↗</a>`].filter(Boolean);
  if (enlaces.length) h += `<div class="v-enlaces">${enlaces.join('')}</div>`;
  $('#vTexto').innerHTML = h;
  $('.v-cuerpo').scrollTop = 0;
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
