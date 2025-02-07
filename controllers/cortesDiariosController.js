// CortesDiariosController
const { DateTime } = require("luxon"); // Asegúrate de que luxon está instalado
const CorteDiario = require("../models/corteDiarioModel");
const deudoresController = require("./deudoresControllers");
const cobrosController = require("./cobrosController");
const { Op } = require("sequelize");

// Función para ajustar la fecha a zona horaria México y convertirla a UTC
function ajustarFechaMexico(fecha, inicioDelDia = true) {
  return inicioDelDia
    ? DateTime.fromJSDate(fecha, { zone: "America/Mexico_City" })
        .startOf("day")
        .toISO({ suppressMilliseconds: true })
    : DateTime.fromJSDate(fecha, { zone: "America/Mexico_City" })
        .endOf("day")
        .toISO({ suppressMilliseconds: true });
}

exports.registrarCorteDiario = async (req, res) => {
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

    // Definir fecha de inicio basada en el último corte o en hoy
    const fechaBase = ultimoCorte ? new Date(ultimoCorte.fecha) : new Date();
    const fechaInicio = ajustarFechaMexico(fechaBase, true); // 2025-02-06T00:00:00-06:00

    // Si hay una fecha en la petición, se usa; si no, se usa hoy
    const fechaBaseFin =
      fecha && !isNaN(Date.parse(fecha)) ? new Date(fecha) : new Date();
    const fechaFin = ajustarFechaMexico(fechaBaseFin, false); // 2025-02-06T23:59:59-06:00

    console.log("Fecha Inicio (ISO):", fechaInicio);
    console.log("Fecha Fin (ISO):", fechaFin);

    // Obtener cobros en el rango
    const cobros = await cobrosController.obtenerCobrosEnRango(
      collector_id,
      fechaInicio,
      fechaFin
    );

    // Obtener deudores que pagaron
    const deudoresCobros = Array.from(new Set(cobros.map((c) => c.debtor_id)));

    // Obtener nuevos deudores (primeros pagos)
    const nuevosDeudores = await deudoresController.obtenerNuevosDeudores(
      collector_id,
      fechaInicio,
      fechaFin
    );
    const primerosPagosMontos =
      deudoresController.calcularPrimerosPagos(nuevosDeudores);
    const deudoresPrimerosPagos = nuevosDeudores.map((d) => d.id);

    // Unificar listas de deudores que han pagado
    const deudoresPagaron = Array.from(
      new Set([...deudoresCobros, ...deudoresPrimerosPagos])
    );

    // Calcular estadísticas
    const cobranzaTotal = cobrosController.calcularCobranzaTotal(cobros) || 0;
    const liquidaciones = cobrosController.calcularLiquidaciones(cobros) || {
      total: 0,
      deudoresLiquidados: [],
    };

    const deudoresActivos = await deudoresController.obtenerDeudoresActivos(
      collector_id
    );
    const noPagosTotal =
      deudoresController.obtenerDeudoresNoPagaron(
        deudoresActivos,
        deudoresPagaron
      ) || 0;

    // Registrar el corte diario con fechas en formato ISO en México
    const corte = await CorteDiario.create({
      collector_id,
      fecha: fechaFin, // Guardamos la fecha en la zona horaria de México
      cobranza_total: cobranzaTotal,
      deudores_cobrados: deudoresPagaron.length,
      liquidaciones_total: liquidaciones.total,
      deudores_liquidados: liquidaciones.deudoresLiquidados.length,
      no_pagos_total: noPagosTotal,
      creditos_total: nuevosDeudores.length,
      creditos_total_monto:
        deudoresController.calcularCreditosTotales(nuevosDeudores) || 0,
      primeros_pagos_total: deudoresPrimerosPagos.length,
      primeros_pagos_montos: primerosPagosMontos || [],
      nuevos_deudores: nuevosDeudores.length,
      deudores_totales: deudoresActivos.length,
    });

    res
      .status(201)
      .json({ message: "Corte diario registrado exitosamente.", corte });
  } catch (error) {
    console.error("Error al registrar el corte diario:", error);
    res
      .status(500)
      .json({
        error: "Error al registrar el corte diario.",
        detalle: error.message,
      });
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
