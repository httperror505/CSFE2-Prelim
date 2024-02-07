const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'NCEANRepository',
});

db.connect((err) => {
    if (err) {
        console.log('Database Connection Error', err);
    } else {
        console.log('NCEANRepository Connection: 200 | OK');
    }
});

module.exports = db;
