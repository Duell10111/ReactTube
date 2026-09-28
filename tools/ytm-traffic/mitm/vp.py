from mitmproxy import http
import re
L=[]; n=0
def pr(*a): L.append(" ".join(str(x) for x in a))
def response(f: http.HTTPFlow):
    global n
    h,p=f.request.pretty_host,f.request.path.split("?")[0]
    if p=="/youtubei/v1/player":
        b=f.response.content or b""
        for pat in (rb"https://[a-z0-9\-]+\.googlevideo\.com/[a-zA-Z0-9_/\-]+",):
            urls=sorted(set(re.findall(pat,b)))
            pr("PLAYER resp googlevideo URLs:", len(urls))
            for u in urls[:8]: pr("   ", u.decode())
        for marker in (b"serverAbrStreamingUrl", b"sabr", b"adaptiveFormats", b"hlsManifestUrl",
                       b"dashManifestUrl", b"videoplayback", b"ustreamer"):
            pr(f"   marker {marker.decode():22s}: {b.count(marker)}")
    if p=="/videoplayback" and n<4:
        n+=1
        q=f.request.path.split("?",1)[1] if "?" in f.request.path else ""
        params=dict(kv.split("=",1) for kv in q.split("&") if "=" in kv)
        pr("="*72)
        pr(f"{f.request.method} {h}/videoplayback -> {f.response.status_code}")
        pr("  params:", ", ".join(sorted(params)))
        for k in ("itag","source","mime","sabr","ump","srfvp","expire","lmt","aitags","cmo","pot"):
            if k in params: pr(f"    {k} = {params[k][:70]}")
        pr("  REQ ct:", f.request.headers.get("content-type"), "body len:", len(f.request.content or b""))
        pr("  REQ body head:", repr((f.request.content or b"")[:64]))
        pr("  RESP ct:", f.response.headers.get("content-type"), "len:", len(f.response.content or b""))
        pr("  RESP head:", repr((f.response.content or b"")[:48]))
def done(): print("\n".join(L))
