const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.resolve(__dirname, '../../../config.local.json');

function readJsonConfig(filePath) {
  if (!fs.existsSync(filePath)) return {};

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.warn(`No se pudo leer ${path.basename(filePath)}: ${err.message}`);
    return {};
  }
}

const fileConfig = readJsonConfig(CONFIG_PATH);
const years = Array.isArray(fileConfig.undp?.years)
  ? fileConfig.undp.years.map(Number).filter(Number.isInteger)
  : [];

module.exports = {
  undp: {
    apiKey: process.env.PNUD_API_KEY || fileConfig.undp?.apiKey || '',
    baseUrl: fileConfig.undp?.baseUrl || 'https://hdrdata.org/api',
    indicatorCode: fileConfig.undp?.indicatorCode || 'HDI',
    years: years.length > 0 ? years : [2023, 2022, 2021, 2020],
  },
  paths: {
    root: path.resolve(__dirname, '../../..'),
    public: path.resolve(__dirname, '../../../public'),
    img: path.resolve(__dirname, '../../../img'),
    govHistory: path.resolve(__dirname, '../../../data/generated/gov_history.json'),
  },
};
