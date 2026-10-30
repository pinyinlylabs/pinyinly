export function StartupLoader() {
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
              This is taking longer than expected. Check your connection, or
              reload to try again.
            </p>
            <button type="button">Reload</button>
          </div>
          <noscript>
            <style>{`#pyly-startup-progress { display: none; }`}</style>
            <p>Enable JavaScript to load Pinyinly.</p>
          </noscript>
        </div>
      </div>
      <script>{recoveryScript}</script>
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
#pyly-startup-recovery,
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
#pyly-startup button {
  padding: 8px 20px;
  border: 1px solid currentColor;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
#pyly-startup button:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 4px;
}
@keyframes pyly-startup-fill { to { width: 94%; } }
@media (prefers-color-scheme: dark) {
  #pyly-startup { background: #1a1d1e; color: #d7d8d9; }
}
@media (prefers-reduced-motion: reduce) {
  #pyly-startup-progress > div { animation: none; }
}
`;

const recoveryScript = `
(function () {
  var startup = document.getElementById('pyly-startup');
  startup.querySelector('button').addEventListener('click', function () {
    window.location.reload();
  });
  window.setTimeout(function () {
    if (startup.isConnected) {
      document.getElementById('pyly-startup-recovery').hidden = false;
    }
  }, 15000);
})();
`;
