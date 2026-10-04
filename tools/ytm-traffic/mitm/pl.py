from mitmproxy import http
L=[]; n={"vp":0}
def pr(*a): L.append(" ".join(str(x) for x in a))
def response(f: http.HTTPFlow):
    h,p=f.request.pretty_host,f.request.path.split("?")[0]
    if p=="/youtubei/v1/player":
        pr("="*72); pr("PLAYER REQ ct:",f.request.headers.get("content-type"))
        pr("PLAYER RESP ct:",f.response.headers.get("content-type"),"len:",len(f.response.content or b""))
        pr("resp first 300 bytes repr:", repr((f.response.content or b"")[:300]))
    if p=="/youtubei/v1/att/get":
        pr("="*72); pr("ATT/GET ->",f.response.status_code,"req ct:",f.request.headers.get("content-type"),
           "resp len:",len(f.response.content or b""))
    if "googlevideo.com" in h and p in ("/videoplayback","/initplayback") and n["vp"]<3:
        n["vp"]+=1
        pr("="*72); pr(f"{f.request.method} {h}{p} -> {f.response.status_code}")
        q=f.request.path.split("?",1)[1] if "?" in f.request.path else ""
        pr("  query params:", ", ".join(sorted(kv.split("=")[0] for kv in q.split("&") if kv)))
        for k in ("content-type","content-length","x-goog-sabr","range"):
            if k in f.request.headers: pr(f"  REQ {k}: {f.request.headers[k]}")
        pr("  REQ body len:", len(f.request.content or b""), "first:", repr((f.request.content or b"")[:80]))
        pr("  RESP ct:", f.response.headers.get("content-type"), "len:", len(f.response.content or b""))
def done(): print("\n".join(L))
