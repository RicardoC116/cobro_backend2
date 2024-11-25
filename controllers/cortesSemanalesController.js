const CorteSemanal = require("../models/corteSemanalModel");
const CorteDiario = require("../models/corteDiarioModel");
const { Op } = require("sequelize");

// Crear corte semanal
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
    if (isNaN(Date.parse(fecha_inicio)) || isNaN(Date.parse(fecha_fin))) {
      return res.status(400).json({ error: "Fechas inválidas." });
    }

    const corteExistente = await CorteSemanal.findOne({
      where: { collector_id, fecha_inicio, fecha_fin },
    });

    if (corteExistente) {
      return res.status(409).json({ error: "Corte semanal ya existe." });
    }

    const cortesDiarios = await CorteDiario.findAll({
      where: {
        collector_id,
        fecha: { [Op.between]: [fecha_inicio, fecha_fin] },
      },
    });

    if (cortesDiarios.length === 0) {
      return res
        .status(404)
        .json({ error: "No hay cortes diarios en este rango." });
    }

    const sumarTotales = (cortes, campo) =>
      cortes.reduce((acc, corte) => acc + parseFloat(corte[campo] || 0), 0);

    const cobranzaTotal = sumarTotales(cortesDiarios, "cobranza_total");
    const deudoresCobrados = sumarTotales(cortesDiarios, "deudores_cobrados");
    const creditosTotal = sumarTotales(cortesDiarios, "creditos_total");
    const creditosTotalMonto = sumarTotales(
      cortesDiarios,
      "creditos_total_monto"
    );
    const nuevosDeudores = sumarTotales(cortesDiarios, "nuevos_deudores");
    const primerosPagosTotal = sumarTotales(
      cortesDiarios,
      "primeros_pagos_total"
    );
    const primerosPagosMonto = sumarTotales(
      cortesDiarios,
      "primeros_pagos_montos"
    );
    const liquidacionesTotal = sumarTotales(
      cortesDiarios,
      "liquidaciones_total"
    );
    const deudoresLiquidados = sumarTotales(
      cortesDiarios,
      "deudores_liquidados"
    );
    const noPagosTotal = sumarTotales(cortesDiarios, "no_pagos_total");

    const totalIngresos =
      cobranzaTotal + primerosPagosMonto + creditosTotalMonto;
    const totalGastos =
      parseFloat(comision_cobro) +
      parseFloat(comision_ventas) +
      parseFloat(gastos);
    const saldoFinal = totalIngresos - totalGastos;

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
      creditos_total_monto: creditosTotalMonto,
      primeros_pagos_total: primerosPagosTotal,
      primeros_pagos_Monto: primerosPagosMonto,
      nuevos_deudores: nuevosDeudores,
      comision_cobro,
      comision_ventas,
      gastos,
      total_ingreso: totalIngresos,
      total_gasto: totalGastos,
      saldo_final: saldoFinal,
    });

    res.status(201).json({
      message: "Corte semanal creado exitosamente.",
      data: nuevoCorteSemanal,
    });
  } catch (error) {
    console.error("Error al crear el corte semanal:", error.message);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

// Obtener cortes semanales
exports.obtenerCortesSemanales = async (req, res) => {
  try {
    const cortesSemanales = await CorteSemanal.findAll();
    res.json(cortesSemanales);
  } catch (error) {
    console.error("Error al obtener los cortes semanales:", error.message);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

// Eliminar corte semanal
exports.deleteCorteSemanal = async (req, res) => {
  const { id } = req.params;

  try {
    const filasEliminadas = await CorteSemanal.destroy({ where: { id } });

    if (!filasEliminadas) {
      return res.status(404).json({ error: "Corte no encontrado." });
    }

    res.status(200).json({ message: "Corte eliminado correctamente." });
  } catch (error) {
    console.error("Error al eliminar el corte semanal:", error.message);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};
