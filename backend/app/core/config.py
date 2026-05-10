from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_ignore_empty=True,
        extra="ignore",
    )

    app_name: str = Field(default="Agenda Médica", alias="APP_NAME")
    env: str = Field(default="development", alias="ENV")
    app_timezone: str = Field(default="America/Sao_Paulo", alias="APP_TIMEZONE")

    database_url: str = Field(alias="DATABASE_URL")

    jwt_secret_key: str = Field(alias="JWT_SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    access_token_expires_minutes: int = Field(default=60 * 24 * 7, alias="ACCESS_TOKEN_EXPIRES_MINUTES")

    auth_cookie_name: str = Field(default="agendamedica_token", alias="AUTH_COOKIE_NAME")
    auth_cookie_secure: bool = Field(default=False, alias="AUTH_COOKIE_SECURE")
    auth_cookie_samesite: str = Field(default="lax", alias="AUTH_COOKIE_SAMESITE")
    auth_cookie_domain: str | None = Field(default=None, alias="AUTH_COOKIE_DOMAIN")

    cors_origins: list[str] = Field(default_factory=list, alias="CORS_ORIGINS")

    # SMTP / E-mail
    smtp_host: str = Field(default="", alias="SMTP_HOST")
    smtp_port: int = Field(default=587, alias="SMTP_PORT")
    smtp_user: str = Field(default="", alias="SMTP_USER")
    smtp_password: str = Field(default="", alias="SMTP_PASSWORD")
    smtp_from_email: str = Field(default="", alias="SMTP_FROM_EMAIL")
    smtp_from_name: str = Field(default="Agenda Médica", alias="SMTP_FROM_NAME")
    smtp_use_tls: bool = Field(default=True, alias="SMTP_USE_TLS")

    # Web Push / VAPID
    vapid_public_key: str = Field(default="", alias="VAPID_PUBLIC_KEY")
    vapid_private_key: str = Field(default="", alias="VAPID_PRIVATE_KEY")
    vapid_mailto: str = Field(default="mailto:admin@example.com", alias="VAPID_MAILTO")

    # Resend API (alternativa ao SMTP para produção em cloud)
    resend_api_key: str = Field(default="", alias="RESEND_API_KEY")

    # WhatsApp Business API (Meta Cloud API)
    whatsapp_token: str = Field(default="", alias="WHATSAPP_TOKEN")
    whatsapp_phone_id: str = Field(default="", alias="WHATSAPP_PHONE_ID")


@lru_cache
def get_settings() -> Settings:
    return Settings()
