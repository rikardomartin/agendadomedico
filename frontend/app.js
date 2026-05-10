const state = {
  me: null,
  loading: false,
};

const CLINIC_NAME = "Agenda Médica";

// ── Tema claro/escuro ─────────────────────────────────────────────────────────
function getTheme() { return localStorage.getItem("tema") || "dark"; }
function applyTheme(t) {
  document.body.classList.toggle("light", t === "light");
  localStorage.setItem("tema", t);
}
applyTheme(getTheme()); // aplica imediatamente ao carregar

const $ = (sel, el = document) => el.querySelector(sel);

function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") el.className = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (v === null || v === undefined) continue;
    else el.setAttribute(k, v);
  }
  for (const child of Array.isArray(children) ? children : [children]) {
    if (child === null || child === undefined) continue;
    el.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return el;
}

function toast(message) {
  const root = document.body;
  const wrap = h("div", { class: "toast" }, [h("div", { class: "msg" }, [message])]);
  root.append(wrap);
  setTimeout(() => wrap.remove(), 3200);
}

// ─────────────────────────────────────────────────────────────────────────────
// DATE PICKER CUSTOMIZADO
// Uso:
//   const dp = createDatePicker({ value: "2026-04-23", onChange: (v) => console.log(v) })
//   dp.el   → elemento DOM para inserir na página
//   dp.value → getter/setter "YYYY-MM-DD"
//
// DATE-TIME PICKER:
//   const dtp = createDateTimePicker({ value: "2026-04-23T09:00", onChange: (v) => ... })
//   dtp.el / dtp.value → "YYYY-MM-DDTHH:MM"
// ─────────────────────────────────────────────────────────────────────────────

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
               "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DIAS_SEMANA = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

function createDatePicker({ value = "", onChange = null, placeholder = "Selecionar data", minDate = null } = {}) {
  let _date = value ? new Date(value + "T12:00:00") : null;
  // view: "day" | "month" | "year"
  let _view = "day";
  let _navYear  = _date ? _date.getFullYear()  : new Date().getFullYear();
  let _navMonth = _date ? _date.getMonth()     : new Date().getMonth();
  let _open = false;

  const trigger = h("button", { class: "dp-trigger", type: "button" });
  const popup   = h("div",   { class: "dp-popup",   style: "display:none" });
  const wrap    = h("div",   { class: "dp-wrap" }, [trigger, popup]);

  function _fmt(d) {
    if (!d) return "";
    return d.toLocaleDateString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric" });
  }

  function _updateTrigger() {
    trigger.innerHTML = "";
    trigger.append(
      h("span", { class: "dp-trigger-icon" }, ["📅"]),
      h("span", { class: "dp-trigger-text" + (_date ? "" : " dp-placeholder") },
        [_date ? _fmt(_date) : placeholder])
    );
  }

  function _close() {
    _open = false;
    popup.style.display = "none";
    _view = "day";
  }

  function _open_() {
    _open = true;
    _navYear  = _date ? _date.getFullYear()  : new Date().getFullYear();
    _navMonth = _date ? _date.getMonth()     : new Date().getMonth();
    _render();
    popup.style.display = "";
  }

  // Impede que cliques DENTRO do popup fechem o picker
  popup.addEventListener("click", (e) => e.stopPropagation());

  function _render() {
    popup.innerHTML = "";
    if (_view === "day")   _renderDay();
    if (_view === "month") _renderMonth();
    if (_view === "year")  _renderYear();
  }

  function _renderDay() {
    // Cabeçalho
    const header = h("div", { class: "dp-header" }, [
      h("button", { class: "dp-nav", type: "button", onclick: () => { _navMonth--; if (_navMonth < 0) { _navMonth = 11; _navYear--; } _render(); } }, ["‹"]),
      h("div", { class: "dp-header-labels" }, [
        h("button", { class: "dp-header-btn", type: "button", onclick: () => { _view = "month"; _render(); } },
          [MESES[_navMonth]]),
        h("button", { class: "dp-header-btn", type: "button", onclick: () => { _view = "year"; _render(); } },
          [String(_navYear)]),
      ]),
      h("button", { class: "dp-nav", type: "button", onclick: () => { _navMonth++; if (_navMonth > 11) { _navMonth = 0; _navYear++; } _render(); } }, ["›"]),
    ]);

    // Dias da semana
    const weekRow = h("div", { class: "dp-week" },
      DIAS_SEMANA.map(d => h("div", { class: "dp-weekday" }, [d]))
    );

    // Células
    const firstDay = new Date(_navYear, _navMonth, 1).getDay();
    const daysInMonth = new Date(_navYear, _navMonth + 1, 0).getDate();
    const today = new Date();
    const grid = h("div", { class: "dp-grid" });

    // Células vazias antes do dia 1
    for (let i = 0; i < firstDay; i++) {
      grid.append(h("div", { class: "dp-cell dp-empty" }));
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const thisDate = new Date(_navYear, _navMonth, d);
      const isToday = thisDate.toDateString() === today.toDateString();
      const isSelected = _date && thisDate.toDateString() === _date.toDateString();
      const isPast = minDate && thisDate < new Date(minDate + "T00:00:00");

      const cell = h("button", {
        class: "dp-cell" + (isToday ? " dp-today" : "") + (isSelected ? " dp-selected" : "") + (isPast ? " dp-disabled" : ""),
        type: "button",
        onclick: isPast ? null : () => {
          _date = new Date(_navYear, _navMonth, d, 12, 0, 0);
          _updateTrigger();
          _close();
          if (onChange) onChange(_dateStr());
        },
      }, [String(d)]);
      grid.append(cell);
    }

    popup.append(header, weekRow, grid);
  }

  function _renderMonth() {
    const header = h("div", { class: "dp-header" }, [
      h("button", { class: "dp-nav", type: "button", onclick: () => { _navYear--; _render(); } }, ["‹"]),
      h("button", { class: "dp-header-btn", type: "button", onclick: () => { _view = "year"; _render(); } }, [String(_navYear)]),
      h("button", { class: "dp-nav", type: "button", onclick: () => { _navYear++; _render(); } }, ["›"]),
    ]);
    const grid = h("div", { class: "dp-month-grid" });
    MESES.forEach((m, i) => {
      const isSel = _date && _date.getMonth() === i && _date.getFullYear() === _navYear;
      grid.append(h("button", {
        class: "dp-month-cell" + (isSel ? " dp-selected" : ""),
        type: "button",
        onclick: () => { _navMonth = i; _view = "day"; _render(); },
      }, [m.slice(0, 3)]));
    });
    popup.append(header, grid);
  }

  function _renderYear() {
    const base = Math.floor(_navYear / 12) * 12;
    const header = h("div", { class: "dp-header" }, [
      h("button", { class: "dp-nav", type: "button", onclick: () => { _navYear -= 12; _render(); } }, ["‹"]),
      h("span", { class: "dp-header-range" }, [`${base} – ${base + 11}`]),
      h("button", { class: "dp-nav", type: "button", onclick: () => { _navYear += 12; _render(); } }, ["›"]),
    ]);
    const grid = h("div", { class: "dp-year-grid" });
    for (let y = base; y < base + 12; y++) {
      const isSel = _date && _date.getFullYear() === y;
      grid.append(h("button", {
        class: "dp-year-cell" + (isSel ? " dp-selected" : ""),
        type: "button",
        onclick: () => { _navYear = y; _view = "month"; _render(); },
      }, [String(y)]));
    }
    popup.append(header, grid);
  }

  function _dateStr() {
    if (!_date) return "";
    const y = _date.getFullYear();
    const m = String(_date.getMonth() + 1).padStart(2, "0");
    const d = String(_date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    _open ? _close() : _open_();
  });

  // Fecha ao clicar FORA do wrap — usa capture para pegar antes de outros handlers
  document.addEventListener("click", (e) => {
    if (_open && !wrap.contains(e.target)) _close();
  }, true);

  _updateTrigger();

  return {
    el: wrap,
    get value() { return _dateStr(); },
    set value(v) {
      _date = v ? new Date(v + "T12:00:00") : null;
      _navYear  = _date ? _date.getFullYear()  : new Date().getFullYear();
      _navMonth = _date ? _date.getMonth()     : new Date().getMonth();
      _updateTrigger();
    },
  };
}

