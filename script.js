const btn = document.getElementById("generateBtn");
const input = document.getElementById("urlInput");
const resultado = document.getElementById("resultado");

// Pon aquí la URL de tu Web App de Apps Script (la que copiaste recién)
const BACKEND_URL = "https://script.google.com/macros/s/AKfycbwksM2kjeV5ffPMv-efll2GiKQicyaoEpRtgNyYBBAdm3wNjofSHccnTS01TI5IsvQ/exec";

btn.addEventListener("click", async () => {
  const url = input.value.trim();
  if (!url) {
    alert("Pega un link válido de propiedad.");
    return;
  }

  resultado.innerHTML = "Generando ficha, dame un segundo...";

  try {
    const resp = await fetch(`${BACKEND_URL}?url=${encodeURIComponent(url)}`);
    if (!resp.ok) throw new Error("Error en respuesta del servidor");

    const data = await resp.json();
    resultado.innerHTML = renderFicha(data);

  } catch (err) {
    console.error(err);
    resultado.innerHTML = "Ocurrió un error generando la ficha (conexión backend).";
  }
});


function renderFicha(data) {
  const ai = data.ai;

  let html = `
    <div class="ficha">
      <h2>${data.titulo}</h2>

      <div class="datos-basicos">
        <p><strong>Precio UF:</strong> ${data.precio_uf}</p>
        <p><strong>Superficie útil:</strong> ${data.m2_utile} m²</p>
        <p><strong>Superficie total:</strong> ${data.m2_total} m²</p>
        <p><strong>Programa:</strong> ${data.programa}</p>
        <p><strong>Gastos comunes aprox:</strong> ${data.gastos_comunes === "N/D" ? "N/D" : "$ " + data.gastos_comunes}</p>
      </div>
  `;

  // Si hay IA → mostramos la ficha profesional
  if (ai) {
    html += `
      <hr />

      <h3>Descripción Ejecutiva</h3>
      <p>${ai.descripcion_ejecutiva}</p>

      <h3>Highlights</h3>
      <ul>
        ${(ai.highlights || []).map(h => `<li>${h}</li>`).join("")}
      </ul>

      <h3>Match con el Cliente</h3>
      <p>${ai.match_cliente}</p>
    `;
  } else {
    html += `
      <h3>Descripción</h3>
      <p>${data.descripcion_raw}</p>
    `;
  }

  html += `
      <hr />
      <p style="font-size:0.8rem; color:#666;">
        <strong>URL procesada:</strong> ${data.sourceUrl}
      </p>
    </div>
  `;

  return html;
}

