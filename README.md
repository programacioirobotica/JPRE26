# Formulari d’inscripció (XVIII Jornada de Programació i Robòtica Educatives)

## 1) Estructura del full de Google Sheets
Crea un full amb dues pestanyes:

Tallers:
- A: Franja
- B: Taller
- C: PlacesDisponibles

Inscripcions:
- A: Timestamp
- B: Nom i cognoms
- C: Centre
- D: Localitat
- E: Correu
- F: Rol de participació
- G: TallerIds
- H: Tallers (franja + nom)

## 2) Apps Script
- Obre Extensions > Apps Script.
- Crea un script nou i enganxa el contingut de `apps-script.gs`.
- Posa la teva ID a `SHEET_ID`.
- Desa i publica com a Web App:
  - Executa com: tu mateix
  - Accés: Qualsevol amb l’enllaç
- Copia l’URL de la Web App.

## 3) Frontend
- Obre `app.js` i enganxa la URL a `WEB_APP_URL`.
- Afegeix el teu `logo.png` a la carpeta.

## 4) Notes
- El formulari admet qualsevol adreça de correu electrònic.
- El sistema mostra 2 franges i permet seleccionar 1 únic taller total.
- El correu es comprova per evitar duplicats.


