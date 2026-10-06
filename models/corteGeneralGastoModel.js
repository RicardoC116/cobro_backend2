// models/corteGeneralGastoModel.js
const { DataTypes } = require("sequelize");
const db = require("../db");

const CorteGeneralGasto = db.define(
  "CorteGeneralGasto",
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
    concepto: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    monto: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
  },
  {
    tableName: "cortes_generales_gastos",
    timestamps: true,
  },
);

module.exports = CorteGeneralGasto;
