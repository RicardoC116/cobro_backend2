// creHistorialCreditoModel

const { DataTypes } = require('sequelize');
const db = require('../db');

const HistorialCredito = db.define('HistorialCredito', {
    collectorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'cobradores',
            key: 'id'
        }
    },
    debtorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'deudores',
            key: 'id'
        }
    },
    creditDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    }
}, {
    tableName: 'historial_creditos',
    timestamps: false
});

module.exports = HistorialCredito;
