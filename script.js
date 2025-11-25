const BACKEND_URL = "https://script.google.com/macros/s/AKfycbwksM2kjeV5ffPMv-efll2GiKQicyaoEpRtgNyYBBAdm3wNjofSHccnTS01TI5IsvQ/exec"
let currentData = null;

document.addEventListener("DOMContentLoaded", () => {
  const generateBtn = document.getElementById("generateBtn");
  const copyBtn = document.getElementById("copyWhatsAppBtn");
  const pdfBtn = document.getElementById("downloadPdfBtn");
  const urlInput = document.getElementById("urlInput");

  generateBtn.addEventListener("click", handleGenerate);
  urlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleGenerate();
  });

  copyBtn.addEventListener("click", handleCopyWhatsapp);
  pdfBtn.addEventListener("click", handleDownloadPdf);
});

function setStatus(message, type = "info") {
  const el = document.getElementById("statusMessage");
  el.textContent = message || "";
  el.style.color =
    type === "error" ? "#b91c1c" : type === "success" ? "#166534" : "#6b7280";
}

function setButtonsEnabled(hasFicha) {
  document.getElementById("copyWhatsAppBtn").disabled = !hasFicha;
  document.getElementById("downloadPdfBtn").disabled = !hasFicha;
}

function formatUF(val) {
  if (!val || val === "N/D" || val === "No disponible") return "N/D";
  const cleaned = String(val).replace(/\./g, "");
  const num = Number(cleaned);
  if (Number.isNaN(num)) return "UF " + val;
  return "UF " + num.toLocaleString("es-CL");
}

function safe(val, fallback = "N/D") {
  if (!val || val === "N/D" || val === "No disponible") return fallback;
  return val;
}

function getItemCode(url) {
  if (!url) return "";
  const m = url.match(/(MLC-\d+)/i);
  return m ? m[1] : "";
}

// ----------------- GENERAR FICHA -------------------

async function handleGenerate() {
  const url = document.getElementById("urlInput").value.trim();
  const cardContainer = document.getElementById("cardContainer");

  if (!url) {
    setStatus("Pega primero una URL de Portal Inmobiliario.", "error");
    return;
  }

  setStatus("Procesando publicación…", "info");
  setButtonsEnabled(false);
  cardContainer.innerHTML = "";

  try {
    const resp = await fetch(`${BACKEND_URL}?url=${encodeURIComponent(url)}`);
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }
    const data = await resp.json();
    if (!data.ok) {
      throw new Error(data.error || "Error en backend");
    }

    currentData = data;

    renderPropertyCard(data);
    prepareWhatsappText(data);

    setButtonsEnabled(true);
    setStatus("Ficha generada correctamente.", "success");
  } catch (err) {
    console.error(err);
    setStatus("No pude generar la ficha. Revisa la URL o inténtalo de nuevo.", "error");
    currentData = null;
    setButtonsEnabled(false);
  }
}

