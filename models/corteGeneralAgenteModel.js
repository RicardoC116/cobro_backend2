// models/corteGeneralAgenteModel.js
const { DataTypes } = require("sequelize");
const db = require("../db");

const CorteGeneralAgente = db.define(
  "CorteGeneralAgente",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    corte_general_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    collector_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    collector_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cobranza: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    comision_cobro: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    comision_ventas: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    gastos: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    total: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    creditos_monto: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    primeros_pagos_monto: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
  },
  {
    tableName: "cortes_generales_agentes",
    timestamps: true,
  },
);

module.exports = CorteGeneralAgente;
