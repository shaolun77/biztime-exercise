/** Routes for invoices of biztime. */

const express = require("express");
const ExpressError = require("../expressError")
const router = express.Router();
const db = require("../db");

// GET /invoices
router.get('/', async (req, res, next) => {
    try {
        const result = await db.query('SELECT id, comp_code FROM invoices');
        return res.json({ invoices: result.rows });
    } catch (err) {
        return next(err);
    }
});


// SELECT invoices.id, invoices.amt, invoices.paid, invoices.add_date, invoices.paid_date,
//        companies.code, companies.name, companies.description
// FROM invoices
// JOIN companies ON (invoices.comp_code = companies.code)
// WHERE id = $1

// GET /invoices/:id
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            `SELECT i.id, i.amt, i.paid, i.add_date, i.paid_date, 
                c.code, c.name, c.description
         FROM invoices AS i
         JOIN companies AS c ON (i.comp_code = c.code)
         WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            throw new ExpressError(`Invoice not found with id ${id}`, 404);
        }

        const { comp_code, ...invoiceData } = result.rows[0];
        const invoice = {
            ...invoiceData,
            company: { code: comp_code, name: result.rows[0].name, description: result.rows[0].description }
        };

        return res.json({ invoice });
    } catch (err) {
        return next(err);
    }
});

// POST /invoices
router.post('/', async (req, res, next) => {
    try {
        const { comp_code, amt } = req.body;
        const result = await db.query(
            'INSERT INTO invoices (comp_code, amt) VALUES ($1, $2) RETURNING id, comp_code, amt, paid, add_date, paid_date',
            [comp_code, amt]
        );
        const invoice = result.rows[0];
        return res.status(201).json({ invoice });
    } catch (err) {
        return next(err);
    }
});

// PUT /invoices/:id
router.put("/:id", async (req, res, next) => {
    try {
        const { id } = req.params;
        const { amt, paid } = req.body;

        const existingInvoice = await db.query(
            "SELECT * FROM invoices WHERE id = $1",
            [id]
        );

        if (existingInvoice.rows.length === 0) {
            throw new ExpressError(`Invoice not found with id ${id}`, 404);
        }

        let paidDate = null;

        if (paid === true && !existingInvoice.rows[0].paid) {
            paidDate = new Date();
        } else if (paid === false) {
            paidDate = null;
        } else {
            paidDate = existingInvoice.rows[0].paid_date;
        }

        const result = await db.query(
            "UPDATE invoices SET amt = $1, paid = $2, paid_date = $3 WHERE id = $4 RETURNING id, comp_code, amt, paid, add_date, paid_date",
            [amt, paid, paidDate, id]
        );

        return res.json({ invoice: result.rows[0] });
    } catch (err) {
        return next(err);
    }
});

// DELETE /invoices/:id
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await db.query('DELETE FROM invoices WHERE id = $1 RETURNING id', [id]);

        if (result.rows.length === 0) {
            throw new ExpressError(`Invoice not found with id ${id}`, 404);
        }

        return res.json({ status: 'deleted' });
    } catch (err) {
        return next(err);
    }
});

module.exports = router;