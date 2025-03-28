const CorteDiario = require("../models/corteDiarioModel");
const Cobro = require("../models/cobroModel");
const Deudor = require("../models/deudorModel");
const moment = require("moment-timezone");
const { Op } = require("sequelize");

exports.registrarCorteManual = async (req, res) => {
  const { collector_id, fecha_corte } = req.body;

  if (!collector_id || !fecha_corte) {
    return res.status(400).json({
      error: "Se requieren collector_id y fecha_corte (YYYY-MM-DD).",
    });
  }

  try {
    // 1. Convertir fecha_corte a rango UTC equivalente al día en MX
    const fechaInicioMX = moment
      .tz(fecha_corte, "YYYY-MM-DD", "America/Mexico_City")
      .startOf("day");
    const fechaFinMX = moment
      .tz(fecha_corte, "YYYY-MM-DD", "America/Mexico_City")
      .endOf("day");

    const fechaInicioUTC = fechaInicioMX
      .clone()
      .utc()
      .format("YYYY-MM-DD HH:mm:ss");
    const fechaFinUTC = fechaFinMX.clone().utc().format("YYYY-MM-DD HH:mm:ss");

    console.log("🔍 Rangos convertidos:", {
      mx: `${fechaInicioMX.format()} a ${fechaFinMX.format()}`,
      utc: `${fechaInicioUTC} a ${fechaFinUTC}`,
    });

    // 2. Verificar si ya existe el corte
    const corteExistente = await CorteDiario.findOne({
      where: {
        collector_id,
        fecha: { [Op.between]: [fechaInicioUTC, fechaFinUTC] },
      },
    });

    if (corteExistente) {
      return res
        .status(400)
        .json({ error: `Ya existe un corte para ${fecha_corte}.` });
    }

    // 3. Buscar cobros usando el mismo método que el corte automático
    const cobros = await Cobro.findAll({
      where: {
        collector_id,
        payment_date: {
          [Op.gte]: fechaInicioUTC,
          [Op.lt]: fechaFinUTC,
        },
      },
      raw: true,
    });

    console.log(
      "🔍 Cobros encontrados (CRUDO):",
      cobros.map((c) => ({
        id: c.id,
        payment_date: c.payment_date,
        amount: c.amount,
      }))
    );

    // 4. Buscar nuevos deudores en el mismo rango UTC
    const nuevosDeudores = await Deudor.findAll({
      where: {
        collector_id,
        createdAt: {
          [Op.gte]: fechaInicioUTC,
          [Op.lt]: fechaFinUTC,
        },
      },
      raw: true,
    });

    // 5. Cálculos idénticos al corte automático
    const deudoresCobros = [...new Set(cobros.map((c) => c.debtor_id))];
    const cobranzaTotal = cobros.reduce(
      (sum, c) => sum + parseFloat(c.amount),
      0
    );
    const deudoresActivos = await Deudor.count({
      where: { collector_id, balance: { [Op.gt]: 0 } },
    });

    // 6. Crear registro del corte
    const corteDiario = await CorteDiario.create({
      collector_id,
      fecha: fechaInicioUTC, // Guardar en UTC igual que el corte automático
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
      message: `Corte manual para ${fecha_corte} registrado.`,
      corteDiario: {
        ...corteDiario.toJSON(),
        fecha: moment
          .utc(corteDiario.fecha)
          .tz("America/Mexico_City")
          .format("YYYY-MM-DD HH:mm:ss"),
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
