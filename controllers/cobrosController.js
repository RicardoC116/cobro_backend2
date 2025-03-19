const { DateTime } = require("luxon");
const moment = require("moment-timezone");
const Cobro = require("../models/cobroModel");
const Cobrador = require("../models/cobradorModel");
const Deudor = require("../models/deudorModel");

const { Op } = require("sequelize");

// Función para obtener el inicio y fin del día para una fecha dada en la zona horaria de México
function obtenerRangoDiaPorFecha(fecha) {
  const fechaMoment = moment.tz(fecha, "America/Mexico_City");
  const inicio = fechaMoment
    .clone()
    .startOf("day")
    .format("YYYY-MM-DD HH:mm:ss");
  const fin = fechaMoment.clone().endOf("day").format("YYYY-MM-DD HH:mm:ss");
  return { inicio, fin };
}

function obtenerRangoDiaPorFechaEnUTC(fecha) {
  // Convertir la fecha a la zona horaria de México
  const fechaMexico = moment.tz(fecha, "YYYY-MM-DD", "America/Mexico_City");

  // Obtener el inicio y fin del día en México
  const inicioLocal = fechaMexico.clone().startOf("day");
  const finLocal = fechaMexico.clone().endOf("day");

  // Convertir a UTC
  const inicioUTC = inicioLocal.clone().utc().format("YYYY-MM-DD HH:mm:ss");
  const finUTC = finLocal.clone().utc().format("YYYY-MM-DD HH:mm:ss");

  return { inicio: inicioUTC, fin: finUTC };
}

// Agregar esta función en el controller
function obtenerRangoSemanaPorFechaEnUTC(fecha) {
  const fechaMexico = moment.tz(fecha, "YYYY-MM-DD", "America/Mexico_City");

  // Encontrar el miércoles de la semana de la fecha dada
  let inicioLocal = fechaMexico.clone().day(4).startOf("day"); // 4 = jueves
  // let inicioLocal = fechaMexico.clone().day(3); // 3 = miércoles

  // Si el miércoles encontrado es posterior a la fecha o es el mismo día (miércoles), restar una semana
  // if (
  //   inicioLocal.isAfter(fechaMexico) ||
  //   inicioLocal.isSame(fechaMexico, "day")
  // ) {
  //   inicioLocal.subtract(1, "week");
  // }

  if (inicioLocal.isAfter(fechaMexico)) {
    inicioLocal.subtract(1, "week");
  }

  // Calcular el fin como inicio + 1 semana al final del día
  // let finLocal = inicioLocal.clone().add(1, "week").endOf("day");

  let finLocal = inicioLocal.clone().add(6, "days").endOf("day");

  // Ajustar inicio al comienzo del día
  // inicioLocal.startOf("day");

  // Convertir a UTC
  return {
    inicio: inicioLocal.utc().format("YYYY-MM-DD HH:mm:ss"),
    fin: finLocal.utc().format("YYYY-MM-DD HH:mm:ss"),
  };
}

// Funcion para buscar cobros de la semana (Lunes a Domingo) de un cobrador
function obtenerRangoSemanaLunesADomingo(fecha) {
  const fechaMexico = moment.tz(fecha, "YYYY-MM-DD", "America/Mexico_City");

  // Encontrar el lunes de la semana de la fecha dada
  let inicioLocal = fechaMexico.clone().startOf("isoWeek");

  // Calcular el fin de la semana
  let finLocal = inicioLocal.clone().endOf("isoWeek");

  // Convertir a UTC
  return {
    inicio: inicioLocal.utc().format("YYYY-MM-DD HH:mm:ss"),
    fin: finLocal.utc().format("YYYY-MM-DD HH:mm:ss"),
  };
}

