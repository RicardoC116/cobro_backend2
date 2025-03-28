const CorteDiario = require("../models/corteDiarioModel");
const Cobro = require("../models/cobroModel");
const Deudor = require("../models/deudorModel");
const { Op, Sequelize } = require("sequelize");
const moment = require("moment-timezone");

exports.registrarCorteManual = async (req, res) => {
  const { collector_id, fecha_corte } = req.body;

  if (!collector_id || !fecha_corte) {
    return res.status(400).json({
      error: "Se requieren collector_id y fecha_corte (YYYY-MM-DD).",
    });
  }

  try {
    // 1. Definir rango en hora local MX
    const fechaInicioMX = moment
      .tz(fecha_corte, "YYYY-MM-DD", "America/Mexico_City")
      .startOf("day")
      .format("YYYY-MM-DD HH:mm:ss");

    const fechaFinMX = moment
      .tz(fecha_corte, "YYYY-MM-DD", "America/Mexico_City")
      .endOf("day")
      .format("YYYY-MM-DD HH:mm:ss");

    // 2. Consultar cobros CON conversión de timezone
    const cobros = await Cobro.findAll({
      where: {
        collector_id,
        [Op.and]: [
          Sequelize.where(
            Sequelize.fn(
              "CONVERT_TZ",
              Sequelize.col("payment_date"),
              "+00:00",
              "-06:00"
            ),
            ">=",
            fechaInicioMX
          ),
          Sequelize.where(
            Sequelize.fn(
              "CONVERT_TZ",
              Sequelize.col("payment_date"),
              "+00:00",
              "-06:00"
            ),
            "<=",
            fechaFinMX
          ),
        ],
      },
      raw: true,
    });

    console.log("🔍 Cobros con CONVERT_TZ:", cobros);

    // 3. Consultar nuevos deudores CON conversión
    const nuevosDeudores = await Deudor.findAll({
      where: {
        collector_id,
        [Op.and]: [
          Sequelize.where(
            Sequelize.fn(
              "CONVERT_TZ",
              Sequelize.col("createdAt"),
              "+00:00",
              "-06:00"
            ),
            ">=",
            fechaInicioMX
          ),
          Sequelize.where(
            Sequelize.fn(
              "CONVERT_TZ",
              Sequelize.col("createdAt"),
              "+00:00",
              "-06:00"
            ),
            "<=",
            fechaFinMX
          ),
        ],
      },
      raw: true,
    });

    // 4. Cálculos (igual que antes)
    const deudoresCobros = [...new Set(cobros.map((c) => c.debtor_id))];
    const cobranzaTotal = cobros.reduce(
      (sum, c) => sum + parseFloat(c.amount),
      0
    );
    const deudoresActivos = await Deudor.count({
      where: { collector_id, balance: { [Op.gt]: 0 } },
    });

    // 5. Crear registro del corte (en UTC)
    const corteDiario = await CorteDiario.create({
      collector_id,
      fecha: moment
        .tz(fechaInicioMX, "America/Mexico_City")
        .utc()
        .format("YYYY-MM-DD HH:mm:ss"),
      cobranza_total: cobranzaTotal,
      deudores_cobrados: deudoresCobros.length,
      liquidaciones_total: cobros
        .filter((c) => c.payment_type === "liquidación")
        .reduce((sum, c) => sum + c.amount, 0),
      deudores_liquidados: cobros.filter(
        (c) => c.payment_type === "liquidación"
      ).length,
      no_pagos_total: deudoresActivos - deudoresCobros.length,
      creditos_total: nuevosDeudores.length,
      creditos_total_monto: nuevosDeudores.reduce(
        (sum, d) => sum + parseFloat(d.amount),
        0
      ),
      primeros_pagos_total: nuevosDeudores.length,
      primeros_pagos_montos: nuevosDeudores.reduce(
        (sum, d) => sum + parseFloat(d.first_payment),
        0
      ),
      nuevos_deudores: nuevosDeudores.length,
      deudores_totales: deudoresActivos,
    });

    res.status(201).json({
      message: `Corte manual para ${fecha_corte} registrado exitosamente.`,
      corteDiario: {
        ...corteDiario.toJSON(),
        fecha: moment.utc(corteDiario.fecha).tz("America/Mexico_City").format(),
      },
    });
  } catch (error) {
    console.error(`❌ Error en corte manual (${fecha_corte}):`, error);
    res.status(500).json({
      error: "Error en corte manual.",
      detalle: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};
