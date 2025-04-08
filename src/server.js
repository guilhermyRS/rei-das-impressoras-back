import { supabase } from './supabaseClient.js'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'

// Configurações
const DOWNLOAD_FOLDER = '../downloads'
const IMPRESSORA = 'Microsoft Print to PDF'
const SUMATRA_PATH = `"C:\\Users\\Guilhermy\\AppData\\Local\\SumatraPDF\\SumatraPDF.exe"` // <- AJUSTE AQUI se for diferente

if (!fs.existsSync(DOWNLOAD_FOLDER)) {
  fs.mkdirSync(DOWNLOAD_FOLDER)
}

function limparNomeArquivo(nome) {
  return nome
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^\w.()-]/g, '_') // remove símbolos especiais
}

async function baixarEImprimir(arquivo) {
  const { nome, path: caminho } = arquivo
  const nomeLimpo = limparNomeArquivo(nome)
  const localPath = path.join(DOWNLOAD_FOLDER, nomeLimpo)

  const { data: urlData, error: urlError } = supabase
    .storage
    .from(process.env.STORAGE_BUCKET)
    .getPublicUrl(caminho)

  if (urlError || !urlData?.publicUrl) {
    throw new Error("Erro ao gerar URL pública")
  }

  const url = urlData.publicUrl

  const response = await axios({ url, method: 'GET', responseType: 'stream' })
  const writer = fs.createWriteStream(localPath)
  response.data.pipe(writer)

  return new Promise((resolve, reject) => {
    writer.on('finish', () => {
      const comando = `${SUMATRA_PATH} -print-to "${IMPRESSORA}" -silent "${localPath}"`
      exec(comando, (err, stdout, stderr) => {
        if (err) {
          console.error("❌ Erro ao imprimir com SumatraPDF:", err)
          reject(err)
        } else {
          console.log("✅ Arquivo impresso com SumatraPDF:", nomeLimpo)
          resolve()
        }
      })
    })
    writer.on('error', reject)
  })
}

async function monitorarImpressao() {
  console.log(`🖨️  Monitor de impressão iniciado para impressora "${IMPRESSORA}"...`)

  while (true) {
    try {
      const { data: arquivos, error } = await supabase
        .from('arquivos')
        .select('*')
        .eq('status', 'pendente')

      if (error) {
        console.error("Erro ao buscar arquivos:", error.message)
      } else if (arquivos && arquivos.length > 0) {
        for (const arquivo of arquivos) {
          try {
            console.log("⏬ Baixando:", arquivo.nome)
            await baixarEImprimir(arquivo)

            const { error: updateError } = await supabase
              .from('arquivos')
              .update({ status: 'impresso' })
              .eq('id', arquivo.id)

            if (updateError) {
              console.error("Erro ao atualizar status no Supabase:", updateError.message)
            }
          } catch (e) {
            console.error("❌ Erro ao imprimir arquivo:", arquivo.nome, e)
          }
        }
      }
    } catch (err) {
      console.error("Erro inesperado:", err)
    }

    await new Promise(res => setTimeout(res, 5000))
  }
}

monitorarImpressao()
