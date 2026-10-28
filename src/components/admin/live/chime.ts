/**
 * Sonido corto y suave para las alertas, generado con Web Audio (sin archivos).
 * Dos notas que suben; «red» baja, para lo que necesita atención. Si el
 * navegador aún no permite sonido (sin interacción previa), no suena.
 */
let context: AudioContext | null = null;

const NOTES = {
  green: [660, 880],
  violet: [587, 784],
  red: [523, 392],
} as const;

export function playChime(tone: keyof typeof NOTES) {
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume();
    const start = context.currentTime;
    NOTES[tone].forEach((frequency, index) => {
      const oscillator = context!.createOscillator();
      const gain = context!.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      const at = start + index * 0.11;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.08, at + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.32);
      oscillator.connect(gain).connect(context!.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.34);
    });
  } catch {
    // Sin Web Audio: las alertas igual se ven.
  }
}
