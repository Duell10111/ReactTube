from mitmproxy import http
import json, re
L=[]; seen=set()
def pr(*a): L.append(" ".join(str(x) for x in a))
def red(v,k=8):
    s="" if v is None else str(v)
    return f"{s[:k]}…<len={len(s)}>" if len(s)>k+6 else s
SENS=re.compile(r"(authorization|cookie|sapisid|token|visitor|datasync|delegat|pageid)",re.I)
WANT=("/youtubei/v1/player","/youtubei/v1/browse","/youtubei/v1/next","/youtubei/v1/guide",
      "/youtubei/v1/account/accounts_list","/youtubei/v1/config","/youtubei/v1/visitor_id",
      "/youtubei/v1/music/get_search_suggestions","/youtubei/v1/att/get")
def response(f: http.HTTPFlow):
    if f.request.pretty_host!="youtubei.googleapis.com": return
    p=f.request.path.split("?")[0]
    if p not in WANT or p in seen: return
    seen.add(p)
    pr("="*72); pr(f"{f.request.method} {p}?{f.request.path.split('?',1)[1][:120] if '?' in f.request.path else ''} -> {f.response.status_code}")
    for k,v in f.request.headers.items():
        pr(f"  H {k}: {red(v) if SENS.search(k) else v[:200]}")
    b=f.request.get_text(strict=False) or ""
    try:
        j=json.loads(b)
        pr("  BODY top-level keys: "+str(list(j.keys())))
        ctx=j.get("context",{})
        pr("  context keys: "+str(list(ctx.keys())))
        pr("  context.client = "+json.dumps(ctx.get("client",{}),ensure_ascii=False)[:900])
        for k,v in ctx.items():
            if k!="client": pr(f"  context.{k} = "+json.dumps(v,ensure_ascii=False)[:400])
        for k,v in j.items():
            if k!="context": pr(f"  body.{k} = "+json.dumps(v,ensure_ascii=False)[:600])
    except Exception as e:
        pr("  BODY (unparsed):",b[:400])
def done(): print("\n".join(L))
