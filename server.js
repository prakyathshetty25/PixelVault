require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const nodemailer = require('nodemailer');

const Product = require('./models/Product');
const User = require('./models/User');
const Purchase = require('./models/Purchase');
const { verifyToken } = require('./middleware/auth');

const app = express();
const inMemoryUsers = new Map();
const inMemoryProducts = new Map();
const inMemoryPurchases = new Map();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const fallbackProducts = [
  {
    _id: 'product-1',
    title: 'UI Kit Pro',
    category: 'UI Kit',
    description: 'A premium design system bundle for fast product launches.',
    price: 2900,
    image: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=800&q=80',
    filePath: '/files/ui-kit-pro.zip'
  },
  {
    _id: 'product-2',
    title: 'Motion Pack',
    category: 'Animation',
    description: 'Animated micro-interactions and transitions for modern apps.',
    price: 1800,
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
    filePath: '/files/motion-pack.zip'
  },
  {
    _id: 'product-3',
    title: 'Landing Page Template',
    category: 'Website',
    description: 'High-converting startup landing pages with polished visuals.',
    price: 2400,
    image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80',
    filePath: '/files/landing-page-template.zip'
  },
  {
    _id: 'product-4',
    title: 'Dashboard System',
    category: 'Dashboard',
    description: 'A sleek admin dashboard template with charts, tables, and widgets.',
    price: 3200,
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80',
    filePath: '/files/dashboard-system.zip'
  },
  {
    _id: 'product-5',
    title: 'Brand Identity Kit',
    category: 'Branding',
    description: 'Fonts, icons, and presentation templates for polished brand launches.',
    price: 2600,
    image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80',
    filePath: '/files/brand-identity-kit.zip'
  },
  {
    _id: 'product-6',
    title: 'Social Media Bundle',
    category: 'Content',
    description: 'Editable social templates for product launches, promos, and campaigns.',
    price: 1400,
    image: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=800&q=80',
    filePath: '/files/social-media-bundle.zip'
  },
  {
    _id: 'product-7',
    title: 'E-commerce UI Pack',
    category: 'Shopping',
    description: 'A full set of high-converting storefront screens for online stores.',
    price: 3100,
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80',
    filePath: '/files/ecommerce-ui-pack.zip'
  },
  {
    _id: 'product-8',
    title: 'Mobile App Template',
    category: 'App',
    description: 'Modern mobile screen flows for SaaS apps and startups.',
    price: 2700,
    image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=800&q=80',
    filePath: '/files/mobile-app-template.zip'
  },
  {
    _id: 'product-9',
    title: 'Pitch Deck Kit',
    category: 'Presentation',
    description: 'Polished presentation slides for investors, clients, and launches.',
    price: 2200,
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
    filePath: '/files/pitch-deck-kit.zip'
  },
  {
    _id: 'product-10',
    title: 'Figma Component Library',
    category: 'Design System',
    description: 'Comprehensive Figma library with 500+ reusable components.',
    price: 3900,
    image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=800&q=80',
    filePath: '/files/figma-library.zip'
  },
  {
    _id: 'product-11',
    title: 'Video Marketing Bundle',
    category: 'Video',
    description: 'Ready-to-edit video templates for YouTube, TikTok, and Instagram.',
    price: 2900,
    image: 'https://images.unsplash.com/photo-1533928298208-27ff66555d0d?auto=format&fit=crop&w=800&q=80',
    filePath: '/files/video-bundle.zip'
  },
  {
    _id: 'product-12',
    title: 'Icon Pack Pro',
    category: 'Icons',
    description: '2000+ vector icons in SVG and PNG formats for all design needs.',
    price: 1600,
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80',
    filePath: '/files/icon-pack.zip'
  },
  {
    _id: 'product-13',
    title: 'Typography Essentials',
    category: 'Fonts',
    description: 'Curated collection of premium fonts with commercial licenses.',
    price: 2000,
    image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80',
    filePath: '/files/fonts.zip'
  },
  {
    _id: 'product-14',
    title: 'Analytics Dashboard Template',
    category: 'Dashboard',
    description: 'Data visualization dashboard with interactive charts and metrics.',
    price: 3400,
    image: 'https://images.unsplash.com/photo-1576147423250-c09f3bfbdb25?auto=format&fit=crop&w=800&q=80',
    filePath: '/files/analytics-dashboard.zip'
  },
  {
    _id: 'product-15',
    title: 'SaaS Landing Pages',
    category: 'Website',
    description: '10 high-converting landing page templates for SaaS products.',
    price: 4200,
    image: 'https://images.unsplash.com/photo-1460925895917-aeb19be489c7?auto=format&fit=crop&w=800&q=80',
    filePath: '/files/saas-landing.zip'
  },
  {
    _id: 'product-16',
    title: 'Wireframe Kit',
    category: 'UI Kit',
    description: 'Low-fidelity wireframe templates for rapid prototyping.',
    price: 1200,
    image: 'https://images.unsplash.com/photo-1561471430-ab405f4dcd6f?auto=format&fit=crop&w=800&q=80',
    filePath: '/files/wireframe-kit.zip'
  },
  {
    _id: 'product-17',
    title: 'Email Template Suite',
    category: 'Email',
    description: 'Professional email templates for marketing, newsletters, and notifications.',
    price: 1800,
    image: 'https://images.unsplash.com/photo-1526374965328-7f5ae4e8e688?auto=format&fit=crop&w=800&q=80',
    filePath: '/files/email-templates.zip'
  },
  {
    _id: 'product-18',
    title: '3D Mockup Generator',
    category: 'Tools',
    description: 'Digital tool to create stunning 3D mockups of your designs.',
    price: 2500,
    image: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?auto=format&fit=crop&w=800&q=80',
    filePath: '/files/3d-mockup-tool.zip'
  },
  {
    _id: 'product-19',
    title: 'Notion Dashboard Template',
    category: 'Productivity',
    description: 'A comprehensive Notion workspace with dashboards, trackers, and project management templates.',
    price: 1500,
    image: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?auto=format&fit=crop&w=800&q=80',
    filePath: '/files/notion-dashboard.zip'
  },
  {
    _id: 'product-20',
    title: 'ChatGPT Prompt Library',
    category: 'AI',
    description: '500+ expertly crafted ChatGPT prompts for marketing, coding, writing, and business.',
    price: 1900,
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=800&q=80',
    filePath: '/files/chatgpt-prompts.zip'
  },
  {
    _id: 'product-21',
    title: 'Logo Design Kit',
    category: 'Branding',
    description: 'Professional logo templates, brand mark generators, and identity style guides.',
    price: 3500,
    image: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=800&q=80',
    filePath: '/files/logo-kit.zip'
  },
  {
    _id: 'product-22',
    title: 'Webflow Cloneable Kit',
    category: 'Website',
    description: 'Premium Webflow cloneables including portfolios, landing pages, and business sites.',
    price: 2800,
    image: 'https://images.unsplash.com/photo-1460925895917-aeb19be489c7?auto=format&fit=crop&w=800&q=80',
    filePath: '/files/webflow-cloneables.zip'
  },
  {
    _id: 'product-23',
    title: 'SQL Pro Template',
    category: 'Database',
    description: 'Advanced SQL query templates, database schemas, and optimization scripts for developers.',
    price: 2200,
    image: 'https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?auto=format&fit=crop&w=800&q=80',
    filePath: '/files/sql-pro.zip'
  },
  {
    _id: 'product-24',
    title: 'Framer Template Bundle',
    category: 'Website',
    description: 'Modern Framer website templates with animations, CMS integration, and responsive layouts.',
    price: 3200,
    image: 'https://images.unsplash.com/photo-1551033406-611cf9a28f67?auto=format&fit=crop&w=800&q=80',
    filePath: '/files/framer-bundle.zip'
  }
];

