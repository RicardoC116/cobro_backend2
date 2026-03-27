// corteAgenteModel.js

const { DataTypes } = require("sequelize");
const db = require("../db");

const CorteAgente = db.define("CorteAgente", {
  // Esto de momento no se usa porque el corte es para varios agentes y aun no se implementa filtro por agente
  // collector_id: {
  //   type: DataTypes.INTEGER,
  //   allowNull: true,
  // },

  asignacion: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  cobranza_total: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.0,
  },

  creditos_total: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.0,
  },

  primeros_pagos_total: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.0,
  },

  gastos: {
    // Guardar como JSON: [{ nombre: 'Transporte', monto: 100.50 }, ...]
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },

  agentes: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [
      // Ejemplo de estructura:
      // {
      //   id: 1,
      //   cobranza: 1000.50,
      //   comision_cobro: 50.00,
      //   comision_ventas: 30.00,
      //   gastos: 20.00,
      //   resto: 900.50,
      // }
    ],
  },

  fecha_corte: {
    type: DataTypes.DATE,
    allowNull: false,
  },
});

module.exports = CorteAgente;
