const supabase = require("../Supabase/Client.js")

const FileModel = {
  async buscarPendentes() {
    return await supabase.from("arquivos").select("*").eq("status", "pendente")
  },

  async atualizarStatus(id, status) {
    return await supabase.from("arquivos").update({ status }).eq("id", id)
  }
}

module.exports = FileModel
