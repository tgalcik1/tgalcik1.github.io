import { useEffect, useRef } from "react";

type Variant = "warm" | "teal" | "plum";

interface Props {
  variant?: Variant;
  compact?: boolean;
}

const palettes: Record<Variant, [number, number, number][]> = {
  warm: [
    [0.05, 0.03, 0.015],
    [0.46, 0.3, 0.13],
    [0.88, 0.6, 0.34]
  ],
  teal: [
    [0.045, 0.04, 0.025],
    [0.38, 0.34, 0.2],
    [0.72, 0.64, 0.43]
  ],
  plum: [
    [0.06, 0.035, 0.03],
    [0.42, 0.25, 0.19],
    [0.77, 0.55, 0.42]
  ]
};

export default function ShaderCanvas({ variant = "warm", compact = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    const [dark, mid, bright] = palettes[variant];
    const compactFlag = compact ? 1 : 0;

    const fragmentSource = `
      precision mediump float;
      uniform vec2 resolution;
      uniform float time;

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

      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 5; i++) {
          value += amplitude * noise(p);
          p = p * 2.0 + vec2(1.7, 9.2);
          amplitude *= 0.5;
        }
        return value;
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        vec2 centered = uv * 2.0 - 1.0;
        centered.x *= resolution.x / resolution.y;

        float t = time * ${compactFlag === 1 ? "0.18" : "0.13"};
        float warp = fbm(centered * 1.4 + vec2(t, -t * 0.6));
        float swirl = fbm(centered * 2.3 + vec2(-t * 1.2, t));
        float band = sin(centered.x * 4.0 + warp * 4.5 + t) * 0.15;
        float value = smoothstep(0.18, 0.92, warp + swirl * 0.5 + band);

        vec3 dark = vec3(${dark[0]}, ${dark[1]}, ${dark[2]});
        vec3 mid = vec3(${mid[0]}, ${mid[1]}, ${mid[2]});
        vec3 bright = vec3(${bright[0]}, ${bright[1]}, ${bright[2]});
        vec3 color = mix(dark, mid, value);
        color = mix(color, bright, smoothstep(0.6, 1.0, value));

        float vignette = smoothstep(1.55, 0.25, length(centered));
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
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const resolutionLocation = gl.getUniformLocation(program, "resolution");
    const timeLocation = gl.getUniformLocation(program, "time");

    let animationFrame = 0;
    const start = performance.now();

    const render = () => {
      const width = Math.floor(canvas.clientWidth * devicePixelRatio);
      const height = Math.floor(canvas.clientHeight * devicePixelRatio);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }

      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform1f(timeLocation, (performance.now() - start) / 1000);
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
  }, [compact, variant]);

  return <canvas ref={canvasRef} aria-hidden="true" />;
}
