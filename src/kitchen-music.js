const melody = [
  [76, 79, 81, 79, 76, 74, 72, 76], [77, 81, 84, 81, 79, 77, 76, 74],
  [76, 81, 83, 81, 79, 76, 74, 76], [74, 79, 83, 79, 77, 74, 71, 74],
  [76, 79, 84, 83, 81, 79, 76, 72], [77, 81, 79, 77, 76, 74, 72, 74],
  [76, 81, 79, 76, 74, 76, 79, 83], [79, 77, 76, 74, 72, 76, 74, 72],
];
const chords = [[48, 64, 67], [53, 65, 69], [45, 64, 69], [43, 62, 67], [48, 64, 67], [53, 65, 69], [45, 64, 69], [43, 62, 67]];

export async function createKitchenMusic() {
  const OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OfflineContext) throw new Error("Audio unavailable");
  const beat = 60 / 108;
  const duration = melody.length * 4 * beat;
  const audio = new OfflineContext(1, Math.ceil(duration * 22050), 22050);
  const frequency = (note) => 440 * 2 ** ((note - 69) / 12);
  function tone(note, start, length, volume, type = "triangle") {
    const oscillator = audio.createOscillator();
    const envelope = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency(note);
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(volume, start + .008);
    envelope.gain.exponentialRampToValueAtTime(.0001, start + length);
    oscillator.connect(envelope); envelope.connect(audio.destination);
    oscillator.start(start); oscillator.stop(start + length + .01);
  }
  // Original eight-bar tune: soft plucked melody, bass, chords, and tiny clicks.
  melody.forEach((notes, bar) => {
    notes.forEach((note, step) => {
      const start = bar * 4 * beat + step * beat / 2 + (step % 2 ? .025 : 0);
      tone(note, start, beat * .42, .14);
      tone(note + 12, start, beat * .28, .018, "sine");
    });
    for (let pulse = 0; pulse < 4; pulse++) {
      const start = (bar * 4 + pulse) * beat;
      tone(chords[bar][0] + (pulse === 2 ? 7 : 0), start, beat * .65, .12, "sine");
      chords[bar].slice(1).forEach((note) => tone(note, start + beat / 2, beat * .3, .025));
      tone(pulse % 2 ? 94 : 38, start, .045, .025, "sine");
    }
  });
  return audio.startRendering();
}
