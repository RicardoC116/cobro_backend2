// routes/cortesRoutes

const express = require("express");

// CorteDiario
const {
  registrarCorteDiario,
  obtenerCortesDiarios,
  deleteCorteDiario,
  obtenerCortesPorCobrador,
} = require("../controllers/cortesDiariosController");

// CorteSemanal
const {
  crearCorteSemanal,
  obtenerCortesSemanales,
  deleteCorteSemanal,
  obtenerCortesSemanalPorCobrador,
} = require("../controllers/cortesSemanalesController");

const router = express.Router();

router.post("/diario", registrarCorteDiario);
router.get("/diario", obtenerCortesDiarios);
router.get("/diario/:id", obtenerCortesPorCobrador);
router.delete("/diario/:id", deleteCorteDiario);

// Semanales
router.post("/semanal", crearCorteSemanal);
router.get("/semanal", obtenerCortesSemanales);
router.get("/semanal/:id", obtenerCortesSemanalPorCobrador);
router.delete("/semanal/:id", deleteCorteSemanal);

module.exports = router;
