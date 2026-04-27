const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyIJA6Xg_JfJiHuK_obIjics_BjNvIfJqDFwR8gDqOUeC751cFoW7v2ddeF0QDsLE4/exec";

function cacheNonce() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function buildId(franja, nom) {
  return `${franja.toLowerCase().replace(/\s+/g, "-")}-${nom
    .toLowerCase()
    .replace(/\s+/g, "-")}`;
}

const mockData = {
  franges: [
    {
      nom: "1a franja",
      tallers: Array.from({ length: 10 }, (_, i) => {
        const nom = `Taller ${i + 1}`;
        return {
          id: buildId("1a franja", nom),
          nom,
          placesTotals: 30,
          placesDisponibles: 30 - i * 2,
          imparteix: "Nom i cognoms del/de la tallerista",
          foto1Url: "",
          foto2Url: "",
          dispositiuTecnologia: "Dispositiu o tecnologia del taller",
          imatgeDispositiuUrl: "",
          descripcio:
            "Descripció del taller. Explica objectiu, nivell, dinàmica i resultats esperats.",
          materialNecessari:
            "Material necessari (ordinador, compte, sensors, etc.).",
          etapaEducativa: "Etapa educativa del taller",
          aula: "Aula",
        };
      }),
    },
    {
      nom: "2a franja",
      tallers: Array.from({ length: 10 }, (_, i) => {
        const nom = `Taller ${i + 1}`;
        return {
          id: buildId("2a franja", nom),
          nom,
          placesTotals: 30,
          placesDisponibles: 28 - i * 2,
          imparteix: "Nom i cognoms del/de la tallerista",
          foto1Url: "",
          foto2Url: "",
          dispositiuTecnologia: "Dispositiu o tecnologia del taller",
          imatgeDispositiuUrl: "",
          descripcio:
            "Descripció del taller. Explica objectiu, nivell, dinàmica i resultats esperats.",
          materialNecessari:
            "Material necessari (ordinador, compte, sensors, etc.).",
          etapaEducativa: "Etapa educativa del taller",
          aula: "Aula",
        };
      }),
    },
  ],
};

const state = {
  data: null,
  selected: {},
  emailChecking: false,
  emailExists: false,
  emailChecked: "",
  submitting: false,
  loadError: false,
};

const container = document.getElementById("workshop-container");
const workshopsSection = container.closest(".workshops");
const form = document.getElementById("registration-form");
const confirmButton = document.getElementById("confirm-button");
const message = document.getElementById("form-message");
const actionsSection = confirmButton.closest(".actions");
const skipWorkshopOption = document.getElementById("skip-workshop-option");
const skipWorkshopCheckbox = document.getElementById("skip-workshop-checkbox");
const modal = document.getElementById("taller-modal");
const modalCloseButton = document.getElementById("modal-close");
const modalTitle = document.getElementById("modal-title");
const modalImparteix = document.getElementById("modal-imparteix");
const modalPeoplePhotos = document.querySelector(".modal__people-photos");
const modalFoto1 = document.getElementById("modal-foto-1");
const modalFoto2 = document.getElementById("modal-foto-2");
const modalDispositiu = document.getElementById("modal-dispositiu");
const modalDispositiuImg = document.getElementById("modal-dispositiu-img");
const modalDescripcio = document.getElementById("modal-descripcio");
const modalMaterial = document.getElementById("modal-material");
const modalEtapa = document.getElementById("modal-etapa");
const modalAula = document.getElementById("modal-aula");

let emailCheckTimer = null;
let pendingSubmit = null;
let loadErrorPanel = null;
let successMessageUntil = 0;

function selectedRole() {
  return String(form.elements.rol.value || "").trim();
}

function canSkipWorkshopSelection() {
  const role = selectedRole().toLowerCase();
  return role === "tallerista" || role === "presentació d’experiències";
}

function isSkippingWorkshopSelection() {
  return Boolean(skipWorkshopCheckbox?.checked) && canSkipWorkshopSelection();
}

