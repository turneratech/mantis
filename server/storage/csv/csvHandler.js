/**
 * CSV File Handler Utilities
 */

const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

const DATA_DIR = path.join(__dirname, '../../data');

// Ensure data directory exists
const ensureDataDir = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
};

ensureDataDir();

// Read CSV file and return array of objects
const readCSV = (filename) => {
  return new Promise((resolve, reject) => {
    const filepath = path.join(DATA_DIR, filename);
    
    if (!fs.existsSync(filepath)) {
      resolve([]);
      return;
    }

    const results = [];
    fs.createReadStream(filepath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
};

// Write array of objects to CSV file
const writeCSV = async (filename, data, headers) => {
  ensureDataDir();
  const filepath = path.join(DATA_DIR, filename);
  
  const csvWriter = createObjectCsvWriter({
    path: filepath,
    header: headers.map(h => ({ id: h, title: h }))
  });

  await csvWriter.writeRecords(data);
};

// Append a single record to CSV
const appendCSV = async (filename, record, headers) => {
  ensureDataDir();
  const filepath = path.join(DATA_DIR, filename);
  const fileExists = fs.existsSync(filepath);
  
  const csvWriter = createObjectCsvWriter({
    path: filepath,
    header: headers.map(h => ({ id: h, title: h })),
    append: fileExists
  });

  if (!fileExists) {
    await csvWriter.writeRecords([record]);
  } else {
    const existing = await readCSV(filename);
    if (existing.length === 0) {
      await csvWriter.writeRecords([record]);
    } else {
      const appendWriter = createObjectCsvWriter({
        path: filepath,
        header: headers.map(h => ({ id: h, title: h })),
        append: true
      });
      await appendWriter.writeRecords([record]);
    }
  }
};

// Check if CSV file exists
const fileExists = (filename) => {
  const filepath = path.join(DATA_DIR, filename);
  return fs.existsSync(filepath);
};

// Delete CSV file
const deleteFile = (filename) => {
  const filepath = path.join(DATA_DIR, filename);
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
    return true;
  }
  return false;
};

// Get data directory path
const getDataDir = () => DATA_DIR;

module.exports = {
  readCSV,
  writeCSV,
  appendCSV,
  fileExists,
  deleteFile,
  getDataDir,
  ensureDataDir,
  DATA_DIR
};
