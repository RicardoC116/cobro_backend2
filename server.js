// server.js
const express = require("express");
const cors = require("cors");
const app = express();
const port = 3000;
const cobradoresRoutes = require("./routes/cobradoresRoutes");
const deudoresRoutes = require("./routes/deudoresRoutes");
const cobrosRoutes = require("./routes/cobrosRoutes");
const cortesRoutes = require("./routes/cortesRoutes");
const db = require("./db");

require("dotenv").config();

// Middleware para habilitar CORS
app.use(cors()); // Habilitar CORS para todas las rutas

// Middleware para parsear JSON
app.use(express.json());

// Verificar la conexión a la base de datos y sincronizar los modelos
db.authenticate()
  .then(() => {
    console.log("Conexión exitosa a la base de datos");

    // Sincronizar la base de datos
    return db
      .sync({ alter: false })
      .then(() => {
        console.log("Base de datos sincronizada correctamente.");
      })
      .catch((error) => {
        console.error("Error al sincronizar la base de datos:", error);
      });
  })
  .then(() => {
    console.log("Base de datos sincronizada");

    // Rutas para Cobradores
    app.use("/api/cobradores", cobradoresRoutes);

    // Rutas para Deudores
    app.use("/api/deudores", deudoresRoutes);

    // Rutas para Cobros
    app.use("/api/cobros", cobrosRoutes);

    // Rutas para Cortes Diarios
    app.use("/api/cortes", cortesRoutes);

    // Iniciar el servidor solo si la conexión a la BD es exitosa
    app.listen(port, () => {
      console.log(`Servidor corriendo en http://localhost:${port}`);
    });

    console.log("JWT Secret:", process.env.JWT_SECRET);
  })
  .catch((error) => {
    console.error("No se pudo conectar a la base de datos:", error);
  });
