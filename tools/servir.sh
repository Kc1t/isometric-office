#!/bin/zsh
# Sobe o site em 127.0.0.1:4421 como processo solto (sobrevive ao fim da sessão do terminal).
cd "$(dirname "$0")/../site"
lsof -ti tcp:4421 >/dev/null 2>&1 && { echo "já está no ar"; exit 0; }
python3 - <<'PY'
import os, sys
if os.fork(): sys.exit(0)
os.setsid()
if os.fork(): sys.exit(0)
d = os.open(os.devnull, os.O_RDWR)
for f in (0, 1, 2): os.dup2(d, f)
os.execvp('python3', ['python3', '-m', 'http.server', '4421', '--bind', '127.0.0.1'])
PY
sleep 1; curl -s -o /dev/null -w "servidor %{http_code}\n" http://127.0.0.1:4421/
