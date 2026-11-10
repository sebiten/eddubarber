"use client";

import { useId, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

export function BarberPole() {
  const id = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [paused, setPaused] = useState(false);
  const fill = (name: string) => `url(#${id}-${name})`;

  function toggleAnimation() {
    const svg = svgRef.current;
    if (!svg) return;

    if (svg.animationsPaused()) {
      svg.unpauseAnimations();
    } else {
      svg.pauseAnimations();
    }
    setPaused(svg.animationsPaused());
  }

  return (
    <div className="hero-barber-pole">
      <svg ref={svgRef} viewBox="0 0 120 280" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={`${id}-chrome`}>
            <stop stopColor="#30383e" />
            <stop offset=".18" stopColor="#8c989e" />
            <stop offset=".32" stopColor="#f4f6f4" />
            <stop offset=".48" stopColor="#b2bdc2" />
            <stop offset=".72" stopColor="#465158" />
            <stop offset=".9" stopColor="#a6b2b8" />
            <stop offset="1" stopColor="#303a40" />
          </linearGradient>
          <radialGradient id={`${id}-dome`} cx="35%" cy="22%" r="80%">
            <stop stopColor="#f4f6f4" />
            <stop offset=".35" stopColor="#b6c0c5" />
            <stop offset=".75" stopColor="#59666f" />
            <stop offset="1" stopColor="#283238" />
          </radialGradient>
          <linearGradient id={`${id}-glass`}>
            <stop stopColor="#0c151d" stopOpacity=".8" />
            <stop offset=".18" stopColor="#0c151d" stopOpacity=".12" />
            <stop offset=".3" stopColor="#fff" stopOpacity=".5" />
            <stop offset=".43" stopColor="#fff" stopOpacity=".08" />
            <stop offset=".6" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#0c151d" stopOpacity=".8" />
          </linearGradient>
          <pattern id={`${id}-stripes`} width="80" height="80" patternUnits="userSpaceOnUse">
            <rect width="80" height="80" fill="#e6e5dc" />
            <path d="M0 0h20L-60 80h-20Z M80 0h20L20 80H0Z" fill="#b33e43" />
            <path d="M40 0h20L-20 80h-20Z M120 0h20L60 80H40Z" fill="#305b83" />
          </pattern>
          <clipPath id={`${id}-cylinder`}>
            <rect x="33" y="62" width="54" height="154" rx="5" />
          </clipPath>
        </defs>

        <ellipse cx="60" cy="266" rx="28" ry="4" fill="#000" opacity=".3" />
        <path d="M32 48a28 35 0 0 1 56 0Z" fill={fill("dome")} stroke="#89969e" />
        <path d="M32 232a28 28 0 0 0 56 0Z" fill={fill("dome")} stroke="#89969e" />

        <g clipPath={fill("cylinder")}>
          <g className="barber-pole-rotor">
            <rect x="33" y="-18" width="54" height="314" fill={fill("stripes")} />
            <animateTransform
              attributeName="transform"
              type="translate"
              from="0 0"
              to="0 -80"
              dur="3s"
              repeatCount="indefinite"
            />
          </g>
          <rect x="33" y="62" width="54" height="154" fill={fill("glass")} />
          <path d="M43 68v142" stroke="#fff" strokeOpacity=".25" strokeWidth="2" />
        </g>
        <rect x="33" y="62" width="54" height="154" rx="5" fill="none" stroke="#c5cfd3" strokeOpacity=".65" />

        <g fill={fill("chrome")} stroke="#a5afb4" strokeWidth=".8">
          <rect x="27" y="47" width="66" height="12" rx="4" />
          <rect x="30" y="58" width="60" height="8" rx="2" />
          <rect x="30" y="212" width="60" height="8" rx="2" />
          <rect x="27" y="220" width="66" height="12" rx="4" />
        </g>
        <path d="M31 51h58 M34 61h52 M34 215h52 M31 224h58" stroke="#fff" strokeOpacity=".5" />
      </svg>
      <button
        className="hero-pole-toggle"
        type="button"
        onClick={toggleAnimation}
        aria-label={paused ? "Activar giro del poste" : "Pausar giro del poste"}
        title={paused ? "Activar giro" : "Pausar giro"}
      >
        {paused ? <Play size={12} aria-hidden="true" /> : <Pause size={12} aria-hidden="true" />}
      </button>
    </div>
  );
}
