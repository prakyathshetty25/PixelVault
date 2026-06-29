const test = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('../server');

test('signup and login work when MongoDB is unavailable', async () => {
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const signupResponse = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!'
      })
    });

    assert.equal(signupResponse.status, 201);
    const signupData = await signupResponse.json();
    assert.ok(signupData.token);
    assert.equal(signupData.user.email, 'test@example.com');

    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'Password123!'
      })
    });

    assert.equal(loginResponse.status, 200);
    const loginData = await loginResponse.json();
    assert.equal(loginData.user.email, 'test@example.com');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('checkout works with in-memory products when Razorpay is unavailable', async () => {
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const signupResponse = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Checkout User',
        email: 'checkout@example.com',
        password: 'Password123!'
      })
    });

    assert.equal(signupResponse.status, 201);
    const { token } = await signupResponse.json();

    const checkoutResponse = await fetch(`${baseUrl}/api/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ productId: 'product-1' })
    });

    assert.equal(checkoutResponse.status, 200);
    const checkoutData = await checkoutResponse.json();
    assert.equal(checkoutData.productId, 'product-1');
    assert.equal(checkoutData.amount, 2900);
    assert.ok(checkoutData.orderId);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
