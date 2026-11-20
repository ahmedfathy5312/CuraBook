#!/usr/bin/env python
"""CuraBook — Django management utility."""

import os
import sys
from pathlib import Path


def load_env():
    """Load .env file if it exists (simple implementation, no extra deps)."""
    env_path = Path(__file__).resolve().parent / '.env'
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, _, value = line.partition('=')
                    os.environ.setdefault(key.strip(), value.strip())


def main():
    load_env()
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'curabook.settings.dev')

    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Make sure it's installed and "
            "that you've activated a virtual environment."
        ) from exc

    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
