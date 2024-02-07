const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/authenticator.js');
const db = require('../config/database.js');
const { secretKey } = require('../config/key.js');

// Register User
router.post('/register', async (req, res) => {
    try {
        const{name, student_id, gbox, password, role_id} = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const insertUserQuery = 'INSERT INTO user (name, student_id, gbox, password, role_id) VALUES  (?, ?, ?, ?, ?)';
        await db.promise().execute(insertUserQuery, [name, student_id, gbox, hashedPassword, role_id]);

        res.status(201).json({
            message: 'User successfully registered'
        })
    }
    catch (error) {
        console.error('Error registration.', error);
        res.status(500).json({
            error: 'Internal Server Error'
        }); 
    };
});

// Login User
router.post('/login', async (req, res) => {
    try {
        const { role_id, student_id, password } = req.body;
        
        const getUserQuery = 'SELECT * FROM user WHERE student_id = ?';
        const [rows] = await db.promise().execute(getUserQuery, [student_id]);

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid student_id'});
        }

        const user = rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if(!passwordMatch) {
            return res.status(401).json({ error: 'Invalid username or password!'});
        }

        const token = jwt.sign({ role_id: role_id, userId: user.id, student_id: student_id }, secretKey, {expiresIn: '1h'});

        res.status(200).json({token});
        } catch (error) {
            console.error('Error logging in', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
});

// Get user by ID route
router.get('/:id', authenticateToken, (req, res) => {
    let user_id = req.params.id;

    const query = `
            SELECT user.*, role.role_name
            FROM user
            JOIN role ON user.role_id = role.role_id
            WHERE user.user_id = ?`;

    // Fetch role_id from the database based on user_id
    try {
        db.query('SELECT role_id FROM user WHERE user_id = ?', [user_id], async (err, result) => {
            if (err) {
                console.error('Error fetching role_id', err);
                return res.status(500).json({ message: 'Internal Server Error' });
            }

            if (result.length === 0) {
                return res.status(404).json({ error: 'User not found', message: 'User not found' });
            }

            const userRoleId = result[0].role_id;

            // Compare the fetched role_id with the expected value (1)
            if (userRoleId !== 1) {
                return res.status(400).json({ error: 'Unauthorized Admin Access Attempt!', message: 'Unauthorized' });
            }

            // If the user is an admin (role_id is 1), proceed to get user info
            try {
                db.query(query, [user_id], (err, result) => {
                    if (err) {
                        console.error('Error', err);
                        res.status(500).json({ message: 'Internal Server Error' });
                    } else {
                        res.status(200).json({ request: result });
                    }
                });
            } catch (error) {
                console.error('Error loading users', error);
                res.status(500).json({ error: 'Internal Server Error' });
            }
        });
    } catch (error) {
        console.error('Error fetching role_id', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});



// Update user by ID route
router.put('/user/:id', authenticateToken, async (req, res) => {
    let user_id = req.params.id;

    const { name, student_id, password, role_id } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    if (role_id !== 1) {
        return res.status(400).send({ error: 'Unauthorized Admin Access Attempt!', message: 'Unauthorized' });
    } else {
        try {
            const updateUserQuery = 'UPDATE user SET name = ?, student_id = ?, password = ? WHERE id = ?';
            await db.promise().execute(updateUserQuery, [name, student_id, hashedPassword, user_id]);

            console.log('Updated Success!');
            res.status(200).json({ message: 'User updated successfully' });
        } catch (error) {
            console.error('Error updating user', error);
            res.status(500).json({ error: error, message: 'Internal Server Error' });
        }
    }
});


module.exports = router;