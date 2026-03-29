import { useEffect, useRef, useState } from "react";

type DemoState = {
  scale: number;
  speed: number;
  octaves: number;
};

const initialState: DemoState = {
  scale: 4,
  speed: 0.15,
  octaves: 3
};

export default function NoiseFieldDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [controls, setControls] = useState<DemoState>(initialState);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl");
    if (!gl) return;

    const vertexSource = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fragmentSource = `
      precision mediump float;

      uniform vec2 resolution;
      uniform float time;
      uniform float scale;
      uniform float speed;
      uniform float octaves;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);

        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
          f.y
        );
      }

      float fbm(vec2 p, float octaveCount) {
        float value = 0.0;
        float amplitude = 0.5;

        for (int i = 0; i < 6; i++) {
          if (float(i) >= octaveCount) {
            break;
          }

          value += amplitude * noise(p);
          p = p * 2.0 + vec2(2.1, 1.3);
          amplitude *= 0.5;
        }

        return value;
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        vec2 centered = uv * 2.0 - 1.0;
        centered.x *= resolution.x / resolution.y;

        float t = time * speed;
        vec2 q = vec2(
          fbm(centered * scale + vec2(t, t * 0.35), octaves),
          fbm(centered * scale + vec2(3.7, -1.9) - vec2(t * 0.4, -t), octaves)
        );

        float field = fbm(centered * scale + q * 1.15, octaves);
        float ridges = smoothstep(0.25, 0.9, field);
        float glow = smoothstep(0.55, 1.0, field + q.x * 0.18);

        vec3 deep = vec3(0.05, 0.045, 0.026);
        vec3 mid = vec3(0.42, 0.34, 0.18);
        vec3 bright = vec3(0.79, 0.66, 0.41);
        vec3 color = mix(deep, mid, ridges);
        color = mix(color, bright, glow);

        float vignette = smoothstep(1.45, 0.15, length(centered));
        gl_FragColor = vec4(color * vignette, 1.0);
      }
    `;

    const compileShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }

      return shader;
    };

    const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      return;
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    gl.useProgram(program);

    const positionLocation = gl.getAttribLocation(program, "position");
    const resolutionLocation = gl.getUniformLocation(program, "resolution");
    const timeLocation = gl.getUniformLocation(program, "time");
    const scaleLocation = gl.getUniformLocation(program, "scale");
    const speedLocation = gl.getUniformLocation(program, "speed");
    const octavesLocation = gl.getUniformLocation(program, "octaves");

    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const start = performance.now();
    let animationFrame = 0;

    const render = () => {
      const width = Math.floor(canvas.clientWidth * window.devicePixelRatio);
      const height = Math.floor(canvas.clientHeight * window.devicePixelRatio);

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }

      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform1f(timeLocation, (performance.now() - start) / 1000);
      gl.uniform1f(scaleLocation, controls.scale);
      gl.uniform1f(speedLocation, controls.speed);
      gl.uniform1f(octavesLocation, controls.octaves);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      animationFrame = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      if (buffer) gl.deleteBuffer(buffer);
    };
  }, [controls]);

  return (
    <div className="noise-demo">
      <div className="noise-demo__canvas">
        <canvas ref={canvasRef} aria-label="Interactive noise shader demo" />
      </div>

      <div className="noise-demo__controls">
        <label className="noise-demo__control">
          <span>
            Scale
            <strong>{controls.scale.toFixed(1)}</strong>
          </span>
          <input
            type="range"
            min="1"
            max="8"
            step="0.1"
            value={controls.scale}
            onChange={(event) =>
              setControls((current) => ({ ...current, scale: Number(event.target.value) }))
            }
          />
        </label>

        <label className="noise-demo__control">
          <span>
            Speed
            <strong>{controls.speed.toFixed(2)}</strong>
          </span>
          <input
            type="range"
            min="0"
            max="0.8"
            step="0.01"
            value={controls.speed}
            onChange={(event) =>
              setControls((current) => ({ ...current, speed: Number(event.target.value) }))
            }
          />
        </label>

        <label className="noise-demo__control">
          <span>
            Layers
            <strong>{controls.octaves}</strong>
          </span>
          <input
            type="range"
            min="1"
            max="6"
            step="1"
            value={controls.octaves}
            onChange={(event) =>
              setControls((current) => ({ ...current, octaves: Number(event.target.value) }))
            }
          />
        </label>
      </div>
    </div>
  );
}
