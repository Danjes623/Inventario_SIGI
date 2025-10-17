const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0"; // Escucha en todas las interfaces

const app = express();
app.use(express.json());
app.use(cors());

// Servir archivos estáticos (frontend)
app.use(express.static(path.join(__dirname, "public")));

// Ruta raíz → index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Conectar a MongoDB
mongoose
  .connect("mongodb://localhost:27017/InventarioP")
  .then(async () => {
    console.log("✅ MongoDB conectado");

    // Limpiar todas las sesiones existentes al iniciar el servidor
    try {
      await Session.deleteMany({});
      console.log("🧹 Sesiones anteriores limpiadas");
    } catch (error) {
      console.error("Error limpiando sesiones:", error);
    }
  })
  .catch((err) => console.error(err));

// Modelo de Usuario (puedes crear esto en models/Usuario.js después)
const usuarioSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: "user",
      enum: ["user", "admin"],
    },
    preferences: {
      lowStockNotifications: { type: Boolean, default: true },
      emailNotifications: { type: Boolean, default: false },
      twoFactorAuth: { type: Boolean, default: false },
      autoLogout: { type: Boolean, default: true },
      language: { type: String, default: "es" },
    },
  },
  {
    timestamps: true,
  }
);

const Usuario = mongoose.model("Usuario", usuarioSchema);

// Modelo de Sesión
const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      default: function () {
        // La sesión expira en 24 horas
        return new Date(Date.now() + 24 * 60 * 60 * 1000);
      },
    },
  },
  {
    timestamps: true,
  }
);

// Índice para limpieza automática de sesiones expiradas
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Session = mongoose.model("Session", sessionSchema);

// ===============================
// RUTAS DE AUTENTICACIÓN
// ===============================

// REGISTER - Crear nuevo usuario
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    console.log("Intentando registrar usuario:", { name, email });

    // Verificar si el usuario ya existe
    const usuarioExistente = await Usuario.findOne({ email });
    if (usuarioExistente) {
      return res.status(400).json({
        error: "Ya existe un usuario con este correo electrónico",
      });
    }

    // Hash de la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Crear nuevo usuario
    const nuevoUsuario = new Usuario({
      name,
      email,
      password: hashedPassword,
    });

    await nuevoUsuario.save();

    // No enviar la contraseña en la respuesta
    const usuarioResponse = {
      id: nuevoUsuario._id,
      name: nuevoUsuario.name,
      email: nuevoUsuario.email,
      role: nuevoUsuario.role,
      preferences: nuevoUsuario.preferences,
      createdAt: nuevoUsuario.createdAt,
    };

    console.log("Usuario registrado exitosamente:", usuarioResponse.email);

    res.status(201).json({
      message: "Usuario creado exitosamente",
      user: usuarioResponse,
    });
  } catch (error) {
    console.error("Error en registro:", error);
    res.status(500).json({
      error: "Error del servidor al crear el usuario",
    });
  }
});

// LOGIN - Iniciar sesión
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("Intentando login:", email);

    // Buscar usuario
    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
      return res.status(400).json({
        error: "Correo electrónico o contraseña incorrectos",
      });
    }

    // Verificar contraseña
    const passwordValido = await bcrypt.compare(password, usuario.password);
    if (!passwordValido) {
      return res.status(400).json({
        error: "Correo electrónico o contraseña incorrectos",
      });
    }

    // No enviar la contraseña en la respuesta
    const usuarioResponse = {
      id: usuario._id,
      name: usuario.name,
      email: usuario.email,
      role: usuario.role,
      preferences: usuario.preferences,
      createdAt: usuario.createdAt,
    };

    console.log("Login exitoso:", usuarioResponse.email);

    res.json({
      message: "Login exitoso",
      user: usuarioResponse,
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({
      error: "Error del servidor al iniciar sesión",
    });
  }
});

