#!/usr/bin/env python3
"""
CuraBook — JWT RSA Key Generator
==================================
F-12 FIX: Generates a 4096-bit RSA key pair for RS256 JWT signing.

Usage:
    python scripts/generate_jwt_keys.py
    python scripts/generate_jwt_keys.py --output-dir /path/to/dir
    python scripts/generate_jwt_keys.py --key-size 2048   # faster, still secure

Output:
    backend/certs/jwt_private_key.pem  (chmod 600 — KEEP SECRET)
    backend/certs/jwt_public_key.pem   (chmod 644 — safe to share)

Production deployment options:
    # Option A: set as env vars (Docker secrets / Kubernetes / AWS SSM)
    export JWT_PRIVATE_KEY="$(cat certs/jwt_private_key.pem)"
    export JWT_PUBLIC_KEY="$(cat certs/jwt_public_key.pem)"

    # Option B: mount as files (Docker volumes)
    docker run -v ./certs:/app/certs:ro ...

IMPORTANT:
    - Store jwt_private_key.pem securely — it can sign tokens for ANY user.
    - Add backend/certs/*.pem to .gitignore (already done in CuraBook).
    - Rotate keys periodically (yearly recommended) — after rotation,
      existing valid tokens continue to work until their TTL expires.
    - jwt_public_key.pem can be shared with downstream microservices
      so they can verify tokens without sharing the secret.
"""

import argparse
import os
import sys

def main():
    parser = argparse.ArgumentParser(description="Generate JWT RSA key pair for CuraBook")
    parser.add_argument(
        '--output-dir',
        default=os.path.join(os.path.dirname(__file__), '..', 'certs'),
        help="Directory to write PEM files (default: backend/certs/)"
    )
    parser.add_argument(
        '--key-size',
        type=int,
        default=4096,
        choices=[2048, 3072, 4096],
        help="RSA key size in bits (default: 4096)"
    )
    parser.add_argument(
        '--force',
        action='store_true',
        help="Overwrite existing keys without prompting"
    )
    args = parser.parse_args()

    try:
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.primitives.asymmetric import rsa
        from cryptography.hazmat.backends import default_backend
    except ImportError:
        print("ERROR: 'cryptography' package not installed.")
        print("       Run: pip install cryptography")
        sys.exit(1)

    output_dir = os.path.abspath(args.output_dir)
    os.makedirs(output_dir, exist_ok=True)

    priv_path = os.path.join(output_dir, 'jwt_private_key.pem')
    pub_path  = os.path.join(output_dir, 'jwt_public_key.pem')

    # Safety check
    if (os.path.exists(priv_path) or os.path.exists(pub_path)) and not args.force:
        print(f"Keys already exist in {output_dir}/")
        answer = input("Overwrite? This invalidates all existing JWT tokens. [y/N] ").strip().lower()
        if answer != 'y':
            print("Aborted.")
            sys.exit(0)

    print(f"Generating RSA {args.key_size}-bit key pair...")
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=args.key_size,
        backend=default_backend()
    )

    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    public_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )

    with open(priv_path, 'wb') as f:
        f.write(private_pem)
    os.chmod(priv_path, 0o600)

    with open(pub_path, 'wb') as f:
        f.write(public_pem)
    os.chmod(pub_path, 0o644)

    print(f"\n✅  Key pair generated successfully!")
    print(f"    Private key: {priv_path}  (chmod 600)")
    print(f"    Public  key: {pub_path}  (chmod 644)")
    print()
    print("⚠️  IMPORTANT:")
    print("    - NEVER commit jwt_private_key.pem to git")
    print("    - jwt_private_key.pem is in .gitignore (verify this!)")
    print("    - Back up the private key securely before deploying to production")
    print()
    print("Next steps:")
    print("    # For Docker deployments — keys are auto-mounted via docker-compose.yml")
    print("    docker compose up -d")
    print()
    print("    # For manual/bare-metal — set env vars:")
    print(f"    export JWT_PRIVATE_KEY_PATH={priv_path}")
    print(f"    export JWT_PUBLIC_KEY_PATH={pub_path}")


if __name__ == '__main__':
    main()
