// controllers/deudoresController.js
const Deudor = require("../models/deudorModel");
const Cobrador = require("../models/cobradorModel");
const { Op } = require("sequelize");
const Cobro = require("../models/cobroModel");
const Contrato = require("../models/contratoModel");

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

// Cambiar de cobrador a un deudor
exports.cambiarCobrador = async (req, res) => {
  const { contractNumber, newCollectorId } = req.body;

  try {
    // Validar si el deudor existe por su número de contrato
    const deudor = await Deudor.findOne({
      where: { contract_number: contractNumber },
    });
    if (!deudor) {
      return res.status(404).json({ message: "Cliente no encontrado." });
    }

    // Validar si el nuevo cobrador existe por su ID
    const nuevoCobrador = await Cobrador.findByPk(newCollectorId);
    if (!nuevoCobrador) {
      return res.status(404).json({ message: "Nuevo cobrador no encontrado." });
    }

    // Actualizar el cobrador del deudor
    deudor.collector_id = newCollectorId;
    await deudor.save();

    // Actualizar el cobrador en todos los cobros relacionados al deudor
    await Cobro.update(
      { collector_id: newCollectorId }, // Nuevo collector_id
      { where: { debtor_id: deudor.id } } // Condición para actualizar
    );

    // Actualizar el cobrador en el contrato relacionado al deudor
    await Contrato.update(
      { cobrador_id: newCollectorId }, // Nuevo cobrador_id
      { where: { deudor_id: deudor.id } } // Condición para actualizar
    );

    res.status(200).json({
      message:
        "El cliente, sus cobros y su contrato han sido actualizados con el nuevo cobrador.",
      deudor,
    });
  } catch (error) {
    console.error("Error al cambiar de cobrador:", error);
    res
      .status(500)
      .json({ message: "Error al cambiar de cobrador.", error: error.message });
  }
};

// Renovar contrato del deudor
exports.renovarContratoDeudor = async (req, res) => {
  const { deudorId, nuevoMonto, nuevoTotalAPagar, nuevoPrimerPago } = req.body;

  try {
    // Verificar que el deudor existe
    const deudor = await Deudor.findByPk(deudorId);
    if (!deudor) {
      return res.status(404).json({ error: "Deudor no encontrado" });
    }

    // Guardar el contrato actual en la tabla de contratos
    await Contrato.create({
      deudor_id: deudor.id,
      contract_number: deudor.contract_number,
      cobrador_id: deudor.collector_id,
      nombre_deudor: deudor.name,
      amount: deudor.amount,
      total_to_pay: deudor.total_to_pay,
      first_payment: deudor.first_payment,
      balance: deudor.balance,
      payment_type: deudor.payment_type,
      fecha_inicio: deudor.createdAt,
      fecha_fin: deudor.contract_end_date,
    });

    // Actualizar los datos del deudor con el nuevo contrato
    deudor.amount = nuevoMonto;
    deudor.total_to_pay = nuevoTotalAPagar;
    deudor.first_payment = nuevoPrimerPago;
    deudor.balance = nuevoTotalAPagar - nuevoPrimerPago;
    deudor.renovaciones = (deudor.renovaciones || 0) + 1; // Incrementar renovaciones
    await deudor.save();

    res.json({
      message: "Contrato renovado con éxito",
      deudorActualizado: deudor,
    });
  } catch (error) {
    console.error("Error al renovar contrato:", error);
    res.status(500).json({ error: "Error al renovar contrato" });
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

// Obtener contrato por ID
exports.geContratoById = async (req, res) => {
  const { deudorId } = req.params;
  try {
    const contrato = await Contrato.findAll({
      where: { deudor_id: deudorId },
    });
    if (!contrato) {
      return res.status(404).json({ error: "Contrato no encontrado" });
    }
    res.json(contrato);
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