// Date-Time picker: date picker + seletor de hora HH:MM
function createDateTimePicker({ value = "", onChange = null, label = "" } = {}) {
  // Separa data e hora
  let _dtStr = value || "";
  const [datePart, timePart] = _dtStr ? _dtStr.split("T") : ["", ""];

  const dp = createDatePicker({
    value: datePart,
    onChange: (d) => {
      const t = timeInput.value || "08:00";
      _dtStr = `${d}T${t}`;
      if (onChange) onChange(_dtStr);
    },
  });

  const timeInput = h("input", {
    class: "input dtp-time",
    type: "time",
    value: timePart || "08:00",
  });
  timeInput.addEventListener("change", () => {
    const d = dp.value;
    if (d) {
      _dtStr = `${d}T${timeInput.value}`;
      if (onChange) onChange(_dtStr);
    }
  });

  const wrap = h("div", { class: "dtp-wrap" }, [dp.el, timeInput]);

  return {
    el: wrap,
    get value() {
      const d = dp.value;
      return d ? `${d}T${timeInput.value || "08:00"}` : "";
    },
    set value(v) {
      if (!v) return;
      const [d, t] = v.split("T");
      dp.value = d;
      timeInput.value = t ? t.slice(0, 5) : "08:00";
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PICKER DE AGENDAMENTO SIMPLIFICADO
// Uma data + dois horários (início e fim) lado a lado.
// Retorna: { el, getInicio(), getFim() } → strings "YYYY-MM-DDTHH:MM"
// Validação: fim < início → fim ajustado para início + 30min automaticamente.
// ─────────────────────────────────────────────────────────────────────────────
function createAppointmentPicker({ inicio = "", fim = "", allowPast = false } = {}) {
  const [datePartI, timePartI] = inicio ? inicio.split("T") : ["", ""];
  const [, timePartF]          = fim     ? fim.split("T")     : ["", ""];

  const hoje = formatDate(new Date());
  const datePicker = createDatePicker({
    value: datePartI,
    minDate: allowPast ? null : hoje,
  });

  const timeInicio = h("input", {
    class: "input appt-time",
    type: "time",
    value: timePartI || "09:00",
    "aria-label": "Horário de início",
  });

  const timeFim = h("input", {
    class: "input appt-time",
    type: "time",
    value: timePartF || "09:30",
    "aria-label": "Horário de fim",
  });

  // Validação: fim não pode ser anterior ao início
  function _validate() {
    const [hI, mI] = timeInicio.value.split(":").map(Number);
    const [hF, mF] = timeFim.value.split(":").map(Number);
    const totalI = hI * 60 + mI;
    const totalF = hF * 60 + mF;
    if (totalF <= totalI) {
      const novoFim = totalI + 30;
      const hh = String(Math.floor(novoFim / 60) % 24).padStart(2, "0");
      const mm = String(novoFim % 60).padStart(2, "0");
      timeFim.value = `${hh}:${mm}`;
      timeFim.classList.add("appt-time-adjusted");
      setTimeout(() => timeFim.classList.remove("appt-time-adjusted"), 1200);
    }
  }

  // Validação: horário de início não pode ser no passado (só quando data = hoje)
  function _validatePast() {
    if (allowPast) return;
    const dataSel = datePicker.value || datePartI;
    if (dataSel !== formatDate(new Date())) return; // só valida se for hoje
    const agora = new Date();
    const agoraMin = agora.getHours() * 60 + agora.getMinutes();
    const [hI, mI] = timeInicio.value.split(":").map(Number);
    if (hI * 60 + mI <= agoraMin) {
      // Arredonda para próximos 30 min
      const proximo = Math.ceil((agoraMin + 1) / 30) * 30;
      const hh = String(Math.floor(proximo / 60) % 24).padStart(2, "0");
      const mm = String(proximo % 60).padStart(2, "0");
      timeInicio.value = `${hh}:${mm}`;
      timeInicio.classList.add("appt-time-adjusted");
      setTimeout(() => timeInicio.classList.remove("appt-time-adjusted"), 1200);
    }
    _validate();
  }

  timeInicio.addEventListener("change", () => { _validatePast(); _validate(); });
  timeFim.addEventListener("change", _validate);
  // Revalida quando a data muda (ex: usuário volta para hoje)
  datePicker.el.addEventListener("click", () => setTimeout(_validatePast, 300));

  const timesRow = h("div", { class: "appt-times-row" }, [
    h("div", { class: "appt-time-group" }, [
      h("label", { class: "label modal-label" }, ["Início"]),
      timeInicio,
    ]),
    h("div", { class: "appt-time-sep" }, ["→"]),
    h("div", { class: "appt-time-group" }, [
      h("label", { class: "label modal-label" }, ["Fim"]),
      timeFim,
    ]),
  ]);

  const wrap = h("div", { class: "appt-picker-wrap" }, [
    h("div", { class: "modal-field" }, [
      h("label", { class: "label modal-label" }, ["Data"]),
      datePicker.el,
    ]),
    h("div", { class: "modal-field appt-times-field" }, [timesRow]),
  ]);

  function _dateStr() {
    return datePicker.value || datePartI || "";
  }

  return {
    el: wrap,
    getInicio() { return _dateStr() ? `${_dateStr()}T${timeInicio.value}` : ""; },
    getFim()    { return _dateStr() ? `${_dateStr()}T${timeFim.value}`    : ""; },
  };
}


async function api(path, opts = {}) {
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    credentials: "include",
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const detail = data?.detail || "Erro inesperado";
    if (res.status === 401) {
      state.me = null;
      location.hash = "#/login";
    }
    throw new Error(detail);
  }
  return data;
}

function formatDate(d) {
  const x = new Date(d);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Retorna true se a data da consulta é hoje ou no passado
function isTodayOrPast(isoDate) {
  const hoje = formatDate(new Date());
  const dia  = formatDate(new Date(isoDate));
  return dia <= hoje;
}

function formatTime(dt) {
  const x = new Date(dt);
  const hh = String(x.getHours()).padStart(2, "0");
  const mm = String(x.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function statusBadge(status) {
  const map = {
    agendada:  "Agendada",
    confirmada:"Confirmada",
    concluida: "Concluída",
    cancelada: "Cancelada",
    faltou:    "Faltou",
  };
  return h("span", { class: `badge ${status}` }, [map[status] || status]);
}

// Menu rápido de status — abre inline abaixo do badge
// Transições válidas por status
const STATUS_TRANSITIONS = {
  agendada:   ["confirmada", "concluida", "faltou", "cancelada"],
  confirmada: ["agendada",   "concluida", "faltou", "cancelada"],
  concluida:  ["agendada"],
  cancelada:  ["agendada"],
  faltou:     ["agendada",   "cancelada"],
};

const STATUS_MENU_MAP = {
  confirmada: { icon: "✅", label: "Confirmar",            primary: true  },
  agendada:   { icon: "📅", label: "Voltar para Agendada", primary: false },
  concluida:  { icon: "✔️",  label: "Atendimento realizado",primary: true  },
  faltou:     { icon: "🚫", label: "Faltou",               primary: false },
  cancelada:  { icon: "❌", label: "Cancelar",             primary: false },
};

// Toast com ícone e cor por tipo
function toastStyled(message, type = "info") {
  const colors = {
    success: "rgba(67,209,127,.9)",
    danger:  "rgba(255,107,107,.9)",
    warn:    "rgba(255,204,102,.9)",
    info:    "rgba(110,168,255,.9)",
  };
  const root = document.body;
  const wrap = h("div", { class: `toast toast-${type}` }, [
    h("div", { class: "msg", style: `border-left-color:${colors[type] || colors.info}` }, [message]),
  ]);
  root.append(wrap);
  setTimeout(() => wrap.remove(), 3200);
}

// Animação de pulse no card ao mudar status
function pulseCard(cardEl) {
  cardEl.classList.add("card-pulse");
  setTimeout(() => cardEl.classList.remove("card-pulse"), 500);
}

function openStatusMenu(consulta, badgeEl, onChanged) {
  document.querySelectorAll(".status-quick-menu").forEach(m => m.remove());

  const menu = h("div", { class: "status-quick-menu", role: "menu" });
  const transitions = STATUS_TRANSITIONS[consulta.status] || [];

  transitions.forEach((value) => {
    const { icon, label, primary } = STATUS_MENU_MAP[value] || {};
    if (!icon) return;
    const item = h("button", {
      class: `status-menu-item status-menu-${value}${primary ? " status-menu-primary" : ""}`,
      type: "button",
      role: "menuitem",
      "aria-label": label,
      onclick: async () => {
        menu.remove();
        if (value === "cancelada") {
          await _doCancelFlow(consulta, onChanged);
        } else if (value === "concluida") {
          await openConcluirModal(consulta, onChanged);
        } else if (value === "faltou") {
          await openFaltouModal(consulta, onChanged);
        } else {
          await _quickStatus(consulta, value, onChanged);
        }
      },
    }, [`${icon} ${label}`]);
    menu.append(item);
  });

  if (!transitions.length) {
    menu.append(h("div", { class: "status-menu-empty" }, ["Nenhuma ação disponível"]));
  }

  setTimeout(() => {
    document.addEventListener("click", function _close(e) {
      if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener("click", _close); }
    });
  }, 10);

  badgeEl.parentNode.style.position = "relative";
  badgeEl.parentNode.append(menu);
  setTimeout(() => {
    const rect = menu.getBoundingClientRect();
    if (window.innerHeight - rect.bottom < 20) menu.classList.add("open-above");
  }, 10);
}

// Modal de conclusão com observações
async function openConcluirModal(consulta, onChanged) {
  const overlay = h("div", { class: "modal" });
  const obs = h("textarea", {
    class: "input",
    rows: "3",
    placeholder: "Observações do atendimento (opcional)...",
  }, [consulta.observacoes || ""]);

  const btnConfirmar = h("button", {
    class: "btn primary", type: "button",
    onclick: async () => {
      btnConfirmar.disabled = true;
      btnConfirmar.textContent = "Salvando...";
      try {
        await api(`/appointments/${consulta.id}`, {
          method: "PUT",
          body: JSON.stringify({
            inicio: consulta.inicio,
            fim: consulta.fim,
            status: "concluida",
            observacoes: obs.value.trim() || null,
          }),
        });
        consulta.status = "concluida";
        consulta.observacoes = obs.value.trim() || consulta.observacoes;
        overlay.remove();
        onChanged();
        toastStyled("✔️ Atendimento concluído!", "success");
      } catch (err) {
        toast(err.message);
        btnConfirmar.disabled = false;
        btnConfirmar.textContent = "Confirmar Conclusão";
      }
    },
  }, ["Confirmar Conclusão"]);

  const panel = h("div", { class: "panel" }, [
    h("div", { class: "modal-header" }, [
      h("h2", { class: "modal-title" }, ["✔️ Concluir atendimento"]),
      h("button", { class: "btn modal-close-btn", type: "button", onclick: () => overlay.remove() }, ["✕"]),
    ]),
    h("div", { class: "modal-patient-info" }, [
      consulta.paciente_nome
        ? `${consulta.paciente_nome} • ${formatTime(consulta.inicio)}`
        : formatTime(consulta.inicio),
    ]),
    h("div", { class: "modal-field" }, [
      h("label", { class: "label modal-label" }, ["Observações do atendimento"]),
      obs,
    ]),
    h("div", { class: "modal-actions" }, [
      h("button", { class: "btn", type: "button", onclick: () => overlay.remove() }, ["Cancelar"]),
      btnConfirmar,
    ]),
  ]);
  overlay.append(panel);
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
  document.body.append(overlay);
  setTimeout(() => obs.focus(), 80);
}

// Modal de faltou com motivo opcional
async function openFaltouModal(consulta, onChanged) {
  const MOTIVOS_FALTA = ["Não avisou", "Avisou com antecedência", "Problema de saúde", "Transporte", "Outro"];
  const overlay = h("div", { class: "modal" });

  const motivoInput = h("textarea", {
    class: "input",
    rows: "2",
    placeholder: "Descreva o motivo...",
    style: "display:none; margin-top:8px",
  });

  const chipWrap = h("div", { class: "cancel-chips" },
    MOTIVOS_FALTA.map(m => {
      const chip = h("button", {
        class: "cancel-chip",
        type: "button",
        onclick: () => {
          chipWrap.querySelectorAll(".cancel-chip").forEach(c => c.classList.remove("selected"));
          chip.classList.add("selected");
          motivoInput.value = m === "Outro" ? "" : m;
          motivoInput.style.display = m === "Outro" ? "" : "none";
          if (m === "Outro") motivoInput.focus();
        },
      }, [m]);
      return chip;
    })
  );

  const btnConfirmar = h("button", {
    class: "btn warn-btn", type: "button",
    onclick: async () => {
      btnConfirmar.disabled = true;
      btnConfirmar.textContent = "Salvando...";
      const motivo = motivoInput.style.display !== "none"
        ? motivoInput.value.trim()
        : (chipWrap.querySelector(".cancel-chip.selected")?.textContent || null);
      try {
        await api(`/appointments/${consulta.id}`, {
          method: "PUT",
          body: JSON.stringify({
            inicio: consulta.inicio,
            fim: consulta.fim,
            status: "faltou",
            observacoes: motivo ? `Faltou: ${motivo}` : (consulta.observacoes || null),
          }),
        });
        consulta.status = "faltou";
        if (motivo) consulta.observacoes = `Faltou: ${motivo}`;
        overlay.remove();
        onChanged();
        toastStyled("🚫 Registrado como faltou", "warn");
      } catch (err) {
        toast(err.message);
        btnConfirmar.disabled = false;
        btnConfirmar.textContent = "Confirmar Falta";
      }
    },
  }, ["Confirmar Falta"]);

  const panel = h("div", { class: "panel" }, [
    h("div", { class: "modal-header" }, [
      h("h2", { class: "modal-title" }, ["🚫 Paciente faltou?"]),
      h("button", { class: "btn modal-close-btn", type: "button", onclick: () => overlay.remove() }, ["✕"]),
    ]),
    h("div", { class: "modal-patient-info" }, [
      consulta.paciente_nome
        ? `${consulta.paciente_nome} • ${formatTime(consulta.inicio)}`
        : formatTime(consulta.inicio),
    ]),
    h("p", { class: "muted", style: "margin:0 0 12px; font-size:14px" }, ["Motivo da falta (opcional):"]),
    chipWrap,
    motivoInput,
    h("div", { class: "modal-actions", style: "margin-top:16px" }, [
      h("button", { class: "btn", type: "button", onclick: () => overlay.remove() }, ["Cancelar"]),
      btnConfirmar,
    ]),
  ]);
  overlay.append(panel);
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
  document.body.append(overlay);
}

async function _quickStatus(consulta, novoStatus, onChanged) {
  try {
    await api(`/appointments/${consulta.id}`, {
      method: "PUT",
      body: JSON.stringify({
        inicio: consulta.inicio,
        fim: consulta.fim,
        status: novoStatus,
        observacoes: consulta.observacoes || null,
      }),
    });
    consulta.status = novoStatus;
    onChanged();
  } catch (err) {
    toast(err.message);
  }
}

async function _doCancelFlow(consulta, onChanged) {
  // Passo 1: confirmação
  const overlay = h("div", { class: "modal" });
  const panel = h("div", { class: "panel cancel-confirm-panel" }, [
    h("div", { class: "cancel-icon" }, ["❌"]),
    h("div", { class: "cancel-title" }, ["Cancelar consulta?"]),
    h("div", { class: "cancel-sub" }, [
      consulta.paciente_nome
        ? `${consulta.paciente_nome} • ${modoRange ? formatDate(consulta.inicio) + " " : ""}${formatTime(consulta.inicio)}`
        : formatTime(consulta.inicio),
    ]),
    h("div", { class: "modal-actions" }, [
      h("button", { class: "btn", type: "button", onclick: () => overlay.remove() }, ["Voltar"]),
      h("button", {
        class: "btn danger", type: "button",
        onclick: async () => {
          overlay.remove();
          // Passo 2: motivo opcional
          await _cancelMotivoFlow(consulta, onChanged);
        },
      }, ["Sim, cancelar"]),
    ]),
  ]);
  overlay.append(panel);
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
  document.body.append(overlay);
}

async function _cancelMotivoFlow(consulta, onChanged) {
  const MOTIVOS = ["Paciente desistiu", "Sem resposta", "Remarcado", "Problema pessoal", "Outro"];

  const overlay = h("div", { class: "modal" });
  const motivoInput = h("textarea", {
    class: "input",
    rows: "2",
    placeholder: "Descreva o motivo...",
    style: "display:none; margin-top:8px",
  });

  const chipWrap = h("div", { class: "cancel-chips" },
    MOTIVOS.map(m => {
      const chip = h("button", {
        class: "cancel-chip",
        type: "button",
        onclick: () => {
          document.querySelectorAll(".cancel-chip").forEach(c => c.classList.remove("selected"));
          chip.classList.add("selected");
          motivoInput.value = m === "Outro" ? "" : m;
          motivoInput.style.display = m === "Outro" ? "" : "none";
          if (m === "Outro") motivoInput.focus();
        },
      }, [m]);
      return chip;
    })
  );

  const btnNao = h("button", {
    class: "btn", type: "button",
    onclick: async () => {
      overlay.remove();
      await _executarCancelamento(consulta, null, onChanged);
    },
  }, ["Não, só cancelar"]);

  const btnSim = h("button", {
    class: "btn danger", type: "button",
    onclick: async () => {
      const motivo = motivoInput.style.display !== "none"
        ? motivoInput.value.trim()
        : (document.querySelector(".cancel-chip.selected")?.textContent || null);
      overlay.remove();
      await _executarCancelamento(consulta, motivo || null, onChanged);
    },
  }, ["Confirmar"]);

  const panel = h("div", { class: "panel" }, [
    h("div", { class: "modal-header" }, [
      h("h2", { class: "modal-title" }, ["Motivo do cancelamento"]),
      h("button", { class: "btn modal-close-btn", type: "button", onclick: () => overlay.remove() }, ["✕"]),
    ]),
    h("p", { class: "muted", style: "margin:0 0 12px; font-size:14px" }, ["Deseja informar o motivo? (opcional)"]),
    chipWrap,
    motivoInput,
    h("div", { class: "modal-actions", style: "margin-top:16px" }, [btnNao, btnSim]),
  ]);
  overlay.append(panel);
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
  document.body.append(overlay);
}

async function _executarCancelamento(consulta, motivo, onChanged) {
  try {
    await api(`/appointments/${consulta.id}/cancel`, { method: "POST", body: JSON.stringify({ motivo: motivo }) });
    consulta.status = "cancelada";
    if (motivo) consulta.observacoes = `Cancelado: ${motivo}`;
    onChanged();
    toast("Consulta cancelada.");
  } catch (err) {
    toast(err.message);
  }
}

function topbar(active) {
  if (!state.me) return null;

  const u = state.me.usuario;
  const iniciais = (u.nome || u.email || "?")
    .split(" ").filter(Boolean).slice(0, 2)
    .map(w => w[0].toUpperCase()).join("");
  const avatarEl = u.avatar_url
    ? h("img", { src: u.avatar_url, class: "avatar-img", alt: "Avatar" })
    : h("div", { class: "avatar-iniciais" }, [iniciais]);

  // SVGs inline — sem dependência externa
  const svgSettings = `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
  const svgLogout = `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`;
  const svgChevron = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>`;

  // Dropdown de perfil
  const dropMenu = h("div", { class: "topbar-dropdown", role: "menu", "aria-label": "Menu de perfil" });
  dropMenu.style.display = "none";

  // Item: Meu Perfil
  const itemPerfil = h("a", {
    class: `dropdown-item${active === "perfil" ? " active" : ""}`,
    href: "#/perfil",
    role: "menuitem",
    onclick: () => { dropMenu.style.display = "none"; },
  });
  itemPerfil.innerHTML = `${svgSettings} <span>Meu Perfil</span>`;

  // Item: Sair
  const itemSair = h("button", {
    class: "dropdown-item danger-item",
    type: "button",
    role: "menuitem",
    "aria-label": "Sair da conta",
    onclick: async () => {
      dropMenu.style.display = "none";
      try { await api("/auth/logout", { method: "POST", body: "{}" }); } catch {}
      state.me = null;
      location.hash = "#/login";
    },
  });
  itemSair.innerHTML = `${svgLogout} <span>Sair</span>`;

  dropMenu.append(itemPerfil, itemSair);

  // Botão trigger — usa o avatar do usuário
  const triggerAvatar = u.avatar_url
    ? h("img", { src: u.avatar_url, class: "avatar-img topbar-avatar-trigger", alt: "Avatar" })
    : h("div", { class: "avatar-iniciais topbar-avatar-trigger" }, [iniciais]);

  const chevronEl = h("span", { class: "topbar-chevron" });
  chevronEl.innerHTML = svgChevron;

  let _open = false;
  const trigger = h("button", {
    class: "btn topbar-profile-btn" + (_open ? " open" : ""),
    type: "button",
    "aria-haspopup": "true",
    "aria-expanded": "false",
    "aria-label": "Abrir menu de perfil",
    onclick: (e) => {
      e.stopPropagation();
      _open = !_open;
      dropMenu.style.display = _open ? "" : "none";
      trigger.setAttribute("aria-expanded", String(_open));
      trigger.classList.toggle("open", _open);
    },
  }, [triggerAvatar, chevronEl]);

  // Fecha ao clicar fora
  document.addEventListener("click", () => {
    if (_open) {
      _open = false;
      dropMenu.style.display = "none";
      trigger.setAttribute("aria-expanded", "false");
      trigger.classList.remove("open");
    }
  });

  const profileWrap = h("div", { class: "dropdown-wrap topbar-profile-wrap" }, [trigger, dropMenu]);

  return h("div", { class: "topbar" }, [
    h("div", { class: "row container" }, [
      h("div", { class: "brand" }, [
        avatarEl,
        h("div", {}, [
          h("h1", {}, [u.nome_clinica || "Agenda Médica"]),
          h("small", {}, [u.nome ? `Dr(a). ${u.nome}` : u.email]),
        ]),
      ]),
      profileWrap,
    ]),
  ]);
}

function renderFAB(active) {
  // Remove FAB e bottom nav anteriores
  document.getElementById("fab-dashboard")?.remove();
  document.getElementById("bottom-nav")?.remove();
  if (!state.me) return;

  // Bottom Navigation Bar
  const NAV_ITEMS = [
    { key: "dashboard", icon: "📊", label: "Dashboard", href: "#/dashboard" },
    { key: "agenda",    icon: "📅", label: "Agenda",    href: "#/agenda" },
    { key: "pacientes", icon: "👥", label: "Pacientes", href: "#/pacientes" },
    { key: "perfil",    icon: "⚙️",  label: "Perfil",   href: "#/perfil" },
  ];

  // Página de detalhe do paciente: substitui um item por "← Voltar"
  const isDetalhe = active === "paciente";
  const items = isDetalhe
    ? [
        { key: "back",      icon: "←",  label: "Voltar",    href: "#/pacientes" },
        { key: "agenda",    icon: "📅", label: "Agenda",    href: "#/agenda" },
        { key: "pacientes", icon: "👥", label: "Pacientes", href: "#/pacientes" },
        { key: "perfil",    icon: "⚙️",  label: "Perfil",   href: "#/perfil" },
      ]
    : NAV_ITEMS;

  const nav = h("nav", { id: "bottom-nav", class: "bottom-nav", "aria-label": "Navegação principal" },
    items.map(({ key, icon, label, href }) =>
      h("a", {
        class: "bottom-nav-item" + (active === key ? " active" : "") + (key === "back" ? " bottom-nav-back" : ""),
        href,
        "aria-label": label,
        "aria-current": active === key ? "page" : null,
      }, [
        h("span", { class: "bottom-nav-icon", "aria-hidden": "true" }, [icon]),
        h("span", { class: "bottom-nav-label" }, [label]),
      ])
    )
  );
  document.body.append(nav);
}

function pageShell(active, content) {
  const app = $("#app");
  app.innerHTML = "";
  const tb = topbar(active);
  if (tb) app.append(tb);
  app.append(h("div", { class: "container page-content" }, content));
  renderFAB(active);
}

function showWelcomeScreen(me) {
  const u = me.usuario;
  const app = document.getElementById("app");
  app.innerHTML = "";

  const nome = u.nome ? `Dr(a). ${u.nome.split(" ")[0]}` : "Bem-vindo(a)";
  const clinica = u.nome_clinica || "Agenda Médica";
  const iniciais = (u.nome || u.email || "?")
    .split(" ").filter(Boolean).slice(0, 2)
    .map(w => w[0].toUpperCase()).join("");

  const avatarEl = u.avatar_url
    ? h("img", { src: u.avatar_url, class: "welcome-avatar", alt: "Avatar" })
    : h("div", { class: "welcome-avatar-iniciais" }, [iniciais]);

  const screen = h("div", { class: "welcome-screen" }, [
    h("div", { class: "welcome-bg" }),
    h("div", { class: "welcome-content" }, [
      h("div", { class: "welcome-avatar-wrap" }, [avatarEl]),
      h("div", { class: "welcome-text" }, [
        h("div", { class: "welcome-greeting" }, ["Seja bem-vindo(a)"]),
        h("div", { class: "welcome-nome" }, [nome]),
        h("div", { class: "welcome-clinica" }, [clinica]),
      ]),
      h("div", { class: "welcome-dots" }, [
        h("span", {}),
        h("span", {}),
        h("span", {}),
      ]),
    ]),
  ]);

  app.append(screen);

  // Após 2.8s, faz fade out e entra no dashboard
  setTimeout(() => {
    screen.classList.add("welcome-out");
    setTimeout(() => {
      state.me = me;
      location.hash = "#/dashboard";
    }, 600);
  }, 2800);
}

function loginPage() {
  const savedEmail = localStorage.getItem("saved_email") || "";
  let modoCadastro = false;

  const app = document.getElementById("app");
  app.innerHTML = "";

  function render() {
    app.innerHTML = "";

    const email = h("input", {
      class: "input", type: "email",
      placeholder: "email@exemplo.com",
      autocomplete: "email",
      value: savedEmail,
    });
    const senha = h("input", {
      class: "input login-senha-input", type: "password",
      placeholder: "••••••••",
      autocomplete: modoCadastro ? "new-password" : "current-password",
    });
    const btnEye = h("button", { class: "btn-eye", type: "button", tabindex: "-1" }, ["👁"]);
    let senhaVisivel = false;
    btnEye.onclick = () => {
      senhaVisivel = !senhaVisivel;
      senha.type = senhaVisivel ? "text" : "password";
      btnEye.textContent = senhaVisivel ? "🙈" : "👁";
    };

    // Campos extras do cadastro
    const nomeField = modoCadastro ? h("div", { class: "login-field" }, [
      h("label", { class: "label" }, ["Nome completo"]),
      h("input", { class: "input", type: "text", placeholder: "Dr(a). Nome Sobrenome", id: "cad-nome" }),
    ]) : null;

    const senhaConfField = modoCadastro ? h("div", { class: "login-field" }, [
      h("label", { class: "label" }, ["Confirmar senha"]),
      h("input", { class: "input", type: "password", placeholder: "••••••••", id: "cad-senha2" }),
    ]) : null;

    const chkLembrar = h("input", { type: "checkbox", class: "lembrete-chk" });
    if (savedEmail) chkLembrar.checked = true;

    const btn = h("button", { class: "btn primary login-btn", type: "submit" },
      [modoCadastro ? "Criar conta" : "Entrar"]);

    // Biometria (só no login)
    const btnBio = h("button", {
      class: "btn login-bio-btn", type: "button", style: "display:none",
    }, ["🔐 Biometria / Face ID"]);

    if (!modoCadastro) {
      (async () => {
        if (!window.PublicKeyCredential) return;
        const credId = localStorage.getItem("bio_cred_id");
        if (!credId) return;
        const ok = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (ok) btnBio.style.display = "";
      })();

      btnBio.onclick = async () => {
        const savedMail = localStorage.getItem("saved_email");
        const savedPwd  = localStorage.getItem("bio_pwd");
        if (!savedMail || !savedPwd) { toast("Faça login normal uma vez para ativar a biometria."); return; }
        try {
          const cred = await navigator.credentials.get({
            publicKey: {
              challenge: crypto.getRandomValues(new Uint8Array(32)),
              rpId: location.hostname,
              allowCredentials: [{ id: Uint8Array.from(atob(localStorage.getItem("bio_cred_id")), c => c.charCodeAt(0)), type: "public-key" }],
              userVerification: "required", timeout: 60000,
            },
          });
          if (cred) { email.value = savedMail; senha.value = atob(savedPwd); btn.click(); }
        } catch (err) { if (err.name !== "NotAllowedError") toast("Biometria falhou: " + err.message); }
      };
    }

    // Esqueci senha (só no login)
    const linkEsqueci = !modoCadastro ? h("button", { class: "btn-link", type: "button" }, ["Esqueci minha senha"]) : null;
    if (linkEsqueci) {
      linkEsqueci.onclick = async () => {
        const mail = email.value.trim();
        if (!mail) { toast("Digite seu e-mail primeiro."); email.focus(); return; }
        linkEsqueci.textContent = "Enviando...";
        linkEsqueci.disabled = true;
        try {
          await api("/auth/esqueci-senha", { method: "POST", body: JSON.stringify({ email: mail }) });
          toast("✅ Se o e-mail existir, você receberá uma senha temporária.");
        } catch { toast("Erro ao enviar. Tente novamente."); }
        finally { linkEsqueci.textContent = "Esqueci minha senha"; linkEsqueci.disabled = false; }
      };
    }

    // Toggle login ↔ cadastro
    const linkToggle = h("div", { class: "login-toggle-row" }, [
      h("span", { class: "muted" }, [modoCadastro ? "Já tem conta? " : "Não tem conta? "]),
      h("button", {
        class: "btn-link", type: "button",
        onclick: () => { modoCadastro = !modoCadastro; render(); },
      }, [modoCadastro ? "Fazer login" : "Criar conta grátis"]),
    ]);

    const form = h("form", {
      class: "login-form",
      onsubmit: async (e) => {
        e.preventDefault();
        btn.disabled = true;
        btn.textContent = modoCadastro ? "Criando..." : "Entrando...";

        try {
          if (modoCadastro) {
            // Cadastro
            const nomeVal  = document.getElementById("cad-nome")?.value.trim() || "";
            const senha2   = document.getElementById("cad-senha2")?.value || "";
            if (senha.value !== senha2) { toast("As senhas não coincidem."); return; }
            const me = await api("/auth/cadastro", {
              method: "POST",
              body: JSON.stringify({ nome: nomeVal, email: email.value, senha: senha.value }),
            });
            localStorage.setItem("saved_email", email.value);
            showWelcomeScreen(me);
          } else {
            // Login
            const me = await api("/auth/login", {
              method: "POST",
              body: JSON.stringify({ email: email.value, senha: senha.value }),
            });
            if (chkLembrar.checked) localStorage.setItem("saved_email", email.value);
            else localStorage.removeItem("saved_email");

            // Registra biometria se disponível
            if (window.PublicKeyCredential && !localStorage.getItem("bio_cred_id")) {
              try {
                const avail = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
                if (avail) {
                  const cred = await navigator.credentials.create({
                    publicKey: {
                      challenge: crypto.getRandomValues(new Uint8Array(32)),
                      rp: { name: "Agenda Médica", id: location.hostname },
                      user: { id: new TextEncoder().encode(email.value), name: email.value, displayName: email.value },
                      pubKeyCredParams: [{ type: "public-key", alg: -7 }],
                      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
                      timeout: 60000,
                    },
                  });
                  if (cred) {
                    localStorage.setItem("bio_cred_id", btoa(String.fromCharCode(...new Uint8Array(cred.rawId))));
                    localStorage.setItem("bio_pwd", btoa(senha.value));
                    toast("🔐 Biometria ativada!");
                  }
                }
              } catch { /* opcional */ }
            } else if (localStorage.getItem("bio_cred_id")) {
              localStorage.setItem("bio_pwd", btoa(senha.value));
            }

            showWelcomeScreen(me);
          }
        } catch (err) {
          toast(err.message);
        } finally {
          btn.disabled = false;
          btn.textContent = modoCadastro ? "Criar conta" : "Entrar";
        }
      },
    }, [
      h("div", { class: "login-logo-wrap" }, [
        h("img", { src: "/assets/logo.png", class: "login-logo", alt: "Logo" }),
      ]),
      h("div", { class: "login-title" }, ["Agenda Médica"]),
      h("div", { class: "login-sub" }, [modoCadastro ? "Crie sua conta gratuitamente" : "Acesso seguro ao seu consultório"]),
      h("div", { class: "login-fields" }, [
        nomeField,
        h("div", { class: "login-field" }, [h("label", { class: "label" }, ["E-mail"]), email]),
        h("div", { class: "login-field" }, [
          h("label", { class: "label" }, ["Senha"]),
          h("div", { class: "login-senha-wrap" }, [senha, btnEye]),
        ]),
        senhaConfField,
        !modoCadastro ? h("div", { class: "login-extras" }, [
          h("label", { class: "login-lembrar" }, [chkLembrar, h("span", {}, ["Lembrar e-mail"])]),
          linkEsqueci,
        ]) : null,
      ]),
      btn,
      !modoCadastro ? btnBio : null,
    ]);

    const wrap = h("div", { class: "login-page" }, [
      h("div", { class: "login-bg" }),
      h("div", { class: "login-card" }, [form, linkToggle]),
      h("div", { class: "login-footer" }, ["Dica: adicione à tela inicial para acesso rápido."]),
    ]);

    app.append(wrap);
    setTimeout(() => { if (!savedEmail || modoCadastro) email.focus(); else senha.focus(); }, 80);
  }

  render();
}

async function ensureMe() {
  if (state.me) return true;
  try {
    state.me = await api("/auth/me");
    return true;
  } catch {
    return false;
  }
}

function kpiCard(title, value, sub) {
  return h("div", { class: "card col-4" }, [
    h("h2", {}, [title]),
    h("div", { class: "kpi" }, [value]),
    h("div", { class: "sub" }, [sub]),
  ]);
}

function modal(content) {
  const overlay = h("div", {
    class: "modal",
    onclick: (e) => {
      if (e.target === overlay) overlay.remove();
    },
  }, [h("div", { class: "panel" }, content)]);
  document.body.append(overlay);
  return { close: () => overlay.remove() };
}

async function dashboardPage() {
  await ensureMe();
  pageShell("dashboard", [h("div", { class: "card" }, ["Carregando..."])]);

  const day = formatDate(new Date());
  const u = state.me?.usuario;
  const saudacao = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();
  const nomeDoc = u?.nome ? u.nome.split(" ")[0] : "";

  try {
    const data = await api(`/dashboard?dia=${day}`);
    const next = data.proximo_paciente;
    pageShell("dashboard", [
      // Cabeçalho limpo
      h("div", { class: "dash-header" }, [
        h("div", {}, [
          h("div", { class: "dash-saudacao" }, [`${saudacao}${nomeDoc ? ", " + nomeDoc : ""}! 👋`]),
          h("div", { class: "dash-data" }, [
            new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }),
          ]),
        ]),
        h("a", { class: "btn primary", href: "#/agenda" }, ["+ Agendar"]),
      ]),
      // Cards de acesso rápido — Agenda e Pacientes
      h("div", { class: "quick-access-grid" }, [
        h("a", { class: "quick-card", href: "#/agenda" }, [
          h("div", { class: "quick-card-icon" }, ["📅"]),
          h("div", { class: "quick-card-label" }, ["Agenda"]),
          h("div", { class: "quick-card-sub" }, ["Ver consultas do dia"]),
        ]),
        h("a", { class: "quick-card", href: "#/pacientes" }, [
          h("div", { class: "quick-card-icon" }, ["👥"]),
          h("div", { class: "quick-card-label" }, ["Pacientes"]),
          h("div", { class: "quick-card-sub" }, ["Buscar e gerenciar"]),
        ]),
      ]),
      // KPIs
      h("div", { class: "grid cards" }, [
        kpiCard("Hoje", data.consultas_do_dia, "consultas agendadas"),
        kpiCard("Canceladas", data.consultas_canceladas, "neste período"),
        kpiCard("Concluídas", data.atendimentos_concluidos, "atendimentos"),
        // Próximo paciente
        h("div", { class: "card col-12" }, [
          h("div", { class: "card-label-row" }, ["Próximo paciente"]),
          next
            ? h("div", { class: "row" }, [
                h("div", {}, [
                  h("div", { class: "next-nome" }, [next.paciente_nome || "—"]),
                  h("div", { class: "sub" }, [`${formatTime(next.inicio)} • ${next.paciente_telefone || ""}`]),
                ]),
                h("div", { class: "spacer" }),
                statusBadge(next.status),
              ])
            : h("div", { class: "muted" }, ["Nenhuma consulta futura hoje."]),
        ]),
        // Slots livres
        data.horarios_livres?.length
          ? h("div", { class: "card col-12" }, [
              h("div", { class: "card-label-row" }, ["Horários livres"]),
              h("div", { class: "row" }, data.horarios_livres.map((s) =>
                h("a", {
                  class: "btn slot-btn",
                  href: `#/agenda?dia=${day}&slot=${encodeURIComponent(s.inicio)}`,
                }, [formatTime(s.inicio)])
              )),
            ])
          : null,
      ]),
    ]);
  } catch (err) {
    toast(err.message);
  }
}

async function agendaPage() {
  await ensureMe();
  const params = new URLSearchParams(location.hash.split("?")[1] || "");
  const diaInit = params.get("dia") || formatDate(new Date());

  const diaPicker = createDatePicker({
    value: diaInit,
    onChange: (v) => { modoRange = false; load(); },
  });
  // Compatibilidade: dia.value usado no código existente
  const dia = {
    get value() { return diaPicker.value || formatDate(new Date()); },
    set value(v) { diaPicker.value = v; },
  };
  const listWrap = h("div", {}, ["Carregando..."]);
  const filtro = h("input", { class: "input", placeholder: "Buscar paciente, telefone..." });
  const slotsWrap = h("div", { style: "display:none" });  // oculto até ter slots
  let consultasCache = [];
  let pacientesCache = []; // cache local de pacientes
  // modo: "dia" | "range"
  let modoRange = false;
  let rangeStart = null;
  let rangeEnd = null;

  // Título dinâmico da lista
  const listTitle = h("h2", { style: "margin:0" }, ["Consultas do dia"]);

  function setAtivo(btn, todos) {
    todos.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  }

  function renderList() {
    const q = (filtro.value || "").trim().toLowerCase();
    const items = !q
      ? consultasCache
      : consultasCache.filter((c) => {
          const hay = [
            c.paciente_nome || "",
            c.paciente_telefone || "",
            c.status || "",
            String(c.paciente_id || ""),
          ].join(" ").toLowerCase();
          return hay.includes(q);
        });
    listWrap.innerHTML = "";
    if (!items.length) {
      listWrap.append(h("div", { class: "muted" }, ["Nada para mostrar com esse filtro."]));
      return;
    }

    const list = h("div", { class: "consult-list" });

    items.forEach((c) => {
      const badgeWrap = h("div", { class: "consult-badge-wrap" });
      const badge = h("button", {
        class: `badge ${c.status} badge-btn`,
        type: "button",
        title: "Alterar status",
        "aria-label": "Alterar status da consulta",
        onclick: (e) => {
          e.stopPropagation();
          openStatusMenu(c, badge, () => {
            badge.className = `badge ${c.status} badge-btn`;
            badge.textContent = { agendada:"Agendada", confirmada:"Confirmada", concluida:"Concluída", cancelada:"Cancelada", faltou:"Faltou" }[c.status] || c.status;
            card.className = `consult-card consult-card-${c.status}`;
            pulseCard(card);
          });
        },
      }, [{ agendada:"Agendada", confirmada:"Confirmada", concluida:"Concluída", cancelada:"Cancelada", faltou:"Faltou" }[c.status] || c.status]);
      badgeWrap.append(badge);

      // Ações rápidas
      const tel = c.paciente_telefone || "";
      const telNum = tel.replace(/\D/g, "");

      // Botões ✔️ e 🚫 — visíveis só para agendada/confirmada em datas de hoje ou passadas
      const podeConclFalt = (c.status === "agendada" || c.status === "confirmada") && isTodayOrPast(c.inicio);

      const acoes = h("div", { class: "consult-actions" }, [
        podeConclFalt ? h("button", {
          class: "consult-action-btn action-concluir",
          title: "Marcar como Concluída",
          "aria-label": "Marcar como concluída",
          type: "button",
          onclick: (e) => {
            e.stopPropagation();
            openConcluirModal(c, () => {
              badge.className = `badge concluida badge-btn`;
              badge.textContent = "Concluída";
              card.className = `consult-card consult-card-concluida`;
              pulseCard(card);
            });
          },
        }, ["✔️"]) : null,
        podeConclFalt ? h("button", {
          class: "consult-action-btn action-faltou",
          title: "Marcar como Faltou",
          "aria-label": "Marcar como faltou",
          type: "button",
          onclick: (e) => {
            e.stopPropagation();
            openFaltouModal(c, () => {
              badge.className = `badge faltou badge-btn`;
              badge.textContent = "Faltou";
              card.className = `consult-card consult-card-faltou`;
              pulseCard(card);
            });
          },
        }, ["🚫"]) : null,
        h("button", {
          class: "consult-action-btn",
          title: "Editar",
          "aria-label": "Editar consulta",
          type: "button",
          onclick: (e) => { e.stopPropagation(); openEdit(c); },
        }, ["✏️"]),
        telNum ? h("a", {
          class: "consult-action-btn",
          title: "Ligar",
          "aria-label": `Ligar para ${c.paciente_nome || "paciente"}`,
          href: `tel:${telNum}`,
          onclick: (e) => e.stopPropagation(),
        }, ["📞"]) : null,
        telNum ? (() => {
          const primeiroNome = (c.paciente_nome || "").split(" ")[0] || "paciente";
          const dataConsulta = new Date(c.inicio).toLocaleDateString("pt-BR", {
            weekday: "long", day: "2-digit", month: "long"
          });
          const horaConsulta = formatTime(c.inicio);
          const clinica = state.me?.usuario?.nome_clinica || "Agenda Médica";
          const medico  = state.me?.usuario?.nome ? `Dr(a). ${state.me.usuario.nome}` : clinica;
          const msgWa = encodeURIComponent(
            `Olá ${primeiroNome}! 😊\n\n` +
            `Passando para lembrar que você tem uma consulta agendada:\n` +
            `📅 *${dataConsulta}* às *${horaConsulta}*\n\n` +
            `Qualquer dúvida, estamos à disposição.\n` +
            `— ${medico}`
          );
          const waNum = telNum.startsWith("55") ? telNum : `55${telNum}`;
          return h("a", {
            class: "consult-action-btn",
            title: "Enviar lembrete via WhatsApp",
            "aria-label": `Enviar lembrete WhatsApp para ${c.paciente_nome || "paciente"}`,
            href: `https://wa.me/${waNum}?text=${msgWa}`,
            target: "_blank",
            rel: "noopener",
            onclick: (e) => e.stopPropagation(),
          }, ["💬"]);
        })() : null,
      ]);

      const card = h("div", { class: `consult-card consult-card-${c.status}` }, [
        h("div", { class: "consult-card-left" }, [
          h("div", { class: "consult-time" }, [
            modoRange
              ? `${formatDate(c.inicio)} ${formatTime(c.inicio)}`
              : formatTime(c.inicio),
          ]),
          h("div", { class: "consult-time-end" }, [`até ${formatTime(c.fim)}`]),
        ]),
        h("div", { class: "consult-card-mid" }, [
          h("div", { class: "consult-nome" }, [c.paciente_nome || "Paciente"]),
          h("div", { class: "consult-tel" }, [tel]),
        ]),
        h("div", { class: "consult-card-right" }, [
          badgeWrap,
          acoes,
        ]),
      ]);

      // Swipe: direita = confirmar, esquerda = cancelar
      _addSwipe(card, {
        onRight: async () => {
          if (c.status === "confirmada" || c.status === "cancelada" || c.status === "concluida") return;
          await _quickStatus(c, "confirmada", () => {
            badge.className = `badge confirmada badge-btn`;
            badge.textContent = "Confirmada";
            card.className = `consult-card consult-card-confirmada`;
          });
          toast("✅ Confirmada");
        },
        onLeft: async () => {
          if (c.status === "cancelada") return;
          await _doCancelFlow(c, () => {
            badge.className = `badge cancelada badge-btn`;
            badge.textContent = "Cancelada";
            card.className = `consult-card consult-card-cancelada`;
          });
        },
      });

      list.append(card);
    });

    listWrap.append(list);
  }

  // Swipe helper
  function _addSwipe(el, { onRight, onLeft }) {
    let startX = 0, startY = 0, dx = 0;
    let swiping = false;

    // Ícones de feedback sobrepostos
    const iconRight = h("div", { class: "swipe-hint swipe-hint-right", "aria-hidden": "true" }, ["✅"]);
    const iconLeft  = h("div", { class: "swipe-hint swipe-hint-left",  "aria-hidden": "true" }, ["❌"]);
    el.style.position = "relative";
    el.append(iconRight, iconLeft);

    el.addEventListener("touchstart", (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      dx = 0;
      swiping = false;
    }, { passive: true });

    el.addEventListener("touchmove", (e) => {
      dx = e.touches[0].clientX - startX;
      const dy = Math.abs(e.touches[0].clientY - startY);
      if (Math.abs(dx) > dy && Math.abs(dx) > 8) {
        swiping = true;
        const clamped = Math.max(-80, Math.min(80, dx));
        el.style.transform = `translateX(${clamped}px)`;
        el.style.transition = "none";

        const ratio = Math.min(Math.abs(dx) / 50, 1);
        if (dx > 0) {
          el.classList.add("swipe-right");
          el.classList.remove("swipe-left");
          iconRight.style.opacity = ratio;
          iconLeft.style.opacity  = 0;
        } else {
          el.classList.add("swipe-left");
          el.classList.remove("swipe-right");
          iconLeft.style.opacity  = ratio;
          iconRight.style.opacity = 0;
        }
      }
    }, { passive: true });

    el.addEventListener("touchend", () => {
      el.style.transition = "transform .25s ease";
      el.style.transform = "";
      el.classList.remove("swipe-right", "swipe-left");
      iconRight.style.opacity = 0;
      iconLeft.style.opacity  = 0;
      if (!swiping) return;
      if (dx > 50) onRight();
      else if (dx < -50) onLeft();
    });
  }

  async function load() {
    listWrap.innerHTML = "";
    // Skeleton screen
    const skeleton = h("div", { class: "consult-list" },
      [1, 2, 3].map(() => h("div", { class: "consult-card skeleton" }, [
        h("div", { class: "skeleton-time" }),
        h("div", { class: "skeleton-content" }, [
          h("div", { class: "skeleton-line" }),
          h("div", { class: "skeleton-line short" }),
        ]),
        h("div", { class: "skeleton-badge" }),
      ]))
    );
    listWrap.append(skeleton);
    slotsWrap.style.display = "none";
    slotsWrap.innerHTML = "";
    try {
      // Carrega pacientes em paralelo (cache local para busca instantânea)
      if (!pacientesCache.length) {
        pacientesCache = await api(`/patients?search=`);
      }
      if (modoRange) {
        consultasCache = await api(`/appointments/range?start=${rangeStart}&end=${rangeEnd}`);
        listTitle.textContent = `Consultas (${consultasCache.length})`;
        slotsWrap.style.display = "none";
        slotsWrap.innerHTML = "";
      } else {
        consultasCache = await api(`/appointments?day=${dia.value}`);
        listTitle.textContent = "Consultas do dia";
        const dash = await api(`/dashboard?dia=${dia.value}`);
        let slots = dash.horarios_livres || [];

        // Se o dia selecionado é hoje, oculta slots cujo horário já passou
        const hoje = formatDate(new Date());
        if (dia.value === hoje) {
          const agora = new Date();
          slots = slots.filter((s) => new Date(s.inicio) > agora);
        }

        slotsWrap.innerHTML = "";
        if (slots.length) {
          slotsWrap.style.display = "";
          slotsWrap.append(
            h("div", { class: "slots-bar" }, [
              h("span", { class: "slots-label" }, ["Encaixe:"]),
              ...slots.map((s) =>
                h("button", { class: "btn slot-btn", type: "button", onclick: () => openCreate(s.inicio) }, [formatTime(s.inicio)])
              ),
            ])
          );
        } else if (dia.value === hoje) {
          // Todos os slots do dia já passaram
          slotsWrap.style.display = "";
          slotsWrap.append(
            h("div", { class: "slots-bar" }, [
              h("span", { class: "slots-label muted", style: "font-size:13px" },
                ["Não há mais horários disponíveis hoje"]),
            ])
          );
        } else {
          slotsWrap.style.display = "none";
        }
      }
      if (!consultasCache.length) {
        listWrap.innerHTML = "";
        listWrap.append(h("div", { class: "muted" }, ["Nenhuma consulta nesse período."]));
      } else {
        renderList();
      }
    } catch (err) {
      listWrap.innerHTML = "";
      listWrap.append(h("div", { class: "muted" }, ["Falha ao carregar agenda."]));
      slotsWrap.style.display = "none";
      toast(err.message);
    }
  }

  function openCreate(prefillStart) {
    const paciente = h("input", { class: "input", placeholder: "Buscar paciente (nome/telefone)" });
    const results = h("div", { class: "grid" }, []);

    const defaultStart = prefillStart ? new Date(prefillStart) : new Date(`${dia.value}T09:00:00`);
    const defaultEnd = new Date(defaultStart.getTime() + 30 * 60 * 1000);

    const toLocalDT = (d) => {
      const yyyy = d.getFullYear(), mm = String(d.getMonth()+1).padStart(2,"0"), dd = String(d.getDate()).padStart(2,"0");
      const hh = String(d.getHours()).padStart(2,"0"), mi = String(d.getMinutes()).padStart(2,"0");
      return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
    };

    const apptPicker = createAppointmentPicker({
      inicio: toLocalDT(defaultStart),
      fim:    toLocalDT(defaultEnd),
    });

    const observacoes = h("textarea", { class: "input", rows: "3", placeholder: "Observações (opcional)" });
    const btn = h("button", { class: "btn primary", type: "submit" }, ["Salvar"]);
    const selected = { id: null };

    let t = null;
    paciente.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const q = paciente.value.trim().toLowerCase();
        results.innerHTML = "";
        // Só busca a partir de 3 caracteres
        if (q.length < 3) return;

        const matches = pacientesCache.filter(p =>
          p.nome_completo.toLowerCase().includes(q) ||
          (p.telefone || "").includes(q)
        );

        if (!matches.length) {
          results.append(h("div", { class: "search-empty" }, ["Nenhum paciente encontrado."]));
          return;
        }

        matches.sort((a, b) => {
          const aS = a.nome_completo.toLowerCase().startsWith(q) ? 0 : 1;
          const bS = b.nome_completo.toLowerCase().startsWith(q) ? 0 : 1;
          return aS - bS || a.nome_completo.localeCompare(b.nome_completo);
        });

        for (const p of matches.slice(0, 8)) {
          const iniciais = p.nome_completo.split(" ").filter(Boolean).slice(0, 2)
            .map(w => w[0].toUpperCase()).join("");

          const item = h("button", {
            class: "search-result",
            type: "button",
            onclick: () => {
              selected.id = p.id;
              paciente.value = p.nome_completo;
              results.innerHTML = "";
              results.append(h("div", { class: "search-selected-tag" }, [
                `✓ ${p.nome_completo}`,
              ]));
            },
          }, [
            h("div", { class: "search-avatar" }, [iniciais]),
            h("div", { class: "search-info" }, [
              h("div", { class: "search-nome" }, [p.nome_completo]),
              h("div", { class: "search-tel" }, [p.telefone]),
            ]),
          ]);
          results.append(item);
        }
      }, 120);
    });

    const m = modal([
      h("div", { class: "modal-header" }, [
        h("h2", { class: "modal-title" }, ["Agendar consulta"]),
        h("button", { class: "btn modal-close-btn", type: "button", onclick: () => m.close() }, ["✕"]),
      ]),
      h("form", {
        class: "form modal-form-stack",
        onsubmit: async (e) => {
          e.preventDefault();
          if (!selected.id) return toast("Selecione um paciente.");
          btn.disabled = true;
          btn.textContent = "Salvando...";
          try {
            const payload = {
              paciente_id: selected.id,
              inicio: new Date(apptPicker.getInicio()).toISOString(),
              fim: new Date(apptPicker.getFim()).toISOString(),
              status: "agendada",
              observacoes: observacoes.value || null,
            };
            await api("/appointments", { method: "POST", body: JSON.stringify(payload) });
            m.close();
            await load();
            toast("Consulta agendada.");
          } catch (err) {
            toast(err.message);
          } finally {
            btn.disabled = false;
            btn.textContent = "Salvar";
          }
        },
      }, [
        h("div", { class: "modal-field" }, [h("label", { class: "label modal-label" }, ["Paciente"]), paciente]),
        results,
        apptPicker.el,
        h("div", { class: "modal-field" }, [h("label", { class: "label modal-label" }, ["Observações"]), observacoes]),
        h("div", { class: "modal-actions" }, [btn]),
      ]),
    ]);
  }

  function openEdit(consulta) {
    const toLocalDT = (iso) => {
      const d = new Date(iso);
      const yyyy = d.getFullYear(), mm = String(d.getMonth()+1).padStart(2,"0"), dd = String(d.getDate()).padStart(2,"0");
      const hh = String(d.getHours()).padStart(2,"0"), mi = String(d.getMinutes()).padStart(2,"0");
      return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
    };
    const apptPicker = createAppointmentPicker({
      inicio: toLocalDT(consulta.inicio),
      fim:    toLocalDT(consulta.fim),
      allowPast: true,
    });
    const statusSel = h("select", { class: "input" }, [
      h("option", { value: "agendada" }, ["Agendada"]),
      h("option", { value: "confirmada" }, ["Confirmada"]),
      h("option", { value: "concluida" }, ["Concluída"]),
      h("option", { value: "cancelada" }, ["Cancelada"]),
      h("option", { value: "faltou" }, ["Faltou"]),
    ]);
    const observacoes = h("textarea", { class: "input", rows: "3" }, [consulta.observacoes || ""]);

    const toLocalInput = (iso) => {
      const d = new Date(iso);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const mi = String(d.getMinutes()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
    };
    statusSel.value = consulta.status;

    const btnSave = h("button", { class: "btn primary", type: "submit" }, ["Salvar"]);
    const btnCancel = h("button", { class: "btn danger", type: "button" }, ["Cancelar"]);
    const m = modal([
      h("div", { class: "modal-header" }, [
        h("h2", { class: "modal-title" }, ["Editar consulta"]),
        h("button", { class: "btn modal-close-btn", type: "button", onclick: () => m.close() }, ["✕"]),
      ]),
      h("div", { class: "modal-patient-info" }, [
        consulta.paciente_nome
          ? `${consulta.paciente_nome} • ${consulta.paciente_telefone || ""}`
          : `Paciente: ${consulta.paciente_id}`,
      ]),
      h("form", {
        class: "form modal-form-stack",
        onsubmit: async (e) => {
          e.preventDefault();
          btnSave.disabled = true;
          btnSave.textContent = "Salvando...";
          try {
            const payload = {
              inicio: new Date(apptPicker.getInicio()).toISOString(),
              fim: new Date(apptPicker.getFim()).toISOString(),
              status: statusSel.value,
              observacoes: observacoes.value || null,
            };
            await api(`/appointments/${consulta.id}`, { method: "PUT", body: JSON.stringify(payload) });
            toast("Alterações salvas.");
            m.close();
            await load();
          } catch (err) {
            toast(err.message);
          } finally {
            btnSave.disabled = false;
            btnSave.textContent = "Salvar";
          }
        },
      }, [
        apptPicker.el,
        h("div", { class: "modal-field" }, [h("label", { class: "label modal-label" }, ["Status"]), statusSel]),
        h("div", { class: "modal-field" }, [h("label", { class: "label modal-label" }, ["Observações"]), observacoes]),
        h("div", { class: "modal-actions" }, [btnSave, btnCancel]),
      ]),
    ]);
    btnCancel.onclick = async () => {
      if (!confirm("Cancelar esta consulta?")) return;
      try {
        await api(`/appointments/${consulta.id}/cancel`, { method: "POST", body: "{}" });
        toast("Consulta cancelada.");
        m.close();
        await load();
      } catch (err) {
        toast(err.message);
      }
    };
  }

  pageShell("agenda", [
    // Barra de controles compacta
    h("div", { class: "agenda-toolbar" }, [
      // Atalhos de período
      (() => {
        const hoje = formatDate(new Date());
        const amanha = formatDate(new Date(Date.now() + 86400000));
        const em7 = formatDate(new Date(Date.now() + 6 * 86400000));
        const now = new Date();
        const mesInicio = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
        const mesFim = formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
        const btns = [], allBtns = [];
        function mkBtn(label, onClick) {
          const b = h("button", { class: "btn", type: "button", onclick: onClick }, [label]);
          allBtns.push(b); btns.push(b); return b;
        }
        mkBtn("Hoje",        () => { modoRange = false; dia.value = hoje;  setAtivo(btns[0], allBtns); load(); });
        mkBtn("Amanhã",      () => { modoRange = false; dia.value = amanha; setAtivo(btns[1], allBtns); load(); });
        mkBtn("7 dias",      () => { modoRange = true; rangeStart = hoje; rangeEnd = em7; setAtivo(btns[2], allBtns); load(); });
        mkBtn("Este mês",    () => { modoRange = true; rangeStart = mesInicio; rangeEnd = mesFim; setAtivo(btns[3], allBtns); load(); });
        btns[0].classList.add("active");
        return h("div", { class: "agenda-shortcuts" }, btns);
      })(),
      // Seletor de data
      diaPicker.el,
      h("div", { class: "spacer" }),
      // Filtro inline
      filtro,
      // Botão agendar
      h("button", { class: "btn primary", onclick: () => openCreate(params.get("slot")) }, ["+ Agendar"]),
    ]),
    // Slots livres — só aparece se houver
    slotsWrap,
    // Lista de consultas
    h("div", { class: "card" }, [
      h("div", { class: "row", style: "margin-bottom:8px" }, [
        listTitle,
        h("div", { class: "spacer" }),
        h("button", { class: "btn", onclick: load, title: "Atualizar" }, ["↺"]),
      ]),
      listWrap,
    ]),
  ]);

  filtro.addEventListener("input", () => {
    clearTimeout(filtro._t);
    filtro._t = setTimeout(() => renderList(), 300);
  });
  await load();
}

