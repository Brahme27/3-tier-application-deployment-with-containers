const transactionService = require('./TransactionService');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const moment = require('moment');

const app = express();
const port = 8080;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

// ROUTES FOR OUR API
// =======================================================

// Health Check
app.get('/health', (req, res) => {
    res.json("This is the health check for blue-3.0.0");
});

// ADD TRANSACTION
app.post('/transaction', (req, res) => {
    const amount = Number(req.body.amount);
    const desc = req.body.desc;

    if (!Number.isFinite(amount)) {
        return res.status(400).json({ message: 'amount must be a number' });
    }
    if (typeof desc !== 'string' || desc.trim().length === 0) {
        return res.status(400).json({ message: 'desc must be a non-empty string' });
    }

    const t = moment().unix();
    console.log('{ "timestamp" : %d, "msg" : "Adding Expense", "amount" : %d, "description" : "%s" }', t, amount, desc);

    transactionService.addTransaction(amount, desc, (err) => {
        if (err) {
            console.error('addTransaction failed:', err.message);
            return res.status(500).json({ message: 'something went wrong', error: err.message });
        }
        res.json({ message: 'added transaction successfully' });
    });
});

// GET ALL TRANSACTIONS
app.get('/transaction', (req, res) => {
    transactionService.getAllTransactions((err, results) => {
        if (err) {
            console.error('getAllTransactions failed:', err.message);
            return res.status(500).json({ message: 'could not get all transactions', error: err.message });
        }
        const transactionList = results.map(row => ({
            id: row.id,
            amount: row.amount,
            description: row.description
        }));
        const t = moment().unix();
        console.log('{ "timestamp" : %d, "msg" : "Getting All Expenses" }', t);
        console.log('{ "expenses" : %j }', transactionList);
        res.status(200).json({ result: transactionList });
    });
});

// DELETE ALL TRANSACTIONS
app.delete('/transaction', (req, res) => {
    transactionService.deleteAllTransactions((err) => {
        if (err) {
            console.error('deleteAllTransactions failed:', err.message);
            return res.status(500).json({ message: 'Deleting all transactions failed.', error: err.message });
        }
        const t = moment().unix();
        console.log('{ "timestamp" : %d, "msg" : "Deleted All Expenses" }', t);
        res.status(200).json({ message: 'delete function execution finished.' });
    });
});

// DELETE ONE TRANSACTION
app.delete('/transaction/id', (req, res) => {
    const id = Number(req.body.id);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ message: 'id must be an integer' });
    }

    transactionService.deleteTransactionById(id, (err) => {
        if (err) {
            console.error('deleteTransactionById failed:', err.message);
            return res.status(500).json({ message: 'error deleting transaction', error: err.message });
        }
        res.status(200).json({ message: `transaction with id ${id} deleted` });
    });
});

// GET SINGLE TRANSACTION
app.get('/transaction/id', (req, res) => {
    const id = Number(req.body.id);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ message: 'id must be an integer' });
    }

    transactionService.findTransactionById(id, (err, result) => {
        if (err) {
            console.error('findTransactionById failed:', err.message);
            return res.status(500).json({ message: 'error retrieving transaction', error: err.message });
        }
        if (!result || result.length === 0) {
            return res.status(404).json({ message: `transaction with id ${id} not found` });
        }
        res.status(200).json({
            id: result[0].id,
            amount: result[0].amount,
            desc: result[0].description
        });
    });
});

app.listen(port, () => {
    const t = moment().unix();
    console.log('{ "timestamp" : %d, "msg" : "App Started on Port %s" }', t, port);
});
