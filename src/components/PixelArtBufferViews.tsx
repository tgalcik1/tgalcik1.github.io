import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

type ViewMode =
  | "color"
  | "depth"
  | "normals"
  | "segments"
  | "segmentFieldTexture"
  | "segmentInsetMask"
  | "segmentCenterField"
  | "segmentCellBevel"
  | "segmentEdges"
  | "segmentIndented"
  | "segmentIndentedOrbit"
  | "segmentIndentedNormal"
  | "segmentIndentedLit"
  | "segmentIndentedApplied"
  | "segmentIndentedAppliedOrbit"
  | "segmentIndentedAppliedPointLights"
  | "segmentIndentedAppliedFinal"
  | "segmentIndentedAppliedFinalPointLights"
  | "segmentBakedNormalMapTexture"
  | "segmentBakedNormalMapView"
  | "segmentBakedNormalMapApplied"
  | "combinedMask"
  | "depthEdges"
  | "normalEdges"
  | "objectIds"
  | "objectIdEdges"
  | "augmentedBlend"
  | "blend";

interface Props {
  showSegmentTexturePicker?: boolean;
  mode?:
    | "full"
    | "depthEdgesOnly"
    | "normalEdgesOnly"
    | "segmentOnly"
    | "segmentFieldTextureOnly"
    | "segmentInsetMaskOnly"
    | "segmentCenterFieldOnly"
    | "segmentCellBevelOnly"
    | "segmentEdgesOnly"
    | "segmentIndentedOnly"
    | "segmentIndentedOrbitOnly"
    | "segmentIndentedNormalOnly"
    | "segmentIndentedLitOnly"
    | "segmentIndentedAppliedOnly"
    | "segmentIndentedAppliedOrbitOnly"
    | "segmentIndentedAppliedPointLightsOnly"
    | "segmentIndentedAppliedFinalOnly"
    | "segmentIndentedAppliedFinalPointLightsOnly"
    | "segmentBakedNormalMapTextureOnly"
    | "segmentBakedNormalMapViewOnly"
    | "segmentBakedNormalMapAppliedOnly"
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
const SEGMENT_FIELD_TEXTURE_VIEW_MODES: ViewMode[] = ["segmentFieldTexture"];
const SEGMENT_INSET_MASK_VIEW_MODES: ViewMode[] = ["segmentInsetMask"];
const SEGMENT_CENTER_FIELD_VIEW_MODES: ViewMode[] = ["segmentCenterField"];
const SEGMENT_CELL_BEVEL_VIEW_MODES: ViewMode[] = ["segmentCellBevel"];
const SEGMENT_EDGE_VIEW_MODES: ViewMode[] = ["segmentEdges"];
const SEGMENT_INDENTED_VIEW_MODES: ViewMode[] = ["segmentIndented"];
const SEGMENT_INDENTED_ORBIT_VIEW_MODES: ViewMode[] = ["segmentIndentedOrbit"];
const SEGMENT_INDENTED_NORMAL_VIEW_MODES: ViewMode[] = [
  "segmentIndentedNormal",
];
const SEGMENT_INDENTED_LIT_VIEW_MODES: ViewMode[] = ["segmentIndentedLit"];
const SEGMENT_INDENTED_APPLIED_VIEW_MODES: ViewMode[] = [
  "segmentIndentedApplied",
];
const SEGMENT_INDENTED_APPLIED_ORBIT_VIEW_MODES: ViewMode[] = [
  "segmentIndentedAppliedOrbit",
];
const SEGMENT_INDENTED_APPLIED_POINT_LIGHTS_VIEW_MODES: ViewMode[] = [
  "segmentIndentedAppliedPointLights",
];
const SEGMENT_INDENTED_APPLIED_FINAL_VIEW_MODES: ViewMode[] = [
  "segmentIndentedAppliedFinal",
];
const SEGMENT_INDENTED_APPLIED_FINAL_POINT_LIGHTS_VIEW_MODES: ViewMode[] = [
  "segmentIndentedAppliedFinalPointLights",
];
const SEGMENT_BAKED_NORMAL_MAP_TEXTURE_VIEW_MODES: ViewMode[] = [
  "segmentBakedNormalMapTexture",
];
const SEGMENT_BAKED_NORMAL_MAP_VIEW_MODES: ViewMode[] = [
  "segmentBakedNormalMapView",
];
const SEGMENT_BAKED_NORMAL_MAP_APPLIED_VIEW_MODES: ViewMode[] = [
  "segmentBakedNormalMapApplied",
];
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
const SEGMENT_FIELD_TEXTURE_READY_EVENT =
  "pixel-art-segment-field-texture-ready";
const INSET_CONTROLS_STORAGE_KEY = "pixel-art-inset-controls-v2";
const INSET_CONTROLS_EVENT = "pixel-art-inset-controls-change";
const generatedSegmentFieldCache = new Map<string, THREE.DataTexture>();
const generatedSegmentCenterFieldCache = new Map<string, THREE.DataTexture>();
const generatedWrappedSegmentCenterFieldCache = new Map<
  string,
  THREE.DataTexture
>();
const segmentScalarTextureCache = new Map<string, THREE.Texture>();
const repeatedSegmentFieldTextureCache = new Map<string, THREE.Texture>();
const repeatedSegmentCenterFieldTextureCache = new Map<string, THREE.Texture>();
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
const INSET_DIRECTION_STRENGTH = 1;
const INSET_BASE_NORMAL_WEIGHT = 0;
const INSET_LIT_THRESHOLD = 0.5;
const INSET_LIT_FALLOFF = 0.5;
const INSET_BEVEL_STRENGTH = 1;
const SHARED_INDENT_TO_BEVEL_SCALE = 2;
const INSET_DARKEN_STRENGTH = 0.5;
const INSET_FIELD_MODE = "blend";
const INSET_FIELD_BLEND = 0.5;
const BAKED_NORMAL_MAP_STRENGTH = 0.75;
const BAKED_NORMAL_MAP_BLEND = 0.85;
const BAKED_NORMAL_MAP_INSET_STRENGTH = 1;

export default function PixelArtBufferViews({
  mode = "full",
  showSegmentTexturePicker = false,
}: Props) {
  const forcedSegmentTextureId =
    mode === "segmentIndentedAppliedFinalOnly" ||
    mode === "segmentIndentedAppliedFinalPointLightsOnly"
      ? "grid"
      : null;
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
  const [segmentFieldUnderlay, setSegmentFieldUnderlay] = useState(0.35);
  const [insetDirectionStrength, setInsetDirectionStrength] = useState(
    INSET_DIRECTION_STRENGTH,
  );
  const [insetBaseNormalWeight, setInsetBaseNormalWeight] = useState(
    INSET_BASE_NORMAL_WEIGHT,
  );
  const [insetLitThreshold, setInsetLitThreshold] =
    useState(INSET_LIT_THRESHOLD);
  const [insetLitFalloff, setInsetLitFalloff] = useState(INSET_LIT_FALLOFF);
  const [insetBevelStrength, setInsetBevelStrength] =
    useState(INSET_BEVEL_STRENGTH);
  const [insetDarkenStrength, setInsetDarkenStrength] = useState(
    INSET_DARKEN_STRENGTH,
  );
  const insetFieldMode = "blend" as const;
  const [insetFieldBlend, setInsetFieldBlend] = useState(INSET_FIELD_BLEND);
  const [bakedNormalMapBlend, setBakedNormalMapBlend] = useState(
    BAKED_NORMAL_MAP_BLEND,
  );
  const [bakedNormalMapInsetStrength, setBakedNormalMapInsetStrength] =
    useState(BAKED_NORMAL_MAP_INSET_STRENGTH);
  const [segmentFieldRevision, setSegmentFieldRevision] = useState(0);
  const [isRendererActive, setIsRendererActive] = useState(false);
  const insetControlsRef = useRef({
    fieldUnderlay: segmentFieldUnderlay,
    directionStrength: insetDirectionStrength,
    baseNormalWeight: insetBaseNormalWeight,
    litThreshold: insetLitThreshold,
    litFalloff: insetLitFalloff,
    bevelStrength: insetBevelStrength,
    darkenStrength: insetDarkenStrength,
    fieldMode: insetFieldMode,
    fieldBlend: insetFieldBlend,
  });
  insetControlsRef.current = {
    fieldUnderlay: segmentFieldUnderlay,
    directionStrength: insetDirectionStrength,
    baseNormalWeight: insetBaseNormalWeight,
    litThreshold: insetLitThreshold,
    litFalloff: insetLitFalloff,
    bevelStrength: insetBevelStrength,
    darkenStrength: insetDarkenStrength,
    fieldMode: insetFieldMode,
    fieldBlend: insetFieldBlend,
  };
  const bakedNormalMapBlendRef = useRef(bakedNormalMapBlend);
  bakedNormalMapBlendRef.current = bakedNormalMapBlend;
  const bakedNormalMapInsetStrengthRef = useRef(bakedNormalMapInsetStrength);
  bakedNormalMapInsetStrengthRef.current = bakedNormalMapInsetStrength;
  const rootRef = useRef<HTMLDivElement>(null);
  const colorRef = useRef<HTMLDivElement>(null);
  const depthRef = useRef<HTMLDivElement>(null);
  const normalsRef = useRef<HTMLDivElement>(null);
  const segmentRef = useRef<HTMLDivElement>(null);
  const segmentFieldTextureRef = useRef<HTMLDivElement>(null);
  const segmentInsetMaskRef = useRef<HTMLDivElement>(null);
  const segmentCenterFieldRef = useRef<HTMLDivElement>(null);
  const segmentCellBevelRef = useRef<HTMLDivElement>(null);
  const segmentEdgesRef = useRef<HTMLDivElement>(null);
  const segmentIndentedRef = useRef<HTMLDivElement>(null);
  const segmentIndentedOrbitRef = useRef<HTMLDivElement>(null);
  const segmentIndentedNormalRef = useRef<HTMLDivElement>(null);
  const segmentIndentedLitRef = useRef<HTMLDivElement>(null);
  const segmentIndentedAppliedRef = useRef<HTMLDivElement>(null);
  const segmentIndentedAppliedOrbitRef = useRef<HTMLDivElement>(null);
  const segmentIndentedAppliedPointLightsRef = useRef<HTMLDivElement>(null);
  const segmentIndentedAppliedFinalRef = useRef<HTMLDivElement>(null);
  const segmentIndentedAppliedFinalPointLightsRef =
    useRef<HTMLDivElement>(null);
  const segmentBakedNormalMapTextureRef = useRef<HTMLDivElement>(null);
  const segmentBakedNormalMapViewRef = useRef<HTMLDivElement>(null);
  const segmentBakedNormalMapAppliedRef = useRef<HTMLDivElement>(null);
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
  const effectiveSegmentTextureId =
    forcedSegmentTextureId ?? selectedSegmentTextureId;
  const selectedSegmentTexture =
    SEGMENT_TEXTURE_OPTIONS.find(({ id }) => id === effectiveSegmentTextureId) ??
    SEGMENT_TEXTURE_OPTIONS[0];
  const usesSegmentTexture =
    mode === "segmentOnly" ||
    mode === "segmentFieldTextureOnly" ||
    mode === "segmentInsetMaskOnly" ||
    mode === "segmentCenterFieldOnly" ||
    mode === "segmentCellBevelOnly" ||
    mode === "segmentEdgesOnly" ||
    mode === "segmentIndentedOnly" ||
    mode === "segmentIndentedOrbitOnly" ||
    mode === "segmentIndentedNormalOnly" ||
    mode === "segmentIndentedLitOnly" ||
    mode === "segmentIndentedAppliedOnly" ||
    mode === "segmentIndentedAppliedOrbitOnly" ||
    mode === "segmentIndentedAppliedPointLightsOnly" ||
    mode === "segmentIndentedAppliedFinalOnly" ||
    mode === "segmentIndentedAppliedFinalPointLightsOnly" ||
    mode === "segmentBakedNormalMapTextureOnly" ||
    mode === "segmentBakedNormalMapViewOnly" ||
    mode === "segmentBakedNormalMapAppliedOnly" ||
    mode === "combinedMaskOnly";
  const segmentTextureDependency = usesSegmentTexture
    ? selectedSegmentTexture.id
    : "no-segment-texture";
  const usesSegmentField =
    mode === "segmentFieldTextureOnly" ||
    mode === "segmentIndentedOnly" ||
    mode === "segmentIndentedOrbitOnly" ||
    mode === "segmentIndentedNormalOnly" ||
    mode === "segmentIndentedLitOnly" ||
    mode === "segmentIndentedAppliedOnly" ||
    mode === "segmentIndentedAppliedOrbitOnly" ||
    mode === "segmentIndentedAppliedPointLightsOnly" ||
    mode === "segmentIndentedAppliedFinalOnly" ||
    mode === "segmentIndentedAppliedFinalPointLightsOnly" ||
    mode === "segmentBakedNormalMapTextureOnly" ||
    mode === "segmentBakedNormalMapViewOnly" ||
    mode === "segmentBakedNormalMapAppliedOnly";
  const segmentFieldDependency = usesSegmentField
    ? "blend"
    : "no-segment-field";

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
    if (typeof window === "undefined") return;

    const syncFieldTextures = () => {
      setSegmentFieldRevision((value) => value + 1);
    };

    window.addEventListener(
      SEGMENT_FIELD_TEXTURE_READY_EVENT,
      syncFieldTextures,
    );

    return () => {
      window.removeEventListener(
        SEGMENT_FIELD_TEXTURE_READY_EVENT,
        syncFieldTextures,
      );
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const applyControls = (next: Partial<typeof insetControlsRef.current>) => {
      if (typeof next.fieldUnderlay === "number") {
        setSegmentFieldUnderlay(next.fieldUnderlay);
      }
      if (typeof next.directionStrength === "number") {
        setInsetDirectionStrength(next.directionStrength);
      }
      if (typeof next.litThreshold === "number") {
        setInsetLitThreshold(next.litThreshold);
      }
      if (typeof next.litFalloff === "number") {
        setInsetLitFalloff(next.litFalloff);
      }
      if (typeof next.bevelStrength === "number") {
        setInsetBevelStrength(next.bevelStrength);
      }
      if (typeof next.darkenStrength === "number") {
        setInsetDarkenStrength(next.darkenStrength);
      }
      if (typeof next.fieldBlend === "number") {
        setInsetFieldBlend(next.fieldBlend);
      }
    };

    const stored = window.localStorage.getItem(INSET_CONTROLS_STORAGE_KEY);
    if (stored) {
      try {
        applyControls(
          JSON.parse(stored) as Partial<typeof insetControlsRef.current>,
        );
      } catch {
        window.localStorage.removeItem(INSET_CONTROLS_STORAGE_KEY);
      }
    }

    const syncControls = (event: Event) => {
      const next =
        event instanceof CustomEvent
          ? (event.detail as Partial<typeof insetControlsRef.current> | null)
          : null;
      if (next) {
        applyControls(next);
      }
    };

    const syncFromStorage = (event: StorageEvent) => {
      if (event.key !== INSET_CONTROLS_STORAGE_KEY || !event.newValue) return;
      try {
        applyControls(
          JSON.parse(event.newValue) as Partial<
            typeof insetControlsRef.current
          >,
        );
      } catch {
        window.localStorage.removeItem(INSET_CONTROLS_STORAGE_KEY);
      }
    };

    window.addEventListener(INSET_CONTROLS_EVENT, syncControls);
    window.addEventListener("storage", syncFromStorage);

    return () => {
      window.removeEventListener(INSET_CONTROLS_EVENT, syncControls);
      window.removeEventListener("storage", syncFromStorage);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = rootRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsRendererActive(Boolean(entry?.isIntersecting));
      },
      {
        threshold: 0.05,
      },
    );

    observer.observe(root);

    return () => {
      observer.disconnect();
    };
  }, []);

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
            : mode === "segmentFieldTextureOnly"
              ? SEGMENT_FIELD_TEXTURE_VIEW_MODES
              : mode === "segmentInsetMaskOnly"
                ? SEGMENT_INSET_MASK_VIEW_MODES
                : mode === "segmentCenterFieldOnly"
                  ? SEGMENT_CENTER_FIELD_VIEW_MODES
                  : mode === "segmentCellBevelOnly"
                    ? SEGMENT_CELL_BEVEL_VIEW_MODES
                    : mode === "segmentEdgesOnly"
                      ? SEGMENT_EDGE_VIEW_MODES
                      : mode === "segmentIndentedOnly"
                        ? SEGMENT_INDENTED_VIEW_MODES
                        : mode === "segmentIndentedOrbitOnly"
                          ? SEGMENT_INDENTED_ORBIT_VIEW_MODES
                          : mode === "segmentIndentedNormalOnly"
                            ? SEGMENT_INDENTED_NORMAL_VIEW_MODES
                            : mode === "segmentIndentedLitOnly"
                              ? SEGMENT_INDENTED_LIT_VIEW_MODES
                              : mode === "segmentIndentedAppliedOnly"
                                ? SEGMENT_INDENTED_APPLIED_VIEW_MODES
                                : mode === "segmentIndentedAppliedOrbitOnly"
                                ? SEGMENT_INDENTED_APPLIED_ORBIT_VIEW_MODES
                                : mode ===
                                    "segmentIndentedAppliedPointLightsOnly"
                                  ? SEGMENT_INDENTED_APPLIED_POINT_LIGHTS_VIEW_MODES
                                  : mode ===
                                      "segmentIndentedAppliedFinalOnly"
                                    ? SEGMENT_INDENTED_APPLIED_FINAL_VIEW_MODES
                                    : mode ===
                                        "segmentIndentedAppliedFinalPointLightsOnly"
                                      ? SEGMENT_INDENTED_APPLIED_FINAL_POINT_LIGHTS_VIEW_MODES
                                    : mode ===
                                        "segmentBakedNormalMapTextureOnly"
                                      ? SEGMENT_BAKED_NORMAL_MAP_TEXTURE_VIEW_MODES
                                      : mode === "segmentBakedNormalMapViewOnly"
                                        ? SEGMENT_BAKED_NORMAL_MAP_VIEW_MODES
                                        : mode ===
                                            "segmentBakedNormalMapAppliedOnly"
                                          ? SEGMENT_BAKED_NORMAL_MAP_APPLIED_VIEW_MODES
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
      segmentFieldTexture: segmentFieldTextureRef.current,
      segmentInsetMask: segmentInsetMaskRef.current,
      segmentCenterField: segmentCenterFieldRef.current,
      segmentCellBevel: segmentCellBevelRef.current,
      segmentEdges: segmentEdgesRef.current,
      segmentIndented: segmentIndentedRef.current,
      segmentIndentedOrbit: segmentIndentedOrbitRef.current,
      segmentIndentedNormal: segmentIndentedNormalRef.current,
      segmentIndentedLit: segmentIndentedLitRef.current,
      segmentIndentedApplied: segmentIndentedAppliedRef.current,
      segmentIndentedAppliedOrbit: segmentIndentedAppliedOrbitRef.current,
      segmentIndentedAppliedPointLights:
        segmentIndentedAppliedPointLightsRef.current,
      segmentIndentedAppliedFinal: segmentIndentedAppliedFinalRef.current,
      segmentIndentedAppliedFinalPointLights:
        segmentIndentedAppliedFinalPointLightsRef.current,
      segmentBakedNormalMapTexture: segmentBakedNormalMapTextureRef.current,
      segmentBakedNormalMapView: segmentBakedNormalMapViewRef.current,
      segmentBakedNormalMapApplied: segmentBakedNormalMapAppliedRef.current,
      combinedMask: combinedMaskRef.current,
      depthEdges: depthEdgesRef.current,
      normalEdges: normalEdgesRef.current,
      objectIds: objectIdsRef.current,
      objectIdEdges: objectIdEdgesRef.current,
      augmentedBlend: augmentedBlendRef.current,
      blend: blendRef.current,
    };
    const root = rootRef.current;
    let frameId = 0;
    let disposed = false;
    let loggedSegmentIndentedNormalSetup = false;
    let loggedSegmentIndentedNormalRender = false;

    if (
      !root ||
      !isRendererActive ||
      activeModes.some((activeMode) => !mounts[activeMode])
    ) {
      return;
    }

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
      const key = `${path}:${repeatX}:${repeatY}`;
      const cachedTexture = segmentScalarTextureCache.get(key);
      if (cachedTexture) {
        return cachedTexture;
      }

      const texture = textureLoader.load(path);
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      texture.generateMipmaps = false;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(repeatX, repeatY);
      texture.colorSpace = THREE.NoColorSpace;
      segmentScalarTextureCache.set(key, texture);
      return texture;
    };
    const invalidateRepeatedFieldTextures = (fieldPath: string) => {
      const repeatedFieldPrefix = `${fieldPath}:`;
      for (const [
        cacheKey,
        cachedTexture,
      ] of repeatedSegmentFieldTextureCache) {
        if (!cacheKey.startsWith(repeatedFieldPrefix)) continue;
        cachedTexture.dispose();
        repeatedSegmentFieldTextureCache.delete(cacheKey);
      }
      for (const [
        cacheKey,
        cachedTexture,
      ] of repeatedSegmentCenterFieldTextureCache) {
        if (!cacheKey.startsWith(repeatedFieldPrefix)) continue;
        cachedTexture.dispose();
        repeatedSegmentCenterFieldTextureCache.delete(cacheKey);
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(SEGMENT_FIELD_TEXTURE_READY_EVENT),
        );
      }
    };
    const generatedSegmentFieldTexture = (
      path: string,
      smoothField = false,
    ) => {
      const cacheKey = `${path}:${smoothField ? "smooth" : "quantized"}`;
      const cachedTexture = generatedSegmentFieldCache.get(cacheKey);
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
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      texture.generateMipmaps = false;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.flipY = false;
      texture.colorSpace = THREE.NoColorSpace;
      generatedSegmentFieldCache.set(cacheKey, texture);

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

        const readPixelId = (x: number, y: number) => {
          const flippedY = height - 1 - y;
          return pixels[(flippedY * width + x) * 4];
        };

        const ids = new Uint8Array(width * height);
        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) {
            ids[y * width + x] = readPixelId(x, y);
          }
        }

        const size = width * height;
        const wrapX = (x: number) => ((x % width) + width) % width;
        const wrapY = (y: number) => ((y % height) + height) % height;
        const indexAt = (x: number, y: number) => wrapY(y) * width + wrapX(x);
        const wrappedDelta = (delta: number, size: number) => {
          const half = size * 0.5;
          if (delta > half) return delta - size;
          if (delta < -half) return delta + size;
          return delta;
        };
        const componentId = new Int32Array(size);
        componentId.fill(-1);
        const unwrappedX = new Float32Array(size);
        const unwrappedY = new Float32Array(size);
        const queue = new Int32Array(size);
        const componentPixels: number[][] = [];
        const componentBoundaryPixels: number[][] = [];
        const componentCenterX: number[] = [];
        const componentCenterY: number[] = [];

        let nextComponent = 0;
        for (let start = 0; start < size; start += 1) {
          if (componentId[start] >= 0) continue;

          const startX = start % width;
          const startY = Math.floor(start / width);
          const targetId = ids[start];
          const pixelsInComponent: number[] = [];
          const boundaryPixels: number[] = [];
          let head = 0;
          let tail = 0;
          let sumX = 0;
          let sumY = 0;

          componentId[start] = nextComponent;
          unwrappedX[start] = startX + 0.5;
          unwrappedY[start] = startY + 0.5;
          queue[tail++] = start;

          while (head < tail) {
            const current = queue[head++];
            const x = current % width;
            const y = Math.floor(current / width);
            const baseX = unwrappedX[current];
            const baseY = unwrappedY[current];

            pixelsInComponent.push(current);
            sumX += baseX;
            sumY += baseY;

            let isBoundary = false;
            const neighbors = [
              [x - 1, y],
              [x + 1, y],
              [x, y - 1],
              [x, y + 1],
            ] as const;

            for (const [nxRaw, nyRaw] of neighbors) {
              const nx = wrapX(nxRaw);
              const ny = wrapY(nyRaw);
              const neighbor = indexAt(nx, ny);
              if (ids[neighbor] !== targetId) {
                isBoundary = true;
                continue;
              }
              if (componentId[neighbor] >= 0) continue;

              componentId[neighbor] = nextComponent;
              unwrappedX[neighbor] = baseX + wrappedDelta(nx - x, width);
              unwrappedY[neighbor] = baseY + wrappedDelta(ny - y, height);
              queue[tail++] = neighbor;
            }

            if (isBoundary) {
              boundaryPixels.push(current);
            }
          }

          componentPixels[nextComponent] = pixelsInComponent;
          componentBoundaryPixels[nextComponent] = boundaryPixels;
          const safeCount = Math.max(pixelsInComponent.length, 1);
          componentCenterX[nextComponent] = sumX / safeCount;
          componentCenterY[nextComponent] = sumY / safeCount;
          nextComponent += 1;
        }

        const cross = (
          ox: number,
          oy: number,
          ax: number,
          ay: number,
          bx: number,
          by: number,
        ) => (ax - ox) * (by - oy) - (ay - oy) * (bx - ox);
        const buildConvexHull = (points: Array<{ x: number; y: number }>) => {
          if (points.length <= 1) return points.slice();

          const sorted = [...points].sort((a, b) =>
            a.x === b.x ? a.y - b.y : a.x - b.x,
          );
          const lower: Array<{ x: number; y: number }> = [];
          for (const point of sorted) {
            while (
              lower.length >= 2 &&
              cross(
                lower[lower.length - 2].x,
                lower[lower.length - 2].y,
                lower[lower.length - 1].x,
                lower[lower.length - 1].y,
                point.x,
                point.y,
              ) <= 0
            ) {
              lower.pop();
            }
            lower.push(point);
          }

          const upper: Array<{ x: number; y: number }> = [];
          for (let i = sorted.length - 1; i >= 0; i -= 1) {
            const point = sorted[i];
            while (
              upper.length >= 2 &&
              cross(
                upper[upper.length - 2].x,
                upper[upper.length - 2].y,
                upper[upper.length - 1].x,
                upper[upper.length - 1].y,
                point.x,
                point.y,
              ) <= 0
            ) {
              upper.pop();
            }
            upper.push(point);
          }

          lower.pop();
          upper.pop();
          return lower.concat(upper);
        };
        const computePolygonCentroid = (
          points: Array<{ x: number; y: number }>,
        ) => {
          if (points.length === 0) {
            return { x: 0, y: 0 };
          }
          if (points.length < 3) {
            let sumX = 0;
            let sumY = 0;
            for (const point of points) {
              sumX += point.x;
              sumY += point.y;
            }
            return {
              x: sumX / points.length,
              y: sumY / points.length,
            };
          }

          let signedArea = 0;
          let centroidX = 0;
          let centroidY = 0;

          for (let i = 0; i < points.length; i += 1) {
            const current = points[i];
            const next = points[(i + 1) % points.length];
            const crossValue = current.x * next.y - next.x * current.y;
            signedArea += crossValue;
            centroidX += (current.x + next.x) * crossValue;
            centroidY += (current.y + next.y) * crossValue;
          }

          if (Math.abs(signedArea) <= 1e-6) {
            let sumX = 0;
            let sumY = 0;
            for (const point of points) {
              sumX += point.x;
              sumY += point.y;
            }
            return {
              x: sumX / points.length,
              y: sumY / points.length,
            };
          }

          const scale = 1 / (3 * signedArea);
          return {
            x: centroidX * scale,
            y: centroidY * scale,
          };
        };

        const field = new Uint8Array(size * 4);
        for (let component = 0; component < nextComponent; component += 1) {
          const pixelsInComponent = componentPixels[component] ?? [];
          const boundaryPixels = componentBoundaryPixels[component] ?? [];
          const centerX = componentCenterX[component];
          const centerY = componentCenterY[component];
          const uniqueBoundaryPoints = new Map<
            string,
            { x: number; y: number }
          >();

          for (const pixelIndex of boundaryPixels) {
            const centerX = unwrappedX[pixelIndex];
            const centerY = unwrappedY[pixelIndex];
            const corners = [
              { x: centerX - 0.5, y: centerY - 0.5 },
              { x: centerX + 0.5, y: centerY - 0.5 },
              { x: centerX + 0.5, y: centerY + 0.5 },
              { x: centerX - 0.5, y: centerY + 0.5 },
            ];

            for (const point of corners) {
              uniqueBoundaryPoints.set(`${point.x},${point.y}`, point);
            }
          }

          const hull = buildConvexHull([...uniqueBoundaryPoints.values()]);
          const hullCentroid =
            hull.length > 0
              ? computePolygonCentroid(hull)
              : { x: centerX, y: centerY };
          const quantizedCenterX = hullCentroid.x;
          const quantizedCenterY = hullCentroid.y;
          const edges: Array<{
            ax: number;
            ay: number;
            bx: number;
            by: number;
            nx: number;
            ny: number;
          }> = [];

          if (hull.length >= 2) {
            for (let i = 0; i < hull.length; i += 1) {
              const a = hull[i];
              const b = hull[(i + 1) % hull.length];
              const edgeX = b.x - a.x;
              const edgeY = b.y - a.y;
              const edgeLength = Math.hypot(edgeX, edgeY);
              if (edgeLength <= 1e-6) continue;

              let nx = -edgeY / edgeLength;
              let ny = edgeX / edgeLength;
              const midpointX = (a.x + b.x) * 0.5;
              const midpointY = (a.y + b.y) * 0.5;
              const towardCenter =
                (quantizedCenterX - midpointX) * nx +
                (quantizedCenterY - midpointY) * ny;
              if (towardCenter < 0) {
                nx *= -1;
                ny *= -1;
              }

              edges.push({
                ax: a.x,
                ay: a.y,
                bx: b.x,
                by: b.y,
                nx,
                ny,
              });
            }
          }

          const walls: Array<{
            nx: number;
            ny: number;
            c: number;
          }> = [];
          const EDGE_CLUSTER_THRESHOLD = 0.995;

          for (const edge of edges) {
            const matchingWall = walls.find(
              (wall) =>
                wall.nx * edge.nx + wall.ny * edge.ny > EDGE_CLUSTER_THRESHOLD,
            );

            const edgeSupport =
              (edge.ax * edge.nx +
                edge.ay * edge.ny +
                (edge.bx * edge.nx + edge.by * edge.ny)) *
              0.5;

            if (!matchingWall) {
              walls.push({
                nx: edge.nx,
                ny: edge.ny,
                c: edgeSupport,
              });
              continue;
            }

            const combinedNx = matchingWall.nx + edge.nx;
            const combinedNy = matchingWall.ny + edge.ny;
            const combinedLength = Math.hypot(combinedNx, combinedNy);
            if (combinedLength > 1e-6) {
              matchingWall.nx = combinedNx / combinedLength;
              matchingWall.ny = combinedNy / combinedLength;
            }
            matchingWall.c = (matchingWall.c + edgeSupport) * 0.5;
          }

          let maxDistance = 1e-6;
          const pixelDistances: number[] = new Array(
            pixelsInComponent.length,
          ).fill(0);
          const pixelWallIndices: number[] = new Array(
            pixelsInComponent.length,
          ).fill(-1);
          const pixelDirections: Array<{ x: number; y: number }> = new Array(
            pixelsInComponent.length,
          );

          for (let i = 0; i < pixelsInComponent.length; i += 1) {
            const pixelIndex = pixelsInComponent[i];
            const px = unwrappedX[pixelIndex];
            const py = unwrappedY[pixelIndex];

            if (smoothField) {
              const smoothDx = centerX - px;
              const smoothDy = centerY - py;
              const smoothLength = Math.hypot(smoothDx, smoothDy);
              pixelDirections[i] =
                smoothLength > 1e-6
                  ? {
                      x: smoothDx / smoothLength,
                      y: smoothDy / smoothLength,
                    }
                  : { x: 0, y: 0 };
              pixelDistances[i] = smoothLength;
              if (smoothLength > maxDistance) {
                maxDistance = smoothLength;
              }
              continue;
            }

            if (walls.length === 0) {
              pixelDirections[i] = { x: 0, y: 0 };
              pixelDistances[i] = 0;
              pixelWallIndices[i] = -1;
              continue;
            }

            const toCenterX = quantizedCenterX - px;
            const toCenterY = quantizedCenterY - py;
            const toCenterLength = Math.hypot(toCenterX, toCenterY);
            const centerDirX =
              toCenterLength > 1e-6 ? toCenterX / toCenterLength : 0;
            const centerDirY =
              toCenterLength > 1e-6 ? toCenterY / toCenterLength : 0;

            let bestWall = walls[0];
            let bestAlignment =
              centerDirX * bestWall.nx + centerDirY * bestWall.ny;
            let bestDistance = Math.max(
              0,
              px * bestWall.nx + py * bestWall.ny - bestWall.c,
            );

            for (let wallIndex = 1; wallIndex < walls.length; wallIndex += 1) {
              const wall = walls[wallIndex];
              const wallAlignment = centerDirX * wall.nx + centerDirY * wall.ny;
              const wallDistance = Math.max(
                0,
                px * wall.nx + py * wall.ny - wall.c,
              );
              if (
                wallAlignment > bestAlignment + 1e-4 ||
                (Math.abs(wallAlignment - bestAlignment) <= 1e-4 &&
                  wallDistance < bestDistance)
              ) {
                bestWall = wall;
                bestAlignment = wallAlignment;
                bestDistance = wallDistance;
              }
            }

            pixelWallIndices[i] = walls.indexOf(bestWall);
            pixelDirections[i] = {
              x: bestWall.nx,
              y: bestWall.ny,
            };
            const distance = bestDistance;
            pixelDistances[i] = distance;
            if (distance > maxDistance) {
              maxDistance = distance;
            }
          }

          for (let i = 0; i < pixelsInComponent.length; i += 1) {
            const pixelIndex = pixelsInComponent[i];
            const px = pixelIndex * 4;
            const direction = pixelDirections[i] ?? { x: 0, y: 0 };
            const normalizedDistance = THREE.MathUtils.clamp(
              pixelDistances[i] / maxDistance,
              0,
              1,
            );

            field[px] = Math.round((direction.x * 0.5 + 0.5) * 255);
            field[px + 1] = Math.round((direction.y * 0.5 + 0.5) * 255);
            field[px + 2] = Math.round(normalizedDistance * 255);
            field[px + 3] = 255;
          }
        }

        texture.image = { data: field, width, height };
        texture.needsUpdate = true;
        setSegmentFieldRevision((value) => value + 1);
        invalidateRepeatedFieldTextures(path);
      });

      return texture;
    };
    const generatedSegmentCenterFieldTexture = (path: string) => {
      const cachedTexture = generatedSegmentCenterFieldCache.get(path);
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
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      texture.generateMipmaps = false;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.flipY = false;
      texture.colorSpace = THREE.NoColorSpace;
      generatedSegmentCenterFieldCache.set(path, texture);

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

        const readPixelId = (x: number, y: number) => {
          const flippedY = height - 1 - y;
          return pixels[(flippedY * width + x) * 4];
        };

        const ids = new Uint8Array(width * height);
        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) {
            ids[y * width + x] = readPixelId(x, y);
          }
        }

        const size = width * height;
        const componentId = new Int32Array(size);
        componentId.fill(-1);
        const componentCentersX: number[] = [];
        const componentCentersY: number[] = [];
        const queue = new Int32Array(size);

        const indexAt = (x: number, y: number) => y * width + x;

        let nextComponent = 0;
        for (let start = 0; start < size; start += 1) {
          if (componentId[start] >= 0) continue;

          const targetId = ids[start];
          let head = 0;
          let tail = 0;
          let sumX = 0;
          let sumY = 0;
          let count = 0;

          componentId[start] = nextComponent;
          queue[tail++] = start;

          while (head < tail) {
            const current = queue[head++];
            const x = current % width;
            const y = Math.floor(current / width);

            sumX += x + 0.5;
            sumY += y + 0.5;
            count += 1;

            if (x > 0) {
              const left = indexAt(x - 1, y);
              if (componentId[left] < 0 && ids[left] === targetId) {
                componentId[left] = nextComponent;
                queue[tail++] = left;
              }
            }
            if (x + 1 < width) {
              const right = indexAt(x + 1, y);
              if (componentId[right] < 0 && ids[right] === targetId) {
                componentId[right] = nextComponent;
                queue[tail++] = right;
              }
            }
            if (y > 0) {
              const down = indexAt(x, y - 1);
              if (componentId[down] < 0 && ids[down] === targetId) {
                componentId[down] = nextComponent;
                queue[tail++] = down;
              }
            }
            if (y + 1 < height) {
              const up = indexAt(x, y + 1);
              if (componentId[up] < 0 && ids[up] === targetId) {
                componentId[up] = nextComponent;
                queue[tail++] = up;
              }
            }
          }

          const safeCount = Math.max(count, 1);
          componentCentersX[nextComponent] = sumX / safeCount;
          componentCentersY[nextComponent] = sumY / safeCount;
          nextComponent += 1;
        }

        const field = new Uint8Array(width * height * 4);
        for (let i = 0; i < size; i += 1) {
          const component = componentId[i];
          const x = (i % width) + 0.5;
          const y = Math.floor(i / width) + 0.5;
          const dx = componentCentersX[component] - x;
          const dy = componentCentersY[component] - y;
          const length = Math.hypot(dx, dy);
          const dirX = length > 0.0001 ? dx / length : 0;
          const dirY = length > 0.0001 ? dy / length : 0;
          const px = i * 4;

          field[px] = Math.round((dirX * 0.5 + 0.5) * 255);
          field[px + 1] = Math.round((dirY * 0.5 + 0.5) * 255);
          field[px + 2] = 0;
          field[px + 3] = 255;
        }

        texture.image = { data: field, width, height };
        texture.needsUpdate = true;
        setSegmentFieldRevision((value) => value + 1);
        invalidateRepeatedFieldTextures(path);
      });

      return texture;
    };
    const generatedWrappedSegmentCenterFieldTexture = (path: string) => {
      const cachedTexture = generatedWrappedSegmentCenterFieldCache.get(path);
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
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      texture.generateMipmaps = false;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.flipY = false;
      texture.colorSpace = THREE.NoColorSpace;
      generatedWrappedSegmentCenterFieldCache.set(path, texture);

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

        const size = width * height;
        const readPixelId = (x: number, y: number) => {
          const flippedY = height - 1 - y;
          return pixels[(flippedY * width + x) * 4];
        };
        const ids = new Uint8Array(size);
        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) {
            ids[y * width + x] = readPixelId(x, y);
          }
        }

        const wrapX = (x: number) => ((x % width) + width) % width;
        const wrapY = (y: number) => ((y % height) + height) % height;
        const indexAt = (x: number, y: number) => wrapY(y) * width + wrapX(x);
        const wrappedDelta = (delta: number, span: number) => {
          const half = span * 0.5;
          if (delta > half) return delta - span;
          if (delta < -half) return delta + span;
          return delta;
        };

        const componentId = new Int32Array(size);
        componentId.fill(-1);
        const unwrappedX = new Float32Array(size);
        const unwrappedY = new Float32Array(size);
        const centerX: number[] = [];
        const centerY: number[] = [];
        const queue = new Int32Array(size);

        let nextComponent = 0;
        for (let start = 0; start < size; start += 1) {
          if (componentId[start] >= 0) continue;

          const startX = start % width;
          const startY = Math.floor(start / width);
          const targetId = ids[start];
          let head = 0;
          let tail = 0;
          let sumX = 0;
          let sumY = 0;
          let count = 0;

          componentId[start] = nextComponent;
          unwrappedX[start] = startX + 0.5;
          unwrappedY[start] = startY + 0.5;
          queue[tail++] = start;

          while (head < tail) {
            const current = queue[head++];
            const x = current % width;
            const y = Math.floor(current / width);
            const baseX = unwrappedX[current];
            const baseY = unwrappedY[current];

            sumX += baseX;
            sumY += baseY;
            count += 1;

            const neighbors = [
              [x - 1, y],
              [x + 1, y],
              [x, y - 1],
              [x, y + 1],
            ] as const;

            for (const [nxRaw, nyRaw] of neighbors) {
              const nx = wrapX(nxRaw);
              const ny = wrapY(nyRaw);
              const neighbor = indexAt(nx, ny);
              if (componentId[neighbor] >= 0 || ids[neighbor] !== targetId) {
                continue;
              }

              componentId[neighbor] = nextComponent;
              unwrappedX[neighbor] = baseX + wrappedDelta(nx - x, width);
              unwrappedY[neighbor] = baseY + wrappedDelta(ny - y, height);
              queue[tail++] = neighbor;
            }
          }

          const safeCount = Math.max(count, 1);
          centerX[nextComponent] = sumX / safeCount;
          centerY[nextComponent] = sumY / safeCount;
          nextComponent += 1;
        }

        const field = new Uint8Array(size * 4);
        for (let i = 0; i < size; i += 1) {
          const component = componentId[i];
          const dx = centerX[component] - unwrappedX[i];
          const dy = centerY[component] - unwrappedY[i];
          const length = Math.hypot(dx, dy);
          const dirX = length > 0.0001 ? dx / length : 0;
          const dirY = length > 0.0001 ? dy / length : 0;
          const px = i * 4;

          field[px] = Math.round((dirX * 0.5 + 0.5) * 255);
          field[px + 1] = Math.round((dirY * 0.5 + 0.5) * 255);
          field[px + 2] = 0;
          field[px + 3] = 255;
        }

        texture.image = { data: field, width, height };
        texture.needsUpdate = true;
        setSegmentFieldRevision((value) => value + 1);
        invalidateRepeatedFieldTextures(path);
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
          v = 1 - (pz + halfDepth) / uvReference.depth;
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
        displayTarget: THREE.WebGLRenderTarget;
      }
    >();

    const normalMaterial = new THREE.MeshNormalMaterial();
    const worldNormalMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vWorldNormal;

        void main() {
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vWorldNormal;

        void main() {
          gl_FragColor = vec4(normalize(vWorldNormal) * 0.5 + 0.5, 1.0);
        }
      `,
    });
    const worldTangentMaterial = new THREE.ShaderMaterial({
      extensions: {
        derivatives: true,
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying vec3 vWorldNormal;
        varying vec2 vSurfaceUv;

        void main() {
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          vSurfaceUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vWorldPosition;
        varying vec3 vWorldNormal;
        varying vec2 vSurfaceUv;

        void main() {
          vec3 dp1 = dFdx(vWorldPosition);
          vec3 dp2 = dFdy(vWorldPosition);
          vec2 duv1 = dFdx(vSurfaceUv);
          vec2 duv2 = dFdy(vSurfaceUv);
          vec3 n = normalize(vWorldNormal);

          vec3 dp2perp = cross(dp2, n);
          vec3 dp1perp = cross(n, dp1);
          vec3 tangent = dp2perp * duv1.x + dp1perp * duv2.x;
          vec3 bitangent = dp2perp * duv1.y + dp1perp * duv2.y;

          float invmax = inversesqrt(max(dot(tangent, tangent), dot(bitangent, bitangent)));
          tangent = normalize(tangent * invmax);

          gl_FragColor = vec4(tangent * 0.5 + 0.5, 1.0);
        }
      `,
    });
    const worldPositionMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vWorldPosition;

        void main() {
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vWorldPosition;

        void main() {
          gl_FragColor = vec4(vWorldPosition, 1.0);
        }
      `,
    });
    const occlusionDepthMaterial = new THREE.MeshBasicMaterial({
      color: "#000000",
    });
    occlusionDepthMaterial.colorWrite = false;
    const viewTangentMaterial = new THREE.ShaderMaterial({
      extensions: {
        derivatives: true,
      },
      vertexShader: `
        varying vec3 vViewPosition;
        varying vec3 vViewNormal;
        varying vec2 vSurfaceUv;

        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = mvPosition.xyz;
          vViewNormal = normalize(normalMatrix * normal);
          vSurfaceUv = uv;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vViewPosition;
        varying vec3 vViewNormal;
        varying vec2 vSurfaceUv;

        void main() {
          vec3 dp1 = dFdx(vViewPosition);
          vec3 dp2 = dFdy(vViewPosition);
          vec2 duv1 = dFdx(vSurfaceUv);
          vec2 duv2 = dFdy(vSurfaceUv);
          vec3 n = normalize(vViewNormal);

          vec3 dp2perp = cross(dp2, n);
          vec3 dp1perp = cross(n, dp1);
          vec3 tangent = dp2perp * duv1.x + dp1perp * duv2.x;
          vec3 bitangent = dp2perp * duv1.y + dp1perp * duv2.y;

          float invmax = inversesqrt(max(dot(tangent, tangent), dot(bitangent, bitangent)));
          tangent = normalize(tangent * invmax);

          gl_FragColor = vec4(tangent * 0.5 + 0.5, 1.0);
        }
      `,
    });
    const depthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.BasicDepthPacking,
    });
    const lightMaskMaterial = new THREE.MeshLambertMaterial({
      color: "#ffffff",
    });
    const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const postScene = new THREE.Scene();
    const upscaleScene = new THREE.Scene();
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
    const segmentScreenFieldMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tSegments: { value: null },
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
        uniform sampler2D tObjectIds;
        uniform vec2 texelSize;

        varying vec2 vUv;

        float sampleSegment(vec2 uv) {
          return texture2D(tSegments, uv).r;
        }

        float sampleObjectId(vec2 uv) {
          return texture2D(tObjectIds, uv).r;
        }

        float sameCell(vec2 uv, float segC, float objC) {
          float seg = sampleSegment(uv);
          float obj = sampleObjectId(uv);
          float sameSeg = 1.0 - step(0.0001, abs(seg - segC));
          float sameObj = 1.0 - step(0.0001, abs(obj - objC));
          return sameSeg * sameObj;
        }

        float marchDistance(vec2 dir, float segC, float objC) {
          float distance = 0.0;
          for (int i = 1; i <= 48; i++) {
            vec2 sampleUv = vUv + dir * texelSize * float(i);
            float inBounds =
              step(0.0, sampleUv.x) *
              step(0.0, sampleUv.y) *
              step(sampleUv.x, 1.0) *
              step(sampleUv.y, 1.0);
            if (inBounds < 0.5 || sameCell(sampleUv, segC, objC) < 0.5) {
              break;
            }
            distance = float(i);
          }
          return distance;
        }

        void main() {
          float segC = sampleSegment(vUv);
          float objC = sampleObjectId(vUv);
          if (objC < 0.0001) {
            gl_FragColor = vec4(0.5, 0.5, 0.0, 1.0);
            return;
          }

          float left = marchDistance(vec2(-1.0, 0.0), segC, objC);
          float right = marchDistance(vec2(1.0, 0.0), segC, objC);
          float down = marchDistance(vec2(0.0, -1.0), segC, objC);
          float up = marchDistance(vec2(0.0, 1.0), segC, objC);

          vec2 dir = vec2(right - left, up - down);
          float len = length(dir);
          vec2 encoded = len > 0.0001 ? dir / len * 0.5 + 0.5 : vec2(0.5);
          gl_FragColor = vec4(encoded, 0.0, 1.0);
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
        inputIsSRGB: { value: 0 },
        maskLightMarkersByColor: { value: 0 },
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
        uniform float inputIsSRGB;
        uniform float maskLightMarkersByColor;

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

        float isLightMarkerId(float id) {
          return (1.0 - step(0.0001, abs(id - ${ (0x19 / 255).toFixed(6) }))) +
            (1.0 - step(0.0001, abs(id - ${ (0x29 / 255).toFixed(6) }))) +
            (1.0 - step(0.0001, abs(id - ${ (0x39 / 255).toFixed(6) })));
        }

        float matchesLightMarkerColor(vec3 color) {
          vec3 markerA = vec3(1.0, 0.107023, 0.152926);
          vec3 markerB = vec3(0.111932, 0.822786, 0.715694);
          vec3 markerC = vec3(0.964686, 0.745404, 0.032983);
          float threshold = 0.08;
          return 1.0 - step(
            threshold,
            min(
              min(length(color - markerA), length(color - markerB)),
              length(color - markerC)
            )
          );
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

        vec3 sRGBToLinear(vec3 color) {
          vec3 cutoff = step(color, vec3(0.04045));
          vec3 lower = color / 12.92;
          vec3 upper = pow((max(color, vec3(0.0)) + 0.055) / 1.055, vec3(2.4));
          return mix(upper, lower, cutoff);
        }

        void main() {
          vec3 color = texture2D(tColor, vUv).rgb;
          if (inputIsSRGB > 0.5) {
            color = sRGBToLinear(color);
          }
          if (
            maskLightMarkersByColor > 0.5 &&
            matchesLightMarkerColor(color) > 0.5
          ) {
            gl_FragColor = vec4(linearToSRGB(clamp(color, 0.0, 1.0)), 1.0);
            return;
          }

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
          float marker_c = clamp(isLightMarkerId(id_c), 0.0, 1.0);
          float marker_t = clamp(isLightMarkerId(id_t), 0.0, 1.0);
          float marker_b = clamp(isLightMarkerId(id_b), 0.0, 1.0);
          float marker_l = clamp(isLightMarkerId(id_l), 0.0, 1.0);
          float marker_r = clamp(isLightMarkerId(id_r), 0.0, 1.0);

          if (marker_c > 0.5) {
            gl_FragColor = vec4(linearToSRGB(clamp(color, 0.0, 1.0)), 1.0);
            return;
          }

          float disc_t = step(0.0001, abs(id_t - id_c)) * (1.0 - max(marker_c, marker_t));
          float disc_b = step(0.0001, abs(id_b - id_c)) * (1.0 - max(marker_c, marker_b));
          float disc_l = step(0.0001, abs(id_l - id_c)) * (1.0 - max(marker_c, marker_l));
          float disc_r = step(0.0001, abs(id_r - id_c)) * (1.0 - max(marker_c, marker_r));

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
          ) * (1.0 - marker_c);

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
        tSegmentField: { value: null },
        tParticipation: { value: null },
        texelSize: { value: new THREE.Vector2(1, 1) },
        fieldUnderlay: { value: segmentFieldUnderlay },
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
        uniform sampler2D tParticipation;
        uniform vec2 texelSize;
        uniform float fieldUnderlay;

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
          vec2 uvLeft = clamp(vUv + vec2(-texelSize.x, 0.0), vec2(0.0), vec2(1.0));
          vec2 uvRight = clamp(vUv + vec2(texelSize.x, 0.0), vec2(0.0), vec2(1.0));
          vec2 uvUp = clamp(vUv + vec2(0.0, texelSize.y), vec2(0.0), vec2(1.0));
          vec2 uvDown = clamp(vUv + vec2(0.0, -texelSize.y), vec2(0.0), vec2(1.0));

          float blue = sampleBlue(vUv);
          float blueLeft = sampleBlue(uvLeft);
          float blueRight = sampleBlue(uvRight);
          float blueUp = sampleBlue(uvUp);
          float blueDown = sampleBlue(uvDown);

          float inset = (1.0 - step(0.0001, blue)) * step(
            0.0001,
            max(max(blueLeft, blueRight), max(blueUp, blueDown))
          );
          float participation = texture2D(tParticipation, vUv).r;

          if (max(participation, inset) < 0.0001) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            return;
          }

          vec3 fieldColor = vec3(texture2D(tSegmentField, vUv).xy, 0.0);
          vec3 result = fieldColor * fieldUnderlay * participation;
          result = mix(result, fieldColor, inset);

          gl_FragColor = vec4(linearToSRGB(clamp(result, 0.0, 1.0)), 1.0);
        }
      `,
    });
    const segmentFieldDisplayMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tSegmentField: { value: null },
        tParticipation: { value: null },
      },
      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tSegmentField;
        uniform sampler2D tParticipation;

        varying vec2 vUv;

        vec3 linearToSRGB(vec3 color) {
          vec3 cutoff = step(color, vec3(0.0031308));
          vec3 lower = color * 12.92;
          vec3 upper = 1.055 * pow(max(color, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
          return mix(upper, lower, cutoff);
        }

        void main() {
          float participation = texture2D(tParticipation, vUv).r;
          if (participation < 0.0001) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            return;
          }

          vec3 fieldColor = vec3(texture2D(tSegmentField, vUv).xy, 0.0);
          gl_FragColor = vec4(linearToSRGB(clamp(fieldColor, 0.0, 1.0)), 1.0);
        }
      `,
    });
    const segmentInsetMaskMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tSegmentMask: { value: null },
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
        uniform sampler2D tSegmentMask;
        uniform vec2 texelSize;

        varying vec2 vUv;

        float sampleBlue(vec2 uv) {
          return texture2D(tSegmentMask, uv).b;
        }

        void main() {
          float segmentC = sampleBlue(vUv);
          float segmentL = sampleBlue(clamp(vUv + vec2(-texelSize.x, 0.0), vec2(0.0), vec2(1.0)));
          float segmentR = sampleBlue(clamp(vUv + vec2(texelSize.x, 0.0), vec2(0.0), vec2(1.0)));
          float segmentU = sampleBlue(clamp(vUv + vec2(0.0, texelSize.y), vec2(0.0), vec2(1.0)));
          float segmentD = sampleBlue(clamp(vUv + vec2(0.0, -texelSize.y), vec2(0.0), vec2(1.0)));

          float inset = (1.0 - step(0.0001, segmentC)) * step(
            0.0001,
            max(max(segmentL, segmentR), max(segmentU, segmentD))
          );

          gl_FragColor = vec4(inset, 0.0, max(segmentC, inset), 1.0);
        }
      `,
    });
    const segmentIndentedNormalMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: null },
        tSegmentMask: { value: null },
        tSegmentField: { value: null },
        tNormals: { value: null },
        tTangents: { value: null },
        texelSize: { value: new THREE.Vector2(1, 1) },
        directionStrength: { value: insetDirectionStrength },
        baseNormalWeight: { value: insetBaseNormalWeight },
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
        uniform sampler2D tNormals;
        uniform sampler2D tTangents;
        uniform vec2 texelSize;
        uniform float directionStrength;
        uniform float baseNormalWeight;

        varying vec2 vUv;

        float sampleBlue(vec2 uv) {
          return texture2D(tSegmentMask, uv).b;
        }

        vec3 sampleNormal(vec2 uv) {
          return normalize(texture2D(tNormals, uv).xyz * 2.0 - 1.0);
        }

        vec3 sampleTangent(vec2 uv) {
          return normalize(texture2D(tTangents, uv).xyz * 2.0 - 1.0);
        }

        vec3 linearToSRGB(vec3 color) {
          vec3 cutoff = step(color, vec3(0.0031308));
          vec3 lower = color * 12.92;
          vec3 upper = 1.055 * pow(max(color, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
          return mix(upper, lower, cutoff);
        }

        void main() {
          vec3 color = texture2D(tColor, vUv).rgb;
          vec2 uvLeft = clamp(vUv + vec2(-texelSize.x, 0.0), vec2(0.0), vec2(1.0));
          vec2 uvRight = clamp(vUv + vec2(texelSize.x, 0.0), vec2(0.0), vec2(1.0));
          vec2 uvUp = clamp(vUv + vec2(0.0, texelSize.y), vec2(0.0), vec2(1.0));
          vec2 uvDown = clamp(vUv + vec2(0.0, -texelSize.y), vec2(0.0), vec2(1.0));

          float blue = sampleBlue(vUv);
          float blueLeft = sampleBlue(uvLeft);
          float blueRight = sampleBlue(uvRight);
          float blueUp = sampleBlue(uvUp);
          float blueDown = sampleBlue(uvDown);

          float inset = (1.0 - step(0.0001, blue)) * step(
            0.0001,
            max(max(blueLeft, blueRight), max(blueUp, blueDown))
          );

          vec2 fieldDirection = -(texture2D(tSegmentField, vUv).xy * 2.0 - 1.0);
          vec3 baseNormal = sampleNormal(vUv);
          vec3 tangent = sampleTangent(vUv);
          tangent = normalize(tangent - baseNormal * dot(baseNormal, tangent));
          if (length(tangent) < 0.0001) {
            tangent = normalize(cross(vec3(0.0, 1.0, 0.0), baseNormal));
          }
          vec3 bitangent = normalize(cross(baseNormal, tangent));
          if (length(bitangent) < 0.0001) {
            bitangent = normalize(cross(tangent, baseNormal));
          }
          vec3 insetNormal = normalize(
            tangent * fieldDirection.x +
            bitangent * fieldDirection.y +
            baseNormal * baseNormalWeight
          );
          vec3 derivedNormal = normalize(
            mix(baseNormal, insetNormal, clamp(directionStrength, 0.0, 1.0))
          );

          vec3 preview = derivedNormal * 0.5 + 0.5;
          vec3 result = mix(color, preview, inset);
          gl_FragColor = vec4(linearToSRGB(clamp(result, 0.0, 1.0)), 1.0);
        }
      `,
    });
    const segmentIndentedLitMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: null },
        tSegmentMask: { value: null },
        tSegmentField: { value: null },
        tNormals: { value: null },
        tTangents: { value: null },
        texelSize: { value: new THREE.Vector2(1, 1) },
        lightDirection: { value: new THREE.Vector3(0.6, 0.6, 0.4) },
        directionStrength: { value: insetDirectionStrength },
        baseNormalWeight: { value: insetBaseNormalWeight },
        litThreshold: { value: insetLitThreshold },
        litFalloff: { value: insetLitFalloff },
        bevelStrength: { value: insetBevelStrength },
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
        uniform sampler2D tNormals;
        uniform sampler2D tTangents;
        uniform vec2 texelSize;
        uniform vec3 lightDirection;
        uniform float directionStrength;
        uniform float baseNormalWeight;
        uniform float litThreshold;
        uniform float litFalloff;
        uniform float bevelStrength;

        varying vec2 vUv;

        float sampleBlue(vec2 uv) {
          return texture2D(tSegmentMask, uv).b;
        }

        vec3 sampleNormal(vec2 uv) {
          return normalize(texture2D(tNormals, uv).xyz * 2.0 - 1.0);
        }

        vec3 sampleTangent(vec2 uv) {
          return normalize(texture2D(tTangents, uv).xyz * 2.0 - 1.0);
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

          vec2 bevelDirection = -(texture2D(tSegmentField, vUv).xy * 2.0 - 1.0);
          vec3 baseNormal = sampleNormal(vUv);
          vec3 tangent = sampleTangent(vUv);
          tangent = normalize(tangent - baseNormal * dot(baseNormal, tangent));
          if (length(tangent) < 0.0001) {
            tangent = normalize(cross(vec3(0.0, 1.0, 0.0), baseNormal));
          }
          vec3 bitangent = normalize(cross(baseNormal, tangent));
          if (length(bitangent) < 0.0001) {
            bitangent = normalize(cross(tangent, baseNormal));
          }
          float bevelMask = inset;
          vec3 bevelNormal = normalize(
            tangent * bevelDirection.x * directionStrength +
            bitangent * bevelDirection.y * directionStrength +
            baseNormal * baseNormalWeight
          );

          float bevelLight = clamp(dot(bevelNormal, lightDir), 0.0, 1.0);
          float bevelLit = smoothstep(
            max(0.0, litThreshold - litFalloff),
            litThreshold,
            bevelLight
          );
          float magenta = bevelMask * bevelLit * bevelStrength;
          float bevelShadow = bevelMask * (1.0 - bevelLit) * bevelStrength;

          vec3 shadedBase = color * mix(1.0, 0.65, bevelShadow);
          vec3 overlay = vec3(magenta, 0.0, max(blue, magenta));
          gl_FragColor = vec4(
            linearToSRGB(clamp(shadedBase + overlay, 0.0, 1.0)),
            1.0
          );
        }
      `,
    });
    const segmentIndentedAppliedMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: null },
        tSegmentMask: { value: null },
        tSegmentField: { value: null },
        tNormals: { value: null },
        tTangents: { value: null },
        texelSize: { value: new THREE.Vector2(1, 1) },
        lightDirection: { value: new THREE.Vector3(0.6, 0.6, 0.4) },
        directionStrength: { value: insetDirectionStrength },
        baseNormalWeight: { value: insetBaseNormalWeight },
        litThreshold: { value: insetLitThreshold },
        litFalloff: { value: insetLitFalloff },
        bevelStrength: { value: insetBevelStrength },
        darkenStrength: { value: insetDarkenStrength },
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
        uniform sampler2D tNormals;
        uniform sampler2D tTangents;
        uniform vec2 texelSize;
        uniform vec3 lightDirection;
        uniform float directionStrength;
        uniform float baseNormalWeight;
        uniform float litThreshold;
        uniform float litFalloff;
        uniform float bevelStrength;
        uniform float darkenStrength;

        varying vec2 vUv;

        float sampleBlue(vec2 uv) {
          return texture2D(tSegmentMask, uv).b;
        }

        vec3 sampleNormal(vec2 uv) {
          return normalize(texture2D(tNormals, uv).xyz * 2.0 - 1.0);
        }

        vec3 sampleTangent(vec2 uv) {
          return normalize(texture2D(tTangents, uv).xyz * 2.0 - 1.0);
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

          vec2 bevelDirection = -(texture2D(tSegmentField, vUv).xy * 2.0 - 1.0);
          vec3 baseNormal = sampleNormal(vUv);
          vec3 tangent = sampleTangent(vUv);
          tangent = normalize(tangent - baseNormal * dot(baseNormal, tangent));
          if (length(tangent) < 0.0001) {
            tangent = normalize(cross(vec3(0.0, 1.0, 0.0), baseNormal));
          }
          vec3 bitangent = normalize(cross(baseNormal, tangent));
          if (length(bitangent) < 0.0001) {
            bitangent = normalize(cross(tangent, baseNormal));
          }
          vec3 bevelNormal = normalize(
            tangent * bevelDirection.x * directionStrength +
            bitangent * bevelDirection.y * directionStrength +
            baseNormal * baseNormalWeight
          );

          float bevelLight = clamp(dot(bevelNormal, lightDir), 0.0, 1.0);
          float magenta = inset * smoothstep(
            max(0.0, litThreshold - litFalloff),
            litThreshold,
            bevelLight
          );
          vec3 litColor = min(
            color * (1.0 + 0.55 * magenta * bevelStrength),
            vec3(1.0)
          );
          vec3 result = mix(litColor, litColor * darkenStrength, blue);
          gl_FragColor = vec4(linearToSRGB(clamp(result, 0.0, 1.0)), 1.0);
        }
      `,
    });
    const segmentIndentedAppliedPointLightsMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: null },
        tSegmentMask: { value: null },
        tParticipation: { value: null },
        tSegmentField: { value: null },
        tNormals: { value: null },
        tTangents: { value: null },
        tWorldPosition: { value: null },
        texelSize: { value: new THREE.Vector2(1, 1) },
        directionStrength: { value: insetDirectionStrength },
        baseNormalWeight: { value: insetBaseNormalWeight },
        litThreshold: { value: insetLitThreshold },
        litFalloff: { value: insetLitFalloff },
        bevelStrength: { value: insetBevelStrength },
        darkenStrength: { value: insetDarkenStrength },
        pointLightA: { value: new THREE.Vector3() },
        pointLightB: { value: new THREE.Vector3() },
        pointLightC: { value: new THREE.Vector3() },
        pointColorA: { value: new THREE.Color("#ff6b6b") },
        pointColorB: { value: new THREE.Color("#5eead4") },
        pointColorC: { value: new THREE.Color("#fde047") },
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
          uniform sampler2D tParticipation;
          uniform sampler2D tSegmentField;
          uniform sampler2D tNormals;
          uniform sampler2D tTangents;
          uniform sampler2D tWorldPosition;
          uniform vec2 texelSize;
          uniform float directionStrength;
          uniform float baseNormalWeight;
          uniform float litThreshold;
          uniform float litFalloff;
          uniform float bevelStrength;
          uniform float darkenStrength;
          uniform vec3 pointLightA;
          uniform vec3 pointLightB;
          uniform vec3 pointLightC;
          uniform vec3 pointColorA;
          uniform vec3 pointColorB;
          uniform vec3 pointColorC;

          varying vec2 vUv;

          float sampleBlue(vec2 uv) {
            return texture2D(tSegmentMask, uv).b;
          }

          float sampleParticipation(vec2 uv) {
            return texture2D(tParticipation, uv).r;
          }

          vec3 sampleNormal(vec2 uv) {
            return normalize(texture2D(tNormals, uv).xyz * 2.0 - 1.0);
          }

          vec3 sampleTangent(vec2 uv) {
            return normalize(texture2D(tTangents, uv).xyz * 2.0 - 1.0);
          }

          vec3 sampleWorldPosition(vec2 uv) {
            return texture2D(tWorldPosition, uv).xyz;
          }

          vec3 linearToSRGB(vec3 color) {
            vec3 cutoff = step(color, vec3(0.0031308));
            vec3 lower = color * 12.92;
            vec3 upper = 1.055 * pow(max(color, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
            return mix(upper, lower, cutoff);
          }

          vec3 pointContribution(
            vec3 worldPosition,
            vec3 bevelNormal,
            vec3 lightPosition,
            vec3 lightColor
          ) {
            vec3 toLight = lightPosition - worldPosition;
            float distanceToLight = length(toLight);
            if (distanceToLight < 0.0001) return vec3(0.0);
            vec3 lightDir = toLight / distanceToLight;
            float ndl = clamp(dot(bevelNormal, lightDir), 0.0, 1.0);
            float thresholdMask = smoothstep(
              max(0.0, litThreshold - litFalloff),
              litThreshold,
              ndl
            );
            float attenuation =
              1.0 / (1.0 + distanceToLight * distanceToLight * 0.22);
            return lightColor * attenuation * thresholdMask * ndl;
          }

          void main() {
            vec3 color = texture2D(tColor, vUv).rgb;
            float participation = step(0.0001, sampleParticipation(vUv));
            float blue = sampleBlue(vUv) * participation;

            vec2 uvLeft = clamp(vUv + vec2(-texelSize.x, 0.0), vec2(0.0), vec2(1.0));
            vec2 uvRight = clamp(vUv + vec2(texelSize.x, 0.0), vec2(0.0), vec2(1.0));
            vec2 uvUp = clamp(vUv + vec2(0.0, texelSize.y), vec2(0.0), vec2(1.0));
            vec2 uvDown = clamp(vUv + vec2(0.0, -texelSize.y), vec2(0.0), vec2(1.0));

            float blueLeft =
              sampleBlue(uvLeft) * step(0.0001, sampleParticipation(uvLeft));
            float blueRight =
              sampleBlue(uvRight) * step(0.0001, sampleParticipation(uvRight));
            float blueUp =
              sampleBlue(uvUp) * step(0.0001, sampleParticipation(uvUp));
            float blueDown =
              sampleBlue(uvDown) * step(0.0001, sampleParticipation(uvDown));

            float inset = (1.0 - step(0.0001, blue))
              * step(0.0001, max(max(blueLeft, blueRight), max(blueUp, blueDown)));

            vec2 bevelDirection = -(texture2D(tSegmentField, vUv).xy * 2.0 - 1.0);
            vec3 baseNormal = sampleNormal(vUv);
            vec3 tangent = sampleTangent(vUv);
            tangent = normalize(tangent - baseNormal * dot(baseNormal, tangent));
            if (length(tangent) < 0.0001) {
              tangent = normalize(cross(vec3(0.0, 1.0, 0.0), baseNormal));
            }
            vec3 bitangent = normalize(cross(baseNormal, tangent));
            if (length(bitangent) < 0.0001) {
              bitangent = normalize(cross(tangent, baseNormal));
            }
            vec3 bevelNormal = normalize(
              tangent * bevelDirection.x * directionStrength +
              bitangent * bevelDirection.y * directionStrength +
              baseNormal * baseNormalWeight
            );

            vec3 worldPosition = sampleWorldPosition(vUv);
            vec3 lightTint = pointContribution(
              worldPosition,
              bevelNormal,
              pointLightA,
              pointColorA
            );
            lightTint += pointContribution(
              worldPosition,
              bevelNormal,
              pointLightB,
              pointColorB
            );
            lightTint += pointContribution(
              worldPosition,
              bevelNormal,
              pointLightC,
              pointColorC
            );

            vec3 litColor = min(
              color +
                color * lightTint * inset * bevelStrength * 4.0,
              vec3(1.0)
            );
            vec3 result = mix(litColor, litColor * darkenStrength, blue);
            gl_FragColor = vec4(linearToSRGB(clamp(result, 0.0, 1.0)), 1.0);
          }
        `,
    });
    const segmentBakedNormalMapTexturePreviewMaterial =
      new THREE.ShaderMaterial({
        uniforms: {
          tField: {
            value: generatedSegmentFieldTexture(selectedSegmentTexture.path),
          },
          normalStrength: { value: BAKED_NORMAL_MAP_STRENGTH },
        },
        vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
        fragmentShader: `
        uniform sampler2D tField;
        uniform float normalStrength;

        varying vec2 vUv;

        void main() {
          vec2 direction = texture2D(tField, vUv).xy * 2.0 - 1.0;
          vec2 xy = direction * normalStrength;
          float z = sqrt(max(0.0, 1.0 - clamp(dot(xy, xy), 0.0, 1.0)));
          vec3 tangentNormal = normalize(vec3(xy, z));
          gl_FragColor = vec4(tangentNormal * 0.5 + 0.5, 1.0);
        }
      `,
      });
    const segmentFieldTexturePreviewMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tQuantizedField: {
          value: generatedSegmentFieldTexture(selectedSegmentTexture.path),
        },
        tSmoothField: {
          value: generatedSegmentFieldTexture(
            selectedSegmentTexture.path,
            true,
          ),
        },
        fieldBlend: {
          value:
            insetControlsRef.current.fieldMode === "smooth"
              ? 1
              : insetControlsRef.current.fieldMode === "blend"
                ? insetControlsRef.current.fieldBlend
                : 0,
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
        uniform sampler2D tQuantizedField;
        uniform sampler2D tSmoothField;
        uniform float fieldBlend;

        varying vec2 vUv;

        void main() {
          vec4 quantizedField = texture2D(tQuantizedField, vUv);
          vec4 smoothField = texture2D(tSmoothField, vUv);
          vec2 blendedDirection = mix(
            quantizedField.xy * 2.0 - 1.0,
            smoothField.xy * 2.0 - 1.0,
            clamp(fieldBlend, 0.0, 1.0)
          );
          float directionLength = length(blendedDirection);
          blendedDirection = directionLength > 0.0001
            ? blendedDirection / directionLength
            : vec2(0.0);
          vec2 uvColor = blendedDirection * 0.5 + 0.5;
          gl_FragColor = vec4(uvColor, 0.0, 1.0);
        }
      `,
    });
    const segmentBakedNormalMapViewMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: null },
        tSegmentMask: { value: null },
        tParticipation: { value: null },
        tBakedNormalMap: { value: null },
        tNormals: { value: null },
        tTangents: { value: null },
        texelSize: { value: new THREE.Vector2(1, 1) },
        blend: { value: bakedNormalMapBlend },
        insetStrength: { value: bakedNormalMapInsetStrength },
      },
      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tSegmentMask;
        uniform sampler2D tParticipation;
        uniform sampler2D tBakedNormalMap;
        uniform sampler2D tNormals;
        uniform sampler2D tTangents;
        uniform vec2 texelSize;
        uniform float blend;
        uniform float insetStrength;

        varying vec2 vUv;

        float sampleBlue(vec2 uv) {
          return texture2D(tSegmentMask, uv).b;
        }

        float sampleParticipation(vec2 uv) {
          return texture2D(tParticipation, uv).r;
        }

        vec3 sampleNormal(vec2 uv) {
          return normalize(texture2D(tNormals, uv).xyz * 2.0 - 1.0);
        }

        vec3 sampleTangent(vec2 uv) {
          return normalize(texture2D(tTangents, uv).xyz * 2.0 - 1.0);
        }

        void main() {
          vec2 uvLeft = clamp(vUv + vec2(-texelSize.x, 0.0), vec2(0.0), vec2(1.0));
          vec2 uvRight = clamp(vUv + vec2(texelSize.x, 0.0), vec2(0.0), vec2(1.0));
          vec2 uvUp = clamp(vUv + vec2(0.0, texelSize.y), vec2(0.0), vec2(1.0));
          vec2 uvDown = clamp(vUv + vec2(0.0, -texelSize.y), vec2(0.0), vec2(1.0));

          float blue = sampleBlue(vUv);
          float blueLeft = sampleBlue(uvLeft);
          float blueRight = sampleBlue(uvRight);
          float blueUp = sampleBlue(uvUp);
          float blueDown = sampleBlue(uvDown);
          float participation = sampleParticipation(vUv);
          float participationLeft = sampleParticipation(uvLeft);
          float participationRight = sampleParticipation(uvRight);
          float participationUp = sampleParticipation(uvUp);
          float participationDown = sampleParticipation(uvDown);
          float inset = step(0.0001, participation)
            * (1.0 - step(0.0001, blue))
            * step(
              0.0001,
              max(
                max(blueLeft * participationLeft, blueRight * participationRight),
                max(blueUp * participationUp, blueDown * participationDown)
              )
            );

          vec3 baseNormal = sampleNormal(vUv);
          vec3 basePreview = baseNormal * 0.5 + 0.5;
          vec3 tangent = sampleTangent(vUv);
          tangent = normalize(tangent - baseNormal * dot(baseNormal, tangent));
          vec3 bitangent = normalize(cross(baseNormal, tangent));
          vec3 tangentNormal = normalize(texture2D(tBakedNormalMap, vUv).xyz * 2.0 - 1.0);
          vec3 viewNormal = normalize(
            tangent * tangentNormal.x +
            bitangent * tangentNormal.y +
            baseNormal * tangentNormal.z
          );
          vec3 insetPreview = mix(basePreview, viewNormal * 0.5 + 0.5, blend);
          float effectMask = mix(
            step(0.0001, participation),
            inset,
            clamp(insetStrength, 0.0, 1.0)
          );
          vec3 preview = mix(basePreview, insetPreview, effectMask);
          gl_FragColor = vec4(preview, 1.0);
        }
      `,
    });
    const segmentBakedNormalMapAppliedMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: null },
        tSegmentMask: { value: null },
        tParticipation: { value: null },
        tBakedNormalMap: { value: null },
        tNormals: { value: null },
        tTangents: { value: null },
        texelSize: { value: new THREE.Vector2(1, 1) },
        lightDirection: { value: new THREE.Vector3(0.6, 0.6, 0.4) },
        blend: { value: bakedNormalMapBlend },
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
        uniform sampler2D tParticipation;
        uniform sampler2D tBakedNormalMap;
        uniform sampler2D tNormals;
        uniform sampler2D tTangents;
        uniform vec2 texelSize;
        uniform vec3 lightDirection;
        uniform float blend;

        varying vec2 vUv;

        float sampleBlue(vec2 uv) {
          return texture2D(tSegmentMask, uv).b;
        }

        float sampleParticipation(vec2 uv) {
          return texture2D(tParticipation, uv).r;
        }

        vec3 sampleNormal(vec2 uv) {
          return normalize(texture2D(tNormals, uv).xyz * 2.0 - 1.0);
        }

        vec3 sampleTangent(vec2 uv) {
          return normalize(texture2D(tTangents, uv).xyz * 2.0 - 1.0);
        }

        vec3 linearToSRGB(vec3 color) {
          vec3 cutoff = step(color, vec3(0.0031308));
          vec3 lower = color * 12.92;
          vec3 upper = 1.055 * pow(max(color, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
          return mix(upper, lower, cutoff);
        }

        void main() {
          vec2 uvLeft = clamp(vUv + vec2(-texelSize.x, 0.0), vec2(0.0), vec2(1.0));
          vec2 uvRight = clamp(vUv + vec2(texelSize.x, 0.0), vec2(0.0), vec2(1.0));
          vec2 uvUp = clamp(vUv + vec2(0.0, texelSize.y), vec2(0.0), vec2(1.0));
          vec2 uvDown = clamp(vUv + vec2(0.0, -texelSize.y), vec2(0.0), vec2(1.0));

          float blue = sampleBlue(vUv);
          float blueLeft = sampleBlue(uvLeft);
          float blueRight = sampleBlue(uvRight);
          float blueUp = sampleBlue(uvUp);
          float blueDown = sampleBlue(uvDown);
          float participation = sampleParticipation(vUv);
          float participationLeft = sampleParticipation(uvLeft);
          float participationRight = sampleParticipation(uvRight);
          float participationUp = sampleParticipation(uvUp);
          float participationDown = sampleParticipation(uvDown);
          float inset = step(0.0001, participation)
            * (1.0 - step(0.0001, blue))
            * step(
              0.0001,
              max(
                max(blueLeft * participationLeft, blueRight * participationRight),
                max(blueUp * participationUp, blueDown * participationDown)
              )
            );

          vec3 color = texture2D(tColor, vUv).rgb;
          vec3 lightDir = normalize(lightDirection);
          vec3 baseNormal = sampleNormal(vUv);
          vec3 tangent = sampleTangent(vUv);
          tangent = normalize(tangent - baseNormal * dot(baseNormal, tangent));
          vec3 bitangent = normalize(cross(baseNormal, tangent));
          vec3 tangentNormal = normalize(texture2D(tBakedNormalMap, vUv).xyz * 2.0 - 1.0);
          vec3 mappedNormal = normalize(
            tangent * tangentNormal.x +
            bitangent * tangentNormal.y +
            baseNormal * tangentNormal.z
          );

          vec2 tangentLight = vec2(
            dot(lightDir, tangent),
            dot(lightDir, bitangent)
          );
          float tangentLightLength = length(tangentLight);
          vec2 lightDir2D = tangentLightLength > 0.0001
            ? tangentLight / tangentLightLength
            : vec2(0.0);
          vec2 wallDir = length(tangentNormal.xy) > 0.0001
            ? normalize(tangentNormal.xy)
            : vec2(0.0);
          float wallFacing = dot(wallDir, lightDir2D);
          float bevelMask = step(0.35, wallFacing) * step(0.0001, tangentLightLength);
          float lightScale = 1.0 + bevelMask * 0.65;
          vec3 applied = color * lightScale;
          vec3 result = mix(color, mix(color, applied, blend), inset);
          gl_FragColor = vec4(linearToSRGB(clamp(result, 0.0, 1.0)), 1.0);
        }
      `,
    });
    const postQuad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      depthEdgeMaterial,
    );
    postScene.add(postQuad);
    const upscaleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tInput: { value: null },
        textureSize: { value: new THREE.Vector2(1, 1) },
        encodeSrgb: { value: 0 },
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
        uniform float encodeSrgb;

        varying vec2 vUv;

        vec3 linearToSrgb(vec3 color) {
          vec3 cutoff = step(vec3(0.0031308), color);
          vec3 lower = color * 12.92;
          vec3 higher = 1.055 * pow(max(color, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
          return mix(lower, higher, cutoff);
        }

        void main() {
          vec2 boxSize = clamp(fwidth(vUv) * textureSize, 0.00001, 1.0);
          vec2 tx = vUv * textureSize - 0.5 * boxSize;
          vec2 txOffset = smoothstep(vec2(1.0) - boxSize, vec2(1.0), fract(tx));
          vec2 sampleUv = (floor(tx) + 0.5 + txOffset) / textureSize;
          vec4 color = texture2D(tInput, sampleUv);
          vec3 outputColor = mix(
            color.rgb,
            linearToSrgb(color.rgb),
            step(0.5, encodeSrgb)
          );
          gl_FragColor = vec4(outputColor, color.a);
        }
      `,
    });
    const upscaleQuad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      upscaleMaterial,
    );
    upscaleScene.add(upscaleQuad);
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
    const segmentParticipationEntries: Array<{
      mesh: THREE.Mesh;
      material: THREE.Material | THREE.Material[];
      participationMaterial: THREE.Material | THREE.Material[];
    }> = [];
    const segmentCenterFieldEntries: Array<{
      mesh: THREE.Mesh;
      material: THREE.Material | THREE.Material[];
      fieldMaterial: THREE.Material | THREE.Material[];
    }> = [];
    const segmentBevelEntries: Array<{
      mesh: THREE.Mesh;
      material: THREE.Material | THREE.Material[];
      bevelMaterial: THREE.Material | THREE.Material[];
    }> = [];
    const segmentBakedNormalMapEntries: Array<{
      mesh: THREE.Mesh;
      material: THREE.Material | THREE.Material[];
      bakedNormalMapMaterial: THREE.Material | THREE.Material[];
    }> = [];
    const segmentFieldMaterials: THREE.ShaderMaterial[] = [];
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
    let standaloneWorldPositionTarget: THREE.WebGLRenderTarget | null = null;
    let standaloneSegmentParticipationTarget: THREE.WebGLRenderTarget | null =
      null;
    let standaloneSegmentBakedNormalMapTarget: THREE.WebGLRenderTarget | null =
      null;

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

    const snapPositionToCameraTexels = (
      position: THREE.Vector3,
      camera: THREE.OrthographicCamera,
      renderWidth: number,
      renderHeight: number,
    ) => {
      const snapped = camera.worldToLocal(position.clone());
      const texelWidth =
        (camera.right - camera.left) / Math.max(renderWidth, 1);
      const texelHeight =
        (camera.top - camera.bottom) / Math.max(renderHeight, 1);
      snapped.x = Math.round(snapped.x / texelWidth) * texelWidth;
      snapped.y = Math.round(snapped.y / texelHeight) * texelHeight;
      return camera.localToWorld(snapped);
    };

    const createRenderer = (mount: HTMLDivElement) => {
      const renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: true,
      });
      renderer.debug.checkShaderErrors = true;
      renderer.debug.onShaderError = (
        gl,
        program,
        glVertexShader,
        glFragmentShader,
      ) => {
        const programLog = gl.getProgramInfoLog(program) ?? "No program log";
        const vertexLog =
          gl.getShaderInfoLog(glVertexShader) ?? "No vertex shader log";
        const fragmentLog =
          gl.getShaderInfoLog(glFragmentShader) ?? "No fragment shader log";
        const vertexSource =
          gl.getShaderSource(glVertexShader) ?? "No vertex shader source";
        const fragmentSource =
          gl.getShaderSource(glFragmentShader) ?? "No fragment shader source";

        console.error("Three.js shader compile error", {
          programLog,
          vertexLog,
          fragmentLog,
          vertexSource,
          fragmentSource,
        });
      };
      renderer.setPixelRatio(1);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setClearColor("#000000", 1);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      mount.appendChild(renderer.domElement);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      return renderer;
    };

    const presentUpscaled = (
      renderer: THREE.WebGLRenderer,
      target: THREE.WebGLRenderTarget,
      encodeSrgb: boolean,
    ) => {
      upscaleMaterial.uniforms.tInput.value = target.texture;
      upscaleMaterial.uniforms.textureSize.value.set(
        target.width,
        target.height,
      );
      upscaleMaterial.uniforms.encodeSrgb.value = encodeSrgb ? 1 : 0;
      renderer.setRenderTarget(null);
      renderer.render(upscaleScene, postCamera);
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
    const segmentEnabledMaterial = new THREE.MeshBasicMaterial({
      color: "#ffffff",
    });
    const segmentDisabledMaterial = new THREE.MeshBasicMaterial({
      color: "#000000",
    });

    const getRepeatedSegmentFieldTexture = (
      fieldTexturePath: string,
      repeatX: number,
      repeatY: number,
      smoothField = false,
    ) => {
      const textureKey = `${fieldTexturePath}:${repeatX}:${repeatY}:${smoothField ? "smooth" : "quantized"}`;
      let repeatedFieldTexture =
        repeatedSegmentFieldTextureCache.get(textureKey);

      if (!repeatedFieldTexture) {
        repeatedFieldTexture = generatedSegmentFieldTexture(
          fieldTexturePath,
          smoothField,
        );
        repeatedFieldTexture = repeatedFieldTexture.clone();
        repeatedFieldTexture.minFilter = THREE.NearestFilter;
        repeatedFieldTexture.magFilter = THREE.NearestFilter;
        repeatedFieldTexture.generateMipmaps = false;
        repeatedFieldTexture.wrapS = THREE.RepeatWrapping;
        repeatedFieldTexture.wrapT = THREE.RepeatWrapping;
        repeatedFieldTexture.repeat.set(repeatX, repeatY);
        repeatedFieldTexture.colorSpace = THREE.NoColorSpace;
        repeatedFieldTexture.needsUpdate = true;
        repeatedSegmentFieldTextureCache.set(textureKey, repeatedFieldTexture);
      }

      return repeatedFieldTexture;
    };

    const createSegmentFieldMaterial = (
      fieldTexturePath: string,
      repeatX: number,
      repeatY: number,
    ) => {
      const quantizedFieldTexture = getRepeatedSegmentFieldTexture(
        fieldTexturePath,
        repeatX,
        repeatY,
        false,
      );
      const smoothFieldTexture = getRepeatedSegmentFieldTexture(
        fieldTexturePath,
        repeatX,
        repeatY,
        true,
      );

      const material = new THREE.ShaderMaterial({
        uniforms: {
          tQuantizedField: { value: quantizedFieldTexture },
          tSmoothField: { value: smoothFieldTexture },
          segmentRepeat: { value: new THREE.Vector2(repeatX, repeatY) },
          fieldBlend: {
            value:
              insetControlsRef.current.fieldMode === "smooth"
                ? 1
                : insetControlsRef.current.fieldMode === "blend"
                  ? insetControlsRef.current.fieldBlend
                  : 0,
          },
        },
        vertexShader: `
          varying vec2 vUv;

          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D tQuantizedField;
          uniform sampler2D tSmoothField;
          uniform vec2 segmentRepeat;
          uniform float fieldBlend;

          varying vec2 vUv;

          void main() {
            vec2 tiledUv = fract(vUv * segmentRepeat);
            vec4 quantizedField = texture2D(tQuantizedField, tiledUv);
            vec4 smoothField = texture2D(tSmoothField, tiledUv);
            vec2 blendedDirection = mix(
              quantizedField.xy * 2.0 - 1.0,
              smoothField.xy * 2.0 - 1.0,
              clamp(fieldBlend, 0.0, 1.0)
            );
            float directionLength = length(blendedDirection);
            blendedDirection = directionLength > 0.0001
              ? blendedDirection / directionLength
              : vec2(0.0);
            float blendedDistance = mix(
              quantizedField.z,
              smoothField.z,
              clamp(fieldBlend, 0.0, 1.0)
            );
            gl_FragColor = vec4(
              blendedDirection * 0.5 + 0.5,
              blendedDistance,
              1.0
            );
          }
        `,
      });
      segmentFieldMaterials.push(material);
      return material;
    };
    const createSegmentBakedNormalMapMaterial = (
      fieldTexturePath: string,
      repeatX: number,
      repeatY: number,
    ) => {
      const repeatedFieldTexture = getRepeatedSegmentFieldTexture(
        fieldTexturePath,
        repeatX,
        repeatY,
      );
      return new THREE.ShaderMaterial({
        uniforms: {
          tField: { value: repeatedFieldTexture },
          normalStrength: { value: BAKED_NORMAL_MAP_STRENGTH },
          segmentRepeat: { value: new THREE.Vector2(repeatX, repeatY) },
        },
        vertexShader: `
          varying vec2 vUv;

          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D tField;
          uniform float normalStrength;
          uniform vec2 segmentRepeat;

          varying vec2 vUv;

          void main() {
            vec2 tiledUv = fract(vUv * segmentRepeat);
            vec2 direction = texture2D(tField, tiledUv).xy * 2.0 - 1.0;
            vec2 xy = direction * normalStrength;
            float z = sqrt(max(0.0, 1.0 - clamp(dot(xy, xy), 0.0, 1.0)));
            vec3 tangentNormal = normalize(vec3(xy, z));
            gl_FragColor = vec4(tangentNormal * 0.5 + 0.5, 1.0);
          }
        `,
      });
    };
    const createSegmentCenterFieldMaterial = (
      fieldTexturePath: string,
      repeatX: number,
      repeatY: number,
    ) => {
      if (mode === "segmentCenterFieldOnly") {
        const fieldTexture =
          generatedWrappedSegmentCenterFieldTexture(fieldTexturePath);
        return new THREE.ShaderMaterial({
          uniforms: {
            tField: { value: fieldTexture },
            fieldRepeat: { value: new THREE.Vector2(repeatX, repeatY) },
          },
          vertexShader: `
            varying vec2 vUv;

            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform sampler2D tField;
            uniform vec2 fieldRepeat;

            varying vec2 vUv;

            void main() {
              vec2 tiledUv = fract(vUv * fieldRepeat);
              gl_FragColor = texture2D(tField, tiledUv);
            }
          `,
        });
      }

      const textureKey = `${fieldTexturePath}:${repeatX}:${repeatY}`;
      let repeatedFieldTexture =
        repeatedSegmentCenterFieldTextureCache.get(textureKey);

      if (!repeatedFieldTexture) {
        repeatedFieldTexture =
          mode === "segmentCenterFieldOnly"
            ? generatedWrappedSegmentCenterFieldTexture(fieldTexturePath)
            : generatedSegmentCenterFieldTexture(fieldTexturePath);
        repeatedFieldTexture = repeatedFieldTexture.clone();
        repeatedFieldTexture.minFilter = THREE.NearestFilter;
        repeatedFieldTexture.magFilter = THREE.NearestFilter;
        repeatedFieldTexture.generateMipmaps = false;
        repeatedFieldTexture.wrapS = THREE.RepeatWrapping;
        repeatedFieldTexture.wrapT = THREE.RepeatWrapping;
        repeatedFieldTexture.repeat.set(repeatX, repeatY);
        repeatedFieldTexture.colorSpace = THREE.NoColorSpace;
        repeatedFieldTexture.needsUpdate = true;
        repeatedSegmentCenterFieldTextureCache.set(
          textureKey,
          repeatedFieldTexture,
        );
      }

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
      selectedSegmentTexture.path,
      4 * segmentRepeatScale,
      4 * segmentRepeatScale,
    );
    const segmentPedestalCenterFieldMaterial = createSegmentCenterFieldMaterial(
      selectedSegmentTexture.path,
      4 * segmentRepeatScale,
      4 * segmentRepeatScale,
    );
    const segmentFloorFieldMaterial = createSegmentFieldMaterial(
      selectedSegmentTexture.path,
      7 * segmentRepeatScale,
      7 * segmentRepeatScale,
    );
    const segmentFloorCenterFieldMaterial = createSegmentCenterFieldMaterial(
      selectedSegmentTexture.path,
      7 * segmentRepeatScale,
      7 * segmentRepeatScale,
    );
    const segmentPillarFieldMaterial = createSegmentFieldMaterial(
      selectedSegmentTexture.path,
      2 * segmentRepeatScale,
      2 * segmentRepeatScale,
    );
    const segmentPillarCenterFieldMaterial = createSegmentCenterFieldMaterial(
      selectedSegmentTexture.path,
      2 * segmentRepeatScale,
      2 * segmentRepeatScale,
    );
    const segmentPedestalBakedNormalMapMaterial =
      createSegmentBakedNormalMapMaterial(
        selectedSegmentTexture.path,
        4 * segmentRepeatScale,
        4 * segmentRepeatScale,
      );
    const segmentFloorBakedNormalMapMaterial =
      createSegmentBakedNormalMapMaterial(
        selectedSegmentTexture.path,
        7 * segmentRepeatScale,
        7 * segmentRepeatScale,
      );
    const segmentPillarBakedNormalMapMaterial =
      createSegmentBakedNormalMapMaterial(
        selectedSegmentTexture.path,
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
    segmentParticipationEntries.push({
      mesh: pedestal,
      material: pedestal.material,
      participationMaterial: [
        segmentEnabledMaterial,
        segmentEnabledMaterial,
        segmentEnabledMaterial,
        segmentDisabledMaterial,
        segmentEnabledMaterial,
        segmentEnabledMaterial,
      ],
    });
    segmentCenterFieldEntries.push({
      mesh: pedestal,
      material: pedestal.material,
      fieldMaterial: [
        segmentPedestalCenterFieldMaterial,
        segmentPedestalCenterFieldMaterial,
        segmentPedestalCenterFieldMaterial,
        pedestalBottomMaterial,
        segmentPedestalCenterFieldMaterial,
        segmentPedestalCenterFieldMaterial,
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
    segmentBakedNormalMapEntries.push({
      mesh: pedestal,
      material: pedestal.material,
      bakedNormalMapMaterial: [
        segmentPedestalBakedNormalMapMaterial,
        segmentPedestalBakedNormalMapMaterial,
        segmentPedestalBakedNormalMapMaterial,
        segmentDisabledMaterial,
        segmentPedestalBakedNormalMapMaterial,
        segmentPedestalBakedNormalMapMaterial,
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
      objectIdMaterial: new THREE.MeshBasicMaterial({ color: "#4a4a4a" }),
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
    segmentParticipationEntries.push({
      mesh: floor,
      material: floor.material,
      participationMaterial: segmentEnabledMaterial,
    });
    segmentCenterFieldEntries.push({
      mesh: floor,
      material: floor.material,
      fieldMaterial: segmentFloorCenterFieldMaterial,
    });
    segmentBevelEntries.push({
      mesh: floor,
      material: floor.material,
      bevelMaterial: segmentFloorBevelMaterial,
    });
    segmentBakedNormalMapEntries.push({
      mesh: floor,
      material: floor.material,
      bakedNormalMapMaterial: segmentFloorBakedNormalMapMaterial,
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
      segmentParticipationEntries.push({
        mesh,
        material: mesh.material,
        participationMaterial: segmentEnabledMaterial,
      });
      segmentCenterFieldEntries.push({
        mesh,
        material: mesh.material,
        fieldMaterial: segmentPillarCenterFieldMaterial,
      });
      segmentBevelEntries.push({
        mesh,
        material: mesh.material,
        bevelMaterial: segmentPillarBevelMaterial,
      });
      segmentBakedNormalMapEntries.push({
        mesh,
        material: mesh.material,
        bakedNormalMapMaterial: segmentPillarBakedNormalMapMaterial,
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
    segmentParticipationEntries.push({
      mesh: crystal,
      material: crystal.material,
      participationMaterial: segmentDisabledMaterial,
    });
    segmentCenterFieldEntries.push({
      mesh: crystal,
      material: crystal.material,
      fieldMaterial: segmentDisabledMaterial,
    });
    segmentBakedNormalMapEntries.push({
      mesh: crystal,
      material: crystal.material,
      bakedNormalMapMaterial: segmentDisabledMaterial,
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
    const pointLightA = new THREE.PointLight("#ff6b6b", 2.8, 9, 2);
    const pointLightB = new THREE.PointLight("#5eead4", 2.6, 9, 2);
    const pointLightC = new THREE.PointLight("#fde047", 2.4, 9, 2);
    pointLightA.castShadow = true;
    pointLightB.castShadow = true;
    pointLightC.castShadow = true;
    pointLightA.shadow.mapSize.set(512, 512);
    pointLightB.shadow.mapSize.set(512, 512);
    pointLightC.shadow.mapSize.set(512, 512);
    pointLightA.shadow.bias = -0.002;
    pointLightB.shadow.bias = -0.002;
    pointLightC.shadow.bias = -0.002;
    pointLightA.shadow.normalBias = 0.02;
    pointLightB.shadow.normalBias = 0.02;
    pointLightC.shadow.normalBias = 0.02;
    pointLightA.shadow.camera.near = 0.1;
    pointLightB.shadow.camera.near = 0.1;
    pointLightC.shadow.camera.near = 0.1;
    pointLightA.shadow.camera.far = 10;
    pointLightB.shadow.camera.far = 10;
    pointLightC.shadow.camera.far = 10;
    const pointLightMarkerGeometry = new THREE.SphereGeometry(0.11, 12, 12);
    const pointLightMarkerMaterialA = new THREE.MeshBasicMaterial({
      color: "#ff6b6b",
    });
    const pointLightMarkerMaterialB = new THREE.MeshBasicMaterial({
      color: "#5eead4",
    });
    const pointLightMarkerMaterialC = new THREE.MeshBasicMaterial({
      color: "#fde047",
    });
    const pointLightMarkerA = new THREE.Mesh(
      pointLightMarkerGeometry,
      pointLightMarkerMaterialA,
    );
    const pointLightMarkerB = new THREE.Mesh(
      pointLightMarkerGeometry,
      pointLightMarkerMaterialB,
    );
    const pointLightMarkerC = new THREE.Mesh(
      pointLightMarkerGeometry,
      pointLightMarkerMaterialC,
    );
    pointLightA.add(pointLightMarkerA);
    pointLightB.add(pointLightMarkerB);
    pointLightC.add(pointLightMarkerC);
    objectIdEntries.push({
      mesh: pointLightMarkerA,
      material: pointLightMarkerA.material,
      objectIdMaterial: new THREE.MeshBasicMaterial({ color: "#191919" }),
    });
    objectIdEntries.push({
      mesh: pointLightMarkerB,
      material: pointLightMarkerB.material,
      objectIdMaterial: new THREE.MeshBasicMaterial({ color: "#292929" }),
    });
    objectIdEntries.push({
      mesh: pointLightMarkerC,
      material: pointLightMarkerC.material,
      objectIdMaterial: new THREE.MeshBasicMaterial({ color: "#393939" }),
    });
    segmentEntries.push({
      mesh: pointLightMarkerA,
      material: pointLightMarkerA.material,
      segmentMaterial: segmentDisabledMaterial,
    });
    segmentEntries.push({
      mesh: pointLightMarkerB,
      material: pointLightMarkerB.material,
      segmentMaterial: segmentDisabledMaterial,
    });
    segmentEntries.push({
      mesh: pointLightMarkerC,
      material: pointLightMarkerC.material,
      segmentMaterial: segmentDisabledMaterial,
    });
    segmentFieldEntries.push({
      mesh: pointLightMarkerA,
      material: pointLightMarkerA.material,
      fieldMaterial: segmentDisabledMaterial,
    });
    segmentFieldEntries.push({
      mesh: pointLightMarkerB,
      material: pointLightMarkerB.material,
      fieldMaterial: segmentDisabledMaterial,
    });
    segmentFieldEntries.push({
      mesh: pointLightMarkerC,
      material: pointLightMarkerC.material,
      fieldMaterial: segmentDisabledMaterial,
    });
    segmentParticipationEntries.push({
      mesh: pointLightMarkerA,
      material: pointLightMarkerA.material,
      participationMaterial: segmentDisabledMaterial,
    });
    segmentParticipationEntries.push({
      mesh: pointLightMarkerB,
      material: pointLightMarkerB.material,
      participationMaterial: segmentDisabledMaterial,
    });
    segmentParticipationEntries.push({
      mesh: pointLightMarkerC,
      material: pointLightMarkerC.material,
      participationMaterial: segmentDisabledMaterial,
    });
    segmentCenterFieldEntries.push({
      mesh: pointLightMarkerA,
      material: pointLightMarkerA.material,
      fieldMaterial: segmentDisabledMaterial,
    });
    segmentCenterFieldEntries.push({
      mesh: pointLightMarkerB,
      material: pointLightMarkerB.material,
      fieldMaterial: segmentDisabledMaterial,
    });
    segmentCenterFieldEntries.push({
      mesh: pointLightMarkerC,
      material: pointLightMarkerC.material,
      fieldMaterial: segmentDisabledMaterial,
    });
    segmentBakedNormalMapEntries.push({
      mesh: pointLightMarkerA,
      material: pointLightMarkerA.material,
      bakedNormalMapMaterial: segmentDisabledMaterial,
    });
    segmentBakedNormalMapEntries.push({
      mesh: pointLightMarkerB,
      material: pointLightMarkerB.material,
      bakedNormalMapMaterial: segmentDisabledMaterial,
    });
    segmentBakedNormalMapEntries.push({
      mesh: pointLightMarkerC,
      material: pointLightMarkerC.material,
      bakedNormalMapMaterial: segmentDisabledMaterial,
    });
    pointLightA.visible = false;
    pointLightB.visible = false;
    pointLightC.visible = false;
    scene.add(pointLightA);
    scene.add(pointLightB);
    scene.add(pointLightC);

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
        segmentParticipationEntries.push({
          mesh: object,
          material: object.material,
          participationMaterial: segmentDisabledMaterial,
        });
        segmentCenterFieldEntries.push({
          mesh: object,
          material: object.material,
          fieldMaterial: segmentDisabledMaterial,
        });
        segmentBakedNormalMapEntries.push({
          mesh: object,
          material: object.material,
          bakedNormalMapMaterial: segmentDisabledMaterial,
        });
      });

      scene.add(torusKnotRoot);
    });

    activeModes.forEach((activeMode) => {
      const mount = mounts[activeMode];
      if (!mount) return;

      const renderer = createRenderer(mount);
      const camera = new THREE.OrthographicCamera();
      const displayTarget = new THREE.WebGLRenderTarget(1, 1);
      displayTarget.texture.minFilter = THREE.LinearFilter;
      displayTarget.texture.magFilter = THREE.LinearFilter;
      displayTarget.texture.generateMipmaps = false;

      configureCamera(camera, mount.clientWidth, mount.clientHeight);

      if (
        activeMode === "segmentIndentedNormal" &&
        !loggedSegmentIndentedNormalSetup
      ) {
        console.log("segmentIndentedNormal setup", {
          width: mount.clientWidth,
          height: mount.clientHeight,
          hasMount: Boolean(mount),
        });
        loggedSegmentIndentedNormalSetup = true;
      }

      renderers.set(activeMode, renderer);
      cameras.set(activeMode, camera);
      resizeEntries.set(activeMode, { mount, renderer, camera, displayTarget });

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
        activeMode === "segmentInsetMask" ||
        activeMode === "segmentIndented" ||
        activeMode === "segmentIndentedOrbit" ||
        activeMode === "segmentIndentedNormal" ||
        activeMode === "segmentIndentedLit" ||
        activeMode === "segmentIndentedApplied" ||
        activeMode === "segmentIndentedAppliedOrbit" ||
        activeMode === "segmentIndentedAppliedPointLights" ||
        activeMode === "segmentIndentedAppliedFinal" ||
        activeMode === "segmentIndentedAppliedFinalPointLights" ||
        activeMode === "segmentBakedNormalMapView" ||
        activeMode === "segmentBakedNormalMapApplied"
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
          activeMode === "segmentInsetMask" ||
          activeMode === "segmentIndented" ||
          activeMode === "segmentIndentedOrbit" ||
          activeMode === "segmentIndentedNormal" ||
          activeMode === "segmentIndentedLit" ||
          activeMode === "segmentIndentedApplied" ||
          activeMode === "segmentIndentedAppliedOrbit" ||
          activeMode === "segmentIndentedAppliedPointLights" ||
          activeMode === "segmentIndentedAppliedFinal" ||
          activeMode === "segmentIndentedAppliedFinalPointLights" ||
          activeMode === "segmentBakedNormalMapView" ||
          activeMode === "segmentBakedNormalMapApplied"
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

          const segmentTangentTarget = new THREE.WebGLRenderTarget(1, 1);
          segmentTangentTarget.texture.minFilter = THREE.NearestFilter;
          segmentTangentTarget.texture.magFilter = THREE.NearestFilter;
          segmentTangentTarget.texture.generateMipmaps = false;
          depthEdgeTargets.set("tangents", segmentTangentTarget);

          if (
            activeMode === "segmentInsetMask" ||
            activeMode === "segmentIndented" ||
            activeMode === "segmentIndentedOrbit" ||
            activeMode === "segmentIndentedNormal" ||
            activeMode === "segmentIndentedLit" ||
            activeMode === "segmentIndentedApplied" ||
            activeMode === "segmentIndentedAppliedOrbit" ||
            activeMode === "segmentIndentedAppliedPointLights" ||
            activeMode === "segmentIndentedAppliedFinal" ||
            activeMode === "segmentIndentedAppliedFinalPointLights" ||
            activeMode === "segmentBakedNormalMapView" ||
            activeMode === "segmentBakedNormalMapApplied"
          ) {
            const segmentMaskTarget = new THREE.WebGLRenderTarget(1, 1);
            segmentMaskTarget.texture.minFilter = THREE.NearestFilter;
            segmentMaskTarget.texture.magFilter = THREE.NearestFilter;
            segmentMaskTarget.texture.generateMipmaps = false;
            standaloneSegmentMaskTarget = segmentMaskTarget;

            const segmentParticipationTarget = new THREE.WebGLRenderTarget(
              1,
              1,
              {
                depthBuffer: true,
              },
            );
            segmentParticipationTarget.texture.minFilter = THREE.NearestFilter;
            segmentParticipationTarget.texture.magFilter = THREE.NearestFilter;
            segmentParticipationTarget.texture.generateMipmaps = false;
            standaloneSegmentParticipationTarget = segmentParticipationTarget;

            if (
              activeMode === "segmentIndented" ||
              activeMode === "segmentIndentedOrbit" ||
              activeMode === "segmentIndentedNormal" ||
              activeMode === "segmentIndentedLit" ||
              activeMode === "segmentIndentedApplied" ||
              activeMode === "segmentIndentedAppliedOrbit" ||
              activeMode === "segmentIndentedAppliedPointLights" ||
              activeMode === "segmentIndentedAppliedFinal" ||
              activeMode === "segmentIndentedAppliedFinalPointLights" ||
              activeMode === "segmentBakedNormalMapView" ||
              activeMode === "segmentBakedNormalMapApplied"
            ) {
              const segmentFieldTarget = new THREE.WebGLRenderTarget(1, 1);
              segmentFieldTarget.texture.minFilter = THREE.NearestFilter;
              segmentFieldTarget.texture.magFilter = THREE.NearestFilter;
              segmentFieldTarget.texture.generateMipmaps = false;
              standaloneSegmentFieldTarget = segmentFieldTarget;
            }

            const segmentBakedNormalMapTarget = new THREE.WebGLRenderTarget(
              1,
              1,
            );
            segmentBakedNormalMapTarget.texture.minFilter = THREE.NearestFilter;
            segmentBakedNormalMapTarget.texture.magFilter = THREE.NearestFilter;
            segmentBakedNormalMapTarget.texture.generateMipmaps = false;
            standaloneSegmentBakedNormalMapTarget = segmentBakedNormalMapTarget;

            const colorTarget = new THREE.WebGLRenderTarget(1, 1);
            colorTarget.texture.minFilter = THREE.NearestFilter;
            colorTarget.texture.magFilter = THREE.NearestFilter;
            colorTarget.texture.generateMipmaps = false;
            if (
              activeMode === "segmentIndentedAppliedPointLights" ||
              activeMode === "segmentIndentedAppliedFinal" ||
              activeMode === "segmentIndentedAppliedFinalPointLights"
            ) {
              colorTarget.texture.type = THREE.HalfFloatType;
              colorTarget.texture.colorSpace = THREE.LinearSRGBColorSpace;
            }
            standaloneColorTarget = colorTarget;

            if (
              activeMode === "segmentIndentedAppliedPointLights" ||
              activeMode === "segmentIndentedAppliedFinal" ||
              activeMode === "segmentIndentedAppliedFinalPointLights"
            ) {
              if (
                activeMode === "segmentIndentedAppliedFinal" ||
                activeMode === "segmentIndentedAppliedFinalPointLights"
              ) {
                const finalNormalTarget = new THREE.WebGLRenderTarget(1, 1);
                finalNormalTarget.texture.minFilter = THREE.NearestFilter;
                finalNormalTarget.texture.magFilter = THREE.NearestFilter;
                finalNormalTarget.texture.generateMipmaps = false;
                standaloneNormalTarget = finalNormalTarget;
              }

              const lightTarget = new THREE.WebGLRenderTarget(1, 1);
              lightTarget.texture.minFilter = THREE.NearestFilter;
              lightTarget.texture.magFilter = THREE.NearestFilter;
              lightTarget.texture.generateMipmaps = false;
              standaloneLightTarget = lightTarget;

              const worldPositionTarget = new THREE.WebGLRenderTarget(1, 1);
              worldPositionTarget.texture.minFilter = THREE.NearestFilter;
              worldPositionTarget.texture.magFilter = THREE.NearestFilter;
              worldPositionTarget.texture.generateMipmaps = false;
              worldPositionTarget.texture.type = THREE.HalfFloatType;
              worldPositionTarget.texture.colorSpace = THREE.NoColorSpace;
              standaloneWorldPositionTarget = worldPositionTarget;
            }
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
      resizeEntries.forEach(({ mount, renderer, camera, displayTarget }) => {
        const width = Math.max(mount.clientWidth, 1);
        const height = Math.max(mount.clientHeight, 1);
        const devicePixelRatio = window.devicePixelRatio || 1;
        const displayWidth = Math.max(1, Math.round(width * devicePixelRatio));
        const displayHeight = Math.max(
          1,
          Math.round(height * devicePixelRatio),
        );
        const useFullResolutionPreview = mount === mounts.segmentFieldTexture;
        const renderWidth = useFullResolutionPreview
          ? displayWidth
          : Math.max(1, Math.round(width / PIXEL_SCALE));
        const renderHeight = useFullResolutionPreview
          ? displayHeight
          : Math.max(1, Math.round(height / PIXEL_SCALE));

        configureCamera(camera, width, height);
        renderer.setSize(displayWidth, displayHeight, false);
        displayTarget.setSize(renderWidth, renderHeight);

        if (
          mount === mounts.depthEdges ||
          mount === mounts.normalEdges ||
          mount === mounts.objectIdEdges ||
          mount === mounts.segmentEdges ||
          mount === mounts.segmentInsetMask ||
          mount === mounts.segmentIndented ||
          mount === mounts.segmentIndentedOrbit ||
          mount === mounts.segmentIndentedNormal ||
          mount === mounts.segmentIndentedLit ||
          mount === mounts.segmentIndentedApplied ||
          mount === mounts.segmentIndentedAppliedOrbit ||
          mount === mounts.segmentIndentedAppliedPointLights ||
          mount === mounts.segmentIndentedAppliedFinal ||
          mount === mounts.segmentIndentedAppliedFinalPointLights ||
          mount === mounts.segmentBakedNormalMapView ||
          mount === mounts.segmentBakedNormalMapApplied ||
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
                  : mount === mounts.segmentInsetMask
                    ? "segmentInsetMask"
                    : mount === mounts.segmentIndented
                      ? "segmentIndented"
                      : mount === mounts.segmentIndentedOrbit
                        ? "segmentIndentedOrbit"
                        : mount === mounts.segmentIndentedNormal
                          ? "segmentIndentedNormal"
                          : mount === mounts.segmentIndentedLit
                            ? "segmentIndentedLit"
                            : mount === mounts.segmentIndentedApplied
                              ? "segmentIndentedApplied"
                              : mount === mounts.segmentIndentedAppliedOrbit
                                ? "segmentIndentedAppliedOrbit"
                                : mount ===
                                    mounts.segmentIndentedAppliedPointLights
                                  ? "segmentIndentedAppliedPointLights"
                                  : mount ===
                                      mounts.segmentIndentedAppliedFinal
                                    ? "segmentIndentedAppliedFinal"
                                    : mount ===
                                        mounts.segmentIndentedAppliedFinalPointLights
                                      ? "segmentIndentedAppliedFinalPointLights"
                                  : mount === mounts.segmentBakedNormalMapView
                                    ? "segmentBakedNormalMapView"
                                    : mount ===
                                        mounts.segmentBakedNormalMapApplied
                                      ? "segmentBakedNormalMapApplied"
                                      : "normalEdges",
          );
          if (depthTarget) {
            depthTarget.setSize(renderWidth, renderHeight);
          }
          if (
            mount === mounts.segmentEdges ||
            mount === mounts.segmentInsetMask ||
            mount === mounts.segmentIndented ||
            mount === mounts.segmentIndentedOrbit ||
            mount === mounts.segmentIndentedNormal ||
            mount === mounts.segmentIndentedLit ||
            mount === mounts.segmentIndentedApplied ||
            mount === mounts.segmentIndentedAppliedOrbit ||
            mount === mounts.segmentIndentedAppliedPointLights ||
            mount === mounts.segmentIndentedAppliedFinal ||
            mount === mounts.segmentIndentedAppliedFinalPointLights ||
            mount === mounts.segmentBakedNormalMapView ||
            mount === mounts.segmentBakedNormalMapApplied
          ) {
            depthEdgeTargets
              .get("objectIds")
              ?.setSize(renderWidth, renderHeight);
            depthEdgeTargets.get("normals")?.setSize(renderWidth, renderHeight);
            depthEdgeTargets
              .get("tangents")
              ?.setSize(renderWidth, renderHeight);
            if (
              mount === mounts.segmentInsetMask ||
              mount === mounts.segmentIndented ||
              mount === mounts.segmentIndentedOrbit ||
              mount === mounts.segmentIndentedNormal ||
              mount === mounts.segmentIndentedLit ||
              mount === mounts.segmentIndentedApplied ||
              mount === mounts.segmentIndentedAppliedOrbit ||
              mount === mounts.segmentIndentedAppliedPointLights ||
              mount === mounts.segmentIndentedAppliedFinal ||
              mount === mounts.segmentIndentedAppliedFinalPointLights ||
              mount === mounts.segmentBakedNormalMapView ||
              mount === mounts.segmentBakedNormalMapApplied
            ) {
              standaloneSegmentMaskTarget?.setSize(renderWidth, renderHeight);
              standaloneSegmentParticipationTarget?.setSize(
                renderWidth,
                renderHeight,
              );
              standaloneSegmentFieldTarget?.setSize(renderWidth, renderHeight);
              if (
                mount === mounts.segmentIndentedAppliedFinal ||
                mount === mounts.segmentIndentedAppliedFinalPointLights
              ) {
                standaloneNormalTarget?.setSize(renderWidth, renderHeight);
              }
              standaloneLightTarget?.setSize(renderWidth, renderHeight);
              standaloneWorldPositionTarget?.setSize(renderWidth, renderHeight);
              standaloneSegmentBakedNormalMapTarget?.setSize(
                renderWidth,
                renderHeight,
              );
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
    const renderSegmentParticipation = (
      renderer: THREE.WebGLRenderer,
      camera: THREE.OrthographicCamera,
    ) => {
      segmentParticipationEntries.forEach(({ mesh, participationMaterial }) => {
        mesh.material = participationMaterial;
      });
      scene.overrideMaterial = null;
      renderer.render(scene, camera);
      segmentParticipationEntries.forEach(({ mesh, material }) => {
        mesh.material = material;
      });
    };

    const renderSegmentCenterField = (
      renderer: THREE.WebGLRenderer,
      camera: THREE.OrthographicCamera,
    ) => {
      segmentCenterFieldEntries.forEach(({ mesh, fieldMaterial }) => {
        mesh.material = fieldMaterial;
      });
      scene.overrideMaterial = null;
      renderer.render(scene, camera);
      segmentCenterFieldEntries.forEach(({ mesh, material }) => {
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
    const renderSegmentBakedNormalMap = (
      renderer: THREE.WebGLRenderer,
      camera: THREE.OrthographicCamera,
    ) => {
      segmentBakedNormalMapEntries.forEach(
        ({ mesh, bakedNormalMapMaterial }) => {
          mesh.material = bakedNormalMapMaterial;
        },
      );
      scene.overrideMaterial = null;
      renderer.render(scene, camera);
      segmentBakedNormalMapEntries.forEach(({ mesh, material }) => {
        mesh.material = material;
      });
    };

    const renderView = (
      mode: ViewMode,
      renderer: THREE.WebGLRenderer,
      camera: THREE.OrthographicCamera,
    ) => {
      const entry = resizeEntries.get(mode);
      const outputTarget = entry?.displayTarget;
      if (!outputTarget) return;

      if (mode === "color") {
        scene.overrideMaterial = null;
        renderer.setRenderTarget(outputTarget);
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);
        presentUpscaled(renderer, outputTarget, true);
      } else if (mode === "depth") {
        scene.overrideMaterial = depthMaterial;
        renderer.setRenderTarget(outputTarget);
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);
        presentUpscaled(renderer, outputTarget, false);
      } else if (mode === "normals") {
        scene.overrideMaterial = normalMaterial;
        renderer.setRenderTarget(outputTarget);
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);
        presentUpscaled(renderer, outputTarget, false);
      } else if (mode === "objectIds") {
        renderer.setRenderTarget(outputTarget);
        renderObjectIds(renderer, camera);
        renderer.setRenderTarget(null);
        presentUpscaled(renderer, outputTarget, false);
      } else if (mode === "segments") {
        renderer.setRenderTarget(outputTarget);
        renderSegments(renderer, camera);
        renderer.setRenderTarget(null);
        presentUpscaled(renderer, outputTarget, false);
      } else if (mode === "segmentFieldTexture") {
        postQuad.material = segmentFieldTexturePreviewMaterial;
        renderer.setRenderTarget(outputTarget);
        renderer.render(postScene, postCamera);
        renderer.setRenderTarget(null);
        presentUpscaled(renderer, outputTarget, false);
      } else if (mode === "segmentCenterField") {
        renderer.setRenderTarget(outputTarget);
        renderSegmentCenterField(renderer, camera);
        renderer.setRenderTarget(null);
        presentUpscaled(renderer, outputTarget, false);
      } else if (mode === "segmentBakedNormalMapTexture") {
        postQuad.material = segmentBakedNormalMapTexturePreviewMaterial;
        segmentBakedNormalMapTexturePreviewMaterial.uniforms.tField.value =
          generatedSegmentFieldTexture(selectedSegmentTexture.path);
        renderer.setRenderTarget(outputTarget);
        renderer.render(postScene, postCamera);
        renderer.setRenderTarget(null);
        presentUpscaled(renderer, outputTarget, false);
      } else if (mode === "segmentCellBevel") {
        renderer.setRenderTarget(outputTarget);
        renderSegmentBevel(renderer, camera);
        renderer.setRenderTarget(null);
        presentUpscaled(renderer, outputTarget, true);
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
            augmentedBlendMaterial.uniforms.inputIsSRGB.value = 0;
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

          renderer.setRenderTarget(outputTarget);
          renderer.render(postScene, postCamera);
          renderer.setRenderTarget(null);
          presentUpscaled(renderer, outputTarget, false);
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
          mode === "segmentInsetMask" ||
          mode === "segmentIndented" ||
          mode === "segmentIndentedOrbit" ||
          mode === "segmentIndentedNormal" ||
          mode === "segmentIndentedLit" ||
          mode === "segmentIndentedApplied" ||
          mode === "segmentIndentedAppliedOrbit" ||
          mode === "segmentIndentedAppliedPointLights" ||
          mode === "segmentIndentedAppliedFinal" ||
          mode === "segmentIndentedAppliedFinalPointLights" ||
          mode === "segmentBakedNormalMapView" ||
          mode === "segmentBakedNormalMapApplied"
        ) {
          if (
            mode === "segmentIndentedNormal" &&
            !loggedSegmentIndentedNormalRender
          ) {
            console.log("segmentIndentedNormal render", {
              hasTarget: Boolean(target),
              hasStandaloneColorTarget: Boolean(standaloneColorTarget),
              hasStandaloneSegmentMaskTarget: Boolean(
                standaloneSegmentMaskTarget,
              ),
              hasStandaloneSegmentFieldTarget: Boolean(
                standaloneSegmentFieldTarget,
              ),
              hasObjectIdsTarget: Boolean(depthEdgeTargets.get("objectIds")),
              hasNormalsTarget: Boolean(depthEdgeTargets.get("normals")),
            });
            loggedSegmentIndentedNormalRender = true;
          }
          if (
            mode === "segmentIndented" ||
            mode === "segmentIndentedOrbit" ||
            mode === "segmentIndentedNormal" ||
            mode === "segmentIndentedLit" ||
            mode === "segmentIndentedApplied" ||
            mode === "segmentIndentedAppliedOrbit" ||
            mode === "segmentIndentedAppliedPointLights" ||
            mode === "segmentIndentedAppliedFinal" ||
            mode === "segmentIndentedAppliedFinalPointLights" ||
            mode === "segmentBakedNormalMapView" ||
            mode === "segmentBakedNormalMapApplied"
          ) {
            if (!standaloneColorTarget) return;
            const usingPointLights =
              mode === "segmentIndentedAppliedPointLights" ||
              mode === "segmentIndentedAppliedFinalPointLights";
            const keyLightVisible = keyLight.visible;
            const pointLightAVisible = pointLightA.visible;
            const pointLightBVisible = pointLightB.visible;
            const pointLightCVisible = pointLightC.visible;
            if (usingPointLights) {
              keyLight.visible = false;
              pointLightA.visible = true;
              pointLightB.visible = true;
              pointLightC.visible = true;
            }
            scene.overrideMaterial = null;
            renderer.setRenderTarget(standaloneColorTarget);
            renderer.render(scene, camera);
            renderer.setRenderTarget(null);
            keyLight.visible = keyLightVisible;
            pointLightA.visible = pointLightAVisible;
            pointLightB.visible = pointLightBVisible;
            pointLightC.visible = pointLightCVisible;
          }

          renderer.setRenderTarget(target);
          const finalMarkerVisible = pointLightA.visible;
          const finalMarkerBVisible = pointLightB.visible;
          const finalMarkerCVisible = pointLightC.visible;
          if (mode === "segmentIndentedAppliedFinalPointLights") {
            pointLightA.visible = true;
            pointLightB.visible = true;
            pointLightC.visible = true;
          }
          renderSegments(renderer, camera);
          if (mode === "segmentIndentedAppliedFinalPointLights") {
            pointLightA.visible = finalMarkerVisible;
            pointLightB.visible = finalMarkerBVisible;
            pointLightC.visible = finalMarkerCVisible;
          }
          renderer.setRenderTarget(null);

          const segmentObjectIdTarget = depthEdgeTargets.get("objectIds");
          const segmentNormalTarget = depthEdgeTargets.get("normals");
          const segmentTangentTarget = depthEdgeTargets.get("tangents");
          if (
            !segmentObjectIdTarget ||
            !segmentNormalTarget ||
            !segmentTangentTarget
          ) {
            return;
          }
          renderer.setRenderTarget(segmentObjectIdTarget);
          if (mode === "segmentIndentedAppliedFinalPointLights") {
            pointLightA.visible = true;
            pointLightB.visible = true;
            pointLightC.visible = true;
          }
          renderObjectIds(renderer, camera);
          if (mode === "segmentIndentedAppliedFinalPointLights") {
            pointLightA.visible = finalMarkerVisible;
            pointLightB.visible = finalMarkerBVisible;
            pointLightC.visible = finalMarkerCVisible;
          }
          renderer.setRenderTarget(null);

          scene.overrideMaterial =
            mode === "segmentBakedNormalMapView" ||
              mode === "segmentBakedNormalMapApplied"
              ? normalMaterial
              : worldNormalMaterial;
          renderer.setRenderTarget(segmentNormalTarget);
          if (mode === "segmentIndentedAppliedFinalPointLights") {
            pointLightA.visible = true;
            pointLightB.visible = true;
            pointLightC.visible = true;
          }
          renderer.render(scene, camera);
          if (mode === "segmentIndentedAppliedFinalPointLights") {
            pointLightA.visible = finalMarkerVisible;
            pointLightB.visible = finalMarkerBVisible;
            pointLightC.visible = finalMarkerCVisible;
          }
          renderer.setRenderTarget(null);

          scene.overrideMaterial =
            mode === "segmentBakedNormalMapView" ||
              mode === "segmentBakedNormalMapApplied"
              ? viewTangentMaterial
              : worldTangentMaterial;
          renderer.setRenderTarget(segmentTangentTarget);
          if (mode === "segmentIndentedAppliedFinalPointLights") {
            pointLightA.visible = true;
            pointLightB.visible = true;
            pointLightC.visible = true;
          }
          renderer.render(scene, camera);
          if (mode === "segmentIndentedAppliedFinalPointLights") {
            pointLightA.visible = finalMarkerVisible;
            pointLightB.visible = finalMarkerBVisible;
            pointLightC.visible = finalMarkerCVisible;
          }
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

          if (mode === "segmentInsetMask") {
            if (!standaloneSegmentMaskTarget) return;
            renderer.setRenderTarget(standaloneSegmentMaskTarget);
            renderer.render(postScene, postCamera);
            renderer.setRenderTarget(null);

            postQuad.material = segmentInsetMaskMaterial;
            segmentInsetMaskMaterial.uniforms.tSegmentMask.value =
              standaloneSegmentMaskTarget.texture;
            segmentInsetMaskMaterial.uniforms.texelSize.value.set(
              1 / target.width,
              1 / target.height,
            );

            renderer.setRenderTarget(outputTarget);
            renderer.render(postScene, postCamera);
            renderer.setRenderTarget(null);
            presentUpscaled(renderer, outputTarget, false);
            return;
          }

          if (
            mode === "segmentIndented" ||
            mode === "segmentIndentedOrbit" ||
            mode === "segmentIndentedNormal" ||
            mode === "segmentIndentedLit" ||
            mode === "segmentIndentedApplied" ||
            mode === "segmentIndentedAppliedOrbit" ||
            mode === "segmentIndentedAppliedPointLights" ||
            mode === "segmentIndentedAppliedFinal" ||
            mode === "segmentIndentedAppliedFinalPointLights" ||
            mode === "segmentBakedNormalMapView" ||
            mode === "segmentBakedNormalMapApplied"
          ) {
            if (!standaloneSegmentMaskTarget) return;

            renderer.setRenderTarget(standaloneSegmentMaskTarget);
            renderer.render(postScene, postCamera);
            renderer.setRenderTarget(null);

            if (!standaloneSegmentParticipationTarget) return;
            const participationUsesPointLightMarkers =
              mode === "segmentIndentedAppliedPointLights" ||
              mode === "segmentIndentedAppliedFinalPointLights";
            const pointLightAVisible = pointLightA.visible;
            const pointLightBVisible = pointLightB.visible;
            const pointLightCVisible = pointLightC.visible;
            if (participationUsesPointLightMarkers) {
              pointLightA.visible = true;
              pointLightB.visible =
                mode === "segmentIndentedAppliedPointLights" ||
                mode === "segmentIndentedAppliedFinalPointLights";
              pointLightC.visible =
                mode === "segmentIndentedAppliedPointLights" ||
                mode === "segmentIndentedAppliedFinalPointLights";
            }
            scene.overrideMaterial = occlusionDepthMaterial;
            renderer.setRenderTarget(standaloneSegmentParticipationTarget);
            renderer.clear(true, true, true);
            renderer.render(scene, camera);
            scene.overrideMaterial = null;
            if (participationUsesPointLightMarkers) {
              pointLightA.visible = pointLightAVisible;
              pointLightB.visible = pointLightBVisible;
              pointLightC.visible = pointLightCVisible;
            }
            const previousAutoClear = renderer.autoClear;
            renderer.autoClear = false;
            renderSegmentParticipation(renderer, camera);
            renderer.autoClear = previousAutoClear;
            renderer.setRenderTarget(null);

            if (!standaloneSegmentFieldTarget) return;
            renderer.setRenderTarget(standaloneSegmentFieldTarget);
            renderSegmentField(renderer, camera);
            renderer.setRenderTarget(null);

            if (!standaloneSegmentBakedNormalMapTarget) return;
            renderer.setRenderTarget(standaloneSegmentBakedNormalMapTarget);
            renderSegmentBakedNormalMap(renderer, camera);
            renderer.setRenderTarget(null);

            if (
              mode === "segmentIndentedAppliedPointLights" ||
              mode === "segmentIndentedAppliedFinalPointLights"
            ) {
              if (!standaloneWorldPositionTarget) return;
              scene.overrideMaterial = worldPositionMaterial;
              renderer.setRenderTarget(standaloneWorldPositionTarget);
              renderer.render(scene, camera);
              renderer.setRenderTarget(null);
              scene.overrideMaterial = null;
            }

            const worldLightDirection = new THREE.Vector3()
              .subVectors(keyLight.position, lookTarget)
              .normalize();

            const indentedMaterial =
              mode === "segmentIndented"
                ? segmentFieldDisplayMaterial
                : mode === "segmentIndentedLit"
                ? segmentIndentedLitMaterial
                : mode === "segmentIndentedApplied" ||
                    mode === "segmentIndentedAppliedOrbit"
                  ? segmentIndentedAppliedMaterial
                    : mode === "segmentIndentedAppliedPointLights" ||
                        mode === "segmentIndentedAppliedFinalPointLights"
                      ? segmentIndentedAppliedPointLightsMaterial
                      : mode === "segmentIndentedAppliedFinal"
                        ? segmentIndentedAppliedMaterial
                      : mode === "segmentBakedNormalMapView"
                        ? segmentBakedNormalMapViewMaterial
                        : mode === "segmentBakedNormalMapApplied"
                          ? segmentBakedNormalMapAppliedMaterial
                          : mode === "segmentIndentedNormal"
                            ? segmentIndentedNormalMaterial
                            : segmentIndentedMaterial;
            postQuad.material = indentedMaterial;
            if ("tColor" in indentedMaterial.uniforms) {
              indentedMaterial.uniforms.tColor.value =
                mode === "segmentIndentedNormal"
                  ? segmentNormalTarget.texture
                  : standaloneColorTarget.texture;
            }
            if ("tSegmentMask" in indentedMaterial.uniforms) {
              indentedMaterial.uniforms.tSegmentMask.value =
                standaloneSegmentMaskTarget.texture;
            }
            if ("tParticipation" in indentedMaterial.uniforms) {
              indentedMaterial.uniforms.tParticipation.value =
                standaloneSegmentParticipationTarget.texture;
            }
            if ("tBakedNormalMap" in indentedMaterial.uniforms) {
              indentedMaterial.uniforms.tBakedNormalMap.value =
                standaloneSegmentBakedNormalMapTarget.texture;
            }
            if ("tSegmentField" in indentedMaterial.uniforms) {
              indentedMaterial.uniforms.tSegmentField.value =
                standaloneSegmentFieldTarget?.texture ?? null;
            }
            if ("tWorldPosition" in indentedMaterial.uniforms) {
              indentedMaterial.uniforms.tWorldPosition.value =
                standaloneWorldPositionTarget?.texture ?? null;
            }
            if ("fieldUnderlay" in indentedMaterial.uniforms) {
              indentedMaterial.uniforms.fieldUnderlay.value =
                insetControlsRef.current.fieldUnderlay;
            }
            if ("directionStrength" in indentedMaterial.uniforms) {
              indentedMaterial.uniforms.directionStrength.value =
                insetControlsRef.current.directionStrength;
            }
            if ("baseNormalWeight" in indentedMaterial.uniforms) {
              indentedMaterial.uniforms.baseNormalWeight.value =
                insetControlsRef.current.baseNormalWeight;
            }
            if ("litThreshold" in indentedMaterial.uniforms) {
              indentedMaterial.uniforms.litThreshold.value =
                insetControlsRef.current.litThreshold;
            }
            if ("litFalloff" in indentedMaterial.uniforms) {
              indentedMaterial.uniforms.litFalloff.value =
                insetControlsRef.current.litFalloff;
            }
            if ("bevelStrength" in indentedMaterial.uniforms) {
              indentedMaterial.uniforms.bevelStrength.value =
                mode === "segmentIndentedLit" ||
                mode === "segmentIndentedApplied" ||
                mode === "segmentIndentedAppliedOrbit" ||
                mode === "segmentIndentedAppliedPointLights" ||
                mode === "segmentIndentedAppliedFinal" ||
                mode === "segmentIndentedAppliedFinalPointLights"
                  ? insetControlsRef.current.directionStrength *
                    SHARED_INDENT_TO_BEVEL_SCALE
                  : insetControlsRef.current.bevelStrength;
            }
            if ("darkenStrength" in indentedMaterial.uniforms) {
              indentedMaterial.uniforms.darkenStrength.value =
                insetControlsRef.current.darkenStrength;
            }
            if ("blend" in indentedMaterial.uniforms) {
              indentedMaterial.uniforms.blend.value =
                bakedNormalMapBlendRef.current;
            }
            if ("insetStrength" in indentedMaterial.uniforms) {
              indentedMaterial.uniforms.insetStrength.value =
                bakedNormalMapInsetStrengthRef.current;
            }
            if ("tNormals" in indentedMaterial.uniforms) {
              indentedMaterial.uniforms.tNormals.value =
                segmentNormalTarget.texture;
            }
            if ("tTangents" in indentedMaterial.uniforms) {
              indentedMaterial.uniforms.tTangents.value =
                segmentTangentTarget.texture;
            }
            if ("texelSize" in indentedMaterial.uniforms) {
              indentedMaterial.uniforms.texelSize.value.set(
                1 / target.width,
                1 / target.height,
              );
            }
            if ("lightDirection" in indentedMaterial.uniforms) {
              indentedMaterial.uniforms.lightDirection.value.copy(
                worldLightDirection,
              );
            }
            if ("pointLightA" in indentedMaterial.uniforms) {
              indentedMaterial.uniforms.pointLightA.value.copy(
                pointLightA.position,
              );
              if (mode === "segmentIndentedAppliedFinal") {
                indentedMaterial.uniforms.pointLightB.value.set(
                  9999,
                  9999,
                  9999,
                );
                indentedMaterial.uniforms.pointLightC.value.set(
                  9999,
                  9999,
                  9999,
                );
              } else {
                indentedMaterial.uniforms.pointLightB.value.copy(
                  pointLightB.position,
                );
                indentedMaterial.uniforms.pointLightC.value.copy(
                  pointLightC.position,
                );
              }
            }

            if (
              mode === "segmentIndentedAppliedFinal" ||
              mode === "segmentIndentedAppliedFinalPointLights"
            ) {
              if (!standaloneNormalTarget) return;

              scene.overrideMaterial = normalMaterial;
              renderer.setRenderTarget(standaloneNormalTarget);
              renderer.render(scene, camera);
              renderer.setRenderTarget(null);
              scene.overrideMaterial = null;

              if (!standaloneLightTarget) return;

              renderer.setRenderTarget(outputTarget);
              renderer.render(postScene, postCamera);
              renderer.setRenderTarget(null);

              const ambientVisible = ambient.visible;
              const keyLightVisible = keyLight.visible;
              const pointLightAVisible = pointLightA.visible;
              const pointLightBVisible = pointLightB.visible;
              const pointLightCVisible = pointLightC.visible;
              scene.overrideMaterial = lightMaskMaterial;
              ambient.visible = false;
              keyLight.visible = mode === "segmentIndentedAppliedFinal";
              pointLightA.visible =
                mode === "segmentIndentedAppliedFinalPointLights";
              pointLightB.visible =
                mode === "segmentIndentedAppliedFinalPointLights";
              pointLightC.visible =
                mode === "segmentIndentedAppliedFinalPointLights";
              renderer.setRenderTarget(standaloneLightTarget);
              renderer.render(scene, camera);
              renderer.setRenderTarget(null);
              ambient.visible = ambientVisible;
              keyLight.visible = keyLightVisible;
              pointLightA.visible = pointLightAVisible;
              pointLightB.visible = pointLightBVisible;
              pointLightC.visible = pointLightCVisible;
              scene.overrideMaterial = null;

              postQuad.material = augmentedBlendMaterial;
              augmentedBlendMaterial.uniforms.tColor.value = outputTarget.texture;
              augmentedBlendMaterial.uniforms.tDepth.value = target.depthTexture;
              augmentedBlendMaterial.uniforms.tNormals.value =
                standaloneNormalTarget.texture;
              augmentedBlendMaterial.uniforms.tObjectIds.value =
                segmentObjectIdTarget.texture;
              augmentedBlendMaterial.uniforms.tLight.value =
                standaloneLightTarget.texture;
              augmentedBlendMaterial.uniforms.inputIsSRGB.value = 1;
              augmentedBlendMaterial.uniforms.maskLightMarkersByColor.value =
                mode === "segmentIndentedAppliedFinalPointLights" ? 1 : 0;
              augmentedBlendMaterial.uniforms.objectIdOutlineStrength.value =
                OBJECT_ID_OUTLINE_STRENGTH;
              augmentedBlendMaterial.uniforms.internalDepthOutlineStrength.value =
                INTERNAL_DEPTH_OUTLINE_STRENGTH;
              augmentedBlendMaterial.uniforms.normalOutlineStrength.value =
                NORMAL_OUTLINE_STRENGTH;
              augmentedBlendMaterial.uniforms.texelSize.value.set(
                1 / target.width,
                1 / target.height,
              );

              renderer.setRenderTarget(standaloneColorTarget);
              renderer.render(postScene, postCamera);
              renderer.setRenderTarget(null);

              upscaleMaterial.uniforms.tInput.value = standaloneColorTarget.texture;
              upscaleMaterial.uniforms.textureSize.value.set(
                standaloneColorTarget.width,
                standaloneColorTarget.height,
              );
              upscaleMaterial.uniforms.encodeSrgb.value = 0;
              renderer.setRenderTarget(outputTarget);
              renderer.render(upscaleScene, postCamera);
              renderer.setRenderTarget(null);

              presentUpscaled(renderer, outputTarget, false);
              return;
            }
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

        renderer.setRenderTarget(outputTarget);
        renderer.render(postScene, postCamera);
        renderer.setRenderTarget(null);
        presentUpscaled(renderer, outputTarget, false);
      }
    };

    const animate = () => {
      if (disposed) return;

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
        activeModes.includes("segmentIndentedOrbit") ||
        activeModes.includes("segmentIndentedNormal") ||
        activeModes.includes("segmentIndentedLit") ||
        activeModes.includes("segmentIndentedApplied") ||
        activeModes.includes("segmentBakedNormalMapApplied")
      ) {
        const azimuth = keyLightBaseAngle + elapsed * 0.35;
        keyLight.position.set(
          Math.sin(azimuth) * keyLightRadius,
          keyLightHeight,
          Math.cos(azimuth) * keyLightRadius,
        );
      }

      if (activeModes.includes("segmentIndentedAppliedOrbit")) {
        const orbitYaw = cameraYaw + elapsed * 0.35;
        const orbitPosition = new THREE.Vector3(
          Math.sin(orbitYaw) * Math.cos(cameraPitch) * cameraDistance,
          target.y + Math.sin(cameraPitch) * cameraDistance,
          Math.cos(orbitYaw) * Math.cos(cameraPitch) * cameraDistance,
        );
        cameras
          .get("segmentIndentedAppliedOrbit")
          ?.position.copy(orbitPosition);
        cameras.get("segmentIndentedAppliedOrbit")?.lookAt(target);
      }

      if (activeModes.includes("segmentIndentedAppliedPointLights")) {
        const ringRadiusA = 2.35;
        const ringRadiusB = 2.55;
        const ringRadiusC = 2.2;
        pointLightA.position.set(
          Math.sin(elapsed * 0.9) * ringRadiusA,
          2.15 + Math.sin(elapsed * 1.1) * 0.45,
          Math.cos(elapsed * 1.1) * ringRadiusA,
        );
        pointLightB.position.set(
          Math.sin(elapsed * 1.2 + 1.6) * ringRadiusB,
          2.55 + Math.cos(elapsed * 0.9 + 0.8) * 0.5,
          Math.cos(elapsed * 0.85 + 0.9) * ringRadiusB,
        );
        pointLightC.position.set(
          Math.sin(elapsed * 0.75 + 3.1) * ringRadiusC,
          1.95 + Math.sin(elapsed * 1.35 + 0.5) * 0.4,
          Math.cos(elapsed * 1.35 + 2.4) * ringRadiusC,
        );

        const pointLightCamera = cameras.get(
          "segmentIndentedAppliedPointLights",
        );
        const pointLightDisplayTarget = resizeEntries.get(
          "segmentIndentedAppliedPointLights",
        )?.displayTarget;
        if (pointLightCamera && pointLightDisplayTarget) {
          pointLightA.position.copy(
            snapPositionToCameraTexels(
              pointLightA.position,
              pointLightCamera,
              pointLightDisplayTarget.width,
              pointLightDisplayTarget.height,
            ),
          );
          pointLightB.position.copy(
            snapPositionToCameraTexels(
              pointLightB.position,
              pointLightCamera,
              pointLightDisplayTarget.width,
              pointLightDisplayTarget.height,
            ),
          );
          pointLightC.position.copy(
            snapPositionToCameraTexels(
              pointLightC.position,
              pointLightCamera,
              pointLightDisplayTarget.width,
              pointLightDisplayTarget.height,
            ),
          );
        }
      }

      if (activeModes.includes("segmentIndentedAppliedFinal")) {
        const azimuth = keyLightBaseAngle + elapsed * 0.35;
        keyLight.position.set(
          Math.sin(azimuth) * keyLightRadius,
          keyLightHeight,
          Math.cos(azimuth) * keyLightRadius,
        );
        pointLightB.position.set(9999, 9999, 9999);
        pointLightC.position.set(9999, 9999, 9999);
        pointLightA.position.set(9999, 9999, 9999);
        cameras.get("segmentIndentedAppliedFinal")?.lookAt(target);
      }

      if (activeModes.includes("segmentIndentedAppliedFinalPointLights")) {
        pointLightA.position.set(
          Math.sin(elapsed * 0.9) * 2.35,
          2.15 + Math.sin(elapsed * 1.1) * 0.45,
          Math.cos(elapsed * 1.1) * 2.35,
        );
        pointLightB.position.set(
          Math.sin(elapsed * 1.2 + 1.6) * 2.55,
          2.55 + Math.cos(elapsed * 0.9 + 0.8) * 0.5,
          Math.cos(elapsed * 0.85 + 0.9) * 2.55,
        );
        pointLightC.position.set(
          Math.sin(elapsed * 0.75 + 3.1) * 2.2,
          1.95 + Math.sin(elapsed * 1.35 + 0.5) * 0.4,
          Math.cos(elapsed * 1.35 + 2.4) * 2.2,
        );
        const pointLightCamera = cameras.get(
          "segmentIndentedAppliedFinalPointLights",
        );
        const pointLightDisplayTarget = resizeEntries.get(
          "segmentIndentedAppliedFinalPointLights",
        )?.displayTarget;
        if (pointLightCamera && pointLightDisplayTarget) {
          pointLightA.position.copy(
            snapPositionToCameraTexels(
              pointLightA.position,
              pointLightCamera,
              pointLightDisplayTarget.width,
              pointLightDisplayTarget.height,
            ),
          );
          pointLightB.position.copy(
            snapPositionToCameraTexels(
              pointLightB.position,
              pointLightCamera,
              pointLightDisplayTarget.width,
              pointLightDisplayTarget.height,
            ),
          );
          pointLightC.position.copy(
            snapPositionToCameraTexels(
              pointLightC.position,
              pointLightCamera,
              pointLightDisplayTarget.width,
              pointLightDisplayTarget.height,
            ),
          );
        }
        cameras.get("segmentIndentedAppliedFinalPointLights")?.lookAt(target);
      }

      if (activeModes.includes("segmentIndentedOrbit")) {
        const orbitYaw = cameraYaw + elapsed * 0.35;
        const orbitPosition = new THREE.Vector3(
          Math.sin(orbitYaw) * Math.cos(cameraPitch) * cameraDistance,
          target.y + Math.sin(cameraPitch) * cameraDistance,
          Math.cos(orbitYaw) * Math.cos(cameraPitch) * cameraDistance,
        );
        cameras.get("segmentIndentedOrbit")?.position.copy(orbitPosition);
        cameras.get("segmentIndentedOrbit")?.lookAt(target);
      }

      const segmentCellLightDirection = new THREE.Vector3()
        .subVectors(keyLight.position, lookTarget)
        .normalize();
      const fieldBlend = insetControlsRef.current.fieldBlend;
      segmentFieldTexturePreviewMaterial.uniforms.fieldBlend.value = fieldBlend;
      segmentFieldMaterials.forEach((material) => {
        material.uniforms.fieldBlend.value = fieldBlend;
      });
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
    clock.start();
    frameId = window.requestAnimationFrame(animate);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      resizeObserver.disconnect();
      depthEdgeMaterialRef.current = null;
      normalEdgeMaterialRef.current = null;
      augmentedBlendMaterialRef.current = null;
      blendMaterialRef.current = null;

      renderers.forEach((renderer, mode) => {
        const mount = mounts[mode];
        const displayTarget = resizeEntries.get(mode)?.displayTarget;
        renderer.renderLists.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
        displayTarget?.dispose();
        if (mount?.contains(renderer.domElement)) {
          mount.removeChild(renderer.domElement);
        }
      });

      normalMaterial.dispose();
      worldNormalMaterial.dispose();
      worldTangentMaterial.dispose();
      viewTangentMaterial.dispose();
      worldPositionMaterial.dispose();
      occlusionDepthMaterial.dispose();
      depthMaterial.dispose();
      depthEdgeMaterial.dispose();
      normalEdgeMaterial.dispose();
      objectIdEdgeMaterial.dispose();
      segmentEdgeMaterial.dispose();
      segmentAxesMaterial.dispose();
      segmentInsetMaskMaterial.dispose();
      segmentIndentedMaterial.dispose();
      segmentFieldDisplayMaterial.dispose();
      segmentIndentedNormalMaterial.dispose();
      upscaleMaterial.dispose();
      upscaleQuad.geometry.dispose();
      segmentIndentedLitMaterial.dispose();
      segmentIndentedAppliedMaterial.dispose();
      segmentBakedNormalMapTexturePreviewMaterial.dispose();
      segmentBakedNormalMapViewMaterial.dispose();
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
      standaloneSegmentParticipationTarget?.dispose();
      standaloneSegmentFieldTarget?.dispose();
      standaloneWorldPositionTarget?.dispose();
      standaloneSegmentBakedNormalMapTarget?.dispose();
      pointLightMarkerGeometry.dispose();
      pointLightMarkerMaterialA.dispose();
      pointLightMarkerMaterialB.dispose();
      pointLightMarkerMaterialC.dispose();
      voxelMaterial.dispose();
      stoneMaterial.dispose();
      pedestalSideMaterial.dispose();
      pedestalBottomMaterial.dispose();
      segmentPedestalMaterial.dispose();
      segmentFloorMaterial.dispose();
      segmentPillarMaterial.dispose();
      segmentEnabledMaterial.dispose();
      segmentFieldMaterials.forEach((material) => material.dispose());
      segmentCellBevelMaterials.forEach((material) => material.dispose());
      segmentDisabledMaterial.dispose();
      crystalMaterial.dispose();
      segmentFieldTexturePreviewMaterial.dispose();
      disposableModelMaterials.forEach((material) => material.dispose());
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
  }, [
    mode,
    segmentTextureDependency,
    segmentFieldDependency,
    segmentFieldRevision,
    isRendererActive,
  ]);

  const showDepthControl =
    mode === "depthEdgesOnly" ||
    mode === "normalEdgesOnly" ||
    mode === "blendOnly";
  const showAugmentedBlendControls = mode === "augmentedBlendOnly";
  const shouldShowSegmentTexturePicker =
    showSegmentTexturePicker ||
    mode === "segmentOnly" ||
    mode === "segmentInsetMaskOnly" ||
    mode === "segmentCellBevelOnly" ||
    mode === "segmentEdgesOnly" ||
    mode === "segmentIndentedOnly" ||
    mode === "segmentIndentedOrbitOnly" ||
    mode === "segmentIndentedLitOnly" ||
    mode === "segmentIndentedAppliedOnly" ||
    mode === "segmentIndentedAppliedOrbitOnly" ||
    mode === "segmentIndentedAppliedPointLightsOnly" ||
    mode === "segmentBakedNormalMapTextureOnly" ||
    mode === "segmentBakedNormalMapViewOnly" ||
    mode === "segmentBakedNormalMapAppliedOnly" ||
    mode === "combinedMaskOnly";
  const showSegmentFieldUnderlayControl = mode === "segmentIndentedOrbitOnly";
  const showSegmentFieldBlendControl =
    mode === "segmentIndentedOnly" ||
    mode === "segmentIndentedOrbitOnly" ||
    mode === "segmentIndentedNormalOnly" ||
    mode === "segmentIndentedLitOnly" ||
    mode === "segmentIndentedAppliedOnly" ||
    mode === "segmentIndentedAppliedOrbitOnly" ||
    mode === "segmentIndentedAppliedPointLightsOnly";
  const showInsetNormalControls =
    mode === "segmentIndentedNormalOnly" ||
    mode === "segmentIndentedLitOnly" ||
    mode === "segmentIndentedAppliedOnly" ||
    mode === "segmentIndentedAppliedOrbitOnly" ||
    mode === "segmentIndentedAppliedPointLightsOnly";
  const useSharedIndentBevelControl =
    mode === "segmentIndentedLitOnly" ||
    mode === "segmentIndentedAppliedOnly" ||
    mode === "segmentIndentedAppliedOrbitOnly" ||
    mode === "segmentIndentedAppliedPointLightsOnly";
  const showInsetLitThresholdControl =
    mode === "segmentIndentedLitOnly" ||
    mode === "segmentIndentedAppliedOnly" ||
    mode === "segmentIndentedAppliedOrbitOnly" ||
    mode === "segmentIndentedAppliedPointLightsOnly";
  const showInsetBevelStrengthControl = showInsetLitThresholdControl;
  const showInsetDarkenStrengthControl = false;
  const showBakedNormalMapBlendControl =
    mode === "segmentBakedNormalMapViewOnly" ||
    mode === "segmentBakedNormalMapAppliedOnly";
  const showBakedNormalMapInsetControl =
    mode === "segmentBakedNormalMapViewOnly";

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

  const updateInsetControls = (
    next: Partial<{
      fieldUnderlay: number;
      directionStrength: number;
      baseNormalWeight: number;
      litThreshold: number;
      litFalloff: number;
      bevelStrength: number;
      darkenStrength: number;
      fieldMode: "quantized" | "smooth" | "blend";
      fieldBlend: number;
    }>,
  ) => {
    if (typeof next.fieldUnderlay === "number") {
      setSegmentFieldUnderlay(next.fieldUnderlay);
    }
    if (typeof next.directionStrength === "number") {
      setInsetDirectionStrength(next.directionStrength);
    }
    if (typeof next.litThreshold === "number") {
      setInsetLitThreshold(next.litThreshold);
    }
    if (typeof next.litFalloff === "number") {
      setInsetLitFalloff(next.litFalloff);
    }
    if (typeof next.bevelStrength === "number") {
      setInsetBevelStrength(next.bevelStrength);
    }
    if (typeof next.darkenStrength === "number") {
      setInsetDarkenStrength(next.darkenStrength);
    }
    if (typeof next.fieldBlend === "number") {
      setInsetFieldBlend(next.fieldBlend);
    }
    if (typeof window === "undefined") return;
    const merged = {
      ...insetControlsRef.current,
      ...next,
    };
    window.localStorage.setItem(
      INSET_CONTROLS_STORAGE_KEY,
      JSON.stringify(merged),
    );
    window.dispatchEvent(
      new CustomEvent(INSET_CONTROLS_EVENT, {
        detail: merged,
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

      {mode === "segmentFieldTextureOnly" && (
        <div
          ref={segmentFieldTextureRef}
          className="pixel-buffer-demo__viewport pixel-buffer-demo__viewport--solo"
        />
      )}

      {mode === "segmentCenterFieldOnly" && (
        <div
          ref={segmentCenterFieldRef}
          className="pixel-buffer-demo__viewport pixel-buffer-demo__viewport--solo"
        />
      )}

      {mode === "segmentInsetMaskOnly" && (
        <div
          ref={segmentInsetMaskRef}
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

      {mode === "segmentIndentedOrbitOnly" && (
        <div
          ref={segmentIndentedOrbitRef}
          className="pixel-buffer-demo__viewport pixel-buffer-demo__viewport--solo"
        />
      )}

      {mode === "segmentIndentedNormalOnly" && (
        <div
          ref={segmentIndentedNormalRef}
          className="pixel-buffer-demo__viewport pixel-buffer-demo__viewport--solo"
        />
      )}

      {mode === "segmentIndentedLitOnly" && (
        <div
          ref={segmentIndentedLitRef}
          className="pixel-buffer-demo__viewport pixel-buffer-demo__viewport--solo"
        />
      )}

      {mode === "segmentIndentedAppliedOnly" && (
        <div
          ref={segmentIndentedAppliedRef}
          className="pixel-buffer-demo__viewport pixel-buffer-demo__viewport--solo"
        />
      )}

      {mode === "segmentIndentedAppliedOrbitOnly" && (
        <div
          ref={segmentIndentedAppliedOrbitRef}
          className="pixel-buffer-demo__viewport pixel-buffer-demo__viewport--solo"
        />
      )}

      {mode === "segmentIndentedAppliedPointLightsOnly" && (
        <div
          ref={segmentIndentedAppliedPointLightsRef}
          className="pixel-buffer-demo__viewport pixel-buffer-demo__viewport--solo"
        />
      )}

      {mode === "segmentIndentedAppliedFinalOnly" && (
        <div
          ref={segmentIndentedAppliedFinalRef}
          className="pixel-buffer-demo__viewport pixel-buffer-demo__viewport--solo"
        />
      )}

      {mode === "segmentIndentedAppliedFinalPointLightsOnly" && (
        <div
          ref={segmentIndentedAppliedFinalPointLightsRef}
          className="pixel-buffer-demo__viewport pixel-buffer-demo__viewport--solo"
        />
      )}

      {mode === "segmentBakedNormalMapTextureOnly" && (
        <div
          ref={segmentBakedNormalMapTextureRef}
          className="pixel-buffer-demo__viewport pixel-buffer-demo__viewport--solo"
        />
      )}

      {mode === "segmentBakedNormalMapViewOnly" && (
        <div
          ref={segmentBakedNormalMapViewRef}
          className="pixel-buffer-demo__viewport pixel-buffer-demo__viewport--solo"
        />
      )}

      {mode === "segmentBakedNormalMapAppliedOnly" && (
        <div
          ref={segmentBakedNormalMapAppliedRef}
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

      {shouldShowSegmentTexturePicker && (
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

      {showSegmentFieldUnderlayControl && (
        <div className="pixel-buffer-demo__controls">
          <div className="pixel-buffer-demo__control-row">
            <label
              className="pixel-buffer-demo__control"
              aria-label="Field underlay"
            >
              <span>Field Underlay</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={segmentFieldUnderlay}
                onChange={(event) =>
                  updateInsetControls({
                    fieldUnderlay: Number(event.currentTarget.value),
                  })
                }
              />
            </label>
            <button
              className="pixel-buffer-demo__reset"
              type="button"
              aria-label="Reset field underlay"
              onClick={() => updateInsetControls({ fieldUnderlay: 0.35 })}
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

      {showSegmentFieldBlendControl && (
        <div className="pixel-buffer-demo__controls">
          <div className="pixel-buffer-demo__control-row">
            <label
              className="pixel-buffer-demo__control"
              aria-label="Field blend"
            >
              <span>Field Blend</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={insetFieldBlend}
                onChange={(event) =>
                  updateInsetControls({
                    fieldBlend: Number(event.currentTarget.value),
                  })
                }
              />
            </label>
            <button
              className="pixel-buffer-demo__reset"
              type="button"
              aria-label="Reset field blend"
              onClick={() =>
                updateInsetControls({
                  fieldBlend: INSET_FIELD_BLEND,
                })
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
        </div>
      )}

      {showInsetNormalControls && (
        <div className="pixel-buffer-demo__controls">
          {!useSharedIndentBevelControl && (
            <div className="pixel-buffer-demo__control-row">
              <label
                className="pixel-buffer-demo__control"
                aria-label="Indent strength"
              >
                <span>Indent Strength</span>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.01"
                  value={insetDirectionStrength}
                  onChange={(event) =>
                    updateInsetControls({
                      directionStrength: Number(event.currentTarget.value),
                    })
                  }
                />
              </label>
              <button
                className="pixel-buffer-demo__reset"
                type="button"
                aria-label="Reset inset direction strength"
                onClick={() =>
                  updateInsetControls({
                    directionStrength: INSET_DIRECTION_STRENGTH,
                  })
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
          )}

          {showInsetBevelStrengthControl && (
            <div className="pixel-buffer-demo__control-row">
              <label
                className="pixel-buffer-demo__control"
                aria-label={
                  useSharedIndentBevelControl
                    ? "Indent strength"
                    : "Bevel strength"
                }
              >
                <span>
                  {useSharedIndentBevelControl
                    ? "Indent Strength"
                    : "Bevel Strength"}
                </span>
                <input
                  type="range"
                  min="0"
                  max={useSharedIndentBevelControl ? "2" : "4"}
                  step="0.01"
                  value={
                    useSharedIndentBevelControl
                      ? insetDirectionStrength
                      : insetBevelStrength
                  }
                  onChange={(event) =>
                    updateInsetControls({
                      ...(useSharedIndentBevelControl
                        ? {
                            directionStrength: Number(
                              event.currentTarget.value,
                            ),
                            bevelStrength:
                              Number(event.currentTarget.value) *
                              SHARED_INDENT_TO_BEVEL_SCALE,
                          }
                        : {
                            bevelStrength: Number(event.currentTarget.value),
                          }),
                    })
                  }
                />
              </label>
              <button
                className="pixel-buffer-demo__reset"
                type="button"
                aria-label={
                  useSharedIndentBevelControl
                    ? "Reset indent strength"
                    : "Reset bevel strength"
                }
                onClick={() =>
                  updateInsetControls({
                    ...(useSharedIndentBevelControl
                      ? {
                          directionStrength: INSET_DIRECTION_STRENGTH,
                          bevelStrength:
                            INSET_DIRECTION_STRENGTH *
                            SHARED_INDENT_TO_BEVEL_SCALE,
                        }
                      : {
                          bevelStrength: INSET_BEVEL_STRENGTH,
                        }),
                  })
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
          )}

          {showInsetLitThresholdControl && (
            <>
              <div className="pixel-buffer-demo__control-row">
                <label
                  className="pixel-buffer-demo__control"
                  aria-label="Primary threshold"
                >
                  <span>Primary Threshold</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={insetLitThreshold}
                    onChange={(event) =>
                      updateInsetControls({
                        litThreshold: Number(event.currentTarget.value),
                      })
                    }
                  />
                </label>
                <button
                  className="pixel-buffer-demo__reset"
                  type="button"
                  aria-label="Reset primary threshold"
                  onClick={() =>
                    updateInsetControls({
                      litThreshold: INSET_LIT_THRESHOLD,
                    })
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
                  aria-label="Threshold falloff"
                >
                  <span>Threshold Falloff</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={insetLitFalloff}
                    onChange={(event) =>
                      updateInsetControls({
                        litFalloff: Number(event.currentTarget.value),
                      })
                    }
                  />
                </label>
                <button
                  className="pixel-buffer-demo__reset"
                  type="button"
                  aria-label="Reset threshold falloff"
                  onClick={() =>
                    updateInsetControls({
                      litFalloff: INSET_LIT_FALLOFF,
                    })
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

          {showInsetDarkenStrengthControl && (
            <div className="pixel-buffer-demo__control-row">
              <label
                className="pixel-buffer-demo__control"
                aria-label="Inset darken strength"
              >
                <span>Darken Strength</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={insetDarkenStrength}
                  onChange={(event) =>
                    updateInsetControls({
                      darkenStrength: Number(event.currentTarget.value),
                    })
                  }
                />
              </label>
              <button
                className="pixel-buffer-demo__reset"
                type="button"
                aria-label="Reset inset darken strength"
                onClick={() =>
                  updateInsetControls({
                    darkenStrength: INSET_DARKEN_STRENGTH,
                  })
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
          )}
        </div>
      )}

      {showBakedNormalMapBlendControl && (
        <div className="pixel-buffer-demo__controls">
          <div className="pixel-buffer-demo__control-row">
            <label
              className="pixel-buffer-demo__control"
              aria-label="Baked normal map blend"
            >
              <span>Normal Map Blend</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={bakedNormalMapBlend}
                onChange={(event) =>
                  setBakedNormalMapBlend(Number(event.currentTarget.value))
                }
              />
            </label>
            <button
              className="pixel-buffer-demo__reset"
              type="button"
              aria-label="Reset baked normal map blend"
              onClick={() => setBakedNormalMapBlend(BAKED_NORMAL_MAP_BLEND)}
            >
              <svg viewBox="0 0 32 32" aria-hidden="true">
                <path
                  d="M18,28A12,12,0,1,0,6,16v6.2L2.4,18.6,1,20l6,6,6-6-1.4-1.4L8,22.2V16H8A10,10,0,1,1,18,26Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
          {showBakedNormalMapInsetControl && (
            <div className="pixel-buffer-demo__control-row">
              <label
                className="pixel-buffer-demo__control"
                aria-label="Baked normal map inset strength"
              >
                <span>Inset Strength</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={bakedNormalMapInsetStrength}
                  onChange={(event) =>
                    setBakedNormalMapInsetStrength(
                      Number(event.currentTarget.value),
                    )
                  }
                />
              </label>
              <button
                className="pixel-buffer-demo__reset"
                type="button"
                aria-label="Reset baked normal map inset strength"
                onClick={() =>
                  setBakedNormalMapInsetStrength(
                    BAKED_NORMAL_MAP_INSET_STRENGTH,
                  )
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
          )}
        </div>
      )}
    </div>
  );
}
