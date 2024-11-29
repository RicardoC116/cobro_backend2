// controllers/preCorteController.js

const PreCorte = require("../models/preCorteModel");
const cobrosController = require("./cobrosController");
const deudoresController = require("./deudoresControllers");

exports.registrarPreCorte = async (req, res) => {
  const { collector_id, fecha } = req.body;

  if (!collector_id || !fecha) {
    return res.status(400).json({ error: "Faltan datos obligatorios." });
  }

  try {
    const cobros = await cobrosController.obtenerCobrosPorCobrador(
      collector_id
    );
    const deudoresActivos = await deudoresController.obtenerDeudoresActivos(
      collector_id
    );

    // Calcular los totales del pre-corte
    const cobranzaTotal = cobrosController.calcularCobranzaTotal(cobros, 0); // Sin primeros pagos aún
    const creditosTotales =
      deudoresController.calcularCreditosTotales(deudoresActivos);
    const liquidaciones = cobrosController.calcularLiquidaciones(cobros);
    const noPagaron =
      deudoresActivos.length - liquidaciones.deudoresLiquidados.length;
    const primerosPagos =
      deudoresController.calcularPrimerosPagos(deudoresActivos);

    const nuevoPreCorte = await PreCorte.create({
      collector_id,
      fecha,
      total_cobranza: cobranzaTotal,
      total_creditos: creditosTotales,
      total_liquidaciones: liquidaciones.total,
      total_no_pagos: noPagaron,
      primeros_pagos: primerosPagos,
    });

    res.status(201).json({
      message: "Pre-corte registrado con éxito.",
      preCorte: nuevoPreCorte,
    });
  } catch (error) {
    console.error("Error al registrar el pre-corte:", error);
    res.status(500).json({
      message: "Error al registrar el pre-corte.",
      error: error.message,
    });
  }
};

// Nueva función para obtener todos los pre-cortes
exports.obtenerPreCortes = async (req, res) => {
  try {
    const preCortes = await PreCorte.findAll(); // Aquí obtenemos todos los pre-cortes de la base de datos

    if (preCortes.length === 0) {
      return res.status(404).json({ message: "No se encontraron pre-cortes." });
    }

    res.status(200).json(preCortes);
  } catch (error) {
    console.error("Error al obtener los pre-cortes:", error);
    res.status(500).json({
      message: "Error al obtener los pre-cortes.",
      error: error.message,
    });
  }
};
