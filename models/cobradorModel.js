// models/collectorModel.js

const { DataTypes } = require("sequelize");
const db = require("../db");

const Cobrador = db.define(
  "Cobrador",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "collectors",
    timestamps: false,
  }
);

module.exports = Cobrador;
