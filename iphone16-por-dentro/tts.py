"""Genera la narración del reel con Piper (voz neural en español) y los tiempos de cada palabra.

Uso: python3 tts.py [modelo.onnx]
Salidas: out/reel_voice.wav (voz completa) y reel_timing.json (segmentos, frases y palabras).
Cada frase se sintetiza por separado, así se conoce exactamente cuándo empieza y termina;
dentro de una frase, el tiempo de cada palabra se reparte según su longitud.
"""
import io
import json
import os
import subprocess
import sys
import wave

import numpy as np
from piper import PiperVoice, SynthesisConfig

ROOT = os.path.dirname(os.path.abspath(__file__))
MODEL = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'voices', 'es_ES-davefx-medium.onnx')
LENGTH_SCALE = 0.8   # < 1 = más rápido (~3.2 palabras/s, ritmo de reel)
NOISE, NOISE_W = 0.75, 1.0  # más variación = entonación más viva
PITCH = 1.0          # >1 sube el tono (probado: 1.06 resta claridad)
LEAD = 0.25          # silencio antes de la primera frase
SEG_GAP = 0.15       # pausa extra entre segmentos

voice = PiperVoice.load(MODEL)
cfg = SynthesisConfig(length_scale=LENGTH_SCALE, noise_scale=NOISE, noise_w_scale=NOISE_W)
script = json.load(open(os.path.join(ROOT, 'reel_script.json'), encoding='utf-8'))


def synth(text):
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w:
        voice.synthesize_wav(text, w, syn_config=cfg)
    buf.seek(0)
    with wave.open(buf, 'rb') as r:
        sr = r.getframerate()
    # Sube el tono sin cambiar la duración (ffmpeg + rubberband), si PITCH != 1.
    af = f'rubberband=pitch={PITCH}:formant=preserved' if PITCH != 1.0 else 'anull'
    raw = subprocess.run(['ffmpeg', '-nostdin', '-loglevel', 'error', '-i', '-', '-af', af,
                          '-f', 's16le', '-ac', '1', '-ar', str(sr), '-'], input=buf.getvalue(), capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype='<i2').astype(np.float32) / 32768
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
        return 0.2
    if t.endswith(':'):
        return 0.12
    if t.endswith(','):
        return 0.08
    return 0.04


TAKES = 4  # tomas por frase; se queda la que Whisper entiende mejor


def norm(s):
    import re
    import unicodedata
    s = unicodedata.normalize('NFKD', s.lower().replace('‑', '-'))
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9 ]+', ' ', s).split()


def best_take(show, say):
    import difflib
    from asr_check import transcribe
    best = None
    for _ in range(TAKES):
        audio, sr = synth(say)
        heard = ' '.join(w.word for w in transcribe(audio, sr))
        score = difflib.SequenceMatcher(None, norm(show), norm(heard)).ratio()
        if best is None or score > best[0]:
            best = (score, audio, sr, heard.strip())
        if score >= 0.999:
            break
    print(f'  {best[0]:.2f}  {show}  ->  {best[3]}')
    return best[1], best[2]


chunks, timing, t, sr = [], [], LEAD, None
for s in script['segments']:
    seg = {'id': s['id'], 'item': s.get('item'), 'start': round(t, 3), 'phrases': []}
    for ph in s['phrases']:
        show, say = (ph, ph) if isinstance(ph, str) else ph
        audio, sr = best_take(show, say)
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
