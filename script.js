const btn = document.getElementById("generateBtn");
const copyBtn = document.getElementById("copyWhatsappBtn");
const input = document.getElementById("urlInput");
const resultado = document.getElementById("resultado");

// URL de tu Web App de Apps Script (backend)
const BACKEND_URL = "https://script.google.com/macros/s/AKfycbwksM2kjeV5ffPMv-efll2GiKQicyaoEpRtgNyYBBAdm3wNjofSHccnTS01TI5IsvQ/exec";

let lastWhatsappText = null;

// Eventos
btn.addEventListener("click", handleGenerate);

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    handleGenerate();
  }
});

copyBtn.addEventListener("click", async () => {
  if (!lastWhatsappText) return;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(lastWhatsappText);
      copyBtn.textContent = "Copiado ✅";
      setTimeout(() => {
        copyBtn.textContent = "Copiar texto WhatsApp";
      }, 2000);
    } else {
      alert("Tu navegador no permite copiar automáticamente. Copia manualmente:\n\n" + lastWhatsappText);
    }
  } catch (err) {
    alert("No se pudo copiar el texto. Puedes copiarlo manualmente:\n\n" + lastWhatsappText);
  }
});

async function handleGenerate() {
  const rawUrl = input.value.trim();
  if (!rawUrl) {
    alert("Pega un link válido de propiedad.");
    return;
  }

  const url = normalizePropertyUrl(rawUrl);

  resultado.innerHTML = "Generando ficha, un momento...";
  copyBtn.disabled = true;
  lastWhatsappText = null;

  try {
    const resp = await fetch(`${BACKEND_URL}?url=${encodeURIComponent(url)}`);
    if (!resp.ok) throw new Error("Error en respuesta del servidor");

    const data = await resp.json();

    if (!data.ok) {
      resultado.innerHTML = `
        <div class="ficha error">
          <p>Error desde backend:</p>
          <pre>${data.error || "Error desconocido"}</pre>
        </div>
      `;
      return;
    }

    // Render ficha visual
    resultado.innerHTML = renderFicha(data);
    attachGalleryHandlers();

    // Generar texto de WhatsApp y guardarlo solo para el botón
    const ai = data.ai || {};
    const precioUFNum = parseNumber(data.precio_uf);
    const m2UtileNum = parseNumber(data.m2_utile);
    const m2TotalNum = parseNumber(data.m2_total);

    const ufM2Util = (precioUFNum && m2UtileNum)
      ? (precioUFNum / m2UtileNum).toFixed(0)
      : null;

    const ufM2Total = (precioUFNum && m2TotalNum)
      ? (precioUFNum / m2TotalNum).toFixed(0)
      : null;

    lastWhatsappText = buildWhatsappText(data, ai, {
      ufM2Util,
      ufM2Total
    });
    copyBtn.disabled = false;
    copyBtn.textContent = "Copiar texto WhatsApp";

  } catch (err) {
    console.error(err);
    resultado.innerHTML = `
      <div class="ficha error">
        <p>Ocurrió un error conectando con el backend.</p>
        <p>${err.message}</p>
      </div>
    `;
    copyBtn.disabled = true;
    lastWhatsappText = null;
  }
}

// Normaliza URL del aviso (se come el #polycard y similares)
function normalizePropertyUrl(url) {
  const parts = url.split(" ");
  url = parts[0];

  const hashIdx = url.indexOf("#");
  if (hashIdx !== -1) {
    url = url.substring(0, hashIdx);
  }

  return url.trim();
}

// Parsear UF y m2 a número
function parseNumber(str) {
  if (!str || str === "N/D") return null;
  const clean = String(str).replace(/\./g, "").replace(",", ".");
  const num = Number(clean);
  return Number.isFinite(num) ? num : null;
}

// Sacar ID MLC-xxxx desde la URL
function getPortalId(sourceUrl) {
  if (!sourceUrl) return null;
  const m = sourceUrl.match(/\/(MLC-\d+)-/i);
  return m ? m[1] : null;
}

