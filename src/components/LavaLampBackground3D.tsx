// src/components/LavaLampBackground3D.tsx
import * as React from "react";
import * as THREE from "three";

export default function LavaLampBackground3D() {
  const mountRef = React.useRef<HTMLDivElement | null>(null);
  const rafRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!mountRef.current) return;

    /* ----------------------------- Renderer layer ----------------------------- */
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      premultipliedAlpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    Object.assign(renderer.domElement.style, {
      position: "fixed",
      inset: "0",
      width: "100vw",
      height: "100vh",
      pointerEvents: "none",
      zIndex: "10", // above Aurora, behind content
      opacity: "1",
    });
    mountRef.current.appendChild(renderer.domElement);

    /* --------------------------------- Scene --------------------------------- */
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    scene.add(quad);

    /* ------------------------------- Shader mat ------------------------------- */
    const MAX_BLOBS = 16;
    const BLOB_SPEED = 0.25; // smaller = slower (e.g., 0.1 super slow, 1.0 original-ish)
    let blobT = 0; // accumulates time for blob motion only

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        void main() { gl_Position = vec4(position, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;

        #define MAX_STEPS 32
        #define MAX_DIST  40.0
        #define SURF_EPS  0.03

        uniform vec2  uResolution;  // device pixels
        uniform float uTime;
        uniform float uOpacity;
        uniform int   uBlobCount;

        // camera
        uniform vec3  uCamPos;
        uniform vec3  uCamRight;
        uniform vec3  uCamUp;
        uniform vec3  uCamFwd;
        uniform float uFovY; // radians

        // palette (for tint and highlights)
        uniform vec3 uColHi;

        // aurora colors (we rebuild the radial gradient in-shader)
        uniform vec3 uAuroraDeep;   // #020617
        uniform vec3 uAuroraBrand;  // animated from CSS --brand

        // refraction controls
        uniform float uIOR;          // 1.00..1.50 (1.10 is subtle)
        uniform float uRefractAmt;   // screen-space strength 0..0.1

        // smooth-min factor
        uniform float uK;            // 0.1..0.6

        // blob data (center.xyz, radius in w)
        uniform vec4 uBlobs[${MAX_BLOBS}];

        /* ------------------------------ SDF utils ----------------------------- */
        float smin(float a, float b, float k){
          float h = clamp(0.5 + 0.5*(b - a)/k, 0.0, 1.0);
          return mix(b, a, h) - k*h*(1.0 - h);
        }

        float sdSphere(vec3 p, vec3 c, float r){ return length(p - c) - r; }

        float map(vec3 p) {
          float d = 1e9;
          for (int i=0; i<${MAX_BLOBS}; i++) {
            if (i >= uBlobCount) break;
            vec3 c = uBlobs[i].xyz;
            float r = uBlobs[i].w;
            d = smin(d, sdSphere(p, c, r), uK);
          }
          return d;
        }

        vec3 calcNormal(vec3 p) {
          const float e = 0.0015;
          const vec2 k = vec2(1.0, -1.0);
          return normalize(
            k.xyy * map(p + k.xyy * e) +
            k.yyx * map(p + k.yyx * e) +
            k.yxy * map(p + k.yxy * e) +
            k.xxx * map(p + k.xxx * e)
          );
        }

        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }

        /* ------------------------ Aurora background SDF ----------------------- */
        // Recreate your radial gradient: radial-gradient(125% 125% at 50% 0%, #020617 50%, brand)
        vec3 auroraBg(vec2 uv) {
          // uv in 0..1 (device pixel normalized)
          vec2 center = vec2(0.5, 0.0);
          // Ellipse: scale Y a bit to emulate 125% 125%
          vec2 d = uv - center;
          d.x *= uResolution.x / uResolution.y;
          float dist = length(d);
          // Map distance to mix factor (tighter at top)
          float t = smoothstep(0.55, 0.0, dist); // 0 near top center -> brand
          return mix(uAuroraDeep, uAuroraBrand, t);
        }

        vec3 toneMap(vec3 c){ c = c * 1.05; return c / (c + 1.0); }

        void main() {
          vec2 uv = gl_FragCoord.xy / uResolution;
          vec2 ndc = uv * 2.0 - 1.0;

          float fy = tan(uFovY * 0.5);
          float aspect = uResolution.x / uResolution.y;
          float fx = fy * aspect;

          vec3 dir = normalize(uCamFwd + ndc.x * uCamRight * fx + ndc.y * uCamUp * fy);
          vec3 ro  = uCamPos;

          // Raymarch
          float t = 0.0;
          float d;
          bool hit = false;
          for (int i=0; i<MAX_STEPS; i++){
            vec3 p = ro + dir * t;
            d = map(p);
            if (d < SURF_EPS) { hit = true; break; }
            t += d;
            if (t > MAX_DIST) break;
          }

          vec3 col = vec3(0.0);
          float alpha = 0.0;

          if (hit) {
            vec3 p = ro + dir * t;
            vec3 n = calcNormal(p);

            // Screen-space refraction (cheap): offset UV by refracted direction
            vec3 V = -dir;
            float eta = 1.0 / uIOR;                         // air -> medium
            vec3 rdir = refract(-V, n, eta);                // refracted ray
            // Project to screen: approximate using XY of refracted dir
            vec2 offset = rdir.xy * uRefractAmt;
            // Bias refraction to bend more at glancing angles
            float fres = pow(1.0 - clamp(dot(n, V), 0.0, 1.0), 2.0);
            offset *= mix(0.35, 1.0, fres);

            vec2 uvR = clamp(uv + offset, 0.0, 1.0);
            vec3 bg = auroraBg(uvR);

            // Subtle shading to keep 3D form
            vec3 L = normalize(vec3(0.6, 0.8, 0.3));
            float t2 = uTime * 0.25;
            L = normalize(vec3(sin(t2)*0.6 + 0.6, 0.8, cos(t2)*0.4 + 0.5));
            float NdotL = clamp(dot(n, L), 0.0, 1.0);
            float rim = pow(1.0 - clamp(dot(n, -dir), 0.0, 1.0), 3.0);

            // Tint the refracted bg a touch to simulate absorption
            vec3 tint = vec3(0.92, 0.97, 1.0); // very light blue
            vec3 refrCol = bg * tint;

            // Add a soft highlight on top
            refrCol += uColHi * (0.10 + 0.25 * NdotL) * 0.25;
            refrCol += uColHi * rim * 0.25;

            // Grain to avoid banding
            refrCol += (hash(gl_FragCoord.xy + uTime) - 0.5) * 0.01;

            col = toneMap(refrCol);
            alpha = uOpacity; // final translucency of the blobs
          } else {
            // fully transparent where no blob
            col = vec3(0.0);
            alpha = 0.0;
          }

          vec3 premul = col * alpha;
gl_FragColor = vec4(premul, alpha);
        }
      `,
      uniforms: {
        uResolution: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uOpacity: { value: 0.65 }, // overall blob transparency
        uBlobCount: { value: 12 },
        uK: { value: 0.4 },
        uColHi: { value: new THREE.Color("#ffffff") },

        // Refractive params
        uIOR: { value: 1.1 }, // 1.05–1.20 = subtle glass/gel
        uRefractAmt: { value: 0.035 }, // 0.02–0.06 looks nice

        // Aurora gradient inputs
        uAuroraDeep: { value: new THREE.Color("#020617") },
        uAuroraBrand: { value: new THREE.Color("#1E67C6") }, // will live-update from CSS --brand

        // camera uniforms
        uCamPos: { value: new THREE.Vector3(0, 0, 6) },
        uCamRight: { value: new THREE.Vector3(1, 0, 0) },
        uCamUp: { value: new THREE.Vector3(0, 1, 0) },
        uCamFwd: { value: new THREE.Vector3(0, 0, -1) },
        uFovY: { value: THREE.MathUtils.degToRad(40) },

        // blobs
        uBlobs: {
          value: Array.from(
            { length: MAX_BLOBS },
            () => new THREE.Vector4(0, 0, 0, 0)
          ),
        },
      },
    });

    material.premultipliedAlpha = true;

    (quad.material as THREE.ShaderMaterial) = material;

    /* ----------------------------- Resize handling ---------------------------- */
    function resize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h, false);
      const db = new THREE.Vector2();
      renderer.getDrawingBufferSize(db);
      material.uniforms.uResolution.value.copy(db);
    }
    resize();
    window.addEventListener("resize", resize);

    /* ---------------------- Pull animated --brand from CSS -------------------- */
    function readBrandFromCSS(): THREE.Color | null {
      const host = mountRef.current!;
      // AuroraBackground sets --brand on the parent motion.div
      const parent = host.parentElement as HTMLElement | null;
      const cs = parent ? getComputedStyle(parent) : null;
      const val = cs?.getPropertyValue("--brand")?.trim();
      if (!val) return null;
      try {
        const c = new THREE.Color(val);
        return c;
      } catch {
        return null;
      }
    }

    /* ---------------------------- Mouse parallax ------------------------------ */
    let mouseX = 0,
      mouseY = 0;
    window.addEventListener(
      "pointermove",
      (e) => {
        const w = window.innerWidth,
          h = window.innerHeight;
        const nx = (e.clientX / w) * 2 - 1;
        const ny = (e.clientY / h) * 2 - 1;
        mouseX = THREE.MathUtils.lerp(mouseX, nx, 0.15);
        mouseY = THREE.MathUtils.lerp(mouseY, ny, 0.15);
      },
      { passive: true }
    );

    /* -------------------------- Camera gentle motion -------------------------- */
    function updateCamera(t: number) {
      const basePos = new THREE.Vector3(
        Math.sin(t * 0.15) * 0.6,
        Math.cos(t * 0.12) * 0.4,
        6.0
      );
      basePos.x += mouseX * 5;
      basePos.y += -mouseY * 5;

      const target = new THREE.Vector3(0, 0, 0);
      const fwd = target.clone().sub(basePos).normalize();
      const right = new THREE.Vector3()
        .crossVectors(fwd, new THREE.Vector3(0, 1, 0))
        .normalize();
      const up = new THREE.Vector3().crossVectors(right, fwd).normalize();

      material.uniforms.uCamPos.value.copy(basePos);
      material.uniforms.uCamFwd.value.copy(fwd);
      material.uniforms.uCamRight.value.copy(right);
      material.uniforms.uCamUp.value.copy(up);
    }

    /* --------------------------- Blob path animation -------------------------- */
    const blobs = material.uniforms.uBlobs.value as THREE.Vector4[];
    function updateBlobs(time: number) {
      const n = material.uniforms.uBlobCount.value as number;
      for (let i = 0; i < n; i++) {
        const fi = i + 1.0;
        const x = Math.sin(time * (0.2 + 0.03 * fi) + fi * 1.1) * 1.25;
        const y = Math.cos(time * (0.18 + 0.04 * fi) + fi * 1.7) * 1.0;
        const z = Math.sin(time * (0.16 + 0.02 * fi) + fi * 0.9) * 1.05;
        const r = 0.5 + 0.18 * Math.sin(time * 0.6 + fi);
        blobs[i].set(x, y, z, r);
      }
    }

    /* ----------------------- Scroll fade + pause when off --------------------- */
    let visible = true;
    function onScroll() {
      const y = window.scrollY;
      const progress = 1 - Math.min(Math.max(y / window.innerHeight, 0), 1);
      renderer.domElement.style.opacity = String(progress);
      const nowVisible = progress > 0.001;
      if (nowVisible !== visible) {
        visible = nowVisible;
        if (visible && rafRef.current === null) animate();
        if (!visible && rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current!);
          rafRef.current = null;
        }
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    /* --------------------------------- Loop ---------------------------------- */
    const clock = new THREE.Clock();
    const animate = () => {
      const delta = clock.getDelta();
      const t = clock.elapsedTime;

      blobT += delta * BLOB_SPEED;

      const brand = readBrandFromCSS();
      if (brand) material.uniforms.uAuroraBrand.value.copy(brand);

      material.uniforms.uTime.value = t;
      updateCamera(t);
      updateBlobs(blobT);

      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(animate);
    };
    animate();

    /* -------------------------------- Cleanup -------------------------------- */
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      renderer.dispose();
      mountRef.current?.removeChild(renderer.domElement);
      quad.geometry.dispose();
      material.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden
      className="fixed inset-0 h-screen w-screen z-1 pointer-events-none"
    />
  );
}
