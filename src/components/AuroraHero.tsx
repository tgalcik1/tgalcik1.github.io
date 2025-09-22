// src/components/AuroraHero.tsx
import React from "react";
import { FiArrowRight, FiMail } from "react-icons/fi";
import { FaGithub, FaLinkedin, FaYoutube } from "react-icons/fa";
import AuroraButton from "./AuroraButton";
import RotatingBadge from "./RotatingBadge";

import avatar from "../assets/images/avatar.jpg";

const CircleIconButton = ({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) => (
  <a
    href={href}
    aria-label={label}
    title={label}
    target={href.startsWith("http") ? "_blank" : undefined}
    rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
    className="
      inline-flex h-11 w-11 items-center justify-center
      rounded-full
      border border-white/10
      bg-white/5 backdrop-blur-md
      text-white/90
      transition
      hover:bg-white/10 hover:text-white
      active:scale-95
      focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50
      shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]
    "
  >
    {children}
    <span className="sr-only">{label}</span>
  </a>
);

export const AuroraHero = () => {
  return (
    <section className="relative grid min-h-screen place-content-center px-4 py-24 text-gray-200">
      <div className="relative z-10 flex flex-col items-center">
        {/* Avatar ABOVE the rotating badge */}
        <div className="flex flex-col items-center">
          <a
            href="#about"
            title="About Tristan"
            aria-label="About Tristan"
            className="
              inline-flex h-24 w-24 sm:h-24 sm:w-24 items-center justify-center
              rounded-full border border-white/10 bg-white/5 backdrop-blur-md
              shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]
              ring-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50
              transition hover:bg-white/10 active:scale-95
              mb-2
            "
          >
            <img
              src={avatar.src}
              alt="Tristan Galcik"
              className="h-20 w-20 sm:h-13 sm:w-13 rounded-full object-cover grayscale"
              loading="eager"
              decoding="async"
            />
          </a>

          <RotatingBadge
            items={[
              "Creative Developer",
              "Software Engineer",
              "Full-Stack Developer",
              "Technical Artist",
            ]}
            intervalMs={2400}
            className="mb-1.5"
          />
        </div>

        <h1 className="max-w-3xl bg-gradient-to-br from-white to-gray-400 bg-clip-text text-center text-3xl font-medium leading-tight text-transparent sm:text-5xl sm:leading-tight md:text-7xl md:leading-tight">
          Tristan Galcik
        </h1>

        <p className="my-6 max-w-xl text-center text-base leading-relaxed md:text-lg md:leading-relaxed">
          Developer based in Baltimore, MD
        </p>

        {/* CTA row: primary button + circular icon buttons */}
        <div className="flex items-center gap-3">
          <AuroraButton
            href="#about"
            size="md"
            outerGlow={0}
            icon={<FiArrowRight />}
          >
            Learn about me
          </AuroraButton>

          <div className="flex items-center gap-2.5">
            <CircleIconButton
              href="mailto:hello@tristangalcik.com"
              label="Email"
            >
              <FiMail className="text-xl" />
            </CircleIconButton>

            <CircleIconButton href="https://github.com/tgalcik1" label="GitHub">
              <FaGithub className="text-xl" />
            </CircleIconButton>

            <CircleIconButton
              href="https://www.linkedin.com/in/tristangalcik/"
              label="LinkedIn"
            >
              <FaLinkedin className="text-xl" />
            </CircleIconButton>

            <CircleIconButton
              href="https://www.youtube.com/@tristangamedev"
              label="YouTube"
            >
              <FaYoutube className="text-xl" />
            </CircleIconButton>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AuroraHero;
