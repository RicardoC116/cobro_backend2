// routes/corteGeneralRoutes.js
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/corteGeneralController");

// Preview (sin guardar)
router.get("/preview", ctrl.previewCorteGeneral);

// Crear corte general
router.post("/", ctrl.crearCorteGeneral);

// Historial
router.get("/", ctrl.listarCortesGenerales);

// Detalle
router.get("/:id", ctrl.detalleCorteGeneral);

// Eliminar (solo el último)
router.delete("/:id", ctrl.eliminarCorteGeneral);

module.exports = router;
