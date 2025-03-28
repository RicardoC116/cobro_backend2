const CorteDiario = require("../models/corteDiarioModel");
const Cobro = require("../models/cobroModel");
const Deudor = require("../models/deudorModel");
const { Op } = require("sequelize");
const moment = require("moment-timezone");

exports.registrarCorteManual = async (req, res) => {
  const { collector_id, fecha_corte } = req.body;

  if (!collector_id || !fecha_corte) {
    return res.status(400).json({
      error: "Se requieren collector_id y fecha_corte (YYYY-MM-DD).",
    });
  }

  try {
    // 1. Validar y parsear fecha en MX
    const fechaCorteMX = moment.tz(fecha_corte, "YYYY-MM-DD", "America/Mexico_City");
    
    if (!fechaCorteMX.isValid()) {
      return res.status(400).json({ error: "Formato de fecha inválido. Use YYYY-MM-DD" });
    }

    if (fechaCorteMX.isAfter(moment().tz("America/Mexico_City"))) {
      return res.status(400).json({ error: "No se permiten fechas futuras." });
    }

    // 2. Calcular rangos del día en MX y convertir a UTC
    const inicioDiaMX = fechaCorteMX.clone().startOf("day");
    const finDiaMX = fechaCorteMX.clone().endOf("day");
    
    const inicioUTC = inicioDiaMX.clone().utc().format("YYYY-MM-DD HH:mm:ss");
    const finUTC = finDiaMX.clone().utc().format("YYYY-MM-DD HH:mm:ss");

    console.log("📆 Rango en MX:", inicioDiaMX.format(), "-", finDiaMX.format());
    console.log("🕒 Rango en UTC:", inicioUTC, "-", finUTC);

    // 3. Verificar si ya existe corte
    const corteExistente = await CorteDiario.findOne({
      where: {
        collector_id,
        fecha: { [Op.between]: [inicioUTC, finUTC] },
      },
    });

    if (corteExistente) {
      return res.status(400).json({ error: `Ya existe un corte para ${fecha_corte}.` });
    }

    // 4. Obtener cobros en rango UTC
    const cobros = await Cobro.findAll({
      where: {
        collector_id,
        payment_date: { [Op.between]: [inicioUTC, finUTC] },
      },
    });

    console.log("🔍 Cobros encontrados:", cobros.length);
    
    // 5. Obtener nuevos deudores (usando createdAt en UTC)
    const nuevosDeudores = await Deudor.findAll({
      where: {
        collector_id,
        createdAt: { [Op.between]: [inicioUTC, finUTC] },
      },
    });
    console.log("👥 Nuevos deudores:", nuevosDeudores.length);

    // 6. Cálculos
    const deudoresCobros = [...new Set(cobros.map(c => c.debtor_id))];
    const cobranzaTotal = cobros.reduce((sum, c) => sum + parseFloat(c.amount), 0);
    const primerosPagosTotal = nuevosDeudores.reduce((sum, d) => sum + parseFloat(d.first_payment), 0);
    
    const liquidacionesTotal = cobros
      .filter(c => c.payment_type === "liquidación")
      .reduce((sum, c) => sum + parseFloat(c.amount), 0);

    const deudoresActivos = await Deudor.count({
      where: { collector_id, balance: { [Op.gt]: 0 } },
    });

    // 7. Crear registro del corte en UTC
    const corteDiario = await CorteDiario.create({
      collector_id,
      fecha: inicioUTC, // Almacenamos el inicio del día en UTC
      cobranza_total: cobranzaTotal,
      deudores_cobrados: deudoresCobros.length,
      liquidaciones_total: liquidacionesTotal,
      deudores_liquidados: cobros.filter(c => c.payment_type === "liquidación").length,
      no_pagos_total: deudoresActivos - deudoresCobros.length,
      creditos_total: nuevosDeudores.length,
      creditos_total_monto: nuevosDeudores.reduce((sum, d) => sum + parseFloat(d.amount), 0),
      primeros_pagos_total: nuevosDeudores.length,
      primeros_pagos_montos: primerosPagosTotal,
      nuevos_deudores: nuevosDeudores.length,
      deudores_totales: deudoresActivos,
    });

    res.status(201).json({
      message: `Corte manual para ${fecha_corte} registrado exitosamente.`,
      corteDiario: {
        ...corteDiario.toJSON(),
        fecha: moment.utc(corteDiario.fecha).tz("America/Mexico_City").format("YYYY-MM-DD HH:mm:ss")
      }
    });

  } catch (error) {
    console.error(`❌ Error en corte manual (${fecha_corte}):`, error);
    res.status(500).json({
      error: "Error en corte manual.",
      detalle: error.message,
    });
  }
};