async function pacientePage() {
  await ensureMe();
  const params = new URLSearchParams(location.hash.split("?")[1] || "");
  const id = params.get("id");
  if (!id) {
    toast("Paciente inválido.");
    location.hash = "#/pacientes";
    return;
  }

  pageShell("paciente", [h("div", { class: "card" }, ["Carregando..."])]);

  try {
    const hist = await api(`/patients/${id}/history`);
    const p = hist.paciente;
    const consultas = hist.consultas || [];

    const btnAgendarRetorno = h("button", {
      class: "btn primary",
      onclick: () => {
        const inicio = new Date();
        inicio.setMinutes(0, 0, 0);
        inicio.setHours(inicio.getHours() + 1);
        const fim = new Date(inicio.getTime() + 30 * 60 * 1000);

        const toLocalDT = (d) => {
          const yyyy = d.getFullYear(), mm = String(d.getMonth()+1).padStart(2,"0"), dd = String(d.getDate()).padStart(2,"0");
          const hh = String(d.getHours()).padStart(2,"0"), mi = String(d.getMinutes()).padStart(2,"0");
          return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
        };
        const apptPicker = createAppointmentPicker({
          inicio: toLocalDT(inicio),
          fim:    toLocalDT(fim),
        });
        const obs = h("textarea", { class: "input", rows: "3", placeholder: "Observações (opcional)" });
        const btn = h("button", { class: "btn primary", type: "submit" }, ["Salvar"]);

        const m = modal([
          h("div", { class: "modal-header" }, [
            h("h2", { class: "modal-title" }, ["Agendar retorno"]),
            h("button", { class: "btn modal-close-btn", type: "button", onclick: () => m.close() }, ["✕"]),
          ]),
          h("div", { class: "modal-patient-info" }, [`${p.nome_completo} • ${p.telefone}`]),
          h("form", {
            class: "form modal-form-stack",
            onsubmit: async (e) => {
              e.preventDefault();
              btn.disabled = true;
              btn.textContent = "Salvando...";
              try {
                const payload = {
                  paciente_id: p.id,
                  inicio: new Date(apptPicker.getInicio()).toISOString(),
                  fim: new Date(apptPicker.getFim()).toISOString(),
                  status: "agendada",
                  observacoes: obs.value || null,
                };
                await api("/appointments", { method: "POST", body: JSON.stringify(payload) });
                toast("Retorno agendado.");
                m.close();
              } catch (err) {
                toast(err.message);
              } finally {
                btn.disabled = false;
                btn.textContent = "Salvar";
              }
            },
          }, [
            apptPicker.el,
            h("div", { class: "modal-field" }, [h("label", { class: "label modal-label" }, ["Observações"]), obs]),
            h("div", { class: "modal-actions" }, [btn]),
          ]),
        ]);
      },
    }, ["Agendar retorno"]);

    const tabela = consultas.length
      ? h("table", { class: "table" }, [
          h("tbody", {}, consultas.map((c) =>
            h("tr", { class: "tr" }, [
              h("td", {}, [
                h("div", { style: "font-weight:800" }, [
                  `${formatDate(c.inicio)} • ${formatTime(c.inicio)}`,
                ]),
                h("div", { class: "sub" }, [`até ${formatTime(c.fim)}`]),
              ]),
              h("td", {}, [statusBadge(c.status)]),
              h("td", { class: "muted" }, [c.observacoes || ""]),
            ])
          )),
        ])
      : h("div", { class: "muted" }, ["Sem histórico de consultas ainda."]);

    pageShell("paciente", [
      h("div", { class: "row", style: "margin-bottom:12px" }, [
        h("h2", { style: "margin:0; font-size:16px" }, ["Paciente"]),
        h("div", { class: "spacer" }),
        h("a", { class: "btn", href: "#/pacientes" }, ["← Voltar"]),
        // Botão PDF
        h("button", {
          class: "btn",
          title: "Baixar histórico em PDF",
          onclick: () => {
            window.open(`/api/patients/${id}/history/pdf`, "_blank");
          },
        }, ["📄 PDF"]),
        // Botão Imprimir
        h("button", {
          class: "btn",
          title: "Imprimir histórico",
          onclick: () => {
            const url = `/api/patients/${id}/history/pdf`;
            const win = window.open(url, "_blank");
            if (win) {
              win.addEventListener("load", () => {
                setTimeout(() => win.print(), 500);
              });
            }
          },
        }, ["🖨️ Imprimir"]),
        // Botão WhatsApp
        h("button", {
          class: "btn whatsapp",
          title: "Enviar mensagem via WhatsApp",
          onclick: () => {
            const tel = (p.telefone || "").replace(/\D/g, "");
            const telFull = tel.startsWith("55") ? tel : "55" + tel;
            const clinica = state.me?.usuario?.nome_clinica || "Agenda Médica";
            const medico  = state.me?.usuario?.nome ? `Dr(a). ${state.me.usuario.nome}` : clinica;
            const msg = encodeURIComponent(
              `Olá, ${p.nome_completo.split(" ")[0]}! 👋\n\n` +
              `Entramos em contato da *${clinica}*.\n\n` +
              `Precisa de alguma informação ou deseja agendar uma consulta? Estamos à disposição! 😊\n\n` +
              `— ${medico}`
            );
            window.open(`https://wa.me/${telFull}?text=${msg}`, "_blank");
          },
        }, ["💬 WhatsApp"]),
        btnAgendarRetorno,
      ]),
      h("div", { class: "grid cards" }, [
        h("div", { class: "card col-12" }, [
          h("h2", {}, ["Dados rápidos"]),
          h("div", { style: "font-weight:900; font-size:18px" }, [p.nome_completo]),
          h("div", { class: "sub" }, [
            `${p.telefone}${p.email ? " • " + p.email : ""}${p.data_nascimento ? " • Nasc.: " + p.data_nascimento : ""}`,
          ]),
          p.observacoes ? h("div", { class: "sub", style: "margin-top:8px" }, [p.observacoes]) : null,
        ]),
        h("div", { class: "card col-12" }, [
          h("h2", {}, ["Histórico (últimas 50)"]),
          tabela,
        ]),
      ]),
    ]);
  } catch (err) {
    toast(err.message);
    location.hash = "#/pacientes";
  }
}

