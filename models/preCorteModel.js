// models/preCorteModel.js

const { DataTypes } = require("sequelize");
const db = require("../db");
const Cobrador = require("./cobradorModel");

const PreCorte = db.define("PreCorte", {
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
    type: DataTypes.DATE,
    allowNull: false,
  },
  total_cobranza: {
    type: DataTypes.DECIMAL,
    allowNull: false,
    defaultValue: 0,
  },
  total_creditos: {
    type: DataTypes.DECIMAL,
    allowNull: false,
    defaultValue: 0,
  },
  total_creditos_monto: {
    type: DataTypes.DECIMAL,
    allowNull: false,
    defaultValue: 0,
  },
  total_liquidaciones: {
    type: DataTypes.DECIMAL,
    allowNull: false,
    defaultValue: 0,
  },
  total_no_pagos: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  primeros_pagos: {
    type: DataTypes.DECIMAL,
    allowNull: false,
    defaultValue: 0,
  },
});

module.exports = PreCorte;
