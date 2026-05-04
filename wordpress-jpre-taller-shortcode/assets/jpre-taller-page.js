(function () {
  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function cacheNonce() {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function jsonp(url, params) {
    return new Promise((resolve, reject) => {
      const nonce = cacheNonce();
      const callbackName = `jpreWpJsonp_${nonce}`;
      const sep = url.includes("?") ? "&" : "?";
      const query = new URLSearchParams({
        ...params,
        callback: callbackName,
        _ts: nonce,
      }).toString();
      const script = document.createElement("script");
      script.src = `${url}${sep}${query}`;

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

  function availabilityState(available, total) {
    const ratio = total === 0 ? 0 : available / total;
    if (ratio >= 0.6) return "high";
    if (ratio >= 0.25) return "mid";
    return "low";
  }

  function driveCandidates(url) {
    const value = String(url || "").trim();
    if (!value) return [];
    const byPath = value.match(/\/file\/d\/([^/]+)/);
    const byId = value.match(/[?&]id=([^&]+)/);
    const id = (byPath && byPath[1]) || (byId && byId[1]) || "";
    if (!id) return [value];
    return [
      `https://drive.google.com/thumbnail?id=${id}&sz=w1200`,
      `https://drive.google.com/uc?export=view&id=${id}`,
      `https://drive.google.com/uc?export=download&id=${id}`,
    ];
  }

  function setImage(img, src) {
    const candidates = driveCandidates(src);
    if (!candidates.length) {
      img.classList.add("is-hidden");
      img.removeAttribute("src");
      return false;
    }

    let idx = 0;
    img.onerror = () => {
      idx += 1;
      if (idx >= candidates.length) {
        img.classList.add("is-hidden");
        img.removeAttribute("src");
        img.onerror = null;
        return;
      }
      img.src = candidates[idx];
    };

    img.classList.remove("is-hidden");
    img.src = candidates[idx];
    return true;
  }

  function flattenFranges(data) {
    const rows = [];
    (data.franges || []).forEach((franja) => {
      (franja.tallers || []).forEach((taller) => {
        rows.push({ ...taller, franja: franja.nom });
      });
    });
    return rows;
  }

  function toEmbedUrl(url) {
    const v = String(url || "").trim();
    if (!v) return "";
    const ytWatch = v.match(/[?&]v=([^&]+)/);
    const ytShort = v.match(/youtu\.be\/([^?&]+)/);
    const ytEmbed = v.match(/youtube\.com\/embed\/([^?&]+)/);
    const ytId = (ytWatch && ytWatch[1]) || (ytShort && ytShort[1]) || (ytEmbed && ytEmbed[1]);
    if (ytId) return `https://www.youtube.com/embed/${ytId}`;
    const vimeo = v.match(/vimeo\.com\/(\d+)/);
    if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
    const gdrive = v.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (gdrive) return `https://drive.google.com/file/d/${gdrive[1]}/preview`;
    return v;
  }

  function text(value, fallback) {
    const v = String(value || "").trim();
    return v || fallback;
  }

  function initCard(root) {
    const webAppUrl = root.dataset.webappUrl || "";
    const targetNum = String(root.dataset.num || "").trim();
    const targetId = String(root.dataset.tallerId || "").trim();
    const targetNom = String(root.dataset.tallerNom || "").trim();
    const targetFranja = String(root.dataset.franja || "").trim();

    const el = {
      title: root.querySelector(".jpre-title"),
      chipFranja: root.querySelector(".jpre-chip-franja"),
      chipEtapa: root.querySelector(".jpre-chip-etapa"),
      chipAula: root.querySelector(".jpre-chip-aula"),
      loading: root.querySelector(".jpre-loading"),
      error: root.querySelector(".jpre-error"),
      main: root.querySelector(".jpre-main"),
      descripcio: root.querySelector(".jpre-descripcio"),
      places: root.querySelector(".jpre-places"),
      progressBar: root.querySelector(".jpre-progress-bar"),
      progressLabel: root.querySelector(".jpre-progress-label"),
      imparteix: root.querySelector(".jpre-imparteix"),
      foto1: root.querySelector(".jpre-foto-1"),
      foto2: root.querySelector(".jpre-foto-2"),
      photosWrap: root.querySelector(".jpre-photos"),
      dispositiu: root.querySelector(".jpre-dispositiu"),
      deviceImg: root.querySelector(".jpre-device-img"),
      material: root.querySelector(".jpre-material"),
      videoWrap: root.querySelector(".jpre-video-wrap"),
      videoIframe: root.querySelector(".jpre-video-iframe"),
    };

    function showError(msg) {
      el.loading.classList.add("is-hidden");
      el.main.classList.add("is-hidden");
      el.error.textContent = msg;
      el.error.classList.remove("is-hidden");
    }

    function findTaller(allTallers) {
      if (targetNum) {
        const byNum = allTallers.find((t) => String(t.num || "").trim() === targetNum);
        if (byNum) return byNum;
      }

      if (targetId) {
        const byId = allTallers.find((t) => String(t.id || "").trim() === targetId);
        if (byId) return byId;
      }

      if (!targetNom) return null;
      const nomN = normalize(targetNom);
      const franjaN = normalize(targetFranja);
      const exact = allTallers.find(
        (t) =>
          normalize(t.nom) === nomN &&
          (!franjaN || normalize(t.franja) === franjaN)
      );
      if (exact) return exact;

      return (
        allTallers.find(
          (t) =>
            normalize(t.nom).includes(nomN) &&
            (!franjaN || normalize(t.franja) === franjaN)
        ) || null
      );
    }

    function render(taller) {
      el.title.textContent = text(taller.nom, "Taller");
      el.chipFranja.textContent = `Franja: ${text(taller.franja, "No informat")}`;
      el.chipEtapa.textContent = `Etapa: ${text(taller.etapaEducativa, "No informada")}`;
      el.chipAula.textContent = `Aula: ${text(taller.aula, "No informada")}`;

      el.descripcio.textContent = text(taller.descripcio, "No informat");
      el.imparteix.textContent = text(taller.imparteix, "No informat");
      el.dispositiu.textContent = text(taller.dispositiuTecnologia, "No informat");
      el.material.textContent = text(taller.materialNecessari, "No informat");

      const placesDisponibles = Number(taller.placesDisponibles || 0);
      const placesTotals = Number(taller.placesTotals || 0);
      const ratio =
        placesTotals > 0 ? Math.max(0, Math.min(1, placesDisponibles / placesTotals)) : 0;
      const pct = Math.round(ratio * 100);
      const state = availabilityState(placesDisponibles, placesTotals);

      el.places.textContent = `Places disponibles: ${placesDisponibles}`;
      el.progressBar.style.width = `${pct}%`;
      el.progressBar.className = `jpre-progress-bar ${state}`;
      el.progressLabel.textContent = `${pct}%`;
      el.progressLabel.className = `jpre-progress-label ${state}`;

      const has1 = setImage(el.foto1, taller.foto1Url);
      const has2 = setImage(el.foto2, taller.foto2Url);
      if (!has1 && !has2) el.photosWrap.classList.add("is-hidden");
      else el.photosWrap.classList.remove("is-hidden");

      setImage(el.deviceImg, taller.imatgeDispositiuUrl);

      const embedUrl = toEmbedUrl(taller.videoUrl);
      if (embedUrl && el.videoWrap && el.videoIframe) {
        el.videoIframe.src = embedUrl;
        el.videoWrap.classList.remove("is-hidden");
      } else if (el.videoWrap) {
        el.videoWrap.classList.add("is-hidden");
      }

      el.loading.classList.add("is-hidden");
      el.error.classList.add("is-hidden");
      el.main.classList.remove("is-hidden");
    }

    async function run() {
      if (!webAppUrl) {
        showError("Falta data-webapp-url al shortcode.");
        return;
      }

      try {
        const data = await jsonp(webAppUrl, {});
        if (!data || !Array.isArray(data.franges)) {
          showError("Resposta no vàlida del servidor.");
          return;
        }

        const tallers = flattenFranges(data);
        const taller = findTaller(tallers);
        if (!taller) {
          showError("No s'ha trobat el taller. Revisa num del shortcode.");
          return;
        }
        render(taller);
      } catch (error) {
        console.error(error);
        showError("No s'ha pogut carregar la fitxa del taller.");
      }
    }

    run();
  }

  function boot() {
    document.querySelectorAll(".jpre-taller-page").forEach((root) => {
      if (root.dataset.jpreInitDone === "1") return;
      root.dataset.jpreInitDone = "1";
      initCard(root);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  setTimeout(boot, 300);
})();