fallbackProducts.forEach((product) => inMemoryProducts.set(product._id, product));

const seedProducts = async () => {
  if (mongoose.connection.readyState === 1) {
    try {
      const count = await Product.countDocuments();
      if (count === 0) {
        await Product.insertMany(fallbackProducts.map(({ _id, ...rest }) => rest));
        console.log(`🌱 Seeded ${fallbackProducts.length} products into MongoDB`);
      } else {
        console.log(`📦 MongoDB has ${count} products, skipping seed`);
      }
    } catch (err) {
      console.error('Failed to seed products:', err.message);
    }
  }
};

setTimeout(seedProducts, 1000);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  try {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    console.log('✅ Razorpay initialized successfully');
  } catch (err) {
    console.log('⚠️ Razorpay initialization failed, using mock payments:', err.message);
    razorpay = null;
  }
}

const sendPurchaseReceipt = async ({ toEmail, userName, productName, productPrice, paymentId, orderId, downloadUrl, purchasedAt }) => {
  try {
    const domain = process.env.DOMAIN || 'http://localhost:5000';

    let transporter;
    let previewUrl = null;

    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    } else {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
    }

    const priceFormatted = `₹${(productPrice / 100).toFixed(2)}`;
    const dateFormatted = new Date(purchasedAt || Date.now()).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const mailOptions = {
      from: `"PixelVault Store" <${process.env.SMTP_USER || 'noreply@pixelvault.store'}>`,
      to: toEmail,
      subject: `Your PixelVault Purchase - ${productName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; padding: 40px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <table style="max-width: 600px; width: 100%; background: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid #334155;">
                <tr>
                  <td style="padding: 32px; background: linear-gradient(135deg, #4f46e5, #7c3aed); text-align: center;">
                    <h1 style="margin: 0; font-size: 28px; color: #fff;">Thank you for your purchase!</h1>
                    <p style="margin: 8px 0 0; color: #c4b5fd; font-size: 16px;">Your receipt and download details are below.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 32px;">
                    <p style="margin: 0 0 20px; font-size: 16px;">Hi <strong style="color: #fff;">${userName}</strong>,</p>
                    <p style="margin: 0 0 24px; color: #94a3b8; font-size: 15px; line-height: 1.6;">
                      Your payment was successful and your product is ready for download. 
                      This receipt confirms that <strong style="color: #fff;">${productName}</strong> has been registered to your email address (<strong style="color: #fff;">${toEmail}</strong>).
                    </p>

                    <table style="width: 100%; background: #0f172a; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #334155;">
                      <tr>
                        <td style="padding: 8px 0; color: #94a3b8; font-size: 14px;">Product</td>
                        <td style="padding: 8px 0; text-align: right; color: #fff; font-weight: 600; font-size: 14px;">${productName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #94a3b8; font-size: 14px;">Amount Paid</td>
                        <td style="padding: 8px 0; text-align: right; color: #818cf8; font-weight: 700; font-size: 16px;">${priceFormatted}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #94a3b8; font-size: 14px;">Payment ID</td>
                        <td style="padding: 8px 0; text-align: right; color: #cbd5e1; font-family: monospace; font-size: 13px;">${paymentId}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #94a3b8; font-size: 14px;">Order ID</td>
                        <td style="padding: 8px 0; text-align: right; color: #cbd5e1; font-family: monospace; font-size: 13px;">${orderId}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #94a3b8; font-size: 14px;">Purchase Date</td>
                        <td style="padding: 8px 0; text-align: right; color: #cbd5e1; font-size: 13px;">${dateFormatted}</td>
                      </tr>
                    </table>

                    <a href="${domain}${downloadUrl}" style="display: block; text-align: center; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #fff; text-decoration: none; padding: 16px 24px; border-radius: 12px; font-weight: 600; font-size: 16px; margin-bottom: 24px;">
                      Download ${productName}
                    </a>

                    <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.6; text-align: center;">
                      You can also access all your purchases anytime from your 
                      <a href="${domain}/dashboard.html" style="color: #818cf8; text-decoration: underline;">dashboard</a>.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 32px; background: #0f172a; text-align: center; border-top: 1px solid #334155;">
                    <p style="margin: 0; color: #475569; font-size: 12px;">PixelVault &mdash; Premium digital assets for modern creators</p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`📧 Email preview URL: ${previewUrl}`);
    }
    console.log(`📧 Receipt sent to ${toEmail} for ${productName}`);
    return { sent: true, previewUrl };
  } catch (err) {
    console.error('Failed to send receipt email:', err.message);
    return { sent: false, error: err.message };
  }
};

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.log('⚠️ No MONGO_URI provided. Auth will use in-memory storage.');
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB safely!');
  } catch (err) {
    console.error('Initial MongoDB Connection Error:', err.message);
    console.log('⚠️ Continuing with in-memory auth storage.');
  }
};

connectDB();

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err.message);
});

const findUserByEmail = async (email) => {
  const normalizedEmail = email.toLowerCase();
  if (mongoose.connection.readyState === 1) {
    return User.findOne({ email: normalizedEmail });
  }
  return inMemoryUsers.get(normalizedEmail) || null;
};

const createUserRecord = async (userData) => {
  if (mongoose.connection.readyState === 1) {
    const user = new User(userData);
    await user.save();
    return user;
  }

  const user = {
    _id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ...userData
  };
  inMemoryUsers.set(user.email.toLowerCase(), user);
  return user;
};

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are mandatory.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const userExists = await findUserByEmail(normalizedEmail);
    if (userExists) {
      return res.status(400).json({ error: 'This email is already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createUserRecord({
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashedPassword
    });

    const token = jwt.sign({ id: user._id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await findUserByEmail(normalizedEmail);
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign({ id: user._id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const getProducts = async () => {
  if (mongoose.connection.readyState === 1) {
    return Product.find({});
  }

  return Array.from(inMemoryProducts.values());
};

const getProductById = async (productId) => {
  if (mongoose.connection.readyState === 1) {
    return Product.findById(productId);
  }

  return inMemoryProducts.get(productId) || null;
};

const createProductRecord = async (productData) => {
  if (mongoose.connection.readyState === 1) {
    const product = new Product(productData);
    await product.save();
    return product;
  }

  const product = {
    _id: productData._id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ...productData
  };
  inMemoryProducts.set(product._id, product);
  return product;
};

const updateProductRecord = async (productId, updates) => {
  if (mongoose.connection.readyState === 1) {
    return Product.findByIdAndUpdate(productId, updates, { new: true });
  }

  const existing = inMemoryProducts.get(productId);
  if (!existing) {
    return null;
  }

  const updated = { ...existing, ...updates };
  inMemoryProducts.set(productId, updated);
  return updated;
};

const deleteProductRecord = async (productId) => {
  if (mongoose.connection.readyState === 1) {
    return Product.findByIdAndDelete(productId);
  }

  const existing = inMemoryProducts.get(productId);
  if (!existing) {
    return null;
  }

  inMemoryProducts.delete(productId);
  return existing;
};

const createPurchaseRecord = async (purchaseData) => {
  if (mongoose.connection.readyState === 1) {
    const purchase = new Purchase(purchaseData);
    await purchase.save();
    return purchase;
  }

  const purchase = {
    _id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ...purchaseData
  };
  const key = `${purchaseData.userEmail}-${purchaseData.paymentId}`;
  inMemoryPurchases.set(key, purchase);
  return purchase;
};

const getUserPurchases = async (userEmail) => {
  const normalizedEmail = userEmail.toLowerCase();
  if (mongoose.connection.readyState === 1) {
    return Purchase.find({ userEmail: normalizedEmail }).sort({ purchasedAt: -1 });
  }

  const purchases = [];
  for (const [key, purchase] of inMemoryPurchases.entries()) {
    if (purchase.userEmail === normalizedEmail) {
      purchases.push(purchase);
    }
  }
  return purchases.sort((a, b) => b.purchasedAt - a.purchasedAt);
};

app.get('/api/products', async (_req, res) => {
  try {
    const products = await getProducts();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve inventory metrics.' });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { title, description, price, image, filePath } = req.body;
    if (!title || !description || !price) {
      return res.status(400).json({ error: 'Title, description, and price are required.' });
    }

    const product = await createProductRecord({
      title,
      description,
      price,
      image: image || '',
      filePath: filePath || ''
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product.' });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const product = await updateProductRecord(req.params.id, req.body);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product.' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const product = await deleteProductRecord(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product.' });
  }
});

app.get('/api/purchases', verifyToken, async (req, res) => {
  try {
    const userEmail = req.user.email || req.body.userEmail;
    if (!userEmail) {
      return res.status(400).json({ error: 'User email is required.' });
    }

    const purchases = await getUserPurchases(userEmail);
    res.json(purchases);
  } catch (error) {
    console.error('Error fetching purchases:', error);
    res.status(500).json({ error: 'Failed to retrieve purchases.' });
  }
});

app.post('/api/checkout', verifyToken, async (req, res) => {
  const { productId } = req.body;

  try {
    const product = await getProductById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Requested resource not located.' });
    }
    if (!product.price || product.price < 100) {
      return res.status(400).json({ error: 'Transaction value falls below Razorpay minimum limit.' });
    }

    if (!razorpay) {
      const order = {
        id: `mock_order_${Date.now()}`,
        amount: product.price,
        currency: 'INR'
      };

      return res.json({
        keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock',
        amount: order.amount,
        currency: order.currency,
        orderId: order.id,
        productName: product.title,
        productId: product._id,
        mockPayment: true
      });
    }

    try {
      const options = {
        amount: product.price,
        currency: 'INR',
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
    } catch (razorpayError) {
      console.log('⚠️ Razorpay API failed, falling back to mock payment:', razorpayError.message);
      const order = {
        id: `mock_order_${Date.now()}`,
        amount: product.price,
        currency: 'INR'
      };

      res.json({
        keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock',
        amount: order.amount,
        currency: order.currency,
        orderId: order.id,
        productName: product.title,
        productId: product._id,
        mockPayment: true
      });
    }
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Failed to initialize payment gateway order details.', details: error?.message || String(error) });
  }
});

app.post('/api/verify-payment', verifyToken, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, mockPayment, productId } = req.body;

    if (mockPayment || !razorpay) {
      console.log(`⚡ Mock payment verified successfully for Order: ${razorpay_order_id || 'mock-order'}`);
      
      let purchaseRecord = null;
      try {
        const user = await findUserByEmail(req.user.email || req.user.name);
        const product = await getProductById(productId);
        
        if (user && product) {
          purchaseRecord = await createPurchaseRecord({
            userEmail: user.email || `user-${req.user.id}`,
            productId: product._id,
            productName: product.title,
            price: product.price,
            paymentId: razorpay_payment_id || `mock_${Date.now()}`,
            orderId: razorpay_order_id || `mock_order_${Date.now()}`,
            signature: razorpay_signature || 'mock-signature',
            status: 'success',
            mockPayment: true,
            downloadUrl: product.filePath || ''
          });
          
          sendPurchaseReceipt({
            toEmail: user.email,
            userName: user.name || user.email,
            productName: product.title,
            productPrice: product.price,
            paymentId: purchaseRecord.paymentId,
            orderId: purchaseRecord.orderId,
            downloadUrl: product.filePath || '',
            purchasedAt: purchaseRecord.purchasedAt || Date.now()
          });
        }
      } catch (err) {
        console.error('Failed to save mock purchase:', err.message);
      }
      
      return res.json({ status: 'success', message: 'Payment authenticated successfully.', mockPayment: true, email: req.user.email });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing mandatory payment signature details.' });
    }

    const securePayload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(securePayload.toString())
      .digest('hex');

    if (generatedSignature === razorpay_signature) {
      console.log(`⚡ Payment Verified Successfully for Order: ${razorpay_order_id}`);
      
      let purchaseRecord = null;
      try {
        const user = await findUserByEmail(req.user.email || req.user.name);
        const product = await getProductById(productId);
        
        if (user && product) {
          purchaseRecord = await createPurchaseRecord({
            userEmail: user.email || `user-${req.user.id}`,
            productId: product._id,
            productName: product.title,
            price: product.price,
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id,
            signature: razorpay_signature,
            status: 'success',
            mockPayment: false,
            downloadUrl: product.filePath || ''
          });
          
          sendPurchaseReceipt({
            toEmail: user.email,
            userName: user.name || user.email,
            productName: product.title,
            productPrice: product.price,
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id,
            downloadUrl: product.filePath || '',
            purchasedAt: purchaseRecord.purchasedAt || Date.now()
          });
        }
      } catch (err) {
        console.error('Failed to save purchase:', err.message);
      }
      
      return res.json({ status: 'success', message: 'Payment authenticated successfully.', email: req.user.email });
    }

    return res.status(400).json({ status: 'failed', error: 'Payment signature validation failure.' });
  } catch (error) {
    res.status(500).json({ error: 'Internal signature verification routine fault.' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));
app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => console.log(`🚀 Store environment compiled on port ${PORT}`));
}

module.exports = { app, connectDB, verifyToken };