// CortesDiariosController
const CorteDiario = require("../models/corteDiarioModel");
const deudoresController = require("./deudoresControllers");
const cobrosController = require("./cobrosController");
const PreCorte = require("../models/preCorteModel");

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

    // 1. Obtener deudores activos
    const deudoresActivos = await deudoresController.obtenerDeudoresActivos(
      collector_id
    );

    // 2. Obtener nuevos deudores y primeros pagos
    const nuevosDeudores = await deudoresController.obtenerNuevosDeudores(
      collector_id,
      fechaInicio,
      fechaFin
    );
    const primerosPagosMontos =
      deudoresController.calcularPrimerosPagos(nuevosDeudores);
    const creditosTotales =
      deudoresController.calcularCreditosTotales(nuevosDeudores);

    // 3. Obtener cobros en el rango y calcular estadísticas
    const cobros = await cobrosController.obtenerCobrosEnRango(
      collector_id,
      fechaInicio,
      fechaFin
    );
    const cobranzaTotal = cobrosController.calcularCobranzaTotal(
      cobros,
      primerosPagosMontos
    );
    const liquidaciones = cobrosController.calcularLiquidaciones(cobros);

    // 4. Calcular deudores cobrados y no pagaron
    const deudoresPagaron = [
      ...new Set([
        ...cobros.map((cobro) => cobro.debtor_id),
        ...nuevosDeudores.map((deudor) => deudor.id),
      ]),
    ];
    const noPagosTotal = deudoresController.obtenerDeudoresNoPagaron(
      deudoresActivos,
      deudoresPagaron
    );

    // 5. Crear el registro del corte diario
    const corte = await CorteDiario.create({
      collector_id,
      fecha: fechaFin.toISOString().split("T")[0],
      cobranza_total: cobranzaTotal,
      deudores_cobrados: deudoresPagaron.length,
      liquidaciones_total: liquidaciones.total,
      deudores_liquidados: liquidaciones.deudoresLiquidados.length,
      no_pagos_total: noPagosTotal,
      creditos_total: nuevosDeudores.length,
      creditos_total_monto: creditosTotales,
      primeros_pagos_total: nuevosDeudores.length,
      primeros_pagos_montos: primerosPagosMontos,
      nuevos_deudores: nuevosDeudores.length,
      deudores_totales: deudoresActivos.length,
    });

    // Eliminar el pre-corte
    await PreCorte.destroy({
      where: {
        collector_id,
        fecha: fechaFin.toISOString().split("T")[0],
      },
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
