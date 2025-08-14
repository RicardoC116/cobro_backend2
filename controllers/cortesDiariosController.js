const CorteDiario = require("../models/corteDiarioModel");
const deudoresController = require("./deudoresControllers");
const Cobro = require("../models/cobroModel");
const Deudor = require("../models/deudorModel");
const { Op } = require("sequelize");
const PreCorteDiario = require("../models/PreCorteDiarioModel");
const moment = require("moment-timezone");

// 🔹 Función para obtener el rango de un día en zona horaria de México
function obtenerRangoDiaLocal(fecha) {
  const dia = moment.tz(fecha, "America/Mexico_City");
  const fechaInicioLocal = dia
    .clone()
    .startOf("day")
    .format("YYYY-MM-DD HH:mm:ss");
  const fechaFinLocal = dia.clone().endOf("day").format("YYYY-MM-DD HH:mm:ss");
  return { fechaInicioLocal, fechaFinLocal };
}

exports.registrarCorteDiario = async (req, res) => {
  const { collector_id, fecha } = req.body;

  if (!collector_id) {
    return res
      .status(400)
      .json({ error: "El ID del cobrador es obligatorio." });
  }

  try {
    // 🔹 Si no envían fecha, se usa la actual
    const fechaSeleccionada =
      fecha || moment().tz("America/Mexico_City").format("YYYY-MM-DD");

    // 🔹 Obtener rango de la fecha seleccionada en horario local
    const { fechaInicioLocal, fechaFinLocal } =
      obtenerRangoDiaLocal(fechaSeleccionada);

    // 🔹 Convertir a UTC para la consulta
    const fechaInicioUTC = moment
      .tz(fechaInicioLocal, "America/Mexico_City")
      .utc()
      .format("YYYY-MM-DD HH:mm:ss");
    const fechaFinUTC = moment
      .tz(fechaFinLocal, "America/Mexico_City")
      .utc()
      .format("YYYY-MM-DD HH:mm:ss");

    console.log(
      `📅 Rango solicitado (${fechaSeleccionada}):`,
      fechaInicioUTC,
      "→",
      fechaFinUTC
    );

    // 🔹 Verificar si ya existe un corte para esa fecha
    const corteExistente = await CorteDiario.findOne({
      where: {
        collector_id,
        fecha: { [Op.between]: [fechaInicioUTC, fechaFinUTC] },
      },
    });
    if (corteExistente) {
      return res
        .status(400)
        .json({
          error: `Ya existe un corte para la fecha ${fechaSeleccionada}.`,
        });
    }

    // 🔹 Buscar cobros del día
    const cobros = await Cobro.findAll({
      where: {
        collector_id,
        payment_date: { [Op.between]: [fechaInicioUTC, fechaFinUTC] },
      },
    });

    const deudoresCobros = Array.from(new Set(cobros.map((c) => c.debtor_id)));

    // 🔹 Nuevos deudores (primeros pagos)
    const nuevosDeudores = await deudoresController.obtenerNuevosDeudores(
      collector_id,
      fechaInicioUTC,
      fechaFinUTC
    );

    // 🔹 Totales
    const cobranzaTotal = cobros.reduce(
      (sum, c) => sum + parseFloat(c.amount),
      0
    );
    const primerosPagosMontos = nuevosDeudores.map((d) => d.first_payment);
    const primerosPagosTotal = primerosPagosMontos.reduce(
      (sum, monto) => sum + parseFloat(monto),
      0
    );

    const liquidacionesTotal = cobros
      .filter((c) => c.payment_type === "liquidación")
      .reduce((sum, c) => sum + parseFloat(c.amount), 0);

    const deudoresLiquidados = cobros.filter(
      (c) => c.payment_type === "liquidación"
    ).length;
    const deudoresActivos = await Deudor.count({
      where: { collector_id, balance: { [Op.gt]: 0 } },
    });
    const noPagosTotal = deudoresActivos - deudoresCobros.length;

    // 🔹 Guardar corte con la fecha seleccionada (en UTC)
    const fechaCorteUTC = moment
      .tz(fechaSeleccionada, "America/Mexico_City")
      .utc()
      .format("YYYY-MM-DD HH:mm:ss");

    const corteDiario = await CorteDiario.create({
      collector_id,
      fecha: fechaCorteUTC,
      cobranza_total: cobranzaTotal,
      deudores_cobrados: deudoresCobros.length,
      liquidaciones_total: liquidacionesTotal,
      deudores_liquidados: deudoresLiquidados,
      no_pagos_total: noPagosTotal,
      creditos_total: nuevosDeudores.length,
      creditos_total_monto:
        deudoresController.calcularCreditosTotales(nuevosDeudores) || 0,
      primeros_pagos_total: nuevosDeudores.length,
      primeros_pagos_montos: primerosPagosTotal,
      nuevos_deudores: nuevosDeudores.length,
      deudores_totales: deudoresActivos,
    });

    // 🔹 Eliminar pre-cortes de ese día
    await PreCorteDiario.destroy({
      where: {
        collector_id,
        fecha: { [Op.between]: [fechaInicioUTC, fechaFinUTC] },
      },
    });

    console.log("✅ Corte registrado:", corteDiario.toJSON());
    res
      .status(201)
      .json({ message: "Corte registrado exitosamente.", corteDiario });
  } catch (error) {
    console.error("❌ Error al registrar el corte diario:", error);
    res
      .status(500)
      .json({
        error: "Error al registrar el corte diario.",
        detalle: error.message,
      });
  }
};