function renderPropertyCard(data) {
  const container = document.getElementById("cardContainer");
  const titulo = safe(data.titulo, "Propiedad en venta");
  const itemCode = getItemCode(data.sourceUrl);
  const precio = formatUF(data.precio_uf);

  const descripcion =
    (data.ai && data.ai.descripcion_ejecutiva) ||
    safe(data.descripcion_raw, "Descripción no disponible");

  const highlights =
    (data.ai && Array.isArray(data.ai.highlights) && data.ai.highlights.length
      ? data.ai.highlights
      : []
    );

  const matchCliente =
    (data.ai && data.ai.match_cliente) ||
    "Ficha pensada para ayudar al equipo a calzar la propiedad con el perfil adecuado de cliente.";

  const hero = data.main_image_url || (data.image_urls && data.image_urls[0]) || "";
  const thumbs = (data.image_urls || []).slice(0, 8);

  container.innerHTML = `
    <article class="property-card">
      <div class="property-header">
        <div class="property-hero">
          <div class="hero-image-wrapper">
            ${
              hero
                ? `<img src="${hero}" alt="Foto propiedad" class="hero-image" id="heroImage">`
                : `<div class="hero-image" style="background:#e5e7eb;display:flex;align-items:center;justify-content:center;font-size:0.85rem;color:#9ca3af;">Sin imagen</div>`
            }
          </div>
          ${
            thumbs.length > 1
              ? `
          <div class="gallery-strip" id="galleryStrip">
            ${thumbs
              .map(
                (u, idx) => `
              <button class="gallery-thumb ${
                idx === 0 ? "active" : ""
              }" data-url="${u}">
                <img src="${u}" alt="Foto ${idx + 1}">
              </button>
            `
              )
              .join("")}
          </div>
          `
              : ""
          }
        </div>

        <div class="property-main">
          <h2 class="property-title">${titulo}</h2>
          <p class="property-subid">
            ${itemCode ? `ID Ficha: ${itemCode} · ` : ""}${precio}
          </p>

          <div class="property-grid">
            <div>
              <span class="property-label">Programa</span>
              <span class="property-value">${safe(data.programa)}</span>
            </div>
            <div>
              <span class="property-label">Útil (m²)</span>
              <span class="property-value">${safe(data.m2_utile)}</span>
            </div>
            <div>
              <span class="property-label">Total (m²)</span>
              <span class="property-value">${safe(data.m2_total)}</span>
            </div>
            <div>
              <span class="property-label">Terraza (m²)</span>
              <span class="property-value">${safe(data.m2_terraza)}</span>
            </div>
            <div>
              <span class="property-label">Estac. / Bodegas</span>
              <span class="property-value">${safe(
                data.estacionamientos
              )} estac · ${safe(data.bodegas)} bod</span>
            </div>
            <div>
              <span class="property-label">G. comunes aprox</span>
              <span class="property-value">${
                data.gastos_comunes && data.gastos_comunes !== "N/D"
                  ? "$ " + data.gastos_comunes
                  : "N/D"
              }</span>
            </div>
            <div>
              <span class="property-label">Orientación</span>
              <span class="property-value">${safe(data.orientacion)}</span>
            </div>
            <div>
              <span class="property-label">Piso</span>
              <span class="property-value">${safe(data.piso)}</span>
            </div>
            <div>
              <span class="property-label">Antigüedad</span>
              <span class="property-value">${safe(data.antiguedad)}</span>
            </div>
          </div>
        </div>
      </div>

      <section class="property-section">
        <h3>Descripción ejecutiva</h3>
        <p>${descripcion}</p>
      </section>

      ${
        highlights.length
          ? `
      <section class="property-section">
        <h3>Highlights</h3>
        <ul>
          ${highlights.map((h) => `<li>${h}</li>`).join("")}
        </ul>
      </section>
      `
          : ""
      }

      <section class="property-section">
        <h3>Match con el cliente</h3>
        <p>${matchCliente}</p>
      </section>

      <div class="internal-footer">
        <div>Uso interno Flipeame. No reenviar esta ficha tal cual al cliente sin revisión.</div>
        ${
          data.sourceUrl
            ? `<div>URL procesada: <a href="${data.sourceUrl}" target="_blank" rel="noopener">Ver publicación original</a></div>`
            : ""
        }
      </div>
    </article>
  `;

  // Listeners galería
  const heroImg = document.getElementById("heroImage");
  const strip = document.getElementById("galleryStrip");
  if (heroImg && strip) {
    strip.addEventListener("click", (e) => {
      const btn = e.target.closest(".gallery-thumb");
      if (!btn) return;
      const url = btn.getAttribute("data-url");
      if (!url) return;
      heroImg.src = url;
      strip.querySelectorAll(".gallery-thumb").forEach((b) =>
        b.classList.remove("active")
      );
      btn.classList.add("active");
    });
  }
}

// ----------------- WHATSAPP -------------------

function prepareWhatsappText(data) {
  const txtArea = document.getElementById("whatsappText");
  const titulo = safe(data.titulo, "Propiedad en venta");
  const precio = formatUF(data.precio_uf);
  const programa = safe(data.programa);
  const utiles = safe(data.m2_utile);
  const total = safe(data.m2_total);
  const terraza = safe(data.m2_terraza);
  const estac = safe(data.estacionamientos);
  const bod = safe(data.bodegas);
  const ufm2 = data.m2_utile && data.precio_uf
    ? Math.round(
        Number(String(data.precio_uf).replace(/\./g, "")) / Number(data.m2_utile)
      ).toLocaleString("es-CL")
    : null;

  const descripcion =
    (data.ai && data.ai.descripcion_ejecutiva) ||
    safe(data.descripcion_raw, "");

  let lines = [];
  lines.push("Te comparto el resumen de esta propiedad:");
  lines.push("");
  lines.push(titulo);
  lines.push(`Precio: ${precio}`);
  lines.push(`Programa: ${programa}`);
  lines.push(`Superficies: ${utiles} m² útiles, ${total} m² totales, ${terraza} m² terraza`);
  lines.push(`Estac/Bodegas: ${estac} estac, ${bod} bodegas`);
  if (ufm2) lines.push(`Indicadores: ~ ${ufm2} UF/m² útil`);
  lines.push("");
  if (descripcion) {
    lines.push("Descripción ejecutiva:");
    lines.push(descripcion);
    lines.push("");
  }
  if (data.sourceUrl) {
    lines.push(`Link: ${data.sourceUrl}`);
  }

  txtArea.value = lines.join("\n");
}

async function handleCopyWhatsapp() {
  const txtArea = document.getElementById("whatsappText");
  const text = txtArea.value;
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    setStatus("Texto de WhatsApp copiado al portapapeles.", "success");
  } catch (e) {
    // Fallback clásico
    txtArea.select();
    document.execCommand("copy");
    setStatus("Texto copiado (método alternativo).", "success");
  }
}

// ----------------- PDF -------------------