async function pacientesPage() {
  await ensureMe();
  const q = h("input", { class: "input", placeholder: "Buscar por nome ou telefone..." });
  const list = h("div", { class: "card" }, ["Carregando..."]);
  const fileImport = h("input", { type: "file", accept: ".xlsx", style: "display:none" });
  const importStatus = h("div", { class: "import-status", style: "display:none" });

  async function load() {
    list.innerHTML = "";
    list.append(h("div", { class: "muted" }, ["Carregando..."]));
    try {
      const pts = await api(`/patients?search=${encodeURIComponent(q.value || "")}`);
      list.innerHTML = "";
      if (!pts.length) {
        list.append(h("div", { class: "muted" }, ["Nenhum paciente. Cadastre o primeiro ou importe uma planilha."]));
        return;
      }
      const tbl = h("div", { class: "patient-list" }, pts.map((p) => {

        // Número WhatsApp
        const telDigits = (p.telefone || "").replace(/\D/g, "");
        const waNum = telDigits.startsWith("55") ? telDigits : "55" + telDigits;
        const waMsg = encodeURIComponent(
          (() => {
            const clinica = state.me?.usuario?.nome_clinica || "Agenda Médica";
            const medico  = state.me?.usuario?.nome ? `Dr(a). ${state.me.usuario.nome}` : clinica;
            return `Olá, ${p.nome_completo.split(" ")[0]}! 👋\n\nEntramos em contato da *${clinica}*.\n\nPrecisa de alguma informação ou deseja agendar uma consulta? Estamos à disposição! 😊\n\n— ${medico}`;
          })()
        );

        // ── Botões desktop (visíveis direto na linha) ──────────────────────
        // ── Botões de ação diretos ─────────────────────────────────────
        const btnDesktop = h("div", { class: "patient-actions" }, [
          // WhatsApp — ícone verde discreto
          waNum ? h("a", {
            class: "btn pac-btn pac-btn-wa-main",
            href: `https://wa.me/${waNum}?text=${waMsg}`,
            target: "_blank",
            rel: "noopener",
            title: "WhatsApp",
            "aria-label": `WhatsApp para ${p.nome_completo}`,
            onclick: (e) => e.stopPropagation(),
          }, ["💬"]) : null,
          // Menu ⋯ com todas as opções
          (() => {
            let mOpen = false;
            const mDrop = h("div", { class: "dropdown-menu pac-dropdown", style: "display:none" }, [
              h("a", {
                class: "dropdown-item",
                href: `#/paciente?id=${encodeURIComponent(p.id)}`,
                onclick: (e) => e.stopPropagation(),
              }, ["📋 Ver histórico"]),
              h("button", {
                class: "dropdown-item",
                onclick: () => { mDrop.style.display = "none"; mOpen = false; openEdit(p); },
              }, ["✏️ Editar dados"]),
              waNum ? h("a", {
                class: "dropdown-item",
                href: `https://wa.me/${waNum}?text=${waMsg}`,
                target: "_blank",
                rel: "noopener",
                onclick: (e) => e.stopPropagation(),
              }, ["💬 WhatsApp"]) : null,
              h("a", {
                class: "dropdown-item",
                href: `/api/patients/${p.id}/history/pdf`,
                target: "_blank",
                onclick: (e) => e.stopPropagation(),
              }, ["📄 Exportar PDF"]),
              h("button", {
                class: "dropdown-item danger-item",
                onclick: () => { mDrop.style.display = "none"; mOpen = false; doDelete(p); },
              }, ["🗑️ Excluir"]),
            ]);
            const btnMenu = h("button", {
              class: "btn pac-btn",
              title: "Mais opções",
              "aria-label": "Mais opções",
              onclick: (e) => {
                e.preventDefault(); e.stopPropagation();
                mOpen = !mOpen;
                mDrop.style.display = mOpen ? "block" : "none";
              },
            }, ["•••"]);
            document.addEventListener("click", () => {
              if (mOpen) { mOpen = false; mDrop.style.display = "none"; }
            });
            return h("div", { class: "dropdown-wrap" }, [btnMenu, mDrop]);
          })(),
        ]);

        return h("a", {
          class: "patient-row",
          href: `#/paciente?id=${encodeURIComponent(p.id)}`,
          onclick: (e) => {
            if (e.target.closest(".patient-actions") ||
                e.target.closest(".dropdown-wrap")) {
              e.preventDefault();
            }
          },
        }, [
          h("div", { class: "patient-avatar" }, [
            (p.nome_completo || "?").split(" ").filter(Boolean).slice(0, 2)
              .map(w => w[0].toUpperCase()).join(""),
          ]),
          h("div", { class: "patient-info" }, [
            h("div", { class: "patient-nome" }, [p.nome_completo]),
            h("div", { class: "patient-tel" }, [p.telefone]),
          ]),
          btnDesktop,
        ]);
      }));
      list.append(tbl);
    } catch (err) {
      toast(err.message);
    }
  }

  // ── Import Excel ──────────────────────────────────────────────────────────
  fileImport.addEventListener("change", async () => {
    const file = fileImport.files[0];
    if (!file) return;

    importStatus.style.display = "";
    importStatus.className = "import-status import-loading";
    importStatus.textContent = "⏳ Importando planilha...";

    const form = new FormData();
    form.append("file", file);
    fileImport.value = "";

    try {
      const res = await fetch("/api/patients/import/excel", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Erro na importação");

      importStatus.className = "import-status import-ok";
      importStatus.innerHTML = `✅ <strong>${data.criados}</strong> criados · <strong>${data.atualizados}</strong> atualizados · <strong>${data.ignorados}</strong> ignorados`;
      await load();
      setTimeout(() => { importStatus.style.display = "none"; }, 6000);
    } catch (err) {
      importStatus.className = "import-status import-erro";
      importStatus.textContent = `❌ ${err.message}`;
    }
  });

  function openEdit(p) {
    const nome = h("input", { class: "input", value: p?.nome_completo || "" });
    const tel = h("input", { class: "input", value: p?.telefone || "" });
    const email = h("input", { class: "input", type: "email", value: p?.email || "" });
    const nascPicker = createDatePicker({
      value: p?.data_nascimento ? String(p.data_nascimento).slice(0, 10) : "",
      placeholder: "Data de nascimento",
    });
    const obs = h("textarea", { class: "input", rows: "3" }, [p?.observacoes || ""]);
    const btn = h("button", { class: "btn primary", type: "submit" }, ["Salvar"]);

    const m = modal([
      h("div", { class: "row", style: "margin-bottom:8px" }, [
        h("h2", { style: "margin:0" }, [p ? "Editar paciente" : "Novo paciente"]),
        h("div", { class: "spacer" }),
        h("button", { class: "btn", type: "button", onclick: () => m.close() }, ["Fechar"]),
      ]),
      h("form", {
        class: "form",
        onsubmit: async (e) => {
          e.preventDefault();
          btn.disabled = true;
          btn.textContent = "Salvando...";
          try {
            const payload = {
              nome_completo: nome.value,
              telefone: tel.value,
              email: email.value || null,
              data_nascimento: nascPicker.value || null,
              observacoes: obs.value || null,
            };
            if (p) await api(`/patients/${p.id}`, { method: "PUT", body: JSON.stringify(payload) });
            else await api(`/patients`, { method: "POST", body: JSON.stringify(payload) });
            toast("Paciente salvo.");
            m.close();
            await load();
          } catch (err) {
            toast(err.message);
          } finally {
            btn.disabled = false;
            btn.textContent = "Salvar";
          }
        },
      }, [
        h("div", {}, [h("label", { class: "label" }, ["Nome completo"]), nome]),
        h("div", { class: "row" }, [
          h("div", { style: "flex:1" }, [h("label", { class: "label" }, ["Telefone"]), tel]),
          h("div", { style: "flex:1" }, [h("label", { class: "label" }, ["E-mail"]), email]),
        ]),
        h("div", { class: "row" }, [
          h("div", { style: "flex:1" }, [h("label", { class: "label" }, ["Nascimento"]), nascPicker.el]),
        ]),
        h("div", {}, [h("label", { class: "label" }, ["Observações importantes"]), obs]),
        h("div", { class: "row" }, [btn]),
      ]),
    ]);
  }

  async function doDelete(p) {
    if (!confirm(`Excluir ${p.nome_completo}? Essa ação não pode ser desfeita.`)) return;
    try {
      await api(`/patients/${p.id}`, { method: "DELETE" });
      toast("Paciente excluído.");
      await load();
    } catch (err) {
      toast(err.message);
    }
  }

  // ── Botões Excel diretos (ícone + texto no desktop, só ícone no mobile) ──
  const btnExportar = h("button", {
    class: "btn btn-excel",
    title: "Exportar planilha Excel",
    onclick: () => { window.location.href = "/api/patients/export/excel"; },
  }, [
    h("img", { src: "/icons/sm-excel-export.png", class: "excel-icon", alt: "Exportar" }),
    h("span", { class: "excel-label" }, ["Exportar"]),
  ]);

  const btnImportar = h("button", {
    class: "btn btn-excel",
    title: "Importar planilha Excel",
    onclick: () => fileImport.click(),
  }, [
    h("img", { src: "/icons/sm-excel-import.png", class: "excel-icon", alt: "Importar" }),
    h("span", { class: "excel-label" }, ["Importar"]),
  ]);

  pageShell("pacientes", [
    h("div", { class: "row", style: "margin-bottom:12px" }, [
      h("h2", { style: "margin:0; font-size:16px" }, ["Pacientes"]),
      h("div", { class: "spacer" }),
      btnExportar,
      btnImportar,
      fileImport,
      h("button", { class: "btn primary", onclick: () => openEdit(null) }, ["+ Novo paciente"]),
    ]),
    importStatus,
    h("div", { class: "grid cards" }, [
      h("div", { class: "card col-12" }, [
        h("div", { class: "row", style: "margin-bottom:10px" }, [
          q,
          h("button", { class: "btn", onclick: load, title: "Atualizar lista" }, ["↺"]),
        ]),
      ]),
      h("div", { class: "card col-12" }, [list]),
    ]),
  ]);

  let t = null;
  q.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(load, 200);
  });
  await load();
}

