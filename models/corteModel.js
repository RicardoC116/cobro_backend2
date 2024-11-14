// cortesModel

// const { DataTypes } = require("sequelize");
// const db = require("../db");

// const CorteDiario = db.define(
//   "CorteDiario",
//   {
//     collector_id: {
//       type: DataTypes.INTEGER,
//       allowNull: false,
//       references: {
//         model: "Collectors",
//         key: "id",
//       },
//     },

//     date: {
//       type: DataTypes.DATE,
//       allowNull: false,
//     },
//     totalCobranza: {
//       type: DataTypes.DECIMAL(10, 2),
//       defaultValue: 0,
//     },
//     totalLiquidaciones: {
//       type: DataTypes.DECIMAL(10, 2),
//       defaultValue: 0,
//     },
//     totalPrimerosPagos: {
//       type: DataTypes.DECIMAL(10, 2),
//       defaultValue: 0,
//     },
//     totalNoPagos: {
//       type: DataTypes.INTEGER,
//       defaultValue: 0,
//     },
//   },
//   {
//     tableName: "cortediarios",
//     timestamps: false,
//   }
// );

// module.exports = CorteDiario;
