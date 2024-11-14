// cortesRoutes

const express = require("express");
const router = express.Router();
const {
  obtenerCortesDiarios,
  obtenerNoPagos,
} = require("../controllers/cortesControllers");

router.get("/diario", obtenerCortesDiarios);
router.get("/no-pagos", obtenerNoPagos);

module.exports = router;