function syncSkipWorkshopOption() {
  if (!skipWorkshopOption || !skipWorkshopCheckbox) return;

  const canSkip = canSkipWorkshopSelection();
  skipWorkshopOption.classList.toggle("is-hidden", !canSkip);

  if (!canSkip) {
    skipWorkshopCheckbox.checked = false;
  }
}

function limitToTwoFranges(data) {
  return {
    ...data,
    franges: Array.isArray(data?.franges) ? data.franges.slice(0, 2) : [],
  };
}

function sanitizeSelected() {
  if (!state.data || !Array.isArray(state.data.franges)) {
    state.selected = {};
    return;
  }
  const validFranges = new Set(state.data.franges.map((franja) => franja.nom));
  const entries = Object.entries(state.selected).filter(([franja]) =>
    validFranges.has(franja)
  );

  if (entries.length <= 1) {
    state.selected = Object.fromEntries(entries);
    return;
  }

  const [lastFranja, lastTaller] = entries[entries.length - 1];
  state.selected = { [lastFranja]: lastTaller };
}

function availabilityClass(available, total) {
  const ratio = total === 0 ? 0 : available / total;
  if (ratio >= 0.6) return "availability--high";
  if (ratio >= 0.25) return "availability--mid";
  return "availability--low";
}

function normalizedText(value, fallback = "No informat") {
  const text = String(value || "").trim();
  return text || fallback;
}

function franjaLabel(franjaNom, index) {
  const normalized = String(franjaNom || "").toLowerCase();
  if (normalized.includes("1a")) return "10:00  Tallers - 1a Franja";
  if (normalized.includes("2a")) return "12:00  Tallers - 2a Franja";
  return `${String(index + 1).padStart(2, "0")}:00  Tallers`;
}

function franjaTimeRange(franjaNom, index) {
  const normalized = String(franjaNom || "").toLowerCase();
  if (normalized.includes("1a")) return "10:00-11:30";
  if (normalized.includes("2a")) return "12:00-13:30";
  return `${String(9 + index * 2).padStart(2, "0")}:00-${String(10 + index * 2).padStart(2, "0")}:30`;
}

function isGoogleDriveUrl(url) {
  return /(^https?:\/\/)?(www\.)?drive\.google\.com/i.test(String(url || "").trim());
}

function extractDriveId(url) {
  const value = String(url || "").trim();
  if (!value || !isGoogleDriveUrl(value)) return "";
  const byPath = value.match(/\/file\/d\/([^/]+)/);
  if (byPath && byPath[1]) return byPath[1];
  const byIdParam = value.match(/[?&]id=([^&]+)/);
  if (byIdParam && byIdParam[1]) return byIdParam[1];
  const byUcPath = value.match(/\/uc\?.*id=([^&]+)/);
  if (byUcPath && byUcPath[1]) return byUcPath[1];
  return "";
}

function buildImageCandidates(rawUrl) {
  const value = String(rawUrl || "").trim();
  if (!value) return [];

  if (!isGoogleDriveUrl(value)) {
    return [value];
  }

  const driveId = extractDriveId(value);
  if (!driveId) {
    return [value];
  }

  return [
    `https://drive.google.com/thumbnail?id=${driveId}&sz=w1200`,
    `https://drive.google.com/uc?export=view&id=${driveId}`,
    `https://drive.google.com/uc?export=download&id=${driveId}`,
  ];
}

function setModalImage(imgElement, src, altText, hideWhenMissing = false) {
  const candidates = buildImageCandidates(src);
  const placeholder =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 400'>" +
        "<rect width='100%' height='100%' fill='#f2f5f8'/>" +
        "<text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#6d7d85' font-family='Arial' font-size='20'>Imatge no disponible</text>" +
      "</svg>"
    );

  if (candidates.length === 0) {
    if (hideWhenMissing) {
      imgElement.classList.add("is-hidden");
      imgElement.removeAttribute("src");
      imgElement.onerror = null;
      return false;
    }
    imgElement.classList.remove("is-hidden");
    imgElement.src = placeholder;
    imgElement.onerror = null;
    return true;
  }

  let index = 0;
  imgElement.onerror = () => {
    index += 1;
    if (index >= candidates.length) {
      if (hideWhenMissing) {
        imgElement.classList.add("is-hidden");
        imgElement.removeAttribute("src");
        imgElement.onerror = null;
        return;
      }
      imgElement.classList.remove("is-hidden");
      imgElement.src = placeholder;
      imgElement.onerror = null;
      return;
    }
    imgElement.src = candidates[index];
  };

  imgElement.classList.remove("is-hidden");
  imgElement.src = candidates[index];
  imgElement.alt = altText;
  return true;
}

