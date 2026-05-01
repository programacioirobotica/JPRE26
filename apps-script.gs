/**
 * Apps Script per al full de Google Sheets.
 * 1) Crea un full amb dues pestanyes: "Tallers" i "Inscripcions".
 * 2) Omple "Tallers" amb les columnes:
 *    A: Num | B: Franja | C: Taller | D: PlacesDisponibles
 *    E: Imparteix | F: Foto1URL | G: Foto2URL
 *    H: DispositiuTecnologia | I: ImatgeDispositiuURL
 *    J: Descripcio | K: MaterialNecessari | L: Etapa | M: Aula
 * 3) Desa el full i copia la seva ID.
 * 4) Enganxa la ID a la constant SHEET_ID.
 * 5) Implementa com a Web App (Executa com: tu mateix | Accés: Qualsevol amb l’enllaç).
 */

const SHEET_ID = "10KUk3pRtlypRuOQeWustrGwow1reWi-pbjERv99nv5w";
const TALLERS_SHEET = "Tallers";
const INSCRIPCIONS_SHEET = "Inscripcions";
const SUPPORT_EMAIL = "programacioirobotica@xtec.cat";
const GOOGLE_CLIENT_IDS = ["PENDENT_GOOGLE_CLIENT_ID"];
const JOURNEY_LOGO_URL = "https://drive.google.com/uc?export=view&id=11MNaV6-7V1F5GjYR2ceF2u8KjYAMJzWd";
const FOOTER_LOGO_URL = "https://drive.google.com/uc?export=view&id=1mfKOJqcuxhFkDc3oJZw1Z8kHa1ijMl-b";
const JOURNEY_LOGO_FILE_ID = "11MNaV6-7V1F5GjYR2ceF2u8KjYAMJzWd";
const FOOTER_LOGO_FILE_ID = "1mfKOJqcuxhFkDc3oJZw1Z8kHa1ijMl-b";

function doGet(e) {
  if (e && e.parameter && e.parameter.checkEmail) {
    const exists = emailExists(String(e.parameter.checkEmail).trim());
    return jsonOrJsonp({ exists }, e);
  }

  if (e && e.parameter && e.parameter.profileEmail) {
    const result = getAppProfileByEmail(String(e.parameter.profileEmail).trim());
    return jsonOrJsonp(result, e);
  }

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const tallersSheet = ss.getSheetByName(TALLERS_SHEET);
  const range = tallersSheet.getDataRange();
  const data = range.getValues();
  const richData = range.getRichTextValues();
  const headers = (data.shift() || []).map((h) => normalizeHeader(h));
  richData.shift();
  const rows = data.filter((row) => {
    const franja = getCellByHeader(headers, row, ["franja"], row[1]);
    const taller = getCellByHeader(headers, row, ["taller", "nom"], row[2]);
    return String(franja || "").trim() && String(taller || "").trim();
  });
  const tallers = rows.map((row, idx) => {
    const rowRich = richData[idx] || [];
    return {
      rowIndex: idx + 2,
      num: String(getCellByHeader(headers, row, ["num", "numero", "n"], row[0])).trim(),
      franja:
        String(getCellByHeader(headers, row, ["franja"], row[1]) || "").trim() ||
        "Franja",
      nom: String(getCellByHeader(headers, row, ["taller", "nom"], row[2]) || "").trim(),
      placesDisponibles: parsePlaces(
        getCellByHeader(
          headers,
          row,
          ["placesdisponibles", "places", "placeslliures"],
          row[3]
        )
      ),
      imparteix: String(
        getCellByHeader(headers, row, ["imparteix", "ponent", "persones"], "")
      ).trim(),
      foto1Url: normalizeImageUrl(
        getUrlCellByHeader(headers, row, rowRich, ["foto1url", "foto1", "foto_1"], "")
      ),
      foto2Url: normalizeImageUrl(
        getUrlCellByHeader(headers, row, rowRich, ["foto2url", "foto2", "foto_2"], "")
      ),
      dispositiuTecnologia: String(
        getCellByHeader(
          headers,
          row,
          ["dispositiutecnologia", "dispositiu", "tecnologia"],
          ""
        )
      ).trim(),
      imatgeDispositiuUrl: normalizeImageUrl(
        getUrlCellByHeader(
          headers,
          row,
          rowRich,
          ["imatgedispositiuurl", "imatgedispositiu", "imagetecnologia"],
          ""
        )
      ),
      descripcio: String(getCellByHeader(headers, row, ["descripcio", "descripció"], "")).trim(),
      materialNecessari: String(
        getCellByHeader(headers, row, ["materialnecessari", "material"], "")
      ).trim(),
      etapaEducativa: String(getCellByHeader(headers, row, ["etapa"], row[11])).trim(),
      aula: String(getCellByHeader(headers, row, ["aula"], row[12])).trim(),
      videoUrl: String(getCellByHeader(headers, row, ["videourl", "video"], "")).trim(),
    };
  });
  const ocupacions = getOcupacionsByTallerId();

  const franges = {};
  tallers.forEach((taller) => {
    if (!taller.nom) return;
    if (!franges[taller.franja]) {
      franges[taller.franja] = [];
    }
    const id = buildId(taller.franja, taller.nom);
    const ocupades = ocupacions[id] || 0;
    const placesTotals = Math.max(taller.placesDisponibles + ocupades, 1);
    franges[taller.franja].push({
      num: taller.num,
      id,
      nom: taller.nom,
      placesTotals,
      placesDisponibles: taller.placesDisponibles,
      imparteix: taller.imparteix,
      foto1Url: taller.foto1Url,
      foto2Url: taller.foto2Url,
      dispositiuTecnologia: taller.dispositiuTecnologia,
      imatgeDispositiuUrl: taller.imatgeDispositiuUrl,
      descripcio: taller.descripcio,
      materialNecessari: taller.materialNecessari,
      etapaEducativa: taller.etapaEducativa,
      aula: taller.aula,
      videoUrl: taller.videoUrl,
    });
  });

  const result = {
    franges: Object.keys(franges)
      .slice(0, 2)
      .map((key) => ({
        nom: key,
        tallers: franges[key],
      })),
  };

  return jsonOrJsonp(result, e);
}

