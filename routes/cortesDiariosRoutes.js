const express = require("express");
const router = express.Router();
const {
  crearCorteDiario,
  obtenerCortesDiarios,
  obtenerCortesPorCollector, // Asegúrate de importar esta función
} = require("../controllers/cortesControllers");

// Ruta para crear un nuevo corte diario
router.post("/", crearCorteDiario);

// Ruta para obtener todos los cortes diarios
router.get("/", obtenerCortesDiarios);

// Ruta para obtener cortes diarios por collector_id
router.get("/:collectorId", obtenerCortesPorCollector); // Agrega esta línea

module.exports = router;