async function perfilPage() {
  await ensureMe();
  const u = state.me.usuario;

  // ── Campos do perfil ──────────────────────────────────────────────────────
  const fNome = h("input", { class: "input", value: u.nome || "", placeholder: "Dr(a). Nome Sobrenome" });
  const fCrm = h("input", { class: "input", value: u.crm || "", placeholder: "CRM 12345/SP" });
  const fEsp = h("input", { class: "input", value: u.especialidade || "", placeholder: "Clínica Geral, Cardiologia..." });
  const fClinica = h("input", { class: "input", value: u.nome_clinica || "", placeholder: "Nome do consultório ou clínica" });
  const fTel = h("input", { class: "input", value: u.telefone || "", placeholder: "(11) 99999-9999" });
  const fEmail = h("input", { class: "input", type: "email", value: u.email_contato || "", placeholder: "email para receber lembretes" });
  const btnSalvar = h("button", { class: "btn primary", type: "submit" }, ["Salvar perfil"]);

  // ── Avatar ────────────────────────────────────────────────────────────────
  const iniciais = (u.nome || u.email || "?")
    .split(" ").filter(Boolean).slice(0, 2)
    .map(w => w[0].toUpperCase()).join("");

  const avatarPreview = h("div", { class: "avatar-preview" }, [
    u.avatar_url
      ? h("img", { src: u.avatar_url, class: "avatar-img-lg", alt: "Avatar" })
      : h("div", { class: "avatar-iniciais-lg" }, [iniciais]),
  ]);

  const fileInput = h("input", { type: "file", accept: "image/jpeg,image/png,image/webp", style: "display:none" });
  const btnUpload = h("button", { class: "btn", type: "button" }, ["📷 Alterar foto"]);
  const btnRemover = h("button", {
    class: "btn danger",
    type: "button",
    style: u.avatar_url ? "" : "display:none",
  }, ["Remover foto"]);

  btnUpload.onclick = () => fileInput.click();

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    btnUpload.disabled = true;
    btnUpload.textContent = "Enviando...";
    try {
      const res = await fetch("/api/auth/perfil/avatar", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || "Erro ao enviar imagem");
      }
      const data = await res.json();
      state.me = data;
      toast("Foto atualizada!");
      perfilPage();
    } catch (err) {
      toast(err.message);
    } finally {
      btnUpload.disabled = false;
      btnUpload.textContent = "📷 Alterar foto";
    }
  });

  btnRemover.onclick = async () => {
    if (!confirm("Remover foto de perfil?")) return;
    try {
      const data = await api("/auth/perfil/avatar", { method: "DELETE" });
      state.me = data;
      toast("Foto removida.");
      perfilPage();
    } catch (err) {
      toast(err.message);
    }
  };

  // ── Configurações de lembrete ─────────────────────────────────────────────
  const dias = u.lembrete_dias || [1];
  const chk1 = h("input", { type: "checkbox", id: "lembrete_1dia", class: "lembrete-chk" });
  const chk2 = h("input", { type: "checkbox", id: "lembrete_2dias", class: "lembrete-chk" });
  if (dias.includes(1)) chk1.checked = true;
  if (dias.includes(2)) chk2.checked = true;

  const chkAtivo = h("input", { type: "checkbox", id: "lembrete_ativo", class: "lembrete-chk" });
  chkAtivo.checked = u.lembrete_ativo !== false;

  const MSG_VARS_P = "{primeiro_nome}, {nome}, {data}, {hora}, {clinica}, {medico}";
  const MSG_VARS_M = "{paciente}, {data}, {hora}, {clinica}, {total_dia}";

  const MSG_DEFAULT_P =
    "Olá, {primeiro_nome}! 😊\n\nLembramos que você tem uma consulta marcada para {data} às {hora}.\n\nConfirme sua presença ou entre em contato com antecedência caso precise remarcar.\n\nAté lá! 🏥";
  const MSG_DEFAULT_M =
    "Olá! 👋\n\nLembrete automático: você tem uma consulta com {paciente} em {data} às {hora}.\n\nTenha um ótimo atendimento! 🩺";

  const fMsgPaciente = h("textarea", {
    class: "input lembrete-textarea",
    rows: "5",
    placeholder: MSG_DEFAULT_P,
  }, [u.lembrete_msg_paciente || ""]);

  const fMsgMedico = h("textarea", {
    class: "input lembrete-textarea",
    rows: "4",
    placeholder: MSG_DEFAULT_M,
  }, [u.lembrete_msg_medico || ""]);

  const btnSalvarLembrete = h("button", { class: "btn primary", type: "submit" }, ["Salvar configurações"]);

  const lembreteSectionStyle = () => {
    const s = chkAtivo.checked ? "" : "opacity:.45; pointer-events:none";
    return s;
  };

  const lembreteBody = h("div", { class: "form", style: lembreteSectionStyle() });

  chkAtivo.addEventListener("change", () => {
    lembreteBody.style.cssText = lembreteSectionStyle();
  });

  // Monta o corpo do card de lembretes
  lembreteBody.append(
    h("div", { class: "lembrete-dias-row" }, [
      h("span", { class: "label" }, ["Enviar lembrete:"]),
      h("label", { class: "lembrete-dia-label" }, [
        chk1,
        h("span", {}, ["1 dia antes"]),
      ]),
      h("label", { class: "lembrete-dia-label" }, [
        chk2,
        h("span", {}, ["2 dias antes"]),
      ]),
    ]),
    h("div", {}, [
      h("label", { class: "label" }, [
        "Mensagem para o paciente ",
        h("span", { class: "lembrete-vars" }, [`Variáveis: ${MSG_VARS_P}`]),
      ]),
      fMsgPaciente,
      h("button", {
        class: "btn lembrete-reset-btn",
        type: "button",
        onclick: () => { fMsgPaciente.value = ""; fMsgPaciente.placeholder = MSG_DEFAULT_P; },
      }, ["↺ Restaurar padrão"]),
    ]),
    h("div", {}, [
      h("label", { class: "label" }, [
        "Mensagem para você (médico) ",
        h("span", { class: "lembrete-vars" }, [`Variáveis: ${MSG_VARS_M}`]),
      ]),
      fMsgMedico,
      h("button", {
        class: "btn lembrete-reset-btn",
        type: "button",
        onclick: () => { fMsgMedico.value = ""; fMsgMedico.placeholder = MSG_DEFAULT_M; },
      }, ["↺ Restaurar padrão"]),
    ]),
    h("div", { class: "sub" }, [
      "O e-mail do médico é o campo \"E-mail para lembretes\" acima. ",
      "O paciente recebe no e-mail cadastrado no prontuário.",
    ]),
    h("div", { class: "row", style: "margin-top:4px" }, [btnSalvarLembrete]),
  );

  pageShell("perfil", [
    h("div", { class: "row", style: "margin-bottom:12px" }, [
      h("h2", { style: "margin:0; font-size:16px" }, ["Meu Perfil"]),
    ]),
    h("div", { class: "grid cards" }, [
      // ── Card avatar ──────────────────────────────────────────────────────
      h("div", { class: "card col-4", style: "text-align:center" }, [
        h("h2", {}, ["Foto / Logo"]),
        avatarPreview,
        h("div", { class: "sub", style: "margin:8px 0" }, ["JPEG, PNG ou WebP • máx. 2MB"]),
        h("div", { class: "row", style: "justify-content:center; gap:8px" }, [
          btnUpload, btnRemover, fileInput,
        ]),
        h("div", { class: "sub", style: "margin-top:10px" }, [
          "Sem foto: exibe as iniciais do nome automaticamente.",
        ]),
      ]),
      // ── Card dados profissionais ─────────────────────────────────────────
      h("div", { class: "card col-8" }, [
        h("h2", {}, ["Dados profissionais"]),
        h("form", {
          class: "form",
          onsubmit: async (e) => {
            e.preventDefault();
            btnSalvar.disabled = true;
            btnSalvar.textContent = "Salvando...";
            try {
              const payload = {
                nome: fNome.value || null,
                crm: fCrm.value || null,
                especialidade: fEsp.value || null,
                nome_clinica: fClinica.value || null,
                telefone: fTel.value || null,
                email_contato: fEmail.value || null,
              };
              const data = await api("/auth/perfil", { method: "PUT", body: JSON.stringify(payload) });
              state.me = data;
              toast("Perfil salvo!");
              perfilPage();
            } catch (err) {
              toast(err.message);
            } finally {
              btnSalvar.disabled = false;
              btnSalvar.textContent = "Salvar perfil";
            }
          },
        }, [
          h("div", { class: "row" }, [
            h("div", { style: "flex:1" }, [h("label", { class: "label" }, ["Nome completo"]), fNome]),
            h("div", { style: "flex:1" }, [h("label", { class: "label" }, ["CRM"]), fCrm]),
          ]),
          h("div", { class: "row" }, [
            h("div", { style: "flex:1" }, [h("label", { class: "label" }, ["Especialidade"]), fEsp]),
            h("div", { style: "flex:1" }, [h("label", { class: "label" }, ["Nome do consultório"]), fClinica]),
          ]),
          h("div", { class: "row" }, [
            h("div", { style: "flex:1" }, [h("label", { class: "label" }, ["WhatsApp / Telefone"]), fTel]),
            h("div", { style: "flex:1" }, [h("label", { class: "label" }, ["E-mail para lembretes"]), fEmail]),
          ]),
          h("div", { class: "sub", style: "margin-top:4px" }, [
            "O e-mail de lembretes é onde você recebe o resumo diário da agenda.",
          ]),
          h("div", { class: "row", style: "margin-top:8px" }, [btnSalvar]),
        ]),
      ]),
      // ── Card alterar senha ───────────────────────────────────────────────
      h("div", { class: "card col-12" }, [
        h("div", { class: "row", style: "margin-bottom:14px" }, [
          h("h2", { style: "margin:0" }, ["🔑 Alterar senha"]),
        ]),
        h("form", {
          class: "form",
          onsubmit: async (e) => {
            e.preventDefault();
            const senhaAtual = e.target.querySelector("#f-senha-atual").value;
            const novaSenha  = e.target.querySelector("#f-nova-senha").value;
            const confirma   = e.target.querySelector("#f-confirma").value;
            const btn = e.target.querySelector("button[type=submit]");
            btn.disabled = true; btn.textContent = "Salvando...";
            try {
              await api("/auth/alterar-senha", {
                method: "POST",
                body: JSON.stringify({ senha_atual: senhaAtual, nova_senha: novaSenha, confirma }),
              });
              toast("✅ Senha alterada com sucesso!");
              e.target.reset();
              // Atualiza biometria com nova senha
              if (localStorage.getItem("bio_cred_id")) {
                localStorage.setItem("bio_pwd", btoa(novaSenha));
              }
            } catch (err) {
              toast(err.message);
            } finally {
              btn.disabled = false; btn.textContent = "Alterar senha";
            }
          },
        }, [
          h("div", { class: "row" }, [
            h("div", { style: "flex:1" }, [
              h("label", { class: "label" }, ["Senha atual"]),
              h("input", { class: "input", type: "password", id: "f-senha-atual", placeholder: "••••••••", autocomplete: "current-password" }),
            ]),
          ]),
          h("div", { class: "row" }, [
            h("div", { style: "flex:1" }, [
              h("label", { class: "label" }, ["Nova senha"]),
              h("input", { class: "input", type: "password", id: "f-nova-senha", placeholder: "mínimo 6 caracteres", autocomplete: "new-password" }),
            ]),
            h("div", { style: "flex:1" }, [
              h("label", { class: "label" }, ["Confirmar nova senha"]),
              h("input", { class: "input", type: "password", id: "f-confirma", placeholder: "repita a nova senha", autocomplete: "new-password" }),
            ]),
          ]),
          h("div", { class: "row", style: "margin-top:4px" }, [
            h("button", { class: "btn primary", type: "submit" }, ["Alterar senha"]),
          ]),
        ]),
      ]),
      // ── Card tema ────────────────────────────────────────────────────────
      h("div", { class: "card col-12 theme-card" }, [
        h("div", { class: "row", style: "margin-bottom:10px" }, [
          h("h2", { style: "margin:0" }, ["🎨 Aparência"]),
        ]),
        h("div", { class: "sub", style: "margin-bottom:16px" }, [
          "Escolha entre o tema escuro (padrão) ou o tema claro.",
        ]),
        h("div", { class: "theme-options" }, [
          // Escuro
          (() => {
            const btn = h("button", {
              class: "theme-option" + (getTheme() === "dark" ? " theme-active" : ""),
              type: "button",
              onclick: () => {
                applyTheme("dark");
                document.querySelectorAll(".theme-option").forEach(b => b.classList.remove("theme-active"));
                btn.classList.add("theme-active");
              },
            }, [
              h("div", { class: "theme-preview theme-preview-dark" }, [
                h("div", { class: "tp-topbar" }),
                h("div", { class: "tp-card" }),
                h("div", { class: "tp-card tp-card-sm" }),
              ]),
              h("div", { class: "theme-label" }, ["🌙 Escuro"]),
            ]);
            return btn;
          })(),
          // Claro
          (() => {
            const btn = h("button", {
              class: "theme-option" + (getTheme() === "light" ? " theme-active" : ""),
              type: "button",
              onclick: () => {
                applyTheme("light");
                document.querySelectorAll(".theme-option").forEach(b => b.classList.remove("theme-active"));
                btn.classList.add("theme-active");
              },
            }, [
              h("div", { class: "theme-preview theme-preview-light" }, [
                h("div", { class: "tp-topbar" }),
                h("div", { class: "tp-card" }),
                h("div", { class: "tp-card tp-card-sm" }),
              ]),
              h("div", { class: "theme-label" }, ["☀️ Claro"]),
            ]);
            return btn;
          })(),
        ]),
      ]),
      // ── Card lembretes ───────────────────────────────────────────────────
      h("div", { class: "card col-12" }, [
        h("div", { class: "row", style: "margin-bottom:14px; align-items:center" }, [
          h("h2", { style: "margin:0" }, ["📧 Lembretes automáticos por e-mail"]),
          h("div", { class: "spacer" }),
          h("label", { class: "lembrete-toggle-label" }, [
            chkAtivo,
            h("span", { class: "lembrete-toggle-text" }, [
              chkAtivo.checked ? "Ativo" : "Inativo",
            ]),
          ]),
        ]),
        h("div", { class: "sub", style: "margin-bottom:16px" }, [
          "O sistema envia automaticamente um e-mail para o paciente e um resumo para você antes de cada consulta. ",
          "Configure quando e com qual mensagem.",
        ]),
        h("form", {
          class: "form",
          onsubmit: async (e) => {
            e.preventDefault();
            btnSalvarLembrete.disabled = true;
            btnSalvarLembrete.textContent = "Salvando...";
            try {
              const diasSel = [];
              if (chk1.checked) diasSel.push(1);
              if (chk2.checked) diasSel.push(2);
              const payload = {
                lembrete_ativo: chkAtivo.checked,
                lembrete_dias: diasSel.length ? diasSel : [1],
                lembrete_msg_paciente: fMsgPaciente.value.trim() || null,
                lembrete_msg_medico: fMsgMedico.value.trim() || null,
              };
              const data = await api("/auth/perfil", { method: "PUT", body: JSON.stringify(payload) });
              state.me = data;
              toast("Configurações de lembrete salvas!");
            } catch (err) {
              toast(err.message);
            } finally {
              btnSalvarLembrete.disabled = false;
              btnSalvarLembrete.textContent = "Salvar configurações";
            }
          },
        }, [lembreteBody]),
      ]),
    ]),
  ]);

  // Atualiza texto do toggle ao mudar
  chkAtivo.addEventListener("change", () => {
    chkAtivo.nextElementSibling.textContent = chkAtivo.checked ? "Ativo" : "Inativo";
  });

  // ── Card Push Notifications ──────────────────────────────────────────────
  const pushStatus = h("div", { class: "push-status" });
  const btnAtivarPush = h("button", { class: "btn primary push-btn", type: "button" }, ["🔔 Ativar notificações"]);
  const btnTestarPush = h("button", { class: "btn push-btn", type: "button", style: "display:none" }, ["📨 Enviar teste"]);

  async function atualizarStatusPush() {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      pushStatus.className = "push-status push-unsupported";
      pushStatus.textContent = "Seu navegador não suporta notificações push.";
      btnAtivarPush.style.display = "none";
      return;
    }
    const perm = Notification.permission;
    if (perm === "granted") {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        pushStatus.className = "push-status push-ok";
        pushStatus.innerHTML = "✅ <strong>Notificações ativas</strong> neste dispositivo.";
        btnAtivarPush.style.display = "none";
        btnTestarPush.style.display = "";
      } else {
        pushStatus.className = "push-status push-warn";
        pushStatus.textContent = "Permissão concedida mas sem inscrição ativa.";
        btnAtivarPush.textContent = "🔔 Reativar notificações";
        btnAtivarPush.style.display = "";
        btnTestarPush.style.display = "none";
      }
    } else if (perm === "denied") {
      pushStatus.className = "push-status push-erro";
      pushStatus.textContent = "❌ Notificações bloqueadas. Habilite nas configurações do navegador.";
      btnAtivarPush.style.display = "none";
    } else {
      pushStatus.className = "push-status push-warn";
      pushStatus.textContent = "Notificações não ativadas neste dispositivo.";
      btnAtivarPush.style.display = "";
      btnTestarPush.style.display = "none";
    }
  }

  btnAtivarPush.onclick = async () => {
    btnAtivarPush.disabled = true;
    const ok = await requestPushPermission();
    btnAtivarPush.disabled = false;
    await atualizarStatusPush();
  };

  btnTestarPush.onclick = async () => {
    btnTestarPush.disabled = true;
    btnTestarPush.textContent = "Enviando...";
    try {
      const r = await api("/push/test", { method: "POST", body: "{}" });
      toast(r.enviados > 0 ? "📨 Notificação enviada! Verifique seu dispositivo." : "Nenhum dispositivo inscrito.");
    } catch (err) {
      toast(err.message);
    } finally {
      btnTestarPush.disabled = false;
      btnTestarPush.textContent = "📨 Enviar teste";
    }
  };

  // Adiciona card de push após o card de lembretes
  const app = document.getElementById("app");
  const cardsGrid = app.querySelector(".grid.cards");
  if (cardsGrid) {
    const pushCard = h("div", { class: "card col-12" }, [
      h("div", { class: "row", style: "margin-bottom:12px" }, [
        h("h2", { style: "margin:0" }, ["🔔 Notificações push"]),
      ]),
      h("div", { class: "sub", style: "margin-bottom:14px" }, [
        "Receba alertas no celular ou computador mesmo com o app fechado. ",
        "Ative em cada dispositivo que quiser receber notificações.",
      ]),
      pushStatus,
      h("div", { class: "row", style: "margin-top:12px; gap:8px" }, [btnAtivarPush, btnTestarPush]),
    ]);
    cardsGrid.append(pushCard);
  }

  await atualizarStatusPush();
}

