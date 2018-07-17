const mysql = require('mysql');

let pool;
let poolCon;

exports.initPool = function (config) {
  if (!config) {
    throw new Error('Connection properties not found');
  }
  pool = mysql.createPool(config);
  poolCon = {};
  pool.on('acquire', (connection) => {
    const timer = setTimeout(() => {
      try {
        connection.release();
      } catch (e) {
        throw new Error('Error occured while releasing connection');
      }
    }, 50000);
    poolCon[connection.threadId] = timer;
  });
  pool.on('release', (connection) => {
    if (poolCon[connection.threadId]) {
      try {
        clearTimeout(poolCon[connection.threadId]);
      } catch (e) {
        throw new Error('Error occured while clearing timeout');
      }
    }
  });
  return new Promise((resolve, reject) => {
    pool.query('SELECT 1 + 1 AS solution', (error, results) => {
      if (error) {
        reject(error);
      }
      resolve();
    });
  });
}

const getConnection = function () {
  return new Promise((resolve, reject) => {
    if (!pool) {
      reject('My sql pool not initialized.');
    }
    pool.getConnection((err, con) => {
      if (err) {
        reject(err);
      } else {
        resolve(con);
      }
    });
  });
}

exports.getConnection;

exports.execute = function ({ sql, timeout = 40000, values = [] }) {
  return getConnection()
    .then(con => new Promise((resolve, reject) => {
      con.query({ sql, timeout, values }, (error, results, fields) => {
        con.release();
        if (error) {
          reject(error);
        } else {
          resolve({ results, fields });
        }
      });
    }));
}

exports.escape = function (str) {
  return mysql.escape(str);
}
