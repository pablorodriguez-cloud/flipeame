const BACKEND_URL = "https://script.google.com/macros/s/AKfycbwksM2kjeV5ffPMv-efll2GiKQicyaoEpRtgNyYBBAdm3wNjofSHccnTS01TI5IsvQ/exec";
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
  const pdfCard = document.getElementById("pdf-card");

  if (!url) {
    setStatus("Pega primero una URL de Portal Inmobiliario.", "error");
    return;
  }

  setStatus("Procesando publicación…", "info");
  setButtonsEnabled(false);
  if (pdfCard) pdfCard.innerHTML = "";

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
  // Usamos SIEMPRE el contenedor pdf-card (es el que se ve y el que capturaremos en el PDF)
  const container = document.getElementById("pdf-card");
  if (!container) return;

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
                ? `<img src="${hero}" alt="Foto propiedad" class="hero-image" id="heroImage" crossorigin="anonymous">`
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
                <img src="${u}" alt="Foto ${idx + 1}" crossorigin="anonymous">
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

// ==========================================
// FUNCIÓN GENERAR PDF PROFESIONAL
// ==========================================
async function handleDownloadPdf() {
  if (!currentData) return;

  // Verificar librerías
  if (!window.html2canvas || !window.jspdf) {
    setStatus("Error: Librerías PDF no cargadas.", "error");
    return;
  }
  const { jsPDF } = window.jspdf;

  setStatus("Diseñando ficha de alta calidad...", "info");

  // 1. RELLENAR EL TEMPLATE OCULTO CON LOS DATOS
  // ---------------------------------------------
  document.getElementById('pdf-price').textContent = formatUF(currentData.precio_uf);
  document.getElementById('pdf-title').textContent = safe(currentData.titulo).substring(0, 60); // Cortar si es muy largo
  document.getElementById('pdf-address').textContent = "ID: " + getItemCode(currentData.sourceUrl) + " · " + safe(currentData.orientacion, "Santiago");
  
  // Descripción inteligente (usa la de IA si existe)
  const desc = (currentData.ai && currentData.ai.descripcion_ejecutiva) || safe(currentData.descripcion_raw);
  document.getElementById('pdf-desc').textContent = desc;

  // Highlights
  const ul = document.getElementById('pdf-highlights');
  ul.innerHTML = "";
  const hls = (currentData.ai && currentData.ai.highlights) ? currentData.ai.highlights : [];
  hls.slice(0, 5).forEach(h => { // Máximo 5 bullets para que no rompa el diseño
    const li = document.createElement('li');
    li.textContent = h;
    ul.appendChild(li);
  });

  // Match Cliente
  const match = (currentData.ai && currentData.ai.match_cliente) || "Propiedad con alto potencial.";
  document.getElementById('pdf-match').textContent = match;

  // Specs
  // Parseamos programa para separar dorm y baños
  let dorm = "-", banos = "-";
  if(currentData.programa) {
      const parts = currentData.programa.split('/');
      if(parts[0]) dorm = parts[0].replace('D','').trim();
      if(parts[1]) banos = parts[1].replace('B','').trim();
  }
  document.getElementById('pdf-dorm').textContent = dorm;
  document.getElementById('pdf-banos').textContent = banos;
  document.getElementById('pdf-m2-total').textContent = safe(currentData.m2_total) + " m²";
  document.getElementById('pdf-m2-util').textContent = safe(currentData.m2_utile) + " m²";
  document.getElementById('pdf-estac').textContent = safe(currentData.estacionamientos);
  document.getElementById('pdf-gc').textContent = "$ " + safe(currentData.gastos_comunes);

  // Imágenes
  // Hero Image
  const heroUrl = currentData.main_image_url || (currentData.image_urls ? currentData.image_urls[0] : null);
  const heroImgEl = document.getElementById('pdf-hero-img');
  
  // Promesa para asegurar que la imagen cargó antes de imprimir
  await new Promise((resolve) => {
      heroImgEl.onload = resolve;
      heroImgEl.onerror = resolve; // Continuar aunque falle
      heroImgEl.src = heroUrl;
  });

  // Galería Lateral (3 fotos)
  const sideGrid = document.getElementById('pdf-gallery-grid');
  sideGrid.innerHTML = "";
  const sidePics = (currentData.image_urls || []).slice(1, 4); // Tomamos la 2, 3 y 4
  
  // Cargar imágenes laterales secuencialmente
  for (const url of sidePics) {
      const img = document.createElement('img');
      img.className = 'pdf-gallery-img';
      img.crossOrigin = "anonymous"; // CRÍTICO para html2canvas
      sideGrid.appendChild(img);
      await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
          img.src = url;
      });
  }

  // 2. GENERAR CANVAS Y PDF
  // ---------------------------------------------
  try {
    const template = document.getElementById('pdf-template');
    
    // html2canvas options
    const canvas = await html2canvas(template, {
        scale: 2, // Mayor calidad
        useCORS: true, // Permitir imágenes externas
        logging: false,
        windowWidth: 794, // Ancho A4 en px aprox a 96dpi (210mm)
        windowHeight: 1123
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // A4 medidas: 210 x 297 mm
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);

    // Nombre archivo limpio
    const filename = "Ficha-Flipeame-" + (currentData.titulo || "propiedad").replace(/[^a-z0-9]/gi, '-').substring(0,20);
    pdf.save(`${filename}.pdf`);

    setStatus("¡PDF Oficial descargado con éxito!", "success");

  } catch (err) {
    console.error(err);
    setStatus("Error generando el PDF. Revisa la consola.", "error");
  }
}
