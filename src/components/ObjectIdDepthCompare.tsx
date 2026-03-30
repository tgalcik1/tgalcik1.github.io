import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const PIXEL_SCALE = 2;
const OBJECT_ID_OWNERSHIP_DEPTH_THRESHOLD = 0.001;
const INTERNAL_DEPTH_THRESHOLD = 0.0005;

export default function ObjectIdDepthCompare() {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const splitMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const [split, setSplit] = useState(0.5);

  useEffect(() => {
    if (splitMaterialRef.current) {
      splitMaterialRef.current.uniforms.split.value = split;
    }
  }, [split]);

  useEffect(() => {
    const root = rootRef.current;
    const mount = viewportRef.current;
    if (!root || !mount) return;

    const scene = new THREE.Scene();
    const target = new THREE.Vector3(0, 0.2, 0);
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 30);
    const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const postScene = new THREE.Scene();
    const upscaleScene = new THREE.Scene();

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
    });
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor("#000000", 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";

    const objectIdEdgeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tObjectIds: { value: null },
        tDepth: { value: null },
        texelSize: { value: new THREE.Vector2(1, 1) },
      },
      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tObjectIds;
        uniform sampler2D tDepth;
        uniform vec2 texelSize;

        varying vec2 vUv;

        float sampleId(vec2 uv) {
          return texture2D(tObjectIds, uv).r;
        }

        float sampleDepth(vec2 uv) {
          return texture2D(tDepth, uv).r;
        }

        float ownedEdge(float centerId, float neighborId, float discontinuity, float depthDelta) {
          if (discontinuity <= 0.0) {
            return 0.0;
          }

          if (abs(depthDelta) > ${OBJECT_ID_OWNERSHIP_DEPTH_THRESHOLD.toFixed(4)}) {
            return depthDelta > 0.0 ? 1.0 : 0.0;
          }

          return centerId > neighborId ? 1.0 : 0.0;
        }

        void main() {
          float id_c = sampleId(vUv);
          float id_t = sampleId(vUv + vec2(0.0, texelSize.y));
          float id_b = sampleId(vUv + vec2(0.0, -texelSize.y));
          float id_l = sampleId(vUv + vec2(-texelSize.x, 0.0));
          float id_r = sampleId(vUv + vec2(texelSize.x, 0.0));

          float d_c = sampleDepth(vUv);
          float d_t = sampleDepth(vUv + vec2(0.0, texelSize.y));
          float d_b = sampleDepth(vUv + vec2(0.0, -texelSize.y));
          float d_l = sampleDepth(vUv + vec2(-texelSize.x, 0.0));
          float d_r = sampleDepth(vUv + vec2(texelSize.x, 0.0));

          float disc_t = step(0.0001, abs(id_t - id_c));
          float disc_b = step(0.0001, abs(id_b - id_c));
          float disc_l = step(0.0001, abs(id_l - id_c));
          float disc_r = step(0.0001, abs(id_r - id_c));

          float edge_t = ownedEdge(id_c, id_t, disc_t, d_t - d_c);
          float edge_b = ownedEdge(id_c, id_b, disc_b, d_b - d_c);
          float edge_l = ownedEdge(id_c, id_l, disc_l, d_l - d_c);
          float edge_r = ownedEdge(id_c, id_r, disc_r, d_r - d_c);

          float objectEdge = max(max(edge_t, edge_b), max(edge_l, edge_r));
          gl_FragColor = vec4(objectEdge, 0.0, 0.0, 1.0);
        }
      `,
    });

    const internalDepthEdgeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDepth: { value: null },
        texelSize: { value: new THREE.Vector2(1, 1) },
      },
      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDepth;
        uniform vec2 texelSize;

        varying vec2 vUv;

        float sampleDepth(vec2 uv) {
          return texture2D(tDepth, uv).r;
        }

        void main() {
          float d_c = sampleDepth(vUv);
          float d_t = sampleDepth(vUv + vec2(0.0, texelSize.y));
          float d_b = sampleDepth(vUv + vec2(0.0, -texelSize.y));
          float d_l = sampleDepth(vUv + vec2(-texelSize.x, 0.0));
          float d_r = sampleDepth(vUv + vec2(texelSize.x, 0.0));

          float delta_t = d_t - d_c;
          float delta_b = d_b - d_c;
          float delta_l = d_l - d_c;
          float delta_r = d_r - d_c;

          float edge_t = step(${INTERNAL_DEPTH_THRESHOLD.toFixed(3)}, abs(delta_t)) * step(0.0, delta_t);
          float edge_b = step(${INTERNAL_DEPTH_THRESHOLD.toFixed(3)}, abs(delta_b)) * step(0.0, delta_b);
          float edge_l = step(${INTERNAL_DEPTH_THRESHOLD.toFixed(3)}, abs(delta_l)) * step(0.0, delta_l);
          float edge_r = step(${INTERNAL_DEPTH_THRESHOLD.toFixed(3)}, abs(delta_r)) * step(0.0, delta_r);

          float depthEdge = max(max(edge_t, edge_b), max(edge_l, edge_r));
          gl_FragColor = vec4(depthEdge, depthEdge, 0.0, 1.0);
        }
      `,
    });

    const splitMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tLeft: { value: null },
        tRight: { value: null },
        split: { value: split },
      },
      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tLeft;
        uniform sampler2D tRight;
        uniform float split;

        varying vec2 vUv;

        void main() {
          vec4 leftColor = texture2D(tLeft, vUv);
          vec4 depthColor = texture2D(tRight, vUv);
          float silhouetteMask = step(0.0001, leftColor.r);
          float internalDepthMask = depthColor.g * (1.0 - silhouetteMask);
          vec4 rightColor = vec4(
            max(leftColor.r, internalDepthMask),
            internalDepthMask,
            0.0,
            max(leftColor.a, depthColor.a)
          );
          gl_FragColor = vUv.x < split ? leftColor : rightColor;
        }
      `,
    });
    splitMaterialRef.current = splitMaterial;

    const postQuad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      splitMaterial,
    );
    postScene.add(postQuad);

    const upscaleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tInput: { value: null },
        textureSize: { value: new THREE.Vector2(1, 1) },
      },
      extensions: {
        derivatives: true,
      },
      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tInput;
        uniform vec2 textureSize;

        varying vec2 vUv;

        void main() {
          vec2 boxSize = clamp(fwidth(vUv) * textureSize, 0.00001, 1.0);
          vec2 tx = vUv * textureSize - 0.5 * boxSize;
          vec2 txOffset = smoothstep(vec2(1.0) - boxSize, vec2(1.0), fract(tx));
          vec2 sampleUv = (floor(tx) + 0.5 + txOffset) / textureSize;
          gl_FragColor = texture2D(tInput, sampleUv);
        }
      `,
    });
    const upscaleTarget = new THREE.WebGLRenderTarget(1, 1);
    upscaleTarget.texture.minFilter = THREE.LinearFilter;
    upscaleTarget.texture.magFilter = THREE.LinearFilter;
    upscaleTarget.texture.generateMipmaps = false;
    const upscaleQuad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      upscaleMaterial,
    );
    upscaleScene.add(upscaleQuad);

    const objectIdDepthTexture = new THREE.DepthTexture(1, 1);
    objectIdDepthTexture.minFilter = THREE.NearestFilter;
    objectIdDepthTexture.magFilter = THREE.NearestFilter;
    objectIdDepthTexture.generateMipmaps = false;

    const objectIdTarget = new THREE.WebGLRenderTarget(1, 1, {
      depthBuffer: true,
    });
    objectIdTarget.texture.minFilter = THREE.NearestFilter;
    objectIdTarget.texture.magFilter = THREE.NearestFilter;
    objectIdTarget.texture.generateMipmaps = false;
    objectIdTarget.depthTexture = objectIdDepthTexture;

    const objectIdEdgeTarget = new THREE.WebGLRenderTarget(1, 1);
    objectIdEdgeTarget.texture.minFilter = THREE.NearestFilter;
    objectIdEdgeTarget.texture.magFilter = THREE.NearestFilter;
    objectIdEdgeTarget.texture.generateMipmaps = false;

    const depthTarget = new THREE.WebGLRenderTarget(1, 1, {
      depthBuffer: true,
    });
    const compareDepthTexture = new THREE.DepthTexture(1, 1);
    compareDepthTexture.minFilter = THREE.NearestFilter;
    compareDepthTexture.magFilter = THREE.NearestFilter;
    compareDepthTexture.generateMipmaps = false;
    depthTarget.texture.minFilter = THREE.NearestFilter;
    depthTarget.texture.magFilter = THREE.NearestFilter;
    depthTarget.texture.generateMipmaps = false;
    depthTarget.depthTexture = compareDepthTexture;

    const combinedEdgeTarget = new THREE.WebGLRenderTarget(1, 1);
    combinedEdgeTarget.texture.minFilter = THREE.NearestFilter;
    combinedEdgeTarget.texture.magFilter = THREE.NearestFilter;
    combinedEdgeTarget.texture.generateMipmaps = false;

    const objectIdEntries: Array<{
      mesh: THREE.Mesh;
      material: THREE.Material | THREE.Material[];
      objectIdMaterial: THREE.Material | THREE.Material[];
    }> = [];

    const renderObjectIds = () => {
      objectIdEntries.forEach(({ mesh, objectIdMaterial }) => {
        mesh.material = objectIdMaterial;
      });
      scene.overrideMaterial = null;
      renderer.render(scene, camera);
      objectIdEntries.forEach(({ mesh, material }) => {
        mesh.material = material;
      });
    };

    const ambient = new THREE.AmbientLight("#66707f", 1.2);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight("#ffffff", 2.4);
    keyLight.position.set(3.6, 4.8, 3.1);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0002;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 18;
    keyLight.shadow.camera.left = -3.8;
    keyLight.shadow.camera.right = 3.8;
    keyLight.shadow.camera.top = 3.8;
    keyLight.shadow.camera.bottom = -3.8;
    scene.add(keyLight);

    const loader = new GLTFLoader();
    let modelRoot: THREE.Object3D | null = null;
    let disposed = false;
    let frameId = 0;
    let isVisible = false;

    const fitCameraToObject = (object: THREE.Object3D) => {
      const box = new THREE.Box3().setFromObject(object);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      object.position.sub(center);
      target.set(0, 0, 0);

      const radius = Math.max(size.x, size.y, size.z) * 0.75;
      camera.position.set(radius * 1.4, radius * 0.95, radius * 1.8);
      camera.lookAt(target);
      keyLight.position.set(radius * 1.5, radius * 2.2, radius * 1.3);
      keyLight.target.position.copy(target);
      scene.add(keyLight.target);
    };

    loader.load("/models/torus_knot.glb", (gltf) => {
      if (disposed) return;

      modelRoot = gltf.scene;
      modelRoot.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.castShadow = true;
        object.receiveShadow = true;

        const sourceMaterial = Array.isArray(object.material)
          ? object.material[0]
          : object.material;
        const objectMaterial = sourceMaterial.clone();
        if ("map" in sourceMaterial && sourceMaterial.map) {
          objectMaterial.map = sourceMaterial.map;
        }

        object.material = objectMaterial;
        objectIdEntries.push({
          mesh: object,
          material: object.material,
          objectIdMaterial: new THREE.MeshBasicMaterial({ color: "#dcdcdc" }),
        });
      });

      fitCameraToObject(modelRoot);
      scene.add(modelRoot);
    });

    const resize = () => {
      const width = Math.max(mount.clientWidth, 1);
      const height = Math.max(mount.clientHeight, 1);
      const devicePixelRatio = window.devicePixelRatio || 1;
      const displayWidth = Math.max(1, Math.round(width * devicePixelRatio));
      const displayHeight = Math.max(1, Math.round(height * devicePixelRatio));
      const renderWidth = Math.max(1, Math.round(width / PIXEL_SCALE));
      const renderHeight = Math.max(1, Math.round(height / PIXEL_SCALE));

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(displayWidth, displayHeight, false);

      objectIdTarget.setSize(renderWidth, renderHeight);
      objectIdEdgeTarget.setSize(renderWidth, renderHeight);
      depthTarget.setSize(renderWidth, renderHeight);
      combinedEdgeTarget.setSize(renderWidth, renderHeight);
      upscaleTarget.setSize(renderWidth, renderHeight);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    window.addEventListener("resize", resize);
    resize();

    const clock = new THREE.Clock();

    const render = () => {
      if (disposed) return;
      frameId = window.requestAnimationFrame(render);
      if (!isVisible || !modelRoot) return;

      const elapsed = clock.getElapsedTime();
      modelRoot.rotation.y = elapsed * 0.35;

      renderer.setRenderTarget(objectIdTarget);
      renderObjectIds();
      renderer.setRenderTarget(null);

      renderer.setRenderTarget(depthTarget);
      scene.overrideMaterial = null;
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);

      postQuad.material = objectIdEdgeMaterial;
      objectIdEdgeMaterial.uniforms.tObjectIds.value = objectIdTarget.texture;
      objectIdEdgeMaterial.uniforms.tDepth.value = objectIdTarget.depthTexture;
      objectIdEdgeMaterial.uniforms.texelSize.value.set(
        1 / objectIdTarget.width,
        1 / objectIdTarget.height,
      );
      renderer.setRenderTarget(objectIdEdgeTarget);
      renderer.render(postScene, postCamera);
      renderer.setRenderTarget(null);

      postQuad.material = internalDepthEdgeMaterial;
      internalDepthEdgeMaterial.uniforms.tDepth.value =
        depthTarget.depthTexture;
      internalDepthEdgeMaterial.uniforms.texelSize.value.set(
        1 / depthTarget.width,
        1 / depthTarget.height,
      );
      renderer.setRenderTarget(combinedEdgeTarget);
      renderer.render(postScene, postCamera);
      renderer.setRenderTarget(null);

      postQuad.material = splitMaterial;
      splitMaterial.uniforms.tLeft.value = objectIdEdgeTarget.texture;
      splitMaterial.uniforms.tRight.value = combinedEdgeTarget.texture;
      renderer.setRenderTarget(upscaleTarget);
      renderer.render(postScene, postCamera);
      renderer.setRenderTarget(null);

      upscaleMaterial.uniforms.tInput.value = upscaleTarget.texture;
      upscaleMaterial.uniforms.textureSize.value.set(
        upscaleTarget.width,
        upscaleTarget.height,
      );
      renderer.render(upscaleScene, postCamera);
    };

    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.1 },
    );
    visibilityObserver.observe(root);

    const updateSplitFromPointer = (clientX: number) => {
      const rect = mount.getBoundingClientRect();
      const next = (clientX - rect.left) / rect.width;
      setSplit(THREE.MathUtils.clamp(next, 0.05, 0.95));
    };

    let dragging = false;
    const onPointerDown = (event: PointerEvent) => {
      dragging = true;
      updateSplitFromPointer(event.clientX);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      updateSplitFromPointer(event.clientX);
    };
    const onPointerUp = () => {
      dragging = false;
    };

    mount.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    render();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      window.removeEventListener("resize", resize);
      mount.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);

      splitMaterialRef.current = null;
      renderer.dispose();
      objectIdTarget.dispose();
      objectIdEdgeTarget.dispose();
      depthTarget.dispose();
      combinedEdgeTarget.dispose();
      objectIdEdgeMaterial.dispose();
      internalDepthEdgeMaterial.dispose();
      splitMaterial.dispose();
      upscaleMaterial.dispose();
      postQuad.geometry.dispose();
      upscaleQuad.geometry.dispose();
      upscaleTarget.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="silhouette-compare"
      aria-label="Object ID and depth silhouette comparison"
    >
      <div ref={viewportRef} className="silhouette-compare__viewport" />
      <div
        className="silhouette-compare__divider"
        style={{ left: `${split * 100}%` }}
        aria-hidden="true"
      >
        <div className="silhouette-compare__handle" />
      </div>
      <div className="silhouette-compare__labels" aria-hidden="true">
        <span>Object ID Only</span>
        <span>+ Internal Depth</span>
      </div>
    </div>
  );
}
