const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.resolve(__dirname, '../public')));

app.listen(5500, () => {
    console.log('Server is running at http://localhost:5500');
});