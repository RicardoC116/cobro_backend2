const express = require("express");
const router = express.Router();
const cobradoresController = require("../controllers/cobradoresControllers");

// Rutas existentes
router.get("/", cobradoresController.getAllCobradores);
router.post("/", cobradoresController.createCobrador);
router.put("/:id", cobradoresController.updateCobrador);
router.delete("/:id", cobradoresController.deleteCobrador);

// Nueva ruta para iniciar sesión
router.post("/login", cobradoresController.loginCobrador);

// Nueva ruta para verificar el token
router.get("/verify-token", cobradoresController.verifyToken); // Agregar esta línea

module.exports = router;
