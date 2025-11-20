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
    // Llamamos al backend con la URL como query param
    const resp = await fetch(`${BACKEND_URL}?url=${encodeURIComponent(url)}`);

    if (!resp.ok) {
      throw new Error("Error en respuesta del servidor");
    }

    const data = await resp.json();

    resultado.innerHTML = `
      <h2>${data.titulo}</h2>
      <p><strong>Precio UF:</strong> ${data.precio_uf}</p>
      <p><strong>Programa:</strong> ${data.programa}</p>
      <p>${data.descripcion}</p>
      <p style="margin-top:1rem; font-size:0.85rem; color:#7A7A7A;">
        <strong>URL procesada:</strong> ${data.sourceUrl || "(no recibida)"}
      </p>
    `;
  } catch (err) {
    console.error(err);
    resultado.innerHTML = "Ocurrió un error generando la ficha (conexión backend).";
  }
});
