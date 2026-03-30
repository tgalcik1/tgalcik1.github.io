import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

type ViewMode =
  | "color"
  | "depth"
  | "normals"
  | "segments"
  | "segmentCellBevel"
  | "segmentEdges"
  | "segmentIndented"
  | "segmentIndentedLit"
  | "combinedMask"
  | "depthEdges"
  | "normalEdges"
  | "objectIds"
  | "objectIdEdges"
  | "augmentedBlend"
  | "blend";

interface Props {
  mode?:
    | "full"
    | "depthEdgesOnly"
    | "normalEdgesOnly"
    | "segmentOnly"
    | "segmentCellBevelOnly"
    | "segmentEdgesOnly"
    | "segmentIndentedOnly"
    | "segmentIndentedLitOnly"
    | "combinedMaskOnly"
    | "objectIdOnly"
    | "objectIdEdgesOnly"
    | "augmentedBlendOnly"
    | "blendOnly";
}

const FULL_VIEW_MODES: ViewMode[] = ["color", "depth", "normals"];
const DEPTH_EDGE_VIEW_MODES: ViewMode[] = ["depthEdges"];
const NORMAL_EDGE_VIEW_MODES: ViewMode[] = ["normalEdges"];
const SEGMENT_VIEW_MODES: ViewMode[] = ["segments"];
const SEGMENT_CELL_BEVEL_VIEW_MODES: ViewMode[] = ["segmentCellBevel"];
const SEGMENT_EDGE_VIEW_MODES: ViewMode[] = ["segmentEdges"];
const SEGMENT_INDENTED_VIEW_MODES: ViewMode[] = ["segmentIndented"];
const SEGMENT_INDENTED_LIT_VIEW_MODES: ViewMode[] = ["segmentIndentedLit"];
const COMBINED_MASK_VIEW_MODES: ViewMode[] = ["combinedMask"];
const SEGMENT_TEXTURE_OPTIONS = [
  {
    id: "grid",
    label: "Grid",
    path: "/images/segments/grid.png",
    repeatScale: 0.25,
    resolution: 512,
  },
  {
    id: "brick",
    label: "Brick",
    path: "/images/segments/brick.png",
    repeatScale: 0.25,
    resolution: 512,
  },
  {
    id: "basket",
    label: "Basket",
    path: "/images/segments/basket.png",
    repeatScale: 0.25,
    resolution: 512,
  },
  {
    id: "voronoi",
    label: "Voronoi",
    path: "/images/segments/voronoi.png",
    repeatScale: 0.25,
    resolution: 1024,
  },
] as const;
const OBJECT_ID_VIEW_MODES: ViewMode[] = ["objectIds"];
const OBJECT_ID_EDGE_VIEW_MODES: ViewMode[] = ["objectIdEdges"];
const AUGMENTED_BLEND_VIEW_MODES: ViewMode[] = ["augmentedBlend"];
const BLEND_VIEW_MODES: ViewMode[] = ["blend"];
const SEGMENT_TEXTURE_STORAGE_KEY = "pixel-art-segment-texture";
const SEGMENT_TEXTURE_EVENT = "pixel-art-segment-texture-change";
const generatedSegmentFieldCache = new Map<string, THREE.DataTexture>();
const PIXEL_SCALE = 2;
const DEPTH_EDGE_THRESHOLD = 0.01;
const NORMAL_EDGE_THRESHOLD = 0.15;
const OBJECT_ID_OWNERSHIP_DEPTH_THRESHOLD = 0.005;
const INTERNAL_DEPTH_BLEND_THRESHOLD = 0.01;
const DEPTH_OUTLINE_STRENGTH = 1;
const OBJECT_ID_OUTLINE_STRENGTH = 1;
const INTERNAL_DEPTH_OUTLINE_STRENGTH = 1;
const NORMAL_OUTLINE_STRENGTH = 1;
const OUTLINE_LIGHT_THRESHOLD = 0.05;
const OUTLINE_LIGHT_SOFTNESS = 0.04;

