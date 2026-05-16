const dbcreds = require('./DbConfig');
const mysql = require('mysql2');

const con = mysql.createConnection({
    host: process.env.DB_HOST || dbcreds.DB_HOST,
    user: process.env.DB_USER || dbcreds.DB_USER,
    password: process.env.DB_PWD || dbcreds.DB_PWD,
    database: process.env.DB_DATABASE || dbcreds.DB_DATABASE
});

function addTransaction(amount, desc, callback) {
    const sql = 'INSERT INTO `transactions` (`amount`, `description`) VALUES (?, ?)';
    con.query(sql, [amount, desc], function (err, result) {
        callback(err, result);
    });
}

function getAllTransactions(callback) {
    const sql = 'SELECT * FROM transactions';
    con.query(sql, function (err, result) {
        callback(err, result);
    });
}

function findTransactionById(id, callback) {
    const sql = 'SELECT * FROM transactions WHERE id = ?';
    con.query(sql, [id], function (err, result) {
        callback(err, result);
    });
}

function deleteAllTransactions(callback) {
    const sql = 'DELETE FROM transactions';
    con.query(sql, function (err, result) {
        callback(err, result);
    });
}

function deleteTransactionById(id, callback) {
    const sql = 'DELETE FROM transactions WHERE id = ?';
    con.query(sql, [id], function (err, result) {
        callback(err, result);
    });
}

module.exports = {
    addTransaction,
    getAllTransactions,
    findTransactionById,
    deleteAllTransactions,
    deleteTransactionById
};
