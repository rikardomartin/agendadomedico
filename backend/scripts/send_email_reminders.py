"""
Disparo automático de lembretes por e-mail — paciente e médico.

Uso:
    python -m backend.scripts.send_email_reminders [--dias 1] [--dias 2]

    --dias   Quantos dias antes da consulta enviar (padrão: lê config do médico no banco).
             Pode ser passado mais de uma vez: --dias 1 --dias 2

Exemplos:
    python -m backend.scripts.send_email_reminders          # usa config do banco
    python -m backend.scripts.send_email_reminders --dias 1
    python -m backend.scripts.send_email_reminders --dias 1 --dias 2

Agendar no cron (Linux/Mac) — todo dia às 08:00:
    0 8 * * * cd /caminho/do/projeto && python -m backend.scripts.send_email_reminders

Variáveis de ambiente necessárias (no .env):
    DATABASE_URL, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL
"""
from __future__ import annotations

import argparse
import asyncio
import os
import uuid
from collections import defaultdict
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    raise SystemExit("Defina DATABASE_URL no .env")

TZ = ZoneInfo(os.environ.get("APP_TIMEZONE", "America/Sao_Paulo"))


def _day_window(dias_antes: int) -> tuple[datetime, datetime]:
    agora = datetime.now(TZ)
    alvo = agora + timedelta(days=dias_antes)
    inicio = datetime(alvo.year, alvo.month, alvo.day, 0, 0, 0, tzinfo=TZ)
    return inicio, inicio + timedelta(days=1)


def _ja_enviado(db, consulta_id, canal: str = "email") -> bool:
    from sqlalchemy import and_, select
    from backend.app.models.reminder import Lembrete
    return db.scalar(
        select(Lembrete).where(and_(
            Lembrete.consulta_id == consulta_id,
            Lembrete.canal == canal,
            Lembrete.status == "enviado",
        ))
    ) is not None


async def _processar_medico(db, medico, consultas_do_dia: list, dias_antes: int) -> bool:
    """Envia resumo do dia para o médico (1 e-mail por médico por dia)."""
    from backend.app.models.reminder import Lembrete
    from backend.app.services.email import send_email
    from backend.app.services.email_templates import lembrete_medico_html

    email_medico = medico.email_contato or medico.email
    if not email_medico:
        print(f"    [MÉDICO] {medico.nome or medico.email} — sem e-mail configurado.")
        return False

    # Verifica se já enviou resumo do dia (usa consulta_id da primeira consulta como chave)
    primeira = consultas_do_dia[0]
    if _ja_enviado(db, primeira.id, canal="email_medico"):
        print(f"    [MÉDICO] Resumo já enviado hoje.")
        return False

    clinic_name = medico.nome_clinica or "Agenda Médica"
    doctor_name = medico.nome

    # Enriquece consultas com nome do paciente
    from backend.app.models.patient import Paciente
    for c in consultas_do_dia:
        p = db.get(Paciente, c.paciente_id)
        c._paciente_nome = p.nome_completo if p else "—"
        c._paciente_tel = p.telefone if p else ""

    foco = consultas_do_dia[0]
    subject, html = lembrete_medico_html(
        doctor_name=doctor_name,
        clinic_name=clinic_name,
        data_consultas=foco.inicio,
        consultas_do_dia=consultas_do_dia,
        paciente_foco_nome=foco._paciente_nome,
        inicio_foco=foco.inicio,
        total_dia=len(consultas_do_dia),
        msg_personalizada=medico.lembrete_msg_medico,
    )

    print(f"    [MÉDICO] → {email_medico} ({len(consultas_do_dia)} consultas)", end=" ", flush=True)

    lembrete = Lembrete(
        id=uuid.uuid4(),
        consulta_id=primeira.id,
        canal="email_medico",
        agendado_para=datetime.now(TZ),
        status="pendente",
        payload={"email": email_medico, "subject": subject, "total": len(consultas_do_dia)},
    )
    db.add(lembrete)
    db.flush()

    try:
        ok = await send_email(to=email_medico, subject=subject, html=html)
        if ok:
            lembrete.status = "enviado"
            lembrete.enviado_em = datetime.now(TZ)
            print("✅ enviado")
            return True
        else:
            lembrete.status = "erro"
            print("⚠️  SMTP não configurado")
            return False
    except Exception as exc:
        lembrete.status = "erro"
        lembrete.payload = {**lembrete.payload, "erro": str(exc)}
        print(f"❌ erro: {exc}")
        return False


