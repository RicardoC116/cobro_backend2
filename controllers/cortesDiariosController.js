// cortesDiariosController.js

const CorteDiario = require("../models/corteDiarioModel");
const deudoresController = require("./deudoresControllers");
const Cobro = require("../models/cobroModel");
const Deudor = require("../models/deudorModel");
const { Op } = require("sequelize");
const PreCorteDiario = require("../models/PreCorteDiarioModel");
const moment = require("moment-timezone");

// 📌 Función para obtener la fecha de inicio y fin del día en la zona horaria de México
function obtenerRangoDiaActual() {
  const ahora = moment().tz("America/Mexico_City");
  const fechaInicio = ahora
    .clone()
    .startOf("day")
    .format("YYYY-MM-DD HH:mm:ss");
  const fechaFin = ahora.clone().endOf("day").format("YYYY-MM-DD HH:mm:ss");
  return { fechaInicio, fechaFin };
}

exports.registrarCorteDiario = async (req, res) => {
  const { collector_id } = req.body;

  if (!collector_id) {
    return res
      .status(400)
      .json({ error: "El ID del cobrador es obligatorio." });
  }

  try {
    // 📌 Obtener fecha actual en la zona horaria configurada (México)
    const { fechaInicio, fechaFin } = obtenerRangoDiaActual();

    console.log("📆 Fecha Inicio:", fechaInicio);
    console.log("📆 Fecha Fin:", fechaFin);

    // 📌 Validar si ya existe un corte para hoy
    const corteExistente = await CorteDiario.findOne({
      where: {
        collector_id,
        fecha: { [Op.between]: [fechaInicio, fechaFin] },
      },
    });

    if (corteExistente) {
      return res
        .status(400)
        .json({ error: "Ya existe un corte diario para hoy." });
    }

    // 📌 Obtener todos los cobros del día
    const cobros = await Cobro.findAll({
      where: {
        collector_id,
        payment_date: { [Op.between]: [fechaInicio, fechaFin] },
      },
    });

    // 📌 Obtener IDs de deudores que pagaron
    const deudoresCobros = Array.from(new Set(cobros.map((c) => c.debtor_id)));

    // 📌 Obtener nuevos deudores (primeros pagos)
    const nuevosDeudores = await deudoresController.obtenerNuevosDeudores(
      collector_id,
      fechaInicio,
      fechaFin
    );

    // 📌 Calcular montos y estadísticas
    const cobranzaTotal = cobros.reduce(
      (sum, c) => sum + parseFloat(c.amount),
      0
    );
    const liquidacionesTotal = cobros
      .filter((c) => c.payment_type === "liquidación")
      .reduce((sum, c) => sum + parseFloat(c.amount), 0);
    const deudoresLiquidados = cobros.filter(
      (c) => c.payment_type === "liquidación"
    ).length;

    // 📌 Obtener total de deudores activos
    const deudoresActivos = await Deudor.count({ where: { collector_id } });

    // 📌 Calcular deudores que NO pagaron
    const noPagosTotal = deudoresActivos - deudoresCobros.length;

    // 📌 Registrar el corte diario
    const corteDiario = await CorteDiario.create({
      collector_id,
      fecha: new Date().toISOString().split("T")[0],
      cobranza_total: cobranzaTotal,
      deudores_cobrados: deudoresCobros.length,
      liquidaciones_total: liquidacionesTotal,
      deudores_liquidados: deudoresLiquidados,
      no_pagos_total: noPagosTotal,
      creditos_total: nuevosDeudores.length,
      creditos_total_monto:
        deudoresController.calcularCreditosTotales(nuevosDeudores) || 0,
      primeros_pagos_total: nuevosDeudores.length,
      primeros_pagos_monto:
        deudoresController.calcularPrimerosPagos(nuevosDeudores) || 0,
      nuevos_deudores: nuevosDeudores.length,
      deudores_totales: deudoresActivos,
    });

    // 📌 Eliminar pre-cortes después de hacer el corte definitivo
    await PreCorteDiario.destroy({
      where: {
        collector_id,
        fecha: { [Op.between]: [fechaInicio, fechaFin] },
      },
    });

    console.log(
      "Fecha antes de guardar:",
      moment().tz("America/Mexico_City").format("YYYY-MM-DD")
    );

    console.log(
      "Fecha de la base de datos:",
      moment
        .utc(corteDiario.fecha)
        .tz("America/Mexico_City")
        .format("YYYY-MM-DD")
    );

    // fecha: new Date().toISOString().split("T")[0],

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

// 📌 Obtener los cortes diarios registrados y convertir la fecha de UTC a `America/Mexico_City`
exports.obtenerCortesDiarios = async (req, res) => {
  try {
    const { id } = req.params;
    const cortesDiarios = await CorteDiario.findAll({
      where: { collector_id: id },
      order: [["fecha", "DESC"]],
    });

    // Convertir la fecha de UTC a la zona horaria de México antes de enviarla
    // const cortesAjustados = cortesDiarios.map((corte) => ({
    //   ...corte.toJSON(),
    //   fecha: moment.utc(corte.fecha).tz("America/Mexico_City").format(),
    // }));

    const cortesAjustados = cortesDiarios.map((corte) => ({
      ...corte.toJSON(),
      fecha: moment
        .utc(corte.fecha)
        .tz("America/Mexico_City")
        .format("YYYY-MM-DD"),
    }));

    res.json(cortesAjustados);
  } catch (error) {
    console.error("❌ Error al obtener los cortes diarios:", error);
    res.status(500).json({ error: "Error al obtener los cortes diarios." });
  }
};

// 📌 Obtener cortes por cobrador y convertir fechas
exports.obtenerCortesPorCobrador = async (req, res) => {
  try {
    const { id } = req.params; // Ajustar el nombre del parámetro
    const Corte = await CorteDiario.findAll({
      where: { collector_id: id }, // Usar "id" correctamente aquí
    });

    // Convertir la fecha de UTC a la zona horaria de México antes de enviarla
    const cortesAjustados = Corte.map((corte) => ({
      ...corte.toJSON(),
      fecha: moment
        .utc(corte.fecha)
        .tz("America/Mexico_City")
        .format("YYYY-MM-DD HH:mm:ss"), // Ajustar también la hora
    }));

    res.json(cortesAjustados);
  } catch (error) {
    console.error("Error al obtener los cortes por cobrador:", error);
    res
      .status(500)
      .json({ message: "Error al obtener los cobros por cobrador." });
  }
};

// 📌 Eliminar un corte
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
