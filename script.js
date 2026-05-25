// ───────────────────────────────────────────
// Particle Ripple Effect
// Inspired by antigravity.google
// ───────────────────────────────────────────

var PARTICLE_COUNT = 900;
var WORLD_HALF = 5;

// ── Setup ──────────────────────────────
var canvas = document.getElementById('particle-canvas');
var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

var scene = new THREE.Scene();
var frustumSize = WORLD_HALF * 2;
var aspect = window.innerWidth / window.innerHeight;
var worldW = frustumSize * aspect / 2;
var worldH = frustumSize / 2;

var camera = new THREE.OrthographicCamera(-worldW, worldW, worldH, -worldH, 0.1, 10);
camera.position.z = 1;

// ── Mouse tracking ─────────────────────
var mouse = new THREE.Vector2(0, 0);
var ringPos = new THREE.Vector2(0, 0);

function updateMouse(cx, cy) {
  var nx = (cx / window.innerWidth) * 2 - 1;
  var ny = -(cy / window.innerHeight) * 2 + 1;
  mouse.x = nx * worldW;
  mouse.y = ny * worldH;
}

document.addEventListener('mousemove', function (e) { updateMouse(e.clientX, e.clientY); });
document.addEventListener('mouseleave', function () { mouse.set(0, 0); });
document.addEventListener('mouseenter', function (e) { updateMouse(e.clientX, e.clientY); });
document.addEventListener('touchmove', function (e) {
  if (e.touches.length) updateMouse(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: true });
document.addEventListener('touchend', function () { mouse.set(0, 0); });

// ── Particle data ──────────────────────
var positions = new Float32Array(PARTICLE_COUNT * 3);
var scalesArr = new Float32Array(PARTICLE_COUNT);
var velocitiesArr = new Float32Array(PARTICLE_COUNT);
var seedsArr = new Float32Array(PARTICLE_COUNT * 4);
var lifetimesArr = new Float32Array(PARTICLE_COUNT);

function randInWorld() {
  return [
    (Math.random() - 0.5) * 2 * worldW,
    (Math.random() - 0.5) * 2 * worldH
  ];
}

for (var i = 0; i < PARTICLE_COUNT; i++) {
  var p = randInWorld();
  positions[i * 3] = p[0];
  positions[i * 3 + 1] = p[1];
  positions[i * 3 + 2] = 0;
  scalesArr[i] = Math.random();
  velocitiesArr[i] = Math.random();
  lifetimesArr[i] = Math.random();
  seedsArr[i * 4] = Math.random();
  seedsArr[i * 4 + 1] = Math.random();
  seedsArr[i * 4 + 2] = Math.random();
  seedsArr[i * 4 + 3] = Math.random();
}

// ── Geometry ───────────────────────────
var geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('aScale', new THREE.BufferAttribute(scalesArr, 1));
geometry.setAttribute('aVelocity', new THREE.BufferAttribute(velocitiesArr, 1));
geometry.setAttribute('aSeeds', new THREE.BufferAttribute(seedsArr, 4));

// ── Shaders ────────────────────────────
var vertexShader = [
  'attribute float aScale;',
  'attribute float aVelocity;',
  'attribute vec4 aSeeds;',
  'uniform float uParticleScale;',
  'uniform float uPixelRatio;',
  'varying vec4 vSeeds;',
  'varying float vVelocity;',
  'varying vec2 vLocalPos;',
  'varying float vScale;',
  'void main() {',
  '  vSeeds = aSeeds;',
  '  vVelocity = aVelocity;',
  '  vScale = aScale;',
  '  vLocalPos = position.xy;',
  '  vec4 mvPosition = modelViewMatrix * vec4(position.xyz, 1.0);',
  '  gl_Position = projectionMatrix * mvPosition;',
  '  gl_PointSize = vScale * 35.0 * uPixelRatio * uParticleScale;',
  '}'
].join('\n');

var fragmentShader = [
  'varying vec4 vSeeds;',
  'varying vec2 vLocalPos;',
  'varying float vScale;',
  'varying float vVelocity;',
  '',
  'uniform vec3 uColor1;',
  'uniform vec3 uColor2;',
  'uniform vec3 uColor3;',
  'uniform vec2 uRingPos;',
  'uniform float uAlpha;',
  'uniform float uTime;',
  '',
  'vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }',
  'vec4 permute(vec4 x) { return mod(((x*34.0)+1.0)*x, 289.0); }',
  'float permute(float x) { return floor(mod(((x*34.0)+1.0)*x, 289.0)); }',
  '',
  'float snoise(vec2 v) {',
  '  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);',
  '  vec2 i  = floor(v + dot(v, C.yy));',
  '  vec2 x0 = v - i + dot(i, C.xx);',
  '  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);',
  '  vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1;',
  '  i = mod(i, 289.0);',
  '  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));',
  '  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);',
  '  m = m*m; m = m*m;',
  '  vec3 x = 2.0 * fract(p * C.www) - 1.0;',
  '  vec3 h = abs(x) - 0.5; vec3 ox = floor(x + 0.5); vec3 a0 = x - ox;',
  '  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);',
  '  vec3 g; g.x = a0.x*x0.x + h.x*x0.y; g.yz = a0.yz*x12.xz + h.yz*x12.yw;',
  '  return 130.0 * dot(m, g);',
  '}',
  '',
  'float snoise(vec3 v) {',
  '  const vec2 C = vec2(1.0/6.0, 1.0/3.0);',
  '  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);',
  '  vec3 i  = floor(v + dot(v, C.yyy));',
  '  vec3 x0 = v - i + dot(i, C.xxx);',
  '  vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1.0 - g;',
  '  vec3 i1 = min(g.xyz, l.zxy); vec3 i2 = max(g.xyz, l.zxy);',
  '  vec3 x1 = x0 - i1 + C.xxx; vec3 x2 = x0 - i2 + C.yyy; vec3 x3 = x0 - D.yyy;',
  '  i = mod(i, 289.0);',
  '  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0))',
  '    + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));',
  '  float n_ = 1.0/7.0; vec3 ns = n_*D.wyz - D.xzx;',
  '  vec4 j = p - 49.0*floor(p*ns.z*ns.z);',
  '  vec4 x_ = floor(j*ns.z); vec4 y_ = floor(j - 7.0*x_);',
  '  vec4 x = x_*ns.x + ns.yyyy; vec4 y = y_*ns.x + ns.yyyy;',
  '  vec4 h = 1.0 - abs(x) - abs(y);',
  '  vec4 b0 = vec4(x.xy, y.xy); vec4 b1 = vec4(x.zw, y.zw);',
  '  vec4 s0 = floor(b0)*2.0 + 1.0; vec4 s1 = floor(b1)*2.0 + 1.0;',
  '  vec4 sh = -step(h, vec4(0.0));',
  '  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy; vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;',
  '  vec3 p0 = vec3(a0.xy, h.x); vec3 p1 = vec3(a0.zw, h.y);',
  '  vec3 p2 = vec3(a1.xy, h.z); vec3 p3 = vec3(a1.zw, h.w);',
  '  vec4 norm = 1.79284291400159 - 0.85373472095314 * vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3));',
  '  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;',
  '  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);',
  '  m = m*m;',
  '  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));',
  '}',
  '',
  'vec2 rotate(vec2 v, float a) {',
  '  float s = sin(a); float c = cos(a);',
  '  return mat2(c, s, -s, c) * v;',
  '}',
  '',
  'void main() {',
  '  float noiseAngle = snoise(vec3(vLocalPos * 2.0 + vec2(18.4924, 72.9744), uTime * 0.85));',
  '  float noiseColor = snoise(vec3(vLocalPos * 0.5 + vec2(74.664, 91.556), uTime * 0.5));',
  '  noiseColor = (noiseColor + 1.0) * 0.5;',
  '',
  '  float angle = atan(vLocalPos.y - uRingPos.y, vLocalPos.x - uRingPos.x);',
  '',
  '  vec2 uv = gl_PointCoord.xy - 0.5;',
  '  uv = rotate(uv, -angle + noiseAngle * 0.5);',
  '',
  '  float dist = length(uv / vec2(0.45, 0.18));',
  '  float shape = 1.0 - smoothstep(0.0, 1.0, dist);',
  '',
  '  float h = 0.8;',
  '  float progress = smoothstep(0.0, 0.75, pow(noiseColor, 2.0));',
  '  vec3 col = mix(',
  '    mix(uColor1, uColor2, progress / h),',
  '    mix(uColor2, uColor3, (progress - h) / (1.0 - h)),',
  '    step(h, progress)',
  '  );',
  '',
  '  float a = uAlpha * shape * smoothstep(0.1, 0.3, vScale);',
  '  if (a < 0.01) discard;',
  '',
  '  gl_FragColor = vec4(clamp(col, 0.0, 1.0), clamp(a, 0.0, 1.0));',
  '}'
].join('\n');

// ── Material ───────────────────────────
var material = new THREE.ShaderMaterial({
  vertexShader: vertexShader,
  fragmentShader: fragmentShader,
  uniforms: {
    uParticleScale: { value: 1.0 },
    uPixelRatio: { value: renderer.getPixelRatio() },
    uColor1: { value: new THREE.Color('#5B8DEF') },
    uColor2: { value: new THREE.Color('#A78BFA') },
    uColor3: { value: new THREE.Color('#F472B6') },
    uRingPos: { value: new THREE.Vector2(0, 0) },
    uAlpha: { value: 0.85 },
    uTime: { value: 0 },
  },
  transparent: true,
  depthWrite: false,
  depthTest: false,
  blending: THREE.NormalBlending,
});

// ── Points mesh ────────────────────────
var points = new THREE.Points(geometry, material);
points.frustumCulled = false;
scene.add(points);

// ── Animation loop ────────────────────
var clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  var dt = Math.min(clock.getDelta(), 0.1);
  var elapsed = performance.now() * 0.001;

  ringPos.lerp(mouse, 1.0 - Math.exp(-6.0 * dt));

  for (var i = 0; i < PARTICLE_COUNT; i++) {
    var i3 = i * 3;
    var i4 = i * 4;

    lifetimesArr[i] += dt * (0.1 + seedsArr[i4] * 0.2);
    if (lifetimesArr[i] > 1.0) {
      var p2 = randInWorld();
      positions[i3] = p2[0];
      positions[i3 + 1] = p2[1];
      scalesArr[i] = 0;
      lifetimesArr[i] = 0;
    }

    var life = lifetimesArr[i];
    scalesArr[i] = life < 0.5 ? life * 2.0 : 2.0 - life * 2.0;

    positions[i3] += (seedsArr[i4] - 0.5) * 0.3 * dt;
    positions[i3 + 1] += (seedsArr[i4 + 1] - 0.5) * 0.3 * dt;

    if (Math.abs(positions[i3]) > worldW) positions[i3] *= -0.9;
    if (Math.abs(positions[i3 + 1]) > worldH) positions[i3 + 1] *= -0.9;
  }

  geometry.attributes.position.needsUpdate = true;
  geometry.attributes.aScale.needsUpdate = true;

  material.uniforms.uTime.value = elapsed;
  material.uniforms.uRingPos.value.set(ringPos.x, ringPos.y);

  renderer.render(scene, camera);
}

// ── Resize handler ────────────────────
window.addEventListener('resize', function () {
  var w = window.innerWidth;
  var h = window.innerHeight;
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  material.uniforms.uPixelRatio.value = renderer.getPixelRatio();

  aspect = w / h;
  worldW = frustumSize * aspect / 2;
  worldH = frustumSize / 2;
  camera.left = -worldW;
  camera.right = worldW;
  camera.top = worldH;
  camera.bottom = -worldH;
  camera.updateProjectionMatrix();
});

// ── Kick off ──────────────────────────
ringPos.set(0, 0);
requestAnimationFrame(animate);