// UPDATE PROFILE - Actualizar perfil
app.put("/api/auth/profile/:id", async (req, res) => {
  try {
    const { name, email, currentPassword, newPassword, preferences } = req.body;
    const userId = req.params.id;

    console.log("Actualizando perfil para usuario:", userId);

    const usuario = await Usuario.findById(userId);
    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // Actualizar campos básicos
    if (name) usuario.name = name;
    if (email) usuario.email = email;
    if (preferences)
      usuario.preferences = { ...usuario.preferences, ...preferences };

    // Actualizar contraseña si se proporciona
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          error: "Debes ingresar la contraseña actual para cambiarla",
        });
      }

      const passwordValido = await bcrypt.compare(
        currentPassword,
        usuario.password
      );
      if (!passwordValido) {
        return res.status(400).json({
          error: "La contraseña actual es incorrecta",
        });
      }

      const salt = await bcrypt.genSalt(10);
      usuario.password = await bcrypt.hash(newPassword, salt);
    }

    await usuario.save();

    // No enviar la contraseña en la respuesta
    const usuarioResponse = {
      id: usuario._id,
      name: usuario.name,
      email: usuario.email,
      role: usuario.role,
      preferences: usuario.preferences,
      createdAt: usuario.createdAt,
    };

    console.log("Perfil actualizado exitosamente:", usuarioResponse.email);

    res.json({
      message: "Perfil actualizado correctamente",
      user: usuarioResponse,
    });
  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    res.status(500).json({
      error: "Error del servidor al actualizar el perfil",
    });
  }
});

// GET USER - Obtener usuario por ID
app.get("/api/auth/user/:id", async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id).select("-password");
    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.json(usuario);
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// ===============================
// RUTAS DE GESTIÓN DE SESIONES
// ===============================

// Registrar nueva sesión
app.post("/api/auth/register-session", async (req, res) => {
  try {
    const { userId, sessionId } = req.body;

    // Crear nueva sesión (reemplazará cualquier sesión existente para este usuario)
    await Session.findOneAndDelete({ userId });

    const nuevaSesion = new Session({
      userId,
      sessionId,
    });

    await nuevaSesion.save();

    res.json({ message: "Sesión registrada correctamente" });
  } catch (error) {
    console.error("Error registrando sesión:", error);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// Validar sesión
app.post("/api/auth/validate-session", async (req, res) => {
  try {
    const { userId, sessionId } = req.body;

    const sesion = await Session.findOne({
      userId,
      sessionId,
    });

    if (!sesion) {
      return res.status(401).json({ valid: false, error: "Sesión no válida" });
    }

    res.json({ valid: true, message: "Sesión válida" });
  } catch (error) {
    console.error("Error validando sesión:", error);
    res.status(500).json({ valid: false, error: "Error del servidor" });
  }
});

// Cerrar sesión
app.post("/api/auth/logout", async (req, res) => {
  try {
    const { userId, sessionId } = req.body;

    if (userId && sessionId) {
      await Session.findOneAndDelete({
        userId,
        sessionId,
      });
    }

    res.json({ message: "Sesión cerrada correctamente" });
  } catch (error) {
    console.error("Error cerrando sesión:", error);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// Endpoint para beacon (no espera respuesta)
app.post(
  "/api/auth/logout-beacon",
  express.text({ type: "*/*" }),
  async (req, res) => {
    try {
      const data = JSON.parse(req.body);
      const { userId, sessionId } = data;

      if (userId && sessionId) {
        await Session.findOneAndDelete({
          userId,
          sessionId,
        });
      }

      res.status(200).end();
    } catch (error) {
      console.error("Error en logout beacon:", error);
      res.status(200).end(); // Siempre responder 200 para beacon
    }
  }
);

// Limpiar todas las sesiones al iniciar el servidor (opcional)
app.post("/api/auth/cleanup-sessions", async (req, res) => {
  try {
    await Session.deleteMany({});
    res.json({ message: "Todas las sesiones han sido limpiadas" });
  } catch (error) {
    console.error("Error limpiando sesiones:", error);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// Rutas existentes
app.use("/api/productos", require("./Routes/productos"));

app.listen(PORT, HOST, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`🌐 Accesible desde tu red local en: http://10.9.221.33:${PORT}`);
  console.log(`📱 Otros dispositivos pueden usar esa IP para conectarse`);
});
