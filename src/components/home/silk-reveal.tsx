"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const VERT = `attribute vec2 p; varying vec2 vUv; void main(){ vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

/**
 * Satin cloth shader. A procedural height field (layered folds + value noise)
 * is lit with diffuse + two-lobe specular to read as champagne charmeuse.
 * The cloth slides down with scroll: near its moving edge it bunches (higher
 * fold frequency), shows a rolled, lighter hem, and casts a soft shadow onto
 * the revealed photograph.
 */
const FRAG = `precision highp float;
varying vec2 vUv;
uniform sampler2D uImage; uniform vec2 uRes; uniform vec2 uImg; uniform float uP; uniform float uHasImg;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
vec2 cover(vec2 uv){ float rs = uRes.x/uRes.y, ri = uImg.x/uImg.y; vec2 s = rs < ri ? vec2(rs/ri, 1.0) : vec2(1.0, ri/rs); return (uv - 0.5) * s + 0.5; }
float edgeAt(float x){ return mix(1.18, -0.32, uP) + 0.055*sin(x*4.6 + uP*7.0) + 0.025*sin(x*12.0 - uP*5.0); }
float fold(vec2 uv, float bunch){
  float t = uP * 4.0;
  float w = noise(uv * 3.0 + t * 0.2) * 1.6;
  float f = sin((uv.x * 1.2 + uv.y * 0.32) * (11.0 + bunch * 14.0) + t + w) * 0.55;
  f += sin((uv.x * 0.55 - uv.y * 0.95) * 7.0 - t * 0.6 + w) * 0.35;
  f += noise(uv * 18.0) * 0.08;
  return f;
}
void main(){
  vec2 uv = vUv;
  float e = edgeAt(uv.x);
  float d = uv.y - e;
  float bunch = smoothstep(-0.28, 0.0, d); // folds tighten towards the moving edge
  float eps = 0.0015;
  float h = fold(uv, bunch);
  float hx = fold(uv + vec2(eps, 0.0), bunch);
  float hy = fold(uv + vec2(0.0, eps), bunch);
  vec3 n = normalize(vec3((h - hx) * 2.2, (h - hy) * 2.2, eps * 60.0));
  vec3 L = normalize(vec3(-0.45, 0.55, 0.75));
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float diff = clamp(dot(n, L), 0.0, 1.0);
  float nh = clamp(dot(n, H), 0.0, 1.0);
  float spec = pow(nh, 38.0) * 0.75 + pow(nh, 7.0) * 0.22;
  vec3 champ = vec3(0.788, 0.698, 0.600), lite = vec3(0.985, 0.95, 0.89), dark = vec3(0.42, 0.33, 0.26);
  vec3 cloth = mix(dark, champ, smoothstep(0.05, 0.95, diff)) + lite * spec;
  float hem = smoothstep(-0.045, -0.012, d) * (1.0 - smoothstep(-0.012, 0.0, d));
  cloth = mix(cloth, lite, hem * 0.55);
  cloth *= 1.0 - smoothstep(-0.012, 0.0, d) * 0.35;
  vec3 img = uHasImg > 0.5 ? texture2D(uImage, cover(uv)).rgb : vec3(0.886, 0.835, 0.765);
  float shadow = step(0.0, d) * (1.0 - smoothstep(0.0, 0.09, d)) * 0.5;
  vec3 revealed = img * (1.0 - shadow);
  float m = 1.0 - smoothstep(-0.003, 0.003, d);
  gl_FragColor = vec4(mix(revealed, cloth, m), 1.0);
}`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
  return s;
}

export function SilkReveal({ imageUrl, alt, eyebrow, title, body }: { imageUrl: string | null; alt: string; eyebrow: string; title: string; body: string }) {
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<"webgl" | "css" | "static">("webgl");
  const [p, setP] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return setMode("static");
    const cv = canvas.current!;
    const gl = cv.getContext("webgl", { antialias: true, premultipliedAlpha: false });
    if (!gl) return setMode("css");
    let prog: WebGLProgram;
    try {
      prog = gl.createProgram()!;
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link");
    } catch {
      return setMode("css");
    }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (n: string) => gl.getUniformLocation(prog, n);
    const progress = { v: 0 };
    let raf = 0;
    let imgSize = [1, 1];
    let hasImg = 0;

    const draw = () => {
      raf = 0;
      gl.viewport(0, 0, cv.width, cv.height);
      gl.uniform2f(u("uRes"), cv.width, cv.height);
      gl.uniform2f(u("uImg"), imgSize[0]!, imgSize[1]!);
      gl.uniform1f(u("uP"), progress.v);
      gl.uniform1f(u("uHasImg"), hasImg);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      cv.width = Math.round(cv.clientWidth * dpr);
      cv.height = Math.round(cv.clientHeight * dpr);
      schedule();
    };
    if (imageUrl) {
      const img = new Image();
      img.onload = () => {
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        imgSize = [img.naturalWidth, img.naturalHeight];
        hasImg = 1;
        schedule();
      };
      img.src = imageUrl;
    }
    resize();
    window.addEventListener("resize", resize);
    const st = ScrollTrigger.create({
      trigger: section.current,
      start: "top 75%",
      end: "bottom 25%",
      scrub: 0.8,
      onUpdate: (self) => {
        progress.v = self.progress;
        setP(self.progress);
        schedule();
      },
    });
    return () => {
      st.kill();
      window.removeEventListener("resize", resize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [imageUrl]);

  return (
    <section ref={section} className="bg-ivory-100 py-24 sm:py-32" aria-label={title}>
      <div className="mx-auto grid max-w-[1440px] items-center gap-12 px-5 sm:px-8 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <p className="eyebrow text-taupe-700">{eyebrow}</p>
          <h2 className="mt-5 text-5xl leading-[1.02] text-espresso sm:text-6xl">{title}</h2>
          <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-taupe-700">{body}</p>
        </div>
        <div className="relative aspect-[3/2] overflow-hidden shadow-soft lg:col-span-8" data-testid="silk-reveal" data-mode={mode}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {imageUrl && <img src={imageUrl} alt={alt} className="absolute inset-0 h-full w-full object-cover" draggable={false} />}
          {mode === "webgl" && <canvas ref={canvas} className="absolute inset-0 h-full w-full" aria-hidden="true" />}
          {mode === "css" && (
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background: "repeating-linear-gradient(115deg,#b99f83 0 6%,#e3d4c1 9%,#c9b299 13%,#f3e6d2 16%,#b99f83 22%)",
                clipPath: `inset(${p * 100}% 0 0 0)`,
                boxShadow: "inset 0 18px 30px -12px rgba(44,31,24,.45)",
              }}
            />
          )}
        </div>
      </div>
    </section>
  );
}
