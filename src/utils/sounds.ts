import { Audio } from 'expo-av';

let sound: Audio.Sound | null = null;

export async function playChime(): Promise<void> {
  try {
    // Unload previous sound if any
    if (sound) {
      await sound.unloadAsync();
      sound = null;
    }

    // Generate a simple chime sound from a base64-encoded sine wave WAV
    // This is a short pleasant chime tone (~300ms, C5 note)
    const sampleRate = 44100;
    const duration = 0.3;
    const numSamples = Math.floor(sampleRate * duration);
    const frequency = 523.25; // C5

    // Create WAV buffer
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    // WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // chunk size
    view.setUint16(20, 1, true);  // PCM
    view.setUint16(22, 1, true);  // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // byte rate
    view.setUint16(32, 2, true);  // block align
    view.setUint16(34, 16, true); // bits per sample
    writeString(view, 36, 'data');
    view.setUint32(40, numSamples * 2, true);

    // Generate sine wave with fade in/out (pleasant chime)
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const envelope = Math.min(
        Math.min(t / 0.02, 1),           // fade in (20ms)
        Math.min((duration - t) / 0.05, 1) // fade out (50ms)
      );
      const sample = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.4;
      const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
      view.setInt16(44 + i * 2, intSample, true);
    }

    // Convert to base64 data URI
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    const uri = `data:audio/wav;base64,${base64}`;

    const { sound: newSound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true, volume: 0.6 }
    );
    sound = newSound;

    // Auto-unload after playback
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && 'didJustFinish' in status && status.didJustFinish) {
        sound?.unloadAsync();
        sound = null;
      }
    });
  } catch {
    // Audio not available (web or no audio)
  }
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export async function playRewardFanfare(): Promise<void> {
  try {
    if (sound) {
      await sound.unloadAsync();
      sound = null;
    }

    // A more complex reward sound: rising arpeggio (C5 -> E5 -> G5)
    const sampleRate = 44100;
    const noteDuration = 0.15;
    const notes = [
      { freq: 523.25, dur: 0.15 },  // C5
      { freq: 659.25, dur: 0.15 },  // E5
      { freq: 783.99, dur: 0.2 },   // G5
    ];
    const totalDuration = notes.reduce((s, n) => s + n.dur, 0) + 0.05;
    const numSamples = Math.floor(sampleRate * totalDuration);

    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, numSamples * 2, true);

    let sampleIdx = 0;
    for (const note of notes) {
      const noteSamples = Math.floor(sampleRate * note.dur);
      for (let i = 0; i < noteSamples && sampleIdx < numSamples; i++) {
        const t = i / sampleRate;
        const noteT = t / note.dur;
        const envelope = Math.min(
          Math.min(noteT / 0.01, 1),
          Math.min((1 - noteT) / 0.03, 1)
        );
        const sample = Math.sin(2 * Math.PI * note.freq * t) * envelope * 0.4;
        const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
        view.setInt16(44 + sampleIdx * 2, intSample, true);
        sampleIdx++;
      }
      // small gap between notes
      const gapSamples = Math.floor(sampleRate * 0.025);
      for (let i = 0; i < gapSamples && sampleIdx < numSamples; i++) {
        view.setInt16(44 + sampleIdx * 2, 0, true);
        sampleIdx++;
      }
    }

    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    const uri = `data:audio/wav;base64,${base64}`;

    const { sound: newSound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true, volume: 0.7 }
    );
    sound = newSound;

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && 'didJustFinish' in status && status.didJustFinish) {
        sound?.unloadAsync();
        sound = null;
      }
    });
  } catch {
    // Audio not available
  }
}
