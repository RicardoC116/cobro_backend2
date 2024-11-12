const mysql = require("mysql2");
require("dotenv").config();

// Configuración de la conexión
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Probar la conexión
connection.connect((err) => {
  if (err) {
    console.error("Error al conectar a la base de datos:", err.message);
    process.exit(1); // Salir con un error
  } else {
    console.log("Conexión exitosa a la base de datos");
    connection.end(); // Cerrar la conexión después de probar
  }
});
