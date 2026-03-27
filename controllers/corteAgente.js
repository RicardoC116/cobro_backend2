const CorteAgente = require("../models/corteAgenteModel");
const CorteSemanal = require("../models/corteSemanalModel");
const { Op } = require("sequelize");
const { DateTime } = require("luxon");

/**
 * Crear corte de agente (registro que contiene array "agentes").
 * Body esperado:
 *  - fecha_inicio (ISO)  => inicio de la semana a considerar (se usan startOf day)
 *  - fecha_fin   (ISO)   => fin de la semana a considerar (se usan endOf day)
 *  - asignacion  (opcional)
 */

exports.crearCorteAgente = async (req, res) => {
  const { fecha_inicio, fecha_fin, asignacion = null } = req.body;

  if (!fecha_inicio || !fecha_fin) {
    return res.status(400).json({ error: "fecha_inicio y fecha_fin son requeridos." });
  }

  try {
    const inicio = DateTime.fromISO(fecha_inicio, { zone: "America/Mexico_City" })
      .startOf("day")
      .toUTC()
      .toISO();
    const fin = DateTime.fromISO(fecha_fin, { zone: "America/Mexico_City" })
      .endOf("day")
      .toUTC()
      .toISO();

    if (!inicio || !fin || inicio > fin) {
      return res.status(400).json({ error: "Rango de fechas inválido." });
    }

    // traer cortes semanales cuya fecha_fin cae dentro del rango
    const cortes = await CorteSemanal.findAll({
      where: {
        fecha_fin: { [Op.between]: [inicio, fin] },
      },
    });

    if (!cortes || cortes.length === 0) {
      return res.status(404).json({ error: "No se encontraron cortes semanales con fecha_fin en el rango." });
    }

    // si hay varios cortes para un mismo agente en el rango, tomar el más reciente (por fecha_fin)
    const porAgente = new Map();
    cortes.forEach((c) => {
      const key = c.collector_id;
      const existente = porAgente.get(key);
      if (!existente) {
        porAgente.set(key, c);
      } else {
        const fExist = DateTime.fromISO(existinge?.fecha_fin || existente.fecha_fin);
        const fCur = DateTime.fromISO(c.fecha_fin);
        if (fCur > fExist) porAgente.set(key, c);
      }
    });

    // construir array agentes y sumar totales generales
    const agentesArray = [];
    let sumaCobranza = 0;
    let sumaCreditos = 0;
    let sumaPrimeros = 0;
    const gastosAgregados = [];

    for (const [, corte] of porAgente) {
      const cobranza = parseFloat(corte.cobranza_total || 0);
      const comisionCobro = parseFloat(corte.comision_cobro || 0);
      const comisionVentas = parseFloat(corte.comision_ventas || 0);
      const gastosItem = corte.gastos || 0;
      const resto = parseFloat(corte.resto || 0);
      const creditos = parseFloat(corte.creditos_total_monto || corte.creditos_total || 0);
      const primeros = parseFloat(corte.primeros_pagos_Monto || corte.primeros_pagos_montos || corte.primeros_pagos_total || 0);

      agentesArray.push({
        id: corte.collector_id,
        cobranza,
        comision_cobro: comisionCobro,
        comision_ventas: comisionVentas,
        gastos: gastosItem,
        resto,
      });

      sumaCobranza += cobranza;
      sumaCreditos += creditos;
      sumaPrimeros += primeros;

      if (Array.isArray(gastosItem)) {
        gastosAgregados.push(...gastosItem);
      } else if (gastosItem) {
        gastosAgregados.push({ monto: parseFloat(gastosItem) || 0 });
      }
    }

    const nuevo = await CorteAgente.create({
      asignacion,
      cobranza_total: sumaCobranza,
      creditos_total: sumaCreditos,
      primeros_pagos_total: sumaPrimeros,
      gastos: gastosAgregados,
      agentes: agentesArray,
      fecha_corte: DateTime.utc().toISO(), 
    });

    return res.status(201).json({ message: "Corte agente creado.", data: nuevo });
  } catch (error) {
    console.error("Error crearCorteAgente:", error.message);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
};





 