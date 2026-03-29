import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPixelatedPass } from "three/addons/postprocessing/RenderPixelatedPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

export default function PixelatedStudy() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = null;
    const pixelSize = 3;
    const orthoSize = 1.5;

    const width = Math.max(mount.clientWidth, 1);
    const height = Math.max(mount.clientHeight, 1);
    const aspectRatio = width / height;

    const camera = new THREE.OrthographicCamera(
      -aspectRatio * orthoSize,
      aspectRatio * orthoSize,
      orthoSize,
      -orthoSize,
      0.1,
      10,
    );
    const cameraPitch = Math.PI / 6;
    const cameraDistance = 2;
    const cameraYaw = -Math.PI / 4;
    const target = new THREE.Vector3(0, 0.6, 0);
    camera.position.set(
      Math.sin(cameraYaw) * Math.cos(cameraPitch) * cameraDistance,
      target.y + Math.sin(cameraPitch) * cameraDistance,
      Math.cos(cameraYaw) * Math.cos(cameraPitch) * cameraDistance,
    );
    camera.lookAt(target);

    const timer = new THREE.Timer();
    timer.connect(document);

    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.maxZoom = 2;
    controls.target.copy(target);
    controls.update();

    const composer = new EffectComposer(renderer);
    const pixelPass = new RenderPixelatedPass(pixelSize, scene, camera);
    pixelPass.normalEdgeStrength = 0.3;
    pixelPass.depthEdgeStrength = 0.4;
    composer.addPass(pixelPass);
    composer.addPass(new OutputPass());

    const pixelTexture = (texture: THREE.Texture) => {
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      texture.generateMipmaps = false;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };

    const textureLoader = new THREE.TextureLoader();
    const groundTexture = pixelTexture(
      textureLoader.load("/images/checker.png"),
    );
    groundTexture.repeat.set(3, 3);
    const boxTexture = pixelTexture(textureLoader.load("/images/checker.png"));
    boxTexture.repeat.set(1.5, 1.5);

    const boxMaterial = new THREE.MeshPhongMaterial({ map: boxTexture });

    const addBox = (size: number, x: number, z: number, rotation: number) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(size, size, size),
        boxMaterial,
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.rotation.y = rotation;
      mesh.position.set(x, size / 2 + 0.0001, z);
      scene.add(mesh);
      return mesh;
    };

    addBox(0.4, 0, 0, Math.PI / 4);
    addBox(0.5, -0.5, -0.5, Math.PI / 4);

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.MeshPhongMaterial({ map: groundTexture }),
    );
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    scene.add(plane);

    const crystal = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.2),
      new THREE.MeshPhongMaterial({
        color: 0x68b7e9,
        emissive: 0x4f7e8b,
        shininess: 10,
        specular: 0xffffff,
      }),
    );
    crystal.castShadow = true;
    crystal.receiveShadow = true;
    crystal.position.y = 0.7;
    scene.add(crystal);

    scene.add(new THREE.AmbientLight(0x757f8e, 3));

    const directional = new THREE.DirectionalLight(0xfffecd, 1.5);
    directional.position.set(100, 100, 100);
    directional.castShadow = true;
    directional.shadow.mapSize.set(2048, 2048);
    scene.add(directional);

    const spot = new THREE.SpotLight(0xffc100, 10, 10, Math.PI / 16, 0.02, 2);
    spot.position.set(2, 2, 0);
    spot.castShadow = true;
    scene.add(spot);
    scene.add(spot.target);
    spot.target.position.set(0, 0, 0);

    const easeInOutCubic = (x: number) => x ** 2 * 3 - x ** 3 * 2;
    const linearStep = (x: number, edge0: number, edge1: number) => {
      const w = edge1 - edge0;
      const m = 1 / w;
      const y0 = -m * edge0;
      return THREE.MathUtils.clamp(y0 + m * x, 0, 1);
    };
    const stopGoEased = (x: number, downtime: number, period: number) => {
      const cycle = Math.floor(x / period);
      const tween = x - cycle * period;
      const linStep = easeInOutCubic(linearStep(tween, downtime, period));
      return cycle + linStep;
    };
    const pixelAlignFrustum = (
      activeCamera: THREE.OrthographicCamera,
      activeAspectRatio: number,
      pixelsPerScreenWidth: number,
      pixelsPerScreenHeight: number,
    ) => {
      const worldScreenWidth =
        (activeCamera.right - activeCamera.left) / activeCamera.zoom;
      const worldScreenHeight =
        (activeCamera.top - activeCamera.bottom) / activeCamera.zoom;
      const pixelWidth = worldScreenWidth / pixelsPerScreenWidth;
      const pixelHeight = worldScreenHeight / pixelsPerScreenHeight;

      const camPos = new THREE.Vector3();
      activeCamera.getWorldPosition(camPos);
      const camRot = new THREE.Quaternion();
      activeCamera.getWorldQuaternion(camRot);
      const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camRot);
      const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camRot);
      const camPosRight = camPos.dot(camRight);
      const camPosUp = camPos.dot(camUp);
      const camPosRightPx = camPosRight / pixelWidth;
      const camPosUpPx = camPosUp / pixelHeight;
      const fractX = camPosRightPx - Math.round(camPosRightPx);
      const fractY = camPosUpPx - Math.round(camPosUpPx);

      activeCamera.left = -activeAspectRatio * orthoSize - fractX * pixelWidth;
      activeCamera.right = activeAspectRatio * orthoSize - fractX * pixelWidth;
      activeCamera.top = orthoSize - fractY * pixelHeight;
      activeCamera.bottom = -orthoSize - fractY * pixelHeight;
      activeCamera.updateProjectionMatrix();
    };

    const resize = () => {
      const nextWidth = Math.max(mount.clientWidth, 1);
      const nextHeight = Math.max(mount.clientHeight, 1);
      const nextAspect = nextWidth / nextHeight;

      camera.left = -nextAspect * orthoSize;
      camera.right = nextAspect * orthoSize;
      camera.top = orthoSize;
      camera.bottom = -orthoSize;
      camera.updateProjectionMatrix();

      renderer.setSize(nextWidth, nextHeight);
      composer.setSize(nextWidth, nextHeight);
    };

    const animate = () => {
      timer.update();
      const elapsed = timer.getElapsed();

      crystal.material.emissiveIntensity = Math.sin(elapsed * 3) * 0.5 + 0.5;
      crystal.position.y = 0.7 + Math.sin(elapsed * 2) * 0.05;
      crystal.rotation.y = stopGoEased(elapsed, 2, 4) * 2 * Math.PI;

      const rendererSize = renderer.getSize(new THREE.Vector2());
      const currentAspectRatio = rendererSize.x / rendererSize.y;
      pixelAlignFrustum(
        camera,
        currentAspectRatio,
        Math.floor(rendererSize.x / pixelSize),
        Math.floor(rendererSize.y / pixelSize),
      );

      composer.render();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    window.addEventListener("resize", resize);
    renderer.setAnimationLoop(animate);

    return () => {
      window.removeEventListener("resize", resize);
      resizeObserver.disconnect();
      renderer.setAnimationLoop(null);
      composer.dispose();
      renderer.dispose();
      controls.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="pixelated-study" aria-hidden="true" />;
}