function renderPdfFicha(data) {
  const cont = document.getElementById("pdfFicha");
  const titulo = safe(data.titulo, "Propiedad en venta");
  const precio = formatUF(data.precio_uf);
  const programa = safe(data.programa);
  const utiles = safe(data.m2_utile);
  const total = safe(data.m2_total);
  const terraza = safe(data.m2_terraza);
  const estac = safe(data.estacionamientos);
  const bod = safe(data.bodegas);
  const gastos =
    data.gastos_comunes && data.gastos_comunes !== "N/D"
      ? "$ " + data.gastos_comunes
      : "N/D";
  const orient = safe(data.orientacion);
  const piso = safe(data.piso);
  const antig = safe(data.antiguedad);

  const descripcion =
    (data.ai && data.ai.descripcion_ejecutiva) ||
    safe(data.descripcion_raw, "Descripción no disponible");

  const highlights =
    (data.ai && Array.isArray(data.ai.highlights) && data.ai.highlights.length
      ? data.ai.highlights
      : []
    );

  const matchCliente =
    (data.ai && data.ai.match_cliente) ||
    "Ficha comercial orientada a clientes que busquen un estilo de vida de alto estándar.";

  const hero = data.main_image_url || (data.image_urls && data.image_urls[0]) || "";
  const thumbs = (data.image_urls || []).slice(1, 4); // 3 miniaturas para el PDF

  cont.innerHTML = `
    <div class="pdf-page">
      <header class="pdf-header">
        <img src="logo-flipeame.svg" class="pdf-logo" alt="Flipeame" />
        <div class="pdf-tag">Ficha comercial · Uso interno · Información referencial</div>
      </header>

      <h1 class="pdf-title">${titulo}</h1>
      <div class="pdf-subrow">
        <strong>${precio}</strong> · ${programa}
      </div>

      <div class="pdf-grid">
        <div class="pdf-hero">
          ${
            hero
              ? `<img src="${hero}" alt="Foto propiedad">`
              : `<div style="width:100%;height:70mm;background:#e5e7eb;display:flex;align-items:center;justify-content:center;font-size:9px;color:#9ca3af;">Sin imagen</div>`
          }
          ${
            thumbs.length
              ? `<div class="pdf-gallery">
              ${thumbs
                .map((u) => `<img src="${u}" alt="Foto adicional">`)
                .join("")}
            </div>`
              : ""
          }
        </div>

        <div class="pdf-facts">
          <table class="pdf-facts-table">
            <tr>
              <td class="pdf-facts-label">Programa</td>
              <td>${programa}</td>
            </tr>
            <tr>
              <td class="pdf-facts-label">Superficie útil</td>
              <td>${utiles} m²</td>
            </tr>
            <tr>
              <td class="pdf-facts-label">Superficie total</td>
              <td>${total} m²</td>
            </tr>
            <tr>
              <td class="pdf-facts-label">Superficie terraza</td>
              <td>${terraza} m²</td>
            </tr>
            <tr>
              <td class="pdf-facts-label">Estac / Bodegas</td>
              <td>${estac} estac · ${bod} bod</td>
            </tr>
            <tr>
              <td class="pdf-facts-label">Gastos comunes aprox.</td>
              <td>${gastos}</td>
            </tr>
            <tr>
              <td class="pdf-facts-label">Orientación</td>
              <td>${orient}</td>
            </tr>
            <tr>
              <td class="pdf-facts-label">Piso</td>
              <td>${piso}</td>
            </tr>
            <tr>
              <td class="pdf-facts-label">Antigüedad</td>
              <td>${antig}</td>
            </tr>
          </table>
        </div>
      </div>

      <section class="pdf-section">
        <h3>Descripción ejecutiva</h3>
        <p>${descripcion}</p>
      </section>

      ${
        highlights.length
          ? `
      <section class="pdf-section">
        <h3>Highlights</h3>
        <ul>
          ${highlights.map((h) => `<li>${h}</li>`).join("")}
        </ul>
      </section>
      `
          : ""
      }

      <section class="pdf-section">
        <h3>Match con el cliente</h3>
        <p>${matchCliente}</p>
      </section>

      <footer class="pdf-footer">
        Ficha para uso comercial de Flipeame. La información es referencial y debe ser validada
        antes de presentarla formalmente al cliente. No incluye el enlace original del portal.
      </footer>
    </div>
  `;
}

async function handleDownloadPdf() {
  if (!currentData) return;
  if (typeof html2pdf === "undefined") {
    alert("No se encontró la librería de PDF (html2pdf). Revisa el script en index.html.");
    return;
  }

  renderPdfFicha(currentData);

  const element = document.getElementById("pdfFicha");
  const titulo = safe(currentData.titulo, "ficha-propiedad")
    .replace(/[^a-zA-Z0-9\- ]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();

  const opt = {
    margin: [0, 0, 0, 0],
    filename: `${titulo || "ficha-propiedad"}.pdf`,
    image: { type: "jpeg", quality: 0.95 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
  };

  try {
    setStatus("Generando PDF…", "info");
    await html2pdf().set(opt).from(element).save();
    setStatus("PDF descargado correctamente.", "success");
  } catch (e) {
    console.error(e);
    setStatus("Ocurrió un problema al generar el PDF.", "error");
  }
}
