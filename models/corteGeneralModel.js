// models/corteGeneralModel.js
const { DataTypes } = require("sequelize");
const db = require("../db");

const CorteGeneral = db.define(
  "CorteGeneral",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    semana_inicio: {
      type: DataTypes.DATE,
      allowNull: false,
      unique: true,
    },
    semana_fin: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    asignacion_anterior: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    total_agentes: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    total_creditos: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    total_primeros_pagos: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    total_gastos_agentes: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    total_gastos_agencia: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    total_movimientos_capital: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    total_general: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    es_primera_semana: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    confirmado_por: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "cortes_generales",
    timestamps: true,
  },
);

module.exports = CorteGeneral;
