const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, lowercase: true },
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  price: { type: Number, required: true },
  paymentId: { type: String, required: true, unique: true },
  orderId: { type: String, required: true },
  signature: { type: String },
  status: { type: String, enum: ['success', 'pending', 'failed'], default: 'pending' },
  mockPayment: { type: Boolean, default: false },
  downloadUrl: { type: String },
  purchasedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Purchase', purchaseSchema);
