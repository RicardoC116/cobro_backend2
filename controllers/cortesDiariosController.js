const moment = require("moment-timezone");
const CorteDiario = require("../models/corteDiarioModel");
const { Op } = require("sequelize");
const PreCorteDiario = require("../models/PreCorteDiarioModel");

// 📌 Función para ajustar la fecha a la zona horaria de México y convertirla a UTC
function ajustarFechaMexico(fecha, inicioDelDia = true) {
  return inicioDelDia
    ? moment.tz(fecha, "America/Mexico_City").startOf("day").utc().format()
    : moment.tz(fecha, "America/Mexico_City").endOf("day").utc().format();
}

exports.registrarCorteDiario = async (req, res) => {
  const { collector_id } = req.body;

  if (!collector_id) {
    return res
      .status(400)
      .json({ error: "El ID del cobrador es obligatorio." });
  }

  try {
    // 📌 Definir fecha de inicio y fin del día en UTC
    const fechaBase = new Date();
    const fechaInicio = ajustarFechaMexico(fechaBase, true);
    const fechaFin = ajustarFechaMexico(fechaBase, false);

    console.log("📆 Fecha Inicio (UTC):", fechaInicio);
    console.log("📆 Fecha Fin (UTC):", fechaFin);

    // 📌 Obtener pre-cortes del día
    const preCortes = await PreCorteDiario.findAll({
      where: {
        collector_id,
        fecha: { [Op.between]: [fechaInicio, fechaFin] },
      },
    });

    if (preCortes.length === 0) {
      return res.status(400).json({
        error:
          "No se puede generar un corte diario sin pre-cortes registrados.",
      });
    }

    // 📌 Inicializar variables acumuladoras
    let cobranzaTotal = 0,
      deudoresCobrados = 0,
      liquidacionesTotal = 0,
      deudoresLiquidados = 0,
      noPagosTotal = 0,
      creditosTotal = 0,
      creditosTotalMonto = 0,
      primerosPagosTotal = 0,
      primerosPagosMontos = 0,
      nuevosDeudores = 0,
      deudoresTotales = 0;

    // 📌 Recorrer todos los pre-cortes y sumar los valores
    preCortes.forEach((pre) => {
      cobranzaTotal += parseFloat(pre.cobranza_total);
      deudoresCobrados += pre.deudores_cobrados;
      liquidacionesTotal += parseFloat(pre.liquidaciones_total);
      deudoresLiquidados += pre.deudores_liquidados;
      noPagosTotal += pre.no_pagos_total;
      creditosTotal += pre.creditos_total;
      creditosTotalMonto += parseFloat(pre.creditos_total_monto);
      primerosPagosTotal += pre.primeros_pagos_total;
      primerosPagosMontos += parseFloat(pre.primeros_pagos_montos);
      nuevosDeudores += pre.nuevos_deudores;
      deudoresTotales = pre.deudores_totales; // 📌 Tomamos el total de cualquier pre-corte
    });

    // 📌 Guardar el corte diario en UTC
    const corteDiario = await CorteDiario.create({
      collector_id,
      fecha: fechaFin, // 🔹 Se guarda en UTC
      cobranza_total: cobranzaTotal,
      deudores_cobrados: deudoresCobrados,
      liquidaciones_total: liquidacionesTotal,
      deudores_liquidados: deudoresLiquidados,
      no_pagos_total: noPagosTotal,
      creditos_total: creditosTotal,
      creditos_total_monto: creditosTotalMonto,
      primeros_pagos_total: primerosPagosTotal,
      primeros_pagos_montos: primerosPagosMontos,
      nuevos_deudores: nuevosDeudores,
      deudores_totales: deudoresTotales,
    });

    // 📌 Eliminar los pre-cortes después de hacer el corte definitivo
    await PreCorteDiario.destroy({
      where: {
        collector_id,
        fecha: { [Op.between]: [fechaInicio, fechaFin] },
      },
    });

    res.status(201).json({
      message: "✅ Corte Diario registrado exitosamente.",
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
    const cortesAjustados = cortesDiarios.map((corte) => ({
      ...corte.toJSON(),
      fecha: moment.utc(corte.fecha).tz("America/Mexico_City").format(),
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
    const { id } = req.params;
    const cortes = await CorteDiario.findAll({ where: { collector_id: id } });

    const cortesConvertidos = cortes.map((corte) => ({
      ...corte.toJSON(),
      fecha: moment.utc(corte.fecha).tz("America/Mexico_City").format(),
    }));

    res.json(cortesConvertidos);
  } catch (error) {
    console.error("❌ Error al obtener los cortes por cobrador:", error);
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
