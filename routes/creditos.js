// cortesRoutes

const express = require("express");
const router = express.Router();
const Credito = require("../models/Credito");

router.get("/user/:userId", async (req, res) => {
  try {
    const creditos = await Credito.findAll({
      where: { userId: req.params.userId },
    });
    res.json(creditos);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener los créditos" });
  }
});

module.exports = router;
