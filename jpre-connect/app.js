const SESSION_KEY = "jpre_connect_session";
const GOOGLE_CLIENT_ID = "PENDENT_GOOGLE_CLIENT_ID";
const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbyIJA6Xg_JfJiHuK_obIjics_BjNvIfJqDFwR8gDqOUeC751cFoW7v2ddeF0QDsLE4/exec";

const appRoot = document.getElementById("app-root");
const logoutButton = document.getElementById("logout-button");

const loginTemplate = document.getElementById("login-template");
const dashboardTemplate = document.getElementById("dashboard-template");

const roleConfigs = {
  assistent: {
    label: "Participant",
    status: "Inscripció activa",
    overviewTitle: "Tot a punt per al teu dia",
    overviewText:
      "Aquest espai et mostra la teva inscripció real i la informació del teu taller sense haver de buscar correus.",
    announcements: [
      {
        meta: "Pendent de definir",
        title: "Avisos generals",
        text: "Aquesta secció es podrà omplir amb avisos reals de la jornada quan em passis el contingut.",
      },
    ],
    messages: [
      {
        author: "Organització",
        side: "org",
        meta: "Canal base",
        text: "Aquest canal està preparat per connectar missatges reals en una fase posterior.",
      },
    ],
  },
  tallerista: {
    label: "Tallerista",
    status: "Perfil de tallerista",
    overviewTitle: "Informació del teu espai de taller",
    overviewText:
      "Veus la teva inscripció real i les dades del taller assignat, si n'hi ha. La resta d'informació la podem anar afegint.",
    announcements: [
      {
        meta: "Pendent de definir",
        title: "Coordinació tècnica",
        text: "Aquí podrem afegir necessitats de material, muntatge i incidències del taller.",
      },
    ],
    messages: [
      {
        author: "Organització",
        side: "org",
        meta: "Canal base",
        text: "El canal de suport per a talleristes queda preparat per connectar dades reals més endavant.",
      },
    ],
  },
  presentacio: {
    label: "Presentació",
    status: "Perfil de presentació",
    overviewTitle: "Espai de ponència o experiència",
    overviewText:
      "Aquest espai parteix de la teva inscripció real. Si no tens taller assignat, la zona de taller es mantindrà buida.",
    announcements: [
      {
        meta: "Pendent de definir",
        title: "Informació de programa",
        text: "Quan em passis el contingut, podem mostrar franges, sales i indicacions per a ponències.",
      },
    ],
    messages: [
      {
        author: "Organització",
        side: "org",
        meta: "Canal base",
        text: "La missatgeria queda preparada com a secció futura, sense barrejar-la amb l'app actual.",
      },
    ],
  },
  organizacio: {
    label: "Organització",
    status: "Accés organització",
    overviewTitle: "Panell inicial d'organització",
    overviewText:
      "Ara mateix aquest perfil usa la teva inscripció real. El directori i la coordinació global els ampliarem quan em diguis quines dades exactes vols veure.",
    announcements: [
      {
        meta: "Pendent de definir",
        title: "Vista de coordinació",
        text: "Aquesta secció pot convertir-se en panell de seguiment, avisos i incidències de la jornada.",
      },
    ],
    messages: [
      {
        author: "Sistema",
        side: "org",
        meta: "Canal base",
        text: "Panell inicial llest per connectar funcionalitats reals d'organització.",
      },
    ],
  },
};

const baseTimeline = [
  { time: "08:45", title: "Recepció", text: "Acreditacions i acollida d'assistents." },
  { time: "09:30", title: "Primera franja", text: "Tallers, trobades i espais d'intercanvi." },
  { time: "11:00", title: "Pausa", text: "Cafè, exposicions i networking." },
  { time: "11:30", title: "Segona franja", text: "Tallers i presentacions d'experiències." },
  { time: "13:15", title: "Tancament", text: "Resum final, agraïments i informacions de sortida." },
];

const appState = {
  user: loadSession(),
  activeTab: "home",
  messages: [],
};

let pendingGoogleLogin = null;

