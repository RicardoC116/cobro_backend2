const moment = require("moment-timezone");
const { Op } = require("sequelize");
const PreCorteDiario = require("../models/PreCorteDiarioModel");
const deudoresController = require("./deudoresControllers");
const cobrosController = require("./cobrosController");
const CorteDiario = require("../models/corteDiarioModel");
const Cobrador = require("../models/cobradorModel");
const Deudor = require("../models/deudorModel");

// Función para obtener el inicio y fin del día en hora local (America/Mexico_City)
function obtenerRangoDiaActualLocal() {
  const ahora = moment().tz("America/Mexico_City");
  const fechaInicioLocal = ahora.clone().startOf("day"); // objeto moment
  const fechaFinLocal = ahora.clone().endOf("day"); // objeto moment
  return { fechaInicioLocal, fechaFinLocal };
}

exports.registrarPreCorte = async (req, res) => {
  const { collector_id, ventanilla_id, agente } = req.body;

  if (!collector_id || !ventanilla_id || !agente) {
    return res
      .status(400)
      .json({ error: "Todos los campos son obligatorios." });
  }

  try {
    // 1. Obtenemos el rango del día en hora local
    const { fechaInicioLocal, fechaFinLocal } = obtenerRangoDiaActualLocal();

    // 2. Convertimos ese rango a UTC para usar en las consultas (ya que la BD almacena en UTC)
    const fechaInicioUTC = fechaInicioLocal
      .clone()
      .utc()
      .format("YYYY-MM-DD HH:mm:ss");
    // Usamos el momento actual en hora local para definir el límite actual, y luego lo convertimos a UTC:
    const ahoraLocal = moment().tz("America/Mexico_City");
    const fechaActualUTC = ahoraLocal
      .clone()
      .utc()
      .format("YYYY-MM-DD HH:mm:ss");

    console.log(
      "📆 Rango Local: Inicio:",
      fechaInicioLocal.format("YYYY-MM-DD HH:mm:ss"),
      "Fin:",
      fechaFinLocal.format("YYYY-MM-DD HH:mm:ss")
    );
    console.log(
      "📆 Rango UTC: Inicio:",
      fechaInicioUTC,
      "Actual:",
      fechaActualUTC
    );

    // 3. Buscar el último pre-corte del día usando el rango UTC
    const ultimoPreCorte = await PreCorteDiario.findOne({
      where: {
        collector_id,
        fecha: {
          [Op.between]: [fechaInicioUTC, fechaActualUTC],
        },
      },
      order: [["fecha", "DESC"]],
    });

    let fechaConsultaUTC;
    if (ultimoPreCorte) {
      // Convertimos la fecha del último pre-corte a momento local, le sumamos 1 segundo, y luego la convertimos a UTC
      fechaConsultaUTC = moment(ultimoPreCorte.fecha)
        .tz("America/Mexico_City")
        .add(1, "second")
        .utc()
        .format("YYYY-MM-DD HH:mm:ss");
      console.log(
        "Último Pre-Corte encontrado. Se consultarán datos desde (UTC):",
        fechaConsultaUTC
      );
    } else {
      // Si no hay pre-corte hoy, usamos el inicio del día en UTC
      fechaConsultaUTC = fechaInicioUTC;
      console.log(
        "No se encontró pre-corte hoy. Se consultarán datos desde (UTC) el inicio del día:",
        fechaConsultaUTC
      );
    }

    // 4. Consultar cobros y deudores usando los límites en UTC
    const cobros = await cobrosController.obtenerCobrosEnRango(
      collector_id,
      fechaConsultaUTC,
      fechaActualUTC
    );

    const deudoresCobros = Array.from(new Set(cobros.map((c) => c.debtor_id)));

    const nuevosDeudores = await deudoresController.obtenerNuevosDeudores(
      collector_id,
      fechaConsultaUTC,
      fechaActualUTC
    );
    const primerosPagosMontos =
      deudoresController.calcularPrimerosPagos(nuevosDeudores);
    const deudoresPrimerosPagos = nuevosDeudores.map((d) => d.id);

    const deudoresPagaron = Array.from(
      new Set([...deudoresCobros, ...deudoresPrimerosPagos])
    );

    const cobranzaTotal = cobrosController.calcularCobranzaTotal(cobros) || 0;
    const liquidaciones = cobrosController.calcularLiquidaciones(cobros) || {
      total: 0,
      deudoresLiquidados: [],
    };

    const deudoresActivos = await Deudor.count({ where: { collector_id } });
    const noPagosTotal =
      deudoresController.obtenerDeudoresNoPagaron(
        deudoresActivos,
        deudoresPagaron
      ) || 0;

    // 5. Guardar el pre-corte.
    // Como queremos guardar la fecha con hora, usamos el valor actual convertido a UTC.
    const preCorteData = {
      collector_id,
      ventanilla_id,
      agente,
      fecha: fechaActualUTC, // Se guarda en UTC
      cobranza_total: cobranzaTotal,
      deudores_cobrados: deudoresPagaron.length || 0,
      liquidaciones_total: liquidaciones.total || 0,
      deudores_liquidados: liquidaciones.deudoresLiquidados.length || 0,
      no_pagos_total: noPagosTotal || 0,
      creditos_total: nuevosDeudores.length || 0,
      creditos_total_monto:
        deudoresController.calcularCreditosTotales(nuevosDeudores) || 0,
      primeros_pagos_total: deudoresPrimerosPagos.length || 0,
      primeros_pagos_montos: primerosPagosMontos || 0,
      nuevos_deudores: nuevosDeudores.length || 0,
      deudores_totales: deudoresActivos || 0,
    };

    await PreCorteDiario.create(preCorteData);
    console.log("Pre-corte registrado exitosamente.", preCorteData);
    res.status(201).json({ message: "Pre-corte registrado exitosamente." });
  } catch (error) {
    console.error("Error al registrar el pre-corte:", error);
    res.status(500).json({ error: "Error al registrar el pre-corte." });
  }
};

exports.obtenerPreCorte = async (req, res) => {
  try {
    const { id } = req.params;
    const preCortes = await PreCorteDiario.findAll({
      where: { collector_id: id },
    });

    // Convertir fechas de UTC a la zona horaria de México antes de enviarlas
    const preCortesAjustados = preCortes.map((preCorte) => ({
      ...preCorte.toJSON(),
      fecha: moment.utc(preCorte.fecha).tz("America/Mexico_City").format(),
    }));

    res.json(preCortesAjustados);
  } catch (error) {
    console.error("Error al obtener los Pre-Cortes por cobrador:", error);
    res
      .status(500)
      .json({ message: "Error al obtener los cobros por cobrador." });
  }
};

exports.deletePreCorte = async (req, res) => {
  const { id } = req.params;
  try {
    const preCorte = await PreCorteDiario.findByPk(id);
    if (!preCorte) {
      return res.status(404).json({ error: "Pre-corte no encontrado" });
    }
    await preCorte.destroy();
    res.json({ message: "Pre-corte eliminado exitosamente" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