async function router() {
  // Não interrompe a tela de boas-vindas se ela estiver ativa
  if (document.querySelector(".welcome-screen:not(.welcome-out)")) return;

  const hash = location.hash.replace("#/", "");
  const page = hash.split("?")[0] || "dashboard";

  if (page === "login") {
    document.getElementById("fab-dashboard")?.remove();
    document.getElementById("bottom-nav")?.remove();
    return loginPage();
  }

  const ok = await ensureMe();
  if (!ok) {
    document.getElementById("fab-dashboard")?.remove();
    document.getElementById("bottom-nav")?.remove();
    return loginPage();
  }

  if (page === "dashboard") return dashboardPage();
  if (page === "agenda") return agendaPage();
  if (page === "pacientes") return pacientesPage();
  if (page === "paciente") return pacientePage();
  if (page === "perfil") return perfilPage();
  return dashboardPage();
}

window.addEventListener("hashchange", router);

// ── PWA: registra Service Worker e configura Push ─────────────────────────────
async function initPWA() {
  if (!("serviceWorker" in navigator)) return;

  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    console.log("[SW] registrado:", reg.scope);

    // Guarda registration globalmente para uso no push
    window._swReg = reg;

    // Se já tem permissão, inscreve silenciosamente
    if (Notification.permission === "granted") {
      await subscribePush(reg);
    }
  } catch (err) {
    console.warn("[SW] falha no registro:", err);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function subscribePush(reg) {
  try {
    // Busca chave pública VAPID do servidor
    const { publicKey } = await api("/push/vapid-public-key");
    if (!publicKey) return;

    const existing = await reg.pushManager.getSubscription();
    const sub = existing || await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    // Envia subscription para o backend
    await api("/push/subscribe", {
      method: "POST",
      body: JSON.stringify({
        endpoint: sub.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("p256dh")))),
          auth:   btoa(String.fromCharCode(...new Uint8Array(sub.getKey("auth")))),
        },
      }),
    });
    console.log("[Push] inscrito com sucesso");
    return sub;
  } catch (err) {
    console.warn("[Push] falha na inscrição:", err);
  }
}

