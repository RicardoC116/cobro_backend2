// models/corteDiario.js
const { DataTypes } = require("sequelize");
const db = require("../db");
const Cobrador = require("./cobradorModel"); // Asegúrate de que la ruta sea correcta

const CorteDiario = db.define("CorteDiario", {
  collector_id: {
    // Esta es la columna que actúa como clave foránea
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "Collectors",
      key: "id",
    },
  },
  total_amount: {
    // Cambiado de totalAmount a total_amount
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  collections_count: {
    // Cambiado de collectionsCount a collections_count
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  liquidations_count: {
    // Cambiado de liquidationsCount a liquidations_count
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  non_payments_count: {
    // Cambiado de nonPaymentsCount a non_payments_count
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  credits_count: {
    // Cambiado de creditsCount a credits_count
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  first_payments_total: {
    // Cambiado de firstPaymentsTotal a first_payments_total
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  corte_date: {
    // Cambiado de corteDate a corte_date
    type: DataTypes.DATE,
    allowNull: false,
  },
});

// Establecer la relación
CorteDiario.belongsTo(Cobrador, { foreignKey: "collector_id" });

module.exports = CorteDiario;
