const express = require("express");
const {
  registrarCorteDiario,
} = require("../controllers/cortesDiariosController");

const router = express.Router();

router.post("/diario", registrarCorteDiario);

module.exports = router;
