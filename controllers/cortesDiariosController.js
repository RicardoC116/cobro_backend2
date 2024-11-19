// corteDiariosController

const CorteDiario = require("../models/corteDiarioModel");
const Cobro = require("../models/cobroModel");
const Deudor = require("../models/deudorModel");
const { Op } = require("sequelize");

const registrarCorteDiario = async (req, res) => {
  const { collector_id, fecha } = req.body;

  if (!collector_id) {
    return res
      .status(400)
      .json({ error: "El ID del cobrador es obligatorio." });
  }

  try {
    const ultimoCorte = await CorteDiario.findOne({
      where: { collector_id },
      order: [["fecha", "DESC"]],
    });

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

    const cobros = await Cobro.findAll({
      where: {
        collector_id,
        createdAt: { [Op.between]: [fechaInicio, fechaFin] },
      },
    });

    const deudores = await Deudor.findAll({ where: { collector_id } });

    // Obtener deudores únicos que realizaron pagos
    const deudoresPagaron = [
      ...new Set(cobros.map((cobro) => cobro.debtor_id)),
    ];

    const cobranza_total = cobros.reduce(
      (sum, cobro) => sum + parseFloat(cobro.amount),
      0
    );
    const deudores_cobrados = deudoresPagaron.length;

    const liquidaciones = cobros.filter(
      (cobro) => cobro.payment_type === "liquidacion"
    );
    const liquidaciones_total = liquidaciones.reduce(
      (sum, cobro) => sum + parseFloat(cobro.amount),
      0
    );
    const deudores_liquidados = [
      ...new Set(liquidaciones.map((cobro) => cobro.debtor_id)),
    ].length;

    // Los deudores que no pagaron son aquellos que no están en `deudoresPagaron`
    const no_pagos_total = deudores.length - deudoresPagaron.length;

    const nuevos_deudores = await Deudor.count({
      where: {
        collector_id,
        createdAt: { [Op.between]: [fechaInicio, fechaFin] },
      },
    });

    const primeros_pagos_total = nuevos_deudores
      ? nuevos_deudores * parseFloat(process.env.MONTO_PRIMER_PAGO || 0)
      : 0;

    const creditos_total = nuevos_deudores;

    const corte = await CorteDiario.create({
      collector_id,
      fecha: fechaFinStr,
      cobranza_total,
      deudores_cobrados,
      liquidaciones_total,
      deudores_liquidados,
      no_pagos_total,
      creditos_total,
      primeros_pagos_total,
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

module.exports = {
  registrarCorteDiario,
};
