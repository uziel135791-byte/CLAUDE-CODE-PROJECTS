"""Mezcla de audio del reel: narración + pad ambiental que baja bajo la voz + whooshes.

Uso: python3 reel_audio.py <duracion_segundos> <salida.wav>
Necesita out/reel_voice48.wav (la voz de tts.py remuestreada a 48 kHz) y reel_timing.json.
"""
import json
import os
import sys
import wave

import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
SR = 48000
DUR = float(sys.argv[1])
OUT = sys.argv[2]
timing = json.load(open(os.path.join(ROOT, 'reel_timing.json'), encoding='utf-8'))
segs = timing['segments']
n = int(DUR * SR)
t = np.arange(n) / SR
rng = np.random.default_rng(16)

with wave.open(os.path.join(ROOT, 'out', 'reel_voice48.wav'), 'rb') as r:
    assert r.getframerate() == SR
    v = np.frombuffer(r.readframes(r.getnframes()), dtype='<i2').astype(np.float64) / 32768
voice = np.zeros(n)
voice[: min(n, len(v))] = v[:n]

# ------------------------------------------------------------------ pad (cambia de acorde con cada segmento)
CHORDS = [
    [110.00, 164.81, 246.94, 261.63, 329.63],
    [87.31, 130.81, 164.81, 220.00, 329.63],
    [130.81, 196.00, 293.66, 329.63, 392.00],
    [98.00, 146.83, 246.94, 293.66, 329.63],
]
pad = np.zeros(n)
starts = [s['start'] - 0.25 for s in segs]
starts[0] = 0.0
for i, s in enumerate(starts):
    end = (starts[i + 1] if i + 1 < len(starts) else DUR) + 1.5
    a, b = int(s * SR), int(min(DUR, end) * SR)
    tt = t[a:b] - s
    length = (b - a) / SR
    env = np.minimum(1, tt / 0.8) * np.minimum(1, np.maximum(0, (length - tt) / 1.5))
    vo = np.zeros(b - a)
    for j, f in enumerate(CHORDS[i % 4]):
        amp = 0.22 if j == 0 else 0.15
        for det in (-0.2, 0.2):
            ph = rng.uniform(0, 2 * np.pi)
            vo += amp * (np.sin(2 * np.pi * (f + det) * t[a:b] + ph) + 0.25 * np.sin(4 * np.pi * (f + det) * t[a:b] + ph))
    pad[a:b] += vo * env
# pulso suave de bajo para dar ritmo de reel
beat = 60 / 96
kick = np.zeros(n)
for k in np.arange(0.0, DUR - 1.0, beat):
    m = int(0.35 * SR)
    a = int(k * SR)
    b = min(n, a + m)
    x = np.arange(b - a) / SR
    kick[a:b] += np.sin(2 * np.pi * (55 + 40 * np.exp(-x * 30)) * x) * np.exp(-x * 9)


def svf_band(x, fc, q=0.9):
    low = band = 0.0
    out = np.empty_like(x)
    f = 2 * np.sin(np.pi * np.clip(fc, 20, 12000) / SR)
    for i in range(len(x)):
        high = x[i] - low - q * band
        band += f[i] * high
        low += f[i] * band
        out[i] = band
    return out


fx = np.zeros(n)


def whoosh(start, length, f0, f1, gain):
    m = int(length * SR)
    k = np.arange(m) / m
    y = svf_band(rng.standard_normal(m), f0 * (f1 / f0) ** (np.sin(np.pi * k) ** 1.5))
    a = max(0, int(start * SR))
    b = min(n, a + m)
    fx[a:b] += gain * (y * np.sin(np.pi * k) ** 2)[: b - a]


byid = {s['id']: s for s in segs}
whoosh(byid['hook']['end'] - 1.3, 1.6, 400, 1800, 0.25)                # giro
whoosh(byid['open']['start'] + 0.3, 1.8, 300, 2600, 0.5)                # se desarma
whoosh(byid['outro']['start'] - 0.5, 1.6, 2400, 280, 0.45)              # se arma
for s in segs:
    if s.get('item'):
        whoosh(s['start'] - 0.35, 0.9, 600, 3200, 0.2)

# ------------------------------------------------------------------ mezcla con "ducking"
win = int(0.05 * SR)
venv = np.sqrt(np.convolve(voice ** 2, np.ones(win) / win, mode='same'))
active = (venv > 0.01).astype(float)
sm = int(0.35 * SR)
active = np.convolve(active, np.ones(sm) / sm, mode='same')
duck = 1 - 0.6 * np.clip(active * 1.5, 0, 1)

music = (pad * 0.33 + kick * 0.22) * duck
music *= np.minimum(1, t / 0.4) * np.minimum(1, np.maximum(0, (DUR - t) / 1.2))
voice_g = voice / (np.abs(voice).max() + 1e-9) * 0.9
mix = voice_g + music * 0.55 + fx * 0.7

ir_len = int(1.6 * SR)
ir = rng.standard_normal(ir_len) * np.exp(-np.arange(ir_len) / SR * 3.2)
ir[0] = 0
size = 1 << int(np.ceil(np.log2(n + ir_len)))
bed = music * 0.55 + fx * 0.7
wet = np.fft.irfft(np.fft.rfft(bed, size) * np.fft.rfft(ir, size), size)[:n]
wet *= 0.3 * np.abs(bed).max() / (np.abs(wet).max() + 1e-9)
L = mix + wet
R = mix + np.roll(wet, int(0.011 * SR))
st = np.stack([L, R], axis=1)
st *= 10 ** (-1.5 / 20) / np.abs(st).max()

with wave.open(OUT, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((st * 32767).astype('<i2').tobytes())
print(f'{OUT}: {DUR:.2f} s')
