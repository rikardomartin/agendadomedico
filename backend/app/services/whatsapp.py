"""
Serviço de envio de mensagens via WhatsApp Business API (Meta Cloud API).

Documentação: https://developers.facebook.com/docs/whatsapp/cloud-api/messages

Configuração necessária no .env:
    WHATSAPP_TOKEN   — token de acesso da Meta
    WHATSAPP_PHONE_ID — ID do número de telefone (Phone Number ID)

Templates disponíveis:
    - hello_world (en_US) — template de teste da Meta
    - lembrete_consulta (pt_BR) — template personalizado (criar no painel Meta)

Uso:
    from backend.app.services.whatsapp import send_whatsapp_template
    await send_whatsapp_template(
        to="5521986925971",
        template_name="lembrete_consulta",
        params=["Maria", "27/05", "09:00", "Clínica Destri"]
    )
"""
from __future__ import annotations

import logging
from zoneinfo import ZoneInfo

import aiohttp

from backend.app.core.config import get_settings

logger = logging.getLogger(__name__)

GRAPH_URL = "https://graph.facebook.com/v25.0"
TZ = ZoneInfo("America/Sao_Paulo")


def _is_configured() -> bool:
    s = get_settings()
    return bool(s.whatsapp_token and s.whatsapp_phone_id)


def _fmt_phone(telefone: str) -> str:
    """Normaliza número para formato internacional sem + (ex: 5521986925971)."""
    digits = "".join(c for c in telefone if c.isdigit())
    if not digits.startswith("55"):
        digits = "55" + digits
    return digits


async def send_whatsapp_template(
    *,
    to: str,
    template_name: str,
    language_code: str = "pt_BR",
    params: list[str] | None = None,
) -> bool:
    """
    Envia mensagem via template WhatsApp.

    Args:
        to: número do destinatário (com ou sem +55)
        template_name: nome do template aprovado na Meta
        language_code: código do idioma (pt_BR, en_US)
        params: lista de parâmetros do template {{1}}, {{2}}, etc.

    Returns:
        True se enviado com sucesso, False caso contrário.
    """
    if not _is_configured():
        logger.warning("[WhatsApp] Token ou Phone ID não configurado.")
        return False

    s = get_settings()
    phone = _fmt_phone(to)

    # Monta componentes do template
    components = []
    if params:
        components.append({
            "type": "body",
            "parameters": [
                {"type": "text", "text": str(p)} for p in params
            ],
        })

    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": language_code},
            **({"components": components} if components else {}),
        },
    }

    headers = {
        "Authorization": f"Bearer {s.whatsapp_token}",
        "Content-Type": "application/json",
    }

    url = f"{GRAPH_URL}/{s.whatsapp_phone_id}/messages"

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                body = await resp.json()
                if resp.status in (200, 201):
                    msg_id = body.get("messages", [{}])[0].get("id", "")
                    logger.info("[WhatsApp] Enviado para %s | msg_id=%s", phone, msg_id)
                    return True
                else:
                    error = body.get("error", {})
                    logger.error(
                        "[WhatsApp] Erro %s para %s: %s — %s",
                        resp.status, phone,
                        error.get("code"), error.get("message"),
                    )
                    return False
    except Exception as exc:
        logger.exception("[WhatsApp] Exceção ao enviar para %s: %s", phone, exc)
        return False


async def send_whatsapp_lembrete(
    *,
    telefone: str,
    paciente_nome: str,
    data_str: str,
    hora_str: str,
    clinica: str,
) -> bool:
    """
    Envia lembrete de consulta via WhatsApp.

    Usa o template 'lembrete_consulta' com 4 parâmetros:
        {{1}} = primeiro nome do paciente
        {{2}} = data (ex: 27/05/2026)
        {{3}} = horário (ex: 09:00)
        {{4}} = nome da clínica

    IMPORTANTE: O template 'lembrete_consulta' precisa ser criado e aprovado
    no painel Meta for Developers antes de usar.
    Enquanto não aprovado, use template_name='hello_world' para testes.
    """
    primeiro_nome = paciente_nome.split()[0]
    return await send_whatsapp_template(
        to=telefone,
        template_name="lembrete_consulta",
        language_code="pt_BR",
        params=[primeiro_nome, data_str, hora_str, clinica],
    )
