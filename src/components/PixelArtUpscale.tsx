import React from "react";

type PixelArtUpscaleProps = {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  loading?: "eager" | "lazy";
  decoding?: "async" | "auto" | "sync";
};

type GlState = {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  texture: WebGLTexture;
  positionBuffer: WebGLBuffer;
  positionLocation: number;
};

const VERTEX_SHADER_SOURCE = `
  attribute vec2 aPosition;
  varying vec2 vUv;

  void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER_SOURCE = `
  #ifdef GL_OES_standard_derivatives
  #extension GL_OES_standard_derivatives : enable
  #endif

  precision mediump float;

  uniform sampler2D uTexture;
  uniform vec2 uTextureSize;
  varying vec2 vUv;

  void main() {
    vec2 boxSize = clamp(fwidth(vUv) * uTextureSize, 0.00001, 1.0);
    vec2 tx = vUv * uTextureSize - 0.5 * boxSize;
    vec2 txOffset = smoothstep(vec2(1.0) - boxSize, vec2(1.0), fract(tx));
    vec2 uv = (floor(tx) + 0.5 + txOffset) / uTextureSize;
    gl_FragColor = texture2D(uTexture, uv);
  }
`;

function createShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
) {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error("Failed to create shader.");
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? "Unknown shader error.";
    gl.deleteShader(shader);
    throw new Error(message);
  }

  return shader;
}

function createProgram(gl: WebGLRenderingContext) {
  const vertexShader = createShader(
    gl,
    gl.VERTEX_SHADER,
    VERTEX_SHADER_SOURCE,
  );
  const fragmentShader = createShader(
    gl,
    gl.FRAGMENT_SHADER,
    FRAGMENT_SHADER_SOURCE,
  );

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    throw new Error("Failed to create program.");
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? "Unknown link error.";
    gl.deleteProgram(program);
    throw new Error(message);
  }

  return program;
}

function initGl(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    depth: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    stencil: false,
  });

  if (!gl || !gl.getExtension("OES_standard_derivatives")) {
    return null;
  }

  const program = createProgram(gl);
  const positionBuffer = gl.createBuffer();
  const texture = gl.createTexture();

  if (!positionBuffer || !texture) {
    gl.deleteProgram(program);
    if (positionBuffer) gl.deleteBuffer(positionBuffer);
    if (texture) gl.deleteTexture(texture);
    return null;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]),
    gl.STATIC_DRAW,
  );

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  return {
    gl,
    program,
    texture,
    positionBuffer,
    positionLocation: gl.getAttribLocation(program, "aPosition"),
  };
}

function destroyGl(state: GlState | null) {
  if (!state) return;
  state.gl.deleteTexture(state.texture);
  state.gl.deleteBuffer(state.positionBuffer);
  state.gl.deleteProgram(state.program);
}

export default function PixelArtUpscale({
  src,
  alt,
  className = "",
  imageClassName = "",
  loading = "lazy",
  decoding = "async",
}: PixelArtUpscaleProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const imageRef = React.useRef<HTMLImageElement | null>(null);
  const glStateRef = React.useRef<GlState | null>(null);
  const [isReady, setIsReady] = React.useState(false);
  const [isSupported, setIsSupported] = React.useState(true);

  const render = React.useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    const state = glStateRef.current;
    if (!canvas || !image || !state || !image.complete || !image.naturalWidth) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const { gl, program, texture, positionBuffer, positionLocation } = state;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    const textureLocation = gl.getUniformLocation(program, "uTexture");
    const textureSizeLocation = gl.getUniformLocation(program, "uTextureSize");
    gl.uniform1i(textureLocation, 0);
    gl.uniform2f(textureSizeLocation, image.naturalWidth, image.naturalHeight);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }, []);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;

    setIsReady(false);
    setIsSupported(true);

    if (!canvas || !image) {
      return;
    }

    destroyGl(glStateRef.current);
    glStateRef.current = initGl(canvas);

    if (!glStateRef.current) {
      setIsSupported(false);
      return;
    }

    const draw = () => {
      render();
      setIsReady(true);
    };

    if (image.complete && image.naturalWidth > 0) {
      draw();
    } else {
      image.addEventListener("load", draw, { once: true });
    }

    const resizeObserver = new ResizeObserver(() => render());
    resizeObserver.observe(canvas);
    window.addEventListener("resize", render);

    return () => {
      image.removeEventListener("load", draw);
      resizeObserver.disconnect();
      window.removeEventListener("resize", render);
      destroyGl(glStateRef.current);
      glStateRef.current = null;
    };
  }, [render, src]);

  return (
    <div
      className={className}
      style={{
        position: "relative",
        overflow: "hidden",
      }}
    >
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        loading={loading}
        decoding={decoding}
        className={imageClassName}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: isSupported && isReady ? 0 : 1,
        }}
      />
      {isSupported && (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            opacity: isReady ? 1 : 0,
          }}
        />
      )}
    </div>
  );
}
