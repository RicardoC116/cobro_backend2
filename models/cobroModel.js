// models/cobroModel.js
const { DataTypes } = require("sequelize");
const db = require("../db");

const Cobro = db.define(
  "Cobro",
  {
    collector_Id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "cobradores",
        key: "id",
      },
      field: "collector_id",
    },
    debtor_Id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "deudores",
        key: "id",
      },
      field: "debtor_id",
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    payment_Date: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "payment_date",
    },
    payment_Type: {
      type: DataTypes.ENUM("normal", "liquidación", "primer pago"),
      allowNull: false,
      field: "payment_type",
    },
  },
  {
    tableName: "cobros",
    timestamps: false,
  }
);

module.exports = Cobro;
