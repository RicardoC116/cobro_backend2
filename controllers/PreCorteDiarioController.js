const moment = require("moment-timezone");
const PreCorteDiario = require("../models/PreCorteDiarioModel");
const deudoresController = require("./deudoresControllers");
const cobrosController = require("./cobrosController");
const { Op } = require("sequelize");
const CorteDiario = require("../models/corteDiarioModel");
const Cobrador = require("../models/cobradorModel");

// Función para ajustar fecha a zona horaria de México y luego convertirla a UTC
function ajustarFechaMexico(fecha, inicioDelDia = true) {
  return inicioDelDia
    ? moment.tz(fecha, "America/Mexico_City").startOf("day").utc().format()
    : moment.tz(fecha, "America/Mexico_City").endOf("day").utc().format();
}

exports.registrarPreCorte = async (req, res) => {
  const { collector_id, ventanilla_id, agente, fecha } = req.body;

  if (!collector_id || !ventanilla_id || !agente) {
    return res
      .status(400)
      .json({ error: "Todos los campos son obligatorios." });
  }

  try {
    const fechaBase = fecha ? new Date(fecha) : new Date();
    const fechaInicioHoy = ajustarFechaMexico(fechaBase, true);
    const fechaFin = ajustarFechaMexico(fechaBase, false);

    console.log("Fecha Inicio del Día (UTC):", fechaInicioHoy);
    console.log("Fecha Fin del Día (UTC):", fechaFin);

    // **Obtener el último pre-corte del día**
    const ultimoPreCorte = await PreCorteDiario.findOne({
      where: {
        collector_id,
        fecha: { [Op.between]: [fechaInicioHoy, fechaFin] },
      },
      order: [["fecha", "DESC"]],
    });

    let fechaInicio;

    if (ultimoPreCorte) {
      fechaInicio = new Date(ultimoPreCorte.fecha);
      console.log("Último Pre-Corte encontrado (UTC):", fechaInicio);
    } else {
      // **Buscar el último corte diario si no hay pre-cortes**
      const ultimoCorteDiario = await CorteDiario.findOne({
        where: { collector_id },
        order: [["fecha", "DESC"]],
      });

      if (ultimoCorteDiario) {
        fechaInicio = new Date(ultimoCorteDiario.fecha);
        console.log(
          "Usando la fecha del último Corte Diario (UTC):",
          fechaInicio
        );
      } else {
        // **Si no hay cortes, buscar la fecha de creación del cobrador**
        const cobrador = await Cobrador.findOne({
          where: { id: collector_id },
          attributes: ["createdAt"],
        });

        if (cobrador) {
          fechaInicio = new Date(cobrador.createdAt);
          console.log(
            "Usando la fecha de creación del cobrador (UTC):",
            fechaInicio
          );
        } else {
          console.error("No se encontró el cobrador.");
          return res.status(404).json({ error: "Cobrador no encontrado." });
        }
      }
    }

    // **Obtener cobros desde la fecha de inicio hasta el fin del día**
    const cobros = await cobrosController.obtenerCobrosEnRango(
      collector_id,
      fechaInicio,
      fechaFin
    );

    // **Obtener deudores que pagaron**
    const deudoresCobros = Array.from(new Set(cobros.map((c) => c.debtor_id)));

    // **Obtener nuevos deudores desde la fecha de inicio**
    const nuevosDeudores = await deudoresController.obtenerNuevosDeudores(
      collector_id,
      fechaInicio,
      fechaFin
    );
    const primerosPagosMontos =
      deudoresController.calcularPrimerosPagos(nuevosDeudores);
    const deudoresPrimerosPagos = nuevosDeudores.map((d) => d.id);

    // **Unificar deudores que pagaron**
    const deudoresPagaron = Array.from(
      new Set([...deudoresCobros, ...deudoresPrimerosPagos])
    );

    // **Calcular estadísticas**
    const cobranzaTotal = cobrosController.calcularCobranzaTotal(cobros) || 0;
    const liquidaciones = cobrosController.calcularLiquidaciones(cobros) || {
      total: 0,
      deudoresLiquidados: [],
    };

    const deudoresActivos = await deudoresController.obtenerDeudoresActivos(
      collector_id
    );
    const noPagosTotal =
      deudoresController.obtenerDeudoresNoPagaron(
        deudoresActivos,
        deudoresPagaron
      ) || 0;

    // **Guardar el pre-corte**
    const preCorteData = {
      collector_id,
      ventanilla_id,
      agente,
      fecha: moment().utc().format(), // Guardar en UTC
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
      deudores_totales: deudoresActivos.length || 0,
    };

    console.log("Datos a guardar en PreCorteDiario:", preCorteData);

    // **Crear el registro de pre-corte**
    const preCorte = await PreCorteDiario.create(preCorteData);

    res
      .status(201)
      .json({ message: "Pre-Corte registrado exitosamente.", preCorte });
  } catch (error) {
    console.error("Error al registrar el pre-corte:", error);
    res.status(500).json({
      error: "Error al registrar el pre-corte.",
      detalle: error.message,
    });
  }
};

exports.obtenerPreCorte = async (req, res) => {
  try {
    const { id } = req.params;
    const preCortes = await PreCorteDiario.findAll({
      where: { collector_id: id },
    });

    // Convertir fechas de UTC a zona horaria de México antes de enviarlas
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

// Eliminar un corte por su ID
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
