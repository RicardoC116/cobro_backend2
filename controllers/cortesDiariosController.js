// corteDiariosController

const CorteDiario = require("../models/corteDiarioModel");
const Cobro = require("../models/cobroModel");
const Deudor = require("../models/deudorModel");
const { Op } = require("sequelize");

exports.registrarCorteDiario = async (req, res) => {
  const { collector_id, fecha } = req.body;

  if (!collector_id) {
    return res
      .status(400)
      .json({ error: "El ID del cobrador es obligatorio." });
  }

  try {
    // Obtener el último corte
    const ultimoCorte = await CorteDiario.findOne({
      where: { collector_id },
      order: [["fecha", "DESC"]],
    });

    // Definir fechas de inicio y fin del rango
    const fechaInicio = ultimoCorte
      ? new Date(new Date(ultimoCorte.fecha).getTime() + 24 * 60 * 60 * 1000)
      : new Date(new Date().setHours(0, 0, 0, 0));
    const fechaFin = fecha ? new Date(fecha) : new Date();
    const fechaFinStr = fechaFin.toISOString().split("T")[0];

    if (fechaFin < fechaInicio) {
      return res.status(400).json({
        error: "La fecha del corte no puede ser anterior al último corte.",
      });
    }

    // Obtener cobros en el rango de fechas
    const cobros = await Cobro.findAll({
      where: {
        collector_id,
        createdAt: { [Op.between]: [fechaInicio, fechaFin] },
      },
    });

    // Obtener deudores asociados al cobrador
    const deudores = await Deudor.findAll({ where: { collector_id } });

    // 1. Calcular cobranza total y deudores cobrados
    const cobranza_total = cobros.reduce(
      (sum, cobro) => sum + parseFloat(cobro.amount),
      0
    );
    const deudoresPagaron = [
      ...new Set(cobros.map((cobro) => cobro.debtor_id)),
    ];
    const deudores_cobrados = deudoresPagaron.length;

    // 2. Calcular liquidaciones
    const liquidaciones = cobros.filter(
      (cobro) => cobro.payment_type === "liquidación"
    );
    const liquidaciones_total = liquidaciones.reduce(
      (sum, cobro) => sum + parseFloat(cobro.amount),
      0
    );
    const deudores_liquidados = [
      ...new Set(liquidaciones.map((cobro) => cobro.debtor_id)),
    ].length;

    // 3. Calcular deudores que no pagaron
    const no_pagos_total = deudores.length - deudoresPagaron.length;

    // 4. Calcular nuevos deudores
    const nuevos_deudores = await Deudor.count({
      where: {
        collector_id,
        createdAt: { [Op.between]: [fechaInicio, fechaFin] },
      },
    });

    // 5. Calcular primeros pagos totales y montos
    const nuevosDeudores = await Deudor.findAll({
      where: {
        collector_id,
        createdAt: { [Op.between]: [fechaInicio, fechaFin] },
      },
    });

    const primeros_pagos_montos = nuevosDeudores.reduce(
      (sum, deudor) => sum + parseFloat(deudor.first_payment || 0),
      0
    );

    // Crear el registro del corte diario
    const corte = await CorteDiario.create({
      collector_id,
      fecha: fechaFinStr,
      cobranza_total,
      deudores_cobrados,
      liquidaciones_total,
      deudores_liquidados,
      no_pagos_total,
      creditos_total: nuevos_deudores,
      primeros_pagos_total: nuevosDeudores.length,
      primeros_pagos_montos,
      nuevos_deudores,
    });

    res
      .status(201)
      .json({ message: "Corte diario registrado exitosamente.", corte });
  } catch (error) {
    console.error("Error al registrar el corte diario:", error);
    res.status(500).json({ error: "Error al registrar el corte diario." });
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
