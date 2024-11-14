// models/cobroModel.js

const { DataTypes } = require("sequelize");
const db = require("../db");
const Cobrador = require("./cobradorModel");
const Deudor = require("./deudorModel");

const Cobro = db.define(
  "Cobro",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    collector_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Cobrador,
        key: "id",
      },
    },
    debtor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Deudor,
        key: "id",
      },
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    payment_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    payment_type: {
      type: DataTypes.ENUM("normal", "liquidación", "primer pago"),
      allowNull: false,
    },
  },
  {
    tableName: "cobros",
    timestamps: false, // Desactivar los timestamps si no los necesitas
  }
);

module.exports = Cobro;
