// CortesDiariosController
const CorteDiario = require("../models/corteDiarioModel");
const deudoresController = require("./deudoresControllers");
const cobrosController = require("./cobrosController");
const { Op } = require("sequelize");

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

    const fechaInicio = ultimoCorte
      ? new Date(new Date(ultimoCorte.fecha).getTime() + 24 * 60 * 60 * 1000)
      : new Date(new Date().setHours(0, 0, 0, 0));
    const fechaFin = fecha ? new Date(fecha) : new Date();

    fechaFin.setHours(fechaFin.getHours() - 6);
    const fechaCorte = fechaFin.toISOString().split("T")[0];

    // 1. Obtener cobros en el rango
    const cobros = await cobrosController.obtenerCobrosEnRango(
      collector_id,
      fechaInicio,
      fechaFin
    );

    // 2. Extraer deudores que pagaron
    const deudoresCobros = Array.from(new Set(cobros.map((c) => c.debtor_id)));

    // 3. Obtener nuevos deudores (primeros pagos)
    const nuevosDeudores = await deudoresController.obtenerNuevosDeudores(
      collector_id,
      fechaInicio,
      fechaFin
    );
    const primerosPagosMontos =
      deudoresController.calcularPrimerosPagos(nuevosDeudores);
    const deudoresPrimerosPagos = nuevosDeudores.map((d) => d.id);

    // 4. Unificar ambas listas de deudores que han pagado
    const deudoresPagaron = Array.from(
      new Set([...deudoresCobros, ...deudoresPrimerosPagos])
    );

    // 5. Calcular estadísticas
    const cobranzaTotal = cobrosController.calcularCobranzaTotal(cobros);
    const liquidaciones = cobrosController.calcularLiquidaciones(cobros);

    const deudoresActivos = await deudoresController.obtenerDeudoresActivos(
      collector_id
    );
    const noPagosTotal = deudoresController.obtenerDeudoresNoPagaron(
      deudoresActivos,
      deudoresPagaron
    );

    // 6. Registrar el corte diario
    const corte = await CorteDiario.create({
      collector_id,
      fecha: fechaCorte,
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
