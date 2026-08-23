// Keyboard, Gamepad, and Multi-Touch input for Computer & Mobile (spec §1, §7).
// Held keys/touches are polled per frame; discrete presses are LATCHED so no inputs are dropped.

const keys = new Set();
const pressedOnce = new Set();

// Active virtual touch controls state
const touchState = {
  throttle: 0,
  brake: 0,
  steerLeft: false,
  steerRight: false,
  handbrake: false,
  nitro: false,
  horn: false,
  interact: false,
  reset: false,
};

window.addEventListener('keydown', (e) => {
  if (!e.repeat) pressedOnce.add(e.code);
  keys.add(e.code);
});

window.addEventListener('keyup', (e) => keys.delete(e.code));

/** True exactly once per physical press of `code` (e.g. 'KeyE', 'KeyR', 'KeyM', 'KeyG', 'KeyN', 'KeyC'). */
export function consumePress(code) {
  if (pressedOnce.has(code)) {
    pressedOnce.delete(code);
    return true;
  }
  return false;
}

/** Injects a virtual press event programmatically (e.g. from on-screen touch buttons). */
export function triggerPress(code) {
  pressedOnce.add(code);
}

/** Check if device supports touch */
export function isTouchSupported() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Attaches multi-touch listeners to on-screen UI buttons for smartphones / tablets.
 */
export function initTouchControls() {
  const touchContainer = document.getElementById('touch-controls');
  if (!touchContainer) return;

  // Auto-display on touch-capable screens or if requested
  if (isTouchSupported()) {
    touchContainer.classList.remove('hidden');
  }

  function bindTouchButton(elementId, onStart, onEnd) {
    const btn = document.getElementById(elementId);
    if (!btn) return;

    const handleStart = (e) => {
      e.preventDefault();
      onStart();
    };
    const handleEnd = (e) => {
      e.preventDefault();
      onEnd();
    };

    btn.addEventListener('touchstart', handleStart, { passive: false });
    btn.addEventListener('touchend', handleEnd, { passive: false });
    btn.addEventListener('touchcancel', handleEnd, { passive: false });

    btn.addEventListener('mousedown', handleStart);
    btn.addEventListener('mouseup', handleEnd);
    btn.addEventListener('mouseleave', onEnd);
  }

  bindTouchButton('btn-steer-left', 
    () => { touchState.steerLeft = true; }, 
    () => { touchState.steerLeft = false; }
  );

  bindTouchButton('btn-steer-right', 
    () => { touchState.steerRight = true; }, 
    () => { touchState.steerRight = false; }
  );

  bindTouchButton('btn-gas', 
    () => { touchState.throttle = 1; }, 
    () => { touchState.throttle = 0; }
  );

  bindTouchButton('btn-brake', 
    () => { touchState.brake = 1; }, 
    () => { touchState.brake = 0; }
  );

  bindTouchButton('btn-handbrake', 
    () => { touchState.handbrake = true; }, 
    () => { touchState.handbrake = false; }
  );

  bindTouchButton('btn-nitro', 
    () => { touchState.nitro = true; }, 
    () => { touchState.nitro = false; }
  );

  bindTouchButton('btn-horn', 
    () => { triggerPress('KeyH'); }, 
    () => {}
  );

  bindTouchButton('btn-interact', 
    () => { triggerPress('KeyE'); }, 
    () => {}
  );

  bindTouchButton('btn-reset', 
    () => { triggerPress('KeyR'); }, 
    () => {}
  );
}

export function readInput() {
  // Keyboard inputs
  const kbThrottle = (keys.has('KeyW') || keys.has('ArrowUp')) ? 1 : 0;
  const kbBrake = (keys.has('KeyS') || keys.has('ArrowDown')) ? 1 : 0;
  let kbSteer = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) kbSteer += 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) kbSteer -= 1;
  const kbHandbrake = keys.has('Space');
  const kbNitro = keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('KeyN');
  const kbHorn = keys.has('KeyH') || consumePress('KeyH');
  const kbReset = keys.has('KeyR') || consumePress('KeyR');

  // Touch inputs
  let touchSteer = 0;
  if (touchState.steerLeft) touchSteer += 1;
  if (touchState.steerRight) touchSteer -= 1;

  // Combine keyboard + touch
  const throttle = Math.max(kbThrottle, touchState.throttle);
  const brake = Math.max(kbBrake, touchState.brake);
  const steer = kbSteer !== 0 ? kbSteer : touchSteer;
  const handbrake = kbHandbrake || touchState.handbrake;
  const nitro = kbNitro || touchState.nitro;
  const horn = kbHorn || touchState.horn;
  const reset = kbReset || touchState.reset;

  return { throttle, brake, steer, handbrake, nitro, horn, reset };
}
