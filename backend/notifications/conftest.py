"""
CuraBook — notifications app pytest configuration.
API-M08 FIX: each app now has its own conftest for app-specific fixtures.
Shared fixtures (db, client, settings) are inherited from the root conftest.
"""
import pytest


@pytest.fixture
def notifications_app_label():
    """Returns this app's Django label — useful in tests that check app metadata."""
    return 'notifications'
