const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true }, // Price in cents (e.g., 2900 = $29.00)
  image: { type: String, required: true },
  filePath: { type: String, required: true } // Path to the digital file
});

module.exports = mongoose.model('Product', productSchema);