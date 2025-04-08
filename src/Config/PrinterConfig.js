require("dotenv").config();
const path = require("path");

const PrinterConfig = {
  PRINTER_NAME: process.env.IMPRESSORA,
  SUMATRA_PATH: process.env.SUMATRA_PATH.replace(/^"|"$/g, ""),
  DOWNLOAD_FOLDER: path.resolve(__dirname, "../downloads") // <-- correto agora
};

module.exports = PrinterConfig;
