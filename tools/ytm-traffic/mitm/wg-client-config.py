#!/usr/bin/env python3
"""Baut die WireGuard-Client-Config aus mitmproxys Schlüsselpaar.

mitmproxy legt in ~/.mitmproxy/wireguard.conf nur die beiden privaten Schlüssel
ab und zeigt die fertige Client-Config lediglich beim Start im Terminal. Wird
mitmweb im Hintergrund gestartet, bleibt dieses Banner gepuffert und ist nicht
lesbar — dann leitet dieses Skript den Server-Public-Key selbst ab.

    python3 wg-client-config.py 192.168.5.215 > mitm-wg.conf
    qrencode -t ANSIUTF8 < mitm-wg.conf     # in der WireGuard-App scannen

Die Schlüssel sind stabil: ein Neustart von mitmproxy ändert sie nicht, eine
einmal importierte Config bleibt also gültig.
"""
import base64
import json
import pathlib
import sys

P = 2**255 - 19


def x25519(scalar: bytes, u: int) -> int:
    """Montgomery-Ladder nach RFC 7748 §5."""
    k = int.from_bytes(scalar, "little")
    k &= ~7
    k |= 1 << 254
    k &= (1 << 255) - 1
    x1, x2, z2, x3, z3, swap = u, 1, 0, u, 1, 0
    for t in range(254, -1, -1):
        bit = (k >> t) & 1
        swap ^= bit
        if swap:
            x2, x3, z2, z3 = x3, x2, z3, z2
        swap = bit
        A = (x2 + z2) % P
        AA = A * A % P
        B = (x2 - z2) % P
        BB = B * B % P
        E = (AA - BB) % P
        C = (x3 + z3) % P
        D = (x3 - z3) % P
        DA = D * A % P
        CB = C * B % P
        x3 = (DA + CB) % P
        x3 = x3 * x3 % P
        z3 = (DA - CB) % P
        z3 = z3 * z3 % P * x1 % P
        x2 = AA * BB % P
        z2 = E * (AA + 121665 * E) % P
    if swap:
        x2, z2 = x3, z3
    return x2 * pow(z2, P - 2, P) % P


def public_key(private: bytes) -> str:
    return base64.b64encode(x25519(private, 9).to_bytes(32, "little")).decode()


def self_test() -> None:
    """RFC 7748 §6.1 — ohne diese Probe bleibt ein Vorzeichenfehler unbemerkt."""
    vectors = [
        ("77076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a",
         "8520f0098930a754748b7ddcb43ef75a0dbf3a0d26381af4eba4a98eaa9b4e6a"),
        ("5dab087e624a8a4b79e17f8b83800ee66f3bb1292618b6fd1c2f8b27ff88e0eb",
         "de9edb7d7b7dc1b4d35b61c2ece435373f8343c85b78674dadfc7e146f882b4f"),
    ]
    for priv, pub in vectors:
        got = x25519(bytes.fromhex(priv), 9).to_bytes(32, "little").hex()
        if got != pub:
            sys.exit(f"X25519-Selbsttest fehlgeschlagen: {got} != {pub}")


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(f"Aufruf: {sys.argv[0]} <Mac-IP im WLAN>")
    self_test()
    conf = json.loads((pathlib.Path.home() / ".mitmproxy" / "wireguard.conf").read_text())
    print(f"""[Interface]
PrivateKey = {conf['client_key']}
Address = 10.0.0.1/32
DNS = 10.0.0.53

[Peer]
PublicKey = {public_key(base64.b64decode(conf['server_key']))}
AllowedIPs = 0.0.0.0/0
Endpoint = {sys.argv[1]}:51820""")


if __name__ == "__main__":
    main()
