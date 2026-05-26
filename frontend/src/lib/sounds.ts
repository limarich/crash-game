let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  }
  // Resume if suspended (browser autoplay policy)
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function makeGain(ac: AudioContext, value: number): GainNode {
  const g = ac.createGain()
  g.gain.setValueAtTime(value, ac.currentTime)
  return g
}

// Short click confirming a bet was placed
export function playBetPlaced() {
  try {
    const ac = getCtx()
    const now = ac.currentTime
    const osc = ac.createOscillator()
    const gain = makeGain(ac, 0)

    osc.connect(gain)
    gain.connect(ac.destination)

    osc.type = 'sine'
    osc.frequency.setValueAtTime(900, now)
    osc.frequency.exponentialRampToValueAtTime(500, now + 0.12)

    gain.gain.linearRampToValueAtTime(0.25, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)

    osc.start(now)
    osc.stop(now + 0.2)
  } catch {}
}

// Subtle ping every WS tick — pitch rises with multiplier
export function playMultiplierTick(multiplier: number) {
  try {
    const ac = getCtx()
    const now = ac.currentTime
    const freq = Math.min(180 + (multiplier - 1) * 90, 1400)
    const vol = Math.min(0.03 + (multiplier - 1) * 0.003, 0.09)

    const osc = ac.createOscillator()
    const gain = makeGain(ac, 0)

    osc.connect(gain)
    gain.connect(ac.destination)

    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, now)

    gain.gain.linearRampToValueAtTime(vol, now + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07)

    osc.start(now)
    osc.stop(now + 0.08)
  } catch {}
}

// Ascending 3-note chord for successful cashout
export function playCashout() {
  try {
    const ac = getCtx()
    const now = ac.currentTime
    const notes = [523.25, 659.25, 783.99] // C5 E5 G5

    notes.forEach((freq, i) => {
      const osc = ac.createOscillator()
      const gain = makeGain(ac, 0)

      osc.connect(gain)
      gain.connect(ac.destination)

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + i * 0.09)

      gain.gain.linearRampToValueAtTime(0.35, now + i * 0.09 + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.28)

      osc.start(now + i * 0.09)
      osc.stop(now + i * 0.09 + 0.3)
    })
  } catch {}
}

// Deep boom + descending glide + white noise burst
export function playCrash() {
  try {
    const ac = getCtx()
    const now = ac.currentTime

    // Bass glide
    const osc = ac.createOscillator()
    const filter = ac.createBiquadFilter()
    const gain = makeGain(ac, 0)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(ac.destination)

    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(160, now)
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.9)

    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(500, now)
    filter.frequency.exponentialRampToValueAtTime(80, now + 0.9)

    gain.gain.linearRampToValueAtTime(0.55, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9)

    osc.start(now)
    osc.stop(now + 0.95)

    // White noise burst
    const bufSize = ac.sampleRate * 0.35
    const buf = ac.createBuffer(1, bufSize, ac.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1

    const noise = ac.createBufferSource()
    const noiseFilter = ac.createBiquadFilter()
    const noiseGain = makeGain(ac, 0)

    noise.buffer = buf
    noise.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(ac.destination)

    noiseFilter.type = 'bandpass'
    noiseFilter.frequency.setValueAtTime(250, now)
    noiseFilter.Q.setValueAtTime(0.8, now)

    noiseGain.gain.linearRampToValueAtTime(0.38, now + 0.01)
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

    noise.start(now)
    noise.stop(now + 0.4)
  } catch {}
}

// Short beep for the last seconds of the betting countdown
export function playCountdownBeep(urgent = false) {
  try {
    const ac = getCtx()
    const now = ac.currentTime

    const osc = ac.createOscillator()
    const gain = makeGain(ac, 0)

    osc.connect(gain)
    gain.connect(ac.destination)

    osc.type = 'square'
    osc.frequency.setValueAtTime(urgent ? 1320 : 880, now)

    gain.gain.linearRampToValueAtTime(0.12, now + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09)

    osc.start(now)
    osc.stop(now + 0.1)
  } catch {}
}

// Slightly higher cashout variant for auto-cashout trigger
export function playAutoCashout() {
  try {
    const ac = getCtx()
    const now = ac.currentTime
    const notes = [659.25, 783.99, 1046.5] // E5 G5 C6

    notes.forEach((freq, i) => {
      const osc = ac.createOscillator()
      const gain = makeGain(ac, 0)

      osc.connect(gain)
      gain.connect(ac.destination)

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + i * 0.07)

      gain.gain.linearRampToValueAtTime(0.3, now + i * 0.07 + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.22)

      osc.start(now + i * 0.07)
      osc.stop(now + i * 0.07 + 0.25)
    })
  } catch {}
}