// Hace que las miniaturas cambien la foto principal al hacer click
function attachGalleryHandlers() {
  const main = document.querySelector(".main-photo");
  const thumbs = document.querySelectorAll(".thumb-photo");
  if (!main || !thumbs.length) return;

  thumbs.forEach((thumb) => {
    thumb.addEventListener("click", () => {
      const url = thumb.dataset.photoUrl || thumb.src;
      if (!url) return;
      main.src = url;

      // marcar thumb activa
      thumbs.forEach(t => t.classList.remove("active-thumb"));
      thumb.classList.add("active-thumb");
    });
  });
}

// Render principal de la ficha (sin texto de WhatsApp)
function renderFicha(data) {
  const ai = data.ai || {};
  const portalId = getPortalId(data.sourceUrl);

  const precioUFNum = parseNumber(data.precio_uf);
  const m2UtileNum = parseNumber(data.m2_utile);
  const m2TotalNum = parseNumber(data.m2_total);

  const ufM2Util = (precioUFNum && m2UtileNum)
    ? (precioUFNum / m2UtileNum).toFixed(0)
    : null;

  const ufM2Total = (precioUFNum && m2TotalNum)
    ? (precioUFNum / m2TotalNum).toFixed(0)
    : null;

  // --- NUEVA LÓGICA DE IMÁGENES ---
  // Construimos un array con todas las imágenes sin duplicados
  const allImages = [];
  (data.image_urls || []).forEach((u) => {
    if (u && !allImages.includes(u)) {
      allImages.push(u);
    }
  });

  // Determinamos mainImg
  let mainImg = data.main_image_url || null;
  if (!mainImg && allImages.length > 0) {
    mainImg = allImages[0];
  }

  // Si tenemos mainImg pero no está en allImages, la ponemos al inicio
  if (mainImg && !allImages.includes(mainImg)) {
    allImages.unshift(mainImg);
  }

  let html = `
    <div class="ficha">
      <div class="ficha-header">
        <div class="ficha-photos">
  `;

  if (mainImg) {
    html += `
      <div class="main-photo-wrapper">
        <img class="main-photo" src="${mainImg}" alt="Foto principal propiedad" />
      </div>
    `;
  }

  if (allImages.length > 0) {
    html += `<div class="thumbs-row">`;
    allImages.forEach((url) => {
      const isActive = url === mainImg;
      html += `
        <img
          class="thumb-photo ${isActive ? "active-thumb" : ""}"
          src="${url}"
          data-photo-url="${url}"
          alt="Foto propiedad"
        />
      `;
    });
    html += `</div>`;
  }

  html += `
        </div>

        <div class="ficha-meta">
          <h2>${data.titulo || "Propiedad sin título"}</h2>
          <div class="tags-row">
            ${portalId ? `<span class="tag">ID: ${portalId}</span>` : ""}
          </div>

          <div class="datos-basicos-grid">
            <div>
              <span class="label">Precio UF</span>
              <span class="value">${data.precio_uf || "N/D"}</span>
            </div>
            <div>
              <span class="label">Programa</span>
              <span class="value">${data.programa || "N/D"}</span>
            </div>
            <div>
              <span class="label">Útil (m²)</span>
              <span class="value">${data.m2_utile || "N/D"}</span>
            </div>
            <div>
              <span class="label">Terraza (m²)</span>
              <span class="value">${data.m2_terraza || "N/D"}</span>
            </div>
            <div>
              <span class="label">Total (m²)</span>
              <span class="value">${data.m2_total || "N/D"}</span>
            </div>
            <div>
              <span class="label">Estac.</span>
              <span class="value">${data.estacionamientos || "N/D"}</span>
            </div>
            <div>
              <span class="label">Bodegas</span>
              <span class="value">${data.bodegas || "N/D"}</span>
            </div>
            <div>
              <span class="label">Piso</span>
              <span class="value">${data.piso || "N/D"}</span>
            </div>
            <div>
              <span class="label">Orientación</span>
              <span class="value">${data.orientacion || "N/D"}</span>
            </div>
            <div>
              <span class="label">Antigüedad</span>
              <span class="value">${data.antiguedad || "N/D"}</span>
            </div>
            <div>
              <span class="label">G. comunes</span>
              <span class="value">${data.gastos_comunes === "N/D" ? "N/D" : "$ " + data.gastos_comunes}</span>
            </div>
  `;

  if (ufM2Util) {
    html += `
            <div>
              <span class="label">UF/m² útil</span>
              <span class="value">${ufM2Util}</span>
            </div>
    `;
  }

  if (ufM2Total) {
    html += `
            <div>
              <span class="label">UF/m² total</span>
              <span class="value">${ufM2Total}</span>
            </div>
    `;
  }

  html += `
          </div>
        </div>
      </div> <!-- /ficha-header -->
  `;

  // Bloque IA
  if (ai && (ai.descripcion_ejecutiva || (ai.highlights && ai.highlights.length) || ai.match_cliente)) {
    html += `
      <div class="ficha-body">
        ${ai.descripcion_ejecutiva ? `
          <h3>Descripción ejecutiva</h3>
          <p>${ai.descripcion_ejecutiva}</p>
        ` : ""}

        ${(ai.highlights && ai.highlights.length) ? `
          <h3>Highlights</h3>
          <ul>
            ${ai.highlights.map(h => `<li>${h}</li>`).join("")}
          </ul>
        ` : ""}

        ${ai.match_cliente ? `
          <h3>Match con el cliente</h3>
          <p>${ai.match_cliente}</p>
        ` : ""}
      </div>
    `;
  } else {
    html += `
      <div class="ficha-body">
        <h3>Descripción</h3>
        <p>${data.descripcion_raw || "Sin descripción disponible."}</p>
      </div>
    `;
  }

  // Footer técnico
  html += `
      <div class="ficha-footer">
        <span>URL procesada: </span>
        <a href="${data.sourceUrl}" target="_blank" rel="noopener noreferrer">
          ${data.sourceUrl}
        </a>
      </div>
    </div>
  `;

  return html;
}

