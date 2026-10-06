// models/movimientoCapitalModel.js
const { DataTypes } = require("sequelize");
const db = require("../db");

const MovimientoCapital = db.define(
  "MovimientoCapital",
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
    inversionista_nombre: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tipo: {
      type: DataTypes.ENUM("ingreso", "egreso"),
      allowNull: false,
    },
    concepto: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    monto: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
  },
  {
    tableName: "movimientos_capital",
    timestamps: true,
  },
);

module.exports = MovimientoCapital;