function openWorkshopInfo(taller) {
  modalTitle.textContent = normalizedText(taller.nom, "Taller");
  modalImparteix.textContent = normalizedText(taller.imparteix);
  modalDispositiu.textContent = normalizedText(taller.dispositiuTecnologia);
  modalDescripcio.textContent = normalizedText(taller.descripcio);
  modalMaterial.textContent = normalizedText(taller.materialNecessari);
  modalEtapa.textContent = normalizedText(taller.etapaEducativa);
  modalAula.textContent = normalizedText(taller.aula);

  const hasFoto1 = setModalImage(modalFoto1, taller.foto1Url, "Foto ponent 1", true);
  const hasFoto2 = setModalImage(modalFoto2, taller.foto2Url, "Foto ponent 2", true);
  if (modalPeoplePhotos) {
    modalPeoplePhotos.classList.toggle("is-hidden", !hasFoto1 && !hasFoto2);
  }
  setModalImage(
    modalDispositiuImg,
    taller.imatgeDispositiuUrl,
    "Imatge del dispositiu o tecnologia"
  );

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeWorkshopInfo() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function getLoadErrorPanel() {
  if (loadErrorPanel) {
    return loadErrorPanel;
  }

  const panel = document.createElement("div");
  panel.className = "load-error-panel is-hidden";
  panel.innerHTML = `
    <div class="load-error-panel__badge">Atenció</div>
    <h3 class="load-error-panel__title">Els tallers no s'han carregat correctament</h3>
    <p class="load-error-panel__text">
      Si veus aquest avís, no continuïs amb aquesta finestra. Obre el formulari en una
      <strong class="load-error-panel__highlight">finestra d'incògnit</strong> per carregar les dades reals.
    </p>
    <div class="load-error-panel__actions">
      <button type="button" class="load-error-panel__button">
        Copia la URL
      </button>
    </div>
  `;

  const actionButton = panel.querySelector(".load-error-panel__button");
  actionButton.addEventListener("click", async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      actionButton.textContent = "URL copiada";
      setTimeout(() => {
        actionButton.textContent = "Copia la URL";
      }, 1800);
    } catch (error) {
      window.prompt("Copia aquesta URL i obre-la en una finestra d'incògnit:", url);
    }
  });

  workshopsSection.parentNode.insertBefore(panel, workshopsSection);
  loadErrorPanel = panel;
  return loadErrorPanel;
}

function toggleLoadErrorPanel(show) {
  const panel = getLoadErrorPanel();
  panel.classList.toggle("is-hidden", !show);
}

