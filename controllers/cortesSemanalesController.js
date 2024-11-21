const CorteSemanal = require("../models/corteSemanalModel");
const CorteDiario = require("../models/corteDiarioModel");
const { Op } = require("sequelize");

exports.crearCorteSemanal = async (req, res) => {
  const {
    collector_id,
    fecha_inicio,
    fecha_fin,
    comision_cobro = 0,
    comision_ventas = 0,
    gastos = 0,
  } = req.body;

  if (!collector_id || !fecha_inicio || !fecha_fin) {
    return res
      .status(400)
      .json({ error: "Todos los campos son obligatorios." });
  }

  try {
    // Obtener cortes diarios en el rango de fechas
    const cortesDiarios = await CorteDiario.findAll({
      where: {
        collector_id,
        fecha: {
          [Op.between]: [fecha_inicio, fecha_fin],
        },
      },
    });

    if (cortesDiarios.length === 0) {
      return res.status(404).json({
        error: "No hay cortes diarios registrados en este rango de fechas.",
      });
    }

    // Sumar los datos necesarios
    const cobranzaTotal = cortesDiarios.reduce(
      (acc, corte) => acc + parseFloat(corte.cobranza_total),
      0
    );
    const deudoresCobrados = cortesDiarios.reduce(
      (acc, corte) => acc + corte.deudores_cobrados,
      0
    );
    const creditosTotal = cortesDiarios.reduce(
      (acc, corte) => acc + parseFloat(corte.creditos_total),
      0
    );
    const nuevosDeudores = cortesDiarios.reduce(
      (acc, corte) => acc + corte.nuevos_deudores,
      0
    );
    const primerosPagosTotal = cortesDiarios.reduce(
      (acc, corte) => acc + parseFloat(corte.primeros_pagos_total),
      0
    );
    const liquidacionesTotal = cortesDiarios.reduce(
      (acc, corte) => acc + parseFloat(corte.liquidaciones_total),
      0
    );
    const deudoresLiquidados = cortesDiarios.reduce(
      (acc, corte) => acc + corte.deudores_liquidados,
      0
    );
    const noPagosTotal = cortesDiarios.reduce(
      (acc, corte) => acc + corte.no_pagos_total,
      0
    );

    // Cálculos de ingresos y gastos
    const totalIngresos =
      cobranzaTotal + primerosPagosTotal + liquidacionesTotal + creditosTotal;
    const totalGastos =
      parseFloat(comision_cobro) +
      parseFloat(comision_ventas) +
      parseFloat(gastos);
    const saldoFinal = totalIngresos - totalGastos;

    // Crear el nuevo corte semanal
    const nuevoCorteSemanal = await CorteSemanal.create({
      collector_id,
      fecha_inicio,
      fecha_fin,
      cobranza_total: cobranzaTotal,
      deudores_cobrados: deudoresCobrados,
      liquidaciones_total: liquidacionesTotal,
      deudores_liquidados: deudoresLiquidados,
      no_pagos_total: noPagosTotal,
      creditos_total: creditosTotal,
      primeros_pagos_total: primerosPagosTotal,
      nuevos_deudores: nuevosDeudores,
      comision_cobro,
      comision_ventas,
      gastos,
      saldo_final: saldoFinal,
    });

    res.status(201).json({
      message: "Corte semanal creado exitosamente.",
      data: nuevoCorteSemanal,
    });
  } catch (error) {
    console.error("Error al crear el corte semanal:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

// Obtener los cortes semanales registrados
exports.obtenerCortesSemanales = async (req, res) => {
  try {
    const cortesSemanales = await CorteSemanal.findAll();
    res.status(200).json({ data: cortesSemanales });
  } catch (error) {
    console.error("Error al obtener cortes semanales:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

// Eliminar un corte semanal
exports.deleteCorteSemanal = async (req, res) => {
  const { id } = req.params;
  try {
    const cortesSemanales = await CorteSemanal.findByPk(id);
    if (!cortesSemanales) {
      return res.status(404).json({ error: "Cobrador no encontrado" });
    }
    await cortesSemanales.destroy();
    res.json({ message: "Cobrador eliminado" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
