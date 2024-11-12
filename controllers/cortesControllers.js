const CorteDiario = require("../models/corteDiario");
const Cobro = require("../models/cobroModel");

exports.crearCorteDiario = async (req, res) => {
  try {
    const {
      collector_id,
      total_amount,
      collections_count,
      liquidations_count,
      non_payments_count,
      credits_count,
      first_payments_total,
      corte_date,
    } = req.body;

    console.log(req.body);

    const nuevoCorte = await CorteDiario.create({
      collector_id,
      total_amount,
      collections_count,
      liquidations_count,
      non_payments_count,
      credits_count,
      first_payments_total,
      corte_date,
    });

    return res.status(201).json(nuevoCorte);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

// Obtener todos los cortes diarios
exports.obtenerCortesDiarios = async (req, res) => {
  try {
    const cortes = await CorteDiario.findAll();
    res.json(cortes);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener cortes", error });
  }
};

// Obtener cortes diarios por collector_id
exports.obtenerCortesPorCollector = async (req, res) => {
  const collectorId = req.params.collectorId; // Obtiene el collectorId de los parámetros de la ruta
  try {
    const cortes = await CorteDiario.findAll({
      where: { collector_id: collectorId },
    });
    res.json(cortes);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al obtener cortes por cobrador", error });
  }
};