function render() {
  syncSkipWorkshopOption();

  if (!state.data || !Array.isArray(state.data.franges)) {
    container.innerHTML = "";
    workshopsSection.classList.toggle("is-hidden", state.loadError);
    actionsSection.classList.toggle("is-hidden", state.loadError);
    toggleLoadErrorPanel(state.loadError);
    validateForm();
    return;
  }

  sanitizeSelected();
  container.innerHTML = "";
  toggleLoadErrorPanel(false);
  actionsSection.classList.remove("is-hidden");
  workshopsSection.classList.remove("is-hidden");

  state.data.franges.forEach((franja, franjaIndex) => {
    const franjaEl = document.createElement("section");
    franjaEl.className = "franja";

    const title = document.createElement("h3");
    title.className = "franja__title";
    title.textContent = franjaLabel(franja.nom, franjaIndex);
    franjaEl.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "taller-grid";

    franja.tallers.forEach((taller) => {
      const card = document.createElement("div");
      card.className = "taller-card";
      card.dataset.franja = franja.nom;
      card.dataset.tallerId = taller.id;

      const selectedId = state.selected[franja.nom];
      if (selectedId === taller.id) {
        card.classList.add("selected");
      }

      const disabled = taller.placesDisponibles <= 0;
      if (disabled) {
        card.classList.add("disabled");
      }

      const header = document.createElement("div");
      header.className = "taller-card__header";

      const meta = document.createElement("div");
      meta.className = "taller-card__meta";
      meta.textContent = franjaTimeRange(franja.nom, franjaIndex);

      const name = document.createElement("div");
      name.className = "taller-name";
      name.textContent = taller.nom;

      const infoButton = document.createElement("button");
      infoButton.type = "button";
      infoButton.className = "taller-info-button";
      infoButton.title = "Més informació del taller";
      infoButton.setAttribute("aria-label", `Més informació del taller ${taller.nom}`);
      infoButton.textContent = "i";
      infoButton.addEventListener("click", (event) => {
        event.stopPropagation();
        openWorkshopInfo(taller);
      });

      const availabilityState = availabilityClass(
        taller.placesDisponibles,
        taller.placesTotals
      );

      const availability = document.createElement("div");
      availability.className = `availability ${availabilityState}`;
      availability.textContent =
        taller.placesDisponibles <= 0 ? "Places exhaurides" : "Places disponibles";

      const availabilityRatio =
        taller.placesTotals > 0
          ? Math.max(0, Math.min(1, taller.placesDisponibles / taller.placesTotals))
          : 0;
      const availabilityPercent = Math.round(availabilityRatio * 100);

      const progress = document.createElement("div");
      progress.className = "availability-progress";

      const topRow = document.createElement("div");
      topRow.className = "taller-card__topline";
      topRow.appendChild(meta);

      const titleWrap = document.createElement("div");
      titleWrap.className = "taller-card__titlewrap";
      titleWrap.appendChild(name);
      titleWrap.appendChild(infoButton);

      header.appendChild(topRow);
      header.appendChild(titleWrap);
      card.appendChild(header);
      card.appendChild(availability);
      card.appendChild(progress);

      card.addEventListener("click", () => handleSelect(franja.nom, taller));

      grid.appendChild(card);
    });

    franjaEl.appendChild(grid);
    container.appendChild(franjaEl);
  });

  validateForm();
}

function handleSelect(franjaNom, taller) {
  if (taller.placesDisponibles <= 0) return;

  if (skipWorkshopCheckbox) {
    skipWorkshopCheckbox.checked = false;
  }

  const alreadySelected = state.selected[franjaNom] === taller.id;
  if (alreadySelected) {
    delete state.selected[franjaNom];
  } else {
    state.selected = { [franjaNom]: taller.id };
  }

  message.textContent = "";
  render();
}

function getSelections() {
  return Object.entries(state.selected).map(([franja, tallerId]) => {
    const taller = state.data.franges
      .find((f) => f.nom === franja)
      ?.tallers.find((t) => t.id === tallerId);

    return {
      franja,
      tallerId,
      tallerNom: taller ? taller.nom : "",
    };
  });
}

function validateForm() {
  if (Date.now() < successMessageUntil) {
    message.textContent = "Enviat correctament.";
    message.classList.remove("form-message--error", "form-message--warning");
    message.classList.add("form-message--success");
    confirmButton.disabled = true;
    return;
  }

  const email = form.elements.email.value.trim();
  const emailOk = Boolean(email);
  const rolOk = form.elements.rol.value.trim();
  const requiredFilled =
    form.elements.nom.value.trim() &&
    form.elements.centre.value.trim() &&
    form.elements.localitat.value.trim() &&
    emailOk &&
    rolOk;

  const dataReady = Boolean(state.data && Array.isArray(state.data.franges));
  const selectionsOk =
    Object.keys(state.selected).length >= 1 || isSkippingWorkshopSelection();

  message.classList.remove("form-message--error", "form-message--warning", "form-message--success");

  if (state.loadError) {
    message.textContent =
      "No s'han pogut carregar els tallers reals. Prova en finestra d'incògnit o en un altre navegador.";
    message.classList.add("form-message--error");
  } else if (state.submitting) {
    message.textContent = "Enviant inscripció...";
    message.classList.add("form-message--warning");
  } else if (state.emailChecking) {
    message.textContent = "Comprovant si ja estàs inscrit...";
    message.classList.add("form-message--warning");
  } else if (state.emailExists) {
    message.textContent =
      "Aquest correu ja està inscrit. Si vols canviar alguna dada o la teva inscripció, contacta amb l'organització.";
    message.classList.add("form-message--error");
  } else if (canSkipWorkshopSelection() && !isSkippingWorkshopSelection() && !Object.keys(state.selected).length) {
    message.textContent = "Pots escollir 1 taller o marcar l'opció \"No faré cap taller\".";
    message.classList.add("form-message--warning");
  } else {
    message.textContent = "";
  }

  confirmButton.disabled =
    !(requiredFilled && selectionsOk && dataReady) ||
    state.emailChecking ||
    state.emailExists ||
    state.submitting ||
    state.loadError;
}

