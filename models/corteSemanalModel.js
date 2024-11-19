const { DataTypes } = require("sequelize");
const db = require("../db");

const CorteSemanal = db.define("CorteSemanal", {
  fecha_inicio: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  fecha_fin: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  deudores_cobrados: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  cobranza_total: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.0,
  },
  creditos_totales: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  montos_creditos: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.0,
  },
  primeros_pagos: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.0,
  },
  nuevos_deudores: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  comision_cobro: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.0,
  },
  comision_ventas: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.0,
  },
  gastos: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.0,
  },
  total_corte: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.0,
  },
});

module.exports = CorteSemanal;
