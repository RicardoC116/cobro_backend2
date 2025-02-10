const { DataTypes } = require("sequelize");
const db = require("../db");
const Cobrador = require("./cobradorModel");

const PreCorteDiario = db.define("PreCorteDiario", {
  collector_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Cobrador,
      key: "id",
    },
    onDelete: "CASCADE",
  },

  ventanilla_id: {
    type: DataTypes.INTEGER,
    allowNull: false, // Identifica la ventanilla donde se hizo el pre-corte
  },

  agente: {
    type: DataTypes.STRING,
    allowNull: false, // Guarda el nombre del agente que hizo el pre-corte
  },

  // guardar la fecha con todo y hora
  fecha: {
    type: DataTypes.DATE,
    allowNull: false,
  },

  deudores_totales: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },

  cobranza_total: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },

  primeros_pagos_montos: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },

  deudores_cobrados: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },

  liquidaciones_total: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },

  deudores_liquidados: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },

  no_pagos_total: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },

  creditos_total: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },

  creditos_total_monto: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },

  primeros_pagos_total: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },

  nuevos_deudores: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
});

module.exports = PreCorteDiario;
