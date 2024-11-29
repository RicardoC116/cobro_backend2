const bcrypt = require("bcrypt");
const Cobrador = require("./models/cobradorModel");

const encryptPasswords = async () => {
  try {
    // Obtener todos los cobradores de la base de datos
    const cobradores = await Cobrador.findAll();

    for (const cobrador of cobradores) {
      // Encriptar la contraseña
      const hashedPassword = await bcrypt.hash(cobrador.password, 10);

      // Actualizar la contraseña en la base de datos
      await Cobrador.update(
        { password: hashedPassword },
        { where: { id: cobrador.id } }
      );
      console.log(
        `Contraseña encriptada para el cobrador con ID: ${cobrador.id}`
      );
    }

    console.log("Todas las contraseñas han sido encriptadas.");
  } catch (error) {
    console.error("Error al encriptar contraseñas:", error);
  }
};

encryptPasswords();
