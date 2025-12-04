const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  }
});

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  orderFrom: {
    type: String,
    required: true,
    enum: ['instagram', 'facebook', 'whatsapp', 'call', 'offline']
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  customerId: {
    type: String,
    required: true,
    trim: true
  },
  items: [orderItemSchema],
  totalPrice: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Generate unique order ID before saving
orderSchema.pre('validate', async function(next) {
  if (!this.orderId) {
    // Generate a random 6-digit number (100000-999999)
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    this.orderId = `ORD${randomNum}`;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
