const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, required: true },
  description: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('ProductosBase', productoSchema, 'ProductosBases');