const realJourneyTimeline = [
  { time: "08.30 - 09.30", title: "Acreditaci\u00f3", text: "Entrada del Citilab" },
  {
    time: "09.00 - 09.30",
    title: "Benvinguda institucional",
    text: "Sala d'actes Vicen\u00e7 Badenes",
  },
  {
    time: "09.30 - 10.00",
    title: "Pon\u00e8ncia a c\u00e0rrec del Citilab",
    text: "Sala d'actes Vicen\u00e7 Badenes",
  },
  {
    time: "10.00 - 11.30",
    title: "Primera franja",
    text: "Tallers, Fira d'empreses i Presentaci\u00f3 d'experi\u00e8ncies",
  },
  {
    time: "11.30 - 12.00",
    title: "Pausa - Esmorzar",
    text: "Espai de trobada i descans",
  },
  {
    time: "12.00 - 13.30",
    title: "Segona franja",
    text: "Tallers, Fira d'empreses, Presentaci\u00f3 d'experi\u00e8ncies i Fira de Robots en acci\u00f3",
  },
  {
    time: "13.30 - 14.00",
    title: "Cloenda de la jornada i sorteig d'obsequis",
    text: "Sala d'actes Vicen\u00e7 Badenes",
  },
];

const realFranjaPrograms = {
  primera: [
    { label: "Tallers", location: "Segons taller assignat" },
    { label: "Fira d'empreses", location: "Exterior del Citilab" },
    { label: "Presentaci\u00f3 d'experi\u00e8ncies", location: "Hall del Citilab" },
  ],
  segona: [
    { label: "Tallers", location: "Segons taller assignat" },
    { label: "Fira d'empreses", location: "Exterior del Citilab" },
    { label: "Presentaci\u00f3 d'experi\u00e8ncies", location: "Hall del Citilab" },
    { label: "Fira de Robots en acci\u00f3", location: "Espai Opensurf" },
  ],
};

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function hasGoogleSignInConfig() {
  return GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== "PENDENT_GOOGLE_CLIENT_ID";
}

function saveSession() {
  if (!appState.user) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(appState.user));
}

