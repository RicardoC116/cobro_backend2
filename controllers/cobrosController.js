// controllers/cobrosController.js
const Cobro = require("../models/cobroModel");
const Cobrador = require("../models/cobradorModel");
const Deudor = require("../models/deudorModel");
const { Op } = require("sequelize");

exports.registrarCobro = async (req, res) => {
  try {
    console.log("Datos recibidos:", req.body);

    const { collector_id, debtor_id, amount, payment_date } = req.body;

    // Validar si los IDs de cobrador y deudor existen
    const cobrador = await Cobrador.findByPk(collector_id);
    const deudor = await Deudor.findByPk(debtor_id);

    if (!cobrador) {
      return res.status(404).json({ message: "El cobrador no existe." });
    }
    if (!deudor) {
      return res.status(404).json({ message: "El deudor no existe." });
    }

    // Validar monto y balance
    if (amount <= 0) {
      return res.status(400).json({ message: "El monto debe ser mayor a 0." });
    }
    if (deudor.balance <= 0) {
      return res
        .status(400)
        .json({ message: "El balance del deudor es cero." });
    }
    if (amount > deudor.balance) {
      return res
        .status(400)
        .json({ message: "El monto excede el balance del deudor." });
    }

    // Determinar el tipo de pago
    const nuevoBalance = deudor.balance - amount;
    const payment_type = nuevoBalance === 0 ? "liquidación" : "normal";

    // Registrar el cobro
    const nuevoCobro = await Cobro.create({
      collector_id,
      debtor_id,
      amount,
      payment_date,
      payment_type,
    });

    // Actualizar el balance del deudor
    deudor.balance = nuevoBalance;
    await deudor.save();

    res.status(201).json({
      message: "Cobro registrado con éxito.",
      cobro: nuevoCobro,
      nuevo_balance: deudor.balance,
    });
  } catch (error) {
    console.error("Error al registrar el cobro:", error);
    res
      .status(500)
      .json({ message: "Error al registrar el cobro.", error: error.message });
  }
};

// Obtener cobros por rango de fechas o cobrador
exports.obtenerCobros = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, collector_id } = req.query;

    const where = {};
    if (fechaInicio && fechaFin) {
      where.payment_date = {
        [Op.between]: [new Date(fechaInicio), new Date(fechaFin)],
      };
    }
    if (collector_id) {
      where.collector_id = collector_id;
    }

    const cobros = await Cobro.findAll({ where });
    res.json(cobros);
  } catch (error) {
    console.error("Error al obtener los cobros:", error);
    res.status(500).json({ message: "Error al obtener los cobros." });
  }
};

// Obtener cobros por cobrador
exports.obtenerCobrosPorCobrador = async (req, res) => {
  try {
    const { collectorId } = req.params;
    const cobros = await Cobro.findAll({
      where: { collector_id: collectorId },
    });
    res.json(cobros);
  } catch (error) {
    console.error("Error al obtener los cobros por cobrador:", error);
    res
      .status(500)
      .json({ message: "Error al obtener los cobros por cobrador." });
  }
};

// Obtener cobros por deudor
exports.obtenerCobrosPorDeudor = async (req, res) => {
  try {
    const { debtorId } = req.params;
    const cobros = await Cobro.findAll({ where: { debtor_id: debtorId } });
    res.json(cobros);
  } catch (error) {
    console.error("Error al obtener los cobros por deudor:", error);
    res
      .status(500)
      .json({ message: "Error al obtener los cobros por deudor." });
  }
};
