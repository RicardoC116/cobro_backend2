const express = require("express");
const {
  registrarCorteDiario,
  obtenerCortesDiarios,
  deleteCorteDiario,
} = require("../controllers/cortesDiariosController");

const {
  crearCorteSemanal,
  obtenerCortesSemanales,
  deleteCorteSemanal,
} = require("../controllers/cortesSemanalesController");

const router = express.Router();

router.post("/diario", registrarCorteDiario);
router.get("/diario", obtenerCortesDiarios);
router.delete("/diario/:id", deleteCorteDiario);

router.post("/semanal", crearCorteSemanal);
router.get("/semanal", obtenerCortesSemanales);
router.delete("/semanal/:id", deleteCorteSemanal);

module.exports = router;