function normalizeRole(role) {
  const value = String(role || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (value.includes("organitz")) return "organizacio";
  if (value.includes("taller")) return "tallerista";
  if (value.includes("present")) return "presentacio";
  return "assistent";
}

function getRoleConfig(role) {
  return roleConfigs[role] || roleConfigs.assistent;
}

function roleLabel(role) {
  return getRoleConfig(role).label;
}

function franjaLabel(franjaNom) {
  const normalized = String(franjaNom || "").toLowerCase();
  if (normalized.includes("1a")) return "09:30 · 1a franja";
  if (normalized.includes("2a")) return "11:30 · 2a franja";
  return String(franjaNom || "Sense franja");
}

function agendaFranjaLabel(franjaNom) {
  const normalized = String(franjaNom || "").toLowerCase();
  if (normalized.includes("1a")) return "10.00 - 11.30 · 1a franja";
  if (normalized.includes("2a")) return "12.00 - 13.30 · 2a franja";
  return String(franjaNom || "Sense franja");
}

function getJourneyProgramForSelection(selection) {
  const normalized = String((selection && selection.franja) || "").toLowerCase();
  if (normalized.includes("1a")) return realFranjaPrograms.primera;
  if (normalized.includes("2a")) return realFranjaPrograms.segona;
  return [];
}

function buildUrl(params) {
  const url = new URL(WEB_APP_URL);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
}

function loadJsonp(params) {
  return new Promise((resolve, reject) => {
    const callbackName = `jsonp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const script = document.createElement("script");

    window[callbackName] = (data) => {
      delete window[callbackName];
      script.remove();
      resolve(data);
    };

    script.onerror = () => {
      delete window[callbackName];
      script.remove();
      reject(new Error("No s'ha pogut carregar la resposta del servidor."));
    };

    script.src = buildUrl({ ...params, callback: callbackName });
    document.body.appendChild(script);
  });
}

async function fetchProfileByEmail(email) {
  const data = await loadJsonp({ profileEmail: email });

  // If Apps Script is still serving the old payload shape, it means the Web App
  // has not been redeployed after adding the profile endpoint.
  if (data && Array.isArray(data.franges)) {
    const existsData = await loadJsonp({ checkEmail: email });
    if (existsData && existsData.exists) {
      throw new Error(
        "La Web App encara està desplegada amb una versió antiga. Torna a implementar Apps Script i prova de nou."
      );
    }
  }

  if (!data || !data.found || !data.profile) {
    throw new Error((data && data.message) || "No hem trobat cap inscripció amb aquest correu.");
  }

  const profile = data.profile;
  return {
    name: profile.nom || "Participant",
    email: profile.email || email,
    centre: profile.centre || "",
    localitat: profile.localitat || "",
    role: normalizeRole(profile.rol),
    rawRole: profile.rol || "",
    selections: Array.isArray(profile.seleccions) ? profile.seleccions : [],
    summary: profile.resum || {},
  };
}

function mapProfile(profile, fallbackEmail = "") {
  return {
    name: profile.nom || "Participant",
    email: profile.email || fallbackEmail,
    centre: profile.centre || "",
    localitat: profile.localitat || "",
    role: normalizeRole(profile.rol),
    rawRole: profile.rol || "",
    selections: Array.isArray(profile.seleccions) ? profile.seleccions : [],
    summary: profile.resum || {},
  };
}

function postGoogleCredential(credential) {
  const iframeName = "google-login-submit";
  let iframe = document.getElementById(iframeName);
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = iframeName;
    iframe.name = iframeName;
    iframe.style.display = "none";
    document.body.appendChild(iframe);
  }

  if (pendingGoogleLogin) {
    pendingGoogleLogin.reject(new Error("Ja s'està processant un inici de sessió."));
    clearTimeout(pendingGoogleLogin.timeoutId);
    pendingGoogleLogin = null;
  }

  return new Promise((resolve, reject) => {
    const tempForm = document.createElement("form");
    tempForm.method = "POST";
    tempForm.action = WEB_APP_URL;
    tempForm.target = iframeName;

    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "googleCredential";
    input.value = credential;
    tempForm.appendChild(input);
    document.body.appendChild(tempForm);

    pendingGoogleLogin = {
      resolve,
      reject,
      timeoutId: setTimeout(() => {
        pendingGoogleLogin = null;
        reject(new Error("Google ha validat l'accés, però el servidor no ha respost a temps."));
      }, 15000),
    };

    tempForm.submit();
    tempForm.remove();
  });
}

function handleGoogleLoginMessage(event) {
  const data = event.data;
  if (!pendingGoogleLogin || !data || data.type !== "jpre-google-login-result") {
    return;
  }

  const { resolve, reject, timeoutId } = pendingGoogleLogin;
  pendingGoogleLogin = null;
  clearTimeout(timeoutId);

  if (data.ok && data.profile) {
    resolve(data.profile);
    return;
  }

  reject(new Error(data.message || "No s'ha pogut completar l'accés amb Google."));
}

async function handleGoogleCredentialResponse(response) {
  const status = document.getElementById("login-status");
  if (!response || !response.credential) {
    status.textContent = "Google no ha retornat una credencial vàlida.";
    return;
  }

  status.textContent = "Verificant l'accés amb Google...";

  try {
    const profile = await postGoogleCredential(response.credential);
    appState.user = mapProfile(profile);
    appState.activeTab = "home";
    appState.messages = [...getRoleConfig(appState.user.role).messages];
    saveSession();
    renderApp();
  } catch (error) {
    status.textContent = error.message || "No s'ha pogut accedir amb Google.";
  }
}

function renderGoogleLogin() {
  const slot = document.getElementById("google-login-slot");
  const help = document.getElementById("google-login-help");
  if (!slot || !help) return;

  if (!hasGoogleSignInConfig()) {
    slot.innerHTML = "";
    help.textContent =
      "Falta configurar el Google Client ID. Mentrestant pots entrar amb el correu de la inscripció.";
    return;
  }

  if (!window.google || !window.google.accounts || !window.google.accounts.id) {
    help.textContent = "No s'ha pogut carregar el botó de Google en aquest navegador.";
    return;
  }

  slot.innerHTML = "";
  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleCredentialResponse,
    auto_select: false,
    cancel_on_tap_outside: true,
  });
  window.google.accounts.id.renderButton(slot, {
    type: "standard",
    theme: "filled_black",
    text: "signin_with",
    shape: "pill",
    size: "large",
    width: Math.min(slot.clientWidth || 360, 360),
    logo_alignment: "left",
  });
  help.textContent =
    "Inicia sessió amb el mateix compte de Google que vas fer servir a la inscripció.";
}

function createTimelineItem(item) {
  const node = document.createElement("article");
  node.className = `timeline-item${item.featured ? " timeline-item--feature" : ""}`;
  node.innerHTML = `
    <p class="timeline-item__time">${item.time}</p>
    <h3>${item.title}</h3>
    <p>${item.text}</p>
  `;
  return node;
}

function createInfoCard(item) {
  const card = document.createElement("article");
  card.className = "info-card";
  card.innerHTML = `
    <p class="info-card__meta">${item.meta}</p>
    <h3>${item.title}</h3>
    <p>${item.text}</p>
  `;
  return card;
}

function createSummaryChip(item) {
  const chip = document.createElement("article");
  chip.className = "summary-chip";
  chip.innerHTML = `
    <p>${item.label}</p>
    <strong>${item.value}</strong>
  `;
  return chip;
}

function createThreadMessage(item) {
  const node = document.createElement("article");
  node.className = `thread-message thread-message--${item.side}`;
  node.innerHTML = `
    <p class="thread-message__meta">${item.author} · ${item.meta}</p>
    <p>${item.text}</p>
  `;
  return node;
}

function createEmptyState(title, text) {
  const node = document.createElement("article");
  node.className = "empty-state";
  node.innerHTML = `
    <h3>${title}</h3>
    <p>${text}</p>
  `;
  return node;
}

function renderLogin() {
  appRoot.innerHTML = "";
  appRoot.appendChild(loginTemplate.content.cloneNode(true));
  logoutButton.classList.add("is-hidden");

  const form = document.getElementById("login-form");
  const status = document.getElementById("login-status");
  renderGoogleLogin();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const email = String(data.get("email") || "").trim();
    if (!email) return;

    status.textContent = "Carregant el teu espai...";

    try {
      const profile = await fetchProfileByEmail(email);
      appState.user = profile;
      appState.activeTab = "home";
      appState.messages = [...getRoleConfig(profile.role).messages];
      saveSession();
      renderApp();
    } catch (error) {
      status.textContent = error.message || "No s'ha pogut accedir a l'espai.";
    }
  });
}

function buildSummary() {
  const selection = appState.user.selections[0];
  return [
    { label: "Perfil", value: roleLabel(appState.user.role) },
    { label: "Centre", value: appState.user.centre || "No informat" },
    { label: "Taller", value: selection ? selection.tallerNom || "Assignat" : "Sense taller" },
  ];
}

function renderOverview(roleConfig) {
  document.getElementById("overview-title").textContent = roleConfig.overviewTitle;
  document.getElementById("overview-text").textContent = roleConfig.overviewText;

  const summary = document.getElementById("summary-grid");
  summary.innerHTML = "";
  buildSummary().forEach((item) => summary.appendChild(createSummaryChip(item)));
}

function renderHome(roleConfig) {
  const announcementList = document.getElementById("announcement-list");
  announcementList.innerHTML = "";
  roleConfig.announcements.forEach((item) => announcementList.appendChild(createInfoCard(item)));
}

function renderAgenda() {
  const timelineList = document.getElementById("timeline-list");
  timelineList.innerHTML = "";

  const selection = appState.user.selections[0];
  const roleSpecific = [];

  if (selection) {
    roleSpecific.push({
      time: agendaFranjaLabel(selection.franja),
      title: selection.tallerNom || "Taller assignat",
      text: selection.aula ? `Aula ${selection.aula}` : "Aula pendent de concretar",
      featured: true,
    });
  } else if (appState.user.role === "presentacio") {
    roleSpecific.push({
      time: "10.00 - 11.30 / 12.00 - 13.30",
      title: "Presentació d'experiències",
      text: "Hall del Citilab",
      featured: true,
    });
  } else if (appState.user.role === "organizacio") {
    roleSpecific.push({
      time: "Jornada completa",
      title: "Coordinació general",
      text: "Suport transversal a tots els espais de la jornada",
      featured: true,
    });
  }

  [...roleSpecific, ...realJourneyTimeline].forEach((item) => {
    timelineList.appendChild(createTimelineItem(item));
  });

  getJourneyProgramForSelection(selection).forEach((item) => {
    timelineList.appendChild(
      createInfoCard({
        meta: "Espais de la teva franja",
        title: item.label,
        text: item.location,
      })
    );
  });
}

function renderWorkshop() {
  const workshopDetail = document.getElementById("workshop-detail");
  const workshopPanelCopy = document.getElementById("workshop-panel-copy");
  workshopDetail.innerHTML = "";

  const selection = appState.user.selections[0];
  if (!selection) {
    workshopPanelCopy.textContent =
      "Aquest perfil no necessita taller assignat. Aquí podríem mostrar la teva franja, sala i materials de la presentació.";
    workshopDetail.appendChild(
      createEmptyState(
        "Sense taller assignat",
        "Quan em passis la resta d'elements de la jornada, aquesta pantalla pot mostrar ponències, sales o instruccions alternatives."
      )
    );
    return;
  }

  workshopPanelCopy.textContent =
    "Dades recuperades de les pestanyes Inscripcions i Tallers. Des d'aquí ja podem construir la fitxa real del teu taller.";

  const checklistItems = [
    selection.materialNecessari ? `Material: ${selection.materialNecessari}` : "",
    selection.etapaEducativa ? `Etapa: ${selection.etapaEducativa}` : "",
    selection.dispositiuTecnologia ? `Tecnologia: ${selection.dispositiuTecnologia}` : "",
  ].filter(Boolean);

  const checklist = checklistItems.map((item) => `<li>${item}</li>`).join("");

  workshopDetail.innerHTML = `
    <article class="info-card info-card--feature">
      <p class="info-card__meta">${agendaFranjaLabel(selection.franja)} · ${selection.aula || "Aula pendent"}</p>
      <h3>${selection.tallerNom || "Taller assignat"}</h3>
      <p><strong>Imparteix:</strong> ${selection.imparteix || "No informat"}</p>
      <p>${selection.descripcio || "Descripció pendent de completar."}</p>
      ${checklist ? `<ul class="bullet-list">${checklist}</ul>` : ""}
    </article>
  `;
}

function renderMessages() {
  const thread = document.getElementById("message-thread");
  thread.innerHTML = "";
  appState.messages.forEach((item) => thread.appendChild(createThreadMessage(item)));
}

function renderPeople() {
  const peoplePanel = document.querySelector('[data-panel="people"]');
  const peopleList = document.getElementById("people-list");

  if (appState.user.role !== "organizacio") {
    peoplePanel.classList.add("is-hidden");
    return;
  }

  peoplePanel.classList.toggle("is-hidden", appState.activeTab !== "people");
  peopleList.innerHTML = "";
  peopleList.appendChild(
    createEmptyState(
      "Panell pendent de definir",
      "Ja tenim la base separada i connectada al Sheets. El directori d'organització el podem construir quan em diguis quins camps vols veure."
    )
  );
}

function syncPanels() {
  const panels = Array.from(document.querySelectorAll(".tab-panel"));
  panels.forEach((panel) => {
    panel.classList.toggle("is-hidden", panel.dataset.panel !== appState.activeTab);
  });
}

function bindTabs() {
  const tabs = Array.from(document.querySelectorAll(".section-tab"));
  const peopleTab = tabs.find((tab) => tab.dataset.tab === "people");

  if (peopleTab && appState.user.role !== "organizacio") {
    peopleTab.classList.add("is-hidden");
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      appState.activeTab = tab.dataset.tab;
      tabs.forEach((item) => item.classList.toggle("is-active", item === tab));
      syncPanels();
      renderPeople();
    });
  });
}

function bindComposer() {
  const form = document.getElementById("message-form");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const textarea = form.elements.message;
    const text = String(textarea.value || "").trim();
    if (!text) return;

    appState.messages.push({
      author: appState.user.name,
      side: "user",
      meta: "Ara mateix",
      text,
    });

    textarea.value = "";
    renderMessages();
  });
}

function renderApp() {
  const roleConfig = getRoleConfig(appState.user.role);

  appRoot.innerHTML = "";
  appRoot.appendChild(dashboardTemplate.content.cloneNode(true));
  logoutButton.classList.remove("is-hidden");

  document.getElementById("role-label").textContent = appState.user.rawRole || roleLabel(appState.user.role);
  document.getElementById("user-name").textContent = appState.user.name;
  document.getElementById("user-email").textContent = appState.user.email;
  document.getElementById("workshop-status").textContent = roleConfig.status;

  renderOverview(roleConfig);
  renderHome(roleConfig);
  renderAgenda();
  renderWorkshop();
  renderMessages();
  syncPanels();
  renderPeople();
  bindTabs();
  bindComposer();
}

logoutButton.addEventListener("click", () => {
  appState.user = null;
  appState.activeTab = "home";
  appState.messages = [];
  saveSession();
  renderLogin();
});

window.addEventListener("message", handleGoogleLoginMessage);

if (appState.user) {
  appState.messages = [...getRoleConfig(appState.user.role).messages];
  renderApp();
} else {
  renderLogin();
}
