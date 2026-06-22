from pathlib import Path

from app import settings as settings_module
from app.settings import AppSettings, get_app_settings, load_app_settings


def test_app_settings_use_defaults_when_no_env_is_provided(monkeypatch):
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    app_settings = AppSettings(_env_file=None)

    assert app_settings.cors_origins == ["http://localhost:3000", "https://localhost:3443"]


def test_load_app_settings_parses_json_cors_origins(monkeypatch, tmp_path: Path):
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    env_file = tmp_path / ".env"
    env_file.write_text('CORS_ORIGINS=["https://frontend.example.com","https://admin.example.com"]\n', encoding="utf-8")

    app_settings = load_app_settings(str(env_file))

    assert app_settings.cors_origins == ["https://frontend.example.com", "https://admin.example.com"]


def test_app_settings_parses_comma_separated_cors_origins():
    app_settings = AppSettings(cors_origins="https://app.example.com, https://admin.example.com")

    assert app_settings.cors_origins == ["https://app.example.com", "https://admin.example.com"]


def test_get_app_settings_uses_cached_instance(monkeypatch, tmp_path: Path):
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    env_file = tmp_path / ".env"
    env_file.write_text('CORS_ORIGINS=["https://cached.example.com"]\n', encoding="utf-8")

    monkeypatch.setattr(settings_module, "ENV_FILE", str(env_file))
    get_app_settings.cache_clear()

    first_settings = get_app_settings()
    second_settings = get_app_settings()

    assert first_settings is second_settings
    assert first_settings.cors_origins == ["https://cached.example.com"]
