import django
from django.conf import settings


def test_django_setup_loads():
    assert django.VERSION >= (5, 0)
    assert settings.configured
    assert "sqlite3" in settings.DATABASES["default"]["ENGINE"]


def test_smoke_arithmetic():
    assert 1 + 1 == 2
