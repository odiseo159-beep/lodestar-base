/**
 * ASCII art banner for "LODESTAR".
 *
 * When `glitch` is true, two transparent RGB layers (red + blue) sit on top
 * of the base logo and animate clip-path slices at offset intervals,
 * producing a subtle VHS-tear effect every few seconds.
 */
export default function AsciiLogo({ glitch = false }: { glitch?: boolean }) {
  const banner = String.raw`██╗      ██████╗ ██████╗ ███████╗███████╗████████╗ █████╗ ██████╗
██║     ██╔═══██╗██╔══██╗██╔════╝██╔════╝╚══██╔══╝██╔══██╗██╔══██╗
██║     ██║   ██║██║  ██║█████╗  ███████╗   ██║   ███████║██████╔╝
██║     ██║   ██║██║  ██║██╔══╝  ╚════██║   ██║   ██╔══██║██╔══██╗
███████╗╚██████╔╝██████╔╝███████╗███████║   ██║   ██║  ██║██║  ██║
╚══════╝ ╚═════╝ ╚═════╝ ╚══════╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝`;

  const sharedPreClass =
    "text-[7px] sm:text-[8px] md:text-[9px] leading-[1.1] font-mono m-0";

  return (
    <div className="select-none">
      {/* Desktop: full ANSI Shadow banner with layered glitch */}
      <div className="hidden md:block relative">
        <pre
          className={`${sharedPreClass} text-accent glow`}
          aria-hidden
        >
          {banner}
        </pre>
        {glitch && (
          <>
            <pre
              className={`${sharedPreClass} logo-layer-r absolute inset-0 pointer-events-none`}
              aria-hidden
            >
              {banner}
            </pre>
            <pre
              className={`${sharedPreClass} logo-layer-b absolute inset-0 pointer-events-none`}
              aria-hidden
            >
              {banner}
            </pre>
          </>
        )}
      </div>

      {/* Mobile: compact stylized text with the same glitch idea */}
      <div className="md:hidden">
        <div
          className={`text-accent text-2xl tracking-[0.2em] glow ${
            glitch ? "logo-text-tear" : ""
          }`}
        >
          // LODESTAR //
        </div>
      </div>

      <span className="sr-only">Lodestar</span>
    </div>
  );
}
