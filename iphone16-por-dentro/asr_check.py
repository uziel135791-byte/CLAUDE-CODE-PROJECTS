"""Verifica la pronunciación: transcribe audio con Whisper (faster-whisper) y mide la velocidad del habla."""
import os
import subprocess
import numpy as np
os.environ.setdefault('HF_HUB_DISABLE_XET', '1')
from faster_whisper import WhisperModel

ROOT = os.path.dirname(os.path.abspath(__file__))
_model = None


def model():
    global _model
    if _model is None:
        _model = WhisperModel('small', device='cpu', compute_type='int8', download_root=os.path.join(ROOT, 'voices', 'whisper'))
    return _model


def load(path_or_array, sr_in=None):
    if isinstance(path_or_array, str):
        raw = subprocess.run(['ffmpeg', '-nostdin', '-loglevel', 'error', '-i', path_or_array, '-ac', '1', '-ar', '16000', '-f', 's16le', '-'],
                             capture_output=True, check=True).stdout
        return np.frombuffer(raw, dtype='<i2').astype(np.float32) / 32768
    x = np.asarray(path_or_array, dtype=np.float32)
    if sr_in and sr_in != 16000:
        n = int(len(x) * 16000 / sr_in)
        x = np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x).astype(np.float32)
    return x


def transcribe(audio, sr_in=None, prompt=None):
    segs, _ = model().transcribe(load(audio, sr_in), language='es', word_timestamps=True, beam_size=5,
                                 initial_prompt=prompt, vad_filter=False)
    return [w for s in segs for w in s.words]


if __name__ == '__main__':
    import sys
    for p in sys.argv[1:]:
        ws = transcribe(p)
        dur = ws[-1].end - ws[0].start
        print(f'{os.path.basename(p)}: {len(ws)} palabras en {dur:.1f} s -> {len(ws) / dur:.2f} palabras/s')
        print('  ', ' '.join(w.word.strip() for w in ws))
