const { DataTypes } = require("sequelize");
const db = require("../db");

const CorteSemanal = db.define("CorteSemanal", {
  collector_id: {
    type: DataTypes.INTEGER,
    allowNull: false, // o true si no es obligatorio
  },
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
  creditos_total: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  liquidaciones_total: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.0,
  },
  creditos_total_monto: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.0,
  },
  primeros_pagos_total: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.0,
  },
  primeros_pagos_Monto: {
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
  total_ingreso: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.0,
  },
  total_gasto: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.0,
  },

  saldo_final: {
    // Cambia de "total_corte" a "saldo_final" para coincidir
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.0,
  },
});

module.exports = CorteSemanal;
