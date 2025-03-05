// controllers/cortesSemanalesControllers.js
const CorteSemanal = require("../models/corteSemanalModel");
const PreCorteSemanal = require("../models/preCorteSemanal");
const CorteDiario = require("../models/corteDiarioModel");
const { Op, col, Sequelize } = require("sequelize");
const { DateTime } = require("luxon");
const Deudor = require("../models/deudorModel");
const Cobro = require("../models/cobroModel");

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
    const inicio = DateTime.fromISO(fecha_inicio, {
      zone: "America/Mexico_City",
    })
      .startOf("day")
      .toUTC()
      .toISO();

    const fin = DateTime.fromISO(fecha_fin, {
      zone: "America/Mexico_City",
    })
      .endOf("day")
      .toUTC()
      .toISO();

    console.log("fecha Inicio (ISO):", inicio);
    console.log("fecha Fin (ISO):", fin);

    if (!inicio || !fin) {
      return res.status(400).json({ error: "Fechas inválidas." });
    }

    if (inicio > fin) {
      return res.status(400).json({
        error: "La fecha de inicio debe ser anterior a la fecha de fin.",
      });
    }

    const rangoSolapado = await CorteSemanal.findOne({
      where: {
        collector_id,
        [Op.or]: [
          { fecha_inicio: { [Op.between]: [fecha_inicio, fecha_fin] } },
          { fecha_fin: { [Op.between]: [fecha_inicio, fecha_fin] } },
          {
            [Op.and]: [
              { fecha_inicio: { [Op.lte]: fecha_inicio } },
              { fecha_fin: { [Op.gte]: fecha_fin } },
            ],
          },
        ],
      },
    });

    if (rangoSolapado) {
      return res.status(409).json({
        error: "El rango de fechas ya está cubierto por otro corte.",
        rangoExistente: {
          fecha_inicio: rangoSolapado.fecha_inicio,
          fecha_fin: rangoSolapado.fecha_fin,
        },
      });
    }

    const cortesDiarios = await CorteDiario.findAll({
      where: {
        collector_id,
        fecha: { [Op.between]: [inicio, fin] },
      },
    });

    console.log("Buscando cortes diarios en el rango:", inicio, "y", fin);

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

    const totalAgente =
      parseFloat(comision_cobro) +
      parseFloat(comision_ventas) +
      parseFloat(gastos);

    const nuevoCorteSemanal = await CorteSemanal.create({
      collector_id,
      fecha_inicio: inicio,
      fecha_fin: fin,
      // fecha_inicio,
      // fecha_fin,
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
      total_agente: totalAgente,
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

// Crear pre-corte semanal
exports.crearPreCorteSemanal = async (req, res) => {
  const { collector_id, fecha_inicio, fecha_fin } = req.body;

  if (!collector_id || !fecha_inicio || !fecha_fin) {
    return res
      .status(400)
      .json({ error: "Todos los campos son obligatorios." });
  }

  try {
    const inicio = DateTime.fromISO(fecha_inicio, {
      zone: "America/Mexico_City",
    })
      .startOf("day")
      .toUTC()
      .toISO();

    const fin = DateTime.fromISO(fecha_fin, {
      zone: "America/Mexico_City",
    })
      .endOf("day")
      .toUTC()
      .toISO();

    if (!inicio || !fin) {
      return res.status(400).json({ error: "Fechas inválidas." });
    }

    if (inicio > fin) {
      return res.status(400).json({
        error: "La fecha de inicio debe ser anterior a la fecha de fin.",
      });
    }

    const rangoSolapado = await CorteSemanal.findOne({
      where: {
        collector_id,
        [Op.or]: [
          { fecha_inicio: { [Op.between]: [inicio, fin] } },
          { fecha_fin: { [Op.between]: [inicio, fin] } },
          {
            [Op.and]: [
              { fecha_inicio: { [Op.lte]: inicio } },
              { fecha_fin: { [Op.gte]: fin } },
            ],
          },
        ],
      },
    });

    if (rangoSolapado) {
      return res.status(409).json({
        error: "El rango de fechas ya está cubierto por otro corte.",
        rangoExistente: {
          fecha_inicio: rangoSolapado.fecha_inicio,
          fecha_fin: rangoSolapado.fecha_fin,
        },
      });
    }

    const cortesDiarios = await CorteDiario.findAll({
      where: {
        collector_id,
        fecha: { [Op.between]: [inicio, fin] },
      },
    });

    console.log("Buscando cortes diarios en el rango:", inicio, "y", fin);

    if (cortesDiarios.length === 0) {
      return res
        .status(404)
        .json({ error: "No hay cortes diarios en este rango." });
    }

    const sumarTotales = (cortes, campo) =>
      cortes.reduce((acc, corte) => acc + parseFloat(corte[campo] || 0), 0);

    const cobranzaTotal = sumarTotales(cortesDiarios, "cobranza_total");
    // const deudoresCobrados = sumarTotales(cortesDiarios, "deudores_cobrados");
    const deudoresCobrados = await Cobro.count({
      distinct: true,
      col: "debtor_id",
      where: {
        collector_id,
        payment_date: { [Op.between]: [inicio, fin] },
      },
    });
    
    const calcularNopagosSemana = async (collector_id, inicio, fin) => {
      const deudoresActivos = await Deudor.count({
        where: { collector_id, balance: { [Op.gt]: 0 } },
      });

      const pagosSemana = await Cobro.findAll({
        attributes: [
          [Sequelize.fn("DISTINCT", Sequelize.col("debtor_id")), "debtor_id"],
        ],
        where: {
          collector_id,
          payment_date: { [Op.between]: [inicio, fin] },
        },
      });
      return deudoresActivos - pagosSemana.length;
    };
    const noPagosTotal = await calcularNopagosSemana(collector_id, inicio, fin);

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
    // const noPagosTotal = sumarTotales(cortesDiarios, "no_pagos_total");

    const totalIngresos =
      cobranzaTotal + primerosPagosMonto - creditosTotalMonto;

    const nuevoPreCorte = await PreCorteSemanal.create({
      collector_id,
      fecha_inicio: inicio,
      fecha_fin: fin,
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
      total_ingreso: totalIngresos,
    });

    res.status(201).json({
      message: "Pre-corte semanal creado exitosamente.",
      data: nuevoPreCorte,
    });
  } catch (error) {
    console.error("Error al crear el pre-corte semanal:", error.message);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

// Confirmar pre-corte y convertirlo en corte semanal definitivo
exports.confirmarPreCorteSemanal = async (req, res) => {
  const { preCorteId } = req.params;
  const { comision_cobro, comision_ventas, gastos } = req.body; // Usar snake_case

  try {
    const preCorte = await PreCorteSemanal.findByPk(preCorteId);

    if (!preCorte) {
      return res.status(404).json({ error: "Pre-corte no encontrado." });
    }

    const totalGasto =
      parseFloat(comision_cobro || 0) +
      parseFloat(comision_ventas || 0) +
      parseFloat(gastos || 0);

    const saldoFinal = preCorte.total_ingreso - totalGasto;

    const nuevoCorteSemanal = await CorteSemanal.create({
      ...preCorte.toJSON(),
      comision_cobro: parseFloat(comision_cobro), // Ahora coincide con snake_case
      comision_ventas: parseFloat(comision_ventas),
      gastos: parseFloat(gastos),
      total_gasto: totalGasto,
      saldo_final: saldoFinal,
      total_agente: totalGasto,
    });

    await PreCorteSemanal.destroy({ where: { id: preCorteId } });

    res
      .status(201)
      .json({ message: "Corte confirmado!", data: nuevoCorteSemanal });
  } catch (error) {
    console.error("Error al confirmar el pre-corte semanal:", error.message);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

// Eliminar pre-corte
exports.eliminarPreCorteSemanal = async (req, res) => {
  const { preCorteId } = req.params;

  try {
    const filasEliminadas = await PreCorteSemanal.destroy({
      where: { id: preCorteId },
    });

    if (!filasEliminadas) {
      return res.status(404).json({ error: "Pre-corte no encontrado." });
    }

    res.status(200).json({ message: "Pre-corte eliminado correctamente." });
  } catch (error) {
    console.error("Error al eliminar el pre-corte semanal:", error.message);
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

// Obtener cobros por cobrador
exports.obtenerCortesSemanalPorCobrador = async (req, res) => {
  try {
    const { id } = req.params;
    const cortesSemanales = await CorteSemanal.findAll({
      where: { collector_id: id },
    });
    res.json(cortesSemanales);
  } catch (error) {
    console.error("Error al obtener los cortes semanales:", error.message);
    res.status(500).json({ message: "Error al obtener los cortes semanales." });
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
