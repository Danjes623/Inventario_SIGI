const express = require('express');
const router = express.Router();
const Producto = require('../models/Producto');

// CREATE
router.post('/', async (req, res) => {
  try {
    const producto = new Producto(req.body);
    await producto.save();
    res.json(producto);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ (todos)
router.get('/', async (req, res) => {
  const productos = await Producto.find();
  res.json(productos);
});

// READ (uno por id)
router.get('/:id', async (req, res) => {
  const producto = await Producto.findById(req.params.id);
  res.json(producto);
});

// UPDATE
router.put('/:id', async (req, res) => {
  const producto = await Producto.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(producto);
});

// DELETE
router.delete('/:id', async (req, res) => {
  await Producto.findByIdAndDelete(req.params.id);
  res.json({ message: 'Producto eliminado' });
});


// Endpoint para obtener categorías con estadísticas
router.get('/categorias/lista', async (req, res) => {
  try {
    const categorias = await Producto.aggregate([
      {
        $group: {
          _id: '$category',
          totalProductos: { $sum: 1 },
          totalStock: { $sum: '$stock' },
          valorTotal: { $sum: { $multiply: ['$price', '$stock'] } }
        }
      },
      {
        $project: {
          nombre: '$_id',
          totalProductos: 1,
          totalStock: 1,
          valorTotal: { $round: ['$valorTotal', 2] },
          _id: 0
        }
      },
      { $sort: { nombre: 1 } }
    ]);
    
    res.json(categorias);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

// Cargar categorías desde la API
async function loadCategories() {
    try {
        categories = await apiRequest('/productos/categorias/lista');
        renderCategories();
    } catch (error) {
        console.log('Endpoint de categorías no disponible, usando datos de productos...');
        // Si falla, extraer categorías de los productos sin mostrar error
        extractCategoriesFromProducts();
    }
}

// READ (lista de categorías únicas)
router.get('/categorias/lista', async (req, res) => {
    try {
        const categorias = await Producto.aggregate([
            { $group: { _id: "$category", totalProductos: { $sum: 1 } } },
            { $project: { nombre: "$_id", totalProductos: 1, _id: 0 } }
        ]);
        res.json(categorias);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});