export default function PixelArtBufferViews({ mode = "full" }: Props) {
  const [selectedSegmentTextureId, setSelectedSegmentTextureId] = useState(
    SEGMENT_TEXTURE_OPTIONS[0].id,
  );
  const [depthThreshold, setDepthThreshold] = useState(DEPTH_EDGE_THRESHOLD);
  const [depthOutlineStrength, setDepthOutlineStrength] = useState(
    DEPTH_OUTLINE_STRENGTH,
  );
  const [objectIdOutlineStrength, setObjectIdOutlineStrength] = useState(
    OBJECT_ID_OUTLINE_STRENGTH,
  );
  const [internalDepthOutlineStrength, setInternalDepthOutlineStrength] =
    useState(INTERNAL_DEPTH_OUTLINE_STRENGTH);
  const [normalOutlineStrength, setNormalOutlineStrength] = useState(
    NORMAL_OUTLINE_STRENGTH,
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const colorRef = useRef<HTMLDivElement>(null);
  const depthRef = useRef<HTMLDivElement>(null);
  const normalsRef = useRef<HTMLDivElement>(null);
  const segmentRef = useRef<HTMLDivElement>(null);
  const segmentCellBevelRef = useRef<HTMLDivElement>(null);
  const segmentEdgesRef = useRef<HTMLDivElement>(null);
  const segmentIndentedRef = useRef<HTMLDivElement>(null);
  const segmentIndentedLitRef = useRef<HTMLDivElement>(null);
  const combinedMaskRef = useRef<HTMLDivElement>(null);
  const depthEdgesRef = useRef<HTMLDivElement>(null);
  const normalEdgesRef = useRef<HTMLDivElement>(null);
  const objectIdsRef = useRef<HTMLDivElement>(null);
  const objectIdEdgesRef = useRef<HTMLDivElement>(null);
  const augmentedBlendRef = useRef<HTMLDivElement>(null);
  const blendRef = useRef<HTMLDivElement>(null);
  const depthEdgeMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const normalEdgeMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const augmentedBlendMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const blendMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const selectedSegmentTexture =
    SEGMENT_TEXTURE_OPTIONS.find(({ id }) => id === selectedSegmentTextureId) ??
    SEGMENT_TEXTURE_OPTIONS[0];

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem(SEGMENT_TEXTURE_STORAGE_KEY);
    if (
      stored &&
      SEGMENT_TEXTURE_OPTIONS.some(({ id }) => id === stored) &&
      stored !== selectedSegmentTextureId
    ) {
      setSelectedSegmentTextureId(stored);
    }

    const syncSelection = (event: Event) => {
      const nextId =
        event instanceof CustomEvent ? (event.detail as string) : null;
      if (
        nextId &&
        SEGMENT_TEXTURE_OPTIONS.some(({ id }) => id === nextId) &&
        nextId !== selectedSegmentTextureId
      ) {
        setSelectedSegmentTextureId(nextId);
      }
    };

    const syncFromStorage = (event: StorageEvent) => {
      if (event.key !== SEGMENT_TEXTURE_STORAGE_KEY || !event.newValue) return;
      if (
        SEGMENT_TEXTURE_OPTIONS.some(({ id }) => id === event.newValue) &&
        event.newValue !== selectedSegmentTextureId
      ) {
        setSelectedSegmentTextureId(event.newValue);
      }
    };

    window.addEventListener(SEGMENT_TEXTURE_EVENT, syncSelection);
    window.addEventListener("storage", syncFromStorage);

    return () => {
      window.removeEventListener(SEGMENT_TEXTURE_EVENT, syncSelection);
      window.removeEventListener("storage", syncFromStorage);
    };
  }, [selectedSegmentTextureId]);

  useEffect(() => {
    if (depthEdgeMaterialRef.current) {
      depthEdgeMaterialRef.current.uniforms.threshold.value = depthThreshold;
    }

    if (normalEdgeMaterialRef.current) {
      normalEdgeMaterialRef.current.uniforms.depthThreshold.value =
        depthThreshold;
    }

    if (blendMaterialRef.current) {
      blendMaterialRef.current.uniforms.depthThreshold.value = depthThreshold;
      blendMaterialRef.current.uniforms.depthOutlineStrength.value =
        depthOutlineStrength;
      blendMaterialRef.current.uniforms.normalOutlineStrength.value =
        normalOutlineStrength;
    }

    if (augmentedBlendMaterialRef.current) {
      augmentedBlendMaterialRef.current.uniforms.objectIdOutlineStrength.value =
        objectIdOutlineStrength;
      augmentedBlendMaterialRef.current.uniforms.internalDepthOutlineStrength.value =
        internalDepthOutlineStrength;
      augmentedBlendMaterialRef.current.uniforms.normalOutlineStrength.value =
        normalOutlineStrength;
    }
  }, [
    depthThreshold,
    depthOutlineStrength,
    objectIdOutlineStrength,
    internalDepthOutlineStrength,
    normalOutlineStrength,
  ]);

  useEffect(() => {
    const activeModes =
      mode === "depthEdgesOnly"
        ? DEPTH_EDGE_VIEW_MODES
        : mode === "normalEdgesOnly"
          ? NORMAL_EDGE_VIEW_MODES
          : mode === "segmentOnly"
            ? SEGMENT_VIEW_MODES
            : mode === "segmentCellBevelOnly"
              ? SEGMENT_CELL_BEVEL_VIEW_MODES
            : mode === "segmentEdgesOnly"
              ? SEGMENT_EDGE_VIEW_MODES
              : mode === "segmentIndentedOnly"
                ? SEGMENT_INDENTED_VIEW_MODES
                : mode === "segmentIndentedLitOnly"
                  ? SEGMENT_INDENTED_LIT_VIEW_MODES
                  : mode === "combinedMaskOnly"
                    ? COMBINED_MASK_VIEW_MODES
                    : mode === "objectIdOnly"
                      ? OBJECT_ID_VIEW_MODES
                      : mode === "objectIdEdgesOnly"
                        ? OBJECT_ID_EDGE_VIEW_MODES
                        : mode === "augmentedBlendOnly"
                          ? AUGMENTED_BLEND_VIEW_MODES
                          : mode === "blendOnly"
                            ? BLEND_VIEW_MODES
                            : FULL_VIEW_MODES;

    const mounts: Record<ViewMode, HTMLDivElement | null> = {
      color: colorRef.current,
      depth: depthRef.current,
      normals: normalsRef.current,
      segments: segmentRef.current,
      segmentCellBevel: segmentCellBevelRef.current,
      segmentEdges: segmentEdgesRef.current,
      segmentIndented: segmentIndentedRef.current,
      segmentIndentedLit: segmentIndentedLitRef.current,
      combinedMask: combinedMaskRef.current,
      depthEdges: depthEdgesRef.current,
      normalEdges: normalEdgesRef.current,
      objectIds: objectIdsRef.current,
      objectIdEdges: objectIdEdgesRef.current,
      augmentedBlend: augmentedBlendRef.current,
      blend: blendRef.current,
    };
    const root = rootRef.current;

    if (!root || activeModes.some((activeMode) => !mounts[activeMode])) return;

    const scene = new THREE.Scene();
    const orthoSize = 1.8;
    const target = new THREE.Vector3(0, 0.5, 0);
    const lookTarget = target;
    const cameraPitch = Math.PI / 6;
    const cameraYaw = -Math.PI / 4;
    const cameraDistance = 4.2;
    const ambientColor = new THREE.Color("#69707e");

    const textureLoader = new THREE.TextureLoader();
    const pixelTexture = (path: string, repeatX = 1, repeatY = 1) => {
      const texture = textureLoader.load(path);
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      texture.generateMipmaps = false;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(repeatX, repeatY);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };
    const scalarTexture = (path: string, repeatX = 1, repeatY = 1) => {
      const texture = textureLoader.load(path);
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      texture.generateMipmaps = false;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(repeatX, repeatY);
      texture.colorSpace = THREE.NoColorSpace;
      return texture;
    };
    const generatedSegmentFieldTexture = (path: string) => {
      const cachedTexture = generatedSegmentFieldCache.get(path);
      if (cachedTexture) {
        return cachedTexture;
      }

      const initialData = new Uint8Array([128, 128, 0, 255]);
      const texture = new THREE.DataTexture(
        initialData,
        1,
        1,
        THREE.RGBAFormat,
      );
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.colorSpace = THREE.NoColorSpace;
      generatedSegmentFieldCache.set(path, texture);

      textureLoader.load(path, (loadedTexture) => {
        const image = loadedTexture.image as
          | HTMLImageElement
          | HTMLCanvasElement
          | ImageBitmap;
        const width = image.width;
        const height = image.height;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return;
        context.drawImage(image, 0, 0, width, height);
        const pixels = context.getImageData(0, 0, width, height).data;

        const ids = new Uint8Array(width * height);
        for (let i = 0; i < width * height; i += 1) {
          ids[i] = pixels[i * 4];
        }

        const size = width * height;
        let nearestX = new Int32Array(size);
        let nearestY = new Int32Array(size);
        nearestX.fill(-1);
        nearestY.fill(-1);

        const wrapX = (x: number) => ((x % width) + width) % width;
        const wrapY = (y: number) => ((y % height) + height) % height;
        const indexAt = (x: number, y: number) => wrapY(y) * width + wrapX(x);
        const wrappedDelta = (delta: number, size: number) => {
          const half = size * 0.5;
          if (delta > half) return delta - size;
          if (delta < -half) return delta + size;
          return delta;
        };
        const wrappedDistance = (
          x1: number,
          y1: number,
          x2: number,
          y2: number,
        ) => {
          const dx = wrappedDelta(x2 - x1, width);
          const dy = wrappedDelta(y2 - y1, height);
          return Math.hypot(dx, dy);
        };
        const isDifferent = (x1: number, y1: number, x2: number, y2: number) =>
          ids[indexAt(x1, y1)] !== ids[indexAt(x2, y2)];

        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) {
            const i = indexAt(x, y);
            let boundary = false;
            for (let oy = -1; oy <= 1 && !boundary; oy += 1) {
              for (let ox = -1; ox <= 1; ox += 1) {
                if (ox === 0 && oy === 0) continue;
                const nx = wrapX(x + ox);
                const ny = wrapY(y + oy);
                if (isDifferent(x, y, nx, ny)) {
                  boundary = true;
                  break;
                }
              }
            }
            if (boundary) {
              nearestX[i] = x;
              nearestY[i] = y;
            }
          }
        }

        let step = 1;
        while (step < Math.max(width, height)) step <<= 1;

        const offsets = [
          [-1, -1],
          [0, -1],
          [1, -1],
          [-1, 0],
          [0, 0],
          [1, 0],
          [-1, 1],
          [0, 1],
          [1, 1],
        ] as const;

        for (step >>= 1; step >= 1; step >>= 1) {
          const nextX = new Int32Array(nearestX);
          const nextY = new Int32Array(nearestY);

          for (let y = 0; y < height; y += 1) {
            for (let x = 0; x < width; x += 1) {
              const i = indexAt(x, y);
              let bestX = nearestX[i];
              let bestY = nearestY[i];
              let bestDistance =
                bestX >= 0 ? Math.hypot(bestX - x, bestY - y) : Infinity;

              for (const [ox, oy] of offsets) {
                const sx = wrapX(x + ox * step);
                const sy = wrapY(y + oy * step);
                const si = indexAt(sx, sy);
                const candidateX = nearestX[si];
                const candidateY = nearestY[si];
                if (candidateX < 0) continue;
                const candidateDistance = wrappedDistance(
                  x,
                  y,
                  candidateX,
                  candidateY,
                );
                if (candidateDistance < bestDistance) {
                  bestDistance = candidateDistance;
                  bestX = candidateX;
                  bestY = candidateY;
                }
              }

              nextX[i] = bestX;
              nextY[i] = bestY;
            }
          }

          nearestX = nextX;
          nearestY = nextY;
        }

        const maxDistanceById = new Float32Array(256);
        for (let i = 0; i < size; i += 1) {
          const bx = nearestX[i];
          const by = nearestY[i];
          if (bx < 0) continue;
          const x = i % width;
          const y = Math.floor(i / width);
          const distance = wrappedDistance(x, y, bx, by);
          const id = ids[i];
          if (distance > maxDistanceById[id]) {
            maxDistanceById[id] = distance;
          }
        }

        const field = new Uint8Array(size * 4);
        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) {
            const i = indexAt(x, y);
            const px = i * 4;
            const bx = nearestX[i];
            const by = nearestY[i];
            if (bx < 0) {
              field[px] = 128;
              field[px + 1] = 128;
              field[px + 2] = 0;
              field[px + 3] = 255;
              continue;
            }

            const dx = wrappedDelta(bx - x, width);
            const dy = wrappedDelta(by - y, height);
            const distance = Math.hypot(dx, dy);
            const direction =
              distance > 0.0001
                ? new THREE.Vector2(dx / distance, dy / distance)
                : new THREE.Vector2(0, 0);
            const maxDistance = Math.max(maxDistanceById[ids[i]], 1);
            const normalizedDistance = Math.min(distance / maxDistance, 1);

            field[px] = Math.round((direction.x * 0.5 + 0.5) * 255);
            field[px + 1] = Math.round((direction.y * 0.5 + 0.5) * 255);
            field[px + 2] = Math.round(normalizedDistance * 255);
            field[px + 3] = 255;
          }
        }

        texture.image = { data: field, width, height };
        texture.needsUpdate = true;
      });

      return texture;
    };

    const createPlanarBoxGeometry = (
      width: number,
      height: number,
      depth: number,
      uvReference = {
        width,
        height,
        depth,
        offset: new THREE.Vector3(0, 0, 0),
      },
    ) => {
      const geometry = new THREE.BoxGeometry(
        width,
        height,
        depth,
      ).toNonIndexed();
      const position = geometry.getAttribute("position");
      const normal = geometry.getAttribute("normal");
      const uv = new Float32Array(position.count * 2);
      const halfWidth = uvReference.width * 0.5;
      const halfHeight = uvReference.height * 0.5;
      const halfDepth = uvReference.depth * 0.5;
      const edgeInset = 0.001;

      for (let i = 0; i < position.count; i += 1) {
        const px = position.getX(i) + uvReference.offset.x;
        const py = position.getY(i) + uvReference.offset.y;
        const pz = position.getZ(i) + uvReference.offset.z;
        const nx = normal.getX(i);
        const ny = normal.getY(i);

        let u = 0;
        let v = 0;

        if (Math.abs(ny) > 0.5) {
          u = (px + halfWidth) / uvReference.width;
          v = (pz + halfDepth) / uvReference.depth;
        } else if (Math.abs(nx) > 0.5) {
          u = (pz + halfDepth) / uvReference.depth;
          v = (py + halfHeight) / uvReference.height;
        } else {
          u = (px + halfWidth) / uvReference.width;
          v = (py + halfHeight) / uvReference.height;
        }

        uv[i * 2] = THREE.MathUtils.lerp(edgeInset, 1 - edgeInset, u);
        uv[i * 2 + 1] = THREE.MathUtils.lerp(edgeInset, 1 - edgeInset, v);
      }

      geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      return geometry;
    };

    const pedestalTopTexture = pixelTexture("/images/Checkers.png", 4, 4);
    const pedestalSideTexture = pixelTexture("/images/Checkers.png", 4, 4);
    const floorTexture = pixelTexture("/images/Checkers.png", 7, 7);
    const pillarTexture = pixelTexture("/images/Checkers.png", 2, 2);
    const segmentRepeatScale = selectedSegmentTexture.repeatScale;
    const segmentPedestalTexture = scalarTexture(
      selectedSegmentTexture.path,
      4 * segmentRepeatScale,
      4 * segmentRepeatScale,
    );
    const segmentFloorTexture = scalarTexture(
      selectedSegmentTexture.path,
      7 * segmentRepeatScale,
      7 * segmentRepeatScale,
    );
    const segmentPillarTexture = scalarTexture(
      selectedSegmentTexture.path,
      2 * segmentRepeatScale,
      2 * segmentRepeatScale,
    );
    const segmentBevelFieldTexture = generatedSegmentFieldTexture(
      selectedSegmentTexture.path,
    );

    const cameras = new Map<ViewMode, THREE.OrthographicCamera>();
    const renderers = new Map<ViewMode, THREE.WebGLRenderer>();
    const resizeEntries = new Map<
      ViewMode,
      {
        mount: HTMLDivElement;
        renderer: THREE.WebGLRenderer;
        camera: THREE.OrthographicCamera;
      }
    >();

    const normalMaterial = new THREE.MeshNormalMaterial();
    const depthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.BasicDepthPacking,
    });
    const lightMaskMaterial = new THREE.MeshLambertMaterial({
      color: "#ffffff",
    });
    const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const postScene = new THREE.Scene();
    const depthEdgeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDepth: { value: null },
        texelSize: { value: new THREE.Vector2(1, 1) },
        threshold: { value: depthThreshold },
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
        uniform float threshold;

        varying vec2 vUv;

        void main() {
          float d_c = texture2D(tDepth, vUv).r;
          float d_t = texture2D(tDepth, vUv + vec2(0.0, texelSize.y)).r;
          float d_b = texture2D(tDepth, vUv + vec2(0.0, -texelSize.y)).r;
          float d_l = texture2D(tDepth, vUv + vec2(-texelSize.x, 0.0)).r;
          float d_r = texture2D(tDepth, vUv + vec2(texelSize.x, 0.0)).r;

          float delta_t = d_t - d_c;
          float delta_b = d_b - d_c;
          float delta_l = d_l - d_c;
          float delta_r = d_r - d_c;

          float edge_t = step(threshold, abs(delta_t)) * step(0.0, delta_t);
          float edge_b = step(threshold, abs(delta_b)) * step(0.0, delta_b);
          float edge_l = step(threshold, abs(delta_l)) * step(0.0, delta_l);
          float edge_r = step(threshold, abs(delta_r)) * step(0.0, delta_r);

          float depthEdge = max(max(edge_t, edge_b), max(edge_l, edge_r));

          gl_FragColor = vec4(depthEdge, 0.0, 0.0, 1.0);
        }
      `,
    });
    const objectIdEdgeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tObjectIds: { value: null },
        tDepth: { value: null },
        texelSize: { value: new THREE.Vector2(1, 1) },
        ownershipDepthThreshold: {
          value: OBJECT_ID_OWNERSHIP_DEPTH_THRESHOLD,
        },
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
        uniform float ownershipDepthThreshold;

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

          if (abs(depthDelta) > ownershipDepthThreshold) {
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

          float delta_t = d_t - d_c;
          float delta_b = d_b - d_c;
          float delta_l = d_l - d_c;
          float delta_r = d_r - d_c;

          float disc_t = step(0.0001, abs(id_t - id_c));
          float disc_b = step(0.0001, abs(id_b - id_c));
          float disc_l = step(0.0001, abs(id_l - id_c));
          float disc_r = step(0.0001, abs(id_r - id_c));
          float id_bl = sampleId(vUv + vec2(-texelSize.x, -texelSize.y));
          float id_br = sampleId(vUv + vec2(texelSize.x, -texelSize.y));
          float d_bl = sampleDepth(vUv + vec2(-texelSize.x, -texelSize.y));
          float d_br = sampleDepth(vUv + vec2(texelSize.x, -texelSize.y));
          float disc_bl = step(0.0001, abs(id_bl - id_c));
          float disc_br = step(0.0001, abs(id_br - id_c));
          float delta_bl = d_bl - d_c;
          float delta_br = d_br - d_c;

          float edge_t = ownedEdge(id_c, id_t, disc_t, delta_t);
          float edge_b = ownedEdge(id_c, id_b, disc_b, delta_b);
          float edge_l = ownedEdge(id_c, id_l, disc_l, delta_l);
          float edge_r = ownedEdge(id_c, id_r, disc_r, delta_r);

          float objectEdge = max(max(edge_t, edge_b), max(edge_l, edge_r));
          gl_FragColor = vec4(objectEdge, 0.0, 0.0, 1.0);
        }
      `,
    });
    const segmentEdgeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tSegments: { value: null },
        tDepth: { value: null },
        tObjectIds: { value: null },
        tNormals: { value: null },
        texelSize: { value: new THREE.Vector2(1, 1) },
        normalThreshold: { value: NORMAL_EDGE_THRESHOLD },
      },
      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tSegments;
        uniform sampler2D tDepth;
        uniform sampler2D tObjectIds;
        uniform sampler2D tNormals;
        uniform vec2 texelSize;
        uniform float normalThreshold;

        varying vec2 vUv;

        float sampleSegment(vec2 uv) {
          return texture2D(tSegments, uv).r;
        }

        float sampleDepth(vec2 uv) {
          return texture2D(tDepth, uv).r;
        }

        float sampleObjectId(vec2 uv) {
          return texture2D(tObjectIds, uv).r;
        }

        vec3 sampleNormal(vec2 uv) {
          return normalize(texture2D(tNormals, uv).xyz * 2.0 - 1.0);
        }

        float ownedObjectEdge(float centerId, float neighborId, float discontinuity, float depthDelta) {
          if (discontinuity <= 0.0) {
            return 0.0;
          }

          if (abs(depthDelta) > ${OBJECT_ID_OWNERSHIP_DEPTH_THRESHOLD.toFixed(4)}) {
            return depthDelta > 0.0 ? 1.0 : 0.0;
          }

          return centerId > neighborId ? 1.0 : 0.0;
        }

        float normalEdgeIndicator(vec3 normal, vec3 neighborNormal, float depthDifference) {
          vec3 bias = vec3(1.0, 1.0, 1.0);
          float normalDifference = dot(normal - neighborNormal, bias);
          float normalIndicator = clamp(smoothstep(-0.01, 0.01, normalDifference), 0.0, 1.0);
          float depthIndicator = clamp(sign(depthDifference * 0.25 + 0.0025), 0.0, 1.0);
          return (1.0 - dot(normal, neighborNormal)) * depthIndicator * normalIndicator;
        }

        void main() {
          float s_c = sampleSegment(vUv);
          float s_t = sampleSegment(vUv + vec2(0.0, texelSize.y));
          float s_b = sampleSegment(vUv + vec2(0.0, -texelSize.y));
          float s_l = sampleSegment(vUv + vec2(-texelSize.x, 0.0));
          float s_r = sampleSegment(vUv + vec2(texelSize.x, 0.0));

          float d_c = sampleDepth(vUv);
          float d_t = sampleDepth(vUv + vec2(0.0, texelSize.y));
          float d_b = sampleDepth(vUv + vec2(0.0, -texelSize.y));
          float d_l = sampleDepth(vUv + vec2(-texelSize.x, 0.0));
          float d_r = sampleDepth(vUv + vec2(texelSize.x, 0.0));

          float valid_c = 1.0 - step(0.9999, d_c);
          float valid_t = 1.0 - step(0.9999, d_t);
          float valid_b = 1.0 - step(0.9999, d_b);
          float valid_l = 1.0 - step(0.9999, d_l);
          float valid_r = 1.0 - step(0.9999, d_r);

          float id_c = sampleObjectId(vUv);
          float id_t = sampleObjectId(vUv + vec2(0.0, texelSize.y));
          float id_b = sampleObjectId(vUv + vec2(0.0, -texelSize.y));
          float id_l = sampleObjectId(vUv + vec2(-texelSize.x, 0.0));
          float id_r = sampleObjectId(vUv + vec2(texelSize.x, 0.0));
          float id_bl = sampleObjectId(vUv + vec2(-texelSize.x, -texelSize.y));
          float id_br = sampleObjectId(vUv + vec2(texelSize.x, -texelSize.y));
          float id_tl = sampleObjectId(vUv + vec2(-texelSize.x, texelSize.y));
          float id_tr = sampleObjectId(vUv + vec2(texelSize.x, texelSize.y));
          float id_ll = sampleObjectId(vUv + vec2(-texelSize.x * 2.0, 0.0));
          float id_rr = sampleObjectId(vUv + vec2(texelSize.x * 2.0, 0.0));
          float id_bb = sampleObjectId(vUv + vec2(0.0, -texelSize.y * 2.0));

          float sameObject_t = 1.0 - step(0.0001, abs(id_t - id_c));
          float sameObject_b = 1.0 - step(0.0001, abs(id_b - id_c));
          float sameObject_l = 1.0 - step(0.0001, abs(id_l - id_c));
          float sameObject_r = 1.0 - step(0.0001, abs(id_r - id_c));
          float sameObject_bl = 1.0 - step(0.0001, abs(id_bl - id_c));

          float edge_t = valid_c * valid_t * sameObject_t * step(0.0001, abs(s_t - s_c)) * step(s_t, s_c);
          float edge_b = valid_c * valid_b * sameObject_b * step(0.0001, abs(s_b - s_c)) * step(s_b, s_c);
          float edge_l = valid_c * valid_l * sameObject_l * step(0.0001, abs(s_l - s_c)) * step(s_l, s_c);
          float edge_r = valid_c * valid_r * sameObject_r * step(0.0001, abs(s_r - s_c)) * step(s_r, s_c);

          float s_bl = sampleSegment(vUv + vec2(-texelSize.x, -texelSize.y));
          float d_bl = sampleDepth(vUv + vec2(-texelSize.x, -texelSize.y));
          float d_br = sampleDepth(vUv + vec2(texelSize.x, -texelSize.y));
          float d_tl = sampleDepth(vUv + vec2(-texelSize.x, texelSize.y));
          float d_tr = sampleDepth(vUv + vec2(texelSize.x, texelSize.y));
          float d_ll = sampleDepth(vUv + vec2(-texelSize.x * 2.0, 0.0));
          float d_rr = sampleDepth(vUv + vec2(texelSize.x * 2.0, 0.0));
          float d_bb = sampleDepth(vUv + vec2(0.0, -texelSize.y * 2.0));

          float delta_t = d_t - d_c;
          float delta_b = d_b - d_c;
          float delta_l = d_l - d_c;
          float delta_r = d_r - d_c;

          float disc_t = step(0.0001, abs(id_t - id_c));
          float disc_b = step(0.0001, abs(id_b - id_c));
          float disc_l = step(0.0001, abs(id_l - id_c));
          float disc_r = step(0.0001, abs(id_r - id_c));

          float object_t = ownedObjectEdge(id_c, id_t, disc_t, delta_t);
          float object_b = ownedObjectEdge(id_c, id_b, disc_b, delta_b);
          float object_l = ownedObjectEdge(id_c, id_l, disc_l, delta_l);
          float object_r = ownedObjectEdge(id_c, id_r, disc_r, delta_r);
          float objectEdge = max(max(object_t, object_b), max(object_l, object_r));

          float internal_t = (1.0 - disc_t) * step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(delta_t)) * step(0.0, delta_t);
          float internal_b = (1.0 - disc_b) * step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(delta_b)) * step(0.0, delta_b);
          float internal_l = (1.0 - disc_l) * step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(delta_l)) * step(0.0, delta_l);
          float internal_r = (1.0 - disc_r) * step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(delta_r)) * step(0.0, delta_r);
          float internalDepthEdge = max(max(internal_t, internal_b), max(internal_l, internal_r));

          vec3 n_c = sampleNormal(vUv);
          vec3 n_t = sampleNormal(vUv + vec2(0.0, texelSize.y));
          vec3 n_b = sampleNormal(vUv + vec2(0.0, -texelSize.y));
          vec3 n_l = sampleNormal(vUv + vec2(-texelSize.x, 0.0));
          vec3 n_r = sampleNormal(vUv + vec2(texelSize.x, 0.0));

          float depthDifference = 0.0;
          depthDifference += clamp(delta_t, 0.0, 1.0);
          depthDifference += clamp(delta_b, 0.0, 1.0);
          depthDifference += clamp(delta_l, 0.0, 1.0);
          depthDifference += clamp(delta_r, 0.0, 1.0);

          float normalDifference = 0.0;
          normalDifference += normalEdgeIndicator(n_c, n_t, depthDifference) * (1.0 - disc_t) * (1.0 - step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(delta_t)));
          normalDifference += normalEdgeIndicator(n_c, n_b, depthDifference) * (1.0 - disc_b) * (1.0 - step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(delta_b)));
          normalDifference += normalEdgeIndicator(n_c, n_l, depthDifference) * (1.0 - disc_l) * (1.0 - step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(delta_l)));
          normalDifference += normalEdgeIndicator(n_c, n_r, depthDifference) * (1.0 - disc_r) * (1.0 - step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(delta_r)));
          float normalEdge = clamp(
            smoothstep(normalThreshold, normalThreshold * 2.0, normalDifference),
            0.0,
            1.0
          );

          float diff_top = valid_c * valid_t * sameObject_t * step(0.0001, abs(s_c - s_t));
          float diff_left = edge_l;
          float diff_bot = edge_b;
          float diff_left_bot = valid_l * valid_b * (1.0 - step(0.9999, d_bl)) * sameObject_l * sameObject_b * sameObject_bl
            * step(0.0001, abs(s_l - s_bl));
          float kill_left = diff_left * diff_top * diff_left_bot;
          diff_left *= (1.0 - kill_left);

          float segmentEdge = max(max(edge_t, edge_b), max(diff_left, edge_r));

          float redLeftDiscT = step(0.0001, abs(id_tl - id_l));
          float redLeftDiscB = step(0.0001, abs(id_bl - id_l));
          float redLeftDiscL = step(0.0001, abs(id_ll - id_l));
          float redLeftDiscR = step(0.0001, abs(id_c - id_l));
          float redLeftObject = max(max(
            ownedObjectEdge(id_l, id_tl, redLeftDiscT, d_tl - d_l),
            ownedObjectEdge(id_l, id_bl, redLeftDiscB, d_bl - d_l)
          ), max(
            ownedObjectEdge(id_l, id_ll, redLeftDiscL, d_ll - d_l),
            ownedObjectEdge(id_l, id_c, redLeftDiscR, d_c - d_l)
          ));
          float redLeftInternal = max(max(
            (1.0 - redLeftDiscT) * step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(d_tl - d_l)) * step(0.0, d_tl - d_l),
            (1.0 - redLeftDiscB) * step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(d_bl - d_l)) * step(0.0, d_bl - d_l)
          ), max(
            (1.0 - redLeftDiscL) * step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(d_ll - d_l)) * step(0.0, d_ll - d_l),
            (1.0 - redLeftDiscR) * step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(d_c - d_l)) * step(0.0, d_c - d_l)
          ));
          float redLeftNeighbor = max(redLeftObject, redLeftInternal);

          float redRightDiscT = step(0.0001, abs(id_tr - id_r));
          float redRightDiscB = step(0.0001, abs(id_br - id_r));
          float redRightDiscL = step(0.0001, abs(id_c - id_r));
          float redRightDiscR = step(0.0001, abs(id_rr - id_r));
          float redRightObject = max(max(
            ownedObjectEdge(id_r, id_tr, redRightDiscT, d_tr - d_r),
            ownedObjectEdge(id_r, id_br, redRightDiscB, d_br - d_r)
          ), max(
            ownedObjectEdge(id_r, id_c, redRightDiscL, d_c - d_r),
            ownedObjectEdge(id_r, id_rr, redRightDiscR, d_rr - d_r)
          ));
          float redRightInternal = max(max(
            (1.0 - redRightDiscT) * step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(d_tr - d_r)) * step(0.0, d_tr - d_r),
            (1.0 - redRightDiscB) * step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(d_br - d_r)) * step(0.0, d_br - d_r)
          ), max(
            (1.0 - redRightDiscL) * step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(d_c - d_r)) * step(0.0, d_c - d_r),
            (1.0 - redRightDiscR) * step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(d_rr - d_r)) * step(0.0, d_rr - d_r)
          ));
          float redRightNeighbor = max(redRightObject, redRightInternal);

          float redBottomDiscT = step(0.0001, abs(id_c - id_b));
          float redBottomDiscB = step(0.0001, abs(id_bb - id_b));
          float redBottomDiscL = step(0.0001, abs(id_bl - id_b));
          float redBottomDiscR = step(0.0001, abs(id_br - id_b));
          float redBottomObject = max(max(
            ownedObjectEdge(id_b, id_c, redBottomDiscT, d_c - d_b),
            ownedObjectEdge(id_b, id_bb, redBottomDiscB, d_bb - d_b)
          ), max(
            ownedObjectEdge(id_b, id_bl, redBottomDiscL, d_bl - d_b),
            ownedObjectEdge(id_b, id_br, redBottomDiscR, d_br - d_b)
          ));
          float redBottomInternal = max(max(
            (1.0 - redBottomDiscT) * step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(d_c - d_b)) * step(0.0, d_c - d_b),
            (1.0 - redBottomDiscB) * step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(d_bb - d_b)) * step(0.0, d_bb - d_b)
          ), max(
            (1.0 - redBottomDiscL) * step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(d_bl - d_b)) * step(0.0, d_bl - d_b),
            (1.0 - redBottomDiscR) * step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(d_br - d_b)) * step(0.0, d_br - d_b)
          ));
          float redBottomNeighbor = max(redBottomObject, redBottomInternal);
          float killFromRedNeighbors = max(
            redLeftNeighbor * redBottomNeighbor,
            redRightNeighbor * redBottomNeighbor
          );
          segmentEdge *= (1.0 - step(0.0001, killFromRedNeighbors));

          float green = normalEdge;
          float blue = (1.0 - step(0.0001, green)) * segmentEdge;
          gl_FragColor = vec4(0.0, 0.0, blue, 1.0);
        }
      `,
    });
    const segmentAxesMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tSegments: { value: null },
        tDepth: { value: null },
        tObjectIds: { value: null },
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
        uniform sampler2D tSegments;
        uniform sampler2D tDepth;
        uniform sampler2D tObjectIds;
        uniform vec2 texelSize;

        varying vec2 vUv;

        float sampleSegment(vec2 uv) {
          return texture2D(tSegments, uv).r;
        }

        float sampleDepth(vec2 uv) {
          return texture2D(tDepth, uv).r;
        }

        float sampleObjectId(vec2 uv) {
          return texture2D(tObjectIds, uv).r;
        }

        void main() {
          float s_c = sampleSegment(vUv);
          float s_t = sampleSegment(vUv + vec2(0.0, texelSize.y));
          float s_b = sampleSegment(vUv + vec2(0.0, -texelSize.y));
          float s_l = sampleSegment(vUv + vec2(-texelSize.x, 0.0));
          float s_r = sampleSegment(vUv + vec2(texelSize.x, 0.0));

          float d_c = sampleDepth(vUv);
          float d_t = sampleDepth(vUv + vec2(0.0, texelSize.y));
          float d_b = sampleDepth(vUv + vec2(0.0, -texelSize.y));
          float d_l = sampleDepth(vUv + vec2(-texelSize.x, 0.0));
          float d_r = sampleDepth(vUv + vec2(texelSize.x, 0.0));

          float valid_c = 1.0 - step(0.9999, d_c);
          float valid_t = 1.0 - step(0.9999, d_t);
          float valid_b = 1.0 - step(0.9999, d_b);
          float valid_l = 1.0 - step(0.9999, d_l);
          float valid_r = 1.0 - step(0.9999, d_r);

          float id_c = sampleObjectId(vUv);
          float id_t = sampleObjectId(vUv + vec2(0.0, texelSize.y));
          float id_b = sampleObjectId(vUv + vec2(0.0, -texelSize.y));
          float id_l = sampleObjectId(vUv + vec2(-texelSize.x, 0.0));
          float id_r = sampleObjectId(vUv + vec2(texelSize.x, 0.0));

          float sameObject_t = 1.0 - step(0.0001, abs(id_t - id_c));
          float sameObject_b = 1.0 - step(0.0001, abs(id_b - id_c));
          float sameObject_l = 1.0 - step(0.0001, abs(id_l - id_c));
          float sameObject_r = 1.0 - step(0.0001, abs(id_r - id_c));

          float edge_t = valid_c * valid_t * sameObject_t * step(0.0001, abs(s_t - s_c)) * step(s_t, s_c);
          float edge_b = valid_c * valid_b * sameObject_b * step(0.0001, abs(s_b - s_c)) * step(s_b, s_c);
          float edge_l = valid_c * valid_l * sameObject_l * step(0.0001, abs(s_l - s_c)) * step(s_l, s_c);
          float edge_r = valid_c * valid_r * sameObject_r * step(0.0001, abs(s_r - s_c)) * step(s_r, s_c);

          gl_FragColor = vec4(edge_l, edge_r, edge_t, edge_b);
        }
      `,
    });
    const normalEdgeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDepth: { value: null },
        tNormals: { value: null },
        texelSize: { value: new THREE.Vector2(1, 1) },
        depthThreshold: { value: depthThreshold },
        threshold: { value: NORMAL_EDGE_THRESHOLD },
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
        uniform sampler2D tNormals;
        uniform vec2 texelSize;
        uniform float depthThreshold;
        uniform float threshold;

        varying vec2 vUv;

        float sampleDepth(vec2 uv) {
          return texture2D(tDepth, uv).r;
        }

        vec3 sampleNormal(vec2 uv) {
          return normalize(texture2D(tNormals, uv).xyz * 2.0 - 1.0);
        }

        float normalEdgeIndicator(vec3 normal, vec3 neighborNormal, float depthDifference) {
          vec3 bias = vec3(1.0, 1.0, 1.0);
          float normalDifference = dot(normal - neighborNormal, bias);
          float normalIndicator = clamp(smoothstep(-0.01, 0.01, normalDifference), 0.0, 1.0);
          float depthIndicator = clamp(sign(depthDifference * 0.25 + 0.0025), 0.0, 1.0);
          return (1.0 - dot(normal, neighborNormal)) * depthIndicator * normalIndicator;
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

          float edge_t = step(depthThreshold, abs(delta_t)) * step(0.0, delta_t);
          float edge_b = step(depthThreshold, abs(delta_b)) * step(0.0, delta_b);
          float edge_l = step(depthThreshold, abs(delta_l)) * step(0.0, delta_l);
          float edge_r = step(depthThreshold, abs(delta_r)) * step(0.0, delta_r);

          float depthEdge = max(max(edge_t, edge_b), max(edge_l, edge_r));

          vec3 n_c = sampleNormal(vUv);
          vec3 n_t = sampleNormal(vUv + vec2(0.0, texelSize.y));
          vec3 n_b = sampleNormal(vUv + vec2(0.0, -texelSize.y));
          vec3 n_l = sampleNormal(vUv + vec2(-texelSize.x, 0.0));
          vec3 n_r = sampleNormal(vUv + vec2(texelSize.x, 0.0));

          float depthDifference = 0.0;
          depthDifference += clamp(delta_t, 0.0, 1.0);
          depthDifference += clamp(delta_b, 0.0, 1.0);
          depthDifference += clamp(delta_l, 0.0, 1.0);
          depthDifference += clamp(delta_r, 0.0, 1.0);

          float normalDifference = 0.0;
          normalDifference += normalEdgeIndicator(n_c, n_t, depthDifference) * (1.0 - step(depthThreshold, abs(delta_t)));
          normalDifference += normalEdgeIndicator(n_c, n_b, depthDifference) * (1.0 - step(depthThreshold, abs(delta_b)));
          normalDifference += normalEdgeIndicator(n_c, n_l, depthDifference) * (1.0 - step(depthThreshold, abs(delta_l)));
          normalDifference += normalEdgeIndicator(n_c, n_r, depthDifference) * (1.0 - step(depthThreshold, abs(delta_r)));

          float normalEdge = clamp(
            smoothstep(threshold, threshold * 2.0, normalDifference),
            0.0,
            1.0
          );

          float red = depthEdge;
          float green = (1.0 - step(0.0001, red)) * normalEdge;

          gl_FragColor = vec4(red, green, 0.0, 1.0);
        }
      `,
    });
    const blendMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: null },
        tDepth: { value: null },
        tNormals: { value: null },
        tLight: { value: null },
        texelSize: { value: new THREE.Vector2(1, 1) },
        depthThreshold: { value: depthThreshold },
        normalThreshold: { value: NORMAL_EDGE_THRESHOLD },
        depthOutlineStrength: { value: depthOutlineStrength },
        normalOutlineStrength: { value: normalOutlineStrength },
      },
      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tColor;
        uniform sampler2D tDepth;
        uniform sampler2D tNormals;
        uniform sampler2D tLight;
        uniform vec2 texelSize;
        uniform float depthThreshold;
        uniform float normalThreshold;
        uniform float depthOutlineStrength;
        uniform float normalOutlineStrength;

        varying vec2 vUv;

        float sampleDepth(vec2 uv) {
          return texture2D(tDepth, uv).r;
        }

        vec3 sampleNormal(vec2 uv) {
          return normalize(texture2D(tNormals, uv).xyz * 2.0 - 1.0);
        }

        float normalEdgeIndicator(vec3 normal, vec3 neighborNormal, float depthDifference) {
          vec3 bias = vec3(1.0, 1.0, 1.0);
          float normalDifference = dot(normal - neighborNormal, bias);
          float normalIndicator = clamp(smoothstep(-0.01, 0.01, normalDifference), 0.0, 1.0);
          float depthIndicator = clamp(sign(depthDifference * 0.25 + 0.0025), 0.0, 1.0);
          return (1.0 - dot(normal, neighborNormal)) * depthIndicator * normalIndicator;
        }

        vec3 linearToSRGB(vec3 color) {
          vec3 cutoff = step(color, vec3(0.0031308));
          vec3 lower = color * 12.92;
          vec3 upper = 1.055 * pow(max(color, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
          return mix(upper, lower, cutoff);
        }

        void main() {
          vec3 color = texture2D(tColor, vUv).rgb;

          float d_c = sampleDepth(vUv);
          float d_t = sampleDepth(vUv + vec2(0.0, texelSize.y));
          float d_b = sampleDepth(vUv + vec2(0.0, -texelSize.y));
          float d_l = sampleDepth(vUv + vec2(-texelSize.x, 0.0));
          float d_r = sampleDepth(vUv + vec2(texelSize.x, 0.0));

          float delta_t = d_t - d_c;
          float delta_b = d_b - d_c;
          float delta_l = d_l - d_c;
          float delta_r = d_r - d_c;

          float edge_t = step(depthThreshold, abs(delta_t)) * step(0.0, delta_t);
          float edge_b = step(depthThreshold, abs(delta_b)) * step(0.0, delta_b);
          float edge_l = step(depthThreshold, abs(delta_l)) * step(0.0, delta_l);
          float edge_r = step(depthThreshold, abs(delta_r)) * step(0.0, delta_r);

          float depthEdge = max(max(edge_t, edge_b), max(edge_l, edge_r));

          vec3 n_c = sampleNormal(vUv);
          vec3 n_t = sampleNormal(vUv + vec2(0.0, texelSize.y));
          vec3 n_b = sampleNormal(vUv + vec2(0.0, -texelSize.y));
          vec3 n_l = sampleNormal(vUv + vec2(-texelSize.x, 0.0));
          vec3 n_r = sampleNormal(vUv + vec2(texelSize.x, 0.0));

          float depthDifference = 0.0;
          depthDifference += clamp(delta_t, 0.0, 1.0);
          depthDifference += clamp(delta_b, 0.0, 1.0);
          depthDifference += clamp(delta_l, 0.0, 1.0);
          depthDifference += clamp(delta_r, 0.0, 1.0);

          float normalDifference = 0.0;
          normalDifference += normalEdgeIndicator(n_c, n_t, depthDifference) * (1.0 - step(depthThreshold, abs(delta_t)));
          normalDifference += normalEdgeIndicator(n_c, n_b, depthDifference) * (1.0 - step(depthThreshold, abs(delta_b)));
          normalDifference += normalEdgeIndicator(n_c, n_l, depthDifference) * (1.0 - step(depthThreshold, abs(delta_l)));
          normalDifference += normalEdgeIndicator(n_c, n_r, depthDifference) * (1.0 - step(depthThreshold, abs(delta_r)));

          float normalEdge = clamp(
            smoothstep(normalThreshold, normalThreshold * 2.0, normalDifference),
            0.0,
            1.0
          );

          float red = depthEdge;
          float green = (1.0 - step(0.0001, red)) * normalEdge;

          float depthMask = red * depthOutlineStrength;
          float normalMask = green * normalOutlineStrength;
          float edgeMask = max(depthMask, normalMask);

          float shadedIntensity = texture2D(tLight, vUv).r;
          float depthBright = smoothstep(
            ${(OUTLINE_LIGHT_THRESHOLD - OUTLINE_LIGHT_SOFTNESS).toFixed(2)},
            ${(OUTLINE_LIGHT_THRESHOLD + OUTLINE_LIGHT_SOFTNESS).toFixed(2)},
            shadedIntensity
          );
          float normalBright = smoothstep(
            ${(OUTLINE_LIGHT_THRESHOLD - OUTLINE_LIGHT_SOFTNESS).toFixed(2)},
            ${(OUTLINE_LIGHT_THRESHOLD + OUTLINE_LIGHT_SOFTNESS).toFixed(2)},
            shadedIntensity
          );

          float depthBias = mix(0.25, 2.0, depthBright);
          float normalBias = mix(0.25, 2.0, normalBright);

          vec3 litBase = color * (1.0 - edgeMask);
          vec3 depthOutline = color * depthMask * depthBias;
          vec3 normalOutline = color * normalMask * normalBias;
          vec3 result = litBase + depthOutline + normalOutline;

          gl_FragColor = vec4(linearToSRGB(clamp(result, 0.0, 1.0)), 1.0);
        }
      `,
    });
    const augmentedBlendMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: null },
        tDepth: { value: null },
        tNormals: { value: null },
        tObjectIds: { value: null },
        tLight: { value: null },
        texelSize: { value: new THREE.Vector2(1, 1) },
        normalThreshold: { value: NORMAL_EDGE_THRESHOLD },
        objectIdOutlineStrength: { value: objectIdOutlineStrength },
        internalDepthOutlineStrength: { value: internalDepthOutlineStrength },
        normalOutlineStrength: { value: normalOutlineStrength },
      },
      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tColor;
        uniform sampler2D tDepth;
        uniform sampler2D tNormals;
        uniform sampler2D tObjectIds;
        uniform sampler2D tLight;
        uniform vec2 texelSize;
        uniform float normalThreshold;
        uniform float objectIdOutlineStrength;
        uniform float internalDepthOutlineStrength;
        uniform float normalOutlineStrength;

        varying vec2 vUv;

        float sampleDepth(vec2 uv) {
          return texture2D(tDepth, uv).r;
        }

        float sampleId(vec2 uv) {
          return texture2D(tObjectIds, uv).r;
        }

        vec3 sampleNormal(vec2 uv) {
          return normalize(texture2D(tNormals, uv).xyz * 2.0 - 1.0);
        }

        float ownedObjectEdge(float centerId, float neighborId, float discontinuity, float depthDelta) {
          if (discontinuity <= 0.0) {
            return 0.0;
          }

          if (abs(depthDelta) > ${OBJECT_ID_OWNERSHIP_DEPTH_THRESHOLD.toFixed(4)}) {
            return depthDelta > 0.0 ? 1.0 : 0.0;
          }

          return centerId > neighborId ? 1.0 : 0.0;
        }

        float normalEdgeIndicator(vec3 normal, vec3 neighborNormal, float depthDifference) {
          vec3 bias = vec3(1.0, 1.0, 1.0);
          float normalDifference = dot(normal - neighborNormal, bias);
          float normalIndicator = clamp(smoothstep(-0.01, 0.01, normalDifference), 0.0, 1.0);
          float depthIndicator = clamp(sign(depthDifference * 0.25 + 0.0025), 0.0, 1.0);
          return (1.0 - dot(normal, neighborNormal)) * depthIndicator * normalIndicator;
        }

        vec3 linearToSRGB(vec3 color) {
          vec3 cutoff = step(color, vec3(0.0031308));
          vec3 lower = color * 12.92;
          vec3 upper = 1.055 * pow(max(color, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
          return mix(upper, lower, cutoff);
        }

        void main() {
          vec3 color = texture2D(tColor, vUv).rgb;

          float d_c = sampleDepth(vUv);
          float d_t = sampleDepth(vUv + vec2(0.0, texelSize.y));
          float d_b = sampleDepth(vUv + vec2(0.0, -texelSize.y));
          float d_l = sampleDepth(vUv + vec2(-texelSize.x, 0.0));
          float d_r = sampleDepth(vUv + vec2(texelSize.x, 0.0));

          float delta_t = d_t - d_c;
          float delta_b = d_b - d_c;
          float delta_l = d_l - d_c;
          float delta_r = d_r - d_c;

          float id_c = sampleId(vUv);
          float id_t = sampleId(vUv + vec2(0.0, texelSize.y));
          float id_b = sampleId(vUv + vec2(0.0, -texelSize.y));
          float id_l = sampleId(vUv + vec2(-texelSize.x, 0.0));
          float id_r = sampleId(vUv + vec2(texelSize.x, 0.0));
          float id_bl = sampleId(vUv + vec2(-texelSize.x, -texelSize.y));
          float id_br = sampleId(vUv + vec2(texelSize.x, -texelSize.y));

          float disc_t = step(0.0001, abs(id_t - id_c));
          float disc_b = step(0.0001, abs(id_b - id_c));
          float disc_l = step(0.0001, abs(id_l - id_c));
          float disc_r = step(0.0001, abs(id_r - id_c));

          float object_t = ownedObjectEdge(id_c, id_t, disc_t, delta_t);
          float object_b = ownedObjectEdge(id_c, id_b, disc_b, delta_b);
          float object_l = ownedObjectEdge(id_c, id_l, disc_l, delta_l);
          float object_r = ownedObjectEdge(id_c, id_r, disc_r, delta_r);
          float objectEdge = max(max(object_t, object_b), max(object_l, object_r));

          float internal_t = (1.0 - disc_t) * step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(delta_t)) * step(0.0, delta_t);
          float internal_b = (1.0 - disc_b) * step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(delta_b)) * step(0.0, delta_b);
          float internal_l = (1.0 - disc_l) * step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(delta_l)) * step(0.0, delta_l);
          float internal_r = (1.0 - disc_r) * step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(delta_r)) * step(0.0, delta_r);
          float internalDepthEdge = max(max(internal_t, internal_b), max(internal_l, internal_r));

          vec3 n_c = sampleNormal(vUv);
          vec3 n_t = sampleNormal(vUv + vec2(0.0, texelSize.y));
          vec3 n_b = sampleNormal(vUv + vec2(0.0, -texelSize.y));
          vec3 n_l = sampleNormal(vUv + vec2(-texelSize.x, 0.0));
          vec3 n_r = sampleNormal(vUv + vec2(texelSize.x, 0.0));

          float depthDifference = 0.0;
          depthDifference += clamp(delta_t, 0.0, 1.0);
          depthDifference += clamp(delta_b, 0.0, 1.0);
          depthDifference += clamp(delta_l, 0.0, 1.0);
          depthDifference += clamp(delta_r, 0.0, 1.0);

          float normalDifference = 0.0;
          normalDifference += normalEdgeIndicator(n_c, n_t, depthDifference) * (1.0 - disc_t) * (1.0 - step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(delta_t)));
          normalDifference += normalEdgeIndicator(n_c, n_b, depthDifference) * (1.0 - disc_b) * (1.0 - step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(delta_b)));
          normalDifference += normalEdgeIndicator(n_c, n_l, depthDifference) * (1.0 - disc_l) * (1.0 - step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(delta_l)));
          normalDifference += normalEdgeIndicator(n_c, n_r, depthDifference) * (1.0 - disc_r) * (1.0 - step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(delta_r)));

          float normalEdge = clamp(
            smoothstep(normalThreshold, normalThreshold * 2.0, normalDifference),
            0.0,
            1.0
          );

          float redMask = max(
            objectEdge * objectIdOutlineStrength,
            internalDepthEdge * internalDepthOutlineStrength
          );
          float normalMask = (1.0 - step(0.0001, redMask)) * normalEdge * normalOutlineStrength;
          float edgeMask = max(redMask, normalMask);

          float shadedIntensity = texture2D(tLight, vUv).r;
          float outlineBright = smoothstep(
            ${(OUTLINE_LIGHT_THRESHOLD - OUTLINE_LIGHT_SOFTNESS).toFixed(2)},
            ${(OUTLINE_LIGHT_THRESHOLD + OUTLINE_LIGHT_SOFTNESS).toFixed(2)},
            shadedIntensity
          );
          float depthBias = mix(0.25, 2.0, outlineBright);
          float normalBias = mix(0.25, 2.0, outlineBright);

          vec3 litBase = color * (1.0 - edgeMask);
          vec3 redOutline = color * redMask * depthBias;
          vec3 normalOutline = color * normalMask * normalBias;
          vec3 result = litBase + redOutline + normalOutline;

          gl_FragColor = vec4(linearToSRGB(clamp(result, 0.0, 1.0)), 1.0);
        }
      `,
    });
    const combinedMaskMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDepth: { value: null },
        tNormals: { value: null },
        tObjectIds: { value: null },
        tSegments: { value: null },
        texelSize: { value: new THREE.Vector2(1, 1) },
        normalThreshold: { value: NORMAL_EDGE_THRESHOLD },
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
        uniform sampler2D tNormals;
        uniform sampler2D tObjectIds;
        uniform sampler2D tSegments;
        uniform vec2 texelSize;
        uniform float normalThreshold;

        varying vec2 vUv;

        float sampleDepth(vec2 uv) {
          return texture2D(tDepth, uv).r;
        }

        float sampleId(vec2 uv) {
          return texture2D(tObjectIds, uv).r;
        }

        float sampleSegment(vec2 uv) {
          return texture2D(tSegments, uv).r;
        }

        vec3 sampleNormal(vec2 uv) {
          return normalize(texture2D(tNormals, uv).xyz * 2.0 - 1.0);
        }

        float ownedObjectEdge(float centerId, float neighborId, float discontinuity, float depthDelta) {
          if (discontinuity <= 0.0) {
            return 0.0;
          }

          if (abs(depthDelta) > ${OBJECT_ID_OWNERSHIP_DEPTH_THRESHOLD.toFixed(4)}) {
            return depthDelta > 0.0 ? 1.0 : 0.0;
          }

          return centerId > neighborId ? 1.0 : 0.0;
        }

        float normalEdgeIndicator(vec3 normal, vec3 neighborNormal, float depthDifference) {
          vec3 bias = vec3(1.0, 1.0, 1.0);
          float normalDifference = dot(normal - neighborNormal, bias);
          float normalIndicator = clamp(smoothstep(-0.01, 0.01, normalDifference), 0.0, 1.0);
          float depthIndicator = clamp(sign(depthDifference * 0.25 + 0.0025), 0.0, 1.0);
          return (1.0 - dot(normal, neighborNormal)) * depthIndicator * normalIndicator;
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

          float id_c = sampleId(vUv);
          float id_t = sampleId(vUv + vec2(0.0, texelSize.y));
          float id_b = sampleId(vUv + vec2(0.0, -texelSize.y));
          float id_l = sampleId(vUv + vec2(-texelSize.x, 0.0));
          float id_r = sampleId(vUv + vec2(texelSize.x, 0.0));
          float id_bl = sampleId(vUv + vec2(-texelSize.x, -texelSize.y));
          float id_br = sampleId(vUv + vec2(texelSize.x, -texelSize.y));
          float id_tl = sampleId(vUv + vec2(-texelSize.x, texelSize.y));
          float id_tr = sampleId(vUv + vec2(texelSize.x, texelSize.y));
          float id_ll = sampleId(vUv + vec2(-texelSize.x * 2.0, 0.0));
          float id_rr = sampleId(vUv + vec2(texelSize.x * 2.0, 0.0));
          float id_bb = sampleId(vUv + vec2(0.0, -texelSize.y * 2.0));

          float d_bl = sampleDepth(vUv + vec2(-texelSize.x, -texelSize.y));
          float d_br = sampleDepth(vUv + vec2(texelSize.x, -texelSize.y));
          float d_tl = sampleDepth(vUv + vec2(-texelSize.x, texelSize.y));
          float d_tr = sampleDepth(vUv + vec2(texelSize.x, texelSize.y));
          float d_ll = sampleDepth(vUv + vec2(-texelSize.x * 2.0, 0.0));
          float d_rr = sampleDepth(vUv + vec2(texelSize.x * 2.0, 0.0));
          float d_bb = sampleDepth(vUv + vec2(0.0, -texelSize.y * 2.0));
          float delta_bl = d_bl - d_c;
          float delta_br = d_br - d_c;

          float disc_t = step(0.0001, abs(id_t - id_c));
          float disc_b = step(0.0001, abs(id_b - id_c));
          float disc_l = step(0.0001, abs(id_l - id_c));
          float disc_r = step(0.0001, abs(id_r - id_c));
          float disc_bl = step(0.0001, abs(id_bl - id_c));
          float disc_br = step(0.0001, abs(id_br - id_c));

          float object_t = ownedObjectEdge(id_c, id_t, disc_t, delta_t);
          float object_b = ownedObjectEdge(id_c, id_b, disc_b, delta_b);
          float object_l = ownedObjectEdge(id_c, id_l, disc_l, delta_l);
          float object_r = ownedObjectEdge(id_c, id_r, disc_r, delta_r);
          float objectEdge = max(max(object_t, object_b), max(object_l, object_r));
          float object_bl = ownedObjectEdge(id_c, id_bl, disc_bl, delta_bl);
          float object_br = ownedObjectEdge(id_c, id_br, disc_br, delta_br);

          float internal_t = (1.0 - disc_t) * step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(delta_t)) * step(0.0, delta_t);
          float internal_b = (1.0 - disc_b) * step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(delta_b)) * step(0.0, delta_b);
          float internal_l = (1.0 - disc_l) * step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(delta_l)) * step(0.0, delta_l);
          float internal_r = (1.0 - disc_r) * step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(delta_r)) * step(0.0, delta_r);
          float internalDepthEdge = max(max(internal_t, internal_b), max(internal_l, internal_r));

          vec3 n_c = sampleNormal(vUv);
          vec3 n_t = sampleNormal(vUv + vec2(0.0, texelSize.y));
          vec3 n_b = sampleNormal(vUv + vec2(0.0, -texelSize.y));
          vec3 n_l = sampleNormal(vUv + vec2(-texelSize.x, 0.0));
          vec3 n_r = sampleNormal(vUv + vec2(texelSize.x, 0.0));

          float depthDifference = 0.0;
          depthDifference += clamp(delta_t, 0.0, 1.0);
          depthDifference += clamp(delta_b, 0.0, 1.0);
          depthDifference += clamp(delta_l, 0.0, 1.0);
          depthDifference += clamp(delta_r, 0.0, 1.0);

          float normalDifference = 0.0;
          normalDifference += normalEdgeIndicator(n_c, n_t, depthDifference) * (1.0 - disc_t) * (1.0 - step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(delta_t)));
          normalDifference += normalEdgeIndicator(n_c, n_b, depthDifference) * (1.0 - disc_b) * (1.0 - step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(delta_b)));
          normalDifference += normalEdgeIndicator(n_c, n_l, depthDifference) * (1.0 - disc_l) * (1.0 - step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(delta_l)));
          normalDifference += normalEdgeIndicator(n_c, n_r, depthDifference) * (1.0 - disc_r) * (1.0 - step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(delta_r)));
          float normalEdge = clamp(
            smoothstep(normalThreshold, normalThreshold * 2.0, normalDifference),
            0.0,
            1.0
          );

          float s_c = sampleSegment(vUv);
          float s_t = sampleSegment(vUv + vec2(0.0, texelSize.y));
          float s_b = sampleSegment(vUv + vec2(0.0, -texelSize.y));
          float s_l = sampleSegment(vUv + vec2(-texelSize.x, 0.0));
          float s_r = sampleSegment(vUv + vec2(texelSize.x, 0.0));
          float s_bl = sampleSegment(vUv + vec2(-texelSize.x, -texelSize.y));

          float valid_c = 1.0 - step(0.9999, d_c);
          float valid_t = 1.0 - step(0.9999, d_t);
          float valid_b = 1.0 - step(0.9999, d_b);
          float valid_l = 1.0 - step(0.9999, d_l);
          float valid_r = 1.0 - step(0.9999, d_r);
          float valid_bl = 1.0 - step(0.9999, d_bl);

          float sameObject_t = 1.0 - step(0.0001, abs(id_t - id_c));
          float sameObject_b = 1.0 - step(0.0001, abs(id_b - id_c));
          float sameObject_l = 1.0 - step(0.0001, abs(id_l - id_c));
          float sameObject_r = 1.0 - step(0.0001, abs(id_r - id_c));
          float sameObject_bl = 1.0 - step(0.0001, abs(id_bl - id_c));

          float edge_t = valid_c * valid_t * sameObject_t * step(0.0001, abs(s_t - s_c)) * step(s_t, s_c);
          float edge_b = valid_c * valid_b * sameObject_b * step(0.0001, abs(s_b - s_c)) * step(s_b, s_c);
          float edge_l = valid_c * valid_l * sameObject_l * step(0.0001, abs(s_l - s_c)) * step(s_l, s_c);
          float edge_r = valid_c * valid_r * sameObject_r * step(0.0001, abs(s_r - s_c)) * step(s_r, s_c);

          float diff_top = valid_c * valid_t * sameObject_t * step(0.0001, abs(s_c - s_t));
          float diff_left = edge_l;
          float diff_bot = edge_b;
          float diff_left_bot = valid_l * valid_b * valid_bl * sameObject_l * sameObject_b * sameObject_bl
            * step(0.0001, abs(s_l - s_bl));
          float kill_left = diff_left * diff_top * diff_left_bot;
          diff_left *= (1.0 - kill_left);

          float segmentEdge = max(max(edge_t, edge_b), max(diff_left, edge_r));

          float redLeftDiscT = step(0.0001, abs(id_tl - id_l));
          float redLeftDiscB = step(0.0001, abs(id_bl - id_l));
          float redLeftDiscL = step(0.0001, abs(id_ll - id_l));
          float redLeftDiscR = step(0.0001, abs(id_c - id_l));
          float redLeftObject = max(
            max(
              ownedObjectEdge(id_l, id_tl, redLeftDiscT, d_tl - d_l),
              ownedObjectEdge(id_l, id_bl, redLeftDiscB, d_bl - d_l)
            ),
            max(
              ownedObjectEdge(id_l, id_ll, redLeftDiscL, d_ll - d_l),
              ownedObjectEdge(id_l, id_c, redLeftDiscR, d_c - d_l)
            )
          );
          float redLeftInternal = max(
            max(
              (1.0 - redLeftDiscT) * step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(d_tl - d_l)) * step(0.0, d_tl - d_l),
              (1.0 - redLeftDiscB) * step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(d_bl - d_l)) * step(0.0, d_bl - d_l)
            ),
            max(
              (1.0 - redLeftDiscL) * step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(d_ll - d_l)) * step(0.0, d_ll - d_l),
              (1.0 - redLeftDiscR) * step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(d_c - d_l)) * step(0.0, d_c - d_l)
            )
          );
          float redLeftNeighbor = max(redLeftObject, redLeftInternal);

          float redRightDiscT = step(0.0001, abs(id_tr - id_r));
          float redRightDiscB = step(0.0001, abs(id_br - id_r));
          float redRightDiscL = step(0.0001, abs(id_c - id_r));
          float redRightDiscR = step(0.0001, abs(id_rr - id_r));
          float redRightObject = max(
            max(
              ownedObjectEdge(id_r, id_tr, redRightDiscT, d_tr - d_r),
              ownedObjectEdge(id_r, id_br, redRightDiscB, d_br - d_r)
            ),
            max(
              ownedObjectEdge(id_r, id_c, redRightDiscL, d_c - d_r),
              ownedObjectEdge(id_r, id_rr, redRightDiscR, d_rr - d_r)
            )
          );
          float redRightInternal = max(
            max(
              (1.0 - redRightDiscT) * step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(d_tr - d_r)) * step(0.0, d_tr - d_r),
              (1.0 - redRightDiscB) * step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(d_br - d_r)) * step(0.0, d_br - d_r)
            ),
            max(
              (1.0 - redRightDiscL) * step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(d_c - d_r)) * step(0.0, d_c - d_r),
              (1.0 - redRightDiscR) * step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(d_rr - d_r)) * step(0.0, d_rr - d_r)
            )
          );
          float redRightNeighbor = max(redRightObject, redRightInternal);

          float redBottomDiscT = step(0.0001, abs(id_c - id_b));
          float redBottomDiscB = step(0.0001, abs(id_bb - id_b));
          float redBottomDiscL = step(0.0001, abs(id_bl - id_b));
          float redBottomDiscR = step(0.0001, abs(id_br - id_b));
          float redBottomObject = max(
            max(
              ownedObjectEdge(id_b, id_c, redBottomDiscT, d_c - d_b),
              ownedObjectEdge(id_b, id_bb, redBottomDiscB, d_bb - d_b)
            ),
            max(
              ownedObjectEdge(id_b, id_bl, redBottomDiscL, d_bl - d_b),
              ownedObjectEdge(id_b, id_br, redBottomDiscR, d_br - d_b)
            )
          );
          float redBottomInternal = max(
            max(
              (1.0 - redBottomDiscT) * step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(d_c - d_b)) * step(0.0, d_c - d_b),
              (1.0 - redBottomDiscB) * step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(d_bb - d_b)) * step(0.0, d_bb - d_b)
            ),
            max(
              (1.0 - redBottomDiscL) * step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(d_bl - d_b)) * step(0.0, d_bl - d_b),
              (1.0 - redBottomDiscR) * step(${INTERNAL_DEPTH_BLEND_THRESHOLD.toFixed(3)}, abs(d_br - d_b)) * step(0.0, d_br - d_b)
            )
          );
          float redBottomNeighbor = max(redBottomObject, redBottomInternal);
          float killFromRedNeighbors = max(
            redLeftNeighbor * redBottomNeighbor,
            redRightNeighbor * redBottomNeighbor
          );
          segmentEdge *= (1.0 - step(0.0001, killFromRedNeighbors));

          float red = objectEdge;
          float yellow = (1.0 - step(0.0001, red)) * internalDepthEdge;
          float green = (1.0 - step(0.0001, max(red, yellow))) * normalEdge;
          float blue = (1.0 - step(0.0001, max(red, yellow))) * (1.0 - step(0.0001, green)) * segmentEdge;

          gl_FragColor = vec4(max(red, yellow), max(yellow, green), blue, 1.0);
        }
      `,
    });
    const segmentIndentedMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: null },
        tSegmentMask: { value: null },
        tNormals: { value: null },
        texelSize: { value: new THREE.Vector2(1, 1) },
        lightDirection: { value: new THREE.Vector3(0.6, 0.6, 0.4) },
      },
      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tColor;
        uniform sampler2D tSegmentMask;
        uniform sampler2D tNormals;
        uniform vec2 texelSize;
        uniform vec3 lightDirection;

        varying vec2 vUv;

        vec3 sampleNormal(vec2 uv) {
          return normalize(texture2D(tNormals, uv).xyz * 2.0 - 1.0);
        }

        float sampleBlue(vec2 uv) {
          return texture2D(tSegmentMask, uv).b;
        }

        float idDifferent(float a, float b) {
          return step(0.0001, abs(a - b));
        }

        float segmentDifferent(float a, float b) {
          return step(0.0001, abs(a - b));
        }

        vec4 sampleSegmentAxes(vec2 uv) {
          vec2 uvLeft = clamp(uv + vec2(-texelSize.x, 0.0), vec2(0.0), vec2(1.0));
          vec2 uvRight = clamp(uv + vec2(texelSize.x, 0.0), vec2(0.0), vec2(1.0));
          vec2 uvUp = clamp(uv + vec2(0.0, texelSize.y), vec2(0.0), vec2(1.0));
          vec2 uvDown = clamp(uv + vec2(0.0, -texelSize.y), vec2(0.0), vec2(1.0));

          float idC = sampleId(uv);
          float segC = sampleSegment(uv);
          float idL = sampleId(uvLeft);
          float idR = sampleId(uvRight);
          float idU = sampleId(uvUp);
          float idD = sampleId(uvDown);
          float segL = sampleSegment(uvLeft);
          float segR = sampleSegment(uvRight);
          float segU = sampleSegment(uvUp);
          float segD = sampleSegment(uvDown);

          float sameObjL = 1.0 - idDifferent(idC, idL);
          float sameObjR = 1.0 - idDifferent(idC, idR);
          float sameObjU = 1.0 - idDifferent(idC, idU);
          float sameObjD = 1.0 - idDifferent(idC, idD);

          // For the bevel experiment, use same-object segment discontinuities directly.
          // Strict scalar ownership was dropping too many valid inset candidates.
          float leftEdge = sameObjL * segmentDifferent(segC, segL);
          float rightEdge = sameObjR * segmentDifferent(segC, segR);
          float upEdge = sameObjU * segmentDifferent(segC, segU);
          float downEdge = sameObjD * segmentDifferent(segC, segD);

          return vec4(leftEdge, rightEdge, upEdge, downEdge);
        }

        vec3 linearToSRGB(vec3 color) {
          vec3 cutoff = step(color, vec3(0.0031308));
          vec3 lower = color * 12.92;
          vec3 upper = 1.055 * pow(max(color, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
          return mix(upper, lower, cutoff);
        }

        void main() {
          vec3 color = texture2D(tColor, vUv).rgb;
          float blue = sampleBlue(vUv);
          vec2 uvLeft = clamp(vUv + vec2(-texelSize.x, 0.0), vec2(0.0), vec2(1.0));
          vec2 uvRight = clamp(vUv + vec2(texelSize.x, 0.0), vec2(0.0), vec2(1.0));
          vec2 uvUp = clamp(vUv + vec2(0.0, texelSize.y), vec2(0.0), vec2(1.0));
          vec2 uvDown = clamp(vUv + vec2(0.0, -texelSize.y), vec2(0.0), vec2(1.0));

          float blueLeft = sampleBlue(uvLeft);
          float blueRight = sampleBlue(uvRight);
          float blueUp = sampleBlue(uvUp);
          float blueDown = sampleBlue(uvDown);
          float magenta = (1.0 - step(0.0001, blue)) * max(
            max(blueLeft, blueRight),
            max(blueUp, blueDown)
          );

          vec3 overlay = vec3(magenta, 0.0, max(blue, magenta));
          gl_FragColor = vec4(linearToSRGB(clamp(color + overlay, 0.0, 1.0)), 1.0);
        }
      `,
    });
    const segmentIndentedLitMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: null },
        tSegmentMask: { value: null },
        tSegmentField: { value: null },
        texelSize: { value: new THREE.Vector2(1, 1) },
        lightDirection: { value: new THREE.Vector3(0.6, 0.6, 0.4) },
      },
      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tColor;
        uniform sampler2D tSegmentMask;
        uniform sampler2D tSegmentField;
        uniform vec2 texelSize;
        uniform vec3 lightDirection;

        varying vec2 vUv;

        float sampleBlue(vec2 uv) {
          return texture2D(tSegmentMask, uv).b;
        }

        vec3 linearToSRGB(vec3 color) {
          vec3 cutoff = step(color, vec3(0.0031308));
          vec3 lower = color * 12.92;
          vec3 upper = 1.055 * pow(max(color, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
          return mix(upper, lower, cutoff);
        }

        void main() {
          vec3 color = texture2D(tColor, vUv).rgb;
          vec3 lightDir = normalize(lightDirection);
          float blue = sampleBlue(vUv);

          vec2 uvLeft = clamp(vUv + vec2(-texelSize.x, 0.0), vec2(0.0), vec2(1.0));
          vec2 uvRight = clamp(vUv + vec2(texelSize.x, 0.0), vec2(0.0), vec2(1.0));
          vec2 uvUp = clamp(vUv + vec2(0.0, texelSize.y), vec2(0.0), vec2(1.0));
          vec2 uvDown = clamp(vUv + vec2(0.0, -texelSize.y), vec2(0.0), vec2(1.0));

          float blueLeft = sampleBlue(uvLeft);
          float blueRight = sampleBlue(uvRight);
          float blueUp = sampleBlue(uvUp);
          float blueDown = sampleBlue(uvDown);

          float inset = (1.0 - step(0.0001, blue))
            * step(0.0001, max(max(blueLeft, blueRight), max(blueUp, blueDown)));

          vec4 fieldSample = texture2D(tSegmentField, vUv);
          vec2 bevelDirection = fieldSample.xy * 2.0 - 1.0;
          float fieldStrength = fieldSample.z;
          float bevelMask = inset * step(0.0001, fieldStrength);
          vec3 bevelNormal = normalize(vec3(bevelDirection * 1.5, 0.9));

          float bevelLight = clamp(dot(bevelNormal, lightDir), 0.0, 1.0);
          float bevelLit = step(0.45, bevelLight);
          float magenta = bevelMask * bevelLit;
          float bevelShadow = bevelMask * (1.0 - bevelLit);

          vec3 shadedBase = color * mix(1.0, 0.65, bevelShadow);
          vec3 overlay = vec3(magenta, 0.0, max(blue, magenta));
          gl_FragColor = vec4(
            linearToSRGB(clamp(shadedBase + overlay, 0.0, 1.0)),
            1.0
          );
        }
      `,
    });
    const postQuad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      depthEdgeMaterial,
    );
    postScene.add(postQuad);
    const objectIdEntries: Array<{
      mesh: THREE.Mesh;
      material: THREE.Material | THREE.Material[];
      objectIdMaterial: THREE.Material | THREE.Material[];
    }> = [];
    const segmentEntries: Array<{
      mesh: THREE.Mesh;
      material: THREE.Material | THREE.Material[];
      segmentMaterial: THREE.Material | THREE.Material[];
    }> = [];
    const segmentFieldEntries: Array<{
      mesh: THREE.Mesh;
      material: THREE.Material | THREE.Material[];
      fieldMaterial: THREE.Material | THREE.Material[];
    }> = [];
    const segmentBevelEntries: Array<{
      mesh: THREE.Mesh;
      material: THREE.Material | THREE.Material[];
      bevelMaterial: THREE.Material | THREE.Material[];
    }> = [];
    const segmentCellBevelMaterials: THREE.ShaderMaterial[] = [];
    const disposableModelMaterials: THREE.Material[] = [];
    const disposableModelGeometries = new Set<THREE.BufferGeometry>();
    const depthEdgeTargets = new Map<ViewMode, THREE.WebGLRenderTarget>();
    depthEdgeMaterialRef.current = depthEdgeMaterial;
    normalEdgeMaterialRef.current = normalEdgeMaterial;
    augmentedBlendMaterialRef.current = augmentedBlendMaterial;
    blendMaterialRef.current = blendMaterial;
    let standaloneDepthTarget: THREE.WebGLRenderTarget | null = null;
    let standaloneNormalTarget: THREE.WebGLRenderTarget | null = null;
    let standaloneObjectIdTarget: THREE.WebGLRenderTarget | null = null;
    let standaloneColorTarget: THREE.WebGLRenderTarget | null = null;
    let standaloneLightTarget: THREE.WebGLRenderTarget | null = null;
    let standaloneSegmentMaskTarget: THREE.WebGLRenderTarget | null = null;
    let standaloneSegmentFieldTarget: THREE.WebGLRenderTarget | null = null;

    const baseCameraPosition = new THREE.Vector3(
      Math.sin(cameraYaw) * Math.cos(cameraPitch) * cameraDistance,
      target.y + Math.sin(cameraPitch) * cameraDistance,
      Math.cos(cameraYaw) * Math.cos(cameraPitch) * cameraDistance,
    );

    const configureCamera = (
      camera: THREE.OrthographicCamera,
      width: number,
      height: number,
    ) => {
      const aspect = Math.max(width, 1) / Math.max(height, 1);
      camera.left = -aspect * orthoSize;
      camera.right = aspect * orthoSize;
      camera.top = orthoSize;
      camera.bottom = -orthoSize;
      camera.near = 0.1;
      camera.far = 20;
      camera.position.copy(baseCameraPosition);
      camera.lookAt(target);
      camera.updateProjectionMatrix();
    };

    const createRenderer = (mount: HTMLDivElement) => {
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
      renderer.domElement.style.imageRendering = "pixelated";
      return renderer;
    };

    const voxelMaterial = new THREE.MeshStandardMaterial({
      map: pillarTexture,
      color: "#d9d9d9",
      roughness: 0.95,
      metalness: 0.02,
    });

    const stoneMaterial = new THREE.MeshStandardMaterial({
      map: pedestalTopTexture,
      color: "#8e8e8e",
      roughness: 1,
      metalness: 0,
    });

    const pedestalSideMaterial = new THREE.MeshStandardMaterial({
      map: pedestalSideTexture,
      color: "#7c7c7c",
      roughness: 1,
      metalness: 0,
    });

    const pedestalBottomMaterial = new THREE.MeshStandardMaterial({
      color: "#666666",
      roughness: 1,
      metalness: 0,
    });
    const segmentPedestalMaterial = new THREE.MeshBasicMaterial({
      map: segmentPedestalTexture,
      color: "#ffffff",
    });
    const segmentFloorMaterial = new THREE.MeshBasicMaterial({
      map: segmentFloorTexture,
      color: "#ffffff",
    });
    const segmentPillarMaterial = new THREE.MeshBasicMaterial({
      map: segmentPillarTexture,
      color: "#ffffff",
    });
    const segmentDisabledMaterial = new THREE.MeshBasicMaterial({
      color: "#000000",
    });
    const segmentFieldTextures: THREE.Texture[] = [];

    const createSegmentFieldMaterial = (
      fieldTexture: THREE.Texture,
      repeatX: number,
      repeatY: number,
    ) => {
      const repeatedFieldTexture = fieldTexture.clone();
      repeatedFieldTexture.minFilter = THREE.LinearFilter;
      repeatedFieldTexture.magFilter = THREE.LinearFilter;
      repeatedFieldTexture.generateMipmaps = false;
      repeatedFieldTexture.wrapS = THREE.RepeatWrapping;
      repeatedFieldTexture.wrapT = THREE.RepeatWrapping;
      repeatedFieldTexture.repeat.set(repeatX, repeatY);
      repeatedFieldTexture.colorSpace = THREE.NoColorSpace;
      repeatedFieldTexture.needsUpdate = true;
      segmentFieldTextures.push(repeatedFieldTexture);

      return new THREE.MeshBasicMaterial({
        map: repeatedFieldTexture,
        color: "#ffffff",
      });
    };

    const createSegmentCellBevelMaterial = (
      bevelFieldTexture: THREE.Texture,
      repeatX: number,
      repeatY: number,
    ) => {
      const material = new THREE.MeshBasicMaterial({
        color: "#ffffff",
      });
      material.onBeforeCompile = (shader) => {
        shader.uniforms.bevelFieldTexture = { value: bevelFieldTexture };
        shader.uniforms.segmentRepeat = {
          value: new THREE.Vector2(repeatX, repeatY),
        };

        shader.vertexShader = shader.vertexShader
          .replace(
            "#include <common>",
            `#include <common>
             varying vec2 vBevelUv;`,
          )
          .replace(
            "#include <uv_vertex>",
            `#include <uv_vertex>
             vBevelUv = uv;`,
          );

        shader.fragmentShader = shader.fragmentShader
          .replace(
            "#include <common>",
            `#include <common>
             varying vec2 vBevelUv;
             uniform sampler2D bevelFieldTexture;
             uniform vec2 segmentRepeat;`,
          )
          .replace(
            "#include <map_fragment>",
            `#include <map_fragment>
             vec2 tiledUv = fract(vBevelUv * segmentRepeat);
             vec4 bevelField = texture2D(bevelFieldTexture, tiledUv);
             float radialDistance = bevelField.z;
             diffuseColor.rgb = vec3(radialDistance);`,
          );

        material.userData.shader = shader;
      };
      material.customProgramCacheKey = () =>
        `segment-cell-distance-${repeatX}-${repeatY}`;
      segmentCellBevelMaterials.push(material);
      return material;
    };

    const segmentPedestalBevelMaterial = createSegmentCellBevelMaterial(
      segmentBevelFieldTexture,
      4 * segmentRepeatScale,
      4 * segmentRepeatScale,
    );
    const segmentFloorBevelMaterial = createSegmentCellBevelMaterial(
      segmentBevelFieldTexture,
      7 * segmentRepeatScale,
      7 * segmentRepeatScale,
    );
    const segmentPillarBevelMaterial = createSegmentCellBevelMaterial(
      segmentBevelFieldTexture,
      2 * segmentRepeatScale,
      2 * segmentRepeatScale,
    );
    const segmentPedestalFieldMaterial = createSegmentFieldMaterial(
      segmentBevelFieldTexture,
      4 * segmentRepeatScale,
      4 * segmentRepeatScale,
    );
    const segmentFloorFieldMaterial = createSegmentFieldMaterial(
      segmentBevelFieldTexture,
      7 * segmentRepeatScale,
      7 * segmentRepeatScale,
    );
    const segmentPillarFieldMaterial = createSegmentFieldMaterial(
      segmentBevelFieldTexture,
      2 * segmentRepeatScale,
      2 * segmentRepeatScale,
    );

    const crystalMaterial = new THREE.MeshStandardMaterial({
      color: "#7dd3fc",
      emissive: "#1e7498",
      emissiveIntensity: 0.5,
      roughness: 0.25,
      metalness: 0.08,
    });

    const pedestalGeometry = createPlanarBoxGeometry(4, 0.5, 4, {
      width: 4,
      height: 4,
      depth: 4,
      offset: new THREE.Vector3(0, 1.75, 0),
    });
    const pedestal = new THREE.Mesh(pedestalGeometry, [
      pedestalSideMaterial,
      pedestalSideMaterial,
      stoneMaterial,
      pedestalBottomMaterial,
      pedestalSideMaterial,
      pedestalSideMaterial,
    ]);
    pedestal.position.set(0, 0.249, 0);
    pedestal.rotation.y = Math.PI * 0.5;
    pedestal.castShadow = true;
    pedestal.receiveShadow = true;
    scene.add(pedestal);
    objectIdEntries.push({
      mesh: pedestal,
      material: pedestal.material,
      objectIdMaterial: new THREE.MeshBasicMaterial({ color: "#858585" }),
    });
    segmentEntries.push({
      mesh: pedestal,
      material: pedestal.material,
      segmentMaterial: [
        segmentPedestalMaterial,
        segmentPedestalMaterial,
        segmentPedestalMaterial,
        segmentDisabledMaterial,
        segmentPedestalMaterial,
        segmentPedestalMaterial,
      ],
    });
    segmentFieldEntries.push({
      mesh: pedestal,
      material: pedestal.material,
      fieldMaterial: [
        segmentPedestalFieldMaterial,
        segmentPedestalFieldMaterial,
        segmentPedestalFieldMaterial,
        segmentDisabledMaterial,
        segmentPedestalFieldMaterial,
        segmentPedestalFieldMaterial,
      ],
    });
    segmentBevelEntries.push({
      mesh: pedestal,
      material: pedestal.material,
      bevelMaterial: [
        segmentPedestalBevelMaterial,
        segmentPedestalBevelMaterial,
        segmentPedestalBevelMaterial,
        pedestalBottomMaterial,
        segmentPedestalBevelMaterial,
        segmentPedestalBevelMaterial,
      ],
    });

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(7, 7),
      new THREE.MeshStandardMaterial({
        map: floorTexture,
        color: "#4f4f4f",
        roughness: 1,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.001;
    floor.receiveShadow = true;
    scene.add(floor);
    objectIdEntries.push({
      mesh: floor,
      material: floor.material,
      objectIdMaterial: new THREE.MeshBasicMaterial({ color: "#111111" }),
    });
    segmentEntries.push({
      mesh: floor,
      material: floor.material,
      segmentMaterial: segmentFloorMaterial,
    });
    segmentFieldEntries.push({
      mesh: floor,
      material: floor.material,
      fieldMaterial: segmentFloorFieldMaterial,
    });
    segmentBevelEntries.push({
      mesh: floor,
      material: floor.material,
      bevelMaterial: segmentFloorBevelMaterial,
    });

    const addColumn = (x: number, z: number, height: number, rotation = 0) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.62, height, 0.62),
        voxelMaterial,
      );
      mesh.position.set(x, height / 2 + 0.4, z);
      mesh.rotation.y = rotation;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      objectIdEntries.push({
        mesh,
        material: mesh.material,
        objectIdMaterial: new THREE.MeshBasicMaterial({
          color: new THREE.Color().setScalar(
            0.2 + objectIdEntries.length * 0.17,
          ),
        }),
      });
      segmentEntries.push({
        mesh,
        material: mesh.material,
        segmentMaterial: segmentPillarMaterial,
      });
      segmentFieldEntries.push({
        mesh,
        material: mesh.material,
        fieldMaterial: segmentPillarFieldMaterial,
      });
      segmentBevelEntries.push({
        mesh,
        material: mesh.material,
        bevelMaterial: segmentPillarBevelMaterial,
      });
      return mesh;
    };

    const columns = [
      addColumn(-0.8, -0.65, 1.1, Math.PI / 6),
      addColumn(0.9, -0.25, 0.72, Math.PI / 4),
      addColumn(-0.2, 0.85, 0.92, -Math.PI / 8),
    ];

    const crystal = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.38, 0),
      crystalMaterial,
    );
    crystal.position.set(0.25, 1.34, 0.12);
    crystal.rotation.set(0.4, 0.2, 0);
    crystal.castShadow = true;
    crystal.receiveShadow = true;
    scene.add(crystal);
    objectIdEntries.push({
      mesh: crystal,
      material: crystal.material,
      objectIdMaterial: new THREE.MeshBasicMaterial({ color: "#f0f0f0" }),
    });
    segmentEntries.push({
      mesh: crystal,
      material: crystal.material,
      segmentMaterial: segmentDisabledMaterial,
    });
    segmentFieldEntries.push({
      mesh: crystal,
      material: crystal.material,
      fieldMaterial: segmentDisabledMaterial,
    });

    const ambient = new THREE.AmbientLight(ambientColor, 1.35);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight("#ffffff", 2.6);
    keyLight.position.set(3.2, 5.6, 2.8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = 0.005;
    keyLight.shadow.normalBias = 0.0667;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 14;
    keyLight.shadow.camera.left = -4;
    keyLight.shadow.camera.right = 4;
    keyLight.shadow.camera.top = 4;
    keyLight.shadow.camera.bottom = -4;
    scene.add(keyLight);
    const keyLightHeight = keyLight.position.y;
    const keyLightRadius = Math.hypot(keyLight.position.x, keyLight.position.z);
    const keyLightBaseAngle = Math.atan2(
      keyLight.position.x,
      keyLight.position.z,
    );

    const loader = new GLTFLoader();
    let torusKnotRoot: THREE.Object3D | null = null;

    loader.load("/models/torus_knot.glb", (gltf) => {
      if (disposed) return;

      torusKnotRoot = gltf.scene;
      torusKnotRoot.position.set(1.15, 1.1, 0.95);
      torusKnotRoot.rotation.set(0.5, 0.25, 0.1);
      torusKnotRoot.scale.setScalar(0.28);

      torusKnotRoot.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;

        object.castShadow = true;
        object.receiveShadow = true;

        const sourceMaterial = Array.isArray(object.material)
          ? object.material[0]
          : object.material;
        const modelMaterial = crystalMaterial.clone();

        if ("map" in sourceMaterial && sourceMaterial.map) {
          modelMaterial.map = sourceMaterial.map;
        }

        object.material = modelMaterial;
        disposableModelMaterials.push(modelMaterial);
        disposableModelGeometries.add(object.geometry);

        objectIdEntries.push({
          mesh: object,
          material: object.material,
          objectIdMaterial: new THREE.MeshBasicMaterial({ color: "#cfcfcf" }),
        });
        segmentEntries.push({
          mesh: object,
          material: object.material,
          segmentMaterial: segmentDisabledMaterial,
        });
        segmentFieldEntries.push({
          mesh: object,
          material: object.material,
          fieldMaterial: segmentDisabledMaterial,
        });
      });

      scene.add(torusKnotRoot);
    });

    activeModes.forEach((activeMode) => {
      const mount = mounts[activeMode];
      if (!mount) return;

      const renderer = createRenderer(mount);
      const camera = new THREE.OrthographicCamera();

      configureCamera(camera, mount.clientWidth, mount.clientHeight);

      renderers.set(activeMode, renderer);
      cameras.set(activeMode, camera);
      resizeEntries.set(activeMode, { mount, renderer, camera });

      if (activeMode === "depthEdges") {
        const depthTexture = new THREE.DepthTexture(1, 1);
        depthTexture.minFilter = THREE.NearestFilter;
        depthTexture.magFilter = THREE.NearestFilter;
        depthTexture.generateMipmaps = false;

        const target = new THREE.WebGLRenderTarget(1, 1, {
          depthBuffer: true,
        });
        target.texture.minFilter = THREE.NearestFilter;
        target.texture.magFilter = THREE.NearestFilter;
        target.texture.generateMipmaps = false;
        target.depthTexture = depthTexture;
        depthEdgeTargets.set(activeMode, target);
        standaloneDepthTarget = target;
      }

      if (
        activeMode === "objectIdEdges" ||
        activeMode === "segmentEdges" ||
        activeMode === "segmentIndented" ||
        activeMode === "segmentIndentedLit"
      ) {
        const depthTexture = new THREE.DepthTexture(1, 1);
        depthTexture.minFilter = THREE.NearestFilter;
        depthTexture.magFilter = THREE.NearestFilter;
        depthTexture.generateMipmaps = false;

        const objectIdTarget = new THREE.WebGLRenderTarget(1, 1, {
          depthBuffer: true,
        });
        objectIdTarget.texture.minFilter = THREE.NearestFilter;
        objectIdTarget.texture.magFilter = THREE.NearestFilter;
        objectIdTarget.texture.generateMipmaps = false;
        objectIdTarget.depthTexture = depthTexture;
        depthEdgeTargets.set(activeMode, objectIdTarget);
        if (
          activeMode === "segmentEdges" ||
          activeMode === "segmentIndented" ||
          activeMode === "segmentIndentedLit"
        ) {
          const segmentObjectIdTarget = new THREE.WebGLRenderTarget(1, 1);
          segmentObjectIdTarget.texture.minFilter = THREE.NearestFilter;
          segmentObjectIdTarget.texture.magFilter = THREE.NearestFilter;
          segmentObjectIdTarget.texture.generateMipmaps = false;
          depthEdgeTargets.set("objectIds", segmentObjectIdTarget);

          const segmentNormalTarget = new THREE.WebGLRenderTarget(1, 1);
          segmentNormalTarget.texture.minFilter = THREE.NearestFilter;
          segmentNormalTarget.texture.magFilter = THREE.NearestFilter;
          segmentNormalTarget.texture.generateMipmaps = false;
          depthEdgeTargets.set("normals", segmentNormalTarget);

          if (
            activeMode === "segmentIndented" ||
            activeMode === "segmentIndentedLit"
          ) {
            const segmentMaskTarget = new THREE.WebGLRenderTarget(1, 1);
            segmentMaskTarget.texture.minFilter = THREE.NearestFilter;
            segmentMaskTarget.texture.magFilter = THREE.NearestFilter;
            segmentMaskTarget.texture.generateMipmaps = false;
            standaloneSegmentMaskTarget = segmentMaskTarget;

            if (activeMode === "segmentIndentedLit") {
              const segmentFieldTarget = new THREE.WebGLRenderTarget(1, 1);
              segmentFieldTarget.texture.minFilter = THREE.LinearFilter;
              segmentFieldTarget.texture.magFilter = THREE.LinearFilter;
              segmentFieldTarget.texture.generateMipmaps = false;
              standaloneSegmentFieldTarget = segmentFieldTarget;
            }

            const colorTarget = new THREE.WebGLRenderTarget(1, 1);
            colorTarget.texture.minFilter = THREE.NearestFilter;
            colorTarget.texture.magFilter = THREE.NearestFilter;
            colorTarget.texture.generateMipmaps = false;
            standaloneColorTarget = colorTarget;
          }
        }
      }

      if (activeMode === "normalEdges") {
        const depthTexture = new THREE.DepthTexture(1, 1);
        depthTexture.minFilter = THREE.NearestFilter;
        depthTexture.magFilter = THREE.NearestFilter;
        depthTexture.generateMipmaps = false;

        const depthTarget = new THREE.WebGLRenderTarget(1, 1, {
          depthBuffer: true,
        });
        depthTarget.texture.minFilter = THREE.NearestFilter;
        depthTarget.texture.magFilter = THREE.NearestFilter;
        depthTarget.texture.generateMipmaps = false;
        depthTarget.depthTexture = depthTexture;
        depthEdgeTargets.set(activeMode, depthTarget);
        standaloneDepthTarget = depthTarget;

        const normalTarget = new THREE.WebGLRenderTarget(1, 1);
        normalTarget.texture.minFilter = THREE.NearestFilter;
        normalTarget.texture.magFilter = THREE.NearestFilter;
        normalTarget.texture.generateMipmaps = false;
        depthEdgeTargets.set("normals", normalTarget);
        standaloneNormalTarget = normalTarget;
      }

      if (activeMode === "blend") {
        const depthTexture = new THREE.DepthTexture(1, 1);
        depthTexture.minFilter = THREE.NearestFilter;
        depthTexture.magFilter = THREE.NearestFilter;
        depthTexture.generateMipmaps = false;

        const depthTarget = new THREE.WebGLRenderTarget(1, 1, {
          depthBuffer: true,
        });
        depthTarget.texture.minFilter = THREE.NearestFilter;
        depthTarget.texture.magFilter = THREE.NearestFilter;
        depthTarget.texture.generateMipmaps = false;
        depthTarget.depthTexture = depthTexture;
        standaloneDepthTarget = depthTarget;

        const normalTarget = new THREE.WebGLRenderTarget(1, 1);
        normalTarget.texture.minFilter = THREE.NearestFilter;
        normalTarget.texture.magFilter = THREE.NearestFilter;
        normalTarget.texture.generateMipmaps = false;
        standaloneNormalTarget = normalTarget;

        const colorTarget = new THREE.WebGLRenderTarget(1, 1);
        colorTarget.texture.minFilter = THREE.NearestFilter;
        colorTarget.texture.magFilter = THREE.NearestFilter;
        colorTarget.texture.generateMipmaps = false;
        standaloneColorTarget = colorTarget;

        const lightTarget = new THREE.WebGLRenderTarget(1, 1);
        lightTarget.texture.minFilter = THREE.NearestFilter;
        lightTarget.texture.magFilter = THREE.NearestFilter;
        lightTarget.texture.generateMipmaps = false;
        standaloneLightTarget = lightTarget;
      }

      if (activeMode === "augmentedBlend") {
        const depthTexture = new THREE.DepthTexture(1, 1);
        depthTexture.minFilter = THREE.NearestFilter;
        depthTexture.magFilter = THREE.NearestFilter;
        depthTexture.generateMipmaps = false;

        const depthTarget = new THREE.WebGLRenderTarget(1, 1, {
          depthBuffer: true,
        });
        depthTarget.texture.minFilter = THREE.NearestFilter;
        depthTarget.texture.magFilter = THREE.NearestFilter;
        depthTarget.texture.generateMipmaps = false;
        depthTarget.depthTexture = depthTexture;
        standaloneDepthTarget = depthTarget;

        const normalTarget = new THREE.WebGLRenderTarget(1, 1);
        normalTarget.texture.minFilter = THREE.NearestFilter;
        normalTarget.texture.magFilter = THREE.NearestFilter;
        normalTarget.texture.generateMipmaps = false;
        standaloneNormalTarget = normalTarget;

        const colorTarget = new THREE.WebGLRenderTarget(1, 1);
        colorTarget.texture.minFilter = THREE.NearestFilter;
        colorTarget.texture.magFilter = THREE.NearestFilter;
        colorTarget.texture.generateMipmaps = false;
        standaloneColorTarget = colorTarget;

        const lightTarget = new THREE.WebGLRenderTarget(1, 1);
        lightTarget.texture.minFilter = THREE.NearestFilter;
        lightTarget.texture.magFilter = THREE.NearestFilter;
        lightTarget.texture.generateMipmaps = false;
        standaloneLightTarget = lightTarget;

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
        standaloneObjectIdTarget = objectIdTarget;
      }

      if (activeMode === "combinedMask") {
        const depthTexture = new THREE.DepthTexture(1, 1);
        depthTexture.minFilter = THREE.NearestFilter;
        depthTexture.magFilter = THREE.NearestFilter;
        depthTexture.generateMipmaps = false;

        const depthTarget = new THREE.WebGLRenderTarget(1, 1, {
          depthBuffer: true,
        });
        depthTarget.texture.minFilter = THREE.NearestFilter;
        depthTarget.texture.magFilter = THREE.NearestFilter;
        depthTarget.texture.generateMipmaps = false;
        depthTarget.depthTexture = depthTexture;
        standaloneDepthTarget = depthTarget;

        const normalTarget = new THREE.WebGLRenderTarget(1, 1);
        normalTarget.texture.minFilter = THREE.NearestFilter;
        normalTarget.texture.magFilter = THREE.NearestFilter;
        normalTarget.texture.generateMipmaps = false;
        standaloneNormalTarget = normalTarget;

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
        standaloneObjectIdTarget = objectIdTarget;

        const segmentTarget = new THREE.WebGLRenderTarget(1, 1, {
          depthBuffer: true,
        });
        segmentTarget.texture.minFilter = THREE.NearestFilter;
        segmentTarget.texture.magFilter = THREE.NearestFilter;
        segmentTarget.texture.generateMipmaps = false;
        depthEdgeTargets.set("segments", segmentTarget);
      }
    });

    const resize = () => {
      resizeEntries.forEach(({ mount, renderer, camera }) => {
        const width = Math.max(mount.clientWidth, 1);
        const height = Math.max(mount.clientHeight, 1);
        const renderWidth = Math.max(1, Math.round(width / PIXEL_SCALE));
        const renderHeight = Math.max(1, Math.round(height / PIXEL_SCALE));

        configureCamera(camera, width, height);
        renderer.setSize(renderWidth, renderHeight, false);

        if (
          mount === mounts.depthEdges ||
          mount === mounts.normalEdges ||
          mount === mounts.objectIdEdges ||
          mount === mounts.segmentEdges ||
          mount === mounts.segmentIndented ||
          mount === mounts.segmentIndentedLit ||
          mount === mounts.combinedMask ||
          mount === mounts.augmentedBlend ||
          mount === mounts.blend
        ) {
          const depthTarget = depthEdgeTargets.get(
            mount === mounts.depthEdges
              ? "depthEdges"
              : mount === mounts.objectIdEdges
                ? "objectIdEdges"
                : mount === mounts.segmentEdges
                  ? "segmentEdges"
                  : mount === mounts.segmentIndented
                    ? "segmentIndented"
                    : mount === mounts.segmentIndentedLit
                      ? "segmentIndentedLit"
                      : "normalEdges",
          );
          if (depthTarget) {
            depthTarget.setSize(renderWidth, renderHeight);
          }
          if (
            mount === mounts.segmentEdges ||
            mount === mounts.segmentIndented ||
            mount === mounts.segmentIndentedLit
          ) {
            depthEdgeTargets
              .get("objectIds")
              ?.setSize(renderWidth, renderHeight);
            depthEdgeTargets.get("normals")?.setSize(renderWidth, renderHeight);
            if (
              mount === mounts.segmentIndented ||
              mount === mounts.segmentIndentedLit
            ) {
              standaloneSegmentMaskTarget?.setSize(renderWidth, renderHeight);
              standaloneSegmentFieldTarget?.setSize(renderWidth, renderHeight);
              standaloneColorTarget?.setSize(renderWidth, renderHeight);
            }
          }
          if (mount === mounts.normalEdges) {
            const normalTarget = depthEdgeTargets.get("normals");
            if (normalTarget) {
              normalTarget.setSize(renderWidth, renderHeight);
            }
          }
          if (mount === mounts.blend) {
            standaloneDepthTarget?.setSize(renderWidth, renderHeight);
            standaloneNormalTarget?.setSize(renderWidth, renderHeight);
            standaloneColorTarget?.setSize(renderWidth, renderHeight);
            standaloneLightTarget?.setSize(renderWidth, renderHeight);
          }
          if (mount === mounts.augmentedBlend) {
            standaloneDepthTarget?.setSize(renderWidth, renderHeight);
            standaloneNormalTarget?.setSize(renderWidth, renderHeight);
            standaloneColorTarget?.setSize(renderWidth, renderHeight);
            standaloneLightTarget?.setSize(renderWidth, renderHeight);
            standaloneObjectIdTarget?.setSize(renderWidth, renderHeight);
          }
          if (mount === mounts.combinedMask) {
            standaloneDepthTarget?.setSize(renderWidth, renderHeight);
            standaloneNormalTarget?.setSize(renderWidth, renderHeight);
            standaloneObjectIdTarget?.setSize(renderWidth, renderHeight);
            depthEdgeTargets
              .get("segments")
              ?.setSize(renderWidth, renderHeight);
          }
        }
      });
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeEntries.forEach(({ mount }) => resizeObserver.observe(mount));
    window.addEventListener("resize", resize);
    resize();

    const clock = new THREE.Clock();
    let frameId = 0;
    let isVisible = false;
    let disposed = false;

    const renderObjectIds = (
      renderer: THREE.WebGLRenderer,
      camera: THREE.OrthographicCamera,
    ) => {
      objectIdEntries.forEach(({ mesh, objectIdMaterial }) => {
        mesh.material = objectIdMaterial;
      });
      scene.overrideMaterial = null;
      renderer.render(scene, camera);
      objectIdEntries.forEach(({ mesh, material }) => {
        mesh.material = material;
      });
    };

    const renderSegments = (
      renderer: THREE.WebGLRenderer,
      camera: THREE.OrthographicCamera,
    ) => {
      segmentEntries.forEach(({ mesh, segmentMaterial }) => {
        mesh.material = segmentMaterial;
      });
      scene.overrideMaterial = null;
      renderer.render(scene, camera);
      segmentEntries.forEach(({ mesh, material }) => {
        mesh.material = material;
      });
    };

    const renderSegmentField = (
      renderer: THREE.WebGLRenderer,
      camera: THREE.OrthographicCamera,
    ) => {
      segmentFieldEntries.forEach(({ mesh, fieldMaterial }) => {
        mesh.material = fieldMaterial;
      });
      scene.overrideMaterial = null;
      renderer.render(scene, camera);
      segmentFieldEntries.forEach(({ mesh, material }) => {
        mesh.material = material;
      });
    };

    const renderSegmentBevel = (
      renderer: THREE.WebGLRenderer,
      camera: THREE.OrthographicCamera,
    ) => {
      segmentBevelEntries.forEach(({ mesh, bevelMaterial }) => {
        mesh.material = bevelMaterial;
      });
      scene.overrideMaterial = null;
      renderer.render(scene, camera);
      segmentBevelEntries.forEach(({ mesh, material }) => {
        mesh.material = material;
      });
    };

    const renderView = (
      mode: ViewMode,
      renderer: THREE.WebGLRenderer,
      camera: THREE.OrthographicCamera,
    ) => {
      if (mode === "color") {
        scene.overrideMaterial = null;
        renderer.render(scene, camera);
      } else if (mode === "depth") {
        scene.overrideMaterial = depthMaterial;
        renderer.render(scene, camera);
      } else if (mode === "normals") {
        scene.overrideMaterial = normalMaterial;
        renderer.render(scene, camera);
      } else if (mode === "objectIds") {
        renderObjectIds(renderer, camera);
      } else if (mode === "segments") {
        renderSegments(renderer, camera);
      } else if (mode === "segmentCellBevel") {
        renderSegmentBevel(renderer, camera);
      } else {
        if (
          mode === "blend" ||
          mode === "augmentedBlend" ||
          mode === "combinedMask"
        ) {
          if (
            !standaloneDepthTarget ||
            !standaloneNormalTarget ||
            (mode !== "combinedMask" &&
              (!standaloneColorTarget || !standaloneLightTarget))
          ) {
            return;
          }

          if (mode !== "combinedMask") {
            scene.overrideMaterial = null;
            renderer.setRenderTarget(standaloneColorTarget!);
            renderer.render(scene, camera);
            renderer.setRenderTarget(null);
          }

          renderer.setRenderTarget(standaloneDepthTarget);
          scene.overrideMaterial = null;
          renderer.render(scene, camera);
          renderer.setRenderTarget(null);

          scene.overrideMaterial = normalMaterial;
          renderer.setRenderTarget(standaloneNormalTarget);
          renderer.render(scene, camera);
          renderer.setRenderTarget(null);

          if (mode !== "combinedMask") {
            const ambientVisible = ambient.visible;
            scene.overrideMaterial = lightMaskMaterial;
            ambient.visible = false;
            renderer.setRenderTarget(standaloneLightTarget!);
            renderer.render(scene, camera);
            renderer.setRenderTarget(null);
            ambient.visible = ambientVisible;
            scene.overrideMaterial = null;
          }

          if (mode === "augmentedBlend") {
            if (!standaloneObjectIdTarget) {
              return;
            }

            renderer.setRenderTarget(standaloneObjectIdTarget);
            renderObjectIds(renderer, camera);
            renderer.setRenderTarget(null);

            postQuad.material = augmentedBlendMaterial;
            augmentedBlendMaterial.uniforms.tColor.value =
              standaloneColorTarget.texture;
            augmentedBlendMaterial.uniforms.tDepth.value =
              standaloneDepthTarget.depthTexture;
            augmentedBlendMaterial.uniforms.tNormals.value =
              standaloneNormalTarget.texture;
            augmentedBlendMaterial.uniforms.tObjectIds.value =
              standaloneObjectIdTarget.texture;
            augmentedBlendMaterial.uniforms.tLight.value =
              standaloneLightTarget.texture;
            augmentedBlendMaterial.uniforms.texelSize.value.set(
              1 / standaloneDepthTarget.width,
              1 / standaloneDepthTarget.height,
            );
          } else if (mode === "combinedMask") {
            if (!standaloneObjectIdTarget) {
              return;
            }

            const segmentTarget = depthEdgeTargets.get("segments");
            if (!segmentTarget) {
              return;
            }

            renderer.setRenderTarget(standaloneObjectIdTarget);
            renderObjectIds(renderer, camera);
            renderer.setRenderTarget(null);

            renderer.setRenderTarget(segmentTarget);
            renderSegments(renderer, camera);
            renderer.setRenderTarget(null);

            postQuad.material = combinedMaskMaterial;
            combinedMaskMaterial.uniforms.tDepth.value =
              standaloneDepthTarget.depthTexture;
            combinedMaskMaterial.uniforms.tNormals.value =
              standaloneNormalTarget.texture;
            combinedMaskMaterial.uniforms.tObjectIds.value =
              standaloneObjectIdTarget.texture;
            combinedMaskMaterial.uniforms.tSegments.value =
              segmentTarget.texture;
            combinedMaskMaterial.uniforms.texelSize.value.set(
              1 / standaloneDepthTarget.width,
              1 / standaloneDepthTarget.height,
            );
          } else {
            postQuad.material = blendMaterial;
            blendMaterial.uniforms.tColor.value = standaloneColorTarget.texture;
            blendMaterial.uniforms.tDepth.value =
              standaloneDepthTarget.depthTexture;
            blendMaterial.uniforms.tNormals.value =
              standaloneNormalTarget.texture;
            blendMaterial.uniforms.tLight.value = standaloneLightTarget.texture;
            blendMaterial.uniforms.texelSize.value.set(
              1 / standaloneDepthTarget.width,
              1 / standaloneDepthTarget.height,
            );
          }

          renderer.render(postScene, postCamera);
          return;
        }

        const target = depthEdgeTargets.get(mode);
        if (!target) return;

        if (mode === "depthEdges") {
          scene.overrideMaterial = null;
          renderer.setRenderTarget(target);
          renderer.render(scene, camera);
          renderer.setRenderTarget(null);

          postQuad.material = depthEdgeMaterial;
          depthEdgeMaterial.uniforms.tDepth.value = target.depthTexture;
          depthEdgeMaterial.uniforms.texelSize.value.set(
            1 / target.width,
            1 / target.height,
          );
        } else if (mode === "objectIdEdges") {
          renderer.setRenderTarget(target);
          renderObjectIds(renderer, camera);
          renderer.setRenderTarget(null);

          postQuad.material = objectIdEdgeMaterial;
          objectIdEdgeMaterial.uniforms.tObjectIds.value = target.texture;
          objectIdEdgeMaterial.uniforms.tDepth.value = target.depthTexture;
          objectIdEdgeMaterial.uniforms.texelSize.value.set(
            1 / target.width,
            1 / target.height,
          );
        } else if (
          mode === "segmentEdges" ||
          mode === "segmentIndented" ||
          mode === "segmentIndentedLit"
        ) {
          if (mode === "segmentIndented" || mode === "segmentIndentedLit") {
            if (!standaloneColorTarget) return;
            scene.overrideMaterial = null;
            renderer.setRenderTarget(standaloneColorTarget);
            renderer.render(scene, camera);
            renderer.setRenderTarget(null);
          }

          renderer.setRenderTarget(target);
          renderSegments(renderer, camera);
          renderer.setRenderTarget(null);

          const segmentObjectIdTarget = depthEdgeTargets.get("objectIds");
          const segmentNormalTarget = depthEdgeTargets.get("normals");
          if (!segmentObjectIdTarget || !segmentNormalTarget) return;
          renderer.setRenderTarget(segmentObjectIdTarget);
          renderObjectIds(renderer, camera);
          renderer.setRenderTarget(null);

          scene.overrideMaterial = normalMaterial;
          renderer.setRenderTarget(segmentNormalTarget);
          renderer.render(scene, camera);
          renderer.setRenderTarget(null);
          scene.overrideMaterial = null;

          postQuad.material = segmentEdgeMaterial;
          segmentEdgeMaterial.uniforms.tSegments.value = target.texture;
          segmentEdgeMaterial.uniforms.tDepth.value = target.depthTexture;
          segmentEdgeMaterial.uniforms.tObjectIds.value =
            segmentObjectIdTarget.texture;
          segmentEdgeMaterial.uniforms.tNormals.value =
            segmentNormalTarget.texture;
          segmentEdgeMaterial.uniforms.texelSize.value.set(
            1 / target.width,
            1 / target.height,
          );

          if (mode === "segmentIndented" || mode === "segmentIndentedLit") {
            if (!standaloneSegmentMaskTarget) return;

            renderer.setRenderTarget(standaloneSegmentMaskTarget);
            renderer.render(postScene, postCamera);
            renderer.setRenderTarget(null);

            if (mode === "segmentIndentedLit") {
              if (!standaloneSegmentFieldTarget) return;
              renderer.setRenderTarget(standaloneSegmentFieldTarget);
              renderSegmentField(renderer, camera);
              renderer.setRenderTarget(null);
            }

            const viewLightDirection = new THREE.Vector3()
              .subVectors(keyLight.position, lookTarget)
              .normalize()
              .transformDirection(camera.matrixWorldInverse);

            const indentedMaterial =
              mode === "segmentIndentedLit"
                ? segmentIndentedLitMaterial
                : segmentIndentedMaterial;
            postQuad.material = indentedMaterial;
            indentedMaterial.uniforms.tColor.value =
              standaloneColorTarget.texture;
            if ("tSegmentMask" in indentedMaterial.uniforms) {
              indentedMaterial.uniforms.tSegmentMask.value =
                standaloneSegmentMaskTarget.texture;
            }
            if ("tSegmentField" in indentedMaterial.uniforms) {
              indentedMaterial.uniforms.tSegmentField.value =
                standaloneSegmentFieldTarget?.texture ?? null;
            }
            indentedMaterial.uniforms.texelSize.value.set(
              1 / target.width,
              1 / target.height,
            );
            indentedMaterial.uniforms.lightDirection.value.copy(
              viewLightDirection,
            );
          }
        } else {
          const normalTarget = depthEdgeTargets.get("normals");
          if (!normalTarget) return;

          scene.overrideMaterial = null;
          renderer.setRenderTarget(target);
          renderer.render(scene, camera);
          renderer.setRenderTarget(null);

          scene.overrideMaterial = normalMaterial;
          renderer.setRenderTarget(normalTarget);
          renderer.render(scene, camera);
          renderer.setRenderTarget(null);

          postQuad.material = normalEdgeMaterial;
          normalEdgeMaterial.uniforms.tDepth.value = target.depthTexture;
          normalEdgeMaterial.uniforms.tNormals.value = normalTarget.texture;
          normalEdgeMaterial.uniforms.texelSize.value.set(
            1 / target.width,
            1 / target.height,
          );
        }

        renderer.render(postScene, postCamera);
      }
    };

    const animate = () => {
      if (disposed) return;

      if (!isVisible) {
        frameId = 0;
        return;
      }

      const elapsed = clock.getElapsedTime();

      crystal.rotation.y = elapsed * 0.9;
      crystal.position.y = 1.34 + Math.sin(elapsed * 1.7) * 0.06;
      crystalMaterial.emissiveIntensity = 0.45 + Math.sin(elapsed * 2.4) * 0.15;

      if (torusKnotRoot) {
        torusKnotRoot.rotation.y = elapsed * 0.7;
      }

      if (
        activeModes.includes("segmentCellBevel") ||
        activeModes.includes("segmentIndented") ||
        activeModes.includes("segmentIndentedLit")
      ) {
        const azimuth = keyLightBaseAngle + elapsed * 0.35;
        keyLight.position.set(
          Math.sin(azimuth) * keyLightRadius,
          keyLightHeight,
          Math.cos(azimuth) * keyLightRadius,
        );
      }

      const segmentCellLightDirection = new THREE.Vector3()
        .subVectors(keyLight.position, lookTarget)
        .normalize();
      segmentCellBevelMaterials.forEach((material) => {
        const shader = material.userData.shader as
          | { uniforms?: Record<string, { value: THREE.Vector3 }> }
          | undefined;
        shader?.uniforms?.bevelLightDirection?.value.copy(
          segmentCellLightDirection,
        );
      });

      activeModes.forEach((activeMode) => {
        const renderer = renderers.get(activeMode);
        const camera = cameras.get(activeMode);
        if (!renderer || !camera) return;
        renderView(activeMode, renderer, camera);
      });

      scene.overrideMaterial = null;
      frameId = window.requestAnimationFrame(animate);
    };

    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        const nextVisible = Boolean(entry?.isIntersecting);
        if (nextVisible === isVisible) return;

        isVisible = nextVisible;

        if (isVisible) {
          clock.start();
          if (frameId === 0) {
            frameId = window.requestAnimationFrame(animate);
          }
        } else {
          clock.stop();
        }
      },
      {
        threshold: 0.05,
      },
    );

    visibilityObserver.observe(root);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      depthEdgeMaterialRef.current = null;
      normalEdgeMaterialRef.current = null;
      augmentedBlendMaterialRef.current = null;
      blendMaterialRef.current = null;

      renderers.forEach((renderer, mode) => {
        const mount = mounts[mode];
        renderer.dispose();
        if (mount?.contains(renderer.domElement)) {
          mount.removeChild(renderer.domElement);
        }
      });

      normalMaterial.dispose();
      depthMaterial.dispose();
      depthEdgeMaterial.dispose();
      normalEdgeMaterial.dispose();
      objectIdEdgeMaterial.dispose();
      segmentEdgeMaterial.dispose();
      segmentAxesMaterial.dispose();
      segmentIndentedMaterial.dispose();
      segmentIndentedLitMaterial.dispose();
      combinedMaskMaterial.dispose();
      augmentedBlendMaterial.dispose();
      blendMaterial.dispose();
      postQuad.geometry.dispose();
      depthEdgeTargets.forEach((target) => target.dispose());
      standaloneDepthTarget?.dispose();
      standaloneNormalTarget?.dispose();
      standaloneObjectIdTarget?.dispose();
      standaloneColorTarget?.dispose();
      standaloneLightTarget?.dispose();
      standaloneSegmentMaskTarget?.dispose();
      standaloneSegmentFieldTarget?.dispose();
      voxelMaterial.dispose();
      stoneMaterial.dispose();
      pedestalSideMaterial.dispose();
      pedestalBottomMaterial.dispose();
      segmentPedestalMaterial.dispose();
      segmentFloorMaterial.dispose();
      segmentPillarMaterial.dispose();
      segmentCellBevelMaterials.forEach((material) => material.dispose());
      segmentDisabledMaterial.dispose();
      crystalMaterial.dispose();
      disposableModelMaterials.forEach((material) => material.dispose());
      pedestalTopTexture.dispose();
      pedestalSideTexture.dispose();
      floorTexture.dispose();
      pillarTexture.dispose();
      segmentPedestalTexture.dispose();
      segmentFloorTexture.dispose();
      segmentPillarTexture.dispose();
      segmentFieldTextures.forEach((texture) => texture.dispose());
      objectIdEntries.forEach(({ objectIdMaterial }) => {
        if (Array.isArray(objectIdMaterial)) {
          objectIdMaterial.forEach((material) => material.dispose());
        } else {
          objectIdMaterial.dispose();
        }
      });
      disposableModelGeometries.forEach((geometry) => geometry.dispose());
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
        }
      });
    };
  }, [mode, selectedSegmentTexture]);

  const showDepthControl =
    mode === "depthEdgesOnly" ||
    mode === "normalEdgesOnly" ||
    mode === "blendOnly";
  const showAugmentedBlendControls = mode === "augmentedBlendOnly";
  const showSegmentTexturePicker =
    mode === "segmentOnly" ||
    mode === "segmentCellBevelOnly" ||
    mode === "segmentEdgesOnly" ||
    mode === "segmentIndentedOnly" ||
    mode === "segmentIndentedLitOnly" ||
    mode === "combinedMaskOnly";

  const updateSegmentTexture = (nextId: string) => {
    setSelectedSegmentTextureId(nextId);
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SEGMENT_TEXTURE_STORAGE_KEY, nextId);
    window.dispatchEvent(
      new CustomEvent(SEGMENT_TEXTURE_EVENT, {
        detail: nextId,
      }),
    );
  };

  return (
    <div
      ref={rootRef}
      className={`pixel-buffer-demo ${mode === "depthEdgesOnly" ? "pixel-buffer-demo--depth-only" : ""}`}
      aria-label="3D pixel art buffer views"
    >
      {mode === "full" && (
        <>
          <section className="pixel-buffer-demo__panel">
            <div className="pixel-buffer-demo__header">
              <span>Scene Color</span>
            </div>
            <div ref={colorRef} className="pixel-buffer-demo__viewport" />
          </section>

          <section className="pixel-buffer-demo__panel">
            <div className="pixel-buffer-demo__header">
              <span>Depth Buffer</span>
            </div>
            <div ref={depthRef} className="pixel-buffer-demo__viewport" />
          </section>

          <section className="pixel-buffer-demo__panel">
            <div className="pixel-buffer-demo__header">
              <span>Normals Buffer</span>
            </div>
            <div ref={normalsRef} className="pixel-buffer-demo__viewport" />
          </section>
        </>
      )}

      {mode === "depthEdgesOnly" && (
        <div
          ref={depthEdgesRef}
          className="pixel-buffer-demo__viewport pixel-buffer-demo__viewport--solo"
        />
      )}

      {mode === "normalEdgesOnly" && (
        <div
          ref={normalEdgesRef}
          className="pixel-buffer-demo__viewport pixel-buffer-demo__viewport--solo"
        />
      )}

      {mode === "segmentOnly" && (
        <div
          ref={segmentRef}
          className="pixel-buffer-demo__viewport pixel-buffer-demo__viewport--solo"
        />
      )}

      {mode === "segmentCellBevelOnly" && (
        <div
          ref={segmentCellBevelRef}
          className="pixel-buffer-demo__viewport pixel-buffer-demo__viewport--solo"
        />
      )}

      {mode === "segmentEdgesOnly" && (
        <div
          ref={segmentEdgesRef}
          className="pixel-buffer-demo__viewport pixel-buffer-demo__viewport--solo"
        />
      )}

      {mode === "segmentIndentedOnly" && (
        <div
          ref={segmentIndentedRef}
          className="pixel-buffer-demo__viewport pixel-buffer-demo__viewport--solo"
        />
      )}

      {mode === "segmentIndentedLitOnly" && (
        <div
          ref={segmentIndentedLitRef}
          className="pixel-buffer-demo__viewport pixel-buffer-demo__viewport--solo"
        />
      )}

      {mode === "combinedMaskOnly" && (
        <div
          ref={combinedMaskRef}
          className="pixel-buffer-demo__viewport pixel-buffer-demo__viewport--solo"
        />
      )}

      {mode === "objectIdOnly" && (
        <div
          ref={objectIdsRef}
          className="pixel-buffer-demo__viewport pixel-buffer-demo__viewport--solo"
        />
      )}

      {mode === "objectIdEdgesOnly" && (
        <div
          ref={objectIdEdgesRef}
          className="pixel-buffer-demo__viewport pixel-buffer-demo__viewport--solo"
        />
      )}

      {mode === "augmentedBlendOnly" && (
        <div
          ref={augmentedBlendRef}
          className="pixel-buffer-demo__viewport pixel-buffer-demo__viewport--solo"
        />
      )}

      {mode === "blendOnly" && (
        <div
          ref={blendRef}
          className="pixel-buffer-demo__viewport pixel-buffer-demo__viewport--solo"
        />
      )}

      {showDepthControl && (
        <div className="pixel-buffer-demo__controls">
          <div className="pixel-buffer-demo__control-row">
            <label
              className="pixel-buffer-demo__control"
              aria-label="Depth threshold"
            >
              <span>Depth Threshold</span>
              <input
                type="range"
                min="0.0075"
                max="0.05"
                step="0.001"
                value={depthThreshold}
                onChange={(event) =>
                  setDepthThreshold(Number(event.currentTarget.value))
                }
              />
            </label>
            <button
              className="pixel-buffer-demo__reset"
              type="button"
              aria-label="Reset depth threshold"
              onClick={() => setDepthThreshold(DEPTH_EDGE_THRESHOLD)}
            >
              <svg viewBox="0 0 32 32" aria-hidden="true">
                <path
                  d="M18,28A12,12,0,1,0,6,16v6.2L2.4,18.6,1,20l6,6,6-6-1.4-1.4L8,22.2V16H8A10,10,0,1,1,18,26Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
          {mode === "blendOnly" && (
            <>
              <div className="pixel-buffer-demo__control-row">
                <label
                  className="pixel-buffer-demo__control"
                  aria-label="Depth outline strength"
                >
                  <span>Depth Outline</span>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.05"
                    value={depthOutlineStrength}
                    onChange={(event) =>
                      setDepthOutlineStrength(Number(event.currentTarget.value))
                    }
                  />
                </label>
                <button
                  className="pixel-buffer-demo__reset"
                  type="button"
                  aria-label="Reset depth outline strength"
                  onClick={() =>
                    setDepthOutlineStrength(DEPTH_OUTLINE_STRENGTH)
                  }
                >
                  <svg viewBox="0 0 32 32" aria-hidden="true">
                    <path
                      d="M18,28A12,12,0,1,0,6,16v6.2L2.4,18.6,1,20l6,6,6-6-1.4-1.4L8,22.2V16H8A10,10,0,1,1,18,26Z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
              </div>
              <div className="pixel-buffer-demo__control-row">
                <label
                  className="pixel-buffer-demo__control"
                  aria-label="Normal outline strength"
                >
                  <span>Normal Outline</span>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.05"
                    value={normalOutlineStrength}
                    onChange={(event) =>
                      setNormalOutlineStrength(
                        Number(event.currentTarget.value),
                      )
                    }
                  />
                </label>
                <button
                  className="pixel-buffer-demo__reset"
                  type="button"
                  aria-label="Reset normal outline strength"
                  onClick={() =>
                    setNormalOutlineStrength(NORMAL_OUTLINE_STRENGTH)
                  }
                >
                  <svg viewBox="0 0 32 32" aria-hidden="true">
                    <path
                      d="M18,28A12,12,0,1,0,6,16v6.2L2.4,18.6,1,20l6,6,6-6-1.4-1.4L8,22.2V16H8A10,10,0,1,1,18,26Z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {showAugmentedBlendControls && (
        <div className="pixel-buffer-demo__controls">
          <div className="pixel-buffer-demo__control-row">
            <label
              className="pixel-buffer-demo__control"
              aria-label="Object ID outline strength"
            >
              <span>Object ID Outline</span>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={objectIdOutlineStrength}
                onChange={(event) =>
                  setObjectIdOutlineStrength(Number(event.currentTarget.value))
                }
              />
            </label>
            <button
              className="pixel-buffer-demo__reset"
              type="button"
              aria-label="Reset object ID outline strength"
              onClick={() =>
                setObjectIdOutlineStrength(OBJECT_ID_OUTLINE_STRENGTH)
              }
            >
              <svg viewBox="0 0 32 32" aria-hidden="true">
                <path
                  d="M18,28A12,12,0,1,0,6,16v6.2L2.4,18.6,1,20l6,6,6-6-1.4-1.4L8,22.2V16H8A10,10,0,1,1,18,26Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
          <div className="pixel-buffer-demo__control-row">
            <label
              className="pixel-buffer-demo__control"
              aria-label="Internal depth strength"
            >
              <span>Internal Depth</span>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={internalDepthOutlineStrength}
                onChange={(event) =>
                  setInternalDepthOutlineStrength(
                    Number(event.currentTarget.value),
                  )
                }
              />
            </label>
            <button
              className="pixel-buffer-demo__reset"
              type="button"
              aria-label="Reset internal depth strength"
              onClick={() =>
                setInternalDepthOutlineStrength(INTERNAL_DEPTH_OUTLINE_STRENGTH)
              }
            >
              <svg viewBox="0 0 32 32" aria-hidden="true">
                <path
                  d="M18,28A12,12,0,1,0,6,16v6.2L2.4,18.6,1,20l6,6,6-6-1.4-1.4L8,22.2V16H8A10,10,0,1,1,18,26Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
          <div className="pixel-buffer-demo__control-row">
            <label
              className="pixel-buffer-demo__control"
              aria-label="Normal outline strength"
            >
              <span>Normal Outline</span>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={normalOutlineStrength}
                onChange={(event) =>
                  setNormalOutlineStrength(Number(event.currentTarget.value))
                }
              />
            </label>
            <button
              className="pixel-buffer-demo__reset"
              type="button"
              aria-label="Reset normal outline strength"
              onClick={() => setNormalOutlineStrength(NORMAL_OUTLINE_STRENGTH)}
            >
              <svg viewBox="0 0 32 32" aria-hidden="true">
                <path
                  d="M18,28A12,12,0,1,0,6,16v6.2L2.4,18.6,1,20l6,6,6-6-1.4-1.4L8,22.2V16H8A10,10,0,1,1,18,26Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {showSegmentTexturePicker && (
        <div className="pixel-buffer-demo__controls">
          <div className="pixel-buffer-demo__control-row">
            <label
              className="pixel-buffer-demo__control"
              aria-label="Segment map"
            >
              <span>Segment Map</span>
              <select
                value={selectedSegmentTextureId}
                onChange={(event) =>
                  updateSegmentTexture(event.currentTarget.value)
                }
              >
                {SEGMENT_TEXTURE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
