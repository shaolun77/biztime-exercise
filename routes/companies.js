/** Routes for companies of biztime. */

const express = require("express");
const ExpressError = require("../expressError")
const slugify = require("slugify");
const router = express.Router();
const db = require("../db");

// GET /companies
router.get('/', async (req, res, next) => {
    try {
        const result = await db.query('SELECT code, name FROM companies');
        return res.json({ companies: result.rows });
    } catch (err) {
        return next(err);
    }
});


// GET /companies/:code
router.get("/:code", async function (req, res, next) {
    try {
        let code = req.params.code;

        const compResult = await db.query(
            `SELECT code, name, description
         FROM companies
         WHERE code = $1`,
            [code]
        );

        const invResult = await db.query(
            `SELECT id
         FROM invoices
         WHERE comp_code = $1`,
            [code]
        );

        if (compResult.rows.length === 0) {
            throw new ExpressError(`No such company: ${code}`, 404);
        }

        const company = compResult.rows[0];
        const invoices = invResult.rows;

        company.invoices = invoices.map(inv => inv.id);

        return res.json({ "company": company });
    } catch (err) {
        return next(err);
    }
});

//alternate:
// router.get('/:code', async (req, res, next) => {
//     try {
//       const { code } = req.params;
//       const result = await db.query(
//         `SELECT code, name, description
//          FROM companies
//          LEFT JOIN invoices ON (companies.code = invoices.comp_code)
//          WHERE code = $1`,
//         [code]
//       );

//       if (result.rows.length === 0) {
//         throw new ExpressError(`Company not found with code ${code}`, 404);
//       }

//       const company = {
//         code: result.rows[0].code,
//         name: result.rows[0].name,
//         description: result.rows[0].description,
//         invoices: result.rows.map((row) => row.id)
//       };

//       return res.json({ company });
//     } catch (err) {
//       return next(err);
//     }
//   });

// POST /companies
router.post('/', async (req, res, next) => {
    try {
        const { name, description } = req.body;
        const code = slugify(name, { lower: true });

        const result = await db.query('INSERT INTO companies (code, name, description) VALUES ($1, $2, $3) RETURNING code, name, description', [code, name, description]);
        return res.status(201).json({ company: result.rows[0] });
    } catch (err) {
        return next(err);
    }
});

// PUT /companies/:code
router.put('/:code', async (req, res, next) => {
    try {
        const { code } = req.params;
        const { name, description } = req.body;
        const result = await db.query('UPDATE companies SET name = $1, description = $2 WHERE code = $3 RETURNING code, name, description', [name, description, code]);

        if (result.rows.length === 0) {
            throw new ExpressError('Company not found', 404);
        }

        return res.json({ company: result.rows[0] });
    } catch (err) {
        return next(err);
    }
});

// DELETE /companies/:code
router.delete('/:code', async (req, res, next) => {
    try {
        const { code } = req.params;
        const result = await db.query('DELETE FROM companies WHERE code = $1 RETURNING code', [code]);

        if (result.rows.length === 0) {
            throw new ExpressError('Company not found', 404);
        }

        return res.json({ status: 'deleted' });
    } catch (err) {
        return next(err);
    }
});

module.exports = router;