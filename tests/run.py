"""한 번에: 시험용 소리 만들기 → 로컬 서버 → 점검"""
import subprocess, sys, os, time, socket
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); here = os.path.dirname(os.path.abspath(__file__))
subprocess.run([sys.executable, os.path.join(here, 'make_fixtures.py')], check=True)
s = socket.socket(); up = s.connect_ex(('127.0.0.1', 8766)) == 0; s.close(); srv = None
if not up: srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8766'], cwd=root, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
try: code = subprocess.run([sys.executable, os.path.join(here, 'smoke.py')]).returncode
finally:
    if srv: srv.terminate()
sys.exit(code)