function scheduleEmailCheck() {
  const email = form.elements.email.value.trim();
  if (!email) {
    state.emailChecking = false;
    state.emailExists = false;
    state.emailChecked = "";
    validateForm();
    return;
  }

  if (email === state.emailChecked) {
    validateForm();
    return;
  }

  if (emailCheckTimer) clearTimeout(emailCheckTimer);
  emailCheckTimer = setTimeout(() => checkEmailExists(email), 400);
}

function checkEmailExists(email) {
  state.emailChecking = true;
  state.emailExists = false;
  validateForm();

  const nonce = cacheNonce();
  const callbackName = `checkEmail_${nonce}`;
  const script = document.createElement("script");
  const sep = WEB_APP_URL.includes("?") ? "&" : "?";

  window[callbackName] = (data) => {
    state.emailChecking = false;
    state.emailExists = Boolean(data && data.exists);
    state.emailChecked = email;
    validateForm();
    delete window[callbackName];
    script.remove();
  };

  script.onerror = () => {
    state.emailChecking = false;
    state.emailExists = false;
    message.textContent =
      "No s'ha pogut validar el correu. Torna-ho a provar.";
    validateForm();
    delete window[callbackName];
    script.remove();
  };

  script.src = `${WEB_APP_URL}${sep}checkEmail=${encodeURIComponent(
    email
  )}&callback=${callbackName}&_ts=${nonce}`;

  document.body.appendChild(script);
}

function loadData() {
  if (WEB_APP_URL === "PENDENT_WEB_APP_URL") {
    state.data = null;
    state.loadError = true;
    message.textContent =
      "Falta configurar el Web App. Actualitza l'URL abans de publicar el formulari.";
    render();
    return;
  }

  state.loadError = false;
  message.textContent = "Carregant places disponibles...";

  const nonce = cacheNonce();
  const callbackName = `loadDataCallback_${nonce}`;
  let timeoutId = null;

  window[callbackName] = (data) => {
    if (!data || !data.franges) {
      message.textContent =
        "Resposta no vàlida del servidor. Comprova el desplegament.";
      state.data = null;
      state.loadError = true;
      render();
    } else {
      state.data = limitToTwoFranges(data);
      state.loadError = false;
      message.textContent = "";
      render();
    }
    if (timeoutId) clearTimeout(timeoutId);
    delete window[callbackName];
    script.remove();
  };

  const script = document.createElement("script");
  const sep = WEB_APP_URL.includes("?") ? "&" : "?";
  script.src = `${WEB_APP_URL}${sep}callback=${callbackName}&_ts=${nonce}`;
  script.onerror = () => {
    message.textContent =
      "No s'han pogut carregar els tallers reals. Prova en finestra d'incògnit o en un altre navegador.";
    state.data = null;
    state.loadError = true;
    render();
    if (timeoutId) clearTimeout(timeoutId);
    delete window[callbackName];
    script.remove();
  };

  timeoutId = setTimeout(() => {
    message.textContent =
      "El servidor no ha respost. Prova en finestra d'incògnit o en un altre navegador.";
    state.data = null;
    state.loadError = true;
    render();
    delete window[callbackName];
    script.remove();
  }, 15000);

  document.body.appendChild(script);
}

