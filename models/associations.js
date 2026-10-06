// models/associations.js

const CorteGeneral = require("./corteGeneralModel");
const CorteGeneralAgente = require("./corteGeneralAgenteModel");
const CorteGeneralGasto = require("./corteGeneralGastoModel");
const MovimientoCapital = require("./movimientoCapitalModel");
const CorteSemanal = require("./corteSemanalModel");
const Cobrador = require("./cobradorModel");

// ----- CorteGeneral ↔ hijos -----
CorteGeneral.hasMany(CorteGeneralAgente, {
  foreignKey: "corte_general_id",
  as: "agentes",
  onDelete: "CASCADE",
});
CorteGeneralAgente.belongsTo(CorteGeneral, { foreignKey: "corte_general_id" });

CorteGeneral.hasMany(CorteGeneralGasto, {
  foreignKey: "corte_general_id",
  as: "gastosAgencia",
  onDelete: "CASCADE",
});
CorteGeneralGasto.belongsTo(CorteGeneral, { foreignKey: "corte_general_id" });

CorteGeneral.hasMany(MovimientoCapital, {
  foreignKey: "corte_general_id",
  as: "movimientosCapital",
  onDelete: "CASCADE",
});
MovimientoCapital.belongsTo(CorteGeneral, { foreignKey: "corte_general_id" });

// ----- CorteSemanal ↔ Cobrador -----
Cobrador.hasMany(CorteSemanal, {
  foreignKey: "collector_id",
  as: "cortesSemanales",
});
CorteSemanal.belongsTo(Cobrador, {
  foreignKey: "collector_id",
  as: "collector",
});

module.exports = {
  CorteGeneral,
  CorteGeneralAgente,
  CorteGeneralGasto,
  MovimientoCapital,
  CorteSemanal,
  Cobrador,
};
