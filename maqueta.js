// Maqueta 3D de Tierra Santa: relieve, agua, luces de los santuarios, ruta y cámara narrativa.
import * as THREE from 'three';
import { OrbitControls } from './OrbitControls.js';

const ANCHO = 100;                 // unidades de escena para el ancho del mapa
const PROPORCION = 2809 / 1842;    // alto/ancho del mapa recortado
const FONDO = ANCHO * PROPORCION;
const ALT_MIN = -450, ALT_MAX = 2700;
const KM_POR_UNIDAD = 202 / ANCHO;
const EXAGERACION = 4.2;
const BASE = -3.2;                 // cota inferior del zócalo

export const uvAXZ = (u, v) => [(u - 0.5) * ANCHO, (v - 0.5) * FONDO];

export async function crearMaqueta(canvas, { movil = false, alProgreso = () => {} } = {}) {
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !movil, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, movil ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = !movil;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const escena = new THREE.Scene();
  escena.fog = new THREE.Fog(0x1a130d, 160, 420);
  const camara = new THREE.PerspectiveCamera(38, 1, 0.5, 1200);

  // ---------- carga de recursos ----------
  let pasos = 0; const total = 3;
  const avanza = () => alProgreso(++pasos / total);
  const cargaTextura = url => new Promise((ok, mal) => new THREE.TextureLoader().load(url, t => { avanza(); ok(t); }, undefined, mal));
  const cargaImagen = url => new Promise((ok, mal) => { const i = new Image(); i.onload = () => { avanza(); ok(i); }; i.onerror = mal; i.src = url; });
  const [texMapa, imgAltura] = await Promise.all([
    cargaTextura(movil ? 'assets3d_relieve-mapa-movil.jpg' : 'assets3d_relieve-mapa.jpg'),
    cargaImagen('assets3d_relieve-altura.png')
  ]);
  texMapa.colorSpace = THREE.SRGBColorSpace;
  texMapa.anisotropy = renderer.capabilities.getMaxAnisotropy();

  // ---------- alturas ----------
  const GW = imgAltura.width, GH = imgAltura.height;
  const lienzo = document.createElement('canvas'); lienzo.width = GW; lienzo.height = GH;
  const ctx = lienzo.getContext('2d', { willReadFrequently: true, colorSpace: 'srgb' });
  ctx.drawImage(imgAltura, 0, 0);
  const px = ctx.getImageData(0, 0, GW, GH).data;
  const metros = new Float32Array(GW * GH);
  for (let i = 0; i < GW * GH; i++) metros[i] = (px[i * 4] * 256 + px[i * 4 + 1]) / 65535 * (ALT_MAX - ALT_MIN) + ALT_MIN;
  const aY = m => m / 1000 / KM_POR_UNIDAD * EXAGERACION;
  function alturaUV(u, v) {
    const x = Math.min(Math.max(u * GW - 0.5, 0), GW - 1.001), y = Math.min(Math.max(v * GH - 0.5, 0), GH - 1.001);
    const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0;
    const a = metros[y0 * GW + x0], b = metros[y0 * GW + x0 + 1], c = metros[(y0 + 1) * GW + x0], d = metros[(y0 + 1) * GW + x0 + 1];
    return aY((a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy);
  }
  const puntoUV = (u, v, extra = 0) => { const [x, z] = uvAXZ(u, v); return new THREE.Vector3(x, alturaUV(u, v) + extra, z); };

  // ---------- terreno ----------
  const paso = movil ? 2 : 1;
  const SX = Math.floor((GW - 1) / paso) + 1, SZ = Math.floor((GH - 1) / paso) + 1;
  const geo = new THREE.PlaneGeometry(ANCHO, FONDO, SX - 1, SZ - 1);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let j = 0; j < SZ; j++) for (let i = 0; i < SX; i++) {
    const gi = Math.min(i * paso, GW - 1), gj = Math.min(j * paso, GH - 1);
    pos.setY(j * SX + i, aY(metros[gj * GW + gi]));
  }
  geo.computeVertexNormals();

  const uniformes = { uTiempo: { value: 0 } };
  const matTerreno = new THREE.MeshStandardMaterial({ map: texMapa, roughness: 0.93, metalness: 0 });
  matTerreno.onBeforeCompile = s => {
    s.uniforms.uTiempo = uniformes.uTiempo;
    s.fragmentShader = 'uniform float uTiempo;\n' + s.fragmentShader
      .replace('#include <map_fragment>', `#include <map_fragment>
        float agua = smoothstep(0.035, 0.11, diffuseColor.b - diffuseColor.r) * smoothstep(0.25, 0.45, diffuseColor.b);
        vec2 pa = vMapUv * vec2(160.0, 244.0);
        float ola = sin(dot(pa, vec2(0.83, 0.55)) + uTiempo * 0.9) * 0.5 + sin(dot(pa, vec2(-0.41, 0.91)) * 1.7 - uTiempo * 1.3) * 0.3 + sin(dot(pa, vec2(0.97, -0.24)) * 2.9 + uTiempo * 1.7) * 0.2;
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.66, 0.82, 0.98) + vec3(0.02, 0.028, 0.04) * ola, agua * 0.85);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.28, agua);`);
  };
  const terreno = new THREE.Mesh(geo, matTerreno);
  terreno.receiveShadow = !movil; terreno.castShadow = !movil;
  escena.add(terreno);

  // ---------- zócalo (paredes laterales) ----------
  function pared(puntos) {
    const n = puntos.length, p = new Float32Array(n * 2 * 3), col = new Float32Array(n * 2 * 3), idx = [];
    const arriba = new THREE.Color(0x7a5a3c), abajo = new THREE.Color(0x150f0a);
    puntos.forEach((q, k) => {
      p.set([q.x, q.y, q.z], k * 6); p.set([q.x, BASE, q.z], k * 6 + 3);
      col.set([arriba.r, arriba.g, arriba.b], k * 6); col.set([abajo.r, abajo.g, abajo.b], k * 6 + 3);
      if (k < n - 1) { const a = k * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, b, c, b, d, c); }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  const borde = (fn, n) => Array.from({ length: n }, (_, k) => fn(k / (n - 1)));
  const lados = [
    borde(t => puntoUV(t, 0), SX), borde(t => puntoUV(1, t), SZ),
    borde(t => puntoUV(1 - t, 1), SX), borde(t => puntoUV(0, 1 - t), SZ)
  ];
  const matPared = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide });
  lados.forEach(l => escena.add(new THREE.Mesh(pared(l), matPared)));
  const losa = new THREE.Mesh(new THREE.BoxGeometry(ANCHO + 0.02, 0.5, FONDO + 0.02), new THREE.MeshStandardMaterial({ color: 0x0f0b08, roughness: 1 }));
  losa.position.y = BASE - 0.25; escena.add(losa);
  // filo dorado del zócalo
  const filoGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(ANCHO + 0.6, 0.02, FONDO + 0.6));
  const filo = new THREE.LineSegments(filoGeo, new THREE.LineBasicMaterial({ color: 0xd9b26a, transparent: true, opacity: 0.45 }));
  filo.position.y = BASE - 0.5; escena.add(filo);
  // sombra suave bajo la maqueta
  const sc = document.createElement('canvas'); sc.width = sc.height = 128;
  const sg = sc.getContext('2d'); const gr = sg.createRadialGradient(64, 64, 10, 64, 64, 64);
  gr.addColorStop(0, 'rgba(0,0,0,.75)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); sg.fillStyle = gr; sg.fillRect(0, 0, 128, 128);
  const sombra = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO * 2.1, FONDO * 1.8), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  sombra.rotation.x = -Math.PI / 2; sombra.position.y = BASE - 2.2; escena.add(sombra);

  // ---------- luces ----------
  escena.add(new THREE.HemisphereLight(0xfff0d8, 0x2b1e12, 1.15));
  const sol = new THREE.DirectionalLight(0xffdcae, 2.6);
  sol.position.set(-70, 90, -60);
  if (!movil) {
    sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048);
    Object.assign(sol.shadow.camera, { left: -90, right: 90, top: 100, bottom: -100, near: 10, far: 320 });
    sol.shadow.bias = -0.0006; sol.shadow.normalBias = 0.4;
  }
  escena.add(sol);
  const contraluz = new THREE.DirectionalLight(0x9fb4ff, 0.35); contraluz.position.set(60, 30, 80); escena.add(contraluz);

  // ---------- polvo dorado ----------
  const puntoTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,240,200,1)'); r.addColorStop(0.35, 'rgba(240,200,120,.55)'); r.addColorStop(1, 'rgba(240,200,120,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
  })();
  const NP = movil ? 260 : 650;
  const polvoPos = new Float32Array(NP * 3), polvoVel = new Float32Array(NP);
  for (let i = 0; i < NP; i++) {
    polvoPos[i * 3] = (Math.random() - 0.5) * ANCHO * 1.3; polvoPos[i * 3 + 1] = Math.random() * 40 + 1; polvoPos[i * 3 + 2] = (Math.random() - 0.5) * FONDO * 1.2;
    polvoVel[i] = 0.2 + Math.random() * 0.6;
  }
  const polvoGeo = new THREE.BufferGeometry(); polvoGeo.setAttribute('position', new THREE.BufferAttribute(polvoPos, 3));
  const polvo = new THREE.Points(polvoGeo, new THREE.PointsMaterial({ size: 0.55, map: puntoTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6, sizeAttenuation: true }));
  escena.add(polvo);

  // ---------- faros de los santuarios ----------
  const matHaz = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uTiempo: uniformes.uTiempo, uColor: { value: new THREE.Color(0xf3cf86) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float uTiempo; uniform vec3 uColor; varying vec2 vUv;
      void main(){ float a = pow(1.0 - vUv.y, 1.6) * (0.55 + 0.25 * sin(uTiempo * 2.0 + vUv.y * 9.0));
      float borde = 1.0 - abs(vUv.x - 0.5) * 2.0; gl_FragColor = vec4(uColor, a * (0.35 + 0.65 * borde)); }`
  });
  const matAnillo = new THREE.MeshBasicMaterial({ color: 0xf3cf86, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const faros = [];
  function faro(u, v, alto, radio) {
    const g = new THREE.Group(); const base = puntoUV(u, v); g.position.copy(base);
    const haz = new THREE.Mesh(new THREE.CylinderGeometry(radio, radio * 0.35, alto, 20, 1, true), matHaz);
    haz.position.y = alto / 2; g.add(haz);
    const anillo = new THREE.Mesh(new THREE.RingGeometry(radio * 1.2, radio * 1.6, 40), matAnillo.clone());
    anillo.rotation.x = -Math.PI / 2; anillo.position.y = 0.08; g.add(anillo);
    const nucleo = new THREE.Sprite(new THREE.SpriteMaterial({ map: puntoTex, color: 0xffe2a6, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    nucleo.scale.setScalar(radio * 7); nucleo.position.y = 0.25; g.add(nucleo);
    escena.add(g); faros.push({ g, anillo, fase: Math.random() * 6 }); return g;
  }

  // ---------- ruta del recorrido ----------
  let ruta = null;
  const matRuta = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTiempo: uniformes.uTiempo, uProgreso: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float uTiempo; uniform float uProgreso; varying vec2 vUv;
      void main(){ if (vUv.x > uProgreso) discard;
        float guion = step(0.45, fract(vUv.x * 90.0 - uTiempo * 0.8));
        float cabeza = smoothstep(uProgreso - 0.02, uProgreso, vUv.x);
        vec3 c = mix(vec3(0.85,0.62,0.3), vec3(1.0,0.92,0.7), cabeza);
        gl_FragColor = vec4(c, 0.35 + 0.45 * guion + cabeza * 0.6); }`
  });
  function crearRuta(paradas) {
    const pts = [];
    for (let k = 0; k < paradas.length - 1; k++) {
      const a = paradas[k], b = paradas[k + 1];
      const n = 40;
      for (let s = 0; s < n; s++) {
        const t = s / n, u = a.u + (b.u - a.u) * t, v = a.v + (b.v - a.v) * t;
        const distancia = Math.hypot((b.u - a.u) * ANCHO, (b.v - a.v) * FONDO);
        pts.push(puntoUV(u, v, 0.6 + Math.sin(Math.PI * t) * Math.min(6, distancia * 0.12)));
      }
    }
    const ult = paradas[paradas.length - 1]; pts.push(puntoUV(ult.u, ult.v, 0.6));
    const curva = new THREE.CatmullRomCurve3(pts);
    ruta = new THREE.Mesh(new THREE.TubeGeometry(curva, 600, 0.14, 8, false), matRuta);
    escena.add(ruta);
  }
  function progresoRuta(p) { matRuta.uniforms.uProgreso.value = p; }

  // ---------- cámara narrativa ----------
  const actual = { t: new THREE.Vector3(0, 0, 10), d: 190, pol: 0.9, az: 0.3, ox: 0, oy: 0 };
  const destino = { ...actual, t: actual.t.clone() };
  let giroLento = 0;          // velocidad de órbita automática (rad/s)
  let modoLibre = false;
  const controles = new OrbitControls(camara, canvas);
  Object.assign(controles, { enabled: false, enableDamping: true, dampingFactor: 0.07, minDistance: 5, maxDistance: 280, maxPolarAngle: Math.PI * 0.46, screenSpacePanning: false, rotateSpeed: 0.6, zoomSpeed: 0.9 });

  function irA({ u, v, x, z, distancia, polar, azimut, giro = 0, ox = 0, oy = 0, instantaneo = false }) {
    if (u !== undefined) destino.t.copy(puntoUV(u, v)); else destino.t.set(x ?? 0, 0, z ?? 0);
    destino.d = distancia; destino.pol = polar; destino.az = azimut; destino.ox = ox; destino.oy = oy;
    giroLento = reducido ? 0 : giro;
    if (instantaneo) { actual.t.copy(destino.t); Object.assign(actual, { d: destino.d, pol: destino.pol, az: destino.az, ox, oy }); }
  }
  function aplicarCamara() {
    const sp = new THREE.Spherical(actual.d, actual.pol, actual.az);
    camara.position.setFromSpherical(sp).add(actual.t);
    camara.lookAt(actual.t);
  }
  function libre(activar) {
    modoLibre = activar;
    controles.enabled = activar;
    if (activar) {
      controles.target.copy(actual.t);
      camara.clearViewOffset(); actual.ox = actual.oy = 0;
      controles.update();
    } else {
      const off = camara.position.clone().sub(controles.target);
      const sp = new THREE.Spherical().setFromVector3(off);
      actual.t.copy(controles.target); actual.d = sp.radius; actual.pol = sp.phi; actual.az = sp.theta;
    }
  }
  function volarLibre(u, v, distancia = 22) {
    const fin = puntoUV(u, v), ini = controles.target.clone();
    const dirIni = camara.position.clone().sub(ini);
    const dIni = dirIni.length(); dirIni.normalize();
    const t0 = performance.now(), dur = reducido ? 1 : 1400;
    vuelo = now => {
      const k = Math.min(1, (now - t0) / dur), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      controles.target.lerpVectors(ini, fin, e);
      camara.position.copy(controles.target).addScaledVector(dirIni, dIni + (distancia - dIni) * e);
      if (k >= 1) vuelo = null;
    };
  }
  let vuelo = null;

  // ---------- tamaño ----------
  let W = 1, H = 1;
  function redimensionar() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    renderer.setSize(W, H, false); camara.aspect = W / H; camara.updateProjectionMatrix();
  }
  addEventListener('resize', redimensionar); redimensionar();

  // ---------- proyección para etiquetas HTML ----------
  const v3 = new THREE.Vector3(), dirCam = new THREE.Vector3(), aPunto = new THREE.Vector3();
  function proyectar(vec) {
    camara.getWorldDirection(dirCam);
    const delante = aPunto.copy(vec).sub(camara.position).dot(dirCam) > 0;
    v3.copy(vec).project(camara);
    return { x: (v3.x + 1) / 2 * W, y: (1 - v3.y) / 2 * H, visible: delante && v3.z < 1, dist: camara.position.distanceTo(vec) };
  }

  // ---------- bucle ----------
  const reloj = new THREE.Clock();
  let alFotograma = () => {};
  let parado = false;
  function bucle() {
    if (parado) return;
    const dt = Math.min(reloj.getDelta(), 0.25), t = reloj.elapsedTime;
    uniformes.uTiempo.value = t;
    if (modoLibre) {
      if (vuelo) vuelo(performance.now());
      controles.update();
    } else {
      const k = 1 - Math.exp(-dt * 2.2);
      destino.az += giroLento * dt;
      actual.t.lerp(destino.t, k);
      actual.d += (destino.d - actual.d) * k;
      actual.pol += (destino.pol - actual.pol) * k;
      actual.az += (destino.az - actual.az) * k;
      actual.ox += (destino.ox - actual.ox) * k; actual.oy += (destino.oy - actual.oy) * k;
      if (Math.abs(actual.ox) > 0.5 || Math.abs(actual.oy) > 0.5) camara.setViewOffset(W, H, -actual.ox * W / 100, -actual.oy * H / 100, W, H);
      else camara.clearViewOffset();
      aplicarCamara();
    }
    // polvo que asciende
    const p = polvoGeo.attributes.position.array;
    for (let i = 0; i < NP; i++) { p[i * 3 + 1] += polvoVel[i] * dt * 0.8; if (p[i * 3 + 1] > 42) p[i * 3 + 1] = 1; p[i * 3] += Math.sin(t * 0.3 + i) * dt * 0.05; }
    polvoGeo.attributes.position.needsUpdate = true;
    faros.forEach(f => { const s = 1 + ((t * 0.6 + f.fase) % 1) * 0.9; f.anillo.scale.setScalar(s); f.anillo.material.opacity = 0.7 * (1 - (s - 1) / 0.9); });
    escena.fog.near = actual.d * 0.9; escena.fog.far = actual.d * 2.6 + 80;
    renderer.render(escena, camara);
    alFotograma();
    requestAnimationFrame(bucle);
  }
  irA({ x: 0, z: 0, distancia: 320, polar: 0.35, azimut: -0.6, instantaneo: true });
  requestAnimationFrame(bucle);

  return {
    puntoUV, faro, crearRuta, progresoRuta, irA, libre, volarLibre, proyectar,
    detener() { parado = true; try { renderer.dispose(); renderer.forceContextLoss(); } catch (e) {} },
    get camara() { return camara; },
    set alFotograma(fn) { alFotograma = fn; },
    encuadreGeneral() { if (modoLibre) { vuelo = null; const ini = controles.target.clone(), fin = new THREE.Vector3(0, 0, 0); const t0 = performance.now(); const posIni = camara.position.clone(), posFin = new THREE.Vector3(0, 120, 120); vuelo = now => { const k = Math.min(1, (now - t0) / 1400), e = 1 - Math.pow(1 - k, 3); controles.target.lerpVectors(ini, fin, e); camara.position.lerpVectors(posIni, posFin, e); if (k >= 1) vuelo = null; }; } }
  };
}
