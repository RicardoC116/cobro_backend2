// routes/cobros.js

const express = require("express");
const router = express.Router();
const {
  registrarCobro,
  obtenerCobros,
  obtenerCobrosPorCobrador,
  obtenerCobrosPorDeudor,
  eliminarCobro,
  modificarCobro,
  obtenerCobrosPorDia,
  obtenerCobrosPorDiaEId,
  obtenerCobrosPorSemanaEId,
} = require("../controllers/cobrosController");

// Ruta para obtener todos los cobros
router.get("/", obtenerCobros);

// Ruta para registrar un cobro de un deudor
router.post("/registrar", registrarCobro);

// Ruta para obtener los cobros por rango de fechas y cobrador
router.get("/diaId", obtenerCobrosPorDiaEId);

// Ruta para obtener los cobros por semana y cobrador
router.get("/semanaId", obtenerCobrosPorSemanaEId);

// Ruta para obtener los cobros por dia
router.get("/dia", obtenerCobrosPorDia);

// Ruta para obtener cobros por cobrador (admin)
router.get("/cobrador/:collectorId", obtenerCobrosPorCobrador);

// Ruta para obtener cobros por deudor (usuario)
router.get("/deudor/:debtorId", obtenerCobrosPorDeudor);

// Modificar un cobro
router.put("/modificar", modificarCobro);

// Eliminar un cobro
router.delete("/eliminar/:cobro_id", eliminarCobro);

module.exports = router;
