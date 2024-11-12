// models/paymentModel.js
const { DataTypes } = require("sequelize");
const db = require("../db");

const Payment = db.define(
  "Payment",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    debtor_id: {
      // Campo de clave foránea
      type: DataTypes.INTEGER,
      references: {
        model: "Debtors",
        key: "id",
      },
    },
    payment_date: {
      // Fecha de pago
      type: DataTypes.DATE,
      allowNull: false,
    },
    payment_amount: {
      // Monto del pago
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
  },
  {
    tableName: "Payments",
    timestamps: false,
  }
);

module.exports = Payment;
