// models/cobradorModel.js
const { DataTypes } = require("sequelize");
const db = require("../db");

const Cobrador = db.define(
  "Cobrador",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      // Cambiado de 'nombre' a 'name'
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone_number: {
      // Cambiado de 'numeroIdentificacion' a 'phone_number'
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      // Cambiado de 'contrasena' a 'password'
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "Collectors", // Asegúrate de que coincida con el nombre exacto de la tabla
    timestamps: false,
  }
);

module.exports = Cobrador;
