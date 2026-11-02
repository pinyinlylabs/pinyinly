import { hanziStrokeAnimationTiming } from "./HanziStrokeAnimation";
import SVGPathCommander from "svg-path-commander";
import startupLogomarkPaths from "#assets/logo/logomark2.paths.json";
import { nonNullable } from "@pinyinly/lib/invariant";

const startupLogoAverageStrokeDuration = 250;
const startupLogoStrokeComponents = [
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8],
] as const;
const startupLogoStrokeAnimations = (() => {
  const medians = startupLogomarkPaths.medians;
  const pathLengths = medians.map((path) =>
    SVGPathCommander.getTotalLength(path),
  );
  const averagePathLength =
    pathLengths.reduce((total, length) => total + length, 0) /
    pathLengths.length;
  if (averagePathLength <= 0 || !Number.isFinite(averagePathLength)) {
    throw new Error(`Expected positive logomark median path lengths.`);
  }

  const componentLengths = startupLogoStrokeComponents.map((component) =>
    component.reduce<number>(
      (total, index) => total + nonNullable(pathLengths[index]),
      0,
    ),
  );
  const targetDuration = Math.max(
    ...componentLengths.map(
      (length) =>
        (length / averagePathLength) * startupLogoAverageStrokeDuration,
    ),
  );
  const animations = new Map<number, { duration: number; delay: number }>();
  for (const [
    componentIndex,
    component,
  ] of startupLogoStrokeComponents.entries()) {
    const componentSpeed =
      nonNullable(componentLengths[componentIndex]) / targetDuration;
    let strokeDelay = 0;
    for (const index of component) {
      const pathLength = nonNullable(pathLengths[index]);

      const duration = pathLength / componentSpeed;
      animations.set(index, { duration, delay: strokeDelay });
      strokeDelay += duration;
    }
  }

  if (animations.size !== medians.length) {
    throw new Error(
      `Expected each logomark median to belong to one component.`,
    );
  }

  return medians.map((_, index) => {
    const animation = animations.get(index);
    if (animation == null) {
      throw new Error(`Missing logomark animation at index ${index}.`);
    }
    return animation;
  });
})();

export function StartupLoader({
  recoveryDelayMs = 15_000,
}: {
  recoveryDelayMs?: number;
}) {
  return (
    <>
      <style>{loadingStyles}</style>
      {/* Outside the React root; SplashScreen removes this once startup is ready. */}
      <div
        id="pyly-startup"
        data-startup-loader=""
        style={{
          position: `fixed`,
          inset: 0,
          zIndex: 2_147_483_647,
          display: `grid`,
          placeItems: `center`,
          padding: 24,
          backgroundColor: `var(--startup-loader-background, #f8f9fa)`,
          color: `var(--startup-loader-color, #12191d)`,
        }}
      >
        <div style={{ maxWidth: 360 }}>
          <svg
            id="pyly-startup-logo"
            viewBox="0 0 1024 1024"
            aria-hidden="true"
            focusable="false"
            style={{
              display: `block`,
              width: 128,
              height: 128,
              margin: `0 auto 24px`,
            }}
          >
            <defs>
              {startupLogomarkPaths.strokes.map((d, index) => (
                <mask
                  key={index}
                  id={`pyly-startup-logo-mask-${index}`}
                  maskUnits="userSpaceOnUse"
                  maskContentUnits="userSpaceOnUse"
                  x="-1024"
                  y="-1024"
                  width="3072"
                  height="3072"
                >
                  <path
                    d={d}
                    style={{ fill: `white`, stroke: `white`, strokeWidth: 0 }}
                  />
                </mask>
              ))}
            </defs>
            <g transform="scale(1, -1) translate(0, -900)">
              <g style={{ opacity: 0.12 }}>
                {startupLogomarkPaths.strokes.map((d, index) => (
                  <path
                    key={`outline-${index}`}
                    d={d}
                    style={{ fill: `currentColor` }}
                  />
                ))}
              </g>
              <g style={{ opacity: 0.5 }}>
                {startupLogoStrokeAnimations.map(
                  ({ duration, delay }, index) => {
                    const d = startupLogomarkPaths.medians[index];
                    if (d == null) {
                      throw new Error(
                        `Missing logomark median path at index ${index}.`,
                      );
                    }

                    const animationDelay =
                      hanziStrokeAnimationTiming.delayBeforeStart +
                      startupLogoAverageStrokeDuration +
                      delay;
                    return (
                      <path
                        key={`stroke-${index}`}
                        d={d}
                        mask={`url(#pyly-startup-logo-mask-${index})`}
                        pathLength="1"
                        style={{
                          animation: `pyly-startup-logo-draw ${duration}ms ease both, pyly-startup-logo-brush-growth ${hanziStrokeAnimationTiming.brushGrowthDuration}ms ease-out both`,
                          animationDelay: `${animationDelay}ms`,
                          fill: `none`,
                          stroke: `currentColor`,
                          strokeDasharray: 1,
                          strokeDashoffset: 1,
                          strokeLinecap: `round`,
                          strokeLinejoin: `round`,
                          strokeWidth: 0,
                          visibility: `hidden`,
                        }}
                        data-startup-loader-stroke=""
                      />
                    );
                  },
                )}
              </g>
            </g>
          </svg>
          <div
            id="pyly-startup-progress"
            role="progressbar"
            aria-label="Loading Pinyinly"
            data-startup-loader-progress=""
            style={{
              width: 160,
              height: 4,
              margin: `0 auto`,
              overflow: `hidden`,
              borderRadius: 999,
              backgroundColor: `color-mix(in srgb, currentColor 12%, transparent)`,
            }}
          >
            <div
              data-startup-loader-progress-fill=""
              style={{
                width: `8%`,
                height: `100%`,
                borderRadius: `inherit`,
                backgroundColor: `currentColor`,
                opacity: 0.5,
                animation: `pyly-startup-fill 60s cubic-bezier(0.1, 0.8, 0.2, 1) forwards`,
              }}
            />
          </div>
          <div id="pyly-startup-recovery" hidden>
            <p
              role="status"
              style={{
                color: `color-mix(in srgb, currentColor 60%, transparent)`,
                font: `12px/1.5 system-ui, sans-serif`,
                textAlign: `center`,
              }}
            >
              Still loading… This is taking longer than usual.
            </p>
          </div>
          <noscript>
            <style>{`[data-startup-loader-progress] { display: none; }`}</style>
            <p
              style={{
                font: `16px/1.5 system-ui, sans-serif`,
                textAlign: `center`,
              }}
            >
              Enable JavaScript to load Pinyinly.
            </p>
          </noscript>
        </div>
      </div>
      <script>{`(${startupScript.toString()})(${recoveryDelayMs});`}</script>
    </>
  );
}

