// routes/cortesRoutes

const express = require("express");

// CorteDiario
const {
  registrarCorteDiario,
  obtenerCortesDiarios,
  deleteCorteDiario,
} = require("../controllers/cortesDiariosController");

// CorteSemanal
const {
  crearCorteSemanal,
  obtenerCortesSemanales,
  deleteCorteSemanal,
} = require("../controllers/cortesSemanalesController");

const router = express.Router();

router.post("/diario", registrarCorteDiario);
router.get("/diario", obtenerCortesDiarios);
router.delete("/diario/:id", deleteCorteDiario);

// Semanales
router.post("/semanal", crearCorteSemanal);
router.get("/semanal", obtenerCortesSemanales);
router.delete("/semanal/:id", deleteCorteSemanal);

module.exports = router;
