"""Banda sonora sintetizada para el video: pad ambiental + whooshes sincronizados.

Uso: python3 audio.py <duracion_segundos> <salida.wav>
Los tiempos coinciden con la línea de tiempo de scene.js.
"""
import sys
import wave

import numpy as np

SR = 48000
DUR = float(sys.argv[1]) if len(sys.argv) > 1 else 119.2
OUT = sys.argv[2] if len(sys.argv) > 2 else 'out/audio.wav'

FOCUS0, PER, N = 21.8, 7.6, 11
EXPLODE = 11.2
IMPLODE = FOCUS0 + (N - 1) * PER + 7.8
OUTRO = IMPLODE + 4.4 + 3.2 - 0.6

n = int(DUR * SR)
t = np.arange(n) / SR
rng = np.random.default_rng(16)


def env_adsr(start, length, attack, release):
    e = np.zeros(n)
    a, b = int(start * SR), int(min(DUR, start + length) * SR)
    if b <= a:
        return e
    x = np.arange(b - a) / SR
    seg = np.minimum(1, x / attack) * np.minimum(1, np.maximum(0, (length - x) / release))
    e[a:b] = seg
    return e


# ------------------------------------------------------------------ pad
CHORDS = [
    [110.00, 164.81, 246.94, 261.63, 329.63],  # Am9
    [87.31, 130.81, 164.81, 220.00, 329.63],   # Fmaj7
    [130.81, 196.00, 293.66, 329.63, 392.00],  # Cadd9
    [98.00, 146.83, 246.94, 293.66, 329.63],   # G6
]
starts = [0.0, EXPLODE] + [FOCUS0 + i * PER for i in range(N)] + [IMPLODE, OUTRO]
pad = np.zeros(n)
for i, s in enumerate(starts):
    end = starts[i + 1] if i + 1 < len(starts) else DUR
    length = end - s + 2.5
    e = env_adsr(s, length, 2.0, 2.5)
    a, b = int(s * SR), int(min(DUR, s + length) * SR)
    tt = t[a:b]
    chord = CHORDS[i % len(CHORDS)]
    voice = np.zeros(b - a)
    for j, f in enumerate(chord):
        amp = 0.22 if j == 0 else 0.15
        for det in (-0.18, 0.18):
            ph = rng.uniform(0, 2 * np.pi)
            voice += amp * (np.sin(2 * np.pi * (f + det) * tt + ph) + 0.25 * np.sin(4 * np.pi * (f + det) * tt + ph))
    voice *= 0.85 + 0.15 * np.sin(2 * np.pi * 0.11 * tt + i)
    pad[a:b] += voice * e[a:b]
pad *= np.minimum(1, t / 3.0) * np.minimum(1, np.maximum(0, (DUR - 0.3 - t) / 3.5))


# ------------------------------------------------------------------ efectos
def svf_band(x, fc, q=0.7):
    """Filtro de estado variable pasa banda con frecuencia de corte variable."""
    low = band = 0.0
    out = np.empty_like(x)
    f = 2 * np.sin(np.pi * np.clip(fc, 20, 12000) / SR)
    for i in range(len(x)):
        high = x[i] - low - q * band
        band += f[i] * high
        low += f[i] * band
        out[i] = band
    return out


def whoosh(start, length, f0, f1, gain):
    m = int(length * SR)
    x = rng.standard_normal(m)
    k = np.arange(m) / m
    fc = f0 * (f1 / f0) ** (np.sin(np.pi * k) ** 1.5)
    y = svf_band(x, fc, 0.9)
    shape = np.sin(np.pi * k) ** 2
    a = int(start * SR)
    b = min(n, a + m)
    fx[a:b] += gain * (y * shape)[: b - a]


def pluck(start, freq, gain):
    m = int(1.6 * SR)
    k = np.arange(m) / SR
    y = (np.sin(2 * np.pi * freq * k) + 0.3 * np.sin(4 * np.pi * freq * k)) * np.exp(-k * 3.2) * np.minimum(1, k / 0.004)
    a = int(start * SR)
    b = min(n, a + m)
    fx[a:b] += gain * y[: b - a]


fx = np.zeros(n)
whoosh(EXPLODE - 0.2, 2.2, 300, 2600, 0.55)
whoosh(IMPLODE - 0.1, 2.2, 2400, 260, 0.5)
whoosh(4.9, 2.4, 400, 1500, 0.22)
NOTES = [659.25, 587.33, 523.25, 493.88]
for i in range(N):
    s = FOCUS0 + i * PER
    whoosh(s - 0.05, 1.1, 500, 3000, 0.18)
    pluck(s + 0.95, NOTES[i % len(NOTES)], 0.16)
pluck(OUTRO + 0.2, 440.0, 0.18)
pluck(OUTRO + 0.2, 659.25, 0.12)

# ------------------------------------------------------------------ mezcla + reverb
dry = pad * 0.5 + fx
ir_len = int(2.2 * SR)
ir = rng.standard_normal(ir_len) * np.exp(-np.arange(ir_len) / SR * 2.6)
ir[0] = 0
size = 1 << int(np.ceil(np.log2(n + ir_len)))
wetL = np.fft.irfft(np.fft.rfft(dry, size) * np.fft.rfft(ir, size), size)[:n]
ir2 = np.roll(ir, int(0.013 * SR))
wetR = np.fft.irfft(np.fft.rfft(dry, size) * np.fft.rfft(ir2, size), size)[:n]
wetL *= 0.25 / (np.abs(wetL).max() + 1e-9) * np.abs(dry).max()
wetR *= 0.25 / (np.abs(wetR).max() + 1e-9) * np.abs(dry).max()
L = dry + wetL
R = dry + wetR
st = np.stack([L, R], axis=1)
st *= 10 ** (-3 / 20) / np.abs(st).max()
st *= np.minimum(1, t / 0.05)[:, None]

with wave.open(OUT, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((st * 32767).astype('<i2').tobytes())
print(f'{OUT}: {DUR:.1f} s')
