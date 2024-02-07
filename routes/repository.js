const express = require('express');
const router = express.Router();
const fuzzball = require('fuzzball');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/authenticator.js');
const db = require('../config/database.js');
const { secretKey } = require('../config/key.js');

router.post('/add', authenticateToken, async (req, res) => {
    try {
        const { title, author_name, publish_date, citation, embargo_period, doctype_name, department_name, degree_name, abstract } = req.body;

        const insertDocumentQuery = `
            INSERT INTO document (title, author_name, publish_date, citation, embargo_period, doctype_id, department_id, degree_id, abstract)
            VALUES (?, ?, ?, ?, ?, (SELECT doctype_id FROM doctype WHERE doctype_name = ?),
                                  (SELECT department_id FROM department WHERE department_name = ?),
                                  (SELECT degree_id FROM degree WHERE degree_name = ?),
                                  ?)
        `;
        await db.promise().execute(insertDocumentQuery, [title, author_name, publish_date, citation, embargo_period, doctype_name, department_name, degree_name, abstract]);

        res.status(201).json({
            message: 'Document inserted successfully!'
        });
    } catch (error) {
        console.error('Error inserting document:', error);
        res.status(500).json({
            error: 'Internal Server Error'
        });
    }
});

// Update Document
router.put('/update/:documentId', authenticateToken, async (req, res) => {
    try {
        const { title, author_name, publish_date, citation, embargo_period, doctype_name, department_name, degree_name, abstract } = req.body;
        const documentId = req.params.documentId;

        const updateDocumentQuery = `
            UPDATE document
            SET title = ?, author_name = ?, publish_date = ?, citation = ?, embargo_period = ?,
                doctype_id = (SELECT doctype_id FROM doctype WHERE doctype_name = ?),
                department_id = (SELECT department_id FROM department WHERE department_name = ?),
                degree_id = (SELECT degree_id FROM degree WHERE degree_name = ?),
                abstract = ?
            WHERE document_id = ?
        `;

        await db.promise().execute(updateDocumentQuery, [title, author_name, publish_date, citation, embargo_period, doctype_name, department_name, degree_name, abstract, documentId]);

        res.status(200).json({
            message: 'Document updated successfully!'
        });
    } catch (error) {
        console.error('Error updating document:', error);
        res.status(500).json({
            error: 'Internal Server Error'
        });
    }
});

// Delete then lagay sa Archive Table
router.delete('/delete/:documentId', authenticateToken, async (req, res) => {
    try {
          // Check if the user has the required role (role_id === 1)
        //   const userRoleId = req.params.role_id; // Assuming role_id is part of the user information
        //   if (userRoleId !== 1) {
        //       return res.status(403).json({
        //           error: 'Forbidden',
        //           message: 'You do not have permission to delete documents.'
        //       });
        // }

        const documentId = req.params.documentId;

        // Get the document to be deleted
        const [documentToDelete] = await db.promise().query('SELECT * FROM document WHERE document_id = ?', [documentId]);

        // Archive the document before deleting
        await db.promise().execute('INSERT INTO document_archive (document_id, title, author_name, publish_date, abstract, citation, embargo_period, doctype_id, department_id, degree_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            documentToDelete[0].document_id,
            documentToDelete[0].title,
            documentToDelete[0].author_name,
            documentToDelete[0].publish_date,
            documentToDelete[0].abstract,
            documentToDelete[0].citation,
            documentToDelete[0].embargo_period,
            documentToDelete[0].doctype_id,
            documentToDelete[0].department_id,
            documentToDelete[0].degree_id
        );

        // Delete the document from the document table
        await db.promise().execute('DELETE FROM document WHERE document_id = ?', [documentId]);

        res.status(200).json({
            message: 'Document deleted and archived successfully!'
        })

    } catch (error) {
        console.error('Error deleting and archiving document:', error);
        res.status(500).json({
            error: 'Internal Server Error'
        });
    }
});

// Search Documents
router.get('/search', authenticateToken, async (req, res) => {
    try {
        // const searchInput = req.query.q; // Assuming the search input is passed as a query parameter
        const searchInput = 'Node JS';

        if (!searchInput) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Search input is required.'
            });
        }

        // Fetch documents from the database
        const [documents] = await db.promise().query('SELECT * FROM document');

        // Perform fuzzy search using fuzzball
        const searchResults = fuzzball.extract(searchInput, documents, { scorer: fuzzball.token_set_ratio, cutoff: 50 });

        res.status(200).json({
            results: searchResults,
        });

        // // Format search results as plain text
        // const formattedResults = searchResults.map(result => `Document ID: ${result[2]} - Similarity Score: ${result[1]}`).join('\n');

        // res.type('text/plain').status(200).send(formattedResults);

    } catch (error) {
        console.error('Error searching documents:', error);
        res.status(500).json({
            error: 'Internal Server Error'
        });
    }
});

module.exports = router;