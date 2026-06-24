require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); 
const Razorpay = require('razorpay');

// Schema Configurations
const Product = require('./models/Product');
const User = require('./models/User');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// --- MONGOOSE LIFECYCLE MONITORS ---
mongoose.connect(process.env.MONGO_URI)
  .catch(err => console.error('Initial MongoDB Connection Error:', err.message));

const db = mongoose.connection;
db.on('connected', () => console.log('✅ Connected to MongoDB safely!'));

// --- JWT AUTH VERIFICATION MIDDLEWARE ---
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied. Sign-in required.' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(403).json({ error: 'Session expired or invalid token structure.' });
  }
};

// --- API ACCOUNT IDENTITY ENDPOINTS ---

// Registration Route
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    console.log('Incoming Register Payload:', { name, email });

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are mandatory.' });
    }

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) return res.status(400).json({ error: 'This email is already registered.' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({ 
      name, 
      email: email.toLowerCase(), 
      password: hashedPassword 
    });
    
    await user.save();

    const token = jwt.sign({ id: user._id, name: user.name }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({ token, user: { name: user.name, email: user.email } });
  } catch (error) {
    console.error('Registration runtime error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Authentication Login Route
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Incoming Access Request:', email);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ error: 'Invalid email or password.' });

    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.status(400).json({ error: 'Invalid email or password.' });

    const token = jwt.sign({ id: user._id, name: user.name }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { name: user.name, email: user.email } });
  } catch (error) {
    console.error('Authentication runtime error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- PRODUCTS METRICS FETCH ROUTE ---
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve inventory metrics.' });
  }
});

// --- STEP 1: BACKEND - CREATE ORDER ---
app.post('/api/checkout', verifyToken, async (req, res) => {
  const { productId } = req.body;
  try {
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Requested resource not located.' });

    if (!product.price || product.price < 100) {
      return res.status(400).json({ error: 'Transaction value falls below Razorpay minimum limit of 100 paise.' });
    }

    const options = {
      amount: product.price, 
      currency: "INR",
      receipt: `rcpt_order_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);

    res.json({
      keyId: process.env.RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      orderId: order.id,
      productName: product.title,
      productId: product._id
    });
  } catch (error) {
    console.error('❌ Razorpay Order Creation Failure:', error);
    res.status(500).json({ error: 'Failed to initialize payment gateway order details.' });
  }
});

// --- STEP 3: BACKEND - VERIFY PAYMENT SIGNATURE ---
app.post('/api/verify-payment', verifyToken, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing mandatory payment signature telemetry components.' });
    }

    const securePayload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(securePayload.toString())
      .digest('hex');

    if (generatedSignature === razorpay_signature) {
      console.log(`⚡ Payment Verified Successfully for Order: ${razorpay_order_id}`);
      return res.json({ status: 'success', message: 'Payment authenticated successfully.' });
    } else {
      console.warn('⚠️ Alert: Fraudulent transaction signatures detected.');
      return res.status(400).json({ status: 'failed', error: 'Payment signature hash mismatch validation failure.' });
    }
  } catch (error) {
    console.error('❌ Verification Endpoint Crash:', error);
    res.status(500).json({ error: 'Internal signature verification routine fault.' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Store environment compiled on port ${PORT}`));