async function requestPushPermission() {
  if (!("Notification" in window)) {
    toast("Seu navegador não suporta notificações.");
    return false;
  }
  if (Notification.permission === "granted") {
    const reg = window._swReg || await navigator.serviceWorker.ready;
    await subscribePush(reg);
    return true;
  }
  if (Notification.permission === "denied") {
    toast("Notificações bloqueadas. Habilite nas configurações do navegador.");
    return false;
  }
  const perm = await Notification.requestPermission();
  if (perm === "granted") {
    const reg = window._swReg || await navigator.serviceWorker.ready;
    await subscribePush(reg);
    toast("✅ Notificações ativadas!");
    return true;
  }
  return false;
}

// Inicia PWA após carregar
initPWA();

// ── Banner "Adicionar à tela inicial" ─────────────────────────────────────────
let _deferredInstall = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  _deferredInstall = e;

  // Só mostra se não foi dispensado antes
  if (localStorage.getItem("pwa-dismissed")) return;

  const banner = document.createElement("div");
  banner.className = "pwa-banner";
  banner.innerHTML = `
    <img src="/icons/icon-96.png" class="pwa-banner-icon" alt="Ícone">
    <div class="pwa-banner-text">
      <strong>Instalar Agenda Médica</strong>
      <span>Adicione à tela inicial para acesso rápido, mesmo offline.</span>
    </div>
    <button class="btn primary" id="pwa-install-btn" style="white-space:nowrap">Instalar</button>
    <button class="btn" id="pwa-dismiss-btn" style="padding:10px 8px; color:var(--muted)">✕</button>
  `;
  document.body.append(banner);

  document.getElementById("pwa-install-btn").onclick = async () => {
    _deferredInstall.prompt();
    const { outcome } = await _deferredInstall.userChoice;
    banner.remove();
    if (outcome === "accepted") toast("✅ App instalado!");
    _deferredInstall = null;
  };
  document.getElementById("pwa-dismiss-btn").onclick = () => {
    banner.remove();
    localStorage.setItem("pwa-dismissed", "1");
  };
});

window.addEventListener("appinstalled", () => {
  toast("✅ Agenda Médica instalada com sucesso!");
  _deferredInstall = null;
});

(async () => {
  if (!location.hash) location.hash = "#/login";
  await router();
})();
