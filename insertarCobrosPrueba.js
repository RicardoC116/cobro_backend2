const Cobro = require("./models/cobroModel");
const CorteDiario = require("./models/corteDiarioModel");

// const insertarCobrosPrueba = async () => {
//   try {
//     await Cobro.bulkCreate([
//       {
//         collector_id: 4,
//         debtor_id: 8,
//         amount: 200,
//         payment_date: "2024-11-23T01:31:23.022Z",
//         payment_type: "normal",
//         createdAt: "2024-11-23T01:31:23.022Z",
//         updatedAt: "2024-11-23T01:31:23.022Z",
//       },
//       // {
//       //   debtor_id: 8,
//       //   amount: 500,
//       //   payment_date: "2024-11-24T01:31:23.022Z",
//       // },
//       // {
//       //   collector_id: 1,
//       //   debtor_id: 2,
//       //   amount: 400,
//       //   payment_date: "2024-11-18",
//       //   payment_type: "normal",
//       //   createdAt: "2024-11-18",
//       //   updatedAt: "2024-11-18",
//       // },
//       // {
//       //   collector_id: 1,
//       //   debtor_id: 1,
//       //   amount: 250,
//       //   payment_date: "2024-11-19",
//       //   payment_type: "normal",
//       //   createdAt: "2024-11-19",
//       //   updatedAt: "2024-11-19",
//       // },
//       // {
//       //   collector_id: 1,
//       //   debtor_id: 2,
//       //   amount: 600,
//       //   payment_date: "2024-11-19",
//       //   payment_type: "normal",
//       //   createdAt: "2024-11-19",
//       //   updatedAt: "2024-11-19",
//       // },
//       // {
//       //   collector_id: 1,
//       //   debtor_id: 1,
//       //   amount: 250,
//       //   payment_date: "2024-11-22",
//       //   payment_type: "liquidación",
//       //   createdAt: "2024-11-22",
//       //   updatedAt: "2024-11-22",
//       // },
//     ]);

//     console.log("Cobros de prueba insertados correctamente.");
//   } catch (error) {
//     console.error("Error al insertar cobros de prueba:", error);
//   }
// };

// insertarCobrosPrueba();

// actualizar la tabla con bulk

const actualizarCobrosPrueba = async () => {
  try {
    await CorteDiario.update(
      {
        creditos_total_monto: 1500,
      },
      { where: { id: 7 } }
    );

    console.log("Cobros actualizados correctamente para pruebas.");
  } catch (error) {
    console.error("Error al actualizar cobros:", error);
  }
};

actualizarCobrosPrueba();
