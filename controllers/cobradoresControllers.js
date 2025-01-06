// cobradoresControllers.js

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const Cobrador = require("../models/cobradorModel");

// Obtener todos los cobradores
exports.getAllCobradores = async (req, res) => {
  try {
    const cobradores = await Cobrador.findAll();
    res.json(cobradores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtener detalles de un deudor específico por ID
exports.getCobradorById = async (req, res) => {
  const { id } = req.params;
  try {
    const cobrador = await Cobrador.findByPk(id);
    if (!cobrador) {
      return res.status(404).json({ error: "cobrador no encontrado" });
    }
    res.json(cobrador);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Crear un nuevo cobrador
exports.createCobrador = async (req, res) => {
  const { name, phone_number, password } = req.body;
  try {
    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    const cobrador = await Cobrador.create({
      name,
      phone_number,
      password: hashedPassword,
    });
    res.status(201).json(cobrador);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Actualizar un cobrador
exports.updateCobrador = async (req, res) => {
  const { id } = req.params;
  const { name, phone_number, password } = req.body;
  try {
    const cobrador = await Cobrador.findByPk(id);
    if (!cobrador) {
      return res.status(404).json({ error: "Cobrador no encontrado" });
    }
    cobrador.name = name;
    cobrador.phone_number = phone_number;
    cobrador.password = await bcrypt.hash(password, 10);

    await cobrador.save();
    res.json(cobrador);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Eliminar un cobrador
exports.deleteCobrador = async (req, res) => {
  const { id } = req.params;
  try {
    const cobrador = await Cobrador.findByPk(id);
    if (!cobrador) {
      return res.status(404).json({ error: "Cobrador no encontrado" });
    }
    await cobrador.destroy();
    res.json({ message: "Cobrador eliminado" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Iniciar sesión para un cobrador
exports.loginCobrador = async (req, res) => {
  const { name, password } = req.body;
  try {
    // Buscar al cobrador por el nombre
    const cobrador = await Cobrador.findOne({ where: { name } });

    if (!cobrador) {
      return res.status(404).json({ error: "Cobrador no encontrado" });
    }

    // Para verificar la contraseña
    const isPasswordValid = await bcrypt.compare(password, cobrador.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    // Se crea un token de autenticación con id y nombre
    const token = jwt.sign(
      { id: cobrador.id, name: cobrador.name },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token, collector_id: cobrador.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// verificar el token
exports.verifyToken = (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token no proporcionado" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Token inválido" });
    }
    res.status(200).json({
      message: "Token válido",
      collector_id: decoded.id,
      collector_name: decoded.name,
    });
  });
};
