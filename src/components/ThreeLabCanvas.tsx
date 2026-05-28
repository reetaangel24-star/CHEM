import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Props {
  reactionColor: string;
  hasGas: boolean;
  hasPrecipitate: boolean;
}

function hexToRGB(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16) / 255, g: parseInt(result[2], 16) / 255, b: parseInt(result[3], 16) / 255 }
    : { r: 0.9, g: 0.95, b: 1 };
}

export default function ThreeLabCanvas({ reactionColor, hasGas, hasPrecipitate }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    frameId: number;
    flask: THREE.Mesh;
    liquid: THREE.Mesh;
    particles: THREE.Points[];
    burette: THREE.Group;
    testTubes: THREE.Group[];
    beaker: THREE.Mesh;
    time: number;
  } | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1e);
    scene.fog = new THREE.FogExp2(0x0a0f1e, 0.05);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 2.5, 7);
    camera.lookAt(0, 0.5, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    // Lights
    const ambient = new THREE.AmbientLight(0x1a2a4a, 0.8);
    scene.add(ambient);

    const pointLight = new THREE.PointLight(0x00e5ff, 1.5, 20);
    pointLight.position.set(-2, 4, 2);
    pointLight.castShadow = true;
    scene.add(pointLight);

    const rimLight = new THREE.PointLight(0x4488ff, 0.8, 15);
    rimLight.position.set(3, 3, -2);
    scene.add(rimLight);

    const labLight = new THREE.DirectionalLight(0xffffff, 0.4);
    labLight.position.set(0, 8, 4);
    scene.add(labLight);

    // Lab bench/table
    const benchGeo = new THREE.BoxGeometry(10, 0.15, 3.5);
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x1a2535, roughness: 0.8, metalness: 0.1 });
    const bench = new THREE.Mesh(benchGeo, benchMat);
    bench.position.y = -0.5;
    bench.receiveShadow = true;
    scene.add(bench);

    // Bench legs
    [[-4.5, -1.5, -1.5], [4.5, -1.5, -1.5], [-4.5, -1.5, 1.5], [4.5, -1.5, 1.5]].forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2, 0.1), new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.6 }));
      leg.position.set(x, y, z);
      scene.add(leg);
    });

    // Grid lines on bench
    const grid = new THREE.GridHelper(10, 20, 0x1e3a5f, 0x0d1f35);
    grid.position.y = -0.42;
    grid.position.z = -0.25;
    scene.add(grid);

    // --- Main Erlenmeyer Flask ---
    const flaskGroup = new THREE.Group();
    scene.add(flaskGroup);
    flaskGroup.position.set(-0.5, -0.42, 0);

    // Flask body (cone-like)
    const flaskBodyGeo = new THREE.CylinderGeometry(0.6, 0.65, 1.0, 32, 1, true);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xd0e8ff, transparent: true, opacity: 0.25,
      roughness: 0.05, metalness: 0, transmission: 0.95,
      thickness: 0.5, envMapIntensity: 1,
    });
    const flaskBody = new THREE.Mesh(flaskBodyGeo, glassMat);
    flaskBody.position.y = 0.5;
    flaskGroup.add(flaskBody);

    // Flask neck
    const flaskNeck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.35, 0.6, 16, 1, true),
      glassMat
    );
    flaskNeck.position.y = 1.3;
    flaskGroup.add(flaskNeck);

    // Flask neck top rim
    const flaskRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.15, 0.02, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0x88aabb, metalness: 0.3 })
    );
    flaskRim.position.y = 1.6;
    flaskGroup.add(flaskRim);

    // Flask bottom disk
    const flaskBottom = new THREE.Mesh(
      new THREE.CircleGeometry(0.65, 32),
      glassMat
    );
    flaskBottom.rotation.x = -Math.PI / 2;
    flaskGroup.add(flaskBottom);

    // Liquid inside flask
    const { r, g, b } = hexToRGB(reactionColor);
    const liquidMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(r, g, b),
      transparent: true,
      opacity: 0.7,
      roughness: 0.1,
    });
    const liquidGeo = new THREE.CylinderGeometry(0.58, 0.63, 0.5, 32);
    const liquid = new THREE.Mesh(liquidGeo, liquidMat);
    liquid.position.y = 0.25;
    flaskGroup.add(liquid);

    // --- Burette ---
    const buretteGroup = new THREE.Group();
    buretteGroup.position.set(1.5, -0.42, 0);
    scene.add(buretteGroup);

    const buretteTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 2.5, 12),
      new THREE.MeshPhysicalMaterial({ color: 0xd0e8ff, transparent: true, opacity: 0.3, roughness: 0.05 })
    );
    buretteTube.position.y = 1.25;
    buretteGroup.add(buretteTube);

    // Burette liquid
    const buretteLiquid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 1.8, 12),
      new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.6 })
    );
    buretteLiquid.position.y = 1.5;
    buretteGroup.add(buretteLiquid);

    // Burette stand
    const stand = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 3, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x334455, metalness: 0.8 })
    );
    stand.position.set(-0.3, 1, 0);
    buretteGroup.add(stand);

    const clamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.08, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x556677, metalness: 0.6 })
    );
    clamp.position.set(-0.15, 1.6, 0);
    buretteGroup.add(clamp);

    // Base plate
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.05, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x1a2535, metalness: 0.4 })
    );
    base.position.y = -0.02;
    buretteGroup.add(base);

    // --- Test tubes rack ---
    const testTubesGroup = new THREE.Group();
    testTubesGroup.position.set(-2.2, -0.42, 0);
    scene.add(testTubesGroup);

    const tubeColors = [0xff6b6b, 0xffd700, 0x88ccff, 0x88ff88];
    for (let i = 0; i < 4; i++) {
      const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.7, 12, 1, true),
        new THREE.MeshPhysicalMaterial({ color: 0xd0e8ff, transparent: true, opacity: 0.3 })
      );
      tube.position.set(i * 0.22 - 0.33, 0.55, 0);
      testTubesGroup.add(tube);

      const tubeLiquid = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.2 + i * 0.05, 12),
        new THREE.MeshStandardMaterial({ color: tubeColors[i], transparent: true, opacity: 0.8 })
      );
      tubeLiquid.position.set(i * 0.22 - 0.33, 0.1 + i * 0.03, 0);
      testTubesGroup.add(tubeLiquid);
    }

    // Rack bar
    const rack = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.05, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x334455 })
    );
    rack.position.set(0, 0.02, 0);
    testTubesGroup.add(rack);

    // --- Beaker with stirrer ---
    const beakerGroup = new THREE.Group();
    beakerGroup.position.set(2.5, -0.42, 0);
    scene.add(beakerGroup);

    const beaker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.35, 0.8, 24, 1, true),
      new THREE.MeshPhysicalMaterial({ color: 0xd0e8ff, transparent: true, opacity: 0.25, roughness: 0.05 })
    );
    beaker.position.y = 0.4;
    beakerGroup.add(beaker);

    const beakerBottom = new THREE.Mesh(
      new THREE.CircleGeometry(0.35, 24),
      glassMat
    );
    beakerBottom.rotation.x = -Math.PI / 2;
    beakerGroup.add(beakerBottom);

    const beakerLiquid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.30, 0.45, 24),
      new THREE.MeshStandardMaterial({ color: 0xaaddff, transparent: true, opacity: 0.6 })
    );
    beakerLiquid.position.y = 0.22;
    beakerGroup.add(beakerLiquid);

    // Stirring rod
    const stirrer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 1, 8),
      new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8 })
    );
    stirrer.position.set(0.1, 0.5, 0);
    stirrer.rotation.z = 0.3;
    beakerGroup.add(stirrer);

    // Gas particle system
    const particles: THREE.Points[] = [];

    function createGasParticles() {
      const geo = new THREE.BufferGeometry();
      const count = 80;
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 0.8 - 0.5;
        pos[i * 3 + 1] = Math.random() * 1.5 + 1.5;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({ color: 0xaaffff, size: 0.04, transparent: true, opacity: 0.7 });
      const points = new THREE.Points(geo, mat);
      scene.add(points);
      particles.push(points);
    }

    // Precipitate particles
    function createPrecipitate() {
      const geo = new THREE.BufferGeometry();
      const count = 120;
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const r2 = Math.random() * 0.55;
        const a = Math.random() * Math.PI * 2;
        pos[i * 3] = Math.cos(a) * r2 - 0.5;
        pos[i * 3 + 1] = Math.random() * 0.4 - 0.4;
        pos[i * 3 + 2] = Math.sin(a) * r2;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.02, transparent: true, opacity: 0.8 });
      const points = new THREE.Points(geo, mat);
      scene.add(points);
      particles.push(points);
    }

    let time = 0;

    function animate() {
      time += 0.016;

      // Gentle camera sway
      camera.position.x = Math.sin(time * 0.1) * 0.3;
      camera.lookAt(0, 0.5, 0);

      // Liquid gentle wave
      if (liquid) {
        liquid.position.y = 0.25 + Math.sin(time * 1.5) * 0.01;
      }

      // Gas particle animation
      particles.forEach(pts => {
        const positions = pts.geometry.attributes.position.array as Float32Array;
        for (let i = 1; i < positions.length; i += 3) {
          positions[i] += 0.008;
          if (positions[i] > 2.5) positions[i] = 1.5;
        }
        pts.geometry.attributes.position.needsUpdate = true;
        (pts.material as THREE.PointsMaterial).opacity = 0.4 + Math.sin(time * 2) * 0.3;
      });

      // Burette drip indicator (subtle flash)
      const buretteMat = buretteLiquid.material as THREE.MeshStandardMaterial;
      buretteMat.emissiveIntensity = 0.05 + Math.sin(time * 3) * 0.05;

      // Point light subtle pulse
      pointLight.intensity = 1.3 + Math.sin(time * 0.7) * 0.2;

      renderer.render(scene, camera);
      sceneRef.current!.frameId = requestAnimationFrame(animate);
    }

    if (hasGas) createGasParticles();
    if (hasPrecipitate) createPrecipitate();

    sceneRef.current = {
      renderer, scene, camera,
      frameId: requestAnimationFrame(animate),
      flask: flaskBody,
      liquid,
      particles,
      burette: buretteGroup,
      testTubes: [testTubesGroup],
      beaker: beaker,
      time,
    };

    // Resize handler
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.frameId);
      }
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update liquid color reactively
  useEffect(() => {
    if (!sceneRef.current) return;
    const { r, g, b } = hexToRGB(reactionColor);
    const liquidMesh = sceneRef.current.liquid;
    const mat = liquidMesh.material as THREE.MeshStandardMaterial;
    mat.color.setRGB(r, g, b);
    mat.needsUpdate = true;
  }, [reactionColor]);

  return (
    <div ref={mountRef} className="w-full h-full relative">
      {/* HUD overlay */}
      <div className="absolute bottom-3 right-3 glass rounded-lg px-3 py-2 text-xs text-slate-400 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
        3D Lab Simulation — Interactive
      </div>
    </div>
  );
}
