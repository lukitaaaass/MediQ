/**
 * JarvisOrb — State controller for the holographic voice orb.
 *
 * States are driven entirely by CSS via the `data-state` attribute,
 * so this module is a convenience wrapper — the orb works even without it.
 *
 * Usage from inline scripts:
 *   document.getElementById('jarvis-orb').dataset.state = 'speaking';
 *
 * Usage via global API (available after this module loads):
 *   window.JarvisOrb.setSpeaking();
 */

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface JarvisOrbAPI {
  setIdle(): void;
  setListening(): void;
  setThinking(): void;
  setSpeaking(): void;
  getState(): OrbState;
}

function createOrb(el: HTMLElement): JarvisOrbAPI {
  return {
    setIdle:      () => { el.dataset.state = 'idle'; },
    setListening: () => { el.dataset.state = 'listening'; },
    setThinking:  () => { el.dataset.state = 'thinking'; },
    setSpeaking:  () => { el.dataset.state = 'speaking'; },
    getState:     () => (el.dataset.state as OrbState) || 'idle',
  };
}

// Auto-initialize and expose globally for inline scripts
const el = document.getElementById('jarvis-orb');
if (el) {
  (window as unknown as Record<string, unknown>).JarvisOrb = createOrb(el);
}

export { createOrb };
