// preCorteDiarioController.js

const moment = require("moment-timezone");
const PreCorteDiario = require("../models/PreCorteDiarioModel");
const deudoresController = require("./deudoresControllers");
const cobrosController = require("./cobrosController");
const { Op } = require("sequelize");
const CorteDiario = require("../models/corteDiarioModel");
const Cobrador = require("../models/cobradorModel");
const Deudor = require("../models/deudorModel");

// Función para obtener el inicio y fin del día en la zona horaria de México
function obtenerRangoDiaActual() {
  const ahora = moment().tz("America/Mexico_City");
  const fechaInicio = ahora
    .clone()
    .startOf("day")
    .format("YYYY-MM-DD HH:mm:ss");
  const fechaFin = ahora.clone().endOf("day").format("YYYY-MM-DD HH:mm:ss");
  return { fechaInicio, fechaFin };
}

// Método para registrar el pre-corte
exports.registrarPreCorte = async (req, res) => {
  const { collector_id, ventanilla_id, agente } = req.body;

  if (!collector_id || !ventanilla_id || !agente) {
    return res
      .status(400)
      .json({ error: "Todos los campos son obligatorios." });
  }

  try {
    // Obtener el rango del día (para filtrar pre-cortes del día actual)
    const { fechaInicio } = obtenerRangoDiaActual();
    // Tomamos la hora actual (fin efectivo de consulta)
    const fechaActual = moment().tz("America/Mexico_City");

    console.log("📆 Inicio del Día:", fechaInicio);
    console.log(
      "📆 Momento Actual:",
      fechaActual.format("YYYY-MM-DD HH:mm:ss")
    );

    // Buscar el último pre-corte del día
    const ultimoPreCorte = await PreCorteDiario.findOne({
      where: {
        collector_id,
        fecha: {
          [Op.between]: [
            fechaInicio,
            fechaActual.format("YYYY-MM-DD HH:mm:ss"),
          ],
        },
      },
      order: [["fecha", "DESC"]],
    });

    let fechaConsulta;
    if (ultimoPreCorte) {
      // Usamos la fecha del último pre-corte, opcionalmente le sumamos 1 segundo para evitar solapamientos
      fechaConsulta = moment(ultimoPreCorte.fecha)
        .tz("America/Mexico_City")
        .add(1, "second");
      console.log(
        "Último Pre-Corte encontrado. Se consultarán datos desde:",
        fechaConsulta.format("YYYY-MM-DD HH:mm:ss")
      );
    } else {
      // Si no hay pre-corte hoy, usamos el inicio del día
      fechaConsulta = moment(fechaInicio).tz("America/Mexico_City");
      console.log(
        "No se encontró pre-corte hoy. Se consultarán datos desde el inicio del día:",
        fechaConsulta.format("YYYY-MM-DD HH:mm:ss")
      );
    }

    // Ahora, consultamos los cobros y demás datos desde fechaConsulta hasta el momento actual
    const cobros = await cobrosController.obtenerCobrosEnRango(
      collector_id,
      fechaConsulta.format("YYYY-MM-DD HH:mm:ss"),
      fechaActual.format("YYYY-MM-DD HH:mm:ss")
    );

    // Deudores que pagaron (a partir de los cobros)
    const deudoresCobros = Array.from(new Set(cobros.map((c) => c.debtor_id)));

    // Obtener nuevos deudores desde fechaConsulta hasta el momento actual
    const nuevosDeudores = await deudoresController.obtenerNuevosDeudores(
      collector_id,
      fechaConsulta.format("YYYY-MM-DD HH:mm:ss"),
      fechaActual.format("YYYY-MM-DD HH:mm:ss")
    );
    const primerosPagosMontos =
      deudoresController.calcularPrimerosPagos(nuevosDeudores);
    const deudoresPrimerosPagos = nuevosDeudores.map((d) => d.id);

    // Unificar deudores que pagaron
    const deudoresPagaron = Array.from(
      new Set([...deudoresCobros, ...deudoresPrimerosPagos])
    );

    // Calcular estadísticas
    const cobranzaTotal = cobrosController.calcularCobranzaTotal(cobros) || 0;
    const liquidaciones = cobrosController.calcularLiquidaciones(cobros) || {
      total: 0,
      deudoresLiquidados: [],
    };

    const deudoresActivos = await Deudor.count({ where: { collector_id } });
    const noPagosTotal =
      deudoresController.obtenerDeudoresNoPagaron(
        deudoresActivos,
        deudoresPagaron
      ) || 0;

    // Guardar el pre-corte usando la hora actual (fechaActual) como momento de registro
    const preCorteData = {
      collector_id,
      ventanilla_id,
      agente,
      fecha: fechaActual.utc().format("YYYY-MM-DD HH:mm:ss"), // Guardar en UTC
      cobranza_total: cobranzaTotal,
      deudores_cobrados: deudoresPagaron.length || 0,
      liquidaciones_total: liquidaciones.total || 0,
      deudores_liquidados: liquidaciones.deudoresLiquidados.length || 0,
      no_pagos_total: noPagosTotal || 0,
      creditos_total: nuevosDeudores.length || 0,
      creditos_total_monto:
        deudoresController.calcularCreditosTotales(nuevosDeudores) || 0,
      primeros_pagos_total: deudoresPrimerosPagos.length || 0,
      primeros_pagos_montos: primerosPagosMontos || 0,
      nuevos_deudores: nuevosDeudores.length || 0,
      deudores_totales: deudoresActivos || 0,
    };

    await PreCorteDiario.create(preCorteData);
    console.log("Pre-corte registrado exitosamente.", preCorteData);
    res.status(201).json({ message: "Pre-corte registrado exitosamente." });
  } catch (error) {
    console.error("Error al registrar el pre-corte:", error);
    res.status(500).json({ error: "Error al registrar el pre-corte." });
  }
};

exports.obtenerPreCorte = async (req, res) => {
  try {
    const { id } = req.params;
    const preCortes = await PreCorteDiario.findAll({
      where: { collector_id: id },
    });

    // Convertir fechas de UTC a la zona horaria de México antes de enviarlas
    const preCortesAjustados = preCortes.map((preCorte) => ({
      ...preCorte.toJSON(),
      fecha: moment.utc(preCorte.fecha).tz("America/Mexico_City").format(),
    }));

    res.json(preCortesAjustados);
  } catch (error) {
    console.error("Error al obtener los Pre-Cortes por cobrador:", error);
    res
      .status(500)
      .json({ message: "Error al obtener los cobros por cobrador." });
  }
};

exports.deletePreCorte = async (req, res) => {
  const { id } = req.params;
  try {
    const preCorte = await PreCorteDiario.findByPk(id);
    if (!preCorte) {
      return res.status(404).json({ error: "Pre-corte no encontrado" });
    }
    await preCorte.destroy();
    res.json({ message: "Pre-corte eliminado exitosamente" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
