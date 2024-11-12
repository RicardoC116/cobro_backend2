// routes/deudores.js
const express = require("express");
const router = express.Router();
const deudoresController = require("../controllers/deudoresControllers");

router.get("/", deudoresController.getAllDeudores);
router.post("/", deudoresController.createDeudor);
router.put("/:id", deudoresController.updateDeudor);
router.delete("/:id", deudoresController.deleteDeudor);

router.get("/cobrador/:cobradorId", deudoresController.getDeudoresByCobrador);

router.get("/:id", deudoresController.getDeudorById);

module.exports = router;