function normalizeHeader(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function getCellByHeader(headers, row, aliases, fallbackValue) {
  for (var i = 0; i < aliases.length; i++) {
    var key = normalizeHeader(aliases[i]);
    var index = headers.indexOf(key);
    if (index >= 0) {
      return row[index];
    }
  }
  return fallbackValue;
}

function getHeaderIndex(headers, aliases) {
  for (var i = 0; i < aliases.length; i++) {
    var key = normalizeHeader(aliases[i]);
    var index = headers.indexOf(key);
    if (index >= 0) return index;
  }
  return -1;
}

function getUrlCellByHeader(headers, row, rowRich, aliases, fallbackValue) {
  var index = getHeaderIndex(headers, aliases);
  if (index < 0) return fallbackValue;

  var rich = rowRich[index];
  if (rich && typeof rich.getLinkUrl === "function") {
    var link = rich.getLinkUrl();
    if (link) return link;
  }

  var raw = row[index];
  return String(raw || "").trim() || fallbackValue;
}

function normalizeImageUrl(rawUrl) {
  var value = String(rawUrl || "").trim();
  if (!value) return "";
  var match = value.match(/\/file\/d\/([^/]+)\//);
  if (match && match[1]) {
    return "https://drive.google.com/uc?export=view&id=" + match[1];
  }
  return value;
}

function doPost(e) {
  if (e && e.parameter && e.parameter.googleCredential) {
    const result = loginWithGoogleCredential(String(e.parameter.googleCredential || "").trim());
    return iframeGoogleLoginResponse(result);
  }

  const raw = (e && e.parameter && e.parameter.payload) || "{}";
  const payload = JSON.parse(raw);
  const email = String(payload.email || "").trim();
  const rol = String(payload.rol || "").trim();
  const requestId = String(payload.requestId || "").trim();
  const isOrganization = isOrganizationRole(rol);
  const allowsEmptyWorkshopSelection = allowsEmptyWorkshopRole(rol);
  const wantsNoWorkshop = allowsEmptyWorkshopSelection && Boolean(payload.senseTaller);

  if (!rol) {
    return iframeSubmitResponse({
      ok: false,
      message: "Selecciona el teu rol de participació.",
      requestId,
    });
  }

  if (emailExists(email)) {
    return iframeSubmitResponse({
      ok: false,
      message: "Aquest correu ja està inscrit.",
      requestId,
    });
  }

  const seleccions = Array.isArray(payload.seleccions) ? payload.seleccions : [];
  if (!isOrganization && !wantsNoWorkshop && seleccions.length !== 1) {
    return iframeSubmitResponse({
      ok: false,
      message: "Has de seleccionar exactament 1 taller.",
      requestId,
    });
  }

  if (wantsNoWorkshop && seleccions.length > 0) {
    return iframeSubmitResponse({
      ok: false,
      message: "Si marques que no faràs cap taller, no pots seleccionar-ne cap.",
      requestId,
    });
  }

  const skipReservation = isOrganization || wantsNoWorkshop;
  const effectiveSeleccions = skipReservation ? [] : seleccions;
  const tallersMap = skipReservation ? {} : getTallersMap();

  for (var i = 0; i < effectiveSeleccions.length; i++) {
    var sel = effectiveSeleccions[i];
    var id = sel.tallerId;
    var taller = tallersMap[id];
    if (!taller) {
      return iframeSubmitResponse({
        ok: false,
        message: "Taller no vàlid.",
        requestId,
      });
    }
    if (taller.franja !== sel.franja) {
      return iframeSubmitResponse({
        ok: false,
        message: "Franja no vàlida.",
        requestId,
      });
    }
    if (taller.placesDisponibles <= 0) {
      return iframeSubmitResponse({
        ok: false,
        message: "No queden places en aquest taller.",
        requestId,
      });
    }
  }

  const reserveResult = skipReservation
    ? { ok: true, remaining: null, skippedReservation: true }
    : reserveWorkshopPlace(effectiveSeleccions[0].tallerId);
  if (!reserveResult.ok) {
    return iframeSubmitResponse({
      ok: false,
      message: reserveResult.message,
      requestId,
    });
  }

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(INSCRIPCIONS_SHEET);
  const detailedSeleccions = effectiveSeleccions.map((sel) => {
    const taller = tallersMap[sel.tallerId];
    if (!taller) return sel;
    return {
      ...sel,
      tallerNom: sel.tallerNom || taller.nom,
      aula: taller.aula || "",
    };
  });
  const selectionSummary = getSelectionSummary(detailedSeleccions, rol);

  sheet.appendRow([
    new Date(),
    payload.nom,
    payload.centre,
    payload.localitat,
    email,
    rol,
    selectionSummary.ids,
    selectionSummary.labels,
  ]);

  var emailSent = false;
  var emailErrorMessage = "";

  try {
    const branding = buildEmailBranding();
    const pdfBranding = buildPdfBranding(branding);
    const emailContent = buildConfirmationEmail(
      payload,
      detailedSeleccions,
      reserveResult,
      branding
    );
    const attachments = [];
    try {
      const cardPdfBlob = buildCardPdfAttachment(
        payload,
        detailedSeleccions,
        reserveResult,
        pdfBranding
      );
      attachments.push(cardPdfBlob);
    } catch (attachError) {
      Logger.log("No s'ha pogut generar l'adjunt PDF: " + attachError);
    }

    const mailOptions = {
      to: email,
      subject: "Confirmació d’inscripció #JPRE26",
      body: emailContent.text,
      htmlBody: emailContent.html,
      replyTo: SUPPORT_EMAIL,
    };
    if (attachments.length > 0) {
      mailOptions.attachments = attachments;
    }
    if (Object.keys(branding.inlineImages).length > 0) {
      mailOptions.inlineImages = branding.inlineImages;
    }
    MailApp.sendEmail(mailOptions);
    emailSent = true;
  } catch (error) {
    Logger.log("Error enviant correu de confirmació: " + error);
    emailErrorMessage = String(error || "");
  }

  return iframeSubmitResponse({
    ok: true,
    message: emailSent
      ? "Registre correcte. Rebràs un correu de confirmació en breu."
      : "La inscripció s'ha desat correctament, però no s'ha pogut enviar el correu de confirmació. Si us plau, contacta amb l'organització.",
    emailSent: emailSent,
    emailErrorMessage: emailErrorMessage,
    requestId,
  });
}

function isOrganizationRole(rol) {
  return normalizeHeader(rol) === "organitzacio";
}

function allowsEmptyWorkshopRole(rol) {
  const normalized = normalizeHeader(rol);
  return (
    normalized === "tallerista" ||
    normalized === "presentaciodexperiencies" ||
    normalized === "presentaciodeponencies"
  );
}

function getSelectionSummary(seleccions, rol) {
  const items = Array.isArray(seleccions) ? seleccions : [];
  if (items.length === 0) {
    if (isOrganizationRole(rol)) {
      return {
        ids: "",
        labels: "Organització (sense taller)",
        franja: "No aplica",
        taller: "Inscripció d'organització",
        aula: "No aplica",
      };
    }
    return {
      ids: "",
      labels: "",
      franja: "",
      taller: "",
      aula: "",
    };
  }

  const first = items[0] || {};
  return {
    ids: items.map((s) => s.tallerId).join(" | "),
    labels: items.map((s) => `${s.franja}: ${s.tallerNom || s.tallerId}`).join(" | "),
    franja: String(first.franja || "").trim(),
    taller: String(first.tallerNom || first.tallerId || "").trim(),
    aula: String(first.aula || "").trim(),
  };
}

function buildCardHtmlAttachment(payload, seleccions, reserveResult, branding) {
  const selectionSummary = getSelectionSummary(seleccions, payload.rol);
  const templateHtml = getEmailCardTemplateHtml();
  const nom = String(payload.nom || "").trim();
  const centre = String(payload.centre || "").trim();
  const localitat = String(payload.localitat || "").trim();
  const email = String(payload.email || "").trim();
  const rol = String(payload.rol || "").trim();
  const franja = selectionSummary.franja;
  const tallerNom = selectionSummary.taller;
  const aula = selectionSummary.aula;
  const transparentPixel =
    "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
  const topLogoSrc = JOURNEY_LOGO_URL || transparentPixel;
  const footerLogoSrc = FOOTER_LOGO_URL || transparentPixel;

  const html = fillTemplate(templateHtml, {
    NOM: escapeHtml(nom),
    CENTRE: escapeHtml(centre),
    LOCALITAT: escapeHtml(localitat),
    EMAIL: escapeHtml(email),
    ROL: escapeHtml(rol),
    FRANJA: escapeHtml(franja),
    TALLER: escapeHtml(tallerNom),
    AULA: escapeHtml(aula),
    SUPPORT_EMAIL: escapeHtml(SUPPORT_EMAIL),
    TOP_LOGO_SRC: escapeHtml(topLogoSrc),
    FOOTER_LOGO_SRC: escapeHtml(footerLogoSrc),
  });

  return Utilities.newBlob(
    html,
    "text/html",
    "Targeta_Inscripcio_JPRE26.html"
  );
}

function buildCardPdfAttachment(payload, seleccions, reserveResult, branding) {
  const html = buildCardPdfHtml(payload, seleccions, reserveResult, branding);
  const htmlBlob = Utilities.newBlob(
    html,
    "text/html",
    "Targeta_Inscripcio_JPRE26.html"
  );
  const pdfBlob = htmlBlob.getAs("application/pdf");
  pdfBlob.setName("Targeta_Inscripcio_JPRE26.pdf");
  return pdfBlob;
}

function buildPdfBranding(branding) {
  const topInline = branding && branding.inlineImages && branding.inlineImages.top_logo;
  const footerInline =
    branding && branding.inlineImages && branding.inlineImages.footer_logo;
  const topBlob = topInline || safeGetDriveBlob(JOURNEY_LOGO_FILE_ID, "top-logo");
  const footerBlob =
    footerInline || safeGetDriveBlob(FOOTER_LOGO_FILE_ID, "footer-logo");

  return {
    topLogoSrc: toDataUri(topBlob) || JOURNEY_LOGO_URL || "",
    footerLogoSrc: toDataUri(footerBlob) || FOOTER_LOGO_URL || "",
  };
}

function toDataUri(blob) {
  if (!blob) return "";
  try {
    var mimeType = blob.getContentType() || "image/png";
    var base64 = Utilities.base64Encode(blob.getBytes());
    return "data:" + mimeType + ";base64," + base64;
  } catch (error) {
    Logger.log("No s'ha pogut codificar el logo en base64: " + error);
    return "";
  }
}

function buildCardPdfHtml(payload, seleccions, reserveResult, branding) {
  const selectionSummary = getSelectionSummary(seleccions, payload.rol);
  const nom = String(payload.nom || "").trim();
  const centre = String(payload.centre || "").trim();
  const localitat = String(payload.localitat || "").trim();
  const email = String(payload.email || "").trim();
  const rol = String(payload.rol || "").trim();
  const franja = selectionSummary.franja;
  const tallerNom = selectionSummary.taller;
  const aula = selectionSummary.aula;
  const topLogoHtml = branding.topLogoSrc
    ? '<img src="' +
      escapeHtml(branding.topLogoSrc) +
      '" alt="Logo de la jornada" style="max-width:260px;width:100%;height:auto;display:block;margin:0 auto 16px;" />'
    : "";
  const footerLogoHtml = branding.footerLogoSrc
    ? '<img src="' +
      escapeHtml(branding.footerLogoSrc) +
      '" alt="Logo col·laborador" style="max-width:380px;width:100%;height:auto;display:block;margin:18px auto 0;" />'
    : "";

  return (
    '<!doctype html><html lang="ca"><head><meta charset="utf-8" />' +
    '<meta name="viewport" content="width=device-width, initial-scale=1" />' +
    "<title>Targeta d'inscripció #JPRE26</title>" +
    "</head><body style=\"margin:0;padding:24px;background:#f1eceb;font-family:Arial,sans-serif;color:#1f2b32;\">" +
    '<div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e6dfdd;">' +
    '<div style="padding:24px;background:linear-gradient(135deg,#b5dceb,#efd6d4);">' +
    topLogoHtml +
    '<h1 style="margin:0;text-align:center;color:#2f5562;font-size:24px;">Inscripció confirmada #JPRE26</h1>' +
    "</div>" +
    '<div style="padding:24px;">' +
    '<p style="margin:0 0 12px;">Hem registrat correctament la teva inscripció amb les dades següents:</p>' +
    '<table style="width:100%;border-collapse:collapse;margin:12px 0 18px;">' +
    "<tr><td style=\"padding:8px;border:1px solid #e6dfdd;background:#f7f1ef;width:38%;\"><strong>Nom i cognoms</strong></td><td style=\"padding:8px;border:1px solid #e6dfdd;\">" +
    escapeHtml(nom) +
    "</td></tr>" +
    "<tr><td style=\"padding:8px;border:1px solid #e6dfdd;background:#f7f1ef;\"><strong>Centre educatiu</strong></td><td style=\"padding:8px;border:1px solid #e6dfdd;\">" +
    escapeHtml(centre) +
    "</td></tr>" +
    "<tr><td style=\"padding:8px;border:1px solid #e6dfdd;background:#f7f1ef;\"><strong>Localitat</strong></td><td style=\"padding:8px;border:1px solid #e6dfdd;\">" +
    escapeHtml(localitat) +
    "</td></tr>" +
    "<tr><td style=\"padding:8px;border:1px solid #e6dfdd;background:#f7f1ef;\"><strong>Correu</strong></td><td style=\"padding:8px;border:1px solid #e6dfdd;\">" +
    escapeHtml(email) +
    "</td></tr>" +
    "<tr><td style=\"padding:8px;border:1px solid #e6dfdd;background:#f7f1ef;\"><strong>Perfil</strong></td><td style=\"padding:8px;border:1px solid #e6dfdd;\">" +
    escapeHtml(rol) +
    "</td></tr>" +
    "<tr><td style=\"padding:8px;border:1px solid #e6dfdd;background:#f7f1ef;\"><strong>Franja</strong></td><td style=\"padding:8px;border:1px solid #e6dfdd;\">" +
    escapeHtml(franja) +
    "</td></tr>" +
    "<tr><td style=\"padding:8px;border:1px solid #e6dfdd;background:#f7f1ef;\"><strong>Taller</strong></td><td style=\"padding:8px;border:1px solid #e6dfdd;\">" +
    escapeHtml(tallerNom) +
    "</td></tr>" +
    "<tr><td style=\"padding:8px;border:1px solid #e6dfdd;background:#f7f1ef;\"><strong>Aula</strong></td><td style=\"padding:8px;border:1px solid #e6dfdd;\">" +
    escapeHtml(aula) +
    "</td></tr>" +
    "</table>" +
    '<p style="margin:0;">Per consultes: ' +
    escapeHtml(SUPPORT_EMAIL) +
    "</p>" +
    footerLogoHtml +
    "</div></div></body></html>"
  );
}

function getEmailCardTemplateHtml() {
  try {
    return HtmlService.createHtmlOutputFromFile("email-card").getContent();
  } catch (error) {
    Logger.log(
      "No s'ha trobat el fitxer email-card a Apps Script. Es fa servir plantilla interna."
    );
    return (
      '<!doctype html><html lang="ca"><head><meta charset="utf-8" />' +
      '<meta name="viewport" content="width=device-width, initial-scale=1" />' +
      "<title>Targeta d'inscripció #JPRE26</title>" +
      "<style>body{margin:0;padding:24px;background:#f1eceb;font-family:Arial,sans-serif;color:#1f2b32;}" +
      ".card{max-width:640px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e6dfdd;}" +
      ".hero{padding:24px;background:linear-gradient(135deg,#b5dceb,#efd6d4);} .hero h1{margin:0;text-align:center;color:#2f5562;font-size:24px;}" +
      ".logo{max-width:260px;width:100%;height:auto;display:block;margin:0 auto 16px;}" +
      ".content{padding:24px;} .content p{margin:0 0 12px;} table{width:100%;border-collapse:collapse;margin:12px 0 18px;}" +
      "td{padding:8px;border:1px solid #e6dfdd;vertical-align:top;} td:first-child{background:#f7f1ef;width:38%;}" +
      ".footer-logo{max-width:380px;width:100%;height:auto;display:block;margin:18px auto 0;} a{color:#2f5562;text-decoration:none;}" +
      "</style></head><body><div class=\"card\"><div class=\"hero\">" +
      "<img class=\"logo\" src=\"{{TOP_LOGO_SRC}}\" alt=\"Logo de la jornada\" />" +
      "<h1>Inscripció confirmada #JPRE26</h1></div><div class=\"content\">" +
      "<p>Hem registrat correctament la teva inscripció amb les dades seguents:</p><table>" +
      "<tr><td><strong>Nom i cognoms</strong></td><td>{{NOM}}</td></tr>" +
      "<tr><td><strong>Centre educatiu</strong></td><td>{{CENTRE}}</td></tr>" +
      "<tr><td><strong>Localitat</strong></td><td>{{LOCALITAT}}</td></tr>" +
      "<tr><td><strong>Correu</strong></td><td>{{EMAIL}}</td></tr>" +
      "<tr><td><strong>Perfil</strong></td><td>{{ROL}}</td></tr>" +
      "<tr><td><strong>Franja</strong></td><td>{{FRANJA}}</td></tr>" +
      "<tr><td><strong>Taller</strong></td><td>{{TALLER}}</td></tr>" +
      "<tr><td><strong>Aula</strong></td><td>{{AULA}}</td></tr>" +
      "</table><p>Per consultes: <a href=\"mailto:programacioirobotica@xtec.cat\">programacioirobotica@xtec.cat</a></p>" +
      "<img class=\"footer-logo\" src=\"{{FOOTER_LOGO_SRC}}\" alt=\"Logo collaborador\" />" +
      "</div></div></body></html>"
    );
  }
}

function fillTemplate(templateHtml, values) {
  return Object.keys(values).reduce((acc, key) => {
    const token = `{{${key}}}`;
    return acc.split(token).join(String(values[key]));
  }, templateHtml);
}

function buildPdf(nom, email, seleccions) {
  const html = HtmlService.createHtmlOutput(
    buildPdfHtml(nom, email, seleccions)
  ).getContent();

  const blob = Utilities.newBlob(html, "text/html", "inscripcio.html").getAs(
    "application/pdf"
  );
  blob.setName("Inscripcio_JPRE26.pdf");
  return blob;
}

function buildPdfHtml(nom, email, seleccions) {
  const rows = seleccions
    .map(
      (s) =>
        `<tr><td>${escapeHtml(s.franja)}</td><td>${escapeHtml(
          s.tallerNom || s.tallerId
        )}</td></tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="ca">
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: Arial, sans-serif; color: #1f2b32; }
      h1 { color: #d56b4c; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th, td { border: 1px solid #ccd3d8; padding: 8px; text-align: left; }
      th { background: #f7f1ef; }
      .small { color: #5b6b73; font-size: 12px; margin-top: 16px; }
    </style>
  </head>
  <body>
    <h1>Confirmació d’inscripció #JPRE26</h1>
    <p><strong>Nom:</strong> ${escapeHtml(nom || "")}</p>
    <p><strong>Correu:</strong> ${escapeHtml(email || "")}</p>

    <h2>Tallers seleccionats</h2>
    <table>
      <thead>
        <tr><th>Franja</th><th>Taller</th></tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <p class="small">Per consultes: ${escapeHtml(SUPPORT_EMAIL)}</p>
  </body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildConfirmationEmail(payload, seleccions, reserveResult, branding) {
  const selectionSummary = getSelectionSummary(seleccions, payload.rol);
  const nom = String(payload.nom || "").trim();
  const centre = String(payload.centre || "").trim();
  const localitat = String(payload.localitat || "").trim();
  const email = String(payload.email || "").trim();
  const rol = String(payload.rol || "").trim();
  const franja = selectionSummary.franja;
  const tallerNom = selectionSummary.taller;
  const aula = selectionSummary.aula;
  const topLogoHtml = branding.topLogoSrc
    ? '<img src="' +
      escapeHtml(branding.topLogoSrc) +
      '" alt="Logo de la jornada" style="max-width:260px;width:100%;height:auto;display:block;margin:0 auto 16px;" />'
    : "";
  const footerLogoHtml = branding.footerLogoSrc
    ? '<img src="' +
      escapeHtml(branding.footerLogoSrc) +
      '" alt="Logo col·laborador" style="max-width:180px;width:100%;height:auto;display:block;margin:18px auto 0;" />'
    : "";

  const text =
    "Inscripció confirmada #JPRE26\n\n" +
    "Nom i cognoms: " +
    nom +
    "\n" +
    "Centre educatiu: " +
    centre +
    "\n" +
    "Localitat: " +
    localitat +
    "\n" +
    "Correu: " +
    email +
    "\n" +
    "Perfil de participació: " +
    rol +
    "\n\n" +
    "Taller seleccionat:\n" +
    "- Franja: " +
    franja +
    "\n" +
    "- Taller: " +
    tallerNom +
    "\n" +
    "- Aula: " +
    aula +
    "\n\n" +
    "Adjunt trobaràs la targeta de confirmació en PDF.\n" +
    "Per consultes: " +
    SUPPORT_EMAIL +
    "\n\n" +
    "Gràcies per participar en la #JPRE26.";

  const html =
    '<div style="margin:0;padding:24px;background:#f1eceb;font-family:Arial,sans-serif;color:#1f2b32;">' +
    '<div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e6dfdd;">' +
    '<div style="padding:24px;background:linear-gradient(135deg,#b5dceb,#efd6d4);">' +
    topLogoHtml +
    '<h2 style="margin:0;text-align:center;color:#2f5562;">Inscripció confirmada #JPRE26</h2>' +
    "</div>" +
    '<div style="padding:24px;">' +
    "<p style=\"margin-top:0;\">Hem registrat correctament la teva inscripció amb les dades següents:</p>" +
    '<table style="width:100%;border-collapse:collapse;margin:12px 0 18px;">' +
    "<tr><td style=\"padding:8px;border:1px solid #e6dfdd;background:#f7f1ef;\"><strong>Nom i cognoms</strong></td><td style=\"padding:8px;border:1px solid #e6dfdd;\">" +
    escapeHtml(nom) +
    "</td></tr>" +
    "<tr><td style=\"padding:8px;border:1px solid #e6dfdd;background:#f7f1ef;\"><strong>Centre educatiu</strong></td><td style=\"padding:8px;border:1px solid #e6dfdd;\">" +
    escapeHtml(centre) +
    "</td></tr>" +
    "<tr><td style=\"padding:8px;border:1px solid #e6dfdd;background:#f7f1ef;\"><strong>Localitat</strong></td><td style=\"padding:8px;border:1px solid #e6dfdd;\">" +
    escapeHtml(localitat) +
    "</td></tr>" +
    "<tr><td style=\"padding:8px;border:1px solid #e6dfdd;background:#f7f1ef;\"><strong>Correu</strong></td><td style=\"padding:8px;border:1px solid #e6dfdd;\">" +
    escapeHtml(email) +
    "</td></tr>" +
    "<tr><td style=\"padding:8px;border:1px solid #e6dfdd;background:#f7f1ef;\"><strong>Perfil</strong></td><td style=\"padding:8px;border:1px solid #e6dfdd;\">" +
    escapeHtml(rol) +
    "</td></tr>" +
    "<tr><td style=\"padding:8px;border:1px solid #e6dfdd;background:#f7f1ef;\"><strong>Franja</strong></td><td style=\"padding:8px;border:1px solid #e6dfdd;\">" +
    escapeHtml(franja) +
    "</td></tr>" +
    "<tr><td style=\"padding:8px;border:1px solid #e6dfdd;background:#f7f1ef;\"><strong>Taller</strong></td><td style=\"padding:8px;border:1px solid #e6dfdd;\">" +
    escapeHtml(tallerNom) +
    "</td></tr>" +
    "<tr><td style=\"padding:8px;border:1px solid #e6dfdd;background:#f7f1ef;\"><strong>Aula</strong></td><td style=\"padding:8px;border:1px solid #e6dfdd;\">" +
    escapeHtml(aula) +
    "</td></tr>" +
    "</table>" +
    "<p style=\"margin:0 0 10px;\">Adjunt trobaràs la targeta de confirmació en PDF.</p>" +
    "<p style=\"margin:0;\">Per consultes: <a href=\"mailto:" +
    escapeHtml(SUPPORT_EMAIL) +
    "\" style=\"color:#2f5562;text-decoration:none;\">" +
    escapeHtml(SUPPORT_EMAIL) +
    "</a></p>" +
    footerLogoHtml +
    "</div>" +
    "</div>" +
    "</div>";

  return { text, html };
}

function buildEmailBranding() {
  const inlineImages = {};
  let topLogoSrc = JOURNEY_LOGO_URL;
  let footerLogoSrc = FOOTER_LOGO_URL;

  if (JOURNEY_LOGO_FILE_ID) {
    const topBlob = safeGetDriveBlob(JOURNEY_LOGO_FILE_ID, "top-logo");
    if (topBlob) {
      inlineImages.top_logo = topBlob;
      topLogoSrc = "cid:top_logo";
    }
  }

  if (FOOTER_LOGO_FILE_ID) {
    const footerBlob = safeGetDriveBlob(FOOTER_LOGO_FILE_ID, "footer-logo");
    if (footerBlob) {
      inlineImages.footer_logo = footerBlob;
      footerLogoSrc = "cid:footer_logo";
    }
  }

  return { inlineImages, topLogoSrc, footerLogoSrc };
}

function safeGetDriveBlob(fileId, filename) {
  try {
    return DriveApp.getFileById(fileId).getBlob().setName(filename);
  } catch (error) {
    Logger.log("No s'ha pogut carregar el logo de Drive: " + fileId + " " + error);
    return null;
  }
}

function getTallersMap() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const tallersSheet = ss.getSheetByName(TALLERS_SHEET);
  const range = tallersSheet.getDataRange();
  const data = range.getValues();
  const richData = range.getRichTextValues();
  const headers = (data.shift() || []).map((h) => normalizeHeader(h));
  richData.shift();

  const map = {};
  data.forEach((row, idx) => {
    const rowRich = richData[idx] || [];
    const franja =
      String(getCellByHeader(headers, row, ["franja"], row[1]) || "").trim() ||
      "Franja";
    const nom = String(getCellByHeader(headers, row, ["taller", "nom"], row[2]) || "").trim();
    if (!nom) return;
    const id = buildId(franja, nom);
    map[id] = {
      rowIndex: idx + 2,
      franja,
      nom,
      num: String(getCellByHeader(headers, row, ["num", "numero", "n"], row[0]) || "").trim(),
      aula: String(getCellByHeader(headers, row, ["aula"], row[12]) || "").trim(),
      imparteix: String(
        getCellByHeader(headers, row, ["imparteix", "ponent", "persones"], "")
      ).trim(),
      foto1Url: normalizeImageUrl(
        getUrlCellByHeader(headers, row, rowRich, ["foto1url", "foto1", "foto_1"], "")
      ),
      foto2Url: normalizeImageUrl(
        getUrlCellByHeader(headers, row, rowRich, ["foto2url", "foto2", "foto_2"], "")
      ),
      dispositiuTecnologia: String(
        getCellByHeader(
          headers,
          row,
          ["dispositiutecnologia", "dispositiu", "tecnologia"],
          ""
        )
      ).trim(),
      imatgeDispositiuUrl: normalizeImageUrl(
        getUrlCellByHeader(
          headers,
          row,
          rowRich,
          ["imatgedispositiuurl", "imatgedispositiu", "imagetecnologia"],
          ""
        )
      ),
      descripcio: String(getCellByHeader(headers, row, ["descripcio", "descripció"], "")).trim(),
      materialNecessari: String(
        getCellByHeader(headers, row, ["materialnecessari", "material"], "")
      ).trim(),
      etapaEducativa: String(getCellByHeader(headers, row, ["etapa"], row[11]) || "").trim(),
      placesDisponibles: parsePlaces(
        getCellByHeader(headers, row, ["placesdisponibles", "places", "placeslliures"], row[3])
      ),
    };
  });

  return map;
}

function getOcupacionsByTallerId() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(INSCRIPCIONS_SHEET);
  if (!sheet) return {};

  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return {};
  rows.shift();

  const ocupacions = {};
  rows.forEach((row) => {
    const ids = String(row[6] || "").split("|");
    ids.forEach((id) => {
      const cleanId = String(id || "").trim();
      if (!cleanId) return;
      ocupacions[cleanId] = (ocupacions[cleanId] || 0) + 1;
    });
  });

  return ocupacions;
}

function reserveWorkshopPlace(tallerId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const tallersSheet = ss.getSheetByName(TALLERS_SHEET);
    const tallersMap = getTallersMap();
    const taller = tallersMap[tallerId];

    if (!taller) {
      return { ok: false, message: "Taller no vàlid." };
    }

    const current = parsePlaces(
      tallersSheet.getRange(taller.rowIndex, 4).getValue()
    );
    if (current <= 0) {
      return { ok: false, message: "No queden places en aquest taller." };
    }

    const remaining = current - 1;
    tallersSheet.getRange(taller.rowIndex, 4).setValue(remaining);
    return { ok: true, remaining };
  } catch (error) {
    Logger.log("Error reservant plaça: " + error);
    return { ok: false, message: "No s'ha pogut reservar la plaça." };
  } finally {
    lock.releaseLock();
  }
}

function parsePlaces(value) {
  if (typeof value === "number" && isFinite(value)) {
    return Math.max(Math.floor(value), 0);
  }
  const clean = String(value || "").replace(/[^\d-]/g, "");
  const parsed = parseInt(clean, 10);
  if (!isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

function emailExists(email) {
  if (!email) return false;
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(INSCRIPCIONS_SHEET);
  if (!sheet) return false;

  const rows = sheet.getDataRange().getValues();
  rows.shift();

  const target = String(email).trim().toLowerCase();
  return rows.some((row) => String(row[4] || "").trim().toLowerCase() === target);
}

function getAppProfileByEmail(email) {
  if (!email) {
    return {
      found: false,
      message: "Cal indicar un correu.",
    };
  }

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(INSCRIPCIONS_SHEET);
  if (!sheet) {
    return {
      found: false,
      message: "No s'ha trobat la pestanya d'inscripcions.",
    };
  }

  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) {
    return {
      found: false,
      message: "Encara no hi ha inscripcions registrades.",
    };
  }

  rows.shift();
  const target = String(email).trim().toLowerCase();
  let registrationRow = null;

  for (var i = rows.length - 1; i >= 0; i--) {
    var rowEmail = String(rows[i][4] || "").trim().toLowerCase();
    if (rowEmail === target) {
      registrationRow = rows[i];
      break;
    }
  }

  if (!registrationRow) {
    return {
      found: false,
      message: "No hi ha cap inscripció associada a aquest correu.",
    };
  }

  const rol = String(registrationRow[5] || "").trim();
  const tallersMap = getTallersMap();
  const selectionIds = String(registrationRow[6] || "")
    .split("|")
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  const selections = selectionIds.map((id) => {
    const taller = tallersMap[id];
    if (!taller) {
      return {
        tallerId: id,
        tallerNom: "",
        franja: "",
        aula: "",
      };
    }

    return {
      tallerId: id,
      tallerNom: taller.nom,
      franja: taller.franja,
      aula: taller.aula,
      imparteix: taller.imparteix,
      foto1Url: taller.foto1Url,
      foto2Url: taller.foto2Url,
      dispositiuTecnologia: taller.dispositiuTecnologia,
      imatgeDispositiuUrl: taller.imatgeDispositiuUrl,
      descripcio: taller.descripcio,
      materialNecessari: taller.materialNecessari,
      etapaEducativa: taller.etapaEducativa,
      placesDisponibles: taller.placesDisponibles,
      num: taller.num,
    };
  });

  return {
    found: true,
    profile: {
      nom: String(registrationRow[1] || "").trim(),
      centre: String(registrationRow[2] || "").trim(),
      localitat: String(registrationRow[3] || "").trim(),
      email: String(registrationRow[4] || "").trim(),
      rol: rol,
      tallerIds: selectionIds,
      seleccions: selections,
      resum: getSelectionSummary(selections, rol),
      esOrganitzacio: isOrganizationRole(rol),
      potAnarSenseTaller: allowsEmptyWorkshopRole(rol),
    },
  };
}

function loginWithGoogleCredential(credential) {
  if (!credential) {
    return {
      ok: false,
      message: "No s'ha rebut la credencial de Google.",
    };
  }

  const verification = verifyGoogleIdToken(credential);
  if (!verification.ok) {
    return {
      ok: false,
      message: verification.message || "No s'ha pogut validar l'accés amb Google.",
    };
  }

  const profileResult = getAppProfileByEmail(verification.email);
  if (!profileResult || !profileResult.found || !profileResult.profile) {
    return {
      ok: false,
      message:
        (profileResult && profileResult.message) ||
        "No hi ha cap inscripció associada a aquest compte de Google.",
    };
  }

  return {
    ok: true,
    message: "Accés correcte.",
    profile: profileResult.profile,
  };
}

function verifyGoogleIdToken(idToken) {
  try {
    const response = UrlFetchApp.fetch(
      "https://oauth2.googleapis.com/tokeninfo?id_token=" +
        encodeURIComponent(idToken),
      {
        muteHttpExceptions: true,
      }
    );

    if (response.getResponseCode() !== 200) {
      return {
        ok: false,
        message: "Google no ha validat la credencial enviada.",
      };
    }

    const payload = JSON.parse(response.getContentText() || "{}");
    const allowedClientIds = GOOGLE_CLIENT_IDS.filter(function (value) {
      return String(value || "").trim() && String(value || "").trim() !== "PENDENT_GOOGLE_CLIENT_ID";
    });
    const audience = String(payload.aud || "").trim();
    const email = String(payload.email || "").trim().toLowerCase();
    const emailVerified = String(payload.email_verified || "").trim() === "true";
    const expiresAt = parseInt(payload.exp, 10);
    const now = Math.floor(Date.now() / 1000);

    if (!audience) {
      return {
        ok: false,
        message: "La credencial no inclou un client v\u00e0lid.",
      };
    }

    if (allowedClientIds.length > 0 && allowedClientIds.indexOf(audience) === -1) {
      return {
        ok: false,
        message: "La credencial de Google no correspon a aquesta aplicaci\u00f3.",
      };
    }

    if (!email || !emailVerified) {
      return {
        ok: false,
        message: "El compte de Google no ha pogut verificar el correu.",
      };
    }

    if (!isFinite(expiresAt) || expiresAt <= now) {
      return {
        ok: false,
        message: "La sessi\u00f3 de Google ha caducat. Torna-ho a provar.",
      };
    }

    return {
      ok: true,
      email: email,
      payload: payload,
    };
  } catch (error) {
    Logger.log("Error validant token de Google: " + error);
    return {
      ok: false,
      message: "No s'ha pogut comprovar l'acc\u00e9s amb Google.",
    };
  }
}

function buildId(franja, tallerNom) {
  return `${franja.toLowerCase().replace(/\s+/g, "-")}-${tallerNom
    .toLowerCase()
    .replace(/\s+/g, "-")}`;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function jsonOrJsonp(obj, e) {
  const callback = e && e.parameter && e.parameter.callback;
  if (callback) {
    const jsonp = `${callback}(${JSON.stringify(obj)})`;
    return ContentService.createTextOutput(jsonp).setMimeType(
      ContentService.MimeType.JAVASCRIPT
    );
  }
  return json(obj);
}

function iframeSubmitResponse(result) {
  return iframeMessageResponse("jpre-submit-result", result);
}

function iframeGoogleLoginResponse(result) {
  return iframeMessageResponse("jpre-google-login-result", result);
}

function iframeMessageResponse(type, result) {
  const payload = JSON.stringify({
    type: String(type || ""),
    ok: Boolean(result && result.ok),
    message: String((result && result.message) || ""),
    emailSent: Boolean(result && result.emailSent),
    emailErrorMessage: String((result && result.emailErrorMessage) || ""),
    requestId: String((result && result.requestId) || ""),
    profile: result && result.profile ? result.profile : null,
  });
  const html =
    "<!doctype html><html><body><script>" +
    "window.top.postMessage(" +
    payload +
    ", '*');" +
    "</script></body></html>";
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(
    HtmlService.XFrameOptionsMode.ALLOWALL
  );
}


