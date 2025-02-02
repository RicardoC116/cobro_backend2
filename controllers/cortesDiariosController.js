// CortesDiariosController
const CorteDiario = require("../models/corteDiarioModel");
const deudoresController = require("./deudoresControllers");
const cobrosController = require("./cobrosController");
const { DateTime } = require("luxon");
const { Op } = require("sequelize");

exports.registrarCorteDiario = async (req, res) => {
  const { collector_id } = req.body;

  if (!collector_id) {
    return res
      .status(400)
      .json({ error: "El ID del cobrador es obligatorio." });
  }

  try {
    // 🕒 1. Obtener la fecha de hoy en México
    const fechaHoy = DateTime.now().setZone("America/Mexico_City").toISODate(); // Se guarda en formato "YYYY-MM-DD"

    console.log("Fecha que se guardará:", fechaHoy);

    // 🕒 2. Buscar el último corte del cobrador
    const ultimoCorte = await CorteDiario.findOne({
      where: { collector_id },
      order: [["fecha", "DESC"]],
    });

    // 📅 3. Definir rango de fechas (inicio y fin)
    const fechaInicio = ultimoCorte
      ? DateTime.fromISO(ultimoCorte.fecha).plus({ days: 1 }).toISODate()
      : fechaHoy; // Si no hay cortes previos, usar hoy

    const fechaFin = fechaHoy; // La fecha de corte siempre será la de hoy

    console.log("Rango de fechas:", { fechaInicio, fechaFin });

    // 4. Obtener cobros en el rango de fechas
    const cobros = await cobrosController.obtenerCobrosEnRango(
      collector_id,
      fechaInicio,
      fechaFin
    );

    // 5. Obtener deudores que han pagado
    const deudoresCobros = Array.from(new Set(cobros.map((c) => c.debtor_id)));

    // 6. Obtener nuevos deudores (primeros pagos)
    const nuevosDeudores = await deudoresController.obtenerNuevosDeudores(
      collector_id,
      fechaInicio,
      fechaFin
    );
    const primerosPagosMontos =
      deudoresController.calcularPrimerosPagos(nuevosDeudores);
    const deudoresPrimerosPagos = nuevosDeudores.map((d) => d.id);

    // 7. Unificar deudores que pagaron
    const deudoresPagaron = Array.from(
      new Set([...deudoresCobros, ...deudoresPrimerosPagos])
    );

    // 8. Calcular estadísticas
    const cobranzaTotal = cobrosController.calcularCobranzaTotal(cobros);
    const liquidaciones = cobrosController.calcularLiquidaciones(cobros);
    const deudoresActivos = await deudoresController.obtenerDeudoresActivos(
      collector_id
    );
    const noPagosTotal = deudoresController.obtenerDeudoresNoPagaron(
      deudoresActivos,
      deudoresPagaron
    );

    // 📝 9. Registrar el corte diario
    const corte = await CorteDiario.create({
      collector_id,
      fecha: fechaHoy,
      cobranza_total: cobranzaTotal,
      deudores_cobrados: deudoresPagaron.length,
      liquidaciones_total: liquidaciones.total,
      deudores_liquidados: liquidaciones.deudoresLiquidados.length,
      no_pagos_total: noPagosTotal,
      creditos_total: nuevosDeudores.length,
      creditos_total_monto:
        deudoresController.calcularCreditosTotales(nuevosDeudores),
      primeros_pagos_total: deudoresPrimerosPagos.length,
      primeros_pagos_montos: primerosPagosMontos,
      nuevos_deudores: nuevosDeudores.length,
      deudores_totales: deudoresActivos.length,
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

// Obtener cobros por cobrador
exports.obtenerCortesPorCobrador = async (req, res) => {
  try {
    const { id } = req.params; // Ajustar el nombre del parámetro
    const Corte = await CorteDiario.findAll({
      where: { collector_id: id }, // Usar "id" correctamente aquí
    });
    res.json(Corte);
  } catch (error) {
    console.error("Error al obtener los cortes por cobrador:", error);
    res
      .status(500)
      .json({ message: "Error al obtener los cobros por cobrador." });
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
