const CorteDiario = require("../models/corteDiarioModel");
const deudoresController = require("./deudoresControllers");
const Cobro = require("../models/cobroModel");
const Deudor = require("../models/deudorModel");
const { Op } = require("sequelize");
const PreCorteDiario = require("../models/PreCorteDiarioModel");
const moment = require("moment-timezone");

// Función para obtener el inicio y fin del día en hora local (America/Mexico_City)
function obtenerRangoDiaActualLocal() {
  const ahora = moment().tz("America/Mexico_City");
  const fechaInicioLocal = ahora
    .clone()
    .startOf("day")
    .format("YYYY-MM-DD HH:mm:ss");
  const fechaFinLocal = ahora
    .clone()
    .endOf("day")
    .format("YYYY-MM-DD HH:mm:ss");
  return { fechaInicioLocal, fechaFinLocal };
}

exports.registrarCorteDiario = async (req, res) => {
  const { collector_id } = req.body;
  if (!collector_id) {
    return res
      .status(400)
      .json({ error: "El ID del cobrador es obligatorio." });
  }
  try {
    // 1. Obtener el rango del día en hora local
    const { fechaInicioLocal, fechaFinLocal } = obtenerRangoDiaActualLocal();
    console.log(
      "📆 Rango Local: Inicio:",
      fechaInicioLocal,
      "Fin:",
      fechaFinLocal
    );

    // 2. Convertir esos límites a UTC para las consultas
    const fechaInicioUTC = moment
      .tz(fechaInicioLocal, "America/Mexico_City")
      .utc()
      .format("YYYY-MM-DD HH:mm:ss");
    const fechaFinUTC = moment
      .tz(fechaFinLocal, "America/Mexico_City")
      .utc()
      .format("YYYY-MM-DD HH:mm:ss");
    console.log("📆 Rango UTC: Inicio:", fechaInicioUTC, "Fin:", fechaFinUTC);

    // 3. Verificar si ya existe un corte para hoy (usamos los límites en UTC)
    const corteExistente = await CorteDiario.findOne({
      where: {
        collector_id,
        fecha: { [Op.between]: [fechaInicioUTC, fechaFinUTC] },
      },
    });
    if (corteExistente) {
      return res
        .status(400)
        .json({ error: "Ya existe un corte diario para hoy." });
    }

    // 4. Obtener todos los cobros del día, usando límites UTC
    const cobros = await Cobro.findAll({
      where: {
        collector_id,
        payment_date: { [Op.between]: [fechaInicioUTC, fechaFinUTC] },
      },
    });
    const deudoresCobros = Array.from(new Set(cobros.map((c) => c.debtor_id)));

    // 5. Obtener nuevos deudores (primeros pagos) dentro del rango UTC
    const nuevosDeudores = await deudoresController.obtenerNuevosDeudores(
      collector_id,
      fechaInicioUTC,
      fechaFinUTC
    );

    // 6. Calcular totales y estadísticas
    const cobranzaTotal = cobros.reduce(
      (sum, c) => sum + parseFloat(c.amount),
      0
    );

    const primerosPagosMontos = nuevosDeudores.map((d) => d.first_payment);
    // Sumamos los primeros pagos de los nuevos deudores
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

    // 7. Definir "ahora" en hora local y su equivalente UTC para el corte
    const ahoraLocal = moment().tz("America/Mexico_City");
    const fechaActualUTC = ahoraLocal
      .clone()
      .utc()
      .format("YYYY-MM-DD HH:mm:ss");

    // 8. Registrar el corte diario usando la hora actual en UTC
    const corteDiario = await CorteDiario.create({
      collector_id,
      fecha: fechaActualUTC,
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
      // primeros_pagos_monto: primerosPagosMontos || 0,
      nuevos_deudores: nuevosDeudores.length,
      deudores_totales: deudoresActivos,
    });

    // 9. Eliminar pre-cortes del día (usando límites UTC)
    await PreCorteDiario.destroy({
      where: {
        collector_id,
        fecha: { [Op.between]: [fechaInicioUTC, fechaFinUTC] },
      },
    });

    console.log("📅 Fecha guardada en corteDiario:", corteDiario.fecha);

    console.log("✅ Corte Diario registrado exitosamente.", corteDiario);
    res.status(201).json({
      message: "Corte Diario registrado exitosamente.",
      corteDiario,
    });
  } catch (error) {
    console.error("❌ Error al registrar el corte diario:", error);
    res.status(500).json({
      error: "Error al registrar el corte diario.",
      detalle: error.message,
    });
  }
};

exports.obtenerCortesDiarios = async (req, res) => {
  try {
    const { id } = req.params;
    const cortesDiarios = await CorteDiario.findAll({
      where: { collector_id: id },
      order: [["fecha", "DESC"]],
    });
    // Al enviar, convertimos de UTC a la zona local para mostrar
    const cortesAjustados = cortesDiarios.map((corte) => ({
      ...corte.toJSON(),
      fecha: moment
        .utc(corte.fecha)
        .tz("America/Mexico_City")
        .format("YYYY-MM-DD HH:mm:ss"),
    }));
    res.json(cortesAjustados);
  } catch (error) {
    console.error("❌ Error al obtener los cortes diarios:", error);
    res.status(500).json({ error: "Error al obtener los cortes diarios." });
  }
};

exports.obtenerCortesPorCobrador = async (req, res) => {
  try {
    const { id } = req.params;
    const cortes = await CorteDiario.findAll({
      where: { collector_id: id },
    });
    const cortesAjustados = cortes.map((corte) => ({
      ...corte.toJSON(),
      fecha: moment
        .utc(corte.fecha)
        .tz("America/Mexico_City")
        .format("YYYY-MM-DD HH:mm:ss"),
    }));
    res.json(cortesAjustados);
  } catch (error) {
    console.error("Error al obtener los cortes por cobrador:", error);
    res
      .status(500)
      .json({ message: "Error al obtener los cobros por cobrador." });
  }
};

exports.deleteCorteDiario = async (req, res) => {
  const { id } = req.params;
  try {
    const corteDiario = await CorteDiario.findByPk(id);
    if (!corteDiario) {
      return res.status(404).json({ error: "❌ Corte diario no encontrado" });
    }
    await corteDiario.destroy();
    res.json({ message: "✅ Corte diario eliminado exitosamente" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
