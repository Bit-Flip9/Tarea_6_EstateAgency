/**
 * @file credito.js
 * @description Lógica de cálculo, validación, persistencia y proyección del crédito hipotecario.
 */

document.addEventListener("DOMContentLoaded", () => {

  // Listado de IDs del formulario para automatizar la lectura y carga desde LocalStorage
  const camposFormulario = [
    "correo", "nombre", "fechaNacimiento", "salario",
    "valorVivienda", "montoSolicitar", "plazoAnios", "tasaInteres"
  ];

  const sliderPlazo = document.getElementById("plazoAnios");
  const lblPlazo = document.getElementById("lblPlazo");

  // Actualiza el número de años mostrado junto al control deslizante en tiempo real
  sliderPlazo.addEventListener("input", () => {
    lblPlazo.textContent = sliderPlazo.value;
  });

  // Recupera datos previos desde LocalStorage y los asigna de vuelta a los inputs del DOM
  const datosGuardados = JSON.parse(localStorage.getItem("datosCreditoHappyEart"));
  if (datosGuardados) {
    camposFormulario.forEach((id) => {
      if (datosGuardados[id] !== undefined) {
        document.getElementById(id).value = datosGuardados[id];
      }
    });
    lblPlazo.textContent = document.getElementById("plazoAnios").value;
  }

  // Formatea cifras numéricas al estándar local con separadores de miles y dos decimales
  function formatearMoneda(valor) {
    return valor.toLocaleString("es-CR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // Calcula la edad exacta en años comparando la fecha de nacimiento con la fecha actual
  function calcularEdad(fechaNac) {
    const hoy = new Date();
    const nacimiento = new Date(fechaNac);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const diferenciaMes = hoy.getMonth() - nacimiento.getMonth();

    if (diferenciaMes < 0 || (diferenciaMes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  }

  // Calcula el monto de interés de un mes específico iterando sobre el saldo amortizado
  function interes(tasaMensual, mes, pagoMensual, montoSolicitado) {
    var vInteres = 0;
    var amortiza = montoSolicitado;

    for (var i = 1; i <= mes; i++) {
      vInteres = (amortiza * (tasaMensual / 100));
      amortiza = amortiza - (pagoMensual - vInteres);
    }
    return vInteres;
  }

  // Captura entradas, valida reglas de negocio, ejecuta cálculos y guarda en LocalStorage
  function realizarCalculos() {
    // Mapeo y conversión de los valores del DOM (de texto HTML a tipos de datos JS)
    const correo = document.getElementById("correo").value.trim();
    const nombre = document.getElementById("nombre").value.trim();
    const fechaNacimiento = document.getElementById("fechaNacimiento").value;
    const salario = parseFloat(document.getElementById("salario").value);
    const valorVivienda = parseFloat(document.getElementById("valorVivienda").value);
    const montoSolicitar = parseFloat(document.getElementById("montoSolicitar").value);
    const plazoAnios = parseInt(document.getElementById("plazoAnios").value);
    const tasaAnual = parseFloat(document.getElementById("tasaInteres").value);

    // Validación de campos vacíos o valores no numéricos
    if (!correo || !nombre || !fechaNacimiento || isNaN(salario) || isNaN(valorVivienda) || isNaN(montoSolicitar) || isNaN(tasaAnual)) {
      alert("Por favor complete todos los campos correctamente antes de calcular.");
      return null;
    }

    // Restricción de financiamiento máximo (80% del valor de la vivienda)
    const maxFinanciamiento = valorVivienda * 0.80;
    if (montoSolicitar > maxFinanciamiento) {
      alert(`El monto a solicitar no puede superar el 80% del valor de la vivienda (${formatearMoneda(maxFinanciamiento)}).`);
      return null;
    }

    // Cálculo de cuota mensual (anualidad) y salario mínimo requerido (relación 40%)
    const tm = tasaAnual / 12;
    const tasaDecimal = tm / 100;
    const p = plazoAnios * 12;
    const factor = Math.pow(1 + tasaDecimal, p);
    const pm = (montoSolicitar * tasaDecimal * factor) / (factor - 1);
    const salarioMinimo = pm / 0.40;

    // Escritura de resultados numéricos en los inputs de salida del DOM
    document.getElementById("cuota").value = formatearMoneda(pm);
    document.getElementById("ingresoRequerido").value = formatearMoneda(salarioMinimo);

    // Evaluación de suficiencia salarial y actualización visual de etiqueta
    const lblSalario = document.getElementById("lblSalarioStatus");
    if (salario >= salarioMinimo) {
      lblSalario.textContent = "Monto de salario suficiente para el crédito";
      lblSalario.className = "fw-bold mb-1 text-success";
    } else {
      lblSalario.textContent = "Monto de salario insuficiente";
      lblSalario.className = "fw-bold mb-1 text-danger";
    }

    // Evaluación de rango de edad permitido (> 22 y < 55 años)
    const edad = calcularEdad(fechaNacimiento);
    const lblEdad = document.getElementById("lblEdadStatus");
    if (edad > 22 && edad < 55) {
      lblEdad.textContent = "Cliente con edad suficiente para crédito";
      lblEdad.className = "fw-bold mb-3 text-success";
    } else {
      lblEdad.textContent = "Cliente no califica para crédito por edad";
      lblEdad.className = "fw-bold mb-3 text-danger";
    }

    // Cálculo y despliegue del porcentaje a financiar
    const porcentajeFinanciar = (montoSolicitar / valorVivienda) * 100;
    document.getElementById("lblPorcentaje").textContent = `${porcentajeFinanciar.toFixed(0)}%`;

    // Serialización y guardado de los datos ingresados en LocalStorage
    const objetoDatos = {
      correo, nombre, fechaNacimiento, salario,
      valorVivienda, montoSolicitar, plazoAnios, tasaInteres: tasaAnual
    };
    localStorage.setItem("datosCreditoHappyEart", JSON.stringify(objetoDatos));

    return { tm, p, pm, montoSolicitar };
  }

  document.getElementById("btnCalcular").addEventListener("click", realizarCalculos);

  // Genera e inyecta la tabla HTML de amortización mes a mes bajo los botones
  document.getElementById("btnProyeccion").addEventListener("click", () => {
    const datos = realizarCalculos();
    if (!datos) return;

    const { tm, p, pm, montoSolicitar } = datos;
    let saldo = montoSolicitar;

    let htmlTabla = `
      <table class="table table-bordered table-striped text-center">
        <thead class="table-dark">
          <tr>
            <th colspan="5">Crédito Happy Eart<br>Proyección de Crédito</th>
          </tr>
          <tr>
            <th>Mes</th>
            <th>Pago Mensual</th>
            <th>Intereses</th>
            <th>Amortización</th>
            <th>Saldo</th>
          </tr>
        </thead>
        <tbody>
    `;

    for (let mes = 1; mes <= p; mes++) {
      const vInteres = interes(tm, mes, pm, montoSolicitar);
      const amortizacion = pm - vInteres;
      saldo = saldo - amortizacion;

      htmlTabla += `
        <tr>
          <td>${mes}</td>
          <td>${formatearMoneda(pm)}</td>
          <td>${formatearMoneda(vInteres)}</td>
          <td>${formatearMoneda(amortizacion)}</td>
          <td>${formatearMoneda(Math.max(0, saldo))}</td>
        </tr>
      `;
    }

    htmlTabla += `</tbody></table>`;
    document.getElementById("contenedorProyeccion").innerHTML = htmlTabla;
  });

});