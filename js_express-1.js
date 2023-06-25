const http = require('http');
const { parse } = require('url');
const fetch = require('node-fetch');
const fs = require('fs');
const yup = require('yup');

const server = http.createServer(async (req, res) => {
  const { pathname, query } = parse(req.url, true);

  // Handle GET /products?CUR=<currency_code> endpoint
  if (req.method === 'GET' && pathname === '/products') {
    const currencyCode = query.CUR;

    try {
      const conversionRate = await convertCurrency(1, currencyCode);

      try {
        const response = await fetch('https://api.escuelajs.co/api/v1/products');
        const products = await response.json();

        const categorizedProducts = {};
        products.forEach(product => {
          const categoryId = product.category.id;
          if (!categorizedProducts[categoryId]) {
            categorizedProducts[categoryId] = [];
          }
          categorizedProducts[categoryId].push({
            ...product,
            price: product.price * conversionRate,
          });
        });

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(categorizedProducts));
      } catch (error) {
        console.log(error);
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    } catch (error) {
      console.log(error);
      res.statusCode = 400;
      res.end('Invalid currency code');
    }
  }

  // Handle POST /products endpoint
  if (req.method === 'POST' && pathname === '/products') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const productData = JSON.parse(body);

        // Validate product data using Yup schema
        await productSchema.validate(productData);

        try {
          const response = await fetch('https://api.escuelajs.co/api/v1/products', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(productData),
          });

          if (response.ok) {
            const newProduct = await response.json();

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(newProduct));
          } else {
            res.statusCode = response.status;
            res.end('Error creating product');
          }
        } catch (error) {
          console.log(error);
          res.statusCode = 500;
          res.end('Internal Server Error');
        }
      } catch (error) {
        console.log(error);
        res.statusCode = 400;
        res.end('Invalid product data');
      }
    });
  }

  // Handle other routes
  res.statusCode = 404;
  res.end('Not Found');
});

// Start the server
const port = 8080;
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
