from mitmproxy import http, ctx
from collections import Counter
hosts = Counter()
paths = Counter()
def response(flow: http.HTTPFlow):
    hosts[flow.request.pretty_host] += 1
    paths[(flow.request.pretty_host, flow.request.path.split("?")[0])] += 1
def error(flow): pass
def done():
    print("### HOSTS ###")
    for h, n in hosts.most_common(40):
        print(f"{n:5d}  {h}")
    print("### PATHS (google/youtube) ###")
    for (h, p), n in paths.most_common(300):
        if any(k in h for k in ("youtube", "google", "ytimg", "ggpht")):
            print(f"{n:5d}  {h}{p}")
