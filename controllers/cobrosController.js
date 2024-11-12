// controllers/cobrosController.js
const Cobro = require("../models/cobroModel");
const Cobrador = require("../models/cobradorModel");
const Deudor = require("../models/deudorModel");

exports.registrarCobro = async (req, res) => {
  try {
    const { collector_Id, debtor_Id, amount, payment_Date, payment_Type } =
      req.body;

    // Verifica si el collectorId y debtorId existen
    const cobrador = await Cobrador.findByPk(collector_Id);
    const deudor = await Deudor.findByPk(debtor_Id);

    if (!cobrador) {
      return res.status(404).json({ message: "El cobrador no existe" });
    }
    if (!deudor) {
      return res.status(404).json({ message: "El deudor no existe" });
    }
    
    // Verifica si el monto es mayor a 0
    if (amount <= 0) {
      return res
        .status(400)
        .json({ message: "El monto del cobro debe ser mayor a 0" });
    }

    // Verificar si el balance del deudor es 0 o menos
    if (deudor.balance <= 0) {
      return res
        .status(400)
        .json({ message: "El balance es cero, no se puede realizar el pago" });
    }

    // Calcular el nuevo balance después del cobro
    const nuevoBalance = deudor.balance - amount;

    // Verificar si el monto del cobro excede el balance
    if (nuevoBalance < 0) {
      return res
        .status(400)
        .json({ message: "El monto del cobro excede el balance" });
    }

    // Crear el cobro
    const nuevoCobro = await Cobro.create({
      collector_Id,
      debtor_Id,
      amount,
      payment_Date,
      payment_Type,
    });

    // Actualizar el balance del deudor y guardarlo
    deudor.balance = nuevoBalance;
    await deudor.save();

    // Incluir el nuevo balance en la respuesta
    res.status(201).json({
      message: "Cobro registrado con éxito",
      cobro: nuevoCobro,
      nuevo_balance: deudor.balance,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al registrar el cobro" });
  }
};

exports.obtenerCobros = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, collectorId } = req.query;

    const where = {};
    if (fechaInicio && fechaFin) {
      where.paymentDate = {
        [Op.between]: [new Date(fechaInicio), new Date(fechaFin)],
      };
    }
    if (collectorId) {
      where.collectorId = collectorId;
    }

    const cobros = await Cobro.findAll({ where });
    res.json(cobros);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener los cobros" });
  }
};

// Obtener cobros por cobrador (admin)
exports.obtenerCobrosPorCobrador = async (req, res) => {
  try {
    const { collectorId } = req.params;
    const cobros = await Cobro.findAll({
      where: { collector_Id: collectorId },
    });
    res.json(cobros);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener los cobros" });
  }
};

// Obtener cobros por deudor (usuario)
exports.obtenerCobrosPorDeudor = async (req, res) => {
  try {
    const { debtorId } = req.params;
    const cobros = await Cobro.findAll({ where: { debtor_Id: debtorId } });
    res.json(cobros);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener los cobros" });
  }
};
