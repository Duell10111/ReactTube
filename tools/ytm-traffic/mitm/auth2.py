from mitmproxy import http
import json, re
L=[]
def pr(*a): L.append(" ".join(str(x) for x in a))
def red(v,k=8):
    s="" if v is None else str(v)
    return f"{s[:k]}…<len={len(s)}>" if len(s)>k+6 else s
SENS=re.compile(r"(auth|token|cookie|sapisid|secret|_sid|sid=|password|email|signature|grant)",re.I)
HOSTS=("oauthaccountmanager.googleapis.com","oauth2.googleapis.com")
def response(f: http.HTTPFlow):
    h,p=f.request.pretty_host,f.request.path.split("?")[0]
    if h not in HOSTS: return
    pr("="*72); pr(f"{f.request.method} {h}{p} -> {f.response.status_code}")
    for k,v in f.request.headers.items():
        pr(f"  H {k}: {red(v) if SENS.search(k) else v[:160]}")
    b=f.request.get_text(strict=False) or ""
    pr("  --- request body ---")
    if b.lstrip().startswith("{"):
        try:
            for k,v in json.loads(b).items(): pr(f"  B {k} = {red(v) if SENS.search(k) else str(v)[:200]}")
        except Exception: pr("  B",b[:500])
    else:
        for part in b.split("&"):
            kv=part.split("=",1)
            if len(kv)==2: pr(f"  B {kv[0]} = {red(kv[1]) if SENS.search(kv[0]) else kv[1][:300]}")
            elif part: pr(f"  B {part[:300]}")
    rb=f.response.get_text(strict=False) or ""
    pr("  --- response ---")
    try:
        for k,v in json.loads(rb).items(): pr(f"  R {k} = {red(v) if SENS.search(k) else str(v)[:200]}")
    except Exception: pr("  R",rb[:400])
def done(): print("\n".join(L))
