// models/debtorModel.js

const { DataTypes } = require("sequelize");
const db = require("../db");
const Cobrador = require("./cobradorModel");

const Deudor = db.define(
  "Deudor",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    contract_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    name: {
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
      defaultValue: 0,
    },
    balance: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    collector_id: {
      type: DataTypes.INTEGER,
      references: {
        model: Cobrador,
        key: "id",
      },
    },
    payment_type: {
      type: DataTypes.ENUM("diario", "semanal"),
      allowNull: false,
    },
  },
  {
    tableName: "debtors",
    timestamps: true,
  }
);

module.exports = Deudor;
