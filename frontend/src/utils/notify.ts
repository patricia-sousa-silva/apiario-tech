/**
 * Notificações do browser e sinal sonoro para alertas críticos.
 */

export function canNotify(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Pede permissão para notificações (se ainda não foi decidida).
 * Devolve `true` se as notificações estão permitidas.
 */
export async function requestNotifyPermission(): Promise<boolean> {
  if (!canNotify()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    const result = await Notification.requestPermission();
    return result === 'granted';
  } catch {
    return false;
  }
}

/** Envia uma notificação do browser (se permitido). */
export function sendBrowserNotification(title: string, body: string) {
  if (!canNotify() || Notification.permission !== 'granted') return;
  try {
    // eslint-disable-next-line no-new
    new Notification(title, { body, tag: 'apiario-tech-alerta' });
  } catch {
    // Alguns browsers exigem Service Worker para Notification — ignora.
  }
}

let audioCtx: AudioContext | null = null;

/**
 * Toca um bip curto (Web Audio API) para sinalizar um alerta,
 * mesmo quando o separador está em segundo plano.
 */
export function playBeep() {
  try {
    type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };
    const Ctx = window.AudioContext || (window as AudioWindow).webkitAudioContext;
    if (!Ctx) return;
    audioCtx = audioCtx || new Ctx();
    if (audioCtx.state === 'suspended') void audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.value = 880;
    const t = audioCtx.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    osc.start(t);
    osc.stop(t + 0.55);
  } catch {
    // Áudio indisponível — ignora silenciosamente.
  }
}
