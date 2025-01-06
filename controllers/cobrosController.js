// controllers/cobrosController.js
const Cobro = require("../models/cobroModel");
const Cobrador = require("../models/cobradorModel");
const Deudor = require("../models/deudorModel");

const { Op } = require("sequelize");

exports.registrarCobro = async (req, res) => {
  try {
    console.log("Datos recibidos:", req.body);

    const { collector_id, debtor_id, amount, payment_date } = req.body;

    const cobrador = await Cobrador.findByPk(collector_id);
    const deudor = await Deudor.findByPk(debtor_id);

    if (!cobrador) {
      return res.status(404).json({ message: "El cobrador no existe." });
    }
    if (!deudor) {
      return res.status(404).json({ message: "El deudor no existe." });
    }

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

    const nuevoBalance = deudor.balance - amount;
    const payment_type = nuevoBalance === 0 ? "liquidación" : "normal";

    const nuevoCobro = await Cobro.create({
      collector_id,
      debtor_id,
      amount,
      payment_date,
      payment_type,
    });

    deudor.balance = nuevoBalance;

    // Registrar la fecha de finalización si el balance llega a 0
    if (nuevoBalance === 0) {
      deudor.contract_end_date = new Date(); // Fecha actual
    }

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

// Modificar un cobro
exports.modificarCobro = async (req, res) => {
  try {
    const { cobro_id, nuevo_monto } = req.body;

    // Validar entrada
    if (!cobro_id || nuevo_monto === undefined) {
      return res.status(400).json({ message: "Faltan datos obligatorios." });
    }

    // Buscar el cobro por ID
    const cobro = await Cobro.findByPk(cobro_id);
    if (!cobro) {
      return res.status(404).json({ message: "Cobro no encontrado." });
    }

    // Buscar el deudor relacionado al cobro
    const deudor = await Deudor.findByPk(cobro.debtor_id);
    if (!deudor) {
      return res
        .status(404)
        .json({ message: "Deudor relacionado al cobro no encontrado." });
    }

    // Calcular la diferencia del monto
    const diferencia = nuevo_monto - cobro.amount;

    // Actualizar el balance del deudor
    const nuevo_balance = deudor.balance - diferencia;

    // Validar que el balance no sea negativo
    if (nuevo_balance < 0) {
      return res
        .status(400)
        .json({ message: "El nuevo monto excede el balance del deudor." });
    }

    // Determinar el nuevo tipo de pago según el balance
    const nuevo_payment_type = nuevo_balance === 0 ? "liquidación" : "normal";

    // Actualizar el cobro
    cobro.amount = nuevo_monto;
    cobro.payment_date = new Date(); // Fecha actual
    cobro.payment_type = nuevo_payment_type; // Actualizar el tipo de pago
    await cobro.save();

    // Actualizar el balance del deudor
    deudor.balance = nuevo_balance;
    await deudor.save();

    res.status(200).json({
      message: "Cobro modificado con éxito.",
      cobro,
      nuevo_balance: deudor.balance,
    });
  } catch (error) {
    console.error("Error al modificar el cobro:", error);
    res.status(500).json({
      message: "Error al modificar el cobro.",
      error: error.message,
    });
  }
};

// Eliminar un cobro
exports.eliminarCobro = async (req, res) => {
  try {
    const { cobro_id } = req.params; // Obtener cobro_id desde los parámetros

    // Validar entrada
    if (!cobro_id) {
      return res.status(400).json({ message: "Falta el ID del cobro." });
    }

    // Buscar el cobro por ID
    const cobro = await Cobro.findByPk(cobro_id);
    if (!cobro) {
      return res.status(404).json({ message: "Cobro no encontrado." });
    }

    // Buscar el deudor relacionado al cobro
    const deudor = await Deudor.findByPk(cobro.debtor_id);
    if (!deudor) {
      return res.status(404).json({
        message: "Deudor relacionado al cobro no encontrado.",
      });
    }

    // Actualizar el balance del deudor
    const nuevoBalance = (
      parseFloat(deudor.balance) + parseFloat(cobro.amount)
    ).toFixed(2);
    deudor.balance = nuevoBalance;
    await deudor.save();

    // Eliminar el cobro
    await cobro.destroy();

    return res.status(200).json({ message: "Cobro eliminado correctamente." });
  } catch (error) {
    console.error("Error al eliminar el cobro:", error);
    return res
      .status(500)
      .json({ message: "Ocurrió un error al eliminar el cobro." });
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

exports.obtenerCobrosEnRango = async (collector_id, fechaInicio, fechaFin) => {
  return await Cobro.findAll({
    where: {
      collector_id,
      createdAt: { [Op.between]: [fechaInicio, fechaFin] },
    },
  });
};

exports.calcularLiquidaciones = (cobros) => {
  const liquidaciones = cobros.filter(
    (cobro) => cobro.payment_type === "liquidación"
  );
  const montoTotal = liquidaciones.reduce(
    (sum, cobro) => sum + parseFloat(cobro.amount),
    0
  );

  return {
    total: montoTotal,
    deudoresLiquidados: liquidaciones.map((cobro) => cobro.debtor_id),
  };
};

exports.calcularCobranzaTotal = (cobros) => {
  return cobros.reduce((sum, cobro) => sum + parseFloat(cobro.amount), 0);
};
