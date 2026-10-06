// controllers/corteGeneralController.js
const { Op } = require("sequelize");
const { DateTime } = require("luxon");
const db = require("../db");
const {
  CorteGeneral,
  CorteGeneralAgente,
  CorteGeneralGasto,
  MovimientoCapital,
  CorteSemanal,
  Cobrador,
} = require("../models/associations");

const TZ = "America/Mexico_City";

// Helpers de fecha (mismo criterio que usas en cortes semanales)
const toInicio = (iso) =>
  DateTime.fromISO(iso, { zone: TZ }).startOf("day").toUTC().toISO();
const toFin = (iso) =>
  DateTime.fromISO(iso, { zone: TZ }).endOf("day").toUTC().toISO();

const num = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

// ============================================================
// Recalcula el corte a partir de los cortes semanales del rango
// ============================================================
async function calcularCorte({
  inicio,
  fin,
  gastos_agencia = [],
  movimientos_capital = [],
  asignacion_manual = 0,
  transaction,
}) {
  // Último corte general confirmado (para la asignación anterior)
  const ultimo = await CorteGeneral.findOne({
    order: [["semana_inicio", "DESC"]],
    transaction,
  });

  const es_primera_semana = !ultimo;
  const asignacion_anterior = ultimo
    ? num(ultimo.total_general)
    : num(asignacion_manual);

  // Cortes semanales dentro del rango
  const cortes = await CorteSemanal.findAll({
    where: {
      fecha_inicio: { [Op.gte]: inicio },
      fecha_fin: { [Op.lte]: fin },
    },
    include: [{ model: Cobrador, as: "collector", attributes: ["id", "name"] }],
    transaction,
  });

  // Agrupar por agente
  const porAgente = new Map();
  for (const c of cortes) {
    const id = c.collector_id;
    if (!porAgente.has(id)) {
      porAgente.set(id, {
        collector_id: id,
        collector_name: c.collector?.name || `Agente #${id}`,
        cobranza: 0,
        comision_cobro: 0,
        comision_ventas: 0,
        gastos: 0,
        total: 0,
        creditos_monto: 0,
        primeros_pagos_monto: 0,
      });
    }
    const a = porAgente.get(id);
    a.cobranza += num(c.cobranza_total);
    a.comision_cobro += num(c.comision_cobro);
    a.comision_ventas += num(c.comision_ventas);
    a.gastos += num(c.gastos);
    a.total += num(c.resto); // "Total" de la tabla = resto
    a.creditos_monto += num(c.creditos_total_monto);
    a.primeros_pagos_monto += num(c.primeros_pagos_Monto);
  }
  const agentes = Array.from(porAgente.values());

  const total_agentes = agentes.reduce((s, a) => s + a.total, 0);
  const total_creditos = agentes.reduce((s, a) => s + a.creditos_monto, 0);
  const total_primeros_pagos = agentes.reduce(
    (s, a) => s + a.primeros_pagos_monto,
    0,
  );
  const total_gastos_agentes = agentes.reduce((s, a) => s + a.gastos, 0);

  const total_gastos_agencia = gastos_agencia.reduce(
    (s, g) => s + num(g.monto),
    0,
  );
  const total_movimientos_capital = movimientos_capital.reduce(
    (s, m) => s + (m.tipo === "ingreso" ? num(m.monto) : -num(m.monto)),
    0,
  );

  const total_general =
    total_agentes +
    asignacion_anterior -
    total_creditos +
    total_primeros_pagos -
    total_gastos_agencia +
    total_movimientos_capital;

  return {
    es_primera_semana,
    asignacion_anterior,
    agentes,
    total_agentes,
    total_creditos,
    total_primeros_pagos,
    total_gastos_agentes,
    total_gastos_agencia,
    total_movimientos_capital,
    total_general,
  };
}

