// All sound is synthesized with WebAudio: no audio files, no network. Every
// effect is a short oscillator or filtered-noise burst; the beam hum is one
// quiet oscillator whose gain follows how many beams are live. Audio only
// starts after a user gesture (the Start button), as browsers require.
export function createAudio() {
  let ctx = null;
  let master = null;
  let humOsc = null;
  let humGain = null;
  let muted = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      // The beam hum: two detuned sines, barely audible, gain driven by beams.
      humOsc = ctx.createOscillator();
      humOsc.type = 'sine';
      humOsc.frequency.value = 55;
      const humOsc2 = ctx.createOscillator();
      humOsc2.type = 'sine';
      humOsc2.frequency.value = 110.5;
      humGain = ctx.createGain();
      humGain.gain.value = 0;
      humOsc.connect(humGain);
      humOsc2.connect(humGain);
      humGain.connect(master);
      humOsc.start();
      humOsc2.start();
    } catch {
      return false;
    }
    return true;
  }

  function tone({ type = 'sine', from = 440, to = null, dur = 0.12, vol = 0.25, when = 0 }) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise({ dur = 0.15, vol = 0.3, freq = 1200, when = 0 }) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime + when;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    setMuted(value) {
      muted = value;
      if (master) master.gain.value = muted ? 0 : 0.5;
    },
    isMuted() { return muted; },
    /** Called every frame with the live beam count (0..~40): the hum follows it. */
    setBeamLevel(level) {
      if (!ensure() || muted) return;
      const target = Math.min(0.05, 0.012 + level * 0.0012);
      humGain.gain.setTargetAtTime(target, ctx.currentTime, 0.2);
    },
    place() { tone({ type: 'square', from: 660, to: 880, dur: 0.07, vol: 0.18 }); },
    rotate() { tone({ type: 'square', from: 520, dur: 0.04, vol: 0.12 }); },
    error() { tone({ type: 'sawtooth', from: 160, to: 110, dur: 0.12, vol: 0.16 }); },
    sell() { tone({ type: 'sine', from: 880, to: 1320, dur: 0.09, vol: 0.18 }); },
    select() { tone({ type: 'sine', from: 740, dur: 0.05, vol: 0.1 }); },
    death() { noise({ dur: 0.12, vol: 0.22, freq: 2400 }); tone({ type: 'sine', from: 420, to: 90, dur: 0.14, vol: 0.16 }); },
    leak() { tone({ type: 'sawtooth', from: 120, to: 55, dur: 0.3, vol: 0.3 }); noise({ dur: 0.2, vol: 0.2, freq: 500 }); },
    heal() { tone({ type: 'sine', from: 660, to: 990, dur: 0.12, vol: 0.12 }); },
    waveStart() {
      tone({ type: 'triangle', from: 220, dur: 0.16, vol: 0.25 });
      tone({ type: 'triangle', from: 330, dur: 0.16, vol: 0.25, when: 0.12 });
      tone({ type: 'triangle', from: 440, dur: 0.24, vol: 0.28, when: 0.24 });
    },
    waveClear() {
      tone({ type: 'sine', from: 523, dur: 0.12, vol: 0.2 });
      tone({ type: 'sine', from: 659, dur: 0.12, vol: 0.2, when: 0.1 });
      tone({ type: 'sine', from: 784, dur: 0.22, vol: 0.22, when: 0.2 });
    },
    victory() {
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ type: 'triangle', from: f, dur: 0.3, vol: 0.25, when: i * 0.13 }));
    },
    defeat() {
      [392, 330, 262, 196].forEach((f, i) => tone({ type: 'sawtooth', from: f, dur: 0.35, vol: 0.18, when: i * 0.18 }));
    },
  };
}
