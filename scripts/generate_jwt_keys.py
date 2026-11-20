#!/usr/bin/env python3
"""
Generate RSA key pair for JWT RS256 signing.
Run once before starting Docker:
    python scripts/generate_jwt_keys.py
Keys are saved to backend/certs/ and mounted read-only into the web container.
"""
import os
import sys

CERTS_DIR = os.path.join(os.path.dirname(__file__), "..", "backend", "certs")


def generate_keys():
    try:
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.primitives.asymmetric import rsa
        from cryptography.hazmat.backends import default_backend
    except ImportError:
        print("❌ Missing 'cryptography' package. Install it:")
        print("   pip install cryptography")
        sys.exit(1)

    os.makedirs(CERTS_DIR, exist_ok=True)
    private_path = os.path.join(CERTS_DIR, "jwt_private_key.pem")
    public_path = os.path.join(CERTS_DIR, "jwt_public_key.pem")

    if os.path.exists(private_path) and os.path.exists(public_path):
        print("✅ JWT keys already exist — skipping generation.")
        print(f"   Private: {private_path}")
        print(f"   Public:  {public_path}")
        return

    print("🔑 Generating RSA 2048-bit key pair for JWT RS256...")
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend(),
    )
    # ✅ PKCS8 format (BEGIN PRIVATE KEY) — matches bundled dev keys in backend/certs/
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    public_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )

    with open(private_path, "wb") as f:
        f.write(private_pem)
    os.chmod(private_path, 0o600)

    with open(public_path, "wb") as f:
        f.write(public_pem)
    os.chmod(public_path, 0o644)

    print(f"✅ Private key → {private_path}")
    print(f"✅ Public key  → {public_path}")
    print("\n⚠️  IMPORTANT: Never commit these keys to version control!")
    print("   They are already listed in .gitignore.")


if __name__ == "__main__":
    generate_keys()
