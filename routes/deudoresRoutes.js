// routes/deudores.js
const express = require("express");
const router = express.Router();
const deudoresController = require("../controllers/deudoresControllers");

router.get("/", deudoresController.getAllDeudores);
router.post("/", deudoresController.createDeudor);
router.put("/:id", deudoresController.updateDeudor);
router.delete("/:id", deudoresController.deleteDeudor);

// Obtener todos los deudores de un cobrador específico
router.get("/cobrador/:cobradorId", deudoresController.getDeudoresByCobrador);

// Obtener detalles de un deudor específico por ID
router.get("/:id", deudoresController.getDeudorById);

module.exports = router;
