const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Usuario = require('../models/usuario');

// REGISTER - Crear nuevo usuario
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Verificar si el usuario ya existe
    const usuarioExistente = await Usuario.findOne({ email });
    if (usuarioExistente) {
      return res.status(400).json({ 
        error: 'Ya existe un usuario con este correo electrónico' 
      });
    }

    // Hash de la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Crear nuevo usuario
    const nuevoUsuario = new Usuario({
      name,
      email,
      password: hashedPassword
    });

    await nuevoUsuario.save();

    // No enviar la contraseña en la respuesta
    const usuarioResponse = {
      id: nuevoUsuario._id,
      name: nuevoUsuario.name,
      email: nuevoUsuario.email,
      role: nuevoUsuario.role,
      preferences: nuevoUsuario.preferences,
      createdAt: nuevoUsuario.createdAt
    };

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user: usuarioResponse
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ 
      error: 'Error del servidor al crear el usuario' 
    });
  }
});

// LOGIN - Iniciar sesión
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar usuario
    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
      return res.status(400).json({ 
        error: 'Correo electrónico o contraseña incorrectos' 
      });
    }

    // Verificar contraseña
    const passwordValido = await bcrypt.compare(password, usuario.password);
    if (!passwordValido) {
      return res.status(400).json({ 
        error: 'Correo electrónico o contraseña incorrectos' 
      });
    }

    // No enviar la contraseña en la respuesta
    const usuarioResponse = {
      id: usuario._id,
      name: usuario.name,
      email: usuario.email,
      role: usuario.role,
      preferences: usuario.preferences,
      createdAt: usuario.createdAt
    };

    res.json({
      message: 'Login exitoso',
      user: usuarioResponse
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ 
      error: 'Error del servidor al iniciar sesión' 
    });
  }
});

// UPDATE PROFILE - Actualizar perfil
router.put('/profile/:id', async (req, res) => {
  try {
    const { name, email, currentPassword, newPassword, preferences } = req.body;
    const userId = req.params.id;

    const usuario = await Usuario.findById(userId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Actualizar campos básicos
    if (name) usuario.name = name;
    if (email) usuario.email = email;
    if (preferences) usuario.preferences = { ...usuario.preferences, ...preferences };

    // Actualizar contraseña si se proporciona
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ 
          error: 'Debes ingresar la contraseña actual para cambiarla' 
        });
      }

      const passwordValido = await bcrypt.compare(currentPassword, usuario.password);
      if (!passwordValido) {
        return res.status(400).json({ 
          error: 'La contraseña actual es incorrecta' 
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
      createdAt: usuario.createdAt
    };

    res.json({
      message: 'Perfil actualizado correctamente',
      user: usuarioResponse
    });

  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ 
      error: 'Error del servidor al actualizar el perfil' 
    });
  }
});

// GET USER - Obtener usuario por ID
router.get('/user/:id', async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id).select('-password');
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(usuario);
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;