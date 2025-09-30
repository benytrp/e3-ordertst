// server.js - Node.js/Express backend for E3 Achievement orders
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static('public')); // Serve your HTML file from 'public' folder

// Rate limiting to prevent spam
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: { error: 'Too many orders submitted, please try again later.' }
});

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail', // or 'smtp', 'outlook', etc.
  auth: {
    user: process.env.EMAIL_USER || 'imageinboxe3@gmail.com',
    pass: process.env.EMAIL_PASSWORD // Use app-specific password for Gmail
  }
});

// Order submission endpoint
app.post('/api/submit-order', limiter, async (req, res) => {
  try {
    const { customer, items, total, orderDate } = req.body;

    // Validation
    if (!customer || !customer.name || !customer.email) {
      return res.status(400).json({ 
        error: 'Missing required customer information' 
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ 
        error: 'No items in order' 
      });
    }

    // Generate order number
    const orderNumber = `E3-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Format order items for email
    const itemsList = items.map(item => 
      `${item.quantity}x ${item.name} @ $${item.price.toFixed(2)} = $${item.subtotal.toFixed(2)}`
    ).join('\n');

    // Email to business
    const businessEmailOptions = {
      from: process.env.EMAIL_USER,
      to: 'imageinboxe3@gmail.com',
      subject: `New E3 Order #${orderNumber} from ${customer.name} - $${total.toFixed(2)}`,
      text: `
NEW ORDER RECEIVED

Order Number: ${orderNumber}
Order Date: ${new Date(orderDate).toLocaleString()}

═══════════════════════════════════════
CUSTOMER INFORMATION
═══════════════════════════════════════
Student Entrepreneur: ${customer.studentName || 'N/A'}
Customer Name: ${customer.name}
Email: ${customer.email}
Phone: ${customer.phone || 'N/A'}
Address: ${customer.address || 'N/A'}

═══════════════════════════════════════
ORDER DETAILS
═══════════════════════════════════════
${itemsList}

───────────────────────────────────────
TOTAL: $${total.toFixed(2)}
═══════════════════════════════════════

SPECIAL INSTRUCTIONS:
${customer.specialInstructions || 'None'}

─────────────────────────────────────────────
This order was submitted through the E3 Achievement online order form.
      `,
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .section { background: white; padding: 15px; margin-bottom: 15px; border-radius: 5px; border-left: 4px solid #ff6b35; }
    .section-title { font-weight: bold; font-size: 1.1em; margin-bottom: 10px; color: #ff6b35; }
    .order-items { background: white; padding: 15px; border-radius: 5px; }
    .item-row { padding: 8px 0; border-bottom: 1px solid #eee; }
    .total { font-size: 1.3em; font-weight: bold; color: #ff6b35; text-align: right; margin-top: 15px; padding-top: 15px; border-top: 2px solid #ff6b35; }
    .footer { text-align: center; color: #666; font-size: 0.9em; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 New Order Received!</h1>
      <p>Order #${orderNumber}</p>
    </div>
    <div class="content">
      <div class="section">
        <div class="section-title">📅 Order Information</div>
        <p><strong>Order Date:</strong> ${new Date(orderDate).toLocaleString()}</p>
      </div>

      <div class="section">
        <div class="section-title">👤 Customer Information</div>
        ${customer.studentName ? `<p><strong>Student Entrepreneur:</strong> ${customer.studentName}</p>` : ''}
        <p><strong>Name:</strong> ${customer.name}</p>
        <p><strong>Email:</strong> ${customer.email}</p>
        ${customer.phone ? `<p><strong>Phone:</strong> ${customer.phone}</p>` : ''}
        ${customer.address ? `<p><strong>Address:</strong> ${customer.address}</p>` : ''}
      </div>

      <div class="section">
        <div class="section-title">🛒 Order Details</div>
        <div class="order-items">
          ${items.map(item => `
            <div class="item-row">
              <strong>${item.quantity}x ${item.name}</strong><br>
              <span style="color: #666;">$${item.price.toFixed(2)} each = $${item.subtotal.toFixed(2)}</span>
            </div>
          `).join('')}
          <div class="total">TOTAL: $${total.toFixed(2)}</div>
        </div>
      </div>

      ${customer.specialInstructions ? `
      <div class="section">
        <div class="section-title">📝 Special Instructions</div>
        <p>${customer.specialInstructions}</p>
      </div>
      ` : ''}

      <div class="footer">
        <p>This order was submitted through the E3 Achievement online order form.</p>
        <p><strong>E3 Achievement</strong> | 331 West Jackson St., Battle Creek</p>
        <p>📞 269-924-7247 | ✉️ imageinboxe3@gmail.com</p>
      </div>
    </div>
  </div>
</body>
</html>
      `
    };

    // Confirmation email to customer
    const customerEmailOptions = {
      from: process.env.EMAIL_USER,
      to: customer.email,
      subject: `Order Confirmation #${orderNumber} - E3 Achievement`,
      text: `
Thank you for your order!

Order Number: ${orderNumber}
Order Date: ${new Date(orderDate).toLocaleString()}

Your Order:
${itemsList}

Total: $${total.toFixed(2)}

We've received your order and will begin processing it shortly. ${customer.email ? 'A proof will be provided to your email if applicable.' : ''}

Allow up to 2 weeks for custom orders. Rush orders are available for +$5/item.

If you have any questions, please contact us:
📞 269-924-7247
✉️ imageinboxe3@gmail.com

Thank you for supporting E3 Achievement!
Education • Entrepreneurship • Empowerment
      `,
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .order-items { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .item-row { padding: 8px 0; border-bottom: 1px solid #eee; }
    .total { font-size: 1.3em; font-weight: bold; color: #ff6b35; text-align: right; margin-top: 15px; padding-top: 15px; border-top: 2px solid #ff6b35; }
    .info-box { background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ff6b35; margin: 15px 0; }
    .footer { text-align: center; color: #666; font-size: 0.9em; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Thank You for Your Order!</h1>
      <p>Order #${orderNumber}</p>
    </div>
    <div class="content">
      <p>Hi ${customer.name},</p>
      <p>We've received your order and will begin processing it shortly!</p>

      <div class="order-items">
        <h3>Your Order:</h3>
        ${items.map(item => `
          <div class="item-row">
            <strong>${item.quantity}x ${item.name}</strong><br>
            <span style="color: #666;">$${item.price.toFixed(2)} each = $${item.subtotal.toFixed(2)}</span>
          </div>
        `).join('')}
        <div class="total">TOTAL: $${total.toFixed(2)}</div>
      </div>

      <div class="info-box">
        <strong>📋 Important Information:</strong><br>
        • Allow up to 2 weeks for custom orders<br>
        • Rush orders available for +$5/item<br>
        • A proof will be provided if applicable
      </div>

      <p>If you have any questions about your order, please don't hesitate to contact us:</p>
      <p style="text-align: center;">
        <strong>📞 269-924-7247</strong><br>
        <strong>✉️ imageinboxe3@gmail.com</strong>
      </p>

      <div class="footer">
        <p><strong>E3 Achievement</strong></p>
        <p>Education • Entrepreneurship • Empowerment</p>
        <p>331 West Jackson St., Battle Creek</p>
      </div>
    </div>
  </div>
</body>
</html>
      `
    };

    // Send emails
    await Promise.all([
      transporter.sendMail(businessEmailOptions),
      transporter.sendMail(customerEmailOptions)
    ]);

    // Optional: Save to database here
    // await saveOrderToDatabase(orderNumber, customer, items, total, orderDate);

    res.status(200).json({ 
      success: true,
      orderNumber: orderNumber,
      message: 'Order submitted successfully' 
    });

  } catch (error) {
    console.error('Order submission error:', error);
    res.status(500).json({ 
      error: 'Failed to submit order. Please try again or contact us directly.' 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`E3 Achievement server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT}`);
});