// models/deudorModel.js
const { DataTypes } = require("sequelize");
const db = require("../db");

const Deudor = db.define(
  "Deudor",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    contract_number: {
      // Cambiado de 'numeroContrato' a 'contract_number'
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    name: {
      // Cambiado de 'nombre' a 'name'
      type: DataTypes.STRING,
      allowNull: false,
    },
    amount: {
      // Cambiado de 'montoOtorgado' a 'amount'
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    total_to_pay: {
      // Cambiado de 'totalAPagar' a 'total_to_pay'
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    first_payment: {
      // Cambiado de 'primerPago' a 'first_payment'
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    balance: {
      // Agregado el campo 'balance'
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    collector_id: {
      // Campo de clave foránea
      type: DataTypes.INTEGER,
      references: {
        model: "Collectors",
        key: "id",
      },
    },
    payment_type: {
      type: DataTypes.ENUM("diario", "semanal"),
      allowNull: false,
    },
  },
  {
    tableName: "Debtors",
    timestamps: false,
  }
);

module.exports = Deudor;
