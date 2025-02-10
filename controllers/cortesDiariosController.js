// CortesDiariosController
const { DateTime } = require("luxon"); // Asegúrate de que luxon está instalado
const CorteDiario = require("../models/corteDiarioModel");
const { Op } = require("sequelize");
const PreCorteDiario = require("../models/PreCorteDiarioModel");

// Función para ajustar la fecha a la zona horaria de México y convertirla a UTC
function ajustarFechaMexico(fecha, inicioDelDia = true) {
  return inicioDelDia
    ? DateTime.fromJSDate(fecha, { zone: "America/Mexico_City" })
        .startOf("day")
        .toISO({ suppressMilliseconds: true })
    : DateTime.fromJSDate(fecha, { zone: "America/Mexico_City" })
        .endOf("day")
        .toISO({ suppressMilliseconds: true });
}

exports.registrarCorteDiario = async (req, res) => {
  const { collector_id } = req.body;

  if (!collector_id) {
    return res
      .status(400)
      .json({ error: "El ID del cobrador es obligatorio." });
  }

  try {
    // Definir fecha de inicio y fin del día actual
    const fechaBase = new Date();
    const fechaInicio = ajustarFechaMexico(fechaBase, true);
    const fechaFin = ajustarFechaMexico(fechaBase, false);

    console.log("Fecha Inicio (ISO):", fechaInicio);
    console.log("Fecha Fin (ISO):", fechaFin);

    // Obtener pre-cortes del día
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

    // Inicializar variables acumuladoras
    let cobranzaTotal = 0;
    let deudoresCobrados = 0;
    let liquidacionesTotal = 0;
    let deudoresLiquidados = 0;
    let noPagosTotal = 0;
    let creditosTotal = 0;
    let creditosTotalMonto = 0;
    let primerosPagosTotal = 0;
    let primerosPagosMontos = 0; // Ya que en `corteDiarioModel` es un número, no un array
    let nuevosDeudores = 0;
    let deudoresTotales = 0;

    // Recorrer todos los pre-cortes y sumar los valores
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
      deudoresTotales = pre.deudores_totales; // Tomamos el total de cualquier pre-corte
    });

    // Guardar el corte diario en la base de datos
    const corteDiario = await CorteDiario.create({
      collector_id,
      fecha: fechaFin,
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

    // Eliminar los pre-cortes después de hacer el corte definitivo
    await PreCorteDiario.destroy({
      where: {
        collector_id,
        fecha: { [Op.between]: [fechaInicio, fechaFin] },
      },
    });

    res.status(201).json({
      message: "Corte Diario registrado exitosamente.",
      corteDiario,
    });
  } catch (error) {
    console.error("Error al registrar el corte diario:", error);
    res.status(500).json({
      error: "Error al registrar el corte diario.",
      detalle: error.message,
    });
  }
};

// Obtener los cortes diarios registrados
exports.obtenerCortesDiarios = async (req, res) => {
  try {
    const cortesDiarios = await CorteDiario.findAll();
    res.status(200).json({ data: cortesDiarios });
  } catch (error) {
    console.error("Error al obtener cortes Diarios:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

// Obtener cobros por cobrador
exports.obtenerCortesPorCobrador = async (req, res) => {
  try {
    const { id } = req.params; // Ajustar el nombre del parámetro
    const Corte = await CorteDiario.findAll({
      where: { collector_id: id }, // Usar "id" correctamente aquí
    });
    res.json(Corte);
  } catch (error) {
    console.error("Error al obtener los cortes por cobrador:", error);
    res
      .status(500)
      .json({ message: "Error al obtener los cobros por cobrador." });
  }
};

// Eliminar un corte
exports.deleteCorteDiario = async (req, res) => {
  const { id } = req.params;
  try {
    const corteDiario = await CorteDiario.findByPk(id);
    if (!corteDiario) {
      return res.status(404).json({ error: "corte diario no encontrado" });
    }
    await corteDiario.destroy();
    res.json({ message: "Corte diario eliminado exitosamente" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
