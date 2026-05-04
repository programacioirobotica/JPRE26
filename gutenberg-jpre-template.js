(function () {
  const WEB_APP_URL =
    "https://script.google.com/macros/s/AKfycbwnlk1OhghSo_PCC5xXZnqKqc7TVUZFJrexK-PxSCxp0ODWSA0ebfV0XKThSxDFFi7h/exec";

  const root = document.getElementById("jpre-gutenberg-root");
  if (!root) return;

  const container = root.querySelector("#jpre-workshop-container");
  const form = root.querySelector("#jpre-form");
  const confirmButton = root.querySelector("#jpre-confirm");
  const message = root.querySelector("#jpre-msg");

  const state = {
    data: null,
    selected: {},
  };

  function cacheNonce() {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function availabilityClass(available, total) {
    const ratio = total === 0 ? 0 : available / total;
    if (ratio >= 0.6) return "high";
    if (ratio >= 0.25) return "mid";
    return "low";
  }

  function jsonp(params) {
    return new Promise((resolve, reject) => {
      const nonce = cacheNonce();
      const callbackName = `jpreJsonp_${nonce}`;
      const sep = WEB_APP_URL.includes("?") ? "&" : "?";
      const query = new URLSearchParams({
        ...params,
        callback: callbackName,
        _ts: nonce,
      }).toString();

      const script = document.createElement("script");
      script.src = `${WEB_APP_URL}${sep}${query}`;

      window[callbackName] = (data) => {
        delete window[callbackName];
        script.remove();
        resolve(data);
      };

      script.onerror = () => {
        delete window[callbackName];
        script.remove();
        reject(new Error("Error carregant dades"));
      };

      document.body.appendChild(script);
    });
  }

  function validateForm() {
    const requiredFilled =
      form.elements.nom.value.trim() &&
      form.elements.centre.value.trim() &&
      form.elements.localitat.value.trim() &&
      form.elements.email.value.trim() &&
      form.elements.rol.value.trim();

    const hasSelection = Object.keys(state.selected).length === 1;
    confirmButton.disabled = !(requiredFilled && hasSelection);
  }

  function handleSelect(franjaNom, taller) {
    if (taller.placesDisponibles <= 0) return;
    const already = state.selected[franjaNom] === taller.id;
    state.selected = already ? {} : { [franjaNom]: taller.id };
    render();
  }

  function render() {
    container.innerHTML = "";
    const franges = (state.data && state.data.franges ? state.data.franges : []).slice(0, 2);

    franges.forEach((franja) => {
      const franjaEl = document.createElement("section");
      franjaEl.className = "jpre-franja";

      const title = document.createElement("h3");
      title.className = "jpre-franja-title";
      title.textContent = franja.nom;
      franjaEl.appendChild(title);

      const grid = document.createElement("div");
      grid.className = "jpre-taller-grid";

      franja.tallers.forEach((taller) => {
        const card = document.createElement("article");
        card.className = "jpre-taller-card";
        if (state.selected[franja.nom] === taller.id) card.classList.add("selected");

        const header = document.createElement("div");
        header.className = "jpre-taller-header";

        const name = document.createElement("div");
        name.className = "jpre-taller-name";
        name.textContent = taller.nom;

        const infoBtn = document.createElement("button");
        infoBtn.className = "jpre-info-btn";
        infoBtn.type = "button";
        infoBtn.textContent = "i";
        infoBtn.title = "Més informació";
        infoBtn.addEventListener("click", (event) => {
          event.stopPropagation();
          const info = [
            `Imparteix: ${taller.imparteix || "No informat"}`,
            `Dispositiu/tecnologia: ${taller.dispositiuTecnologia || "No informat"}`,
            `Etapa educativa: ${taller.etapaEducativa || "No informat"}`,
            `Aula: ${taller.aula || "No informat"}`,
            `Descripció: ${taller.descripcio || "No informat"}`,
            `Material necessari: ${taller.materialNecessari || "No informat"}`,
          ].join("\n\n");
          window.alert(info);
        });

        header.appendChild(name);
        header.appendChild(infoBtn);

        const availabilityState = availabilityClass(
          taller.placesDisponibles,
          taller.placesTotals
        );
        const availability = document.createElement("div");
        availability.className = `jpre-availability ${availabilityState}`;
        availability.textContent = `Places disponibles: ${taller.placesDisponibles}`;

        const ratio =
          taller.placesTotals > 0
            ? Math.max(0, Math.min(1, taller.placesDisponibles / taller.placesTotals))
            : 0;
        const percent = Math.round(ratio * 100);

        const progress = document.createElement("div");
        progress.className = "jpre-progress";

        const track = document.createElement("div");
        track.className = "jpre-progress-track";

        const bar = document.createElement("div");
        bar.className = `jpre-progress-bar ${availabilityState}`;
        bar.style.width = `${percent}%`;

        const pct = document.createElement("div");
        pct.className = `jpre-progress-label ${availabilityState}`;
        pct.textContent = `${percent}%`;

        track.appendChild(bar);
        progress.appendChild(track);
        progress.appendChild(pct);

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

  async function loadData() {
    message.textContent = "Carregant tallers...";
    try {
      const data = await jsonp({});
      if (!data || !Array.isArray(data.franges)) {
        throw new Error("Resposta no vàlida");
      }
      state.data = data;
      message.textContent = "";
      render();
    } catch (error) {
      message.textContent = "No s'han pogut carregar els tallers.";
      console.error(error);
    }
  }

  form.addEventListener("input", validateForm);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (confirmButton.disabled) {
      message.textContent = "Completa les dades i selecciona un taller.";
      return;
    }
    message.textContent =
      "Plantilla carregada. Connecta aquest formulari al teu endpoint de registre per enviar dades.";
  });

  loadData();
})();
