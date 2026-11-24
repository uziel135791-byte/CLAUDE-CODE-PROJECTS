"""Genera la narración del reel con Piper (voz neural en español) y los tiempos de cada palabra.

Uso: python3 tts.py [modelo.onnx]
Salidas: out/reel_voice.wav (voz completa) y reel_timing.json (segmentos, frases y palabras).
Cada frase se sintetiza por separado, así se conoce exactamente cuándo empieza y termina;
dentro de una frase, el tiempo de cada palabra se reparte según su longitud.
"""
import io
import json
import os
import sys
import wave

import numpy as np
from piper import PiperVoice, SynthesisConfig

ROOT = os.path.dirname(os.path.abspath(__file__))
MODEL = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'voices', 'es_ES-sharvard-medium.onnx')
LENGTH_SCALE = 0.86  # < 1 = un poco más rápido, ritmo de reel
LEAD = 0.25          # silencio antes de la primera frase
SEG_GAP = 0.3        # pausa extra entre segmentos

voice = PiperVoice.load(MODEL)
cfg = SynthesisConfig(length_scale=LENGTH_SCALE)
script = json.load(open(os.path.join(ROOT, 'reel_script.json'), encoding='utf-8'))


def synth(text):
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w:
        voice.synthesize_wav(text, w, syn_config=cfg)
    buf.seek(0)
    with wave.open(buf, 'rb') as r:
        sr = r.getframerate()
        x = np.frombuffer(r.readframes(r.getnframes()), dtype='<i2').astype(np.float32) / 32768
    # Recorta silencio inicial y final.
    win = int(sr * 0.01)
    e = np.sqrt(np.convolve(x ** 2, np.ones(win) / win, mode='same'))
    idx = np.where(e > 0.012)[0]
    if len(idx):
        a = max(0, idx[0] - int(sr * 0.02))
        b = min(len(x), idx[-1] + int(sr * 0.06))
        x = x[a:b]
    return x, sr


def pause_after(text):
    t = text.rstrip()
    if t.endswith(('.', '?', '!')):
        return 0.32
    if t.endswith(':'):
        return 0.2
    if t.endswith(','):
        return 0.14
    return 0.08


chunks, timing, t, sr = [], [], LEAD, None
for s in script['segments']:
    seg = {'id': s['id'], 'item': s.get('item'), 'start': round(t, 3), 'phrases': []}
    for ph in s['phrases']:
        show, say = (ph, ph) if isinstance(ph, str) else ph
        audio, sr = synth(say)
        dur = len(audio) / sr
        if not chunks:
            chunks.append(np.zeros(int(LEAD * sr), dtype=np.float32))
        chunks.append(audio)
        words = show.split()
        weights = np.array([len(w) + 2.5 for w in words], dtype=float)
        edges = np.concatenate([[0], np.cumsum(weights)]) / weights.sum() * dur + t
        seg['phrases'].append({
            'text': show, 'start': round(t, 3), 'end': round(t + dur, 3),
            'words': [{'w': w, 't0': round(edges[i], 3), 't1': round(edges[i + 1], 3)} for i, w in enumerate(words)],
        })
        gap = pause_after(say)
        chunks.append(np.zeros(int(gap * sr), dtype=np.float32))
        t += dur + gap
    chunks.append(np.zeros(int(SEG_GAP * sr), dtype=np.float32))
    t += SEG_GAP
    seg['end'] = round(t, 3)
    timing.append(seg)

voice_track = np.concatenate(chunks)
os.makedirs(os.path.join(ROOT, 'out'), exist_ok=True)
with wave.open(os.path.join(ROOT, 'out', 'reel_voice.wav'), 'wb') as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(sr)
    w.writeframes((np.clip(voice_track, -1, 1) * 32767).astype('<i2').tobytes())
json.dump({'voice_end': round(t, 3), 'segments': timing}, open(os.path.join(ROOT, 'reel_timing.json'), 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)
for s in timing:
    print(f"{s['id']:>14}: {s['start']:6.2f} → {s['end']:6.2f}  ({s['end'] - s['start']:.2f} s)")
print(f'voz total: {t:.2f} s')
