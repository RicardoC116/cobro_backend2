// routes/cobros.js

const express = require("express");
const router = express.Router();
const {
  registrarCobro,
  obtenerCobros,
  obtenerCobrosPorCobrador,
  obtenerCobrosPorDeudor,
} = require("../controllers/cobrosController");

// Ruta para registrar un cobro de un deudor
router.post("/registrar", registrarCobro);

// Ruta para obtener todos los cobros
router.get("/", obtenerCobros);

// Ruta para obtener cobros por cobrador (admin)
router.get("/cobrador/:collectorId", obtenerCobrosPorCobrador);

// Ruta para obtener cobros por deudor (usuario)
router.get("/deudor/:debtorId", obtenerCobrosPorDeudor);

module.exports = router;
