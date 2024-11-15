// corteDiarioModel

const { DataTypes } = require("sequelize");
const db = require("../db");
const Cobrador = require("./cobradorModel");

const CorteDiario = db.define("CorteDiario", {
  collector_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Cobrador,
      key: "id",
    },
    onDelete: "CASCADE",
  },
  fecha: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  cobranza_total: {
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
  primeros_pagos_total: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  nuevos_deudores: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
});

module.exports = CorteDiario;