// ============================================================
// GET /api/cortes-generales/preview
// ============================================================
exports.previewCorteGeneral = async (req, res) => {
  try {
    const { semana_inicio, semana_fin } = req.query;

    if (!semana_inicio || !semana_fin) {
      return res.status(400).json({
        error: "semana_inicio y semana_fin son obligatorios.",
      });
    }

    const inicio = toInicio(semana_inicio);
    const fin = toFin(semana_fin);

    // ¿Ya existe corte general para esa semana?
    const existente = await CorteGeneral.findOne({
      where: { semana_inicio: inicio },
    });
    if (existente) {
      return res.status(409).json({
        error: "Ya existe un corte general para esa semana.",
        corte: existente,
      });
    }

    const calculo = await calcularCorte({
      inicio,
      fin,
      gastos_agencia: [],
      movimientos_capital: [],
    });

    return res.json({
      semana_inicio: inicio,
      semana_fin: fin,
      asignacion_anterior: calculo.asignacion_anterior,
      es_primera_semana: calculo.es_primera_semana,
      agentes: calculo.agentes,
      totales: {
        total_agentes: calculo.total_agentes,
        total_creditos: calculo.total_creditos,
        total_primeros_pagos: calculo.total_primeros_pagos,
        total_gastos_agentes: calculo.total_gastos_agentes,
        total_gastos_agencia: calculo.total_gastos_agencia,
        total_movimientos_capital: calculo.total_movimientos_capital,
        total_general: calculo.total_general,
      },
    });
  } catch (error) {
    console.error("Error en previewCorteGeneral:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

// ============================================================
// POST /api/cortes-generales
// ============================================================
exports.crearCorteGeneral = async (req, res) => {
  const t = await db.transaction();
  try {
    const {
      semana_inicio,
      semana_fin,
      gastos_agencia = [],
      movimientos_capital = [],
      asignacion_anterior: asignacion_manual = 0,
      confirmado_por = null,
    } = req.body;

    if (!semana_inicio || !semana_fin) {
      await t.rollback();
      return res.status(400).json({ error: "Faltan fechas." });
    }

    const inicio = toInicio(semana_inicio);
    const fin = toFin(semana_fin);

    // Evitar duplicado en la misma semana
    const existente = await CorteGeneral.findOne({
      where: { semana_inicio: inicio },
      transaction: t,
    });
    if (existente) {
      await t.rollback();
      return res.status(409).json({
        error: "Ya existe un corte general para esa semana.",
      });
    }

    // Recalcular TODO en el back (no confiar en el front)
    const calculo = await calcularCorte({
      inicio,
      fin,
      gastos_agencia,
      movimientos_capital,
      asignacion_manual,
      transaction: t,
    });

    // Crear cabecera
    const corte = await CorteGeneral.create(
      {
        semana_inicio: inicio,
        semana_fin: fin,
        asignacion_anterior: calculo.asignacion_anterior,
        total_agentes: calculo.total_agentes,
        total_creditos: calculo.total_creditos,
        total_primeros_pagos: calculo.total_primeros_pagos,
        total_gastos_agentes: calculo.total_gastos_agentes,
        total_gastos_agencia: calculo.total_gastos_agencia,
        total_movimientos_capital: calculo.total_movimientos_capital,
        total_general: calculo.total_general,
        es_primera_semana: calculo.es_primera_semana,
        confirmado_por,
      },
      { transaction: t },
    );

    // Snapshot de agentes
    if (calculo.agentes.length > 0) {
      await CorteGeneralAgente.bulkCreate(
        calculo.agentes.map((a) => ({
          ...a,
          corte_general_id: corte.id,
        })),
        { transaction: t },
      );
    }

    // Gastos de agencia
    if (Array.isArray(gastos_agencia) && gastos_agencia.length > 0) {
      await CorteGeneralGasto.bulkCreate(
        gastos_agencia.map((g) => ({
          corte_general_id: corte.id,
          concepto: g.concepto,
          monto: num(g.monto),
        })),
        { transaction: t },
      );
    }

    // Movimientos de capital
    if (Array.isArray(movimientos_capital) && movimientos_capital.length > 0) {
      await MovimientoCapital.bulkCreate(
        movimientos_capital.map((m) => ({
          corte_general_id: corte.id,
          inversionista_nombre: m.inversionista_nombre || null,
          tipo: m.tipo,
          concepto: m.concepto || null,
          monto: num(m.monto),
        })),
        { transaction: t },
      );
    }

    await t.commit();
    res.status(201).json({
      message: "Corte general creado exitosamente.",
      data: corte,
    });
  } catch (error) {
    await t.rollback();
    console.error("Error en crearCorteGeneral:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

// ============================================================
// GET /api/cortes-generales
// ============================================================
exports.listarCortesGenerales = async (req, res) => {
  try {
    const cortes = await CorteGeneral.findAll({
      order: [["semana_inicio", "DESC"]],
    });
    res.json(cortes);
  } catch (error) {
    console.error("Error en listarCortesGenerales:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

// ============================================================
// GET /api/cortes-generales/:id
// ============================================================
exports.detalleCorteGeneral = async (req, res) => {
  try {
    const corte = await CorteGeneral.findByPk(req.params.id, {
      include: [
        { model: CorteGeneralAgente, as: "agentes" },
        { model: CorteGeneralGasto, as: "gastosAgencia" },
        { model: MovimientoCapital, as: "movimientosCapital" },
      ],
    });
    if (!corte) {
      return res.status(404).json({ error: "Corte general no encontrado." });
    }
    res.json(corte);
  } catch (error) {
    console.error("Error en detalleCorteGeneral:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

// ============================================================
// DELETE /api/cortes-generales/:id
// Solo se puede borrar el más reciente.
// ============================================================
exports.eliminarCorteGeneral = async (req, res) => {
  try {
    const corte = await CorteGeneral.findByPk(req.params.id);
    if (!corte) {
      return res.status(404).json({ error: "Corte general no encontrado." });
    }

    const ultimo = await CorteGeneral.findOne({
      order: [["semana_inicio", "DESC"]],
    });

    if (!ultimo || ultimo.id !== corte.id) {
      return res.status(403).json({
        error: "Solo se puede eliminar el corte más reciente.",
      });
    }

    await corte.destroy(); // CASCADE borra hijos
    res.json({ message: "Corte general eliminado correctamente." });
  } catch (error) {
    console.error("Error en eliminarCorteGeneral:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};
