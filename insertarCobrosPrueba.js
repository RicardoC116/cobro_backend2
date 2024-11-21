const Cobro = require("./models/cobroModel");

const insertarCobrosPrueba = async () => {
  try {
    await Cobro.bulkCreate([
      {
        collector_id: 1,
        debtor_id: 1,
        amount: 200,
        payment_date: "2024-11-18",
        payment_type: "normal",
        createdAt: "2024-11-18",
        updatedAt: "2024-11-18",
      },
      {
        collector_id: 1,
        debtor_id: 2,
        amount: 400,
        payment_date: "2024-11-18",
        payment_type: "normal",
        createdAt: "2024-11-18",
        updatedAt: "2024-11-18",
      },
      {
        collector_id: 1,
        debtor_id: 1,
        amount: 250,
        payment_date: "2024-11-19",
        payment_type: "normal",
        createdAt: "2024-11-19",
        updatedAt: "2024-11-19",
      },
      {
        collector_id: 1,
        debtor_id: 2,
        amount: 600,
        payment_date: "2024-11-19",
        payment_type: "normal",
        createdAt: "2024-11-19",
        updatedAt: "2024-11-19",
      },
      {
        collector_id: 1,
        debtor_id: 1,
        amount: 250,
        payment_date: "2024-11-22",
        payment_type: "liquidación",
        createdAt: "2024-11-22",
        updatedAt: "2024-11-22",
      },
    ]);

    console.log("Cobros de prueba insertados correctamente.");
  } catch (error) {
    console.error("Error al insertar cobros de prueba:", error);
  }
};

insertarCobrosPrueba();

// actualizar la tabla con bulk

// const actualizarCobrosPrueba = async () => {
//   try {
//     await Cobro.update(
//       {
//         payment_date: "2024-10-20T14:30:00Z",
//         createdAt: "2024-10-20T14:30:00Z",
//         updatedAt: "2024-10-20T14:30:00Z",
//       },
//       { where: { id: 2 } }
//     );

//     console.log("Cobros actualizados correctamente para pruebas.");
//   } catch (error) {
//     console.error("Error al actualizar cobros:", error);
//   }
// };

// actualizarCobrosPrueba();
