const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const userRoutes = require('./routes/user.js');
const repositoryRoutes = require('./routes/repository.js');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/user', userRoutes);
app.use('/repository', repositoryRoutes);

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/homepage.html');
});

app.listen(PORT, () => {
    console.log(`Server listening at http://localhost:${PORT}`);
});
