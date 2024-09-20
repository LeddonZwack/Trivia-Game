const express = require('express');
const app = express();
const port = 5001;

// Basic route to test the server
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
