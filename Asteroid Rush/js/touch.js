// ============================================================
// CONTROLES TÁCTILES
// ============================================================

function initTouchControls() {
  if (document.getElementById("touch-controls")) return;
  const controls = document.createElement("div");
  controls.id = "touch-controls";
  controls.style.alignItems = "center";
  controls.innerHTML = `
    <div style="display:flex;gap:10px;">
      <div class="touch-btn" id="t-left"><img src="images/Izquierda.png" alt="Left"></div>
      <div class="touch-btn" id="t-right"><img src="images/Derecha.png" alt="Right"></div>
    </div>
    <div class="touch-btn" id="t-shoot"><img src="images/Disparar.png" alt="Shoot"></div>`;
  document.getElementById("game-container").appendChild(controls);

  const tLeft  = document.getElementById("t-left");
  const tRight = document.getElementById("t-right");
  const tShoot = document.getElementById("t-shoot");

  // Touch
  tLeft.addEventListener("touchstart",  (e) => { e.preventDefault(); keys.left  = true; keys.lastDir = "left"; },  { passive: false });
  tLeft.addEventListener("touchend",    (e) => { e.preventDefault(); keys.left  = false; if (keys.right) keys.lastDir = "right"; }, { passive: false });
  tRight.addEventListener("touchstart", (e) => { e.preventDefault(); keys.right = true; keys.lastDir = "right"; }, { passive: false });
  tRight.addEventListener("touchend",   (e) => { e.preventDefault(); keys.right = false; if (keys.left) keys.lastDir = "left"; },  { passive: false });
  tShoot.addEventListener("touchstart", (e) => { e.preventDefault(); keys.up    = true; },  { passive: false });
  tShoot.addEventListener("touchend",   (e) => { e.preventDefault(); keys.up    = false; }, { passive: false });

  // Mouse (para pruebas en PC)
  tLeft.addEventListener("mousedown",  () => { keys.left  = true;  keys.lastDir = "left"; });
  tLeft.addEventListener("mouseup",    () => { keys.left  = false; });
  tLeft.addEventListener("mouseleave", () => { keys.left  = false; });
  tRight.addEventListener("mousedown", () => { keys.right = true;  keys.lastDir = "right"; });
  tRight.addEventListener("mouseup",   () => { keys.right = false; });
  tRight.addEventListener("mouseleave",() => { keys.right = false; });
  tShoot.addEventListener("mousedown", () => { keys.up    = true;  });
  tShoot.addEventListener("mouseup",   () => { keys.up    = false; });
  tShoot.addEventListener("mouseleave",() => { keys.up    = false; });
}

function updateTouchControlsVisibility() {
  const el = document.getElementById("touch-controls");
  if (!touchControlsOn) { if (el) el.style.display = "none"; return; }
  initTouchControls();
  const touchEl = document.getElementById("touch-controls");
  if (touchEl) touchEl.style.display = (gameRunning && !gamePaused) ? "flex" : "none";
}
