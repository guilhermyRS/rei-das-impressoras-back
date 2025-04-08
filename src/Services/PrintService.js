const fs = require("fs")
const path = require("path")
const axios = require("axios")
const { exec } = require("child_process")
const supabase = require("../Supabase/Client.js")
const PrinterConfig = require("../Config/PrinterConfig")

class PrintService {
  constructor() {
    if (!fs.existsSync(PrinterConfig.DOWNLOAD_FOLDER)) {
      fs.mkdirSync(PrinterConfig.DOWNLOAD_FOLDER)
    }
  }

  limparNomeArquivo(nome) {
    return nome
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w.()-]/g, "_")
  }

  getDownloadPath(nome) {
    return path.join(PrinterConfig.DOWNLOAD_FOLDER, nome)
  }

  async baixarEImprimir(arquivo) {
    const nomeLimpo = this.limparNomeArquivo(arquivo.nome)
    const localPath = this.getDownloadPath(nomeLimpo)

    const { data: urlData, error: urlError } = supabase
      .storage
      .from(process.env.STORAGE_BUCKET)
      .getPublicUrl(arquivo.path)

    if (urlError || !urlData?.publicUrl) {
      throw new Error("Erro ao gerar URL pública")
    }

    const response = await axios({ url: urlData.publicUrl, method: "GET", responseType: "stream" })
    const writer = fs.createWriteStream(localPath)
    response.data.pipe(writer)

    return new Promise((resolve, reject) => {
      writer.on("finish", () => {
        const comando = `"${PrinterConfig.SUMATRA_PATH}" -print-to "${PrinterConfig.PRINTER_NAME}" -silent "${localPath}"`
        exec(comando, (err) => {
          if (err) {
            console.error("❌ Erro ao imprimir:", err)
            reject(err)
          } else {
            console.log("✅ Arquivo impresso:", nomeLimpo)
            resolve()
          }
        })
      })
      writer.on("error", reject)
    })
  }
}

module.exports = PrintService
