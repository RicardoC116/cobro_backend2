const express = require("express");
const router = express.Router();
const deudoresController = require("../controllers/deudoresControllers");

// Rutas especificas
// Ruta específica para cambiar cobrador
router.put("/cambiar-cobrador", deudoresController.cambiarCobrador);
// Ruta para renovar contrato
router.put("/renovar-contrato", deudoresController.renovarContratoDeudor);
// Ruta para traer todos los contratos por deudor
router.get("/contratos/:deudorId", deudoresController.geContratoById);
// Obtener todos los deudores de un cobrador específico
router.get("/cobrador/:cobradorId", deudoresController.getDeudoresByCobrador);

// Rutas generales
router.get("/", deudoresController.getAllDeudores);
router.post("/", deudoresController.createDeudor);
router.put("/:id", deudoresController.updateDeudor);
router.delete("/:id", deudoresController.deleteDeudor);
// Obtener detalles de un deudor específico por ID
router.get("/:id", deudoresController.getDeudorById);

module.exports = router;
