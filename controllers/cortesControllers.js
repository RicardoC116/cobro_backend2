// cortesControllers

const CorteDiario = require("../models/corteModel");
const Deudor = require("../models/deudorModel"); // Para manejar los deudores

exports.obtenerCortesDiarios = async (req, res) => {
  try {
    const { collector_id, fechaInicio, fechaFin } = req.query;

    if (
      (fechaInicio && isNaN(new Date(fechaInicio))) ||
      (fechaFin && isNaN(new Date(fechaFin)))
    ) {
      return res.status(400).json({ message: "Las fechas no son válidas" });
    }
    if ((fechaInicio && !fechaFin) || (!fechaInicio && fechaFin)) {
      return res
        .status(400)
        .json({ message: "Debe proporcionar ambas fechas" });
    }

    const where = {};
    if (collector_id) {
      where.collector_id = collector_id;
    }
    if (fechaInicio && fechaFin) {
      where.date = {
        [Op.between]: [new Date(fechaInicio), new Date(fechaFin)],
      };
    }

    const cortes = await CorteDiario.findAll({ where });
    res.status(200).json(cortes);
  } catch (error) {
    console.error("Error al obtener los cortes diarios:", error);
    res.status(500).json({ message: "Error al obtener los cortes diarios" });
  }
};

exports.registrarEnCorteDiario = async ({
  collector_id,
  debtor_id,
  amount,
  payment_Type,
  payment_Date,
}) => {
  try {
    // Validar el tipo de pago
    const tiposValidos = ["normal", "liquidación", "primer pago"];
    if (!tiposValidos.includes(payment_Type)) {
      throw new Error(`Tipo de pago inválido: ${payment_Type}`);
    }

    // Buscar o crear el corte diario
    const [corteDiario, created] = await CorteDiario.findOrCreate({
      where: {
        collector_id,
        date: payment_Date,
      },
      defaults: {
        collector_id,
        date: payment_Date,
        totalCobranza: 0,
        totalLiquidaciones: 0,
        totalPrimerosPagos: 0,
        totalNoPagos: 0,
      },
    });

    // Actualizar totales según el tipo de pago
    if (payment_Type === "normal") {
      corteDiario.totalCobranza += amount;
    } else if (payment_Type === "liquidación") {
      corteDiario.totalLiquidaciones += amount;
    } else if (payment_Type === "primer pago") {
      corteDiario.totalPrimerosPagos += amount;
    }

    // Verificar deudores que no han pagado (solo para esta fecha)
    const deudoresSinPago = await Deudor.findAll({
      where: {
        balance: { [Op.gt]: 0 },
        collector_id,
        updatedAt: {
          [Op.lt]: new Date(payment_Date).toISOString(),
        },
      },
    });

    // Actualizar "no pagos" en el corte diario
    corteDiario.totalNoPagos = deudoresSinPago.length;

    // Guardar cambios
    await corteDiario.save();
    return { success: true, corteDiario };
  } catch (error) {
    console.error("Error al registrar en el corte diario:", error);
    return { success: false, error: error.message };
  }
};

exports.obtenerNoPagos = async (req, res) => {
  try {
    const { collector_id, date } = req.query;

    if (!collector_id || !date) {
      return res
        .status(400)
        .json({ message: "Collector_id y date son requeridos" });
    }

    const deudoresSinPago = await Deudor.findAll({
      where: {
        balance: { [Op.gt]: 0 }, // Tienen saldo pendiente
        collector_id,
      },
      attributes: ["id", "name", "balance"], // Seleccionar solo campos relevantes
    });

    res.status(200).json(deudoresSinPago);
  } catch (error) {
    console.error("Error al obtener no pagos:", error);
    res.status(500).json({ message: "Error al obtener no pagos" });
  }
};
