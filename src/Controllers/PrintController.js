const FileModel = require("../Models/FileModel.js")
const PrintService = require("../Services/PrintService.js")

const PrintController = {
  async iniciarMonitoramento() {
    console.log("🖨️  Monitor de impressão iniciado...")

    const printer = new PrintService()

    while (true) {
      try {
        const { data: arquivos, error } = await FileModel.buscarPendentes()

        if (error) {
          console.error("Erro ao buscar arquivos:", error.message)
        } else if (arquivos?.length) {
          for (const arquivo of arquivos) {
            try {
              console.log("⏬ Baixando:", arquivo.nome)
              await printer.baixarEImprimir(arquivo)
              await FileModel.atualizarStatus(arquivo.id, "impresso")
            } catch (e) {
              console.error("Erro ao imprimir:", arquivo.nome, e)
            }
          }
        }
      } catch (err) {
        console.error("Erro inesperado:", err)
      }

      await new Promise((res) => setTimeout(res, 5000))
    }
  }
}

module.exports = PrintController
