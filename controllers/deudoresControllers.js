// controllers/deudoresController.js
const Deudor = require("../models/deudorModel");
const Cobrador = require("../models/cobradorModel");
const { Op } = require("sequelize");

// Obtener todos los deudores
exports.getAllDeudores = async (req, res) => {
  try {
    const deudores = await Deudor.findAll();
    res.json(deudores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Crear un nuevo deudor
exports.createDeudor = async (req, res) => {
  const {
    contract_number,
    name,
    amount,
    total_to_pay,
    first_payment,
    balance,
    phone_number,
    payment_type,
  } = req.body;

  try {
    const cobrador = await Cobrador.findOne({ where: { phone_number } });
    if (!cobrador) {
      return res.status(404).json({ error: "Cobrador no encontrado." });
    }

    const balanceInicial = balance - first_payment;

    const deudor = await Deudor.create({
      contract_number,
      name,
      amount,
      total_to_pay,
      first_payment,
      balance: balanceInicial,
      collector_id: cobrador.id,
      payment_type,
    });

    res.status(201).json(deudor);
  } catch (error) {
    console.error("Error al crear el deudor:", error);
    res.status(500).json({ error: "Error al crear el deudor." });
  }
};

// Actualizar un deudor
exports.updateDeudor = async (req, res) => {
  const { id } = req.params;
  const {
    contract_number,
    name,
    amount,
    total_to_pay,
    first_payment,
    balance,
    collector_id,
    payment_type,
  } = req.body;
  try {
    const deudor = await Deudor.findByPk(id);
    if (!deudor) {
      return res.status(404).json({ error: "Deudor no encontrado" });
    }
    deudor.contract_number = contract_number;
    deudor.name = name;
    deudor.amount = amount;
    deudor.total_to_pay = total_to_pay;
    deudor.first_payment = first_payment;
    deudor.balance = balance;
    deudor.collector_id = collector_id;
    deudor.payment_type = payment_type;
    await deudor.save();
    res.json(deudor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Eliminar un deudor
exports.deleteDeudor = async (req, res) => {
  const { id } = req.params;
  try {
    const deudor = await Deudor.findByPk(id);
    if (!deudor) {
      return res.status(404).json({ error: "Deudor no encontrado" });
    }
    await deudor.destroy();
    res.json({ message: "Deudor eliminado" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtener todos los deudores de un cobrador específico
exports.getDeudoresByCobrador = async (req, res) => {
  const { cobradorId } = req.params;
  try {
    const deudores = await Deudor.findAll({
      where: { collector_id: cobradorId },
    });
    res.json(deudores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtener detalles de un deudor específico por ID
exports.getDeudorById = async (req, res) => {
  const { id } = req.params;
  try {
    const deudor = await Deudor.findByPk(id);
    if (!deudor) {
      return res.status(404).json({ error: "Deudor no encontrado" });
    }
    res.json(deudor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.obtenerDeudoresActivos = async (collector_id) => {
  return await Deudor.findAll({
    where: {
      collector_id,
      balance: { [Op.gt]: 0 }, 
    },
  });
};

exports.obtenerNuevosDeudores = async (collector_id, fechaInicio, fechaFin) => {
  return await Deudor.findAll({
    where: {
      collector_id,
      createdAt: { [Op.between]: [fechaInicio, fechaFin] },
    },
  });
};

exports.calcularPrimerosPagos = (nuevosDeudores) => {
  return nuevosDeudores.reduce(
    (sum, deudor) => sum + parseFloat(deudor.first_payment || 0),
    0
  );
};

exports.calcularCreditosTotales = (nuevosDeudores) => {
  return nuevosDeudores.reduce(
    (sum, deudor) => sum + parseFloat(deudor.amount || 0),
    0
  );
};

exports.obtenerDeudoresNoPagaron = (deudoresTotales, deudoresPagaron) => {
  return Math.max(0, deudoresTotales.length - deudoresPagaron.length);
};