function postForm(payload) {
  const iframeName = "hidden-submit";
  let iframe = document.getElementById(iframeName);
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = iframeName;
    iframe.name = iframeName;
    iframe.style.display = "none";
    document.body.appendChild(iframe);
  }

  if (pendingSubmit) {
    pendingSubmit.reject(new Error("Ja hi ha una inscripció en curs."));
    clearTimeout(pendingSubmit.timeoutId);
    pendingSubmit = null;
  }

  return new Promise((resolve, reject) => {
    const requestId = cacheNonce();
    const tempForm = document.createElement("form");
    tempForm.method = "POST";
    tempForm.action = WEB_APP_URL;
    tempForm.target = iframeName;

    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "payload";
    input.value = JSON.stringify({ ...payload, requestId });

    tempForm.appendChild(input);
    document.body.appendChild(tempForm);

    pendingSubmit = {
      requestId,
      resolve,
      reject,
      timeoutId: setTimeout(() => {
        pendingSubmit = null;
        reject(new Error("El servidor no ha confirmat la inscripció. Torna-ho a provar."));
      }, 15000),
    };

    tempForm.submit();
    tempForm.remove();
  });
}

function handleSubmitMessage(event) {
  const data = event.data;
  if (!pendingSubmit || !data || data.type !== "jpre-submit-result") {
    return;
  }
  if (String(data.requestId || "") !== pendingSubmit.requestId) {
    return;
  }

  const { resolve, reject, timeoutId } = pendingSubmit;
  pendingSubmit = null;
  clearTimeout(timeoutId);

  if (data.ok) {
    resolve(data);
    return;
  }

  reject(new Error(data.message || "No s'ha pogut completar la inscripció."));
}

form.addEventListener("input", (event) => {
  if (event.target.name === "email") {
    scheduleEmailCheck();
  }
  if (event.target.name === "rol" && state.data) {
    syncSkipWorkshopOption();
    render();
    return;
  }
  validateForm();
});

if (skipWorkshopCheckbox) {
  skipWorkshopCheckbox.addEventListener("change", () => {
    if (skipWorkshopCheckbox.checked) {
      state.selected = {};
    }
    render();
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "";
  message.classList.remove("form-message--error", "form-message--warning", "form-message--success");

  if (confirmButton.disabled) {
    message.textContent = "Revisa les dades abans de confirmar.";
    message.classList.add("form-message--warning");
    return;
  }

  const payload = {
    nom: form.elements.nom.value.trim(),
    centre: form.elements.centre.value.trim(),
    localitat: form.elements.localitat.value.trim(),
    email: form.elements.email.value.trim(),
    rol: form.elements.rol.value.trim(),
    senseTaller: isSkippingWorkshopSelection(),
    seleccions: getSelections(),
  };

  try {
    state.submitting = true;
    validateForm();
    const result = await postForm(payload);
    state.submitting = false;
    successMessageUntil = Date.now() + 1200;
    message.textContent = "Enviat correctament.";
    message.classList.remove("form-message--error", "form-message--warning");
    message.classList.add(
      result && result.emailSent === false ? "form-message--warning" : "form-message--success"
    );
    form.reset();
    state.selected = {};
    state.emailChecked = "";
    state.emailExists = false;
    if (skipWorkshopCheckbox) {
      skipWorkshopCheckbox.checked = false;
    }
    if (state.data) {
      render();
    }
    setTimeout(() => {
      successMessageUntil = 0;
      loadData();
    }, 1200);
  } catch (error) {
    message.textContent =
      error && error.message
        ? error.message
        : "Error en enviar la inscripció. Torna-ho a provar.";
    message.classList.remove("form-message--success", "form-message--warning");
    message.classList.add("form-message--error");
  } finally {
    if (Date.now() >= successMessageUntil) {
      state.submitting = false;
    }
    validateForm();
  }
});

modalCloseButton.addEventListener("click", closeWorkshopInfo);

modal.addEventListener("click", (event) => {
  const closeTarget = event.target.closest("[data-close-modal='true']");
  if (closeTarget) {
    closeWorkshopInfo();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal.classList.contains("is-open")) {
    closeWorkshopInfo();
  }
});

window.addEventListener("message", handleSubmitMessage);

loadData();