// Registrar un cobro
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

    // Convertir la fecha a la zona horaria de México
    const paymentDateFinal = payment_date
      ? DateTime.fromISO(payment_date, {
          zone: "America/Mexico_City",
        }).toJSDate()
      : DateTime.now().setZone("America/Mexico_City").toJSDate();

    const nuevoBalance = deudor.balance - amount;
    const payment_type = nuevoBalance === 0 ? "liquidación" : "normal";

    const nuevoCobro = await Cobro.create({
      collector_id,
      debtor_id,
      amount,
      payment_date: paymentDateFinal,
      payment_type,
    });

    deudor.balance = nuevoBalance;

    // Registrar la fecha de finalización si el balance llega a 0
    if (nuevoBalance === 0) {
      deudor.contract_end_date = DateTime.now()
        .setZone("America/Mexico_City")
        .toJSDate();
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

exports.obtenerCobrosPorDiaEId = async (req, res) => {
  try {
    const { fecha, collector_id } = req.query;
    if (!fecha || !collector_id) {
      return res
        .status(400)
        .json({ message: "Se requiere una fecha y el ID del cobrador." });
    }

    // Usamos la nueva funcion que se creo
    const { inicio, fin } = obtenerRangoDiaPorFechaEnUTC(fecha);

    console.log(
      "Buscando cobros entre:",
      inicio,
      "y",
      fin,
      "para collector_id:",
      collector_id
    );

    // Consulta a la base de datos con el rango obtenido y filtrando por collector_id
    const cobros = await Cobro.findAll({
      where: {
        collector_id,
        payment_date: {
          [Op.between]: [inicio, fin],
        },
      },
    });

    res.json({ cobros });
  } catch (error) {
    console.error("Error al obtener los cobros:", error);
    res.status(500).json({ message: "Error al obtener los cobros." });
  }
};

exports.obtenerCobrosPorSemanaEId = async (req, res) => {
  try {
    const { fecha, collector_id } = req.query;
    if (!fecha || !collector_id) {
      return res.status(400).json({
        message: "Se requiere una fecha y el ID del cobrador.",
      });
    }

    // Obtener rango semanal (miércoles a miércoles)
    const { inicio, fin } = obtenerRangoSemanaPorFechaEnUTC(fecha);

    console.log(
      "Buscando cobros entre:",
      inicio,
      "y",
      fin,
      "para collector_id:",
      collector_id
    );

    // Consulta a la base de datos
    const cobros = await Cobro.findAll({
      where: {
        collector_id,
        payment_date: {
          [Op.between]: [inicio, fin],
        },
      },
    });

    res.json({ cobros });
  } catch (error) {
    console.error("Error al obtener los cobros:", error);
    res.status(500).json({ message: "Error al obtener los cobros." });
  }
};

exports.obtenerCobrosPorSemanaSinId = async (req, res) => {
  try {
    const { fecha } = req.query;
    if (!fecha) {
      return res.status(400).json({
        message: "Se requiere una fecha y el ID del cobrador.",
      });
    }

    // Obtener rango semanal (miércoles a miércoles)
    const { inicio, fin } = obtenerRangoSemanaPorFechaEnUTC(fecha);

    console.log("Buscando cobros entre:", inicio, "y", fin);

    // Consulta a la base de datos
    const cobros = await Cobro.findAll({
      where: {
        payment_date: {
          [Op.between]: [inicio, fin],
        },
      },
    });

    res.json({ cobros });
  } catch (error) {
    console.error("Error al obtener los cobros:", error);
    res.status(500).json({ message: "Error al obtener los cobros." });
  }
};

// Obtener cobros por semana (Lunes a domingo) sin ID
exports.obtenerCobrosPorSemanaLunesADomingo = async (req, res) => {
  try {
    const { fecha } = req.query;
    if (!fecha) {
      return res.status(400).json({
        message: "Se requiere una fecha.",
      });
    }

    // Obtener rango semanal (lunes a domingo)
    const { inicio, fin } = obtenerRangoSemanaLunesADomingo(fecha);
    console.log(
      "Buscando cobros entre:",
      inicio,
      "y",
      fin,
      "para collector_id:"
    );

    // Consulta a la base de datos
    const cobros = await Cobro.findAll({
      where: {
        payment_date: {
          [Op.between]: [inicio, fin],
        },
      },
    });

    res.json({ cobros });
  } catch (error) {
    console.error("Error al obtener los cobros:", error);
    res.status(500).json({ message: "Error al obtener los cobros." });
  }
};

// Obtener cobros por semana (Lunes a domingo) con ID
exports.obtenerCobrosPorSemanaLunesADomingoID = async (req, res) => {
  try {
    const { fecha, collector_id } = req.query;
    if (!fecha || !collector_id) {
      return res.status(400).json({
        message: "Se requiere una fecha y el ID del cobrador.",
      });
    }

    // Obtener rango semanal (lunes a domingo)
    const { inicio, fin } = obtenerRangoSemanaLunesADomingo(fecha);
    console.log(
      "Buscando cobros entre:",
      inicio,
      "y",
      fin,
      "para collector_id:",
      collector_id
    );

    // Consulta a la base de datos
    const cobros = await Cobro.findAll({
      where: {
        collector_id,
        payment_date: {
          [Op.between]: [inicio, fin],
        },
      },
    });

    res.json({ cobros });
  } catch (error) {
    console.error("Error al obtener los cobros:", error);
    res.status(500).json({ message: "Error al obtener los cobros." });
  }
};

exports.obtenerCobrosPorDia = async (req, res) => {
  try {
    const { fecha } = req.query;
    if (!fecha) {
      return res.status(400).json({ message: "Se requiere una fecha." });
    }

    // Obtenemos el rango (inicio y fin) para la fecha dada en zona México
    const { inicio, fin } = obtenerRangoDiaPorFechaEnUTC(fecha);

    console.log("Buscando cobros entre:", inicio, "y", fin);

    // Consulta a la base de datos con el rango obtenido
    const cobros = await Cobro.findAll({
      where: {
        payment_date: {
          [Op.between]: [inicio, fin],
        },
      },
    });

    res.json({ cobros });
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
