export function StartupLoader({
  recoveryDelayMs = 15_000,
}: {
  recoveryDelayMs?: number;
}) {
  return (
    <>
      <style>{loadingStyles}</style>
      {/* Outside the React root; SplashScreen removes this once startup is ready. */}
      <div id="pyly-startup">
        <div>
          <div
            id="pyly-startup-progress"
            role="progressbar"
            aria-label="Loading Pinyinly"
          >
            <div />
          </div>
          <div id="pyly-startup-recovery" hidden>
            <p role="status">
              Still loading… This is taking longer than usual.
            </p>
          </div>
          <noscript>
            <style>{`#pyly-startup-progress { display: none; }`}</style>
            <p>Enable JavaScript to load Pinyinly.</p>
          </noscript>
        </div>
      </div>
      <script>{`(${startupScript.toString()})(${recoveryDelayMs});`}</script>
    </>
  );
}

const loadingStyles = `
#pyly-startup {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  display: grid;
  place-items: center;
  padding: 24px;
  background: #f8f9fa;
  color: #12191d;
}
#pyly-startup > div { max-width: 360px; }
#pyly-startup-recovery {
  color: color-mix(in srgb, currentColor 60%, transparent);
  font: 12px/1.5 system-ui, sans-serif;
  text-align: center;
}
#pyly-startup noscript {
  font: 16px/1.5 system-ui, sans-serif;
  text-align: center;
}
#pyly-startup-progress {
  width: 160px;
  height: 4px;
  margin: 0 auto;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, currentColor 12%, transparent);
}
#pyly-startup-progress > div {
  width: 8%;
  height: 100%;
  border-radius: inherit;
  background: currentColor;
  opacity: 0.5;
  animation: pyly-startup-fill 60s cubic-bezier(0.1, 0.8, 0.2, 1) forwards;
}
@keyframes pyly-startup-fill { to { width: 94%; } }
@media (prefers-color-scheme: dark) {
  #pyly-startup { background: #1a1d1e; color: #d7d8d9; }
}
@media (prefers-reduced-motion: reduce) {
  #pyly-startup-progress > div { animation: none; }
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