async def _processar(dias_antes: int) -> dict:
    from sqlalchemy import and_, select
    from sqlalchemy.orm import Session
    from sqlalchemy import create_engine

    from backend.app.models.appointment import Consulta
    from backend.app.models.patient import Paciente
    from backend.app.models.reminder import Lembrete
    from backend.app.models.user import Usuario
    from backend.app.services.email import send_email
    from backend.app.services.email_templates import lembrete_paciente_html

    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    inicio_janela, fim_janela = _day_window(dias_antes)

    stats = {"pacientes": 0, "medicos": 0, "erros": 0, "skip": 0}

    with Session(engine) as db:
        # Busca todos os médicos com lembrete ativo
        medicos = list(db.scalars(
            select(Usuario).where(
                and_(Usuario.ativo == True, Usuario.lembrete_ativo == True)
            )
        ).all())

        for medico in medicos:
            # Verifica se este médico quer lembretes neste número de dias
            dias_config = medico.lembrete_dias or [1]
            if dias_antes not in dias_config:
                continue

            consultas = list(db.scalars(
                select(Consulta)
                .where(and_(
                    Consulta.usuario_id == medico.id,
                    Consulta.inicio >= inicio_janela,
                    Consulta.inicio < fim_janela,
                    Consulta.status.in_(["agendada", "confirmada"]),
                ))
                .order_by(Consulta.inicio.asc())
            ).all())

            if not consultas:
                continue

            clinic_name = medico.nome_clinica or "Agenda Médica"
            doctor_name = medico.nome

            print(f"\n  👨‍⚕️  {doctor_name or medico.email} — {len(consultas)} consulta(s) em {dias_antes} dia(s):")

            # ── E-mail para cada PACIENTE ──────────────────────────────────
            for c in consultas:
                paciente = db.get(Paciente, c.paciente_id)
                if not paciente:
                    stats["skip"] += 1
                    continue

                email_dest = paciente.email
                if not email_dest:
                    print(f"    [PACIENTE] {paciente.nome_completo} — sem e-mail. Pulando.")
                    stats["skip"] += 1
                    continue

                if _ja_enviado(db, c.id):
                    print(f"    [PACIENTE] {paciente.nome_completo} — já enviado. Pulando.")
                    stats["skip"] += 1
                    continue

                # Histórico de consultas concluídas
                historico = list(db.scalars(
                    select(Consulta)
                    .where(and_(
                        Consulta.paciente_id == paciente.id,
                        Consulta.status == "concluida",
                    ))
                    .order_by(Consulta.inicio.desc())
                    .limit(10)
                ).all())

                subject, html = lembrete_paciente_html(
                    paciente_nome=paciente.nome_completo,
                    inicio=c.inicio,
                    fim=c.fim,
                    dias_antes=dias_antes,
                    clinic_name=clinic_name,
                    doctor_name=doctor_name,
                    consultas_historico=historico,
                    observacoes_consulta=c.observacoes,
                    msg_personalizada=medico.lembrete_msg_paciente,
                )

                hora = c.inicio.astimezone(TZ).strftime("%H:%M")
                print(f"    [PACIENTE] {hora} {paciente.nome_completo} <{email_dest}>", end=" ", flush=True)

                lembrete = Lembrete(
                    id=uuid.uuid4(),
                    consulta_id=c.id,
                    canal="email",
                    agendado_para=datetime.now(TZ),
                    status="pendente",
                    payload={"email": email_dest, "subject": subject},
                )
                db.add(lembrete)
                db.flush()

                try:
                    ok = await send_email(to=email_dest, subject=subject, html=html)
                    if ok:
                        lembrete.status = "enviado"
                        lembrete.enviado_em = datetime.now(TZ)
                        stats["pacientes"] += 1
                        print("✅")
                    else:
                        lembrete.status = "erro"
                        print("⚠️  SMTP não configurado")
                except Exception as exc:
                    lembrete.status = "erro"
                    lembrete.payload = {**lembrete.payload, "erro": str(exc)}
                    stats["erros"] += 1
                    print(f"❌ {exc}")

                db.commit()

            # ── E-mail resumo para o MÉDICO ────────────────────────────────
            ok_medico = await _processar_medico(db, medico, consultas, dias_antes)
            if ok_medico:
                stats["medicos"] += 1

            # ── Push notification para o MÉDICO ────────────────────────────
            try:
                from backend.app.services.push import send_push_to_subscriptions
                data_str = consultas[0].inicio.astimezone(TZ).strftime("%d/%m/%Y")
                n_push = send_push_to_subscriptions(
                    db,
                    usuario_id=medico.id,
                    title=f"📅 Agenda de {data_str}",
                    body=f"{len(consultas)} consulta(s) em {dias_antes} dia(s). Toque para ver.",
                    url="/#/agenda",
                    tag=f"agenda-{data_str}",
                )
                if n_push:
                    print(f"    [PUSH MÉDICO] {n_push} dispositivo(s) notificado(s)")
            except Exception as exc:
                print(f"    [PUSH MÉDICO] erro: {exc}")

            # ── WhatsApp para cada PACIENTE ─────────────────────────────────
            try:
                from backend.app.services.whatsapp import send_whatsapp_lembrete
                from backend.app.models.patient import Paciente as PacienteModel
                wa_ok = 0
                wa_skip = 0
                for c in consultas:
                    pac = db.get(PacienteModel, c.paciente_id)
                    if not pac or not pac.telefone:
                        wa_skip += 1
                        continue
                    # Verifica se já enviou WhatsApp para esta consulta
                    if _ja_enviado(db, c.id, canal="whatsapp"):
                        wa_skip += 1
                        continue
                    hora_c = c.inicio.astimezone(TZ).strftime("%H:%M")
                    data_c = c.inicio.astimezone(TZ).strftime("%d/%m/%Y")
                    sent = await send_whatsapp_lembrete(
                        telefone=pac.telefone,
                        paciente_nome=pac.nome_completo,
                        data_str=data_c,
                        hora_str=hora_c,
                        clinica=clinic_name,
                    )
                    if sent:
                        # Registra lembrete enviado
                        from backend.app.models.reminder import Lembrete
                        db.add(Lembrete(
                            id=uuid.uuid4(),
                            consulta_id=c.id,
                            canal="whatsapp",
                            agendado_para=datetime.now(TZ),
                            status="enviado",
                            enviado_em=datetime.now(TZ),
                            payload={"telefone": pac.telefone},
                        ))
                        wa_ok += 1
                    else:
                        wa_skip += 1
                if wa_ok:
                    print(f"    [WHATSAPP] {wa_ok} enviado(s), {wa_skip} pulado(s)")
                db.commit()
            except Exception as exc:
                print(f"    [WHATSAPP] erro: {exc}")

            db.commit()

    return stats


async def main(dias_list: list[int]) -> None:
    total_p = 0
    total_m = 0
    for dias in sorted(set(dias_list)):
        print(f"\n📅 Lembretes para daqui {dias} dia(s)...")
        stats = await _processar(dias)
        total_p += stats["pacientes"]
        total_m += stats["medicos"]
        print(f"   Pacientes: {stats['pacientes']} enviados, {stats['skip']} pulados, {stats['erros']} erros")
        print(f"   Médicos:   {stats['medicos']} enviados")

    print(f"\n✅ Concluído — {total_p} e-mail(s) para pacientes, {total_m} resumo(s) para médicos.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Envia lembretes de consulta por e-mail.")
    parser.add_argument(
        "--dias", type=int, action="append", default=None, metavar="N",
        help="Dias antes (pode repetir: --dias 1 --dias 2). Padrão: lê config do banco.",
    )
    args = parser.parse_args()
    dias_list = args.dias or [1, 2]  # fallback — o filtro real é feito por médico no banco
    asyncio.run(main(dias_list))
