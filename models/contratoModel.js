// models/contratoModel.js
const { DataTypes } = require("sequelize");
const db = require("../db");
const Deudor = require("./deudorModel");
const Cobrador = require("./cobradorModel");

const Contrato = db.define(
  "Contrato",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    deudor_id: {
      type: DataTypes.INTEGER,
      references: {
        model: Deudor,
        key: "id",
      },
    },
    cobrador_id: {
      type: DataTypes.INTEGER,
      references: {
        model: Cobrador,
        key: "id",
      },
    },
    contract_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    nombre_deudor: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    total_to_pay: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    first_payment: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    balance: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    payment_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fecha_inicio: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    fecha_fin: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "contratos",
    timestamps: true,
  }
);

module.exports = Contrato;
