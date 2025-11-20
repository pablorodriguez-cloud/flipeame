const btn = document.getElementById("generateBtn");
const input = document.getElementById("urlInput");
const resultado = document.getElementById("resultado");

// Más adelante vamos a poner aquí la URL real de tu Web App de Apps Script
const BACKEND_URL = "https://tu-webapp-url-va-aqui.com";

btn.addEventListener("click", async () => {
  const url = input.value.trim();
  if (!url) {
    alert("Pega un link válido de propiedad.");
    return;
  }

  resultado.innerHTML = "Generando ficha, dame un segundo...";

  try {
    // Placeholder mientras conectamos el backend real
    const dummyData = {
      titulo: "Propiedad demo Flipeame",
      precio_uf: 15000,
      programa: "3D / 3B / 2 EST",
      descripcion: "Esto es solo un placeholder mientras conectamos el backend."
    };

    resultado.innerHTML = `
      <h2>${dummyData.titulo}</h2>
      <p><strong>Precio UF:</strong> ${dummyData.precio_uf}</p>
      <p><strong>Programa:</strong> ${dummyData.programa}</p>
      <p>${dummyData.descripcion}</p>
    `;
  } catch (err) {
    console.error(err);
    resultado.innerHTML = "Ocurrió un error generando la ficha.";
  }
});
