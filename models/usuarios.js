const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    default: 'user',
    enum: ['user', 'admin']
  },
  preferences: {
    lowStockNotifications: { type: Boolean, default: true },
    emailNotifications: { type: Boolean, default: false },
    twoFactorAuth: { type: Boolean, default: false },
    autoLogout: { type: Boolean, default: true },
    language: { type: String, default: 'es' }
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Usuario', usuarioSchema);