const loadingStyles = `
@keyframes pyly-startup-fill { to { width: 94%; } }
@keyframes pyly-startup-logo-draw {
  from { stroke-dashoffset: 1; visibility: visible; }
  to { stroke-dashoffset: 0; visibility: visible; }
}
@keyframes pyly-startup-logo-brush-growth {
  from { stroke-width: 0; }
  to { stroke-width: 120px; }
}
@media (prefers-color-scheme: dark) {
  [data-startup-loader] {
    --startup-loader-background: #1a1d1e;
    --startup-loader-color: #d7d8d9;
  }
}
@media (prefers-reduced-motion: reduce) {
  [data-startup-loader-progress-fill] { animation: none !important; }
  [data-startup-loader-stroke] {
    animation: none !important;
    stroke-dashoffset: 0 !important;
    stroke-width: 180px !important;
    visibility: visible !important;
  }
}
`;

/**
 * Startup script embedded into the initial HTML via `Function.toString()`.
 *
 * IMPORTANT: This function is serialized and executed independently
 * of the JavaScript bundle, before the React application loads.
 *
 * Restrictions:
 * - Must be self-contained: do not reference imports, module-level
 *   variables, or functions declared outside this function.
 * - Only reference parameters, locally declared values, and
 *   standard browser globals.
 * - Pass external configuration through function parameters.
 * - Avoid language features that require external transpiler helpers.
 *
 * Changes must work when the serialized function is executed
 * as a standalone inline `<script>` in the browser.
 */
function startupScript(recoveryDelayMs: number) {
  const startup = document.querySelector<HTMLElement>(`#pyly-startup`);
  const recovery = document.querySelector<HTMLElement>(
    `#pyly-startup-recovery`,
  );
  const recoveryMessage = recovery?.querySelector<HTMLParagraphElement>(`p`);
  if (!startup || !recovery || !recoveryMessage) {
    console.error(`Could not initialize the startup loader.`);
    return;
  }
  const startupElement: HTMLElement = startup;
  const recoveryElement: HTMLElement = recovery;
  const recoveryMessageElement: HTMLParagraphElement = recoveryMessage;

  function showLoadingError() {
    recoveryMessageElement.textContent = `Something went wrong while loading. Check your connection, or reload the page.`;
    recoveryElement.hidden = false;
  }
  window.addEventListener(
    `error`,
    (event) => {
      const script = event.target;
      if (!(script instanceof HTMLScriptElement)) {
        return;
      }
      const src = script.getAttribute(`src`) ?? ``;
      // Telemetry scripts served from /api/ are non-critical to startup.
      if (
        script.src &&
        !src.startsWith(`/api/`) &&
        startupElement.isConnected
      ) {
        console.error(`Failed to load script:`, script.src);
        showLoadingError();
      }
    },
    true,
  );
  window.setTimeout(function () {
    if (startupElement.isConnected) {
      recoveryElement.hidden = false;
    }
  }, recoveryDelayMs);
}