// Arma texto compacto para WhatsApp (USO INTERNO)
function buildWhatsappText(data, ai, extra) {
  const titulo = data.titulo || "Propiedad";
  const precioUF = data.precio_uf || "N/D";
  const m2U = data.m2_utile || "N/D";
  const m2T = data.m2_total || "N/D";
  const m2Ter = data.m2_terraza || "N/D";
  const prog = data.programa || "N/D";
  const estac = data.estacionamientos || "N/D";
  const bodegas = data.bodegas || "N/D";

  const ufM2U = extra.ufM2Util ? `${extra.ufM2Util} UF/m² útil` : null;
  const ufM2T = extra.ufM2Total ? `${extra.ufM2Total} UF/m² total` : null;

  let lineas = [];

  lineas.push(`Te comparto el resumen de esta propiedad:`);
  lineas.push(``);
  lineas.push(`${titulo}`);
  lineas.push(`Precio: UF ${precioUF}`);
  lineas.push(`Programa: ${prog}`);
  lineas.push(`Superficies: ${m2U} m² útiles, ${m2Ter} m² terraza, ${m2T} m² totales`);
  lineas.push(`Estac/Bodegas: ${estac} estac, ${bodegas} bodegas`);

  if (ufM2U || ufM2T) {
    lineas.push(``);
    lineas.push(`Indicadores:`);
    if (ufM2U) lineas.push(`- ${ufM2U}`);
    if (ufM2T) lineas.push(`- ${ufM2T}`);
  }

  if (ai && ai.descripcion_ejecutiva) {
    lineas.push(``);
    lineas.push(`Descripción ejecutiva:`);
    lineas.push(ai.descripcion_ejecutiva);
  }

  lineas.push(``);
  lineas.push(`Link: ${data.sourceUrl}`);

  return lineas.join("\n");
}
