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
      allowNull: true,
      defaultValue: null,
    },
    balance: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null,
    },
    numero_telefono: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    suggested_payment: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null,
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
    renovaciones: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: true,
    },
    contract_end_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    aval: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    aval_phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    direccion: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    aval_direccion: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "debtors",
    timestamps: true,
  }
);

module.exports = Deudor;
