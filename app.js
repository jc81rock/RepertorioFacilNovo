
// Auto-clear stale invite
(function(){
 const h=window.location.hash||"";
 if(!h.includes("convite=")){
   ["convitePendente","codigoConvitePendente","convite","inviteCode"].forEach(k=>{
     try{localStorage.removeItem(k);}catch(e){}
     try{sessionStorage.removeItem(k);}catch(e){}
   });
 }
 window.addEventListener("hashchange",()=>{
   const hh=window.location.hash||"";
   if(!hh.includes("convite=")){
     ["convitePendente","codigoConvitePendente","convite","inviteCode"].forEach(k=>{
       try{localStorage.removeItem(k);}catch(e){}
       try{sessionStorage.removeItem(k);}catch(e){}
     });
   }
 });
})();

"use strict";
// CrossSet patch: YouTube URL opcional em músicas antigas e novas.

const REPERTORIO_FACIL = {
  urlApp: "https://crossset.app/",
  tabelas: {
    projetos: "projetos",
    integrantes: "integrantes",
    musicas: "musicas",
    repertorios: "repertorios",
    repertorioMusicas: "repertorio_musicas",
    progressoMusicas: "progresso_musicas",
    eventos: "eventos",
    convites: "convites_projeto"
  }
};

let appState = {
  usuario: null,
  sessao: null,
  telaAtual: "tela-login",
  historico: [],
  projetoAtual: null,
  integrantes: [],
  integranteEditandoId: null,
  musicas: [],
  musicaEditandoId: null,
  repertorios: [],
  repertorioEditandoId: null,
  repertorioMontandoId: null,
  repertorioMusicas: [],
  repertorioOrdenacaoSelecionadas: "manual",
  progressoMusicas: [],
  integrantesProjetoMusicas: [],
  meuIntegranteAtual: null,
  eventos: [],
  eventoEditandoId: null,
  conviteAtual: null,
  podeAdministrarProjeto: false
};

function sb() {
  if (typeof supabaseClient !== "undefined" && supabaseClient) {
    return supabaseClient;
  }

  alert("Supabase não carregado.");
  return null;
}

function elemento(id) {
  return document.getElementById(id);
}

function limparTexto(valor) {
  if (valor === null || valor === undefined) {
    return "";
  }

  return String(valor).trim();
}

function escaparHtml(valor) {
  if (valor === null || valor === undefined) {
    return "";
  }

  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizarUF(valor) {
  return limparTexto(valor).toUpperCase().slice(0, 2);
}

function mostrarTela(idTela, opcoes = {}) {
  const telaSelecionada = elemento(idTela);

  if (!telaSelecionada) {
    console.warn("Tela não encontrada:", idTela);
    return;
  }

  const telaAnterior = appState.telaAtual;

  document.querySelectorAll(".tela").forEach(function(tela) {
    tela.classList.remove("tela-ativa");
  });

  telaSelecionada.classList.add("tela-ativa");
  appState.telaAtual = idTela;

  if (opcoes.registrar !== false && telaAnterior !== idTela) {
    appState.historico.push(telaAnterior);
  }

  if (idTela === "tela-projetos") {
    carregarProjetos();
  }

  if (idTela === "tela-painel-projeto") {
    carregarPainelProjeto();
    abrirModuloPeloHash();
  }
}

function obterNomeUsuario(usuario) {
  if (!usuario) {
    return "Usuário";
  }

  return (
    usuario.user_metadata?.full_name ||
    usuario.user_metadata?.name ||
    usuario.user_metadata?.nome ||
    usuario.email ||
    "Usuário"
  );
}

function preencherUsuario(usuario) {
  const campo = elemento("nome-usuario");

  if (campo && usuario) {
    campo.textContent = "Olá, " + obterNomeUsuario(usuario);
  }
}

function mostrarMensagemCadastro(tipo, texto) {
  const mensagem = elemento("mensagem-cadastro");

  if (!mensagem) {
    return;
  }

  mensagem.className = "mensagem-cadastro " + tipo;
  mensagem.textContent = texto;
}

function limparMensagemCadastro() {
  const mensagem = elemento("mensagem-cadastro");

  if (!mensagem) {
    return;
  }

  mensagem.className = "mensagem-cadastro";
  mensagem.textContent = "";
}


function mostrarToast(texto) {
  const mensagem = limparTexto(texto);

  if (!mensagem) {
    return;
  }

  let toast = document.getElementById("crossset-toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "crossset-toast";
    toast.style.position = "fixed";
    toast.style.right = "22px";
    toast.style.bottom = "96px";
    toast.style.zIndex = "9999";
    toast.style.maxWidth = "340px";
    toast.style.padding = "13px 16px";
    toast.style.borderRadius = "14px";
    toast.style.background = "rgba(7, 17, 31, .96)";
    toast.style.border = "1px solid rgba(255,255,255,.16)";
    toast.style.color = "#ffffff";
    toast.style.fontSize = "14px";
    toast.style.fontWeight = "700";
    toast.style.boxShadow = "0 18px 60px rgba(0,0,0,.45)";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    toast.style.transition = "opacity .18s ease, transform .18s ease";
    document.body.appendChild(toast);
  }

  toast.textContent = mensagem;
  toast.style.opacity = "1";
  toast.style.transform = "translateY(0)";

  clearTimeout(window.__crosssetToastTimer);
  window.__crosssetToastTimer = setTimeout(function() {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
  }, 2600);
}

function limparCampos(container) {
  if (!container) {
    return;
  }

  container.querySelectorAll("input, select, textarea").forEach(function(campo) {
    campo.value = "";
  });
}

function limparEstadoProjetoAnterior() {
  appState.integrantes = [];
  appState.integranteEditandoId = null;
  appState.musicas = [];
  appState.musicaEditandoId = null;
  appState.repertorios = [];
  appState.repertorioEditandoId = null;
  appState.repertorioMontandoId = null;

  const botaoToggleEdicaoRepertorio = elemento("btn-toggle-edicao-repertorio");
  if (botaoToggleEdicaoRepertorio) {
    botaoToggleEdicaoRepertorio.addEventListener("click", function() {
      alternarEdicaoRepertorio();
    });
  }
  appState.repertorioMusicas = [];
  appState.repertorioRelacoesTodas = [];
  appState.progressoMusicas = [];
  appState.integrantesProjetoMusicas = [];
  appState.meuIntegranteAtual = null;
  appState.eventos = [];
  appState.eventoEditandoId = null;
  appState.conviteAtual = null;

  const area = elemento("area-modulo");
  if (area) {
    area.innerHTML = "";
  }
}

function salvarProjetoAtual(projeto) {
  const projetoAnteriorId = appState.projetoAtual?.id || localStorage.getItem("projeto_atual") || "";
  const novoProjetoId = projeto?.id || "";

  if ((!novoProjetoId && projetoAnteriorId) || (projetoAnteriorId && novoProjetoId && String(projetoAnteriorId) !== String(novoProjetoId))) {
    limparEstadoProjetoAnterior();
  }

  appState.projetoAtual = projeto || null;

  if (projeto && projeto.id) {
    localStorage.setItem("projeto_atual", projeto.id);
  } else {
    localStorage.removeItem("projeto_atual");
  }
}

function obterProjetoAtualId() {
  if (appState.projetoAtual && appState.projetoAtual.id) {
    return appState.projetoAtual.id;
  }

  return localStorage.getItem("projeto_atual");
}

function mesmoProjetoAtual(registro, projetoId) {
  if (!registro || !projetoId) {
    return false;
  }

  return String(registro.projeto_id || "") === String(projetoId);
}

function filtrarRegistrosDoProjetoAtual(lista, projetoId) {
  return (lista || []).filter(function(item) {
    return mesmoProjetoAtual(item, projetoId);
  });
}

function projetoAtualAindaEh(projetoId) {
  return String(obterProjetoAtualId() || "") === String(projetoId || "");
}


function salvarProjetoConviteCache(projeto) {
  if (!projeto || !projeto.id) {
    return;
  }

  try {
    localStorage.setItem("projeto_convite_atual", JSON.stringify({
      id: projeto.id,
      nome: projeto.nome || "Projeto musical",
      estilo: projeto.estilo || "Projeto musical",
      cidade: projeto.cidade || "",
      estado: projeto.estado || ""
    }));
  } catch (erro) {
    console.warn("Não foi possível salvar cache do projeto do convite.", erro);
  }
}

function obterProjetoConviteCache(idEsperado) {
  const bruto = localStorage.getItem("projeto_convite_atual");

  if (!bruto) {
    return null;
  }

  try {
    const projeto = JSON.parse(bruto);

    if (!projeto || !projeto.id) {
      return null;
    }

    if (idEsperado && projeto.id !== idEsperado) {
      return null;
    }

    return projeto;
  } catch (erro) {
    console.warn("Cache do projeto do convite inválido.", erro);
    return null;
  }
}

async function abrirProjetoSalvoSeExistir() {
  const projetoId = obterProjetoAtualId();

  if (!projetoId) {
    return false;
  }

  const cliente = sb();
  let projeto = null;

  if (cliente) {
    try {
      const { data } = await cliente
        .from(REPERTORIO_FACIL.tabelas.projetos)
        .select("*")
        .eq("id", projetoId)
        .maybeSingle();

      if (data) {
        projeto = data;
      }
    } catch (erro) {
      console.warn("Projeto salvo não pôde ser lido. Usando cache se existir.", erro);
    }
  }

  if (!projeto) {
    projeto = obterProjetoConviteCache(projetoId);
  }

  if (!projeto) {
    return false;
  }

  salvarProjetoAtual(projeto);
  salvarProjetoConviteCache(projeto);
  abrirPainelProjeto();
  return true;
}

function obterCodigoConviteDaURL() {
  const params = new URLSearchParams(window.location.search);
  const codigoBusca = limparTexto(params.get("convite"));

  if (codigoBusca) {
    return codigoBusca;
  }

  const hashOriginal = window.location.hash || "";
  const hashLimpo = hashOriginal.replace(/^#/, "").replace(/^\?/, "");

  if (hashLimpo) {
    const paramsHash = new URLSearchParams(hashLimpo);
    const codigoHash = limparTexto(paramsHash.get("convite"));

    if (codigoHash) {
      return codigoHash;
    }

    const matchIgual = hashLimpo.match(/convite=([^&]+)/);
    if (matchIgual) {
      return decodeURIComponent(matchIgual[1]);
    }

    const matchRota = hashLimpo.match(/convite\/([^/?&]+)/);
    if (matchRota) {
      return decodeURIComponent(matchRota[1]);
    }
  }

  const pathMatch = window.location.pathname.match(/convite\/([^/?&]+)/);
  return pathMatch ? decodeURIComponent(pathMatch[1]) : "";
}


function obterCodigoRepertorioDaURL() {
  const params = new URLSearchParams(window.location.search);
  const codigoBusca = limparTexto(params.get("repertorio"));

  if (codigoBusca) {
    return codigoBusca;
  }

  const hashOriginal = window.location.hash || "";
  const hashLimpo = hashOriginal.replace(/^#/, "").replace(/^\?/, "");

  if (hashLimpo) {
    const paramsHash = new URLSearchParams(hashLimpo);
    const codigoHash = limparTexto(paramsHash.get("repertorio"));

    if (codigoHash) {
      return codigoHash;
    }

    const matchIgual = hashLimpo.match(/repertorio=([^&]+)/);
    if (matchIgual) {
      return decodeURIComponent(matchIgual[1]);
    }

    const matchRota = hashLimpo.match(/repertorio\/([^/?&]+)/);
    if (matchRota) {
      return decodeURIComponent(matchRota[1]);
    }
  }

  const pathMatch = window.location.pathname.match(/repertorio\/([^/?&]+)/) || window.location.pathname.match(/r\/([^/?&]+)/);
  return pathMatch ? decodeURIComponent(pathMatch[1]) : "";
}

function salvarCodigoConvitePendente(codigo) {
  const codigoLimpo = limparTexto(codigo);

  if (!codigoLimpo) {
    return "";
  }

  try { localStorage.setItem("convite_pendente", codigoLimpo); } catch (erroLocal) {}
  try { sessionStorage.setItem("convite_pendente", codigoLimpo); } catch (erroSessao) {}

  return codigoLimpo;
}

function obterCodigoConvitePendente() {
  const codigoUrl = obterCodigoConviteDaURL();

  if (codigoUrl) {
    return salvarCodigoConvitePendente(codigoUrl);
  }

  return limparTexto(localStorage.getItem("convite_pendente") || sessionStorage.getItem("convite_pendente") || "");
}

function limparConvitePendente() {
  localStorage.removeItem("convite_pendente");
  sessionStorage.removeItem("convite_pendente");

  const url = new URL(window.location.href);
  let mudou = false;

  if (url.searchParams.has("convite")) {
    url.searchParams.delete("convite");
    mudou = true;
  }

  const hashAtual = window.location.hash || "";
  if (hashAtual.includes("convite=") || hashAtual.includes("convite/")) {
    url.hash = "";
    mudou = true;
  }

  if (mudou) {
    window.history.replaceState({}, document.title, url.pathname + url.search);
  }
}


async function aguardarSessaoSupabase(cliente, tempoMaximoMs = 7000) {
  const inicio = Date.now();

  while (Date.now() - inicio < tempoMaximoMs) {
    try {
      const { data, error } = await cliente.auth.getSession();

      if (!error && data && data.session) {
        return data;
      }
    } catch (erro) {
      console.warn("Aguardando sessão do Supabase...", erro);
    }

    await new Promise(function(resolve) {
      setTimeout(resolve, 250);
    });
  }

  try {
    const { data } = await cliente.auth.getSession();
    return data || { session: null };
  } catch (erroFinal) {
    console.warn("Não foi possível recuperar sessão após OAuth.", erroFinal);
    return { session: null };
  }
}

async function verificarSessao() {
  const cliente = sb();

  if (!cliente) {
    mostrarTela("tela-login", { registrar: false });
    return;
  }

  const codigoRepertorio = obterCodigoRepertorioDaURL();
  if (codigoRepertorio) {
    await carregarRepertorioPublico(codigoRepertorio);
    return;
  }

  const codigoConvite = obterCodigoConvitePendente();

  const data = codigoConvite
    ? await aguardarSessaoSupabase(cliente, 7000)
    : (await cliente.auth.getSession()).data;

  if (data && data.session) {
    appState.sessao = data.session;
    appState.usuario = data.session.user;
    preencherUsuario(appState.usuario);

    if (codigoConvite) {
      await carregarConvitePublico(codigoConvite);
      return;
    }

    if (await abrirProjetoSalvoSeExistir()) {
      return;
    }

    mostrarTela("tela-projetos", { registrar: false });
    return;
  }

  appState.sessao = null;
  appState.usuario = null;

  if (codigoConvite) {
    await carregarConvitePublico(codigoConvite);
    return;
  }

  mostrarTela("tela-login", { registrar: false });
}

async function entrarComGoogle() {
  const cliente = sb();

  if (!cliente) {
    return;
  }

  const { data, error } = await cliente.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: obterCodigoConvitePendente() ? (window.location.origin + window.location.pathname + "?convite=" + encodeURIComponent(obterCodigoConvitePendente())) : (window.location.origin + window.location.pathname),
      skipBrowserRedirect: true,
      queryParams: {
        prompt: "select_account"
      }
    }
  });

  if (error) {
    alert("Erro ao entrar com Google: " + error.message);
    return;
  }

  if (data && data.url) {
    window.location.href = data.url;
  }
}

async function entrarComEmail() {
  const cliente = sb();

  if (!cliente) {
    return;
  }

  const email = limparTexto(elemento("login-email")?.value);
  const senha = limparTexto(elemento("login-senha")?.value);

  if (!email || !senha) {
    alert("Preencha e-mail e senha.");
    return;
  }

  const { data, error } = await cliente.auth.signInWithPassword({
    email: email,
    password: senha
  });

  if (error) {
    alert("Erro ao entrar: " + error.message);
    return;
  }

  appState.sessao = data.session || null;
  appState.usuario = data.user || data.session?.user || null;

  preencherUsuario(appState.usuario);

  const codigoConvite = obterCodigoConvitePendente();
  if (codigoConvite) {
    salvarCodigoConvitePendente(codigoConvite);
    await carregarConvitePublico(codigoConvite);
    return;
  }

  mostrarTela("tela-projetos");
}

async function validarCadastro() {
  const cliente = sb();

  if (!cliente) {
    return;
  }

  const nome = limparTexto(elemento("cadastro-nome")?.value);
  const cidade = limparTexto(elemento("cadastro-cidade")?.value);
  const email = limparTexto(elemento("cadastro-email")?.value);
  const senha = limparTexto(elemento("cadastro-senha")?.value);
  const repetirSenha = limparTexto(elemento("cadastro-repetir-senha")?.value);

  limparMensagemCadastro();

  if (!nome) {
    mostrarMensagemCadastro("erro", "Informe seu nome.");
    return;
  }

  if (!cidade) {
    mostrarMensagemCadastro("erro", "Informe sua cidade.");
    return;
  }

  if (!email) {
    mostrarMensagemCadastro("erro", "Informe seu e-mail.");
    return;
  }

  if (!senha) {
    mostrarMensagemCadastro("erro", "Informe sua senha.");
    return;
  }

  if (senha.length < 6) {
    mostrarMensagemCadastro("erro", "A senha precisa ter pelo menos 6 caracteres.");
    return;
  }

  if (senha !== repetirSenha) {
    mostrarMensagemCadastro("erro", "As senhas não coincidem.");
    return;
  }

  const { data, error } = await cliente.auth.signUp({
    email: email,
    password: senha,
    options: {
      emailRedirectTo: REPERTORIO_FACIL.urlApp,
      data: {
        nome: nome,
        cidade: cidade
      }
    }
  });

  if (error) {
    mostrarMensagemCadastro("erro", "Erro ao criar conta: " + error.message);
    return;
  }

  const codigoConvite = obterCodigoConvitePendente();

  if (codigoConvite && data && data.session) {
    appState.sessao = data.session;
    appState.usuario = data.session.user;
    preencherUsuario(appState.usuario);
    await carregarConvitePublico(codigoConvite);
    return;
  }

  if (codigoConvite) {
    mostrarMensagemCadastro("sucesso", "Conta criada com sucesso. Faça login para aceitar o convite.");
    return;
  }

  mostrarMensagemCadastro("sucesso", "Conta criada com sucesso. Faça login para continuar.");
}

async function sair() {
  const cliente = sb();

  if (cliente) {
    await cliente.auth.signOut();
  }

  appState.sessao = null;
  appState.usuario = null;
  appState.projetoAtual = null;
  appState.historico = [];

  localStorage.removeItem("projeto_atual");

  mostrarTela("tela-login", { registrar: false });
}

async function carregarProjetos() {
  const grid = elemento("lista-projetos") || document.querySelector(".grid-projetos");
  const cliente = sb();

  if (!grid || !cliente) {
    return;
  }

  grid.innerHTML = `
    <div class="card-projeto">
      <h3>Carregando...</h3>
      <p>Buscando seus projetos.</p>
    </div>
  `;

  const { data: sessionData } = await cliente.auth.getSession();
  const usuario = sessionData.session?.user;

  if (!usuario) {
    mostrarTela("tela-login", { registrar: false });
    return;
  }

  const { data: projetosDono, error: erroProjetosDono } = await cliente
    .from(REPERTORIO_FACIL.tabelas.projetos)
    .select("*")
    .eq("usuario_id", usuario.id)
    .order("ultima_atualizacao", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (erroProjetosDono) {
    grid.innerHTML = `
      <div class="card-projeto">
        <h3>Erro ao carregar</h3>
        <p>${escaparHtml(erroProjetosDono.message)}</p>
      </div>
    `;
    return;
  }

  const { data: vinculos, error: erroVinculos } = await cliente
    .from(REPERTORIO_FACIL.tabelas.integrantes)
    .select("projeto_id")
    .eq("usuario_id", usuario.id);

  if (erroVinculos) {
    grid.innerHTML = `
      <div class="card-projeto">
        <h3>Erro ao carregar projetos vinculados</h3>
        <p>${escaparHtml(erroVinculos.message)}</p>
      </div>
    `;
    return;
  }

  const idsProjetosComoIntegrante = Array.from(new Set((vinculos || [])
    .map(function(vinculo) { return vinculo.projeto_id; })
    .filter(Boolean)
  ));

  let projetosIntegrante = [];

  if (idsProjetosComoIntegrante.length > 0) {
    const { data: projetosVinculados, error: erroProjetosVinculados } = await cliente
      .from(REPERTORIO_FACIL.tabelas.projetos)
      .select("*")
      .in("id", idsProjetosComoIntegrante)
      .order("ultima_atualizacao", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (erroProjetosVinculados) {
      grid.innerHTML = `
        <div class="card-projeto">
          <h3>Erro ao carregar projetos vinculados</h3>
          <p>${escaparHtml(erroProjetosVinculados.message)}</p>
        </div>
      `;
      return;
    }

    projetosIntegrante = projetosVinculados || [];
  }

  const projetosPorId = new Map();

  (projetosIntegrante || []).forEach(function(projeto) {
    if (projeto && projeto.id) {
      projetosPorId.set(projeto.id, Object.assign({}, projeto, { _crossset_dono: projeto.usuario_id === usuario.id }));
    }
  });

  (projetosDono || []).forEach(function(projeto) {
    if (projeto && projeto.id) {
      projetosPorId.set(projeto.id, Object.assign({}, projeto, { _crossset_dono: true }));
    }
  });

  const listaFinal = Array.from(projetosPorId.values()).sort(function(a, b) {
    const dataA = new Date(a.ultima_atualizacao || a.updated_at || a.created_at || 0).getTime();
    const dataB = new Date(b.ultima_atualizacao || b.updated_at || b.created_at || 0).getTime();
    return dataB - dataA;
  });

  montarListaProjetos(listaFinal);
}
function montarListaProjetos(lista) {
  const grid = elemento("lista-projetos") || document.querySelector(".grid-projetos");

  if (!grid) {
    return;
  }

  grid.innerHTML = "";

  if (lista.length === 0) {
    grid.innerHTML = `
      <div class="card-projeto projeto-vazio">
        <div class="icone-mais">+</div>
        <h3>Você ainda não possui projetos.</h3>
        <p>Clique em <strong>Novo Projeto</strong> para criar seu primeiro projeto musical.</p>
      </div>
    `;
    return;
  }

  const textoBotao = lista.length === 1 ? "Entrar no Projeto" : "Acessar Projeto";

  lista.forEach(function(projeto) {
    const botaoExcluirProjeto = projeto._crossset_dono === false ? "" : `
        <button class="btn-excluir-projeto" type="button" title="Excluir projeto" aria-label="Excluir projeto" data-excluir-projeto="${escaparHtml(projeto.id)}" style="position:absolute;top:14px;right:14px;width:28px;height:28px;border:0;background:transparent;color:#ffffff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0;">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style="width:18px;height:18px;display:block;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;">
            <path d="M3 6h18"></path>
            <path d="M8 6V4h8v2"></path>
            <path d="M19 6l-1 14H6L5 6"></path>
            <path d="M10 11v6"></path>
            <path d="M14 11v6"></path>
          </svg>
        </button>`;

    grid.innerHTML += `
      <div class="card-projeto projeto-item" style="position:relative;">
        ${botaoExcluirProjeto}
        <div class="projeto-item-conteudo">
          <span class="tag">${escaparHtml(projeto.tipo || "Projeto")}</span>
          <h3>${escaparHtml(projeto.nome || "Sem nome")}</h3>
          <p>${escaparHtml(projeto.estilo || "Sem estilo informado")}</p>

          <div class="detalhes">
            <span>
              ${escaparHtml(projeto.cidade || "")}
              ${projeto.estado ? " • " + escaparHtml(projeto.estado) : ""}
            </span>
            <span>Projeto cadastrado</span>
          </div>
        </div>

        <button class="botao-card abrir-projeto" type="button" data-id="${escaparHtml(projeto.id)}">
          ${textoBotao}
        </button>
      </div>
    `;
  });

  document.querySelectorAll(".abrir-projeto").forEach(function(botao) {
    botao.addEventListener("click", function() {
      acessarProjeto(botao.dataset.id);
    });
  });

  document.querySelectorAll(".btn-excluir-projeto").forEach(function(botao) {
    botao.addEventListener("click", function(evento) {
      evento.preventDefault();
      evento.stopPropagation();
      excluirProjeto(botao.dataset.excluirProjeto);
    });
  });
}

async function excluirProjeto(id) {
  const cliente = sb();

  if (!cliente || !id) {
    return;
  }

  const confirmar = confirm("Excluir este projeto? Esta ação não pode ser desfeita.");

  if (!confirmar) {
    return;
  }

  const { error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.projetos)
    .delete()
    .eq("id", id);

  if (error) {
    alert("Erro ao excluir projeto: " + error.message);
    return;
  }

  if (obterProjetoAtualId() === id) {
    salvarProjetoAtual(null);
  }

  await carregarProjetos();
}

async function criarProjeto() {
  const cliente = sb();

  if (!cliente) {
    return;
  }

  const nome = limparTexto(elemento("projeto-nome")?.value);
  const tipo = limparTexto(elemento("projeto-tipo")?.value);
  const estilo = limparTexto(elemento("projeto-estilo")?.value);
  const cidade = limparTexto(elemento("projeto-cidade")?.value);
  const estado = normalizarUF(elemento("projeto-estado")?.value);

  if (!nome) {
    alert("Informe o nome do projeto.");
    return;
  }

  const { data: sessionData } = await cliente.auth.getSession();
  const usuario = sessionData.session?.user;

  if (!usuario) {
    mostrarTela("tela-login", { registrar: false });
    return;
  }

  const { data, error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.projetos)
    .insert({
      usuario_id: usuario.id,
      nome: nome,
      tipo: tipo,
      estilo: estilo,
      cidade: cidade,
      estado: estado
    })
    .select()
    .single();

  if (error) {
    alert("Erro ao criar projeto: " + error.message);
    return;
  }

  limparCampos(elemento("tela-novo-projeto"));
  salvarProjetoAtual(data);
  mostrarTela("tela-projetos");
}

async function acessarProjeto(id) {
  const cliente = sb();

  if (!cliente || !id) {
    return;
  }

  const { data, error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.projetos)
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    alert("Erro ao abrir projeto: " + error.message);
    return;
  }

  salvarProjetoAtual(data);
  abrirPainelProjeto();
}

function abrirPainelProjeto() {
  garantirTelasInternas();
  mostrarTela("tela-painel-projeto");
}

function abrirUltimoProjetoModulo(modulo) {
  if (modulo === "eventos") {
    abrirEventosGeraisUsuario();
    return;
  }

  if (!appState.projetoAtual) {
    alert("Abra um projeto primeiro.");
    mostrarTela("tela-projetos");
    return;
  }

  mostrarTela("tela-painel-projeto");

  setTimeout(function() {
    abrirModulo(modulo);
  }, 50);
}

function definirMenuPrincipalEventosAtivo() {
  document.querySelectorAll("#tela-projetos .menu-inferior a").forEach(function(item) {
    item.classList.remove("ativo");
    if (limparTexto(item.textContent).toLowerCase() === "eventos") {
      item.classList.add("ativo");
    }
  });
}

async function abrirEventosGeraisUsuario() {
  const cliente = sb();
  const grid = elemento("lista-projetos");

  if (!cliente || !grid) {
    return;
  }

  mostrarTela("tela-projetos", { registrar: false });
  definirMenuPrincipalEventosAtivo();

  if (window.location.hash !== "#eventos") {
    history.pushState(null, "", "#eventos");
  }

  grid.innerHTML = `
    <div class="card-projeto" style="grid-column:1 / -1; min-height:150px;">
      <h3>Carregando eventos...</h3>
      <p>Buscando seus compromissos em todos os projetos.</p>
    </div>
  `;

  const { data: sessionData } = await cliente.auth.getSession();
  const usuario = sessionData.session?.user;

  if (!usuario) {
    mostrarTela("tela-login", { registrar: false });
    return;
  }

  const projetosPorId = new Map();

  const { data: meusProjetos } = await cliente
    .from(REPERTORIO_FACIL.tabelas.projetos)
    .select("id, nome")
    .eq("usuario_id", usuario.id);

  (meusProjetos || []).forEach(function(projeto) {
    if (projeto.id) {
      projetosPorId.set(projeto.id, projeto.nome || "Projeto");
    }
  });

  const { data: vinculos } = await cliente
    .from(REPERTORIO_FACIL.tabelas.integrantes)
    .select("projeto_id, projetos:projeto_id(id, nome)")
    .eq("usuario_id", usuario.id);

  (vinculos || []).forEach(function(vinculo) {
    const projeto = Array.isArray(vinculo.projetos) ? vinculo.projetos[0] : vinculo.projetos;
    if (vinculo.projeto_id) {
      projetosPorId.set(vinculo.projeto_id, projeto?.nome || projetosPorId.get(vinculo.projeto_id) || "Projeto");
    }
  });

  const projetoIds = Array.from(projetosPorId.keys());

  if (projetoIds.length === 0) {
    grid.innerHTML = `
      <div class="card-projeto projeto-vazio">
        <div class="icone-mais">📅</div>
        <h3>Nenhum evento encontrado.</h3>
        <p>Você ainda não participa de projetos com eventos cadastrados.</p>
      </div>
    `;
    return;
  }

  const { data: eventos, error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.eventos)
    .select("*")
    .in("projeto_id", projetoIds)
    .order("data_evento", { ascending: true })
    .order("hora_evento", { ascending: true });

  if (error) {
    grid.innerHTML = `
      <div class="card-projeto" style="grid-column:1 / -1; min-height:150px;">
        <h3>Erro ao carregar eventos</h3>
        <p>${escaparHtml(error.message)}</p>
      </div>
    `;
    return;
  }

  const listaEventos = (eventos || []).slice().sort(function(a, b) {
    const dataA = (a.data_evento || "9999-12-31") + " " + (a.hora_evento || "23:59");
    const dataB = (b.data_evento || "9999-12-31") + " " + (b.hora_evento || "23:59");
    return dataA.localeCompare(dataB);
  });

  if (listaEventos.length === 0) {
    grid.innerHTML = `
      <div class="card-projeto projeto-vazio">
        <div class="icone-mais">📅</div>
        <h3>Nenhum evento cadastrado.</h3>
        <p>Quando seus projetos tiverem eventos, eles aparecerão aqui por data.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = listaEventos.map(function(evento) {
    const nomeProjeto = projetosPorId.get(evento.projeto_id) || "Projeto";
    const data = formatarDataBR(evento.data_evento);
    const hora = evento.hora_evento ? " • " + escaparHtml(evento.hora_evento) : "";
    const local = evento.local ? escaparHtml(evento.local) : "Local não informado";
    const cidade = [evento.cidade, evento.estado].filter(Boolean).join(" - ");

    return `
      <div class="card-projeto projeto-item">
        <div class="projeto-item-conteudo">
          <span class="tag">${escaparHtml(nomeProjeto)}</span>
          <h3>${escaparHtml(evento.nome || "Evento")}</h3>
          <p><strong>Data:</strong> ${escaparHtml(data)}${hora}</p>
          <p><strong>Local:</strong> ${local}</p>
          ${cidade ? `<p><strong>Cidade:</strong> ${escaparHtml(cidade)}</p>` : ""}
          <div class="detalhes">
            <span>${escaparHtml(evento.status || "Agendado")}</span>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function carregarPainelProjeto() {
  const projeto = appState.projetoAtual;

  if (!projeto) {
    return;
  }

  const nome = elemento("titulo-projeto");
  const subtitulo = elemento("subtitulo-projeto");

  if (nome) {
    nome.textContent = projeto.nome || "Projeto";
  }

  if (subtitulo) {
    const cidade = projeto.cidade || "";
    const estado = projeto.estado ? " - " + projeto.estado : "";
    const estilo = projeto.estilo || "Projeto musical";

    subtitulo.textContent = estilo + (cidade ? " • " + cidade + estado : "");
  }

  carregarProximosEventosPainel();
}

async function carregarProximosEventosPainel() {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();
  const lista = elemento("lista-proximos-eventos-painel");

  if (!cliente || !projetoId || !lista) {
    return;
  }

  lista.innerHTML = `<p class="proximos-eventos-vazio">Carregando próximos eventos...</p>`;

  const hoje = new Date();
  const hojeLocal = [
    hoje.getFullYear(),
    String(hoje.getMonth() + 1).padStart(2, "0"),
    String(hoje.getDate()).padStart(2, "0")
  ].join("-");

  const { data, error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.eventos)
    .select("id, nome, data_evento, hora_evento, local, cidade, estado, status")
    .eq("projeto_id", projetoId)
    .gte("data_evento", hojeLocal)
    .neq("status", "Cancelado")
    .order("data_evento", { ascending: true })
    .order("hora_evento", { ascending: true })
    .limit(3);

  if (!projetoAtualAindaEh(projetoId)) {
    return;
  }

  if (error) {
    lista.innerHTML = `<p class="proximos-eventos-vazio">Não foi possível carregar os próximos eventos.</p>`;
    return;
  }

  const eventos = data || [];

  if (!eventos.length) {
    lista.innerHTML = `<p class="proximos-eventos-vazio">Nenhum evento agendado.</p>`;
    return;
  }

  lista.innerHTML = eventos.map(function(evento) {
    const dataFormatada = formatarDataBR(evento.data_evento);
    const horario = evento.hora_evento ? escaparHtml(evento.hora_evento) : "Horário não informado";
    const local = evento.local || [evento.cidade, evento.estado].filter(Boolean).join(" - ") || "Local não informado";

    return `
      <button class="proximo-evento-item" type="button" data-abrir-eventos-painel>
        <span class="proximo-evento-data">${escaparHtml(dataFormatada)}</span>
        <span class="proximo-evento-conteudo">
          <strong>${escaparHtml(evento.nome || "Evento")}</strong>
          <small>${horario} • ${escaparHtml(local)}</small>
        </span>
      </button>
    `;
  }).join("");

  lista.querySelectorAll("[data-abrir-eventos-painel]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      abrirModulo("eventos");
    });
  });
}

function garantirTelasInternas() {
  if (elemento("tela-painel-projeto")) {
    configurarEventosPainelProjeto();
    return;
  }

  const app = document.querySelector(".app");

  if (!app) {
    return;
  }

  const tela = document.createElement("section");
  tela.id = "tela-painel-projeto";
  tela.className = "tela";

  tela.innerHTML = `
    <style>
      .grid-modulos-painel {
        display: grid !important;
        grid-template-columns: repeat(4, minmax(190px, 1fr)) !important;
        gap: 12px !important;
        align-items: stretch;
        width: 100%;
      }

      .grid-modulos-painel .card-projeto {
        min-height: 165px !important;
        padding: 16px !important;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 8px;
      }

      .grid-modulos-painel .tag {
        align-self: flex-start;
        font-size: 11px !important;
        padding: 5px 10px !important;
      }

      .grid-modulos-painel h3 {
        font-size: 21px !important;
        margin: 2px 0 0 !important;
        line-height: 1.08;
      }

      .grid-modulos-painel p {
        font-size: 13px !important;
        line-height: 1.28 !important;
        margin: 0 !important;
      }

      .grid-modulos-painel .botao-card {
        min-height: 34px !important;
        padding: 7px 10px !important;
        font-size: 13px !important;
        margin-top: auto;
        border-radius: 12px;
      }

      .proximos-eventos-painel {
        margin-top: 12px;
        padding: 13px 14px !important;
        min-height: 0 !important;
        border-radius: 16px !important;
      }

      .proximos-eventos-topo {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 8px;
      }

      .proximos-eventos-topo h3 {
        margin: 0 !important;
        font-size: 17px !important;
        line-height: 1.1 !important;
      }

      .proximos-eventos-ver-todos {
        border: 0;
        background: transparent;
        color: #c4b5fd;
        cursor: pointer;
        font-size: 11px;
        font-weight: 800;
        padding: 3px 0;
      }

      .lista-proximos-eventos-painel {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 7px;
      }

      .proximo-evento-item {
        width: 100%;
        min-width: 0;
        min-height: 58px;
        border: 1px solid rgba(255,255,255,.10);
        border-radius: 11px;
        background: rgba(255,255,255,.045);
        color: #ffffff;
        padding: 8px 9px;
        cursor: pointer;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        align-items: center;
        gap: 9px;
        text-align: left;
      }

      .proximo-evento-item:hover {
        background: rgba(122,92,255,.14);
        border-color: rgba(122,92,255,.34);
      }

      .proximo-evento-data {
        color: #c4b5fd;
        font-size: 11px;
        font-weight: 800;
        white-space: nowrap;
      }

      .proximo-evento-conteudo {
        min-width: 0;
        display: grid;
        gap: 3px;
      }

      .proximo-evento-conteudo strong,
      .proximo-evento-conteudo small {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .proximo-evento-conteudo strong {
        color: #ffffff;
        font-size: 12.5px;
      }

      .proximo-evento-conteudo small {
        color: #9db2d6;
        font-size: 10.5px;
      }

      .proximos-eventos-vazio {
        grid-column: 1 / -1;
        margin: 0 !important;
        color: #9db2d6;
        font-size: 12px !important;
      }

      @media (max-width: 820px) {
        .lista-proximos-eventos-painel {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 980px) {
        .grid-modulos-painel {
          grid-template-columns: repeat(3, minmax(180px, 1fr)) !important;
        }
      }

      @media (max-width: 760px) {
        .grid-modulos-painel {
          grid-template-columns: repeat(2, minmax(160px, 1fr)) !important;
        }
      }

      @media (max-width: 520px) {
        .grid-modulos-painel {
          grid-template-columns: 1fr !important;
        }
      }
    </style>

    <div class="container">
      <header class="topo">
        <div class="topo-logo">
          <img src="logo.png" alt="CrossSet" />
          <div>
            <h1 id="titulo-projeto">Projeto</h1>
            <p id="subtitulo-projeto">Painel interno do projeto</p>
          </div>
        </div>

        <button class="botao-sair" id="btn-voltar-projetos" type="button">
          Voltar
        </button>
      </header>

      <section class="banner">
        <div>
          <h2>Gerenciar projeto</h2>
          <p>Cadastre integrantes, músicas, repertórios e eventos.</p>
        </div>
      </section>

      <section class="grid-projetos grid-modulos-painel">
        <div class="card-projeto">
          <span class="tag">Módulo</span>
          <h3>Integrantes</h3>
          <p>Cadastre músicos, funções e administradores do projeto.</p>
          <button class="botao-card" type="button" data-modulo="integrantes">Abrir</button>
        </div>

        <div class="card-projeto">
          <span class="tag">Módulo</span>
          <h3>Músicas</h3>
          <p>Cadastre músicas, tons, BPM, links e observações.</p>
          <button class="botao-card" type="button" data-modulo="musicas">Abrir</button>
        </div>

        <div class="card-projeto">
          <span class="tag">Módulo</span>
          <h3>Repertórios</h3>
          <p>Monte sequências para shows, ensaios e apresentações.</p>
          <button class="botao-card" type="button" data-modulo="repertorios">Abrir</button>
        </div>

        <div class="card-projeto">
          <span class="tag">Módulo</span>
          <h3>Eventos</h3>
          <p>Organize datas, locais, horários e repertórios usados.</p>
          <button class="botao-card" type="button" data-modulo="eventos">Abrir</button>
        </div>
      </section>

      <section class="card-projeto proximos-eventos-painel" aria-label="Próximos eventos">
        <div class="proximos-eventos-topo">
          <h3>Próximos eventos</h3>
          <button class="proximos-eventos-ver-todos" type="button" data-modulo="eventos">Ver todos →</button>
        </div>
        <div id="lista-proximos-eventos-painel" class="lista-proximos-eventos-painel">
          <p class="proximos-eventos-vazio">Carregando próximos eventos...</p>
        </div>
      </section>

      <section id="area-modulo" class="grid-projetos" style="margin-top:24px;"></section>

      <nav class="menu-inferior menu-crossset-icones" aria-label="Menu do projeto">
        <a id="menu-projeto-inicio" class="ativo" href="#inicio">
          <svg class="menu-crossset-icone" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 11.5 12 4l9 7.5"></path>
            <path d="M5.5 10.5V20h13v-9.5"></path>
            <path d="M9.5 20v-6h5v6"></path>
          </svg>
          <span>Início</span>
        </a>
        <a href="#integrantes" data-modulo="integrantes">
          <svg class="menu-crossset-icone" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="9" cy="8" r="3"></circle>
            <path d="M3.5 19c.4-4 2.4-6 5.5-6s5.1 2 5.5 6"></path>
            <circle cx="17.5" cy="9" r="2.5"></circle>
            <path d="M15.5 14c2.9 0 4.7 1.7 5 5"></path>
          </svg>
          <span>Integrantes</span>
        </a>
        <a href="#musicas" data-modulo="musicas">
          <svg class="menu-crossset-icone" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 18V6l10-2v12"></path>
            <ellipse cx="6.5" cy="18" rx="2.5" ry="2"></ellipse>
            <ellipse cx="16.5" cy="16" rx="2.5" ry="2"></ellipse>
          </svg>
          <span>Músicas</span>
        </a>
        <a href="#repertorios" data-modulo="repertorios">
          <svg class="menu-crossset-icone" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 6h11"></path>
            <path d="M9 12h11"></path>
            <path d="M9 18h11"></path>
            <circle cx="4.5" cy="6" r="1"></circle>
            <circle cx="4.5" cy="12" r="1"></circle>
            <circle cx="4.5" cy="18" r="1"></circle>
          </svg>
          <span>Repertórios</span>
        </a>
        <a href="#eventos" data-modulo="eventos">
          <svg class="menu-crossset-icone" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2"></rect>
            <path d="M7 3v4"></path>
            <path d="M17 3v4"></path>
            <path d="M3 10h18"></path>
          </svg>
          <span>Eventos</span>
        </a>
      </nav>
    </div>
  `;

  app.appendChild(tela);
  configurarEventosPainelProjeto();
}

function configurarEventosPainelProjeto() {
  const botaoVoltar = elemento("btn-voltar-projetos");

  if (botaoVoltar && !botaoVoltar.dataset.configurado) {
    botaoVoltar.dataset.configurado = "true";
    botaoVoltar.addEventListener("click", function() {
      limparHashModulo();
      mostrarTela("tela-projetos");
    });
  }

  document.querySelectorAll("#tela-painel-projeto [data-modulo]").forEach(function(botao) {
    if (botao.dataset.configurado) {
      return;
    }

    botao.dataset.configurado = "true";
    botao.addEventListener("click", function(evento) {
      if (botao.tagName === "A") {
        evento.preventDefault();
      }
      abrirModulo(botao.dataset.modulo);
    });
  });

  const menuInicio = elemento("menu-projeto-inicio");

  if (menuInicio && !menuInicio.dataset.configurado) {
    menuInicio.dataset.configurado = "true";
    menuInicio.addEventListener("click", function(evento) {
      evento.preventDefault();
      abrirInicioProjeto();
    });
  }
}

function limparHashModulo() {
  if (["#inicio", "#integrantes", "#musicas", "#repertorios", "#eventos"].includes(window.location.hash)) {
    history.replaceState(null, "", location.pathname + location.search);
  }
}

function definirMenuModulo(modulo) {
  document.querySelectorAll("#tela-painel-projeto .menu-inferior a").forEach(function(item) {
    item.classList.remove("ativo");
  });

  const botao = modulo === "inicio"
    ? elemento("menu-projeto-inicio")
    : document.querySelector("#tela-painel-projeto .menu-inferior a[data-modulo='" + modulo + "']");

  if (botao) {
    botao.classList.add("ativo");
  }
}

function abrirInicioProjeto() {
  limparAreaModulo();
  definirMenuModulo("inicio");
  carregarProximosEventosPainel();
  if (window.location.hash !== "#inicio") {
    history.pushState(null, "", "#inicio");
  }
}

function obterModuloDoHash() {
  const hash = (window.location.hash || "").replace("#", "").trim();
  return ["integrantes", "musicas", "repertorios", "eventos"].includes(hash) ? hash : "";
}

function abrirModuloPeloHash() {
  const modulo = obterModuloDoHash();
  if (modulo && appState.projetoAtual) {
    abrirModulo(modulo, { atualizarHash: false });
  }
}

window.addEventListener("resize", function() {
  if (elemento("lista-integrantes")) {
    requestAnimationFrame(ajustarAlturaListaIntegrantes);
  }

  if (elemento("lista-musicas")) {
    requestAnimationFrame(ajustarAlturaListaMusicas);
  }

  ativarBarrasInternasCrossSet();
  document.querySelectorAll(".crossset-scroll-customizada").forEach(atualizarBarraInternaCrossSet);
});

window.addEventListener("hashchange", function() {
  if (appState.telaAtual !== "tela-painel-projeto") {
    return;
  }

  if (window.location.hash === "#inicio") {
    limparAreaModulo();
    definirMenuModulo("inicio");
    return;
  }

  abrirModuloPeloHash();
});

function limparAreaModulo() {
  const area = elemento("area-modulo");

  if (area) {
    area.innerHTML = "";
  }
}

function abrirModulo(modulo, opcoes = {}) {
  if (!appState.projetoAtual) {
    alert("Abra um projeto primeiro.");
    mostrarTela("tela-projetos");
    return;
  }

  definirMenuModulo(modulo);

  if (opcoes.atualizarHash !== false && window.location.hash !== "#" + modulo) {
    history.pushState(null, "", "#" + modulo);
  }

  const area = elemento("area-modulo");
  if (area) {
    area.style.display = "block";
    area.style.width = "100%";
    area.style.gridColumn = "1 / -1";
  }

  if (modulo === "integrantes") {
    carregarIntegrantes();
    rolarParaModulo();
    return;
  }

  if (modulo === "musicas") {
    carregarMusicas();
    rolarParaModulo();
    return;
  }

  if (modulo === "repertorios") {
    carregarRepertorios();
    rolarParaModulo();
    return;
  }

  if (modulo === "eventos") {
    carregarEventos();
    rolarParaModulo();
    return;
  }
}

function rolarParaModulo() {
  const area = elemento("area-modulo");

  if (area) {
    setTimeout(function() {
      area.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }
}

function montarFormularioModulo(titulo, descricao, campos, botaoTexto, callback) {
  const area = elemento("area-modulo");

  if (!area) {
    return;
  }

  let html = `
    <div class="card-projeto">
      <span class="tag">Cadastro</span>
      <h3>${escaparHtml(titulo)}</h3>
      <p>${escaparHtml(descricao)}</p>
  `;

  campos.forEach(function(campo) {
    html += `
      <input
        id="${escaparHtml(campo.id)}"
        type="${escaparHtml(campo.tipo || "text")}"
        placeholder="${escaparHtml(campo.placeholder)}"
      />
    `;
  });

  html += `
      <button class="botao-card" id="btn-salvar-modulo" type="button">
        ${escaparHtml(botaoTexto)}
      </button>
    </div>
  `;

  area.innerHTML = html;

  const botao = elemento("btn-salvar-modulo");

  if (botao) {
    botao.addEventListener("click", callback);
  }
}

function montarListaModulo(titulo, itens, renderItem) {
  const area = elemento("area-modulo");

  if (!area) {
    return;
  }

  let html = area.innerHTML;

  html += `
    <div class="card-projeto">
      <span class="tag">Lista</span>
      <h3>${escaparHtml(titulo)}</h3>
  `;

  if (!itens || itens.length === 0) {
    html += `<p>Nenhum item cadastrado ainda.</p>`;
  } else {
    itens.forEach(function(item) {
      html += renderItem(item);
    });
  }

  html += `</div>`;
  area.innerHTML = html;
}

async function carregarIntegrantes() {
  const area = elemento("area-modulo");
  const projetoId = obterProjetoAtualId();

  if (!area) {
    return;
  }

  if (!projetoId) {
    area.innerHTML = `
      <div class="card-projeto">
        <h3>Projeto não encontrado</h3>
        <p>Volte para Meus Projetos e acesse o projeto novamente.</p>
      </div>
    `;
    return;
  }

  area.innerHTML = `
    <style>
      .modulo-integrantes {
        display: grid;
        grid-template-columns: minmax(280px, 380px) 1fr;
        gap: 18px;
        width: 100%;
      }

      .form-integrantes {
        display: grid;
        gap: 10px;
      }

      .form-integrantes label,
      .filtros-integrantes label {
        display: grid;
        gap: 4px;
        font-size: 12px;
        color: #e5e7eb;
      }

      .form-integrantes input,
      .form-integrantes select,
      .filtros-integrantes input,
      .filtros-integrantes select {
        width: 100%;
      }

      .linha-form-integrantes {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }

      .acoes-integrante {
        display: grid;
        gap: 8px;
        margin-top: 4px;
      }

      .btn-salvar-integrante-padrao,
      .btn-whatsapp-padrao {
        width: 100%;
        min-height: 42px !important;
        height: 42px !important;
        border: 0;
        border-radius: 13px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 9px;
        font-size: 15px;
        font-weight: 600;
        transition: transform .15s ease, filter .15s ease;
      }

      .btn-salvar-integrante-padrao {
        background: linear-gradient(135deg, #33c4ff, #7a5cff, #b84dff);
        color: #ffffff;
      }

      .btn-whatsapp-padrao {
        background: linear-gradient(135deg, #18c761, #16b957);
        color: #ffffff;
        box-shadow: 0 10px 24px rgba(24, 199, 97, .22);
      }

      .btn-salvar-integrante-padrao:hover,
      .btn-whatsapp-padrao:hover {
        transform: translateY(-1px);
        filter: brightness(1.07);
      }

      .btn-whatsapp-padrao .icone-whatsapp-padrao {
        width: 21px;
        height: 21px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 21px;
      }

      .btn-whatsapp-padrao .icone-whatsapp-padrao svg {
        width: 21px;
        height: 21px;
        display: block;
        fill: currentColor;
      }

      .btn-icone-integrante svg.icone-share-padrao {
        width: 15px;
        height: 15px;
        display: block;
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .botao-secundario-modulo {
        border: 0;
        border-radius: 12px;
        padding: 11px 14px;
        cursor: pointer;
        background: #eeeeee;
        color: #222;
        font-weight: 700;
      }

      .filtros-integrantes {
        display: grid;
        grid-template-columns: 1.4fr 1fr;
        gap: 10px;
        margin: 10px 0 14px;
      }

      .lista-integrantes {
        display: grid;
        gap: 10px;
        overflow-y: scroll;
        overflow-x: hidden;
        padding-right: 6px;
        overscroll-behavior: contain;
        scrollbar-width: thin;
        scrollbar-color: rgba(168, 85, 247, .48) rgba(255,255,255,.05);
      }

      .lista-integrantes::-webkit-scrollbar {
        width: 8px;
      }

      .lista-integrantes::-webkit-scrollbar-track {
        background: rgba(255,255,255,.05);
        border-radius: 999px;
      }

      .lista-integrantes::-webkit-scrollbar-thumb {
        background: rgba(168, 85, 247, .48);
        border-radius: 999px;
      }

      .lista-integrantes::-webkit-scrollbar-thumb:hover {
        background: rgba(168, 85, 247, .68);
      }

      .item-integrante {
        border: 1px solid rgba(255, 255, 255, .16);
        border-radius: 14px;
        padding: 14px;
        background: #1f2937;
        color: #f9fafb;
      }

      .item-integrante-topo {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
      }

      .foto-integrante-placeholder {
        width: 42px;
        height: 42px;
        min-width: 42px;
        border-radius: 50%;
        background: #6d28d9;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        color: #ffffff;
      }

      .dados-integrante {
        flex: 1;
      }

      .dados-integrante h4 {
        margin: 0 0 6px;
        color: #ffffff;
        font-size: 18px !important;
      }

      .dados-integrante p {
        margin: 3px 0;
        font-size: 14px !important;
        color: #d1d5db;
      }

      .dados-integrante strong {
        color: #f3f4f6;
      }

      .tag-admin {
        display: inline-block;
        margin-top: 8px;
        padding: 4px 9px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
        background: #7c3aed;
        color: #ffffff;
      }

      .tag-integrante {
        display: inline-block;
        margin-top: 8px;
        padding: 4px 9px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
        background: #374151;
        color: #e5e7eb;
      }

      .botoes-item-integrante {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .botoes-item-integrante button {
        border: 0;
        border-radius: 0;
        padding: 0;
        width: 24px;
        height: 24px;
        min-width: 24px;
        min-height: 24px;
        cursor: pointer;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0;
        background: transparent;
        color: #ffffff;
      }

      .botoes-item-integrante button:hover {
        background: transparent;
        color: #ffffff;
        transform: translateY(-1px);
      }

      .btn-icone-integrante svg,
      .btn-icone-integrante svg.icone-share-padrao {
        width: 17px !important;
        height: 17px !important;
        display: block !important;
        fill: none !important;
        stroke: currentColor !important;
        stroke-width: 2 !important;
        stroke-linecap: round !important;
        stroke-linejoin: round !important;
      }

      .btn-editar-integrante,
      .btn-excluir-integrante {
        background: transparent;
        color: #ffffff;
      }

      .desenvolvimento-integrante {
        margin-top: 12px;
        padding: 12px;
        border-radius: 13px;
        background: rgba(255, 255, 255, .055);
        border: 1px solid rgba(255, 255, 255, .10);
        display: grid;
        gap: 8px;
      }

      .desenvolvimento-integrante-topo {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        color: #f9fafb;
        font-size: 11px;
        font-weight: 700;
      }

      .desenvolvimento-integrante-percentual {
        font-size: 18px;
        font-weight: 800;
      }

      .desenvolvimento-integrante-percentual.verde { color: #22c55e; }
      .desenvolvimento-integrante-percentual.amarela { color: #facc15; }
      .desenvolvimento-integrante-percentual.vermelha { color: #ef4444; }

      .barra-desenvolvimento-integrante {
        width: 100%;
        height: 7px;
        border-radius: 999px;
        overflow: hidden;
        background: rgba(255, 255, 255, .10);
      }

      .barra-desenvolvimento-integrante span {
        display: block;
        height: 100%;
        border-radius: 999px;
        transition: width .2s ease;
      }

      .barra-desenvolvimento-integrante span.verde { background: #22c55e; }
      .barra-desenvolvimento-integrante span.amarela { background: #facc15; }
      .barra-desenvolvimento-integrante span.vermelha { background: #ef4444; }

      .desenvolvimento-integrante-contadores {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        font-size: 12px;
        color: #d1d5db;
      }

      .desenvolvimento-integrante-contadores strong {
        font-size: 14px;
        margin-right: 3px;
      }

      .contador-prontas strong { color: #22c55e; }
      .contador-estudo strong { color: #facc15; }
      .contador-nao strong { color: #ef4444; }

      .desenvolvimento-integrante-ajuda {
        color: #94a3b8;
        font-size: 11px;
        line-height: 1.35;
      }



      /* UX v0.9.19 - lista ultracompacta (1,5cm a 2cm) */
      .lista-musicas {
        display: block !important;
      }

      .item-musica {
        padding: 5px 2px !important;
        min-height: 58px !important;
        max-height: 72px !important;
        background: transparent !important;
        border: 0 !important;
        border-bottom: 1px solid rgba(255,255,255,.10) !important;
        border-radius: 0 !important;
        overflow: hidden !important;
      }

      .item-musica:hover {
        background: rgba(255,255,255,.035) !important;
      }

      .musica-linha-principal {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 8px !important;
        margin-bottom: 1px !important;
        min-height: 22px !important;
      }

      .musica-identidade {
        display: flex !important;
        align-items: center !important;
        gap: 7px !important;
        min-width: 0 !important;
        flex: 1 1 auto !important;
      }

      .musica-icone-mini {
        width: 18px !important;
        height: 18px !important;
        min-width: 18px !important;
        font-size: 10px !important;
      }

      .musica-nome-mini {
        font-size: 13px !important;
        max-width: 260px !important;
        line-height: 1.15 !important;
      }

      .musica-artista-mini {
        font-size: 11.5px !important;
        max-width: 190px !important;
        line-height: 1.15 !important;
      }

      .acoes-icone-musica {
        gap: 6px !important;
        flex: 0 0 auto !important;
      }

      .btn-acao-musica {
        width: 18px !important;
        height: 18px !important;
        color: #ffffff !important;
        opacity: .92 !important;
      }

      .btn-acao-musica svg {
        width: 15px !important;
        height: 15px !important;
      }

      .musica-linha-meta {
        margin-left: 25px !important;
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        flex-wrap: nowrap !important;
        overflow: hidden !important;
        white-space: nowrap !important;
        font-size: 11px !important;
        line-height: 1.15 !important;
        color: #cbd5e1 !important;
      }

      .musica-meta-chip,
      .musica-meta-link {
        display: inline-flex !important;
        align-items: center !important;
        gap: 3px !important;
        white-space: nowrap !important;
        flex: 0 0 auto !important;
      }

      .progresso-musica-inline {
        min-width: 72px !important;
        gap: 4px !important;
        flex: 0 0 auto !important;
      }

      .barra-fina-musica {
        width: 42px !important;
        height: 3px !important;
      }

      .preparacao-inline-musica {
        display: inline-flex !important;
        align-items: center !important;
        gap: 6px !important;
        min-width: 0 !important;
        overflow: hidden !important;
        white-space: nowrap !important;
        flex: 1 1 auto !important;
      }

      .status-integrante-mini,
      .status-integrante-mini-botao {
        gap: 2px !important;
        font-size: 10.5px !important;
        line-height: 1 !important;
      }

      .bolinha-status-mini {
        width: 7px !important;
        height: 7px !important;
        min-width: 7px !important;
      }

      .musica-linha-status {
        display: none !important;
      }

      .indicador-conteudo-musica {
        font-size: 11px !important;
      }

      .crossset-smart-card {
        margin-bottom: 0;
        padding: 14px;
        border-radius: 13px;
        background: linear-gradient(135deg, rgba(51,196,255,.10), rgba(122,92,255,.16), rgba(184,77,255,.10));
        border: 1px solid rgba(255,255,255,.12);
        display: grid;
        gap: 8px;
      }

      .crossset-smart-topo {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .crossset-smart-topo strong {
        color: #ffffff;
        font-size: 14px;
      }

      .crossset-smart-topo span {
        display: none;
      }

      .crossset-smart-busca {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 8px;
      }

      .crossset-smart-busca input {
        margin-bottom: 0 !important;
      }

      .crossset-smart-busca button,
      .crossset-smart-confirmar {
        min-height: 34px !important;
        height: 34px !important;
        border: 0;
        border-radius: 9px;
        padding: 0 12px;
        cursor: pointer;
        background: linear-gradient(135deg, #33c4ff, #7a5cff, #b84dff);
        color: #ffffff;
        font-size: 12px;
        font-weight: 800;
        white-space: nowrap;
      }

      .crossset-smart-sugestoes {
        display: grid;
        gap: 6px;
      }

      .crossset-smart-sugestao {
        width: 100%;
        border: 1px solid rgba(255,255,255,.10);
        border-radius: 10px;
        background: rgba(255,255,255,.055);
        color: #ffffff;
        text-align: left;
        padding: 8px;
        cursor: pointer;
        display: grid;
        gap: 2px;
      }

      .crossset-smart-sugestao:hover {
        background: rgba(122,92,255,.18);
      }

      .crossset-smart-sugestao strong,
      .crossset-smart-preview strong {
        font-size: 13px;
        color: #ffffff;
      }

      .crossset-smart-sugestao span,
      .crossset-smart-preview span {
        font-size: 11.5px;
        color: #cbd5e1;
      }

      .crossset-smart-preview {
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 12px;
        padding: 9px;
        background: rgba(7,17,31,.72);
        display: none;
        gap: 5px;
      }

      .crossset-smart-preview.ativo {
        display: grid;
      }

      .crossset-smart-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        margin: 4px 0;
      }

      .crossset-smart-meta span {
        padding: 4px 7px;
        border-radius: 999px;
        background: rgba(255,255,255,.075);
        border: 1px solid rgba(255,255,255,.10);
        color: #dbeafe;
        font-weight: 700;
      }

      .crossset-smart-ajuda {
        color: #9ca3af;
        font-size: 12px;
        line-height: 1.45;
      }

      .crossset-smart-legenda {
        margin-top: 10px;
        padding: 0;
        border-radius: 12px;
        background: rgba(255, 255, 255, .045);
        border: 1px solid rgba(255, 255, 255, .10);
        color: #d1d5db;
        overflow: hidden;
      }

      .crossset-smart-legenda-titulo {
        min-height: 38px;
        padding: 9px 11px 4px;
        display: flex;
        align-items: center;
        color: #ffffff;
        font-size: 13px;
        font-weight: 800;
        line-height: 1.2;
      }

      .crossset-smart-legenda-conteudo {
        padding: 0 11px 11px;
        display: grid;
        gap: 7px;
      }

      .crossset-smart-legenda p {
        margin: 0;
        color: #cbd5e1;
        font-size: 11.5px;
        line-height: 1.38;
      }

      .crossset-smart-legenda strong {
        color: #ffffff;
      }

      .card-lista-musicas-smart {
        overflow: hidden !important;
      }

      .card-lista-musicas-smart .lista-musicas {
        display: block !important;
        overflow-y: scroll !important;
        overflow-x: hidden !important;
        padding-right: 6px !important;
        overscroll-behavior: contain;
        scrollbar-gutter: stable;
        scrollbar-width: thin;
        scrollbar-color: rgba(168, 85, 247, .48) rgba(255,255,255,.05);
      }

      .card-lista-musicas-smart .lista-musicas::-webkit-scrollbar {
        width: 8px;
      }

      .card-lista-musicas-smart .lista-musicas::-webkit-scrollbar-track {
        background: rgba(255,255,255,.05);
        border-radius: 999px;
      }

      .card-lista-musicas-smart .lista-musicas::-webkit-scrollbar-thumb {
        background: rgba(168, 85, 247, .48);
        border-radius: 999px;
      }

      .card-lista-musicas-smart .lista-musicas::-webkit-scrollbar-thumb:hover {
        background: rgba(168, 85, 247, .68);
      }




      /* UX v0.9.20 - cadastro ultracompacto */
      .modulo-musicas > .card-projeto:first-child {
        align-self: start;
      }

      .modulo-musicas > .card-projeto:first-child label {
        margin: 0 !important;
      }

      .modulo-musicas > .card-projeto:first-child input,
      .modulo-musicas > .card-projeto:first-child textarea {
        box-shadow: none !important;
      }

      @media (max-width: 820px) {
        .modulo-integrantes,
        .linha-form-integrantes,
        .filtros-integrantes {
          grid-template-columns: 1fr;
        }

        .item-integrante-topo {
          flex-direction: column;
        }

        .lista-integrantes {
          max-height: none !important;
          overflow-y: visible !important;
          padding-right: 0 !important;
        }

        .botoes-item-integrante {
          justify-content: flex-start;
        }
      }
    </style>

    <div class="modulo-integrantes">
      <div class="card-projeto" id="card-form-repertorio">
        <span class="tag">Cadastro</span>
        <h3 id="titulo-form-integrante">Novo integrante</h3>
        <p>Cadastre músicos, funções, instrumentos e administradores do projeto.</p>

        <div class="form-integrantes">
          <label>
            Nome
            <input id="integrante-nome" type="text" placeholder="Nome do integrante" />
          </label>

          <div class="linha-form-integrantes">
            <label>
              Função
              <input id="integrante-funcao" type="text" placeholder="Ex: Vocalista" />
            </label>

            <label>
              Instrumento
              <input id="integrante-instrumento" type="text" placeholder="Ex: Guitarra" />
            </label>
          </div>

          <label id="campo-integrante-administrador">
            Administrador
            <select id="integrante-administrador">
              <option value="false">Não</option>
              <option value="true">Sim</option>
            </select>
          </label>

          <label>
            E-mail
            <input id="integrante-email" type="email" placeholder="email@exemplo.com" />
          </label>

          <label>
            Telefone
            <input id="integrante-telefone" type="tel" placeholder="(00) 00000-0000" />
          </label>

          <label>
            Chave Pix
            <input id="integrante-chave-pix" type="text" placeholder="CPF, celular, e-mail ou chave aleatória" />
          </label>

          <div class="acoes-integrante">
            <button class="btn-salvar-integrante-padrao" id="btn-salvar-integrante" type="button"><span class="icone-btn">✓</span><span>Salvar integrante</span></button>
            <button class="btn-whatsapp-padrao" id="btn-convidar-integrante" type="button" aria-label="Convidar pelo WhatsApp"><span class="icone-whatsapp-padrao" aria-hidden="true"><svg viewBox="0 0 32 32" focusable="false"><path d="M16.03 4.2c-6.46 0-11.72 5.1-11.72 11.38 0 2 .54 3.95 1.57 5.65L4.2 27.8l6.84-1.59a12.01 12.01 0 0 0 4.99 1.1c6.46 0 11.72-5.1 11.72-11.38S22.49 4.2 16.03 4.2Zm0 20.98c-1.6 0-3.17-.4-4.57-1.18l-.33-.18-3.92.91.96-3.72-.22-.36a9.36 9.36 0 0 1-1.43-4.98c0-5.1 4.27-9.25 9.51-9.25s9.51 4.15 9.51 9.25-4.27 9.51-9.51 9.51Zm5.24-6.93c-.29-.14-1.7-.82-1.96-.91-.26-.1-.45-.14-.64.14-.19.28-.74.91-.91 1.09-.17.19-.34.21-.62.07-.29-.14-1.21-.43-2.3-1.38-.85-.74-1.43-1.65-1.59-1.93-.17-.28-.02-.43.13-.57.13-.13.29-.34.43-.5.14-.17.19-.28.29-.47.1-.19.05-.35-.02-.5-.07-.14-.64-1.5-.88-2.05-.23-.55-.47-.47-.64-.48h-.55c-.19 0-.5.07-.76.35-.26.28-1 1-1 2.43s1.03 2.81 1.17 3c.14.19 2.03 3.02 4.92 4.23.69.29 1.22.46 1.64.59.69.21 1.31.18 1.8.11.55-.08 1.7-.68 1.94-1.34.24-.66.24-1.23.17-1.34-.07-.12-.26-.19-.55-.33Z"/></svg></span><span>Convidar pelo WhatsApp</span></button>
            <button class="botao-secundario-modulo" id="btn-cancelar-integrante" type="button" style="display:none;">Cancelar edição</button>
          </div>
        </div>
      </div>

      <div class="card-projeto">
        <span class="tag">Lista</span>
        <h3>Integrantes cadastrados</h3>
        <p>Pesquise, ordene, edite ou exclua integrantes deste projeto.</p>

        <div class="filtros-integrantes">
          <label>
            Pesquisar
            <input id="busca-integrantes" type="text" placeholder="Buscar por nome, função, instrumento, e-mail ou telefone" />
          </label>

          <label>
            Ordenar por
            <select id="ordenar-integrantes">
              <option value="nome">Nome</option>
              <option value="funcao">Função</option>
              <option value="instrumento">Instrumento</option>
              <option value="administrador">Administrador primeiro</option>
            </select>
          </label>
        </div>

        <div id="lista-integrantes" class="lista-integrantes">
          <p>Carregando integrantes...</p>
        </div>
      </div>
    </div>
  `;

  appState.integranteEditandoId = null;
  configurarEventosIntegrantes();
  await buscarIntegrantes();
}

function atualizarPermissaoAdministrativaIntegrantes(usuario) {
  const projeto = appState.projetoAtual || {};
  const emailUsuario = limparTexto(usuario?.email).toLowerCase();
  const meuRegistro = (appState.integrantes || []).find(function(item) {
    return (item.usuario_id && usuario?.id && String(item.usuario_id) === String(usuario.id)) ||
      (emailUsuario && limparTexto(item.email).toLowerCase() === emailUsuario);
  }) || null;

  appState.meuIntegranteAtual = meuRegistro;
  appState.podeAdministrarProjeto = Boolean(
    usuario?.id && projeto.usuario_id && String(projeto.usuario_id) === String(usuario.id)
  ) || Boolean(meuRegistro?.administrador === true);

  const campo = elemento("campo-integrante-administrador");
  const select = elemento("integrante-administrador");

  if (campo) {
    campo.style.display = appState.podeAdministrarProjeto ? "grid" : "none";
  }

  if (select) {
    select.disabled = !appState.podeAdministrarProjeto;
  }
}

function configurarEventosIntegrantes() {
  const botaoSalvar = elemento("btn-salvar-integrante");
  const botaoCancelar = elemento("btn-cancelar-integrante");
  const botaoConvidar = elemento("btn-convidar-integrante");
  const busca = elemento("busca-integrantes");
  const ordenar = elemento("ordenar-integrantes");

  if (botaoSalvar) {
    botaoSalvar.addEventListener("click", salvarIntegrante);
  }

  if (botaoCancelar) {
    botaoCancelar.addEventListener("click", limparFormularioIntegrante);
  }

  if (botaoConvidar) {
    botaoConvidar.addEventListener("click", gerarConviteIntegrante);
  }

  if (busca) {
    busca.addEventListener("input", renderizarListaIntegrantes);
  }

  if (ordenar) {
    ordenar.addEventListener("change", renderizarListaIntegrantes);
  }
}

async function buscarIntegrantes() {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();
  const lista = elemento("lista-integrantes");

  if (!cliente || !projetoId || !lista) {
    return;
  }

  const [integrantesResultado, musicasResultado, progressoResultado] = await Promise.all([
    cliente
      .from(REPERTORIO_FACIL.tabelas.integrantes)
      .select("*")
      .eq("projeto_id", projetoId)
      .order("nome", { ascending: true }),

    cliente
      .from(REPERTORIO_FACIL.tabelas.musicas)
      .select("id")
      .eq("projeto_id", projetoId),

    cliente
      .from(REPERTORIO_FACIL.tabelas.progressoMusicas)
      .select("*")
      .eq("projeto_id", projetoId)
  ]);

  if (!projetoAtualAindaEh(projetoId)) {
    return;
  }

  if (integrantesResultado.error) {
    lista.innerHTML = `<p>Erro ao carregar integrantes: ${escaparHtml(integrantesResultado.error.message)}</p>`;
    return;
  }

  if (musicasResultado.error) {
    lista.innerHTML = `<p>Erro ao carregar músicas do projeto: ${escaparHtml(musicasResultado.error.message)}</p>`;
    return;
  }

  if (progressoResultado.error) {
    lista.innerHTML = `<p>Erro ao carregar desenvolvimento dos integrantes: ${escaparHtml(progressoResultado.error.message)}</p>`;
    return;
  }

  appState.integrantes = integrantesResultado.data || [];
  appState.musicas = musicasResultado.data || [];
  appState.progressoMusicas = progressoResultado.data || [];

  const { data: sessaoAtual } = await cliente.auth.getSession();
  atualizarPermissaoAdministrativaIntegrantes(sessaoAtual.session?.user || null);
  renderizarListaIntegrantes();
}


function obterDesenvolvimentoIntegrante(integranteId) {
  const musicas = appState.musicas || [];
  const progresso = appState.progressoMusicas || [];
  const total = musicas.length;

  if (!total) {
    return {
      percentual: 0,
      cor: "vermelha",
      prontas: 0,
      emEstudo: 0,
      naoIniciadas: 0,
      total: 0
    };
  }

  let pontos = 0;
  let prontas = 0;
  let emEstudo = 0;

  musicas.forEach(function(musica) {
    const registro = progresso.find(function(item) {
      return item.musica_id === musica.id && item.integrante_id === integranteId;
    });

    const status = registro?.status || "nao_iniciada";

    if (status === "pronta") {
      pontos += 1;
      prontas += 1;
      return;
    }

    if (status === "em_estudo") {
      pontos += 0.5;
      emEstudo += 1;
    }
  });

  const percentual = Math.round((pontos / total) * 100);
  const naoIniciadas = Math.max(total - prontas - emEstudo, 0);
  let cor = "vermelha";

  if (percentual === 100) {
    cor = "verde";
  } else if (percentual >= 50) {
    cor = "amarela";
  }

  return { percentual, cor, prontas, emEstudo, naoIniciadas, total };
}

function montarDesenvolvimentoIntegrante(integranteId) {
  const dados = obterDesenvolvimentoIntegrante(integranteId);

  return `
    <div class="desenvolvimento-integrante" title="Desempenho: ${dados.percentual}% | Prontas: ${dados.prontas} | Em estudo: ${dados.emEstudo} | Não iniciadas: ${dados.naoIniciadas}">
      <div class="desenvolvimento-integrante-topo">
        <span>DESEMPENHO DO INTEGRANTE</span>
        <strong class="desenvolvimento-integrante-percentual ${dados.cor}">${dados.percentual}%</strong>
      </div>
      <div class="barra-desenvolvimento-integrante" aria-label="Desempenho ${dados.percentual}%">
        <span class="${dados.cor}" style="width:${dados.percentual}%"></span>
      </div>
      <div class="desenvolvimento-integrante-contadores">
        <span class="contador-prontas"><strong>${dados.prontas}</strong> prontas</span>
        <span class="contador-estudo"><strong>${dados.emEstudo}</strong> em estudo</span>
        <span class="contador-nao"><strong>${dados.naoIniciadas}</strong> não iniciadas</span>
      </div>
    </div>
  `;
}

function ajustarAlturaListaIntegrantes() {
  const lista = elemento("lista-integrantes");

  if (!lista || window.innerWidth <= 820) {
    return;
  }

  const itens = Array.from(lista.querySelectorAll(".item-integrante"));

  if (!itens.length) {
    lista.style.height = "auto";
    lista.style.maxHeight = "none";
    return;
  }

  const gap = 10;
  const quantidadeVisivel = Math.min(2, itens.length);
  let altura = 0;

  for (let i = 0; i < quantidadeVisivel; i += 1) {
    altura += itens[i].getBoundingClientRect().height;
  }

  if (quantidadeVisivel > 1) {
    altura += gap;
  }

  lista.style.height = Math.ceil(altura) + "px";
  lista.style.maxHeight = Math.ceil(altura) + "px";
}

function renderizarListaIntegrantes() {
  const lista = elemento("lista-integrantes");
  const busca = limparTexto(elemento("busca-integrantes")?.value).toLowerCase();
  const ordem = elemento("ordenar-integrantes")?.value || "nome";

  if (!lista) {
    return;
  }

  let itens = [...(appState.integrantes || [])];

  if (busca) {
    itens = itens.filter(function(item) {
      const texto = [
        item.nome,
        item.funcao,
        item.instrumento,
        item.email,
        item.telefone,
        item.chave_pix,
        item.administrador ? "administrador sim" : "administrador não"
      ].join(" ").toLowerCase();

      return texto.includes(busca);
    });
  }

  itens.sort(function(a, b) {
    if (ordem === "administrador") {
      return Number(b.administrador === true) - Number(a.administrador === true) || compararTexto(a.nome, b.nome);
    }

    if (ordem === "nome") {
      return compararTexto(a.nome, b.nome);
    }

    if (ordem === "funcao") {
      return compararTexto(a.funcao, b.funcao) || compararTexto(a.nome, b.nome);
    }

    if (ordem === "instrumento") {
      return compararTexto(a.instrumento, b.instrumento) || compararTexto(a.nome, b.nome);
    }

    return compararTexto(a.nome, b.nome);
  });

  if (itens.length === 0) {
    lista.innerHTML = `<p>Nenhum integrante encontrado.</p>`;
    return;
  }

  lista.innerHTML = itens.map(function(item) {
    const tipoIntegrante = item.administrador ? "Administrador" : "Integrante";
    const inicial = escaparHtml((item.nome || "?").slice(0, 1).toUpperCase());

    return `
      <div class="item-integrante">
        <div class="item-integrante-topo">
          <div class="foto-integrante-placeholder">${inicial}</div>
          <div class="dados-integrante">
            <h4>${escaparHtml(item.nome || "Sem nome")}</h4>
            <p><strong>Função:</strong> ${escaparHtml(item.funcao || "Não informada")}</p>
            <p><strong>Instrumento:</strong> ${escaparHtml(item.instrumento || "Não informado")}</p>
            ${item.email ? `<p><strong>E-mail:</strong> ${escaparHtml(item.email)}</p>` : ""}
            ${item.telefone ? `<p><strong>Telefone:</strong> ${escaparHtml(item.telefone)}</p>` : ""}
            ${item.chave_pix ? `<p><strong>Chave Pix:</strong> ${escaparHtml(item.chave_pix)}</p>` : ""}
            <span class="${item.administrador ? "tag-admin" : "tag-integrante"}">${tipoIntegrante}</span>
          </div>
          <div class="botoes-item-integrante">
            <button class="btn-icone-integrante" type="button" title="Editar" aria-label="Editar integrante" data-editar-integrante="${escaparHtml(item.id)}"><svg class="icone-share-padrao" viewBox="0 0 24 24" aria-hidden="true" focusable="false" style="width:15px;height:15px;display:block;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>
            <button class="btn-icone-integrante" type="button" title="Compartilhar" aria-label="Compartilhar integrante" data-compartilhar-integrante="${escaparHtml(item.id)}"><svg class="icone-share-padrao" viewBox="0 0 24 24" aria-hidden="true" focusable="false" style="width:15px;height:15px;display:block;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><path d="M8.7 10.6 15.3 6.4M8.7 13.4l6.6 4.2"></path></svg></button>
            <button class="btn-icone-integrante" type="button" title="Excluir" aria-label="Excluir integrante" data-excluir-integrante="${escaparHtml(item.id)}"><svg class="icone-share-padrao" viewBox="0 0 24 24" aria-hidden="true" focusable="false" style="width:15px;height:15px;display:block;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 16h10l1-16"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></button>
          </div>
        </div>
        ${montarDesenvolvimentoIntegrante(item.id)}
      </div>
    `;
  }).join("");

  requestAnimationFrame(function() {
    ajustarAlturaListaIntegrantes();
    ativarBarrasInternasCrossSet();
  });

  lista.querySelectorAll("[data-editar-integrante]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      editarIntegrante(botao.dataset.editarIntegrante);
    });
  });

  lista.querySelectorAll("[data-compartilhar-integrante]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      compartilharIntegrante(botao.dataset.compartilharIntegrante);
    });
  });

  lista.querySelectorAll("[data-excluir-integrante]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      excluirIntegrante(botao.dataset.excluirIntegrante);
    });
  });
}

function compartilharIntegrante(id) {
  const item = (appState.integrantes || []).find(function(integrante) {
    return integrante.id === id;
  });

  if (!item) {
    alert("Integrante não encontrado.");
    return;
  }

  const projeto = appState.projetoAtual || {};
  const dados = obterDesenvolvimentoIntegrante(id);
  const mensagem = [
    "Integrante CrossSet",
    "Projeto: " + (projeto.nome || "Projeto musical"),
    "Nome: " + (item.nome || "Sem nome"),
    "Função: " + (item.funcao || "Não informada"),
    item.chave_pix ? "Chave Pix: " + item.chave_pix : "",
    "Perfil: " + (item.administrador ? "Administrador" : "Integrante"),
    "Desenvolvimento: " + dados.percentual + "%"
  ].join("\n");

  try {
    if (navigator.share) {
      navigator.share({
        title: "Integrante CrossSet",
        text: mensagem
      });
      return;
    }
  } catch (erroCompartilhar) {
    console.warn("Compartilhamento cancelado ou indisponível.", erroCompartilhar);
  }

  window.open("https://wa.me/?text=" + encodeURIComponent(mensagem), "_blank");
}

function compararTexto(a, b) {
  return limparTexto(a).localeCompare(limparTexto(b), "pt-BR", { sensitivity: "base" });
}

function obterDadosFormularioIntegrante() {
  return {
    nome: limparTexto(elemento("integrante-nome")?.value),
    funcao: limparTexto(elemento("integrante-funcao")?.value),
    instrumento: limparTexto(elemento("integrante-instrumento")?.value),
    administrador: elemento("integrante-administrador")?.value === "true",
    email: limparTexto(elemento("integrante-email")?.value),
    telefone: limparTexto(elemento("integrante-telefone")?.value),
    chave_pix: limparTexto(elemento("integrante-chave-pix")?.value)
  };
}

function preencherFormularioIntegrante(item) {
  if (!item) {
    return;
  }

  elemento("integrante-nome").value = item.nome || "";
  elemento("integrante-funcao").value = item.funcao || "";
  elemento("integrante-instrumento").value = item.instrumento || "";
  elemento("integrante-administrador").value = item.administrador ? "true" : "false";
  elemento("integrante-email").value = item.email || "";
  elemento("integrante-telefone").value = item.telefone || "";
  const campoChavePix = elemento("integrante-chave-pix");
  if (campoChavePix) {
    campoChavePix.value = item.chave_pix || "";
  }

  const titulo = elemento("titulo-form-integrante");
  const botaoSalvar = elemento("btn-salvar-integrante");
  const botaoCancelar = elemento("btn-cancelar-integrante");

  if (titulo) {
    titulo.textContent = "Editar integrante";
  }

  if (botaoSalvar) {
    botaoSalvar.textContent = "Salvar alterações";
  }

  if (botaoCancelar) {
    botaoCancelar.style.display = "inline-block";
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function limparFormularioIntegrante() {
  appState.integranteEditandoId = null;

  [
    "integrante-nome",
    "integrante-funcao",
    "integrante-instrumento",
    "integrante-email",
    "integrante-telefone",
    "integrante-chave-pix"
  ].forEach(function(id) {
    const campo = elemento(id);

    if (campo) {
      campo.value = "";
    }
  });

  const administrador = elemento("integrante-administrador");
  const titulo = elemento("titulo-form-integrante");
  const botaoSalvar = elemento("btn-salvar-integrante");
  const botaoCancelar = elemento("btn-cancelar-integrante");

  if (administrador) {
    administrador.value = "false";
  }

  if (titulo) {
    titulo.textContent = "Novo integrante";
  }

  if (botaoSalvar) {
    botaoSalvar.innerHTML = `<span class="icone-btn">✓</span><span>Salvar integrante</span>`;
  }

  if (botaoCancelar) {
    botaoCancelar.style.display = "none";
  }
}

async function salvarIntegrante() {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();

  if (!cliente || !projetoId) {
    return;
  }

  const dados = obterDadosFormularioIntegrante();

  if (!dados.nome) {
    alert("Informe o nome do integrante.");
    return;
  }

  const { data: sessionData } = await cliente.auth.getSession();
  const usuario = sessionData.session?.user;

  if (!usuario) {
    mostrarTela("tela-login", { registrar: false });
    return;
  }

  const integranteEditandoId = appState.integranteEditandoId;

  let resultado;

  if (integranteEditandoId) {
    const integranteAtual = (appState.integrantes || []).find(function(item) {
      return String(item.id) === String(integranteEditandoId);
    });

    const payloadEdicao = {
      nome: dados.nome,
      funcao: dados.funcao,
      instrumento: dados.instrumento,
      administrador: appState.podeAdministrarProjeto ? dados.administrador : Boolean(integranteAtual?.administrador),
      email: dados.email,
      telefone: dados.telefone,
      chave_pix: dados.chave_pix
    };

    resultado = await cliente
      .from(REPERTORIO_FACIL.tabelas.integrantes)
      .update(payloadEdicao)
      .eq("id", integranteEditandoId)
      .eq("projeto_id", projetoId)
      .select("*")
      .maybeSingle();
  } else {
    const emailUsuarioLogado = limparTexto(usuario.email).toLowerCase();
    const emailIntegrante = limparTexto(dados.email).toLowerCase();
    const usuarioIdIntegrante = emailIntegrante && emailUsuarioLogado && emailIntegrante === emailUsuarioLogado
      ? usuario.id
      : null;

    if (usuarioIdIntegrante) {
      const { data: integranteExistente, error: erroVerificarIntegrante } = await cliente
        .from(REPERTORIO_FACIL.tabelas.integrantes)
        .select("id")
        .eq("projeto_id", projetoId)
        .eq("usuario_id", usuarioIdIntegrante)
        .maybeSingle();

      if (erroVerificarIntegrante) {
        console.error("Erro ao verificar integrante existente:", erroVerificarIntegrante);
        alert("Não foi possível verificar este integrante agora. Tente novamente.");
        return;
      }

      if (integranteExistente) {
        alert("Este usuário já faz parte deste projeto. Use a opção editar para alterar os dados dele.");
        return;
      }
    }

    const payloadNovo = {
      projeto_id: projetoId,
      usuario_id: usuarioIdIntegrante,
      nome: dados.nome,
      funcao: dados.funcao,
      instrumento: dados.instrumento,
      administrador: appState.podeAdministrarProjeto ? dados.administrador : false,
      email: dados.email,
      telefone: dados.telefone,
      chave_pix: dados.chave_pix
    };

    resultado = await cliente
      .from(REPERTORIO_FACIL.tabelas.integrantes)
      .insert(payloadNovo)
      .select("*")
      .maybeSingle();
  }

  if (resultado.error) {
    console.error("Erro ao salvar integrante:", resultado.error);

    const mensagemErro = limparTexto(resultado.error.message).toLowerCase();
    const codigoErro = limparTexto(resultado.error.code);

    if (codigoErro === "23505" || mensagemErro.includes("integrantes_projeto_usuario_unico") || mensagemErro.includes("duplicate key")) {
      alert("Este usuário já faz parte deste projeto. Use a opção editar para alterar os dados dele.");
      return;
    }

    alert("Não foi possível salvar o integrante agora. Verifique os dados e tente novamente.");
    return;
  }

  if (integranteEditandoId && !resultado.data) {
    alert("Não foi possível atualizar o integrante. Reabra o projeto e tente novamente.");
    return;
  }

  if (resultado.data) {
    const indice = (appState.integrantes || []).findIndex(function(item) {
      return item.id === resultado.data.id;
    });

    if (indice >= 0) {
      appState.integrantes[indice] = resultado.data;
    } else {
      appState.integrantes = [resultado.data].concat(appState.integrantes || []);
    }
  }

  limparFormularioIntegrante();
  await buscarIntegrantes();
  renderizarListaIntegrantes();
}

function editarIntegrante(id) {
  const item = (appState.integrantes || []).find(function(integrante) {
    return integrante.id === id;
  });

  if (!item) {
    alert("Integrante não encontrado.");
    return;
  }

  appState.integranteEditandoId = id;
  preencherFormularioIntegrante(item);
}

async function excluirIntegrante(id) {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();

  if (!cliente || !id || !projetoId) {
    return;
  }

  const confirmar = confirm("Excluir este integrante?");

  if (!confirmar) {
    return;
  }

  const { data: sessionData } = await cliente.auth.getSession();
  const usuario = sessionData.session?.user;

  if (!usuario) {
    mostrarTela("tela-login", { registrar: false });
    return;
  }

  const { error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.integrantes)
    .delete()
    .eq("id", id)
    .eq("projeto_id", projetoId);

  if (error) {
    alert("Erro ao excluir integrante: " + error.message);
    return;
  }

  if (appState.integranteEditandoId === id) {
    limparFormularioIntegrante();
  }

  await buscarIntegrantes();
}

async function criarIntegrante() {
  await salvarIntegrante();
}

function gerarCodigoConvite() {
  const parteTempo = Date.now().toString(36).toUpperCase();
  const parteAleatoria = Math.random().toString(36).slice(2, 8).toUpperCase();
  return (parteAleatoria + parteTempo).slice(0, 12);
}

async function gerarConviteIntegrante() {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();

  if (!cliente || !projetoId) {
    return;
  }

  const { data: sessionData } = await cliente.auth.getSession();
  const usuario = sessionData.session?.user;

  if (!usuario) {
    mostrarTela("tela-login", { registrar: false });
    return;
  }

  const projeto = appState.projetoAtual || {};
  const codigo = gerarCodigoConvite();
  const nomeAdmin = obterNomeUsuario(usuario);
  const nomeProjeto = projeto.nome || "Projeto musical";

  const link = REPERTORIO_FACIL.urlApp + "?convite=" + encodeURIComponent(codigo);
  const mensagem = [
    "🎵 Convite para participar do projeto " + nomeProjeto,
    "",
    "Olá!",
    "",
    nomeAdmin + " convidou você para entrar no projeto " + nomeProjeto + " pelo CrossSet.",
    "",
    "Este convite é exclusivo para esse projeto. Ao aceitar, seus dados serão cadastrados diretamente dentro de " + nomeProjeto + ".",
    "",
    "Clique no link abaixo, preencha seu cadastro e aceite o convite:",
    link,
    "",
    "Se você ainda não possui conta, poderá criá-la durante o processo.",
    "",
    "Nos vemos no projeto! 🎸"
  ].join("\n");

  const payload = {
    projeto_id: projetoId,
    codigo: codigo,
    status: "pendente",
    papel: "integrante",
    criado_por: usuario.id,
    criado_por_nome: nomeAdmin,
    projeto_nome: nomeProjeto,
    link_convite: link,
    mensagem: mensagem
  };

  const { error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.convites)
    .insert(payload);

  if (error) {
    alert("Erro ao gerar convite: " + error.message);
    return;
  }

  try {
    if (navigator.share) {
      await navigator.share({
        title: "Convite CrossSet",
        text: mensagem,
        url: link
      });
      return;
    }
  } catch (erroCompartilhar) {
    console.warn("Compartilhamento cancelado ou indisponível.", erroCompartilhar);
  }

  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(mensagem);
    } catch (erroClipboard) {
      console.warn("Não foi possível copiar automaticamente.", erroClipboard);
    }
  }

  window.open("https://wa.me/?text=" + encodeURIComponent(mensagem), "_blank");
  alert("Convite gerado. A mensagem também foi copiada para você enviar no WhatsApp.");
}

function garantirTelaConvite() {
  if (elemento("tela-convite")) {
    return;
  }

  const app = document.querySelector(".app");

  if (!app) {
    return;
  }

  const tela = document.createElement("section");
  tela.id = "tela-convite";
  tela.className = "tela";

  tela.innerHTML = `
    <style>
      #tela-convite.tela-ativa {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        min-height: 100vh !important;
        padding: 16px !important;
        background:
          radial-gradient(circle at top left, rgba(51, 196, 255, .10), transparent 34%),
          radial-gradient(circle at bottom right, rgba(184, 77, 255, .12), transparent 38%),
          #0d1b2f !important;
      }

      #tela-convite .card-convite {
        width: min(430px, 100%) !important;
        max-width: 430px !important;
        min-height: auto !important;
        margin: 0 auto !important;
        padding: 22px 24px !important;
        border-radius: 24px !important;
        text-align: center !important;
      }

      #tela-convite .card-convite .logo-login {
        width: 112px !important;
        max-height: none !important;
        height: auto !important;
        margin: 0 auto 12px !important;
        display: block !important;
        object-fit: contain !important;
      }

      #tela-convite .card-convite .tag {
        margin: 0 auto 14px !important;
      }

      #tela-convite .card-convite h1 {
        font-size: 27px !important;
        line-height: 1.12 !important;
        margin: 0 0 10px !important;
        color: #735cff !important;
      }

      #tela-convite .card-convite p {
        margin: 0 !important;
        color: #ffffff !important;
        font-size: 14px !important;
        line-height: 1.4 !important;
      }

      #convite-detalhes {
        margin: 16px 0 !important;
        display: grid !important;
        gap: 8px !important;
      }

      .convite-resumo-projeto {
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 16px;
        padding: 14px;
        background: rgba(255,255,255,.045);
        color: #f9fafb;
        text-align: center;
      }

      .convite-resumo-projeto p {
        color: #9db2d6 !important;
        font-size: 12px !important;
        margin-bottom: 6px !important;
      }

      .convite-resumo-projeto h3 {
        margin: 0 0 10px !important;
        color: #ffffff !important;
        font-size: 21px !important;
        line-height: 1.15 !important;
      }

      .convite-resumo-projeto span {
        display: block;
        color: #ffffff;
        font-size: 14px;
        line-height: 1.35;
        margin: 3px 0;
      }

      #convite-acoes {
        display: grid !important;
        gap: 10px !important;
      }

      #tela-convite .botao-principal {
        margin-top: 0 !important;
      }
    </style>

    <div class="card-login card-convite">
      <img src="logo.png" alt="CrossSet" class="logo-login" />
      <span class="tag">Convite</span>
      <h1 id="convite-titulo">Convite para projeto musical</h1>
      <p id="convite-descricao">Carregando convite...</p>

      <div id="convite-detalhes"></div>

      <div id="convite-acoes"></div>

      <button class="botao-link" id="btn-voltar-login-convite" type="button">
        Voltar para o login
      </button>
    </div>
  `;

  app.appendChild(tela);

  const voltar = elemento("btn-voltar-login-convite");
  if (voltar) {
    voltar.addEventListener("click", function() {
      mostrarTela("tela-login", { registrar: false });
    });
  }
}

async function carregarConvitePublico(codigo) {
  const cliente = sb();

  if (!cliente || !codigo) {
    return;
  }

  garantirTelaConvite();
  mostrarTela("tela-convite", { registrar: false });

  const detalhes = elemento("convite-detalhes");
  const descricao = elemento("convite-descricao");
  const acoes = elemento("convite-acoes");

  if (descricao) {
    descricao.textContent = "Buscando informações do convite...";
  }

  const { data, error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.convites)
    .select("*")
    .eq("codigo", codigo)
    .maybeSingle();

  if (error || !data) {
    if (descricao) {
      descricao.textContent = "Convite não encontrado ou expirado.";
    }
    if (detalhes) {
      detalhes.innerHTML = "";
    }
    if (acoes) {
      acoes.innerHTML = `<button class="botao-principal" type="button" id="btn-ir-login-convite">Ir para o login</button>`;
      elemento("btn-ir-login-convite")?.addEventListener("click", function() {
        mostrarTela("tela-login", { registrar: false });
      });
    }
    return;
  }

  appState.conviteAtual = data;
  salvarCodigoConvitePendente(codigo);

  const dadosPendentesGmail = obterDadosConviteTemporario(codigo);
  const { data: sessaoParaConvite } = await cliente.auth.getSession();
  const usuarioLogado = sessaoParaConvite.session?.user;

  if (usuarioLogado) {
    const dadosCompletos = dadosPendentesGmail &&
      limparTexto(dadosPendentesGmail.nome) &&
      limparTexto(dadosPendentesGmail.funcao) &&
      limparTexto(dadosPendentesGmail.instrumento) &&
      limparTexto(dadosPendentesGmail.telefone);

    if (dadosCompletos) {
      if (descricao) {
        descricao.textContent = "Finalizando sua entrada no projeto...";
      }
      if (detalhes) {
        detalhes.innerHTML = `<p>Validando convite e abrindo ${escaparHtml(data.projeto_nome || "Projeto musical")}...</p>`;
      }
      if (acoes) {
        acoes.innerHTML = "";
      }

      await aceitarConviteComUsuario(usuarioLogado, {
        nome: dadosPendentesGmail.nome,
        funcao: dadosPendentesGmail.funcao,
        instrumento: dadosPendentesGmail.instrumento,
        telefone: dadosPendentesGmail.telefone,
        chave_pix: dadosPendentesGmail.chave_pix || "",
        email: usuarioLogado.email || ""
      });
      return;
    }

    if (descricao) {
      descricao.textContent = "Complete seus dados obrigatórios para entrar no projeto.";
    }

    if (detalhes) {
      detalhes.innerHTML = `
        <div class="convite-resumo-projeto">
          <p>Projeto</p>
          <h3>${escaparHtml(data.projeto_nome || "Projeto musical")}</h3>
          <span><strong>Perfil:</strong> Integrante</span>
        </div>
      `;
    }

    if (acoes) {
      acoes.innerHTML = `
        <div style="border:1px solid rgba(255,255,255,.12); border-radius:14px; padding:14px; background:#0b1220; display:grid; gap:10px; text-align:left;">
          <label>Nome completo<input id="convite-logado-nome" type="text" value="${escaparHtml(obterNomeUsuario(usuarioLogado))}" /></label>
          <label>Função<input id="convite-logado-funcao" type="text" placeholder="Ex: Guitarrista" /></label>
          <label>Instrumento<input id="convite-logado-instrumento" type="text" placeholder="Ex: Guitarra" /></label>
          <label>WhatsApp / Telefone<input id="convite-logado-telefone" type="tel" placeholder="(00) 00000-0000" /></label>
          <label>Chave Pix (opcional)<input id="convite-logado-chave-pix" type="text" placeholder="CPF, celular, e-mail ou chave aleatória" /></label>
          <label>E-mail<input type="email" value="${escaparHtml(usuarioLogado.email || "")}" disabled /></label>
          <button class="botao-principal" id="btn-completar-convite-logado" type="button">Aceitar convite e entrar no projeto</button>
        </div>
      `;

      elemento("btn-completar-convite-logado")?.addEventListener("click", async function() {
        const dados = {
          nome: limparTexto(elemento("convite-logado-nome")?.value),
          funcao: limparTexto(elemento("convite-logado-funcao")?.value),
          instrumento: limparTexto(elemento("convite-logado-instrumento")?.value),
          telefone: limparTexto(elemento("convite-logado-telefone")?.value),
          chave_pix: limparTexto(elemento("convite-logado-chave-pix")?.value),
          email: usuarioLogado.email || ""
        };

        if (!validarDadosObrigatoriosConvite(dados, true)) {
          return;
        }

        await aceitarConviteComUsuario(usuarioLogado, dados);
      });
    }

    return;
  }

  if (descricao) {
    descricao.textContent = "Preencha seus dados para aceitar o convite. Este cadastro será vinculado somente ao projeto informado abaixo.";
  }

  if (detalhes) {
    detalhes.innerHTML = `
      <div class="convite-resumo-projeto">
        <p>Projeto</p>
        <h3>${escaparHtml(data.projeto_nome || "Projeto musical")}</h3>
        <span><strong>Convidado por:</strong> ${escaparHtml(data.criado_por_nome || "Administrador")}</span>
        <span><strong>Perfil:</strong> Integrante</span>
      </div>
    `;
  }

  if (acoes) {
    acoes.innerHTML = `
      <div style="border:1px solid rgba(255,255,255,.12); border-radius:14px; padding:14px; background:#0b1220; display:grid; gap:10px; text-align:left;">
        <h3 style="margin:0; color:#ffffff;">Criar cadastro e aceitar convite</h3>
        <p style="margin:0; color:#d1d5db; font-size:13px;">Este convite é exclusivo para o projeto <strong>${escaparHtml(data.projeto_nome || 'Projeto musical')}</strong>. Para entrar nele, preencha seus dados abaixo. Você pode criar acesso com e-mail e senha ou entrar com Gmail. O cadastro será salvo diretamente como integrante deste projeto.</p>

        <label style="display:grid; gap:6px; color:#e5e7eb; font-size:13px;">
          Nome completo
          <input id="convite-cadastro-nome" type="text" placeholder="Seu nome" />
        </label>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <label style="display:grid; gap:6px; color:#e5e7eb; font-size:13px;">
            Função
            <input id="convite-cadastro-funcao" type="text" placeholder="Ex: Guitarrista" />
          </label>

          <label style="display:grid; gap:6px; color:#e5e7eb; font-size:13px;">
            Instrumento
            <input id="convite-cadastro-instrumento" type="text" placeholder="Ex: Guitarra" />
          </label>
        </div>

        <label style="display:grid; gap:6px; color:#e5e7eb; font-size:13px;">
          WhatsApp / Telefone
          <input id="convite-cadastro-telefone" type="tel" placeholder="(00) 00000-0000" />
        </label>

        <label style="display:grid; gap:6px; color:#e5e7eb; font-size:13px;">
          Chave Pix (opcional)
          <input id="convite-cadastro-chave-pix" type="text" placeholder="CPF, celular, e-mail ou chave aleatória" />
        </label>

        <label style="display:grid; gap:6px; color:#e5e7eb; font-size:13px;">
          E-mail
          <input id="convite-cadastro-email" type="email" placeholder="email@exemplo.com" />
        </label>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <label style="display:grid; gap:6px; color:#e5e7eb; font-size:13px;">
            Senha
            <input id="convite-cadastro-senha" type="password" placeholder="Senha" />
          </label>

          <label style="display:grid; gap:6px; color:#e5e7eb; font-size:13px;">
            Repetir senha
            <input id="convite-cadastro-repetir-senha" type="password" placeholder="Repetir senha" />
          </label>
        </div>

        <button class="botao-principal" id="btn-criar-conta-aceitar-convite" type="button">Aceitar convite e entrar no projeto</button>

        <div class="divisor" style="margin:4px 0;">
          <span></span>
          <p>ou</p>
          <span></span>
        </div>

        <button class="botao-google" id="btn-gmail-aceitar-convite" type="button" style="min-height:42px;">
          <img src="logo_gmail.webp" alt="Gmail" style="width:22px;height:22px;object-fit:contain;margin-right:8px;vertical-align:middle;" />
          Entrar com Gmail e entrar no projeto
        </button>
      </div>
    `;

    elemento("btn-criar-conta-aceitar-convite")?.addEventListener("click", criarContaEAceitarConvite);
    elemento("btn-gmail-aceitar-convite")?.addEventListener("click", entrarComGmailEAceitarConvite);
  }
}


function obterDadosCadastroConvite() {
  return {
    nome: limparTexto(elemento("convite-cadastro-nome")?.value),
    funcao: limparTexto(elemento("convite-cadastro-funcao")?.value),
    instrumento: limparTexto(elemento("convite-cadastro-instrumento")?.value),
    telefone: limparTexto(elemento("convite-cadastro-telefone")?.value),
    chave_pix: limparTexto(elemento("convite-cadastro-chave-pix")?.value),
    email: limparTexto(elemento("convite-cadastro-email")?.value),
    senha: limparTexto(elemento("convite-cadastro-senha")?.value),
    repetirSenha: limparTexto(elemento("convite-cadastro-repetir-senha")?.value)
  };
}

function salvarDadosConviteTemporario(codigo, dados) {
  if (!codigo || !dados) {
    return;
  }

  localStorage.setItem("convite_dados_pendentes", JSON.stringify({
    codigo: codigo,
    dados: {
      nome: dados.nome || "",
      funcao: dados.funcao || "",
      instrumento: dados.instrumento || "",
      telefone: dados.telefone || "",
      chave_pix: dados.chave_pix || ""
    }
  }));
}

function obterDadosConviteTemporario(codigo) {
  const bruto = localStorage.getItem("convite_dados_pendentes");

  if (!bruto || !codigo) {
    return null;
  }

  try {
    const parsed = JSON.parse(bruto);

    if (parsed && parsed.codigo === codigo) {
      return parsed.dados || null;
    }
  } catch (erro) {
    console.warn("Dados temporários do convite inválidos.", erro);
  }

  return null;
}

function limparDadosConviteTemporario() {
  localStorage.removeItem("convite_dados_pendentes");
}

function validarDadosObrigatoriosConvite(dados, exigirEmail = false) {
  if (!dados.nome) { alert("Informe seu nome."); return false; }
  if (!dados.funcao) { alert("Informe sua função."); return false; }
  if (!dados.instrumento) { alert("Informe seu instrumento."); return false; }
  if (!dados.telefone) { alert("Informe seu telefone."); return false; }
  if (exigirEmail && !dados.email) { alert("Informe seu e-mail."); return false; }
  return true;
}

async function entrarComGmailEAceitarConvite() {
  const cliente = sb();
  const convite = appState.conviteAtual;

  if (!cliente || !convite) {
    return;
  }

  const dados = obterDadosCadastroConvite();

  if (!validarDadosObrigatoriosConvite(dados, false)) {
    return;
  }

  salvarDadosConviteTemporario(convite.codigo, dados);
  salvarCodigoConvitePendente(convite.codigo);

  const { data, error } = await cliente.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + window.location.pathname + "?convite=" + encodeURIComponent(convite.codigo),
      skipBrowserRedirect: true,
      queryParams: {
        prompt: "select_account"
      }
    }
  });

  if (error) {
    alert("Erro ao entrar com Gmail: " + error.message);
    return;
  }

  if (data && data.url) {
    window.location.href = data.url;
  }
}

async function criarContaEAceitarConvite() {
  const cliente = sb();
  const convite = appState.conviteAtual;

  if (!cliente || !convite) {
    return;
  }

  const dadosFormulario = obterDadosCadastroConvite();
  const nome = dadosFormulario.nome;
  const funcao = dadosFormulario.funcao;
  const instrumento = dadosFormulario.instrumento;
  const telefone = dadosFormulario.telefone;
  const email = dadosFormulario.email;
  const senha = dadosFormulario.senha;
  const repetirSenha = dadosFormulario.repetirSenha;

  if (!validarDadosObrigatoriosConvite(dadosFormulario, true)) {
    return;
  }

  if (!senha) {
    alert("Informe sua senha.");
    return;
  }

  if (senha.length < 6) {
    alert("A senha precisa ter pelo menos 6 caracteres.");
    return;
  }

  if (senha !== repetirSenha) {
    alert("As senhas não coincidem.");
    return;
  }

  const botaoConvite = elemento("btn-criar-conta-aceitar-convite");
  const restaurarBotao = function() {
    if (botaoConvite) {
      botaoConvite.disabled = false;
      botaoConvite.textContent = "Salvar cadastro e entrar no projeto";
    }
  };

  if (botaoConvite) {
    botaoConvite.disabled = true;
    botaoConvite.textContent = "Criando conta e entrando no projeto...";
  }

  const dadosPerfil = {
    nome: nome,
    funcao: funcao,
    instrumento: instrumento,
    telefone: telefone,
    chave_pix: dadosFormulario.chave_pix,
    email: email
  };

  // Mantém o convite e os dados até o vínculo com o projeto ser concluído.
  salvarDadosConviteTemporario(convite.codigo, dadosPerfil);
  salvarCodigoConvitePendente(convite.codigo);

  try {
    const { data: sessaoAtual } = await cliente.auth.getSession();

    if (sessaoAtual.session && limparTexto(sessaoAtual.session.user?.email).toLowerCase() !== email.toLowerCase()) {
      await cliente.auth.signOut();
    }

    let sessaoValida = null;
    let usuario = null;

    const { data: cadastroData, error: cadastroError } = await cliente.auth.signUp({
      email: email,
      password: senha,
      options: {
        emailRedirectTo: REPERTORIO_FACIL.urlApp + "?convite=" + encodeURIComponent(convite.codigo),
        data: {
          nome: nome,
          full_name: nome,
          telefone: telefone,
          funcao: funcao,
          instrumento: instrumento
        }
      }
    });

    if (cadastroError) {
      throw new Error("Erro ao criar conta: " + cadastroError.message);
    }

    sessaoValida = cadastroData.session || null;
    usuario = sessaoValida?.user || cadastroData.user || null;

    // Alguns cadastros retornam o usuário sem sessão. Nesse caso, faz o login
    // imediatamente antes de tentar inserir o integrante no projeto.
    if (!sessaoValida) {
      const { data: loginData, error: loginError } = await cliente.auth.signInWithPassword({
        email: email,
        password: senha
      });

      if (loginError || !loginData?.session) {
        const mensagemLogin = limparTexto(loginError?.message).toLowerCase();

        if (mensagemLogin.includes("email not confirmed") || mensagemLogin.includes("email_not_confirmed")) {
          throw new Error("O Supabase está exigindo confirmação de e-mail. Desative a confirmação de e-mail para que o cadastro entre automaticamente no projeto.");
        }

        throw new Error("A conta foi localizada, mas não foi possível entrar automaticamente. Confira se este e-mail já possui conta e se a senha informada está correta.");
      }

      sessaoValida = loginData.session;
      usuario = loginData.user || loginData.session.user;
    }

    const { data: sessaoConfirmada } = await cliente.auth.getSession();
    const usuarioConfirmado = sessaoConfirmada.session?.user || null;

    if (!usuarioConfirmado || !usuario || String(usuarioConfirmado.id) !== String(usuario.id)) {
      throw new Error("Não foi possível confirmar o login antes de entrar no projeto.");
    }

    appState.sessao = sessaoConfirmada.session;
    appState.usuario = usuarioConfirmado;
    preencherUsuario(usuarioConfirmado);

    if (botaoConvite) {
      botaoConvite.textContent = "Entrando no projeto...";
    }

    await aceitarConviteComUsuario(usuarioConfirmado, dadosPerfil);
  } catch (erro) {
    console.error("Erro no cadastro pelo convite:", erro);
    restaurarBotao();
    alert(erro?.message || "Não foi possível concluir o cadastro e entrar no projeto.");
  }
}

async function aceitarConviteAtual() {
  const cliente = sb();
  const convite = appState.conviteAtual;

  if (!cliente || !convite) {
    return;
  }

  const { data: sessionData } = await cliente.auth.getSession();
  const usuario = sessionData.session?.user;

  if (!usuario) {
    salvarCodigoConvitePendente(convite.codigo);
    mostrarTela("tela-login", { registrar: false });
    return;
  }

  const botao = elemento("btn-aceitar-convite-logado");
  if (botao) {
    botao.disabled = true;
    botao.textContent = "Entrando no projeto...";
  }

  await aceitarConviteComUsuario(usuario);
}

async function abrirProjetoDoConvite(projetoId, nomeProjeto) {
  const cliente = sb();

  let projeto = {
    id: projetoId,
    nome: nomeProjeto || "Projeto musical",
    estilo: "Projeto musical",
    cidade: "",
    estado: ""
  };

  if (cliente && projetoId) {
    try {
      const { data: projetoData } = await cliente
        .from(REPERTORIO_FACIL.tabelas.projetos)
        .select("*")
        .eq("id", projetoId)
        .maybeSingle();

      if (projetoData) {
        projeto = projetoData;
      }
    } catch (erroProjeto) {
      console.warn("Projeto não pôde ser carregado pela política de leitura. Usando dados do convite.", erroProjeto);
    }
  }

  salvarProjetoAtual(projeto);
  salvarProjetoConviteCache(projeto);
  sessionStorage.setItem("abrir_projeto_convite_id", projeto.id);
  limparConvitePendente();
  limparDadosConviteTemporario();
  appState.conviteAtual = null;

  try {
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    }
  } catch (erroUrl) {
    console.warn("Não foi possível limpar a URL do convite.", erroUrl);
  }

  if (typeof mostrarToast === "function") {
    mostrarToast("Bem-vindo ao projeto " + (projeto.nome || "musical") + "!");
  }

  abrirPainelProjeto();

  setTimeout(function() {
    if (appState.projetoAtual && appState.projetoAtual.id === projeto.id) {
      abrirPainelProjeto();
    }
  }, 150);
}

async function aceitarConviteComUsuario(usuario, dadosPerfil = {}) {
  const cliente = sb();
  const convite = appState.conviteAtual;

  if (!cliente || !convite || !usuario) {
    return;
  }

  const { data: sessaoAtualConvite, error: erroSessaoConvite } = await cliente.auth.getSession();
  const usuarioAutenticado = sessaoAtualConvite?.session?.user || null;

  if (erroSessaoConvite || !usuarioAutenticado || String(usuarioAutenticado.id) !== String(usuario.id)) {
    alert("Sua conta foi criada, mas o login não foi confirmado. Entre novamente pelo mesmo link do convite.");
    return;
  }

  usuario = usuarioAutenticado;

  const projetoId = convite.projeto_id;
  const nomeProjeto = convite.projeto_nome || "Projeto musical";

  if (!projetoId) {
    alert("Convite sem projeto vinculado. Gere um novo convite.");
    return;
  }

  const chaveAceite = String(projetoId) + "|" + String(usuario.id);
  window.__crosssetConvitesEmProcessamento = window.__crosssetConvitesEmProcessamento || {};

  if (window.__crosssetConvitesEmProcessamento[chaveAceite]) {
    return;
  }

  window.__crosssetConvitesEmProcessamento[chaveAceite] = true;

  try {
    const statusConvite = limparTexto(convite.status).toLowerCase();
    const conviteBloqueado = statusConvite && !["pendente", "ativo", "aberto", "aceito"].includes(statusConvite);

    const nomeUsuario = limparTexto(dadosPerfil.nome);
    const emailUsuario = (limparTexto(dadosPerfil.email) || usuario.email || "").toLowerCase();
    const funcaoUsuario = limparTexto(dadosPerfil.funcao);
    const instrumentoUsuario = limparTexto(dadosPerfil.instrumento);
    const telefoneUsuario = limparTexto(dadosPerfil.telefone);
    const chavePixUsuario = limparTexto(dadosPerfil.chave_pix);

    if (!validarDadosObrigatoriosConvite({
      nome: nomeUsuario,
      funcao: funcaoUsuario,
      instrumento: instrumentoUsuario,
      telefone: telefoneUsuario,
      email: emailUsuario
    }, true)) {
      return;
    }

    if (conviteBloqueado) {
      alert("Este convite não está mais disponível.");
      return;
    }

    const payloadPerfil = {
      usuario_id: usuario.id,
      nome: nomeUsuario,
      funcao: funcaoUsuario,
      instrumento: instrumentoUsuario,
      email: emailUsuario,
      telefone: telefoneUsuario,
      chave_pix: chavePixUsuario
    };

    let integranteConfirmado = null;

    // 1. Procura primeiro pelo vínculo definitivo usuário + projeto.
    const { data: vinculoUsuario, error: erroVinculoUsuario } = await cliente
      .from(REPERTORIO_FACIL.tabelas.integrantes)
      .select("*")
      .eq("projeto_id", projetoId)
      .eq("usuario_id", usuario.id)
      .limit(1)
      .maybeSingle();

    if (erroVinculoUsuario) {
      console.error("Erro ao verificar vínculo do integrante:", erroVinculoUsuario);
      alert("Erro ao verificar integrante: " + erroVinculoUsuario.message);
      return;
    }

    if (vinculoUsuario) {
      // Atualiza os dados preenchidos no convite sem alterar o perfil de administrador.
      const { data: vinculoAtualizado, error: erroAtualizarVinculo } = await cliente
        .from(REPERTORIO_FACIL.tabelas.integrantes)
        .update(payloadPerfil)
        .eq("id", vinculoUsuario.id)
        .eq("projeto_id", projetoId)
        .select("*")
        .single();

      if (erroAtualizarVinculo) {
        console.error("Erro ao atualizar integrante já vinculado:", erroAtualizarVinculo);
        alert("O usuário foi localizado, mas seus dados não puderam ser confirmados: " + erroAtualizarVinculo.message);
        return;
      }

      integranteConfirmado = vinculoAtualizado;
    }

    // 2. Se existe um cadastro prévio apenas com o e-mail, transforma esse registro
    // no vínculo definitivo da conta autenticada, em vez de abrir o projeto sem vinculá-la.
    if (!integranteConfirmado && emailUsuario) {
      const { data: vinculoEmail, error: erroVinculoEmail } = await cliente
        .from(REPERTORIO_FACIL.tabelas.integrantes)
        .select("*")
        .eq("projeto_id", projetoId)
        .ilike("email", emailUsuario)
        .limit(1)
        .maybeSingle();

      if (erroVinculoEmail) {
        console.error("Erro ao verificar e-mail do integrante:", erroVinculoEmail);
        alert("Erro ao verificar e-mail do integrante: " + erroVinculoEmail.message);
        return;
      }

      if (vinculoEmail) {
        const { data: vinculoEmailAtualizado, error: erroAtualizarEmail } = await cliente
          .from(REPERTORIO_FACIL.tabelas.integrantes)
          .update(payloadPerfil)
          .eq("id", vinculoEmail.id)
          .eq("projeto_id", projetoId)
          .select("*")
          .single();

        if (erroAtualizarEmail) {
          console.error("Erro ao vincular cadastro existente à conta:", erroAtualizarEmail);
          alert("Seu cadastro foi localizado, mas não pôde ser vinculado à sua conta: " + erroAtualizarEmail.message);
          return;
        }

        integranteConfirmado = vinculoEmailAtualizado;
      }
    }

    // 3. Não existe cadastro: cria e exige o retorno da linha inserida.
    if (!integranteConfirmado) {
      // Faz somente o INSERT primeiro. Não usa .select() no mesmo comando,
      // porque a policy de SELECT depende de o vínculo já existir em integrantes.
      // O retorno imediato pode ser bloqueado pela RLS antes de a nova associação
      // ficar visível para a própria policy de leitura.
      const { error: erroInserir } = await cliente
        .from(REPERTORIO_FACIL.tabelas.integrantes)
        .insert({
          projeto_id: projetoId,
          administrador: false,
          ...payloadPerfil
        });

      let integranteInserido = null;

      if (erroInserir) {
        // Em concorrência, outro processo pode ter criado o vínculo. Nunca abrir
        // o projeto apenas pelo código 23505: primeiro confirmar a linha real.
        if (erroInserir.code === "23505") {
          const { data: vinculoDuplicado, error: erroLerDuplicado } = await cliente
            .from(REPERTORIO_FACIL.tabelas.integrantes)
            .select("*")
            .eq("projeto_id", projetoId)
            .eq("usuario_id", usuario.id)
            .limit(1)
            .maybeSingle();

          if (!erroLerDuplicado && vinculoDuplicado) {
            integranteConfirmado = vinculoDuplicado;
          } else {
            console.error("Duplicidade detectada sem vínculo confirmável:", erroInserir, erroLerDuplicado);
            alert("Já existe um cadastro relacionado a esta conta, mas o vínculo com o projeto não pôde ser confirmado.");
            return;
          }
        } else {
          console.error("Erro ao aceitar convite:", erroInserir);
          alert("Não foi possível cadastrar você como integrante: " + erroInserir.message);
          return;
        }
      } else {
        // Depois que o INSERT terminou, consulta novamente em uma nova requisição.
        // Agora a policy de SELECT já reconhece o usuário como integrante do projeto.
        for (let tentativa = 0; tentativa < 8; tentativa += 1) {
          const { data: vinculoCriado, error: erroLerCriado } = await cliente
            .from(REPERTORIO_FACIL.tabelas.integrantes)
            .select("*")
            .eq("projeto_id", projetoId)
            .eq("usuario_id", usuario.id)
            .limit(1)
            .maybeSingle();

          if (!erroLerCriado && vinculoCriado) {
            integranteInserido = vinculoCriado;
            break;
          }

          await new Promise(function(resolve) {
            setTimeout(resolve, 180);
          });
        }

        if (!integranteInserido) {
          alert("O cadastro foi enviado, mas o vínculo ainda não pôde ser confirmado. Aguarde alguns segundos e abra o convite novamente.");
          return;
        }

        integranteConfirmado = integranteInserido;
      }
    }

    // 4. Verificação obrigatória: somente abre o projeto se a tabela integrantes
    // realmente contiver o usuário autenticado neste projeto.
    const { data: confirmacaoFinal, error: erroConfirmacaoFinal } = await cliente
      .from(REPERTORIO_FACIL.tabelas.integrantes)
      .select("*")
      .eq("projeto_id", projetoId)
      .eq("usuario_id", usuario.id)
      .limit(1)
      .maybeSingle();

    if (erroConfirmacaoFinal || !confirmacaoFinal) {
      console.error("Vínculo do integrante não confirmado após o convite:", erroConfirmacaoFinal, integranteConfirmado);
      alert(
        "Seu acesso não foi concluído porque o cadastro não apareceu em Integrantes." +
        (erroConfirmacaoFinal?.message ? " Erro: " + erroConfirmacaoFinal.message : "")
      );
      return;
    }

    appState.meuIntegranteAtual = confirmacaoFinal;

    // Convite reutilizável: a proteção permanece por usuário + projeto.
    await abrirProjetoDoConvite(projetoId, nomeProjeto);
  } finally {
    delete window.__crosssetConvitesEmProcessamento[chaveAceite];
  }
}

async function carregarMusicas() {
  const area = elemento("area-modulo");
  const projetoId = obterProjetoAtualId();

  if (!area) {
    return;
  }

  if (!projetoId) {
    area.innerHTML = `
      <div class="card-projeto">
        <h3>Projeto não encontrado</h3>
        <p>Volte para Meus Projetos e acesse o projeto novamente.</p>
      </div>
    `;
    return;
  }

  area.innerHTML = `
    <style>
      .modulo-musicas {
        display: grid;
        grid-template-columns: minmax(340px, 400px) minmax(0, 1fr);
        gap: 16px;
        width: 100%;
        align-items: stretch;
      }

      .modulo-musicas > .card-projeto {
        padding: 18px !important;
      }

      .modulo-musicas > .card-projeto h3 {
        margin: 0 0 8px !important;
        font-size: 17px !important;
      }

      .card-crossset-smart-musicas {
        min-height: 520px !important;
        align-self: start !important;
        position: sticky !important;
        top: 12px !important;
      }

      .card-lista-musicas-smart {
        min-height: 520px !important;
        align-self: stretch !important;
      }

      .form-musicas {
        display: grid;
        gap: 5px;
      }

      .form-musicas label,
      .filtros-musicas label {
        display: grid;
        gap: 2px;
        font-size: 12px;
        color: #e5e7eb;
      }

      .form-musicas input,
      .form-musicas textarea,
      .filtros-musicas input,
      .filtros-musicas select {
        width: 100%;
      }

      .form-musicas input,
      .form-musicas select,
      .filtros-musicas input,
      .filtros-musicas select {
        min-height: 34px !important;
        height: 34px !important;
        padding: 7px 10px !important;
        border-radius: 9px !important;
        margin-bottom: 0 !important;
        font-size: 13px !important;
      }

      .form-musicas textarea {
        min-height: 54px !important;
        padding: 7px 10px !important;
        border-radius: 9px !important;
        margin-bottom: 0 !important;
        font-size: 13px !important;
        line-height: 1.35 !important;
        resize: vertical;
      }

      #musica-letra {
        min-height: 76px !important;
      }

      #musica-observacoes {
        min-height: 42px !important;
      }

      .linha-form-musicas {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
        align-items: start;
      }

      .linha-form-musicas .ajuda-bpm-musica {
        display: none;
      }

      .acoes-musica {
        display: grid;
        gap: 6px;
        margin-top: 2px;
      }

      .btn-principal-musica,
      .btn-secundario-musica {
        width: 100%;
        min-height: 36px !important;
        height: 36px !important;
        border: 0;
        border-radius: 10px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 700;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: transform .15s ease, filter .15s ease, opacity .15s ease;
      }

      .btn-principal-musica {
        background: linear-gradient(135deg, #33c4ff, #7a5cff, #b84dff);
        color: #ffffff;
      }

      .btn-secundario-musica {
        background: rgba(255, 255, 255, .08);
        border: 1px solid rgba(255, 255, 255, .14);
        color: #f9fafb;
      }

      .btn-principal-musica:hover,
      .btn-secundario-musica:hover {
        transform: translateY(-1px);
        filter: brightness(1.08);
      }

      .filtros-musicas {
        display: grid;
        grid-template-columns: 1.4fr 1fr;
        gap: 10px;
        margin: 10px 0 14px;
      }

      .lista-musicas {
        display: grid;
        gap: 10px;
      }

      .item-musica {
        border: 1px solid rgba(255, 255, 255, .16);
        border-radius: 14px;
        padding: 14px;
        background: #1f2937;
        color: #f9fafb;
      }

      .item-musica-topo {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
      }

      .icone-musica-placeholder {
        width: 42px;
        height: 42px;
        min-width: 42px;
        border-radius: 50%;
        background: #6d28d9;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        color: #ffffff;
      }

      .dados-musica {
        flex: 1;
        min-width: 0;
      }

      .dados-musica h4 {
        margin: 0 0 6px;
        color: #ffffff;
        font-size: 17px;
      }

      .dados-musica p {
        margin: 3px 0;
        font-size: 13px;
        color: #d1d5db;
      }

      .dados-musica strong {
        color: #f3f4f6;
      }

      .meta-musica {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin: 8px 0;
      }

      .pill-musica {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        border-radius: 999px;
        background: rgba(122, 92, 255, .18);
        border: 1px solid rgba(122, 92, 255, .38);
        color: #d9d3ff;
        font-size: 12px;
        font-weight: 700;
      }

      .link-musica {
        color: #93c5fd;
        font-size: 13px;
        text-decoration: none;
        font-weight: 700;
      }

      .link-musica:hover {
        text-decoration: underline;
      }

      .musica-observacao-manual {
        margin: 4px 0 0 29px;
        color: #d1d5db;
        font-size: 11.5px;
        line-height: 1.3;
        white-space: normal;
        overflow: visible;
      }

      .musica-observacao-manual strong {
        color: #ffffff;
      }

      .musica-observacao-editavel {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        width: calc(100% - 29px) !important;
        max-width: calc(100% - 29px) !important;
      }

      .input-musica-obs-linha {
        flex: 1 1 auto !important;
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        height: 22px !important;
        min-height: 22px !important;
        padding: 2px 6px !important;
        margin: 0 !important;
        border-radius: 7px !important;
        font-size: 11px !important;
        line-height: 1 !important;
        color: #ffffff !important;
        background: #050b14 !important;
        border: 1px solid rgba(255,255,255,.16) !important;
        box-sizing: border-box !important;
      }

      .ajuda-campo-musica {
        display: none;
      }

      .indicadores-musica {
        display: flex;
        gap: 8px;
        align-items: center;
        margin: 6px 0 4px;
      }

      .indicador-conteudo-musica {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border-radius: 10px;
        background: rgba(255, 255, 255, .08);
        border: 1px solid rgba(255, 255, 255, .12);
        font-size: 15px;
        cursor: default;
      }

      .progresso-musica-card {
        display: grid;
        gap: 8px;
        margin: 9px 0 7px;
        padding: 10px;
        border-radius: 12px;
        background: rgba(255, 255, 255, .055);
        border: 1px solid rgba(255, 255, 255, .10);
      }

      .progresso-musica-resumo {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        font-size: 12px;
        color: #d1d5db;
      }

      .progresso-musica-percentual {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        font-size: 13px;
        font-weight: 700;
        color: #f9fafb;
      }

      .bolinha-status-musica {
        width: 11px;
        height: 11px;
        border-radius: 50%;
        display: inline-block;
        box-shadow: 0 0 0 2px rgba(255,255,255,.08);
      }

      .bolinha-status-musica.vermelha { background: #ef4444; }
      .bolinha-status-musica.amarela { background: #facc15; }
      .bolinha-status-musica.verde { background: #22c55e; }

      .barra-progresso-musica {
        width: 100%;
        height: 7px;
        border-radius: 999px;
        overflow: hidden;
        background: rgba(255,255,255,.10);
      }

      .barra-progresso-musica span {
        display: block;
        height: 100%;
        border-radius: 999px;
        transition: width .2s ease;
      }

      .barra-progresso-musica span.vermelha { background: #ef4444; }
      .barra-progresso-musica span.amarela { background: #facc15; }
      .barra-progresso-musica span.verde { background: #22c55e; }

      .progresso-musica-ajuda {
        display: block;
        margin-top: -2px;
        font-size: 11px;
        line-height: 1.35;
        color: #94a3b8;
      }

      .meu-progresso-musica {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 2px;
      }

      .meu-progresso-musica span {
        font-size: 12px;
        color: #cbd5e1;
        margin-right: 2px;
      }

      .btn-status-musica {
        width: 25px;
        height: 25px;
        border-radius: 50%;
        border: 2px solid rgba(255,255,255,.16);
        cursor: pointer;
        font-size: 0;
        transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease;
      }

      .btn-status-musica:hover {
        transform: translateY(-1px) scale(1.04);
      }

      .btn-status-musica.ativo {
        border-color: #ffffff;
        box-shadow: 0 0 0 3px rgba(255,255,255,.18);
      }

      .btn-status-musica.vermelha { background: #ef4444; }
      .btn-status-musica.amarela { background: #facc15; }
      .btn-status-musica.verde { background: #22c55e; }

      .botoes-item-musica {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .botoes-item-musica button {
        border: 0;
        border-radius: 10px;
        padding: 8px 10px;
        cursor: pointer;
        font-weight: 700;
      }

      .upload-musica-card {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: center;
        gap: 6px;
        margin-top: 0;
        padding: 6px 8px;
        border-radius: 9px;
        background: rgba(255,255,255,.035);
        border: 1px solid rgba(255,255,255,.10);
      }

      .upload-musica-card-topo {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 6px;
        font-size: 12px;
        color: #e5e7eb;
        font-weight: 700;
        min-width: 0;
      }

      .upload-musica-card-topo span:first-child,
      .label-upload-musica {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
      }

      .label-upload-musica svg,
      .upload-musica-botao svg,
      .botao-colar-letra svg {
        width: 16px;
        height: 16px;
        stroke: currentColor;
        fill: none;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
        flex: 0 0 auto;
      }

      .upload-musica-badge {
        display: none;
      }

      .upload-musica-acoes {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: nowrap;
      }

      .upload-musica-botao {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        min-height: 28px;
        height: 28px;
        padding: 0 9px;
        border-radius: 8px;
        cursor: pointer;
        color: #ffffff;
        font-size: 12px;
        font-weight: 700;
        background: rgba(255,255,255,.08);
        border: 1px solid rgba(255,255,255,.16);
        transition: transform .15s ease, filter .15s ease;
      }

      .upload-musica-botao:hover {
        transform: translateY(-1px);
        filter: brightness(1.08);
      }

      .upload-musica-botao input {
        display: none;
      }

      .upload-musica-ajuda {
        display: none;
      }

      .upload-musica-atual {
        grid-column: 1 / -1;
        font-size: 10.5px;
        color: #9db2d6;
        line-height: 1.2;
      }

      .upload-musica-atual a {
        color: #93c5fd;
        font-weight: 700;
        text-decoration: none;
      }

      .upload-musica-atual a:hover {
        text-decoration: underline;
      }

      .link-arquivo-musica {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        margin-right: 8px;
        margin-top: 4px;
        color: #c4b5fd;
        font-size: 12px;
        font-weight: 700;
        text-decoration: none;
      }

      .link-arquivo-musica:hover {
        text-decoration: underline;
      }

      .btn-editar-musica {
        background: #e5e7eb;
        color: #111827;
      }

      .btn-excluir-musica {
        background: #fee2e2;
        color: #991b1b;
      }



      /* UX v0.9.18 - lista fina de músicas */
      .lista-musicas {
        display: grid;
        gap: 0;
      }

      .item-musica {
        border: 0;
        border-radius: 0;
        padding: 7px 2px;
        background: transparent;
        color: #f9fafb;
        border-bottom: 1px solid rgba(255, 255, 255, .10);
      }

      .item-musica:hover {
        background: rgba(255, 255, 255, .035);
      }

      .musica-linha-principal,
      .musica-linha-meta,
      .musica-linha-status {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }

      .musica-linha-principal {
        justify-content: space-between;
        margin-bottom: 2px;
      }

      .musica-identidade {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }

      .musica-icone-mini {
        width: 21px;
        height: 21px;
        min-width: 21px;
        border-radius: 50%;
        background: #7a5cff;
        color: #ffffff;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 800;
      }

      .musica-nome-mini {
        font-size: 14px;
        font-weight: 700;
        color: #ffffff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 230px;
      }

      .musica-artista-mini {
        color: #aeb9d6;
        font-size: 12px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 160px;
      }

      .musica-linha-meta {
        flex-wrap: wrap;
        font-size: 11.5px;
        color: #cbd5e1;
        margin-left: 29px;
        line-height: 1.25;
      }

      .musica-meta-chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
      }

      .meta-icone-svg,
      .indicador-conteudo-musica {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .meta-icone-svg svg,
      .indicador-conteudo-musica svg {
        width: 14px;
        height: 14px;
        stroke: currentColor;
        fill: none;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .musica-meta-link {
        color: #c4b5fd;
        text-decoration: none;
        font-weight: 700;
      }

      .musica-meta-link:hover {
        text-decoration: underline;
      }

      .progresso-musica-inline {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-width: 92px;
      }

      .barra-fina-musica {
        width: 58px;
        height: 4px;
        border-radius: 999px;
        overflow: hidden;
        background: rgba(255,255,255,.13);
      }

      .barra-fina-musica span {
        display: block;
        height: 100%;
        border-radius: 999px;
      }

      .barra-fina-musica span.vermelha { background: #ef4444; }
      .barra-fina-musica span.amarela { background: #facc15; }
      .barra-fina-musica span.verde { background: #22c55e; }

      .musica-linha-status {
        flex-wrap: wrap;
        gap: 7px;
        margin-left: 29px;
        margin-top: 2px;
        font-size: 11.5px;
        line-height: 1.2;
      }

      .status-integrante-mini,
      .status-integrante-mini-botao {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        color: #dbe4f5;
        white-space: nowrap;
      }

      .status-integrante-mini-botao {
        background: transparent;
        border: 0;
        padding: 0;
        cursor: pointer;
        font: inherit;
      }

      .status-integrante-mini-botao:hover {
        color: #d8b4fe;
      }

      .bolinha-status-mini {
        width: 8px;
        height: 8px;
        min-width: 8px;
        border-radius: 50%;
        display: inline-block;
      }

      .bolinha-status-mini.vermelha { background: #ef4444; }
      .bolinha-status-mini.amarela { background: #facc15; }
      .bolinha-status-mini.verde { background: #22c55e; }

      .acoes-icone-musica {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        flex: 0 0 auto;
      }

      .btn-acao-musica {
        width: 22px;
        height: 22px;
        border: 0;
        padding: 0;
        background: transparent;
        color: #ffffff;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        opacity: .9;
        transition: color .15s ease, opacity .15s ease, transform .15s ease;
      }

      .btn-acao-musica svg {
        width: 17px;
        height: 17px;
        stroke: currentColor;
        fill: none;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .btn-acao-musica:hover {
        color: #d8b4fe;
        opacity: 1;
        transform: translateY(-1px) scale(1.05);
      }

      .botao-colar-letra {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        min-height: 24px !important;
        height: 24px !important;
        padding: 0 8px !important;
        border-radius: 7px !important;
        border: 1px solid rgba(255,255,255,.14);
        background: rgba(255,255,255,.08);
        color: #ffffff;
        cursor: pointer;
        font-size: 12px;
        font-weight: 700;
      }

      .linha-letra-acoes {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .crossset-smart-card {
        margin-bottom: 10px;
        padding: 10px;
        border-radius: 13px;
        background: linear-gradient(135deg, rgba(51,196,255,.10), rgba(122,92,255,.16), rgba(184,77,255,.10));
        border: 1px solid rgba(255,255,255,.12);
        display: grid;
        gap: 8px;
      }

      .crossset-smart-topo {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .crossset-smart-topo strong {
        color: #ffffff;
        font-size: 14px;
      }

      .crossset-smart-topo span {
        color: #aebff2;
        font-size: 11px;
        font-weight: 700;
      }

      .crossset-smart-busca {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 6px;
      }

      .crossset-smart-busca input {
        margin-bottom: 0 !important;
      }

      .crossset-smart-busca button,
      .crossset-smart-confirmar {
        min-height: 34px !important;
        height: 34px !important;
        border: 0;
        border-radius: 9px;
        padding: 0 12px;
        cursor: pointer;
        background: linear-gradient(135deg, #33c4ff, #7a5cff, #b84dff);
        color: #ffffff;
        font-size: 12px;
        font-weight: 800;
        white-space: nowrap;
      }

      .crossset-smart-sugestoes {
        display: grid;
        gap: 6px;
      }

      .crossset-smart-sugestao {
        width: 100%;
        border: 1px solid rgba(255,255,255,.10);
        border-radius: 10px;
        background: rgba(255,255,255,.055);
        color: #ffffff;
        text-align: left;
        padding: 8px;
        cursor: pointer;
        display: grid;
        gap: 2px;
      }

      .crossset-smart-sugestao:hover {
        background: rgba(122,92,255,.18);
      }

      .crossset-smart-sugestao strong,
      .crossset-smart-preview strong {
        font-size: 13px;
        color: #ffffff;
      }

      .crossset-smart-sugestao span,
      .crossset-smart-preview span {
        font-size: 11.5px;
        color: #cbd5e1;
      }

      .crossset-smart-preview {
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 12px;
        padding: 9px;
        background: rgba(7,17,31,.72);
        display: none;
        gap: 5px;
      }

      .crossset-smart-preview.ativo {
        display: grid;
      }

      .crossset-smart-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        margin: 4px 0;
      }

      .crossset-smart-meta span {
        padding: 4px 7px;
        border-radius: 999px;
        background: rgba(255,255,255,.075);
        border: 1px solid rgba(255,255,255,.10);
        color: #dbeafe;
        font-weight: 700;
      }

      .crossset-smart-ajuda {
        color: #9ca3af;
        font-size: 11px;
        line-height: 1.35;
      }




      /* UX v0.9.20 - cadastro ultracompacto */
      .modulo-musicas > .card-projeto:first-child {
        align-self: start;
      }

      .modulo-musicas > .card-projeto:first-child label {
        margin: 0 !important;
      }

      .modulo-musicas > .card-projeto:first-child input,
      .modulo-musicas > .card-projeto:first-child textarea {
        box-shadow: none !important;
      }

      @media (max-width: 820px) {
        .modulo-musicas,
        .linha-form-musicas,
        .filtros-musicas {
          grid-template-columns: 1fr;
        }

        .card-crossset-smart-musicas {
          position: static !important;
          top: auto !important;
        }

        .card-lista-musicas-smart .lista-musicas {
          max-height: none !important;
          overflow-y: visible !important;
          padding-right: 0 !important;
        }

        .linha-form-musicas .ajuda-bpm-musica {
          grid-column: 1;
        }

        .item-musica-topo {
          flex-direction: column;
        }

        .botoes-item-musica {
          justify-content: flex-start;
        }
      }


      /* CrossSet v1.0 - refinamento final músicas: campos compactos + ícones brancos */
      .musica-campos-rapidos {
        display: inline-flex !important;
        align-items: center !important;
        gap: 8px !important;
        flex: 0 0 auto !important;
        min-width: 0 !important;
      }

      .musica-campo-rapido {
        display: inline-flex !important;
        align-items: center !important;
        gap: 4px !important;
        white-space: nowrap !important;
        color: #ffffff !important;
        font-size: 11.5px !important;
        font-weight: 700 !important;
      }

      .icone-musica-campo {
        width: 13px !important;
        height: 13px !important;
        min-width: 13px !important;
        display: inline-block !important;
        color: #ffffff !important;
        stroke: currentColor !important;
        fill: none !important;
        stroke-width: 2 !important;
        stroke-linecap: round !important;
        stroke-linejoin: round !important;
      }

      .input-musica-rapido {
        width: 46px !important;
        min-width: 46px !important;
        max-width: 46px !important;
        height: 22px !important;
        min-height: 22px !important;
        padding: 2px 6px !important;
        margin: 0 !important;
        border-radius: 7px !important;
        font-size: 11px !important;
        line-height: 1 !important;
        color: #ffffff !important;
        background: #050b14 !important;
        border: 1px solid rgba(255,255,255,.16) !important;
      }


      .musica-youtube-linha {
        margin: 5px 0 0 29px !important;
        display: grid !important;
        grid-template-columns: auto minmax(0, 1fr) auto !important;
        align-items: center !important;
        gap: 7px !important;
        width: calc(100% - 29px) !important;
        color: #ffffff !important;
        font-size: 11.5px !important;
      }

      .musica-youtube-linha strong {
        color: #ffffff !important;
        white-space: nowrap !important;
      }

      .input-musica-youtube-linha {
        width: 100% !important;
        min-width: 0 !important;
        height: 30px !important;
        min-height: 30px !important;
        padding: 5px 9px !important;
        margin: 0 !important;
        border-radius: 8px !important;
        font-size: 11.5px !important;
        line-height: 1 !important;
        color: #ffffff !important;
        background: #050b14 !important;
        border: 1px solid rgba(255,255,255,.16) !important;
      }

      .musica-linha-principal {
        min-width: 0 !important;
      }

      .musica-identidade {
        min-width: 0 !important;
        overflow: hidden !important;
      }

      .acoes-icone-musica {
        flex: 0 0 auto !important;
        margin-left: auto !important;
        padding-left: 10px !important;
      }

      .musica-arrastar-personalizada {
        width: 18px;
        height: 22px;
        flex: 0 0 18px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #c4b5fd;
        font-size: 14px;
        font-weight: 900;
        line-height: 1;
        cursor: grab;
        user-select: none;
      }

      .musica-arrastar-personalizada:active {
        cursor: grabbing;
      }

      .item-musica[data-musica-arrastavel="true"] {
        cursor: default;
      }

      .item-musica.musica-arrastando {
        opacity: .55;
      }

      .item-musica.musica-alvo-arrastar {
        background: rgba(168, 85, 247, .14) !important;
        box-shadow: inset 0 2px 0 rgba(168, 85, 247, .85);
      }

      .card-lista-musicas-smart .lista-musicas {
        scrollbar-color: rgba(168, 85, 247, .68) rgba(255,255,255,.05) !important;
      }

      .card-lista-musicas-smart .lista-musicas::-webkit-scrollbar {
        width: 8px !important;
      }

      .card-lista-musicas-smart .lista-musicas::-webkit-scrollbar-track {
        background: rgba(255,255,255,.05) !important;
        border-radius: 999px !important;
      }

      .card-lista-musicas-smart .lista-musicas::-webkit-scrollbar-thumb {
        background: rgba(168, 85, 247, .68) !important;
        border-radius: 999px !important;
      }

      .card-lista-musicas-smart .lista-musicas::-webkit-scrollbar-thumb:hover {
        background: rgba(168, 85, 247, .88) !important;
      }

      .crossset-scroll-wrapper { position: relative !important; }
      .crossset-scroll-customizada { scrollbar-width: none !important; -ms-overflow-style: none !important; }
      .crossset-scroll-customizada::-webkit-scrollbar { width: 0 !important; height: 0 !important; display: none !important; }
      .crossset-scroll-track { position:absolute; top:2px; right:2px; bottom:2px; width:8px; border-radius:999px; background:rgba(255,255,255,.06); z-index:20; pointer-events:auto; cursor:pointer; touch-action:none; user-select:none; }
      .crossset-scroll-thumb { position:absolute; left:0; top:0; width:8px; min-height:28px; border-radius:999px; background:rgba(168,85,247,.82); box-shadow:0 0 8px rgba(168,85,247,.28); transform:translateY(0); cursor:grab; touch-action:none; user-select:none; } .crossset-scroll-thumb.arrastando { cursor:grabbing; background:rgba(168,85,247,.98); }
      .crossset-scroll-track.oculta { display:none !important; }
      .crossset-scroll-wrapper > .lista-integrantes,
      .crossset-scroll-wrapper > .lista-musicas,
      .crossset-scroll-wrapper > .lista-eventos,
      .crossset-scroll-wrapper > .repertorio-biblioteca-lista,
      .crossset-scroll-wrapper > .lista-biblioteca-musicas,
      .crossset-scroll-wrapper > .lista-musicas-repertorio,
      .crossset-scroll-wrapper > .setlist-lista-final { padding-right:14px !important; }
      @media (max-width:820px){ .crossset-scroll-track{right:1px;width:7px}.crossset-scroll-thumb{width:7px} }

      .musica-campo-obs-rapido {
        flex: 0 0 150px !important;
        min-width: 150px !important;
      }

      .input-musica-obs-rapido {
        width: 150px !important;
        min-width: 150px !important;
        max-width: 150px !important;
        height: 22px !important;
        min-height: 22px !important;
        padding: 2px 6px !important;
        margin: 0 !important;
        border-radius: 7px !important;
        font-size: 11px !important;
        line-height: 1 !important;
        color: #ffffff !important;
        background: #050b14 !important;
        border: 1px solid rgba(255,255,255,.16) !important;
      }

      .texto-opcional-musica {
        color: #9fb0d6 !important;
        font-weight: 500 !important;
        font-size: 10.5px !important;
      }

      .barra-fina-musica {
        width: 96px !important;
        height: 4px !important;
      }

      .progresso-musica-inline {
        min-width: 128px !important;
        gap: 6px !important;
      }

      .preparacao-inline-musica {
        gap: 12px !important;
        flex-wrap: wrap !important;
        row-gap: 3px !important;
      }

      .status-integrante-mini,
      .status-integrante-mini-botao {
        margin-right: 6px !important;
      }

      .crossset-smart-campos-opcionais {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 8px !important;
        margin: 6px 0 2px !important;
      }

      .crossset-smart-campo-opcional {
        display: grid !important;
        gap: 4px !important;
        color: #ffffff !important;
        font-size: 11.5px !important;
        font-weight: 700 !important;
      }

      .crossset-smart-campo-opcional span {
        display: inline-flex !important;
        align-items: center !important;
        gap: 5px !important;
      }

      .crossset-smart-campo-opcional input {
        margin-bottom: 0 !important;
        height: 30px !important;
        min-height: 30px !important;
        font-size: 12px !important;
        padding: 5px 8px !important;
      }

      .crossset-smart-campo-opcional.url-versao {
        grid-column: 1 / -1 !important;
      }

      /* CrossSet v36 - restaura seleção de nível sem alterar estrutura do card */
      .card-lista-musicas-smart .item-musica {
        max-height: none !important;
        overflow: visible !important;
      }

      .card-lista-musicas-smart .meu-progresso-musica {
        margin-left: 29px !important;
        margin-top: 4px !important;
      }

    </style>

    <div class="modulo-musicas">
      <div class="card-projeto card-crossset-smart-musicas">
        <h3 id="titulo-form-musica">Adicionar música</h3>

        <div class="crossset-smart-card" aria-label="CrossSet Smart Beta">
          <div class="crossset-smart-topo">
            <strong>✨ CrossSet Smart</strong>
          </div>

          <div class="crossset-smart-busca">
            <input id="smart-musica-busca" type="text" placeholder="Digite o nome da música..." autocomplete="off" />
            <button id="btn-smart-musica-buscar" type="button">Buscar</button>
          </div>

          <div id="smart-musica-sugestoes" class="crossset-smart-sugestoes"></div>

          <div id="smart-musica-preview" class="crossset-smart-preview"></div>

          <small class="crossset-smart-ajuda">Digite o nome da música, escolha uma sugestão e confirme o cadastro.</small>
        </div>

        <div id="form-musicas-manual" class="form-musicas" style="display:none; margin-top:10px; border:1px solid rgba(255,255,255,.12); border-radius:13px; padding:10px; background:rgba(7,17,31,.62);">
          <label>
            Música
            <input id="musica-nome" type="text" placeholder="Nome da música" />
          </label>

          <label>
            Artista
            <input id="musica-artista" type="text" placeholder="Nome do artista" />
          </label>

          <div class="linha-form-musicas">
            <label>
              Tom (opcional)
              <input id="musica-tom" type="text" placeholder="Ex: Em" />
            </label>

            <label>
              BPM (opcional)
              <input id="musica-bpm" type="number" inputmode="numeric" min="0" placeholder="Ex: 120" />
            </label>
          </div>

          <label>
            Spotify / Link principal
            <input id="musica-link" type="url" placeholder="Cole aqui o link principal" />
          </label>

          <label>
            URL da versão
            <input id="musica-url-referencia" type="url" placeholder="Cole aqui o link da versão que a banda irá estudar" />
          </label>

          <label>
            URL do YouTube (opcional)
            <input id="musica-youtube-url" type="url" placeholder="Cole aqui o link do YouTube" />
          </label>

          <label>
            Letra / observação da letra
            <textarea id="musica-letra" placeholder="Cole a letra ou observações da letra"></textarea>
          </label>

          <label>
            OBS:
            <textarea id="musica-observacoes" placeholder="Ex.: Instruções para esta música."></textarea>
          </label>

          <input id="musica-material-arquivo" type="file" style="display:none;" />
          <input id="musica-letra-arquivo" type="file" style="display:none;" />
          <small id="musica-material-arquivo-atual" class="upload-musica-atual">Nenhum arquivo enviado.</small>
          <small id="musica-letra-arquivo-atual" class="upload-musica-atual">Nenhum arquivo enviado.</small>

          <div class="acoes-musica">
            <button class="btn-principal-musica" id="btn-salvar-musica" type="button"><span>✓</span><span>Salvar alterações</span></button>
            <button class="btn-secundario-musica" id="btn-cancelar-musica" type="button">Cancelar edição</button>
          </div>
        </div>

        <div class="crossset-smart-legenda" aria-label="Legenda de progresso das músicas">
          <div class="crossset-smart-legenda-titulo">Como funciona o progresso das músicas?</div>
          <div class="crossset-smart-legenda-conteudo">
            <p>Cada integrante informa seu <strong>nível de preparo</strong> em cada música do projeto.</p>
            <p>🔴 <strong>Não iniciada</strong><br>O integrante ainda não começou a estudar a música.</p>
            <p>🟡 <strong>Em andamento</strong><br>O integrante está estudando ou ensaiando a música.</p>
            <p>🟢 <strong>Concluída</strong><br>O integrante considera a música pronta para tocar.</p>
            <p><strong>Barra de progresso</strong><br>A barra representa o progresso geral da música, calculado automaticamente com base nas respostas de todos os integrantes.</p>
            <p>Quando uma música é adicionada a um repertório, esse progresso passa a compor o progresso geral do repertório, permitindo acompanhar rapidamente o nível de preparação da banda para cada apresentação.</p>
          </div>
        </div>
      </div>

      <div class="card-projeto card-lista-musicas-smart">
        <span class="tag">Lista</span>
        <h3>Músicas cadastradas</h3>
        <p>Pesquise, ordene, edite ou exclua músicas deste projeto.</p>

        <div class="filtros-musicas">
          <label>
            Pesquisar
            <input id="busca-musicas" type="text" placeholder="Buscar por nome, artista, tom, BPM ou observação" />
          </label>

          <label>
            Ordenar por
            <select id="ordenar-musicas">
              <option value="recentes">Mais recentes</option>
              <option value="personalizada">Ordem personalizada</option>
              <option value="nome">Nome</option>
              <option value="artista">Artista</option>
              <option value="tom">Tom</option>
              <option value="bpm">BPM</option>
            </select>
          </label>
        </div>

        <div id="lista-musicas" class="lista-musicas">
          <p>Carregando músicas...</p>
        </div>

        <div class="acoes-exportacao-spotify">
          <button id="btn-exportar-musicas-pdf" class="btn-exportar-musicas-pdf" type="button">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path>
              <path d="M14 2v6h6"></path>
              <path d="M8 13h8"></path>
              <path d="M8 17h8"></path>
            </svg>
            <span>Exportar músicas em PDF</span>
          </button>

          <button id="btn-exportar-links-spotify" class="btn-exportar-links-spotify" type="button">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3v12"></path>
              <path d="m7 10 5 5 5-5"></path>
              <path d="M5 21h14"></path>
            </svg>
            <span>Exportar links do Spotify</span>
          </button>

          <button id="btn-exportar-links-youtube" class="btn-exportar-links-youtube" type="button">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3v12"></path>
              <path d="m7 10 5 5 5-5"></path>
              <path d="M5 21h14"></path>
            </svg>
            <span>Exportar links do YouTube</span>
          </button>
        </div>
      </div>
    </div>
  `;

  appState.musicaEditandoId = null;
  configurarEventosMusicas();
  await buscarMusicas();
}

function configurarEventosMusicas() {
  const botaoSalvar = elemento("btn-salvar-musica");
  const botaoCancelar = elemento("btn-cancelar-musica");
  const busca = elemento("busca-musicas");
  const ordenar = elemento("ordenar-musicas");
  const botaoAnexarMaterial = elemento("btn-anexar-material-musica");
  const botaoAnexarLetra = elemento("btn-anexar-letra-musica");
  const inputMaterial = elemento("musica-material-arquivo");
  const inputLetra = elemento("musica-letra-arquivo");
  const smartBusca = elemento("smart-musica-busca");
  const smartBotaoBuscar = elemento("btn-smart-musica-buscar");
  const botaoExportarPdf = elemento("btn-exportar-musicas-pdf");
  const botaoExportarSpotify = elemento("btn-exportar-links-spotify");
  const botaoExportarYoutube = elemento("btn-exportar-links-youtube");

  if (botaoExportarPdf) {
    botaoExportarPdf.addEventListener("click", exportarMusicasProjetoPDF);
  }

  if (botaoExportarSpotify) {
    botaoExportarSpotify.addEventListener("click", exportarLinksSpotifyMusicas);
  }

  if (botaoExportarYoutube) {
    botaoExportarYoutube.addEventListener("click", exportarLinksYoutubeMusicas);
  }

  if (smartBusca) {
    smartBusca.addEventListener("input", function() {
      clearTimeout(window.__crosssetSmartBuscaTimer);

      const termo = smartBusca.value;
      const containerSugestoes = elemento("smart-musica-sugestoes");
      const previewSmart = elemento("smart-musica-preview");

      if (previewSmart) {
        previewSmart.classList.remove("ativo");
        previewSmart.innerHTML = "";
      }

      if (limparTexto(termo).length < 2) {
        if (containerSugestoes) {
          containerSugestoes.innerHTML = "";
        }
        return;
      }

      window.__crosssetSmartBuscaTimer = setTimeout(function() {
        renderizarSugestoesSmartMusicas(termo, true);
      }, 450);
    });

    smartBusca.addEventListener("keydown", function(evento) {
      if (evento.key === "Enter") {
        evento.preventDefault();
        renderizarSugestoesSmartMusicas(smartBusca.value, true);
      }
    });
  }

  if (smartBotaoBuscar && smartBusca) {
    smartBotaoBuscar.addEventListener("click", function() {
      renderizarSugestoesSmartMusicas(smartBusca.value, true);
    });
  }

  if (botaoAnexarMaterial && inputMaterial) {
    botaoAnexarMaterial.addEventListener("click", function() {
      inputMaterial.click();
    });
  }

  if (botaoAnexarLetra && inputLetra) {
    botaoAnexarLetra.addEventListener("click", function() {
      inputLetra.click();
    });
  }

  if (botaoSalvar) {
    botaoSalvar.addEventListener("click", salvarMusica);
  }

  if (botaoCancelar) {
    botaoCancelar.addEventListener("click", limparFormularioMusica);
  }

  if (busca) {
    busca.addEventListener("input", renderizarListaMusicas);
  }

  if (ordenar) {
    ordenar.addEventListener("change", renderizarListaMusicas);
  }

  [
    { input: "musica-material-arquivo", info: "musica-material-arquivo-atual" },
    { input: "musica-letra-arquivo", info: "musica-letra-arquivo-atual" }
  ].forEach(function(config) {
    const campoArquivo = elemento(config.input);
    const infoArquivo = elemento(config.info);

    if (campoArquivo && infoArquivo) {
      campoArquivo.addEventListener("change", function() {
        const arquivo = campoArquivo.files && campoArquivo.files[0];
        if (arquivo) {
          infoArquivo.textContent = "Arquivo selecionado: " + arquivo.name;
        }
      });
    }
  });

  const botaoColarLetra = elemento("btn-colar-salvar-letra");
  if (botaoColarLetra) {
    botaoColarLetra.addEventListener("click", function() {
      const campoLetra = elemento("musica-letra");
      if (!campoLetra) { return; }
      campoLetra.value = limparTexto(campoLetra.value);
      campoLetra.focus();
    });
  }
}


function obterCatalogoSmartMusicas() {
  const cadastradas = (appState.musicas || []).map(function(musica) {
    return {
      nome: musica.nome || "",
      artista: musica.artista || "",
      album: "Catálogo do projeto",
      ano: "",
      tom: musica.tom || "",
      bpm: musica.bpm || "",
      duracao: "",
      link_url: obterLinkMusica(musica),
      url_referencia: musica.url_referencia || "",
      origem: "Projeto"
    };
  });

  const baseBeta = [
    { nome: "Sweet Child O' Mine", artista: "Guns N' Roses", album: "Appetite for Destruction", ano: "1987", tom: "D", bpm: 125, duracao: "5:56", link_url: "", origem: "Beta" },
    { nome: "Hotel California", artista: "Eagles", album: "Hotel California", ano: "1976", tom: "Bm", bpm: 74, duracao: "6:30", link_url: "", origem: "Beta" },
    { nome: "Nothing Else Matters", artista: "Metallica", album: "Metallica", ano: "1991", tom: "Em", bpm: 142, duracao: "6:28", link_url: "", origem: "Beta" },
    { nome: "Tempo Perdido", artista: "Legião Urbana", album: "Dois", ano: "1986", tom: "C", bpm: 104, duracao: "5:02", link_url: "", origem: "Beta" },
    { nome: "Primeiros Erros", artista: "Capital Inicial", album: "Acústico MTV", ano: "2000", tom: "G", bpm: 76, duracao: "4:07", link_url: "", origem: "Beta" },
    { nome: "Zombie", artista: "The Cranberries", album: "No Need to Argue", ano: "1994", tom: "Em", bpm: 83, duracao: "5:06", link_url: "", origem: "Beta" },
    { nome: "Creep", artista: "Radiohead", album: "Pablo Honey", ano: "1992", tom: "G", bpm: 92, duracao: "3:58", link_url: "", origem: "Beta" },
    { nome: "Smells Like Teen Spirit", artista: "Nirvana", album: "Nevermind", ano: "1991", tom: "F", bpm: 117, duracao: "5:01", link_url: "", origem: "Beta" }
  ];

  const mapa = new Map();
  cadastradas.concat(baseBeta).forEach(function(item) {
    const chave = (limparTexto(item.nome) + "|" + limparTexto(item.artista)).toLowerCase();
    if (chave && !mapa.has(chave)) {
      mapa.set(chave, item);
    }
  });

  return Array.from(mapa.values());
}

function buscarSugestoesSmartMusicas(termo) {
  const busca = limparTexto(termo).toLowerCase();

  if (!busca || busca.length < 2) {
    return [];
  }

  return obterCatalogoSmartMusicas()
    .filter(function(item) {
      const texto = [item.nome, item.artista, item.album, item.ano].join(" ").toLowerCase();
      return texto.includes(busca);
    })
    .slice(0, 5);
}

async function buscarMusicasSpotifySmart(termo) {
  const cliente = sb();

  if (!cliente) {
    return [];
  }

  const { data, error } = await cliente.functions.invoke("spotify-search", {
    body: { q: termo }
  });

  if (error) {
    throw new Error(error.message || "Erro ao buscar música no Spotify.");
  }

  const resultados = data && Array.isArray(data.resultados) ? data.resultados : [];

  return resultados.map(function(item) {
    return {
      nome: item.nome || "",
      artista: item.artista || "",
      album: item.album || "",
      ano: item.ano || "",
      tom: "",
      bpm: "",
      duracao: item.duracao || "",
      link_url: item.spotify_url || "",
      spotify_url: item.spotify_url || "",
      spotify_id: item.spotify_id || "",
      imagem: item.imagem || "",
      origem: "Spotify"
    };
  });
}

async function renderizarSugestoesSmartMusicas(termo, forcarResultado) {
  const container = elemento("smart-musica-sugestoes");
  const preview = elemento("smart-musica-preview");
  const busca = limparTexto(termo);

  if (!container) {
    return;
  }

  if (preview) {
    preview.classList.remove("ativo");
    preview.innerHTML = "";
  }

  if (!forcarResultado) {
    const sugestoesLocais = buscarSugestoesSmartMusicas(termo);

    if (!sugestoesLocais.length) {
      container.innerHTML = "";
      return;
    }

    renderizarListaSugestoesSmartMusicas(sugestoesLocais);
    return;
  }

  if (busca.length < 2) {
    container.innerHTML = `<small class="crossset-smart-ajuda">Digite pelo menos 2 caracteres para buscar no Spotify.</small>`;
    return;
  }

  container.innerHTML = `<small class="crossset-smart-ajuda">Buscando no Spotify...</small>`;

  try {
    const sugestoesSpotify = await buscarMusicasSpotifySmart(busca);

    if (!sugestoesSpotify.length) {
      container.innerHTML = `<small class="crossset-smart-ajuda">Nenhuma música encontrada no Spotify.</small>`;
      return;
    }

    renderizarListaSugestoesSmartMusicas(sugestoesSpotify);
  } catch (erro) {
    container.innerHTML = `<small class="crossset-smart-ajuda">Não foi possível buscar no Spotify agora.</small>`;
    console.error(erro);
  }
}

function renderizarListaSugestoesSmartMusicas(sugestoes) {
  const container = elemento("smart-musica-sugestoes");

  if (!container) {
    return;
  }

  container.innerHTML = sugestoes.map(function(item, indice) {
    return `
      <button class="crossset-smart-sugestao" type="button" data-smart-musica-indice="${indice}">
        <strong>🎵 ${escaparHtml(item.nome || "Música")}</strong>
        <span>${escaparHtml(item.artista || "Artista não informado")} ${item.album ? "• " + escaparHtml(item.album) : ""} ${item.ano ? "• " + escaparHtml(item.ano) : ""}</span>
      </button>
    `;
  }).join("");

  container.querySelectorAll("[data-smart-musica-indice]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      const indice = Number(botao.dataset.smartMusicaIndice);
      mostrarPreviewSmartMusica(sugestoes[indice]);
    });
  });
}

function mostrarPreviewSmartMusica(musica) {
  const preview = elemento("smart-musica-preview");
  const container = elemento("smart-musica-sugestoes");

  if (!preview || !musica) {
    return;
  }

  if (container) {
    container.innerHTML = "";
  }

  preview.classList.add("ativo");
  preview.innerHTML = `
    <strong>🎵 ${escaparHtml(musica.nome || "Música")}</strong>
    <span>👤 ${escaparHtml(musica.artista || "Artista não informado")}</span>
    <span>💿 ${escaparHtml(musica.album || "Álbum não informado")} ${musica.ano ? "• " + escaparHtml(musica.ano) : ""}</span>
    <div class="crossset-smart-meta">
      <span>⏱️ ${escaparHtml(musica.duracao || "-")}</span>
    </div>
    <div class="crossset-smart-campos-opcionais">
      <label class="crossset-smart-campo-opcional"><span>${iconeCampoMusica("tom")} Tom (opcional)</span><input id="smart-musica-tom" type="text" placeholder="Ex: Em" value="${escaparHtml(musica.tom || "")}" /></label>
      <label class="crossset-smart-campo-opcional"><span>${iconeCampoMusica("bpm")} BPM (opcional)</span><input id="smart-musica-bpm" type="number" inputmode="numeric" min="0" placeholder="Ex: 120" value="${escaparHtml(musica.bpm || "")}" /></label>
      <label class="crossset-smart-campo-opcional url-versao"><span>URL da versão</span><input id="smart-musica-url-referencia" type="url" placeholder="Cole aqui o link da versão que a banda irá estudar" value="${escaparHtml(musica.url_referencia || musica.link_url || "")}" /></label>
      <label class="crossset-smart-campo-opcional url-versao"><span>URL do YouTube (opcional)</span><input id="smart-musica-youtube-url" type="url" placeholder="Cole aqui o link do YouTube" value="${escaparHtml(musica.youtube_url || "")}" /></label>
      <label class="crossset-smart-campo-opcional url-versao"><span>OBS:</span><input id="smart-musica-observacoes" type="text" placeholder="Ex.: Instruções para esta música." value="${escaparHtml(obterObservacaoMusicaManual(musica))}" /></label>
    </div>
    <button class="crossset-smart-confirmar" id="btn-confirmar-smart-musica" type="button">Confirmar cadastro</button>
  `;

  const botaoConfirmar = elemento("btn-confirmar-smart-musica");
  if (botaoConfirmar) {
    botaoConfirmar.addEventListener("click", function() {
      salvarMusicaSmart(musica);
    });
  }
}

async function salvarMusicaSmart(musica) {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();

  if (!cliente || !projetoId || !musica) {
    return;
  }

  const nome = limparTexto(musica.nome);

  if (!nome) {
    alert("Selecione uma música válida.");
    return;
  }

  const tomInformado = limparTexto(elemento("smart-musica-tom")?.value || musica.tom);
  const bpmInformado = limparTexto(elemento("smart-musica-bpm")?.value || musica.bpm);
  const urlReferencia = limparTexto(elemento("smart-musica-url-referencia")?.value || musica.url_referencia || musica.link_url);
  const youtubeUrl = limparTexto(elemento("smart-musica-youtube-url")?.value || musica.youtube_url || "");
  if (youtubeUrl && !ehUrlYoutube(youtubeUrl)) {
    alert("Cole uma URL válida do YouTube.");
    return;
  }
  const bpmNumero = parseInt(bpmInformado, 10);
  const observacoesSmart = limparTexto(elemento("smart-musica-observacoes")?.value || "");

  const payload = {
    projeto_id: projetoId,
    nome: nome,
    artista: limparTexto(musica.artista),
    tom: tomInformado,
    bpm: Number.isFinite(bpmNumero) ? bpmNumero : null,
    link_url: limparTexto(musica.link_url),
    youtube_url: youtubeUrl,
    url_referencia: urlReferencia,
    material_arquivo_url: "",
    letra_arquivo_url: "",
    letra: "",
    observacoes: observacoesSmart,
    ordem_personalizada: obterProximaOrdemPersonalizadaMusica(),
    updated_at: new Date().toISOString()
  };

  const { error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.musicas)
    .insert(payload);

  if (error) {
    alert("Erro ao salvar música pelo CrossSet Smart: " + error.message);
    return;
  }

  const busca = elemento("smart-musica-busca");
  const sugestoes = elemento("smart-musica-sugestoes");
  const preview = elemento("smart-musica-preview");

  if (busca) { busca.value = ""; }
  if (sugestoes) { sugestoes.innerHTML = ""; }
  if (preview) {
    preview.classList.remove("ativo");
    preview.innerHTML = "";
  }

  await buscarMusicas();
  mostrarToast("Música adicionada pelo CrossSet Smart.");
}

function obterProximaOrdemPersonalizadaMusica() {
  const ordens = (appState.musicas || [])
    .map(function(item) { return Number(item.ordem_personalizada); })
    .filter(Number.isFinite);

  return ordens.length ? Math.max.apply(null, ordens) + 1 : 1;
}

function ordenarMusicasPorOrdemPersonalizada(lista) {
  return (lista || []).slice().sort(function(a, b) {
    const ordemA = Number.isFinite(Number(a.ordem_personalizada)) ? Number(a.ordem_personalizada) : Number.MAX_SAFE_INTEGER;
    const ordemB = Number.isFinite(Number(b.ordem_personalizada)) ? Number(b.ordem_personalizada) : Number.MAX_SAFE_INTEGER;
    return (ordemA - ordemB) || (new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
  });
}

async function salvarOrdemPersonalizadaMusicas(itensOrdenados) {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();

  if (!cliente || !projetoId || !Array.isArray(itensOrdenados)) {
    return false;
  }

  const atualizacoes = itensOrdenados.map(function(item, indice) {
    return cliente
      .from(REPERTORIO_FACIL.tabelas.musicas)
      .update({ ordem_personalizada: indice + 1 })
      .eq("id", item.id)
      .eq("projeto_id", projetoId);
  });

  const resultados = await Promise.all(atualizacoes);
  const erro = resultados.find(function(resultado) { return resultado.error; })?.error;

  if (erro) {
    alert("Erro ao salvar a ordem das músicas: " + erro.message);
    return false;
  }

  itensOrdenados.forEach(function(item, indice) {
    item.ordem_personalizada = indice + 1;
  });

  return true;
}

function configurarArrastarMusicasCadastradas() {
  const lista = elemento("lista-musicas");
  const ordem = elemento("ordenar-musicas")?.value || "recentes";
  const busca = limparTexto(elemento("busca-musicas")?.value);

  if (!lista || ordem !== "personalizada" || busca) {
    return;
  }

  let musicaArrastadaId = "";
  let autoScrollFrame = null;
  let autoScrollVelocidade = 0;

  function pararAutoScrollMusicas() {
    autoScrollVelocidade = 0;
    if (autoScrollFrame) {
      cancelAnimationFrame(autoScrollFrame);
      autoScrollFrame = null;
    }
  }

  function executarAutoScrollMusicas() {
    if (!autoScrollVelocidade) {
      autoScrollFrame = null;
      return;
    }

    const antes = lista.scrollTop;
    lista.scrollTop += autoScrollVelocidade;
    atualizarBarraInternaCrossSet(lista);

    if (lista.scrollTop === antes) {
      pararAutoScrollMusicas();
      return;
    }

    autoScrollFrame = requestAnimationFrame(executarAutoScrollMusicas);
  }

  function atualizarAutoScrollMusicas(evento) {
    const retangulo = lista.getBoundingClientRect();
    const zona = Math.min(70, Math.max(42, retangulo.height * 0.22));
    let velocidade = 0;

    if (evento.clientY < retangulo.top + zona) {
      const intensidade = Math.min(1, (retangulo.top + zona - evento.clientY) / zona);
      velocidade = -Math.max(4, Math.round(16 * intensidade));
    } else if (evento.clientY > retangulo.bottom - zona) {
      const intensidade = Math.min(1, (evento.clientY - (retangulo.bottom - zona)) / zona);
      velocidade = Math.max(4, Math.round(16 * intensidade));
    }

    autoScrollVelocidade = velocidade;

    if (velocidade && !autoScrollFrame) {
      autoScrollFrame = requestAnimationFrame(executarAutoScrollMusicas);
    } else if (!velocidade) {
      pararAutoScrollMusicas();
    }
  }

  lista.addEventListener("dragover", function(evento) {
    if (!musicaArrastadaId) {
      return;
    }

    evento.preventDefault();
    atualizarAutoScrollMusicas(evento);
  });

  lista.addEventListener("dragleave", function(evento) {
    const destino = evento.relatedTarget;
    if (!destino || !lista.contains(destino)) {
      pararAutoScrollMusicas();
    }
  });

  lista.addEventListener("drop", pararAutoScrollMusicas);

  lista.querySelectorAll("[data-musica-arrastavel='true']").forEach(function(item) {
    item.addEventListener("dragstart", function(evento) {
      musicaArrastadaId = item.dataset.musicaId || "";
      item.classList.add("musica-arrastando");
      evento.dataTransfer.effectAllowed = "move";
      evento.dataTransfer.setData("text/plain", musicaArrastadaId);
    });

    item.addEventListener("dragend", function() {
      pararAutoScrollMusicas();
      musicaArrastadaId = "";
      item.classList.remove("musica-arrastando");
      lista.querySelectorAll(".musica-alvo-arrastar").forEach(function(alvo) {
        alvo.classList.remove("musica-alvo-arrastar");
      });
    });

    item.addEventListener("dragover", function(evento) {
      evento.preventDefault();
      evento.dataTransfer.dropEffect = "move";
      if ((item.dataset.musicaId || "") !== musicaArrastadaId) {
        item.classList.add("musica-alvo-arrastar");
      }
    });

    item.addEventListener("dragleave", function() {
      item.classList.remove("musica-alvo-arrastar");
    });

    item.addEventListener("drop", async function(evento) {
      evento.preventDefault();
      item.classList.remove("musica-alvo-arrastar");

      const origemId = musicaArrastadaId || evento.dataTransfer.getData("text/plain");
      const destinoId = item.dataset.musicaId || "";

      if (!origemId || !destinoId || origemId === destinoId) {
        return;
      }

      const itens = ordenarMusicasPorOrdemPersonalizada(
        filtrarRegistrosDoProjetoAtual(appState.musicas || [], obterProjetoAtualId())
      );
      const indiceOrigem = itens.findIndex(function(musica) { return String(musica.id) === String(origemId); });
      const indiceDestino = itens.findIndex(function(musica) { return String(musica.id) === String(destinoId); });

      if (indiceOrigem < 0 || indiceDestino < 0) {
        return;
      }

      const [movida] = itens.splice(indiceOrigem, 1);
      itens.splice(indiceDestino, 0, movida);

      const posicaoLista = lista.scrollTop;
      const salvou = await salvarOrdemPersonalizadaMusicas(itens);

      if (salvou) {
        renderizarListaMusicas();
        requestAnimationFrame(function() {
          const novaLista = elemento("lista-musicas");
          if (novaLista) novaLista.scrollTop = posicaoLista;
        });
      }
    });
  });
}


function obterLinkSpotifyMusica(item) {
  const candidatos = [
    item?.spotify_url,
    item?.link_url,
    item?.link
  ];

  return candidatos
    .map(function(valor) { return limparTexto(valor); })
    .find(function(valor) {
      return /^spotify:track:/i.test(valor) ||
        /^https?:\/\/(open\.)?spotify\.com\/track\//i.test(valor);
    }) || "";
}

/* CrossSet v82 — capa compacta do Spotify, somente visual e sem alterar o banco. */
const cacheCapasSpotify = new Map();

async function obterCapaSpotifyMusica(item) {
  const linkSpotify = obterLinkSpotifyMusica(item);

  if (!linkSpotify) {
    return "";
  }

  if (cacheCapasSpotify.has(linkSpotify)) {
    return cacheCapasSpotify.get(linkSpotify);
  }

  const requisicao = (async function() {
    try {
      const resultados = await buscarMusicasSpotifySmart(
        [item?.nome, item?.artista].filter(Boolean).join(" ")
      );
      const musicaCorrespondente = resultados.find(function(resultado) {
        return limparTexto(resultado.spotify_url) === linkSpotify;
      }) || resultados[0];

      return limparTexto(musicaCorrespondente?.imagem || "");
    } catch (erro) {
      console.warn("Não foi possível carregar a capa do Spotify.", erro);
      return "";
    }
  })();

  cacheCapasSpotify.set(linkSpotify, requisicao);
  return requisicao;
}

function carregarCapasSpotifyMusicas(lista, itens) {
  if (!lista) return;

  itens.forEach(async function(item) {
    const destino = lista.querySelector(`[data-capa-spotify-musica="${CSS.escape(String(item.id))}"]`);
    if (!destino) return;

    const urlCapa = await obterCapaSpotifyMusica(item);
    if (!urlCapa || !destino.isConnected) return;

    const imagem = document.createElement("img");
    imagem.className = "musica-capa-mini";
    imagem.src = urlCapa;
    imagem.alt = "";
    imagem.loading = "lazy";
    imagem.referrerPolicy = "no-referrer";
    imagem.addEventListener("error", function() {
      imagem.remove();
      destino.classList.remove("com-capa");
    });

    destino.textContent = "";
    destino.classList.add("com-capa");
    destino.appendChild(imagem);
  });
}

function exportarMusicasProjetoPDF() {
  const projetoId = obterProjetoAtualId();
  const projeto = appState.projetoAtual || {};
  const musicas = filtrarRegistrosDoProjetoAtual(appState.musicas || [], projetoId)
    .slice()
    .sort(function(a, b) {
      return limparTexto(a.nome).localeCompare(limparTexto(b.nome), "pt-BR", { sensitivity: "base" });
    });

  if (!musicas.length) {
    alert("Nenhuma música cadastrada neste projeto.");
    return;
  }

  const dataGeracao = formatarDataPDF(new Date());
  const nomeProjeto = escaparHtml(projeto.nome || "Projeto");

  const linhas = musicas.map(function(musica, indice) {
    const numero = String(indice + 1).padStart(2, "0");
    const observacao = obterObservacaoMusicaManual(musica);

    return `
      <tr>
        <td class="numero">${numero}</td>
        <td class="musica-coluna">
          <strong>${escaparHtml(musica.nome || "Sem nome")}</strong>
          <span>${escaparHtml(musica.artista || "Artista não informado")}</span>
        </td>
        <td class="obs-musica">${observacao ? escaparHtml(observacao) : "-"}</td>
        <td class="dado-centralizado">${escaparHtml(musica.tom || "-")}</td>
        <td class="dado-centralizado">${escaparHtml(musica.bpm || "-")}</td>
        <td class="dado-centralizado">${escaparHtml(musica.duracao || "-")}</td>
      </tr>
    `;
  }).join("");

  const documento = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>${nomeProjeto} - Lista de Músicas</title>
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 32px; font-family: Arial, Helvetica, sans-serif; color: #111827; background: #ffffff; }
        .cabecalho { border-bottom: 3px solid #6d28d9; padding-bottom: 16px; margin-bottom: 22px; }
        .marca { font-size: 13px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #6d28d9; margin-bottom: 8px; }
        h1 { margin: 0 0 6px; font-size: 28px; color: #111827; }
        h2 { margin: 0; font-size: 18px; font-weight: 600; color: #374151; }
        .info { margin-top: 14px; display: grid; gap: 4px; font-size: 13px; color: #4b5563; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #6b7280; border-bottom: 2px solid #e5e7eb; padding: 10px 7px; }
        td { border-bottom: 1px solid #e5e7eb; padding: 11px 7px; vertical-align: top; font-size: 13px; }
        td strong { display: block; font-size: 14px; color: #111827; margin-bottom: 3px; }
        td span { display: block; font-size: 11px; color: #6b7280; }
        .numero { font-weight: 800; color: #6d28d9; }
        .musica-coluna { width: 42%; }
        .obs-musica { width: 25%; font-size: 11px; line-height: 1.4; color: #4b5563; font-style: italic; white-space: normal; overflow-wrap: anywhere; word-break: break-word; }
        .dado-centralizado { text-align: center; white-space: nowrap; }
        th.dado-centralizado { text-align: center; }
        .rodape { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; gap: 16px; font-size: 12px; color: #6b7280; }
        @media print { body { padding: 22px; } .cabecalho { break-after: avoid; } tr { break-inside: avoid; } }
      </style>
    </head>
    <body>
      <section class="cabecalho">
        <div class="marca">CrossSet</div>
        <h1>${nomeProjeto}</h1>
        <h2>Lista de Músicas</h2>
        <div class="info">
          <div><strong>Data de geração:</strong> ${escaparHtml(dataGeracao)}</div>
          <div><strong>Total de músicas:</strong> ${musicas.length}</div>
        </div>
      </section>
      <table>
        <colgroup>
          <col style="width:4%" /><col style="width:42%" /><col style="width:25%" />
          <col style="width:8%" /><col style="width:8%" /><col style="width:13%" />
        </colgroup>
        <thead><tr><th>Nº</th><th>Música</th><th>OBS</th><th class="dado-centralizado">Tom</th><th class="dado-centralizado">BPM</th><th class="dado-centralizado">Duração</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>
      <div class="rodape"><span>Gerado pelo CrossSet</span><span>crossset.app</span></div>
      <script>window.addEventListener('load', function() { setTimeout(function() { window.print(); }, 300); });<\/script>
    </body>
    </html>
  `;

  abrirJanelaImpressaoRepertorio(documento);
}

function criarNomeArquivoSpotify() {
  const projeto = limparTexto(appState.projetoAtual?.nome || "CrossSet");
  const nomeSeguro = projeto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-");

  return (nomeSeguro || "CrossSet") + "-links-Spotify.txt";
}

async function exportarLinksSpotifyMusicas() {
  const projetoId = obterProjetoAtualId();
  const musicas = filtrarRegistrosDoProjetoAtual(appState.musicas || [], projetoId);

  const itens = musicas
    .map(function(musica) {
      return {
        nome: limparTexto(musica.nome || "Música sem nome"),
        artista: limparTexto(musica.artista || ""),
        link: obterLinkSpotifyMusica(musica)
      };
    })
    .filter(function(item) { return Boolean(item.link); });

  if (!itens.length) {
    alert("Nenhuma música deste projeto possui link do Spotify.");
    return;
  }

  const projeto = limparTexto(appState.projetoAtual?.nome || "Projeto musical");
  const linhas = [
    "CROSSSET",
    "Projeto: " + projeto,
    "Links do Spotify: " + itens.length,
    ""
  ];

  itens.forEach(function(item, indice) {
    linhas.push(
      String(indice + 1).padStart(2, "0") + ". " +
      item.nome +
      (item.artista ? " — " + item.artista : "")
    );
    linhas.push(item.link);
    linhas.push("");
  });

  const conteudo = linhas.join("\n");
  const blob = new Blob([conteudo], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const linkDownload = document.createElement("a");

  linkDownload.href = url;
  linkDownload.download = criarNomeArquivoSpotify();
  linkDownload.style.display = "none";
  document.body.appendChild(linkDownload);
  linkDownload.click();
  linkDownload.remove();

  setTimeout(function() {
    URL.revokeObjectURL(url);
  }, 1500);

  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(conteudo);
      mostrarToast(
        itens.length + " link" + (itens.length === 1 ? "" : "s") +
        " exportado" + (itens.length === 1 ? "" : "s") +
        " e copiado" + (itens.length === 1 ? "" : "s") + "."
      );
      return;
    } catch (erroClipboard) {
      console.warn("Arquivo exportado, mas não foi possível copiar a lista.", erroClipboard);
    }
  }

  mostrarToast(
    itens.length + " link" + (itens.length === 1 ? "" : "s") +
    " do Spotify exportado" + (itens.length === 1 ? "" : "s") + "."
  );
}

function obterLinkYoutubeMusica(item) {
  const candidatos = [
    item?.youtube_url,
    item?.url_youtube,
    item?.youtube
  ];

  return candidatos
    .map(function(valor) { return limparTexto(valor); })
    .find(function(valor) {
      return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(valor);
    }) || "";
}

function criarNomeArquivoYoutube() {
  const projeto = limparTexto(appState.projetoAtual?.nome || "CrossSet");
  const nomeSeguro = projeto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-");

  return (nomeSeguro || "CrossSet") + "-links-YouTube.txt";
}

async function exportarLinksYoutubeMusicas() {
  const projetoId = obterProjetoAtualId();
  const musicas = filtrarRegistrosDoProjetoAtual(appState.musicas || [], projetoId);

  const itens = musicas
    .map(function(musica) {
      return {
        nome: limparTexto(musica.nome || "Música sem nome"),
        artista: limparTexto(musica.artista || ""),
        link: obterLinkYoutubeMusica(musica)
      };
    })
    .filter(function(item) { return Boolean(item.link); });

  if (!itens.length) {
    alert("Nenhuma música deste projeto possui link do YouTube.");
    return;
  }

  const projeto = limparTexto(appState.projetoAtual?.nome || "Projeto musical");
  const linhas = [
    "CROSSSET",
    "Projeto: " + projeto,
    "Links do YouTube: " + itens.length,
    ""
  ];

  itens.forEach(function(item, indice) {
    linhas.push(
      String(indice + 1).padStart(2, "0") + ". " +
      item.nome +
      (item.artista ? " — " + item.artista : "")
    );
    linhas.push(item.link);
    linhas.push("");
  });

  const conteudo = linhas.join("\n");
  const blob = new Blob([conteudo], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const linkDownload = document.createElement("a");

  linkDownload.href = url;
  linkDownload.download = criarNomeArquivoYoutube();
  linkDownload.style.display = "none";
  document.body.appendChild(linkDownload);
  linkDownload.click();
  linkDownload.remove();

  setTimeout(function() {
    URL.revokeObjectURL(url);
  }, 1500);

  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(conteudo);
      mostrarToast(
        itens.length + " link" + (itens.length === 1 ? "" : "s") +
        " exportado" + (itens.length === 1 ? "" : "s") +
        " e copiado" + (itens.length === 1 ? "" : "s") + "."
      );
      return;
    } catch (erroClipboard) {
      console.warn("Arquivo exportado, mas não foi possível copiar a lista.", erroClipboard);
    }
  }

  mostrarToast(
    itens.length + " link" + (itens.length === 1 ? "" : "s") +
    " do YouTube exportado" + (itens.length === 1 ? "" : "s") + "."
  );
}

async function buscarMusicas() {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();
  const lista = elemento("lista-musicas");

  if (!cliente || !projetoId || !lista) {
    return;
  }

  const { data: sessionData } = await cliente.auth.getSession();
  const usuario = sessionData.session?.user || null;

  const [musicasResultado, integrantesResultado, progressoResultado] = await Promise.all([
    cliente
      .from(REPERTORIO_FACIL.tabelas.musicas)
      .select("*")
      .eq("projeto_id", projetoId)
      .order("created_at", { ascending: false }),

    cliente
      .from(REPERTORIO_FACIL.tabelas.integrantes)
      .select("*")
      .eq("projeto_id", projetoId)
      .order("nome", { ascending: true }),

    cliente
      .from(REPERTORIO_FACIL.tabelas.progressoMusicas)
      .select("*")
      .eq("projeto_id", projetoId)
  ]);

  if (!projetoAtualAindaEh(projetoId)) {
    return;
  }

  if (musicasResultado.error) {
    lista.innerHTML = `<p>Erro ao carregar músicas: ${escaparHtml(musicasResultado.error.message)}</p>`;
    return;
  }

  if (integrantesResultado.error) {
    lista.innerHTML = `<p>Erro ao carregar integrantes: ${escaparHtml(integrantesResultado.error.message)}</p>`;
    return;
  }

  if (progressoResultado.error) {
    lista.innerHTML = `<p>Erro ao carregar progresso das músicas: ${escaparHtml(progressoResultado.error.message)}</p>`;
    return;
  }

  appState.musicas = filtrarRegistrosDoProjetoAtual(musicasResultado.data || [], projetoId);
  appState.integrantesProjetoMusicas = filtrarRegistrosDoProjetoAtual(integrantesResultado.data || [], projetoId);
  appState.progressoMusicas = filtrarRegistrosDoProjetoAtual(progressoResultado.data || [], projetoId);
  appState.meuIntegranteAtual = encontrarMeuIntegranteNoProjeto(appState.integrantesProjetoMusicas, usuario);

  renderizarListaMusicas();
}

function obterLinkMusica(item) {
  return item.link_url || item.link || item.youtube_url || item.spotify_url || "";
}

function obterArquivoMaterialMusica(item) {
  return item.material_arquivo_url || item.material_musical_arquivo_url || item.arquivo_material_url || "";
}

function obterArquivoLetraMusica(item) {
  return item.letra_arquivo_url || item.arquivo_letra_url || "";
}

function montarLinkArquivoMusica(url, texto, icone) {
  if (!url) {
    return "";
  }

  return `<a class="link-arquivo-musica" href="${escaparHtml(url)}" target="_blank" rel="noopener noreferrer">${escaparHtml(icone || "")}${escaparHtml(texto)}</a>`;
}


function normalizarUrlExterna(url) {
  const texto = limparTexto(url || "");

  if (!texto) {
    return "";
  }

  return /^https?:\/\//i.test(texto) ? texto : "https://" + texto;
}

function ehUrlYoutube(url) {
  const texto = limparTexto(url || "").toLowerCase();
  return texto.includes("youtube.com/") || texto.includes("youtu.be/");
}

function montarUrlReferenciaMusica(item) {
  const urlReferencia = limparTexto(
    item?.url_referencia ||
    item?.url_versao ||
    item?.versao_url ||
    item?.referencia_url ||
    item?.link_referencia ||
    obterLinkMusica(item) ||
    ""
  );

  const youtubeValor = ehUrlYoutube(item?.youtube_url) ? limparTexto(item.youtube_url) : "";
  const linhas = [];

  if (urlReferencia) {
    const hrefReferencia = normalizarUrlExterna(urlReferencia);
    linhas.push(`
      <div class="musica-url-referencia">
        <span>Referência:</span>
        <a href="${escaparHtml(hrefReferencia)}" target="_blank" rel="noopener noreferrer" title="${escaparHtml(urlReferencia)}">${escaparHtml(urlReferencia)}</a>
      </div>
    `);
  }

  linhas.push(`
    <label class="musica-youtube-linha" title="URL do YouTube opcional">
      <strong>YouTube:</strong>
      <input class="input-musica-youtube-linha" type="url" value="${escaparHtml(youtubeValor)}" placeholder="URL do YouTube" data-campo-rapido-musica="youtube_url" data-musica-id="${escaparHtml(item.id)}" />
      <span class="texto-opcional-musica">(opcional)</span>
    </label>
  `);

  return linhas.join("");
}

function obterObservacaoMusicaManual(item) {
  const texto = limparTexto(item?.observacoes || "");

  if (!texto) {
    return "";
  }

  const linhas = texto
    .split(/\r?\n/)
    .map(function(linha) { return limparTexto(linha); })
    .filter(Boolean);

  if (linhas.length > 0 && linhas.every(function(linha) {
    return /^(álbum|album|ano|duração|duracao|origem):/i.test(linha);
  })) {
    return "";
  }

  return texto;
}

function montarObservacoesMusica(item) {
  const observacao = obterObservacaoMusicaManual(item);

  return `
    <div class="musica-observacao-manual musica-observacao-editavel">
      <strong>OBS:</strong>
      <input class="input-musica-obs-linha" type="text" value="${escaparHtml(observacao)}" placeholder="Ex.: Instruções para esta música." data-campo-rapido-musica="observacoes" data-musica-id="${escaparHtml(item.id)}" />
    </div>
  `;
}

function encontrarMeuIntegranteNoProjeto(integrantes, usuario) {
  if (!usuario) {
    return null;
  }

  return (integrantes || []).find(function(integrante) {
    return integrante.usuario_id === usuario.id || integrante.user_id === usuario.id;
  }) || null;
}

function obterProgressoDaMusica(musicaId) {
  const integrantes = appState.integrantesProjetoMusicas || [];
  const progresso = appState.progressoMusicas || [];

  if (!integrantes.length) {
    return { percentual: 0, prontas: 0, total: 0, cor: "vermelha" };
  }

  let pontos = 0;
  let prontas = 0;

  integrantes.forEach(function(integrante) {
    const registro = progresso.find(function(item) {
      return item.musica_id === musicaId && item.integrante_id === integrante.id;
    });

    const status = registro?.status || "nao_iniciada";

    if (status === "pronta") {
      pontos += 1;
      prontas += 1;
      return;
    }

    if (status === "em_estudo") {
      pontos += 0.5;
    }
  });

  const percentual = Math.round((pontos / integrantes.length) * 100);
  let cor = "vermelha";

  if (percentual === 100) {
    cor = "verde";
  } else if (percentual >= 50) {
    cor = "amarela";
  }

  return { percentual: percentual, prontas: prontas, total: integrantes.length, cor: cor };
}

function obterMeuStatusMusica(musicaId) {
  const meuIntegrante = appState.meuIntegranteAtual;

  if (!meuIntegrante) {
    return "nao_iniciada";
  }

  const registro = (appState.progressoMusicas || []).find(function(item) {
    return item.musica_id === musicaId && item.integrante_id === meuIntegrante.id;
  });

  return registro?.status || "nao_iniciada";
}

function montarControleMeuProgresso(musicaId) {
  if (!appState.meuIntegranteAtual) {
    return "";
  }

  const statusAtual = obterMeuStatusMusica(musicaId);

  return `
    <div class="meu-progresso-musica" aria-label="Meu progresso nesta música">
      <span>Meu progresso:</span>
      <button class="btn-status-musica vermelha ${statusAtual === "nao_iniciada" ? "ativo" : ""}" type="button" title="Não iniciada" data-status-musica="nao_iniciada" data-musica-id="${escaparHtml(musicaId)}">Não iniciada</button>
      <button class="btn-status-musica amarela ${statusAtual === "em_estudo" ? "ativo" : ""}" type="button" title="Em estudo" data-status-musica="em_estudo" data-musica-id="${escaparHtml(musicaId)}">Em estudo</button>
      <button class="btn-status-musica verde ${statusAtual === "pronta" ? "ativo" : ""}" type="button" title="Pronta" data-status-musica="pronta" data-musica-id="${escaparHtml(musicaId)}">Pronta</button>
    </div>
  `;
}

function montarPainelMeuProgressoEdicao(musicaId) {
  if (!appState.meuIntegranteAtual) {
    return `
      <div class="painel-meu-progresso-inline">
        <strong>Meu progresso:</strong> seu cadastro de integrante não foi encontrado neste projeto.
      </div>
    `;
  }

  const statusAtual = obterMeuStatusMusica(musicaId);

  return `
    <div class="painel-meu-progresso-inline" aria-label="Meu progresso nesta música">
      <strong>Meu progresso nesta música:</strong>
      <button class="btn-progresso-inline ${statusAtual === "nao_iniciada" ? "ativo" : ""}" type="button" data-status-musica="nao_iniciada" data-musica-id="${escaparHtml(musicaId)}"><i class="bolinha-status-mini vermelha"></i>Não iniciada</button>
      <button class="btn-progresso-inline ${statusAtual === "em_estudo" ? "ativo" : ""}" type="button" data-status-musica="em_estudo" data-musica-id="${escaparHtml(musicaId)}"><i class="bolinha-status-mini amarela"></i>Em andamento</button>
      <button class="btn-progresso-inline ${statusAtual === "pronta" ? "ativo" : ""}" type="button" data-status-musica="pronta" data-musica-id="${escaparHtml(musicaId)}"><i class="bolinha-status-mini verde"></i>Concluída</button>
    </div>
  `;
}


function abreviarNomeIntegrante(nome) {
  const texto = limparTexto(nome || "?");
  if (!texto) {
    return "?";
  }

  const primeiro = texto.split(/\s+/)[0];
  if (primeiro.length <= 5) {
    return primeiro;
  }

  return primeiro.slice(0, 5);
}

function corStatusMusica(status) {
  if (status === "pronta") {
    return "verde";
  }

  if (status === "em_estudo") {
    return "amarela";
  }

  return "vermelha";
}

function proximoStatusMusica(statusAtual) {
  if (statusAtual === "nao_iniciada") {
    return "em_estudo";
  }

  if (statusAtual === "em_estudo") {
    return "pronta";
  }

  return "nao_iniciada";
}

function montarPreparacaoLinhaMusica(musicaId) {
  const integrantes = appState.integrantesProjetoMusicas || [];
  const progresso = appState.progressoMusicas || [];
  const meuIntegrante = appState.meuIntegranteAtual;

  if (!integrantes.length) {
    return `<span class="status-integrante-mini">Sem integrantes</span>`;
  }

  return integrantes.map(function(integrante) {
    const registro = progresso.find(function(item) {
      return item.musica_id === musicaId && item.integrante_id === integrante.id;
    });

    const status = registro?.status || "nao_iniciada";
    const cor = corStatusMusica(status);
    const nome = abreviarNomeIntegrante(integrante.nome || integrante.email || "Integrante");
    const titulo = status === "pronta" ? "Pronta" : (status === "em_estudo" ? "Em estudo" : "Não iniciada");

    if (meuIntegrante && meuIntegrante.id === integrante.id) {
      return `<button class="status-integrante-mini-botao" type="button" title="${escaparHtml(titulo)} - clique para alterar" data-ciclar-status-musica="${escaparHtml(musicaId)}" data-status-atual="${escaparHtml(status)}"><i class="bolinha-status-mini ${cor}"></i>${escaparHtml(nome)}</button>`;
    }

    return `<span class="status-integrante-mini" title="${escaparHtml(titulo)}"><i class="bolinha-status-mini ${cor}"></i>${escaparHtml(nome)}</span>`;
  }).join("");
}


function iconeCampoMusica(tipo) {
  if (tipo === "tom") {
    return `<svg class="icone-musica-campo" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>`;
  }

  return `<svg class="icone-musica-campo" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12h3"></path><path d="M17 12h3"></path><path d="M12 4v3"></path><path d="M12 17v3"></path><path d="M7.8 7.8l2.1 2.1"></path><path d="M14.1 14.1l2.1 2.1"></path><path d="M16.2 7.8l-2.1 2.1"></path><path d="M9.9 14.1l-2.1 2.1"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
}

function montarCamposRapidosMusica(item) {
  return `
    <span class="musica-campos-rapidos">
      <label class="musica-campo-rapido" title="Tom opcional">
        ${iconeCampoMusica("tom")}
        <span>Tom:</span>
        <input class="input-musica-rapido" type="text" value="${escaparHtml(item.tom || "")}" placeholder="—" data-campo-rapido-musica="tom" data-musica-id="${escaparHtml(item.id)}" />
        <span class="texto-opcional-musica">(opcional)</span>
      </label>
      <label class="musica-campo-rapido" title="BPM opcional">
        ${iconeCampoMusica("bpm")}
        <span>BPM:</span>
        <input class="input-musica-rapido" type="number" inputmode="numeric" min="0" value="${escaparHtml(item.bpm || "")}" placeholder="—" data-campo-rapido-musica="bpm" data-musica-id="${escaparHtml(item.id)}" />
        <span class="texto-opcional-musica">(opcional)</span>
      </label>
    </span>
  `;
}

function montarProgressoInlineMusica(musicaId) {
  const progresso = obterProgressoDaMusica(musicaId);

  return `
    <span class="progresso-musica-inline" title="Preparação da banda">
      <span class="barra-fina-musica"><span class="${progresso.cor}" style="width:${progresso.percentual}%"></span></span>
      <strong>${progresso.percentual}%</strong>
    </span>
  `;
}

function iconeAcaoMusica(tipo) {
  const icones = {
    editar: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,
    compartilhar: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.7 6.8-4.4"/><path d="m8.6 13.3 6.8 4.4"/></svg>`,
    pdf: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 17v-4h1.6a1.2 1.2 0 0 1 0 2.4H8"/><path d="M12 17v-4h1.1a2 2 0 0 1 0 4H12"/><path d="M17 13h-2v4"/><path d="M15 15h1.7"/></svg>`,
    excluir: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`,
    material: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
    letra: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h6"/></svg>`,
    anexar: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>`,
    colar: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M8 11h8"/><path d="M8 15h6"/></svg>`
  };

  return icones[tipo] || "";
}

function montarResumoProgressoMusica(musicaId) {
  const progresso = obterProgressoDaMusica(musicaId);

  const textoProntas = progresso.total > 0
    ? `${progresso.prontas} de ${progresso.total} integrantes prontos`
    : "Sem integrantes";

  return `
    <div class="progresso-musica-card">
      <div class="progresso-musica-resumo">
        <span class="progresso-musica-percentual">
          <i class="bolinha-status-musica ${progresso.cor}"></i>
          ${progresso.percentual}%
        </span>
        <span>${textoProntas}</span>
      </div>
      <div class="barra-progresso-musica" title="Progresso da música">
        <span class="${progresso.cor}" style="width:${progresso.percentual}%"></span>
      </div>
      <small class="progresso-musica-ajuda">ⓘ O percentual representa o progresso coletivo da banda nesta música.</small>
      ${montarControleMeuProgresso(musicaId)}
    </div>
  `;
}

function atualizarBarraInternaCrossSet(lista) {
  if (!lista) return;
  const wrapper = lista.parentElement;
  const track = wrapper?.querySelector(":scope > .crossset-scroll-track");
  const thumb = track?.querySelector(".crossset-scroll-thumb");
  if (!wrapper || !track || !thumb) return;
  const clientHeight = lista.clientHeight;
  const scrollHeight = lista.scrollHeight;
  if (!clientHeight || scrollHeight <= clientHeight + 2) { track.classList.add("oculta"); return; }
  track.classList.remove("oculta");
  const trackHeight = track.clientHeight;
  const thumbHeight = Math.max(28, Math.round(trackHeight * (clientHeight / scrollHeight)));
  const maxThumbTop = Math.max(0, trackHeight - thumbHeight);
  const maxScrollTop = Math.max(1, scrollHeight - clientHeight);
  const thumbTop = Math.round((lista.scrollTop / maxScrollTop) * maxThumbTop);
  thumb.style.height = thumbHeight + "px";
  thumb.style.transform = "translateY(" + thumbTop + "px)";
}

function ativarBarraInternaCrossSet(lista) {
  if (!lista) return;
  if (lista.dataset.crosssetScrollCustomizada === "1") { requestAnimationFrame(() => atualizarBarraInternaCrossSet(lista)); return; }
  lista.dataset.crosssetScrollCustomizada = "1";
  lista.classList.add("crossset-scroll-customizada");
  const wrapper = document.createElement("div");
  wrapper.className = "crossset-scroll-wrapper";
  lista.parentNode.insertBefore(wrapper, lista);
  wrapper.appendChild(lista);
  const track = document.createElement("div"); track.className = "crossset-scroll-track";
  const thumb = document.createElement("div"); thumb.className = "crossset-scroll-thumb";
  track.appendChild(thumb); wrapper.appendChild(track);

  let arrastando = false;
  let inicioPointerY = 0;
  let inicioScrollTop = 0;

  thumb.addEventListener("pointerdown", function(evento) {
    if (evento.pointerType === "mouse" && evento.button !== 0) return;
    arrastando = true;
    inicioPointerY = evento.clientY;
    inicioScrollTop = lista.scrollTop;
    thumb.classList.add("arrastando");
    thumb.setPointerCapture?.(evento.pointerId);
    evento.preventDefault();
    evento.stopPropagation();
  });

  thumb.addEventListener("pointermove", function(evento) {
    if (!arrastando) return;
    const trackHeight = track.clientHeight;
    const thumbHeight = thumb.getBoundingClientRect().height;
    const maxThumbTop = Math.max(1, trackHeight - thumbHeight);
    const maxScrollTop = Math.max(1, lista.scrollHeight - lista.clientHeight);
    const deltaY = evento.clientY - inicioPointerY;
    lista.scrollTop = inicioScrollTop + (deltaY / maxThumbTop) * maxScrollTop;
    atualizarBarraInternaCrossSet(lista);
    evento.preventDefault();
  });

  function encerrarArraste(evento) {
    if (!arrastando) return;
    arrastando = false;
    thumb.classList.remove("arrastando");
    try { thumb.releasePointerCapture?.(evento.pointerId); } catch (_) {}
  }

  thumb.addEventListener("pointerup", encerrarArraste);
  thumb.addEventListener("pointercancel", encerrarArraste);

  track.addEventListener("pointerdown", function(evento) {
    if (evento.target === thumb) return;
    const trackRect = track.getBoundingClientRect();
    const thumbHeight = thumb.getBoundingClientRect().height;
    const maxThumbTop = Math.max(1, track.clientHeight - thumbHeight);
    const ponto = Math.min(maxThumbTop, Math.max(0, evento.clientY - trackRect.top - thumbHeight / 2));
    const maxScrollTop = Math.max(1, lista.scrollHeight - lista.clientHeight);
    lista.scrollTop = (ponto / maxThumbTop) * maxScrollTop;
    atualizarBarraInternaCrossSet(lista);
    evento.preventDefault();
  });

  lista.addEventListener("scroll", () => atualizarBarraInternaCrossSet(lista), { passive:true });
  requestAnimationFrame(() => atualizarBarraInternaCrossSet(lista));
}

function ativarBarrasInternasCrossSet() {
  [".lista-integrantes", ".card-lista-musicas-smart .lista-musicas", ".lista-eventos", ".repertorio-biblioteca-lista", ".lista-biblioteca-musicas", ".lista-musicas-repertorio", ".setlist-lista-final"].forEach(function(seletor){
    document.querySelectorAll(seletor).forEach(ativarBarraInternaCrossSet);
  });
}

function ajustarAlturaListaMusicas() {
  const lista = elemento("lista-musicas");

  if (!lista || window.innerWidth <= 820) {
    return;
  }

  const itens = Array.from(lista.querySelectorAll(".item-musica"));

  if (!itens.length) {
    lista.style.height = "auto";
    lista.style.maxHeight = "none";
    return;
  }

  const estilosLista = window.getComputedStyle(lista);
  const gap = parseFloat(estilosLista.rowGap || estilosLista.gap || "10") || 10;
  const quantidadeVisivel = Math.min(2, itens.length);
  let altura = 0;

  for (let i = 0; i < quantidadeVisivel; i += 1) {
    altura += itens[i].getBoundingClientRect().height;
  }

  if (quantidadeVisivel > 1) {
    altura += gap;
  }

  const alturaFinal = Math.ceil(altura);
  lista.style.setProperty("height", alturaFinal + "px", "important");
  lista.style.setProperty("max-height", alturaFinal + "px", "important");
  lista.style.setProperty("overflow-y", "scroll", "important");
  lista.style.setProperty("overflow-x", "hidden", "important");

  const card = lista.closest(".card-lista-musicas-smart");
  if (card) {
    card.style.setProperty("overflow", "hidden", "important");
  }
}

function renderizarListaMusicas() {
  const lista = elemento("lista-musicas");
  const busca = limparTexto(elemento("busca-musicas")?.value).toLowerCase();
  const ordem = elemento("ordenar-musicas")?.value || "recentes";

  if (!lista) {
    return;
  }

  const projetoIdAtual = obterProjetoAtualId();
  let itens = filtrarRegistrosDoProjetoAtual(appState.musicas || [], projetoIdAtual);

  if (busca) {
    itens = itens.filter(function(item) {
      const texto = [
        item.nome,
        item.artista,
        item.tom,
        item.bpm,
        obterLinkMusica(item),
        item.url_referencia,
        item.youtube_url,
        obterArquivoMaterialMusica(item),
        item.letra,
        obterArquivoLetraMusica(item),
        item.observacoes
      ].join(" ").toLowerCase();
      return texto.includes(busca);
    });
  }

  itens.sort(function(a, b) {
    if (ordem === "personalizada") {
      const ordemA = Number.isFinite(Number(a.ordem_personalizada)) ? Number(a.ordem_personalizada) : Number.MAX_SAFE_INTEGER;
      const ordemB = Number.isFinite(Number(b.ordem_personalizada)) ? Number(b.ordem_personalizada) : Number.MAX_SAFE_INTEGER;
      return (ordemA - ordemB) || (new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
    }

    if (ordem === "nome") {
      return compararTexto(a.nome, b.nome);
    }

    if (ordem === "artista") {
      return compararTexto(a.artista, b.artista) || compararTexto(a.nome, b.nome);
    }

    if (ordem === "tom") {
      return compararTexto(a.tom, b.tom) || compararTexto(a.nome, b.nome);
    }

    if (ordem === "bpm") {
      return (Number(a.bpm || 0) - Number(b.bpm || 0)) || compararTexto(a.nome, b.nome);
    }

    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });

  if (itens.length === 0) {
    lista.innerHTML = `<p>Nenhuma música encontrada.</p>`;
    return;
  }

  const permiteArrastar = ordem === "personalizada" && !busca;

  lista.innerHTML = itens.map(function(item) {
    const link = obterLinkMusica(item);
    const linkSeguro = escaparHtml(link);
    const arquivoMaterial = obterArquivoMaterialMusica(item);
    const temLetra = limparTexto(item.letra).length > 0;
    const temMaterial = limparTexto(arquivoMaterial).length > 0;
    const indicadores = [
      temLetra ? `<span class="indicador-conteudo-musica" title="Letra disponível" aria-label="Letra disponível">${iconeAcaoMusica("letra")}</span>` : "",
      temMaterial ? `<span class="indicador-conteudo-musica" title="Cifra / Partitura disponível" aria-label="Cifra / Partitura disponível">${iconeAcaoMusica("material")}</span>` : ""
    ].filter(Boolean).join("");
    const linksArquivos = [
      montarLinkArquivoMusica(arquivoMaterial, "Cifra / Partitura", "")
    ].filter(Boolean).join("");

    const arquivoLetra = obterArquivoLetraMusica(item);
    const temLetraCompleta = temLetra || limparTexto(arquivoLetra).length > 0;

    return `
      <div class="item-musica" ${permiteArrastar ? `draggable="true" data-musica-arrastavel="true" data-musica-id="${escaparHtml(item.id)}"` : ""}>
        <div class="musica-linha-principal">
          <div class="musica-identidade">
            ${permiteArrastar ? `<span class="musica-arrastar-personalizada" title="Arrastar para reorganizar" aria-label="Arrastar para reorganizar">⋮⋮</span>` : ""}
            <span class="musica-icone-mini" data-capa-spotify-musica="${escaparHtml(item.id)}">♪</span>
            <span class="musica-nome-mini" title="${escaparHtml(item.nome || "Sem nome")}">${escaparHtml(item.nome || "Sem nome")}</span>
            <span class="musica-artista-mini" title="${escaparHtml(item.artista || "Não informado")}">${escaparHtml(item.artista || "Não informado")}</span>
          </div>

          <div class="acoes-icone-musica">
            <button class="btn-acao-musica" type="button" title="Editar" data-editar-musica="${escaparHtml(item.id)}">${iconeAcaoMusica("editar")}</button>
            <button class="btn-acao-musica" type="button" title="Compartilhar" data-compartilhar-musica="${escaparHtml(item.id)}">${iconeAcaoMusica("compartilhar")}</button>
            <button class="btn-acao-musica" type="button" title="Excluir" data-excluir-musica="${escaparHtml(item.id)}">${iconeAcaoMusica("excluir")}</button>
          </div>
        </div>

        <div class="musica-linha-meta">
          ${montarCamposRapidosMusica(item)}
          ${temMaterial ? `<a class="musica-meta-link" href="${escaparHtml(arquivoMaterial)}" target="_blank" rel="noopener noreferrer"><span class="meta-icone-svg">${iconeAcaoMusica("material")}</span>Cifra</a>` : ""}
          ${temLetraCompleta ? `<span class="musica-meta-chip"><span class="meta-icone-svg">${iconeAcaoMusica("letra")}</span>Letra</span>` : ""}
          ${montarProgressoInlineMusica(item.id)}
          <span class="preparacao-inline-musica">${montarPreparacaoLinhaMusica(item.id)}</span>
        </div>
        ${montarUrlReferenciaMusica(item)}
        ${montarObservacoesMusica(item)}
        ${montarControleMeuProgresso(item.id)}
        ${appState.musicaProgressoEditandoId === item.id ? montarPainelMeuProgressoEdicao(item.id) : ""}
      </div>
    `;
  }).join("");

  requestAnimationFrame(function() {
    carregarCapasSpotifyMusicas(lista, itens);
    ajustarAlturaListaMusicas();
    ativarBarrasInternasCrossSet();
    configurarArrastarMusicasCadastradas();
  });

  lista.querySelectorAll("[data-editar-musica]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      editarMusica(botao.dataset.editarMusica);
    });
  });

  lista.querySelectorAll("[data-excluir-musica]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      excluirMusica(botao.dataset.excluirMusica);
    });
  });

  lista.querySelectorAll("[data-compartilhar-musica]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      compartilharMusica(botao.dataset.compartilharMusica);
    });
  });

  lista.querySelectorAll("[data-campo-rapido-musica]").forEach(function(campo) {
    campo.addEventListener("change", function() {
      salvarCampoRapidoMusica(campo.dataset.musicaId, campo.dataset.campoRapidoMusica, campo.value);
    });
    campo.addEventListener("keydown", function(evento) {
      if (evento.key === "Enter") {
        evento.preventDefault();
        campo.blur();
      }
    });
  });

  lista.querySelectorAll("[data-ciclar-status-musica]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      salvarMeuProgressoMusica(botao.dataset.ciclarStatusMusica, proximoStatusMusica(botao.dataset.statusAtual));
    });
  });

  lista.querySelectorAll("[data-status-musica]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      salvarMeuProgressoMusica(botao.dataset.musicaId, botao.dataset.statusMusica);
    });
  });
}



async function salvarCampoRapidoMusica(musicaId, campo, valor) {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();

  if (!cliente || !projetoId || !musicaId || !["tom", "bpm", "youtube_url", "observacoes"].includes(campo)) {
    return;
  }

  const payload = { updated_at: new Date().toISOString() };

  if (campo === "tom") {
    payload.tom = limparTexto(valor);
  }

  if (campo === "bpm") {
    const numero = parseInt(valor, 10);
    payload.bpm = Number.isFinite(numero) ? numero : null;
  }

  if (campo === "youtube_url") {
    const youtubeLimpo = limparTexto(valor);

    if (youtubeLimpo && !ehUrlYoutube(youtubeLimpo)) {
      alert("Cole uma URL válida do YouTube.");
      renderizarListaMusicas();
      return;
    }

    payload.youtube_url = youtubeLimpo;
  }

  if (campo === "observacoes") {
    payload.observacoes = limparTexto(valor);
  }

  const { error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.musicas)
    .update(payload)
    .eq("id", musicaId)
    .eq("projeto_id", projetoId);

  if (error) {
    const nomeCampo = campo === "youtube_url" ? "YOUTUBE" : (campo === "observacoes" ? "OBS" : campo.toUpperCase());
    alert("Erro ao salvar " + nomeCampo + ": " + error.message);
    return;
  }

  const musica = (appState.musicas || []).find(function(item) {
    return item.id === musicaId;
  });

  if (musica) {
    if (campo === "tom") {
      musica.tom = payload.tom;
    }
    if (campo === "bpm") {
      musica.bpm = payload.bpm;
    }
    if (campo === "youtube_url") {
      musica.youtube_url = payload.youtube_url;
      renderizarListaMusicas();
    }
    if (campo === "observacoes") {
      musica.observacoes = payload.observacoes;
      renderizarListaMusicas();
    }
    musica.updated_at = payload.updated_at;
  }
}

async function compartilharMusica(musicaId) {
  const musica = (appState.musicas || []).find(function(item) {
    return item.id === musicaId;
  });

  if (!musica) {
    alert("Música não encontrada.");
    return;
  }

  const linhas = [
    "🎵 " + (musica.nome || "Música"),
    musica.artista ? "Artista: " + musica.artista : "",
    musica.tom ? "Tom: " + musica.tom : "",
    musica.bpm ? "BPM: " + musica.bpm : "",
    obterLinkMusica(musica) ? "Link: " + obterLinkMusica(musica) : "",
    musica.youtube_url ? "YouTube: " + musica.youtube_url : "",
    obterObservacaoMusicaManual(musica) ? "OBS: " + obterObservacaoMusicaManual(musica) : ""
  ].filter(Boolean);

  await compartilharConteudo("Música - " + (musica.nome || "Música"), linhas.join("\n"), obterLinkMusica(musica));
}

function gerarPDFDaMusica(musicaId) {
  const musica = (appState.musicas || []).find(function(item) {
    return item.id === musicaId;
  });

  if (!musica) {
    alert("Música não encontrada.");
    return;
  }

  const janela = window.open("", "_blank");

  if (!janela) {
    alert("Permita pop-ups para gerar o PDF da música.");
    return;
  }

  const letra = escaparHtml(musica.letra || "").replaceAll("\n", "<br>");
  const observacoes = escaparHtml(obterObservacaoMusicaManual(musica)).replaceAll("\n", "<br>");

  janela.document.write(`
    <html>
      <head>
        <title>${escaparHtml(musica.nome || "Música")}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 28px; color: #111; }
          h1 { margin-bottom: 4px; }
          .meta { color: #555; margin-bottom: 18px; }
          .box { border-top: 1px solid #ddd; padding-top: 14px; margin-top: 14px; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <button onclick="window.print()">Salvar / Imprimir PDF</button>
        <h1>${escaparHtml(musica.nome || "Música")}</h1>
        <div class="meta">${escaparHtml(musica.artista || "")}</div>
        <p><strong>Tom:</strong> ${escaparHtml(musica.tom || "-")} &nbsp; <strong>BPM:</strong> ${escaparHtml(musica.bpm || "-")}</p>
        ${observacoes ? `<div class="box"><strong>Observações</strong><br>${observacoes}</div>` : ""}
        ${letra ? `<div class="box"><strong>Letra</strong><br><br>${letra}</div>` : ""}
      </body>
    </html>
  `);
  janela.document.close();
}

async function salvarMeuProgressoMusica(musicaId, status) {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();
  const meuIntegrante = appState.meuIntegranteAtual;

  if (!cliente || !projetoId || !musicaId || !meuIntegrante) {
    alert("Seu cadastro de integrante não foi encontrado neste projeto.");
    return;
  }

  const statusPermitidos = ["nao_iniciada", "em_estudo", "pronta"];

  if (!statusPermitidos.includes(status)) {
    alert("Status inválido.");
    return;
  }

  const { data: sessionData } = await cliente.auth.getSession();
  const usuario = sessionData.session?.user;

  if (!usuario) {
    mostrarTela("tela-login", { registrar: false });
    return;
  }

  const payload = {
    projeto_id: projetoId,
    musica_id: musicaId,
    integrante_id: meuIntegrante.id,
    usuario_id: usuario.id,
    status: status,
    updated_at: new Date().toISOString()
  };

  const { data: existente, error: erroBusca } = await cliente
    .from(REPERTORIO_FACIL.tabelas.progressoMusicas)
    .select("id")
    .eq("projeto_id", projetoId)
    .eq("musica_id", musicaId)
    .eq("integrante_id", meuIntegrante.id)
    .limit(1);

  if (erroBusca) {
    alert("Erro ao verificar progresso: " + erroBusca.message);
    return;
  }

  let resultado;

  if (existente && existente.length > 0) {
    resultado = await cliente
      .from(REPERTORIO_FACIL.tabelas.progressoMusicas)
      .update({
        status: status,
        updated_at: payload.updated_at
      })
      .eq("id", existente[0].id)
      .eq("projeto_id", projetoId)
      .eq("musica_id", musicaId)
      .eq("integrante_id", meuIntegrante.id);
  } else {
    resultado = await cliente
      .from(REPERTORIO_FACIL.tabelas.progressoMusicas)
      .insert(payload);
  }

  if (resultado.error) {
    alert("Erro ao salvar progresso: " + resultado.error.message);
    return;
  }

  await buscarMusicas();
}

function obterDadosFormularioMusica() {
  return {
    nome: limparTexto(elemento("musica-nome")?.value),
    artista: limparTexto(elemento("musica-artista")?.value),
    tom: limparTexto(elemento("musica-tom")?.value),
    bpm: limparTexto(elemento("musica-bpm")?.value),
    link_url: limparTexto(elemento("musica-link")?.value),
    url_referencia: limparTexto(elemento("musica-url-referencia")?.value),
    youtube_url: limparTexto(elemento("musica-youtube-url")?.value),
    letra: limparTexto(elemento("musica-letra")?.value),
    observacoes: limparTexto(elemento("musica-observacoes")?.value)
  };
}

function atualizarExibicaoArquivoAtual(idElemento, url, texto) {
  const campo = elemento(idElemento);

  if (!campo) {
    return;
  }

  if (!url) {
    campo.textContent = "Nenhum arquivo enviado.";
    return;
  }

  campo.innerHTML = `Arquivo atual: <a href="${escaparHtml(url)}" target="_blank" rel="noopener noreferrer">${escaparHtml(texto || "Abrir arquivo")}</a>`;
}

function obterMusicaEditandoAtual() {
  if (!appState.musicaEditandoId) {
    return null;
  }

  return (appState.musicas || []).find(function(musica) {
    return musica.id === appState.musicaEditandoId;
  }) || null;
}

function nomeSeguroArquivo(nome) {
  const partes = String(nome || "arquivo").split(".");
  const extensao = partes.length > 1 ? partes.pop().toLowerCase().replace(/[^a-z0-9]/g, "") : "bin";
  const base = partes.join(".") || "arquivo";
  const baseSeguro = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 70) || "arquivo";

  return baseSeguro + "." + extensao;
}

async function enviarArquivoMusica(campoId, tipo, projetoId) {
  const cliente = sb();
  const input = elemento(campoId);

  if (!cliente || !input || !input.files || input.files.length === 0) {
    return "";
  }

  const arquivo = input.files[0];
  const { data: sessionData } = await cliente.auth.getSession();
  const usuario = sessionData.session?.user;

  if (!usuario) {
    throw new Error("Faça login para enviar arquivos.");
  }

  const caminho = [
    projetoId,
    tipo,
    usuario.id,
    Date.now() + "-" + nomeSeguroArquivo(arquivo.name)
  ].join("/");

  const { error } = await cliente.storage
    .from("musicas-arquivos")
    .upload(caminho, arquivo, { cacheControl: "3600", upsert: false });

  if (error) {
    throw new Error("Erro ao enviar arquivo: " + error.message);
  }

  const { data } = cliente.storage
    .from("musicas-arquivos")
    .getPublicUrl(caminho);

  return data?.publicUrl || "";
}

function preencherFormularioMusica(item) {
  if (!item) {
    return;
  }

  elemento("musica-nome").value = item.nome || "";
  elemento("musica-artista").value = item.artista || "";
  elemento("musica-tom").value = item.tom || "";
  elemento("musica-bpm").value = item.bpm || "";
  elemento("musica-link").value = obterLinkMusica(item);
  if (elemento("musica-url-referencia")) {
    elemento("musica-url-referencia").value = item.url_referencia || "";
  }
  if (elemento("musica-youtube-url")) {
    elemento("musica-youtube-url").value = ehUrlYoutube(item.youtube_url) ? item.youtube_url : "";
  }
  elemento("musica-letra").value = item.letra || "";
  elemento("musica-observacoes").value = obterObservacaoMusicaManual(item);

  atualizarExibicaoArquivoAtual("musica-material-arquivo-atual", obterArquivoMaterialMusica(item), "Abrir material musical");
  atualizarExibicaoArquivoAtual("musica-letra-arquivo-atual", obterArquivoLetraMusica(item), "Abrir letra");

  const titulo = elemento("titulo-form-musica");
  const botaoSalvar = elemento("btn-salvar-musica");
  const botaoCancelar = elemento("btn-cancelar-musica");
  const formManual = elemento("form-musicas-manual");

  if (titulo) {
    titulo.textContent = "Editar música";
  }

  if (formManual) {
    formManual.style.display = "grid";
  }

  if (botaoSalvar) {
    botaoSalvar.innerHTML = `<span>✓</span><span>Salvar alterações</span>`;
    botaoSalvar.style.display = "inline-flex";
  }

  if (botaoCancelar) {
    botaoCancelar.style.display = "inline-flex";
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function limparFormularioMusica() {
  appState.musicaEditandoId = null;

  ["musica-nome", "musica-artista", "musica-tom", "musica-bpm", "musica-link", "musica-url-referencia", "musica-youtube-url", "musica-letra", "musica-observacoes", "musica-material-arquivo", "musica-letra-arquivo"].forEach(function(id) {
    const campo = elemento(id);
    if (campo) {
      campo.value = "";
    }
  });

  atualizarExibicaoArquivoAtual("musica-material-arquivo-atual", "", "Abrir material musical");
  atualizarExibicaoArquivoAtual("musica-letra-arquivo-atual", "", "Abrir letra");

  const titulo = elemento("titulo-form-musica");
  const botaoSalvar = elemento("btn-salvar-musica");
  const botaoCancelar = elemento("btn-cancelar-musica");
  const formManual = elemento("form-musicas-manual");

  if (titulo) {
    titulo.textContent = "Adicionar música";
  }

  if (formManual) {
    formManual.style.display = "none";
  }

  if (botaoSalvar) {
    botaoSalvar.innerHTML = `<span>＋</span><span>Adicionar música</span>`;
    botaoSalvar.style.display = "inline-flex";
  }

  if (botaoCancelar) {
    botaoCancelar.style.display = "none";
  }
}

async function salvarMusica() {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();

  if (!cliente || !projetoId) {
    return;
  }

  const dados = obterDadosFormularioMusica();
  const bpmNumero = parseInt(dados.bpm, 10);

  if (dados.youtube_url && !ehUrlYoutube(dados.youtube_url)) {
    alert("Cole uma URL válida do YouTube.");
    return;
  }

  if (!dados.nome) {
    alert("Informe o nome da música.");
    return;
  }

  const musicaAtual = obterMusicaEditandoAtual();
  let materialArquivoUrl = musicaAtual ? obterArquivoMaterialMusica(musicaAtual) : "";
  let letraArquivoUrl = musicaAtual ? obterArquivoLetraMusica(musicaAtual) : "";

  try {
    const novoMaterialArquivo = await enviarArquivoMusica("musica-material-arquivo", "material-musical", projetoId);
    const novoLetraArquivo = await enviarArquivoMusica("musica-letra-arquivo", "letras", projetoId);

    if (novoMaterialArquivo) {
      materialArquivoUrl = novoMaterialArquivo;
    }

    if (novoLetraArquivo) {
      letraArquivoUrl = novoLetraArquivo;
    }
  } catch (erroUpload) {
    alert(erroUpload.message || "Erro ao enviar arquivo.");
    return;
  }

  const payload = {
    projeto_id: projetoId,
    nome: dados.nome,
    artista: dados.artista,
    tom: dados.tom,
    bpm: Number.isFinite(bpmNumero) ? bpmNumero : null,
    link_url: dados.link_url,
    youtube_url: dados.youtube_url,
    url_referencia: dados.url_referencia,
    material_arquivo_url: materialArquivoUrl,
    letra_arquivo_url: letraArquivoUrl,
    letra: dados.letra,
    observacoes: dados.observacoes,
    updated_at: new Date().toISOString()
  };

  let resultado;

  if (appState.musicaEditandoId) {
    resultado = await cliente
      .from(REPERTORIO_FACIL.tabelas.musicas)
      .update(payload)
      .eq("id", appState.musicaEditandoId)
      .eq("projeto_id", projetoId);
  } else {
    payload.ordem_personalizada = obterProximaOrdemPersonalizadaMusica();
    resultado = await cliente
      .from(REPERTORIO_FACIL.tabelas.musicas)
      .insert(payload);
  }

  if (resultado.error) {
    alert("Erro ao salvar música: " + resultado.error.message);
    return;
  }

  limparFormularioMusica();
  await buscarMusicas();
}

function editarMusica(id) {
  const item = (appState.musicas || []).find(function(musica) {
    return musica.id === id;
  });

  if (!item) {
    alert("Música não encontrada.");
    return;
  }

  appState.musicaEditandoId = id;
  appState.musicaProgressoEditandoId = null;
  preencherFormularioMusica(item);
}

async function excluirMusica(id) {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();

  if (!cliente || !id || !projetoId) {
    return;
  }

  const confirmar = confirm("Excluir esta música?");

  if (!confirmar) {
    return;
  }

  const { error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.musicas)
    .delete()
    .eq("id", id)
    .eq("projeto_id", projetoId);

  if (error) {
    alert("Erro ao excluir música: " + error.message);
    return;
  }

  if (appState.musicaEditandoId === id) {
    limparFormularioMusica();
  }

  await buscarMusicas();
}

async function criarMusica() {
  await salvarMusica();
}

async function carregarRepertorios() {
  const area = elemento("area-modulo");
  const projetoId = obterProjetoAtualId();

  if (!area) {
    return;
  }

  if (!projetoId) {
    area.innerHTML = `
      <div class="card-projeto">
        <h3>Projeto não encontrado</h3>
        <p>Volte para Meus Projetos e acesse o projeto novamente.</p>
      </div>
    `;
    return;
  }

  area.innerHTML = `
    <style>
      .modulo-repertorios {
        display: grid;
        grid-template-columns: minmax(280px, 420px) 1fr;
        gap: 18px;
        width: 100%;
      }

      .card-repertorio-expandido {
        grid-column: 1 / -1;
        overflow: visible;
      }

      .form-repertorio-topo {
        display: grid;
        grid-template-columns: minmax(280px, 420px) minmax(360px, 1fr);
        gap: 18px;
        align-items: start;
      }

      .resumo-repertorio-lateral {
        display: grid;
        gap: 10px;
        padding: 14px;
        border: 1px solid rgba(255,255,255,.10);
        border-radius: 16px;
        background: rgba(15,23,42,.48);
      }

      .cards-resumo-repertorio {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }

      .card-resumo-mini {
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.045);
        border-radius: 14px;
        padding: 12px;
      }

      .card-resumo-mini strong {
        display: block;
        font-size: 20px;
        color: #fff;
        line-height: 1.1;
      }

      .card-resumo-mini span {
        color: #a8b4c9;
        font-size: 12px;
      }

      .form-repertorios,
      .filtros-montagem-repertorio {
        display: grid;
        gap: 10px;
      }

      .form-repertorios label,
      .filtros-montagem-repertorio label {
        display: grid;
        gap: 6px;
        font-size: 13px;
        color: #e5e7eb;
      }

      .form-repertorios input,
      .form-repertorios textarea,
      .filtros-montagem-repertorio input {
        width: 100%;
      }

      .form-repertorios textarea {
        min-height: 92px;
        resize: vertical;
      }

      .acoes-repertorio,
      .acoes-musica-repertorio,
      .acoes-edicao-repertorio {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 6px;
      }

      .acoes-repertorio {
        flex-direction: column;
      }

      .botao-salvar-repertorio,
      .botao-whatsapp-repertorio,
      .botao-montar-repertorio {
        width: 100%;
        min-height: 44px;
        border: 0;
        border-radius: 13px;
        padding: 0 18px;
        cursor: pointer;
        font-size: 16px;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        transition: transform .15s ease, filter .15s ease, box-shadow .15s ease;
      }

      .icone-limpo {
        width: 18px;
        height: 18px;
        color: #fff;
        stroke: currentColor;
        stroke-width: 2;
        fill: none;
        stroke-linecap: round;
        stroke-linejoin: round;
        flex: 0 0 18px;
      }

      .botao-salvar-repertorio,
      .botao-montar-repertorio {
        color: #fff;
        background: linear-gradient(135deg, #38bdf8 0%, #6366f1 50%, #a855f7 100%);
        box-shadow: 0 10px 22px rgba(99, 102, 241, .25);
      }

      .botao-whatsapp-repertorio {
        color: #fff;
        background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%);
        box-shadow: 0 10px 22px rgba(34, 197, 94, .20);
      }

      .botao-salvar-repertorio:hover,
      .botao-whatsapp-repertorio:hover,
      .botao-montar-repertorio:hover {
        transform: translateY(-1px);
        filter: brightness(1.05);
      }

      .botao-repertorio-secundario {
        width: 100%;
        min-height: 38px;
        border: 1px solid rgba(255,255,255,.14);
        border-radius: 11px;
        padding: 0 14px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        background: rgba(255,255,255,.06);
        color: #e5e7eb;
      }

      .acoes-edicao-repertorio {
        margin-top: 18px;
        padding-top: 16px;
        border-top: 1px solid rgba(255,255,255,.12);
        align-items: center;
      }

      .acoes-edicao-repertorio .botao-card,
      .acoes-edicao-repertorio .botao-secundario-modulo {
        min-height: 34px;
        padding: 0 14px;
        font-size: 13px;
        border-radius: 10px;
      }

      .botao-secundario-modulo {
        border: 0;
        border-radius: 12px;
        padding: 11px 14px;
        cursor: pointer;
        background: #eeeeee;
        color: #222;
        font-weight: 700;
      }

      .lista-repertorios,
      .lista-biblioteca-musicas,
      .lista-musicas-repertorio {
        display: grid;
        gap: 10px;
      }

      .item-repertorio,
      .item-biblioteca-musica,
      .item-musica-repertorio {
        border: 1px solid rgba(255, 255, 255, .16);
        border-radius: 14px;
        padding: 12px;
        background: #1f2937;
        color: #f9fafb;
      }

      .item-repertorio-topo,
      .item-biblioteca-musica,
      .item-musica-repertorio {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        min-width: 0;
      }

      .item-repertorio-conteudo,
      .item-musica-repertorio-conteudo {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        flex: 1;
      }

      .icone-repertorio-placeholder,
      .numero-musica-repertorio {
        width: 36px;
        height: 36px;
        min-width: 36px;
        border-radius: 50%;
        background: #6d28d9;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 13px;
        color: #ffffff;
      }

      .dados-repertorio h4,
      .dados-musica-repertorio h4,
      .dados-biblioteca-musica h4 {
        margin: 0 0 5px;
        color: #ffffff;
        font-size: 15px;
        line-height: 1.2;
      }

      .dados-repertorio p,
      .dados-musica-repertorio p,
      .dados-biblioteca-musica p {
        margin: 2px 0;
        font-size: 12px;
        line-height: 1.25;
        color: #d1d5db;
      }

      .botoes-item-repertorio,
      .botoes-musica-repertorio {
        display: flex;
        gap: 5px;
        flex-wrap: nowrap;
        justify-content: flex-end;
        align-items: center;
      }

      .botoes-item-repertorio button,
      .botoes-musica-repertorio button,
      .btn-adicionar-musica-repertorio {
        border: 0;
        border-radius: 8px;
        padding: 6px 8px;
        min-height: 28px;
        cursor: pointer;
        font-size: 12px;
        line-height: 1;
        white-space: nowrap;
        font-weight: 700;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }

      .botoes-item-repertorio .icone-limpo {
        width: 14px;
        height: 14px;
        flex-basis: 14px;
      }

      .btn-editar-repertorio,
      .btn-montar-repertorio,
      .btn-gerar-pdf-repertorio,
      .btn-pdf-repertorio,
      .btn-compartilhar-repertorio,
      .btn-mover-repertorio,
      .btn-subir-musica,
      .btn-descer-musica,
      .btn-adicionar-musica-repertorio {
        background: rgba(255,255,255,.08);
        color: #e5e7eb;
        border: 1px solid rgba(255,255,255,.10);
      }

      .btn-excluir-repertorio,
      .btn-remover-musica-repertorio {
        background: rgba(239, 68, 68, .10);
        color: #fecaca;
        border: 1px solid rgba(239, 68, 68, .35);
      }



      .botoes-item-repertorio {
        gap: 8px;
      }

      .botoes-item-repertorio button {
        min-height: 34px;
        padding: 0 13px;
        border-radius: 11px;
        font-size: 13px;
        font-weight: 800;
        letter-spacing: .01em;
        color: #f8fafc;
        background: rgba(255,255,255,.07);
        border: 1px solid rgba(255,255,255,.14);
        transition: transform .15s ease, filter .15s ease, background .15s ease, border-color .15s ease;
      }

      .botoes-item-repertorio button:hover {
        transform: translateY(-1px);
        filter: brightness(1.08);
      }

      .botoes-item-repertorio .btn-montar-repertorio {
        background: linear-gradient(135deg, #38bdf8 0%, #6366f1 50%, #a855f7 100%);
        border-color: rgba(168,85,247,.45);
        box-shadow: 0 8px 18px rgba(99,102,241,.20);
      }

      .botoes-item-repertorio .btn-compartilhar-repertorio {
        border-color: rgba(168,85,247,.55);
        background: rgba(124,58,237,.16);
      }

      .botoes-item-repertorio .btn-pdf-repertorio,
      .botoes-item-repertorio .btn-editar-repertorio {
        background: rgba(255,255,255,.08);
        border-color: rgba(255,255,255,.16);
      }

      .botoes-item-repertorio .btn-excluir-repertorio {
        background: rgba(239,68,68,.11);
        border-color: rgba(239,68,68,.45);
        color: #fecaca;
      }

      .botoes-item-repertorio .icone-limpo {
        width: 15px;
        height: 15px;
        flex-basis: 15px;
        color: #fff;
      }


      /* CORRECAO QA: Repertórios - ações no padrão aprovado (ícones brancos, sem texto) */
      .item-repertorio-topo {
        align-items: flex-start;
        width: 100%;
        max-width: 100%;
        overflow: hidden;
      }

      .item-repertorio-conteudo {
        min-width: 0;
        flex: 1 1 auto;
      }

      .dados-repertorio {
        min-width: 0;
        overflow: hidden;
      }

      .dados-repertorio h4,
      .dados-repertorio p {
        overflow-wrap: anywhere;
      }

      .botoes-item-repertorio {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
        min-width: 184px;
        max-width: 184px;
      }

      .botoes-item-repertorio button,
      .botoes-item-repertorio .btn-montar-repertorio,
      .botoes-item-repertorio .btn-editar-repertorio,
      .botoes-item-repertorio .btn-compartilhar-repertorio,
      .botoes-item-repertorio .btn-pdf-repertorio,
      .botoes-item-repertorio .btn-excluir-repertorio {
        width: 28px;
        height: 28px;
        min-width: 28px;
        min-height: 28px;
        padding: 0;
        margin: 0;
        border: 0;
        border-radius: 0;
        background: transparent;
        color: #ffffff;
        box-shadow: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transform: none;
        filter: none;
      }

      .botoes-item-repertorio button span {
        display: none !important;
      }

      .botoes-item-repertorio .icone-limpo,
      .botoes-item-repertorio button svg {
        width: 22px;
        height: 22px;
        flex: 0 0 22px;
        display: block;
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .botoes-item-repertorio button:hover {
        opacity: .82;
        transform: none;
        filter: none;
        background: transparent;
        border: 0;
      }

      @media (max-width: 760px) {
        .item-repertorio-topo {
          gap: 8px;
        }

        .botoes-item-repertorio {
          min-width: 160px;
          max-width: 160px;
          gap: 6px;
        }
      }

      .montagem-repertorio {
        margin-top: 20px;
        padding-top: 18px;
        border-top: 1px solid rgba(255,255,255,.12);
        overflow: visible;
      }

      .montagem-repertorio-grid {
        display: grid;
        grid-template-columns: minmax(360px, .9fr) minmax(460px, 1.25fr);
        gap: 18px;
        align-items: start;
      }

      .painel-biblioteca-repertorio,
      .painel-setlist-repertorio {
        border: 1px solid rgba(255,255,255,.10);
        border-radius: 16px;
        padding: 14px;
        background: rgba(15,23,42,.34);
        min-width: 0;
      }

      .lista-biblioteca-musicas {
        max-height: 420px;
        overflow: auto;
        padding-right: 4px;
      }

      .lista-musicas-repertorio {
        min-height: 240px;
      }

      .titulo-montagem-repertorio {
        margin-bottom: 14px;
      }

      .titulo-montagem-repertorio h3 {
        margin-bottom: 6px;
      }

      .mini-progresso-repertorio,
      .mini-progresso-musica-repertorio {
        margin-top: 8px;
        display: grid;
        gap: 6px;
      }

      .linha-progresso-repertorio {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        color: #e5e7eb;
        font-size: 12px;
        font-weight: 700;
      }

      .bolinha-status-musica {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        display: inline-block;
        margin-right: 5px;
        vertical-align: middle;
      }

      .bolinha-status-musica.vermelha { background: #ef4444; }
      .bolinha-status-musica.amarela { background: #facc15; }
      .bolinha-status-musica.verde { background: #22c55e; }

      .barra-mini-progresso {
        width: 100%;
        height: 7px;
        border-radius: 999px;
        background: rgba(255,255,255,.12);
        overflow: hidden;
      }

      .barra-mini-progresso span {
        display: block;
        height: 100%;
        border-radius: 999px;
      }

      .barra-mini-progresso span.vermelha { background: #ef4444; }
      .barra-mini-progresso span.amarela { background: #facc15; }
      .barra-mini-progresso span.verde { background: #22c55e; }

      .resumo-repertorio-inteligente {
        margin: 12px 0 4px;
        padding: 12px;
        border-radius: 14px;
        background: rgba(255,255,255,.06);
        border: 1px solid rgba(255,255,255,.10);
      }

      .biblioteca-acoes-repertorio {
        display: flex;
        gap: 8px;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        margin: 8px 0 10px;
      }

      .check-musica-repertorio {
        width: 18px !important;
        height: 18px !important;
        min-height: 18px !important;
        margin: 2px 8px 0 0 !important;
        flex: 0 0 18px;
      }

      .item-biblioteca-musica .dados-biblioteca-musica {
        flex: 1;
      }

      @media (max-width: 980px) {
        .modulo-repertorios,
        .montagem-repertorio-grid,
        .form-repertorio-topo,
        .cards-resumo-repertorio,
        .item-repertorio-topo,
        .item-biblioteca-musica,
        .item-musica-repertorio {
          grid-template-columns: 1fr;
          flex-direction: column;
        }

        .botoes-item-repertorio,
        .botoes-musica-repertorio {
          justify-content: flex-start;
        }
      }


      /* Repertórios 2.0 - layout amplo de montagem */
      #card-form-repertorio.card-repertorio-expandido {
        width: min(1420px, calc(100vw - 96px)) !important;
        max-width: none !important;
        margin: 0 auto !important;
        overflow: visible !important;
      }

      #card-form-repertorio.card-repertorio-expandido > .tag,
      #card-form-repertorio.card-repertorio-expandido > #titulo-form-repertorio,
      #card-form-repertorio.card-repertorio-expandido > p,
      #card-form-repertorio.card-repertorio-expandido > .form-repertorios > label,
      #card-form-repertorio.card-repertorio-expandido > .form-repertorios > .acoes-repertorio {
        display: none !important;
      }

      #card-form-repertorio.card-repertorio-expandido .montagem-repertorio {
        margin-top: 0 !important;
        padding-top: 0 !important;
        border-top: 0 !important;
      }

      .repertorio-builder {
        display: grid;
        grid-template-columns: minmax(360px, 0.8fr) minmax(560px, 1.2fr);
        gap: 18px;
        align-items: stretch;
        width: 100%;
      }

      .repertorio-builder-card {
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 18px;
        background: rgba(15,23,42,.45);
        padding: 18px;
        min-width: 0;
        overflow: hidden;
      }

      .repertorio-builder-card h3 {
        margin: 0 0 8px;
        font-size: 24px;
      }

      .repertorio-builder-card .texto-ajuda {
        color: #a8b4c9;
        font-size: 13px;
        margin: 0 0 14px;
      }

      .repertorio-builder-form {
        display: grid;
        gap: 10px;
        margin-bottom: 14px;
      }

      .repertorio-builder-form label {
        display: grid;
        gap: 6px;
      }

      .repertorio-resumos {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        margin: 12px 0 14px;
      }

      .repertorio-resumo-card {
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.05);
        border-radius: 14px;
        padding: 12px;
      }

      .repertorio-resumo-card strong {
        display: block;
        font-size: 20px;
        color: #fff;
      }

      .repertorio-resumo-card span {
        display: block;
        color: #a8b4c9;
        font-size: 12px;
        margin-top: 2px;
      }

      .repertorio-biblioteca-lista {
        max-height: 520px;
        overflow: auto;
        display: grid;
        gap: 8px;
        padding-right: 4px;
      }

      .musica-biblioteca-linha {
        display: grid;
        grid-template-columns: 26px minmax(0, 1fr) auto;
        gap: 10px;
        align-items: center;
        border: 1px solid rgba(255,255,255,.10);
        border-radius: 13px;
        padding: 10px;
        background: rgba(255,255,255,.035);
      }

      .musica-biblioteca-linha h4,
      .setlist-linha h4 {
        margin: 0;
        font-size: 14px;
        color: #fff;
        line-height: 1.2;
      }

      .musica-biblioteca-linha p,
      .setlist-linha p {
        margin: 3px 0 0;
        color: #a8b4c9;
        font-size: 12px;
        line-height: 1.25;
      }

      .status-biblioteca-mini {
        min-width: 84px;
        text-align: right;
        color: #e5e7eb;
        font-size: 12px;
        font-weight: 700;
      }

      .status-biblioteca-mini .bolinha-status-musica {
        margin-right: 6px;
      }

      .botao-adicionar-selecionadas-final {
        width: 100%;
        min-height: 44px;
        margin-top: 12px;
        border: 0;
        border-radius: 13px;
        background: linear-gradient(135deg, #38bdf8 0%, #6366f1 50%, #a855f7 100%);
        color: #fff;
        font-weight: 700;
        cursor: pointer;
      }

      .setlist-cabecalho-final {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 12px;
        margin-top: 14px;
        margin-bottom: 8px;
      }

      .setlist-cabecalho-final h3 {
        margin: 0 0 2px !important;
      }

      .setlist-cabecalho-final .texto-ajuda {
        margin: 0 !important;
      }

      .setlist-ordenacao-final {
        width: min(250px, 100%);
        display: grid;
        gap: 4px;
        color: #e5e7eb;
        font-size: 11px;
      }

      .setlist-ordenacao-final select {
        width: 100%;
        min-height: 34px !important;
        height: 34px !important;
        margin: 0 !important;
        padding: 5px 9px !important;
        font-size: 12px !important;
      }

      .filtros-montagem-repertorio-busca {
        grid-template-columns: 1fr !important;
      }

      .setlist-lista-final {
        display: grid;
        gap: 5px;
        max-height: 330px;
        overflow-y: auto;
        overflow-x: hidden;
        padding-right: 6px;
        min-height: 105px;
        overscroll-behavior: contain;
        scrollbar-width: thin;
        scrollbar-color: rgba(168, 85, 247, .48) rgba(255,255,255,.05);
      }

      .repertorio-biblioteca-lista,
      .lista-biblioteca-musicas,
      .lista-musicas-repertorio,
      .setlist-lista-final {
        scrollbar-width: thin;
        scrollbar-color: rgba(168, 85, 247, .48) rgba(255,255,255,.05);
      }

      .repertorio-biblioteca-lista::-webkit-scrollbar,
      .lista-biblioteca-musicas::-webkit-scrollbar,
      .lista-musicas-repertorio::-webkit-scrollbar,
      .setlist-lista-final::-webkit-scrollbar {
        width: 8px;
      }

      .repertorio-biblioteca-lista::-webkit-scrollbar-track,
      .lista-biblioteca-musicas::-webkit-scrollbar-track,
      .lista-musicas-repertorio::-webkit-scrollbar-track,
      .setlist-lista-final::-webkit-scrollbar-track {
        background: rgba(255,255,255,.05);
        border-radius: 999px;
      }

      .repertorio-biblioteca-lista::-webkit-scrollbar-thumb,
      .lista-biblioteca-musicas::-webkit-scrollbar-thumb,
      .lista-musicas-repertorio::-webkit-scrollbar-thumb,
      .setlist-lista-final::-webkit-scrollbar-thumb {
        background: rgba(168, 85, 247, .48);
        border-radius: 999px;
      }

      .repertorio-biblioteca-lista::-webkit-scrollbar-thumb:hover,
      .lista-biblioteca-musicas::-webkit-scrollbar-thumb:hover,
      .lista-musicas-repertorio::-webkit-scrollbar-thumb:hover,
      .setlist-lista-final::-webkit-scrollbar-thumb:hover {
        background: rgba(168, 85, 247, .68);
      }

      .setlist-linha {
        display: grid;
        grid-template-columns: 18px 32px minmax(0, 1fr) auto;
        align-items: center;
        gap: 7px;
        border: 1px solid rgba(255,255,255,.10);
        border-radius: 10px;
        padding: 6px 7px;
        background: rgba(255,255,255,.04);
        cursor: grab;
        transition: opacity .15s ease, border-color .15s ease, background .15s ease;
      }

      .setlist-linha:active {
        cursor: grabbing;
      }

      .setlist-linha.arrastando {
        opacity: .42;
      }

      .setlist-linha.alvo-arrastar {
        border-color: rgba(122,92,255,.85);
        background: rgba(122,92,255,.16);
      }

      .setlist-arrastar {
        color: #8ea4ca;
        font-size: 15px;
        line-height: 1;
        cursor: grab;
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
        -webkit-touch-callout: none;
        letter-spacing: -3px;
        user-select: none;
        text-align: center;
      }

      .setlist-dados-compactos {
        min-width: 0;
      }

      .setlist-dados-compactos h4,
      .setlist-dados-compactos p {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .numero-setlist-final {
        width: 28px;
        height: 28px;
        border-radius: 11px;
        display: grid;
        place-items: center;
        background: linear-gradient(135deg, #4f46e5, #9333ea);
        color: #fff;
        font-weight: 800;
        font-size: 13px;
      }

      .setlist-acoes-final {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .setlist-acoes-final .btn-observacao-repertorio {
        color: #ffffff;
        background: transparent;
        border: 0;
      }

      .setlist-acoes-final .btn-observacao-repertorio:hover {
        color: #d8b4fe;
        background: transparent;
      }

      .setlist-acoes-final button {
        width: 28px;
        height: 28px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.06);
        color: #fff;
        display: inline-grid;
        place-items: center;
        cursor: pointer;
      }

      .setlist-acoes-final button.remover {
        border-color: rgba(239,68,68,.35);
        color: #fecaca;
        background: rgba(239,68,68,.10);
      }

      @media (max-width: 720px) {
        .setlist-cabecalho-final {
          align-items: stretch;
          flex-direction: column;
        }

        .setlist-ordenacao-final {
          width: 100%;
        }

        .setlist-linha {
          grid-template-columns: 16px 28px minmax(0, 1fr) auto;
          gap: 5px;
        }

        .setlist-acoes-final {
          gap: 3px;
        }

        .setlist-acoes-final button {
          width: 26px;
          height: 26px;
        }
      }



      /* CrossSet v43 - Repertórios: edição recolhida por padrão.
         Alteração local: não muda estrutura global, cores, fontes ou ícones aprovados. */
      #card-form-repertorio.edicao-repertorio-recolhida > .tag,
      #card-form-repertorio.edicao-repertorio-recolhida > #titulo-form-repertorio,
      #card-form-repertorio.edicao-repertorio-recolhida > p,
      #card-form-repertorio.edicao-repertorio-recolhida > .form-repertorios > label,
      #card-form-repertorio.edicao-repertorio-recolhida > .form-repertorios > .acoes-repertorio {
        display: none !important;
      }

      #card-form-repertorio.edicao-repertorio-recolhida > #btn-toggle-edicao-repertorio {
        display: inline-flex !important;
        width: auto !important;
        align-self: flex-start !important;
        margin: 0 0 8px 0 !important;
      }

      #card-form-repertorio:not(.edicao-repertorio-recolhida) > #btn-toggle-edicao-repertorio {
        display: inline-flex;
        width: auto !important;
        align-self: flex-start !important;
        margin: 0 0 8px 0 !important;
      }

      /* CrossSet v42 - Repertórios: card de edição mais compacto, somente espaços */
      #card-form-repertorio:not(.card-repertorio-expandido) {
        padding: 13px 18px !important;
      }

      #card-form-repertorio:not(.card-repertorio-expandido) > .tag {
        margin-bottom: 7px !important;
      }

      #card-form-repertorio:not(.card-repertorio-expandido) > #titulo-form-repertorio {
        margin: 0 0 4px !important;
      }

      #card-form-repertorio:not(.card-repertorio-expandido) > p {
        margin: 0 0 9px !important;
      }

      #card-form-repertorio:not(.card-repertorio-expandido) .form-repertorios {
        gap: 6px !important;
      }

      #card-form-repertorio:not(.card-repertorio-expandido) .form-repertorios label {
        gap: 3px !important;
        margin: 0 !important;
      }

      #card-form-repertorio:not(.card-repertorio-expandido) .rf-campo-textarea {
        gap: 4px !important;
        margin: 4px 0 6px !important;
      }

      #card-form-repertorio:not(.card-repertorio-expandido) .rf-textarea-counter {
        margin-top: -5px !important;
      }

      #card-form-repertorio:not(.card-repertorio-expandido) .acoes-repertorio {
        gap: 5px !important;
        margin-top: 4px !important;
      }

      #card-form-repertorio:not(.card-repertorio-expandido) .acoes-repertorio + .montagem-repertorio {
        margin-top: 6px !important;
      }

      #card-form-repertorio.card-repertorio-expandido {
        padding: 14px 16px !important;
      }

      #card-form-repertorio.card-repertorio-expandido .form-repertorios {
        gap: 6px !important;
      }

      #card-form-repertorio.card-repertorio-expandido .acoes-repertorio {
        margin-top: 2px !important;
      }

      #card-form-repertorio.card-repertorio-expandido .montagem-repertorio {
        margin-top: 10px !important;
        padding-top: 10px !important;
        border-top: 1px solid rgba(255,255,255,.10);
      }

      #card-form-repertorio.card-repertorio-expandido .repertorio-builder-card {
        padding-top: 12px !important;
      }

      #card-form-repertorio:not(.card-repertorio-expandido) + #card-lista-repertorios {
        margin-top: 0 !important;
      }


      /* CrossSet v40 - Repertórios: somente redução de espaços */
      .repertorio-builder {
        gap: 12px !important;
      }

      .repertorio-builder-card {
        padding: 12px !important;
      }

      .repertorio-builder-card h3 {
        margin-bottom: 4px !important;
      }

      .repertorio-builder-card .texto-ajuda {
        margin-bottom: 8px !important;
      }

      .repertorio-builder-form {
        gap: 6px !important;
        margin-bottom: 8px !important;
      }

      .repertorio-builder-form label {
        gap: 3px !important;
      }

      .repertorio-resumos {
        gap: 7px !important;
        margin: 8px 0 !important;
      }

      .repertorio-resumo-card {
        padding: 8px 10px !important;
      }

      .resumo-repertorio-inteligente {
        margin: 7px 0 2px !important;
        padding: 8px 10px !important;
      }

      .setlist-cabecalho-final {
        gap: 8px !important;
        margin-top: 8px !important;
        margin-bottom: 5px !important;
      }

      .setlist-ordenacao-final {
        gap: 2px !important;
      }

      .setlist-lista-final {
        gap: 4px !important;
        max-height: 410px !important;
      }

      .rodape-repertorio-builder {
        gap: 7px !important;
        margin-top: 8px !important;
      }

      .repertorio-biblioteca-lista {
        gap: 6px !important;
      }

      .biblioteca-acoes-repertorio {
        margin: 5px 0 7px !important;
      }

      .botao-adicionar-selecionadas-final {
        margin-top: 8px !important;
      }

      .rodape-repertorio-builder {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-top: 14px;
        align-items: center;
      }

      .rodape-repertorio-builder .botao-whatsapp-repertorio,
      .rodape-repertorio-builder .botao-salvar-repertorio {
        margin: 0;
      }

      @media (max-width: 1050px) {
        #card-form-repertorio.card-repertorio-expandido {
          width: min(100%, calc(100vw - 32px)) !important;
        }
        .repertorio-builder {
          grid-template-columns: 1fr;
        }
        .rodape-repertorio-builder,
        .repertorio-resumos {
          grid-template-columns: 1fr;
        }
      }

    </style>

    <div class="modulo-repertorios">
      <div class="card-projeto" id="card-form-repertorio">
        <span class="tag">Cadastro</span>
        <h3 id="titulo-form-repertorio">Novo repertório</h3>
        <p>Crie uma lista para show, ensaio ou evento.</p>

        <button class="botao-repertorio-secundario" id="btn-toggle-edicao-repertorio" type="button" style="display:none;">
          <svg class="icone-limpo" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          <span>Editar repertório</span>
        </button>

        <div class="form-repertorios">
          <label>
            Nome do repertório
            <input id="repertorio-nome" type="text" placeholder="Ex: Show na Praça" />
          </label>

          <label>
            Observações
            <textarea id="repertorio-observacoes" placeholder="Ex: Repertório usado no ano de 2026"></textarea>
          </label>

          <div class="acoes-repertorio">
            <button class="botao-salvar-repertorio" id="btn-salvar-repertorio" type="button">
              <svg class="icone-limpo" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>
              <span>Salvar repertório</span>
            </button>
            <button class="botao-repertorio-secundario" id="btn-cancelar-repertorio" type="button" style="display:none;">Cancelar edição</button>
          </div>

          <div id="montagem-repertorio" class="montagem-repertorio" style="display:none;"></div>
        </div>
      </div>

      <div class="card-projeto" id="card-lista-repertorios">
        <span class="tag">Lista</span>
        <h3>Repertórios cadastrados</h3>
        <p>Salve, edite, exclua ou monte as músicas do repertório.</p>

        <div id="lista-repertorios" class="lista-repertorios">
          <p>Carregando repertórios...</p>
        </div>
      </div>
    </div>
  `;

  appState.repertorioEditandoId = null;
  appState.repertorioMontandoId = null;
  appState.repertorioMusicas = [];
  configurarEventosRepertorios();
  await buscarRepertorios();
}

function configurarEventosRepertorios() {
  const botaoSalvar = elemento("btn-salvar-repertorio");
  const botaoCancelar = elemento("btn-cancelar-repertorio");
  const botaoCompartilhar = elemento("btn-compartilhar-repertorio");
  const botaoGerarPdf = elemento("btn-gerar-pdf-repertorio");
  const botaoMontarForm = elemento("btn-montar-repertorio-form");

  if (botaoSalvar) {
    botaoSalvar.addEventListener("click", salvarRepertorio);
  }

  if (botaoCancelar) {
    botaoCancelar.addEventListener("click", limparFormularioRepertorio);
  }

  if (botaoCompartilhar) {
    botaoCompartilhar.addEventListener("click", function() {
      const id = appState.repertorioEditandoId || appState.repertorioMontandoId;
      compartilharRepertorio(id);
    });
  }

  if (botaoGerarPdf) {
    botaoGerarPdf.addEventListener("click", function() {
      const id = appState.repertorioEditandoId || appState.repertorioMontandoId;
      gerarPDFDoRepertorio(id);
    });
  }

  if (botaoMontarForm) {
    botaoMontarForm.addEventListener("click", function() {
      const id = appState.repertorioEditandoId || appState.repertorioMontandoId;
      montarRepertorio(id);
    });
  }
}

async function buscarRepertorios() {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();
  const lista = elemento("lista-repertorios");

  if (!cliente || !projetoId || !lista) {
    return;
  }

  const { data, error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.repertorios)
    .select("*")
    .eq("projeto_id", projetoId)
    .order("created_at", { ascending: false });

  if (!projetoAtualAindaEh(projetoId)) {
    return;
  }

  if (error) {
    lista.innerHTML = `<p>Erro ao carregar repertórios: ${escaparHtml(error.message)}</p>`;
    return;
  }

  appState.repertorios = data || [];

  const idsRepertorios = appState.repertorios.map(function(item) {
    return item.id;
  });

  const consultas = [
    cliente
      .from(REPERTORIO_FACIL.tabelas.musicas)
      .select("*")
      .eq("projeto_id", projetoId),

    cliente
      .from(REPERTORIO_FACIL.tabelas.integrantes)
      .select("*")
      .eq("projeto_id", projetoId),

    cliente
      .from(REPERTORIO_FACIL.tabelas.progressoMusicas)
      .select("*")
      .eq("projeto_id", projetoId)
  ];

  if (idsRepertorios.length > 0) {
    consultas.push(
      cliente
        .from(REPERTORIO_FACIL.tabelas.repertorioMusicas)
        .select("*")
        .in("repertorio_id", idsRepertorios)
    );
  }

  const resultados = await Promise.all(consultas);
  const musicasResultado = resultados[0];
  const integrantesResultado = resultados[1];
  const progressoResultado = resultados[2];
  const relacoesResultado = resultados[3] || { data: [], error: null };

  if (musicasResultado.error) {
    lista.innerHTML = `<p>Erro ao carregar músicas: ${escaparHtml(musicasResultado.error.message)}</p>`;
    return;
  }

  if (integrantesResultado.error) {
    lista.innerHTML = `<p>Erro ao carregar integrantes: ${escaparHtml(integrantesResultado.error.message)}</p>`;
    return;
  }

  if (progressoResultado.error) {
    lista.innerHTML = `<p>Erro ao carregar progresso: ${escaparHtml(progressoResultado.error.message)}</p>`;
    return;
  }

  if (relacoesResultado.error) {
    lista.innerHTML = `<p>Erro ao carregar músicas dos repertórios: ${escaparHtml(relacoesResultado.error.message)}</p>`;
    return;
  }

  appState.musicas = filtrarRegistrosDoProjetoAtual(musicasResultado.data || [], projetoId);
  appState.integrantesProjetoMusicas = filtrarRegistrosDoProjetoAtual(integrantesResultado.data || [], projetoId);
  appState.progressoMusicas = filtrarRegistrosDoProjetoAtual(progressoResultado.data || [], projetoId);
  appState.repertorioRelacoesTodas = relacoesResultado.data || [];

  renderizarListaRepertorios();
}


function calcularProgressoMedioDasMusicas(idsMusicas) {
  const ids = idsMusicas || [];

  if (!ids.length) {
    return { percentual: 0, cor: "vermelha", quantidade: 0 };
  }

  const soma = ids.reduce(function(total, musicaId) {
    return total + obterProgressoDaMusica(musicaId).percentual;
  }, 0);

  const percentual = Math.round(soma / ids.length);
  let cor = "vermelha";

  if (percentual === 100) {
    cor = "verde";
  } else if (percentual >= 50) {
    cor = "amarela";
  }

  return { percentual: percentual, cor: cor, quantidade: ids.length };
}

function obterIdsMusicasDoRepertorio(repertorioId) {
  return (appState.repertorioRelacoesTodas || [])
    .filter(function(item) {
      return item.repertorio_id === repertorioId;
    })
    .map(function(item) {
      return item.musica_id;
    });
}

function montarMiniProgresso(percentual, cor, textoComplementar) {
  return `
    <div class="mini-progresso-repertorio">
      <div class="linha-progresso-repertorio">
        <span><i class="bolinha-status-musica ${escaparHtml(cor)}"></i>${Number(percentual || 0)}%</span>
        <span>${escaparHtml(textoComplementar || "")}</span>
      </div>
      <div class="barra-mini-progresso" title="Progresso">
        <span class="${escaparHtml(cor)}" style="width:${Number(percentual || 0)}%"></span>
      </div>
    </div>
  `;
}

function renderizarListaRepertorios() {
  const lista = elemento("lista-repertorios");

  if (!lista) {
    return;
  }

  const itens = appState.repertorios || [];

  if (itens.length === 0) {
    lista.innerHTML = `<p>Nenhum repertório cadastrado ainda.</p>`;
    return;
  }

  lista.innerHTML = itens.map(function(item) {
    const idsMusicas = obterIdsMusicasDoRepertorio(item.id);
    const resumo = calcularProgressoMedioDasMusicas(idsMusicas);
    const textoMusicas = resumo.quantidade === 1 ? "1 música" : `${resumo.quantidade} músicas`;

    return `
      <div class="item-repertorio">
        <div class="item-repertorio-topo">
          <div class="item-repertorio-conteudo">
            <div class="icone-repertorio-placeholder">R</div>
            <div class="dados-repertorio">
              <h4>${escaparHtml(item.nome || "Sem nome")}</h4>
              <p>${escaparHtml(item.observacoes || "Sem observações")}</p>
              ${montarMiniProgresso(resumo.percentual, resumo.cor, textoMusicas)}
            </div>
          </div>

          <div class="botoes-item-repertorio">
            <button class="btn-montar-repertorio" type="button" title="Montar repertório" aria-label="Montar repertório" data-montar-repertorio="${escaparHtml(item.id)}"><svg class="icone-limpo" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></button>
            <button class="btn-editar-repertorio" type="button" title="Editar repertório" aria-label="Editar repertório" data-editar-repertorio="${escaparHtml(item.id)}"><svg class="icone-limpo" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>
            <button class="btn-compartilhar-repertorio" type="button" title="Compartilhar repertório" aria-label="Compartilhar repertório" data-compartilhar-repertorio="${escaparHtml(item.id)}"><svg class="icone-limpo" viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.7 6.8-4.4"/><path d="m8.6 13.3 6.8 4.4"/></svg></button>
            <button class="btn-pdf-repertorio" type="button" title="Gerar PDF" aria-label="Gerar PDF" data-pdf-repertorio="${escaparHtml(item.id)}"><svg class="icone-limpo" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M9 15h6"/><path d="M9 18h4"/></svg></button>
            <button class="btn-excluir-repertorio" type="button" title="Excluir repertório" aria-label="Excluir repertório" data-excluir-repertorio="${escaparHtml(item.id)}"><svg class="icone-limpo" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  lista.querySelectorAll("[data-montar-repertorio]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      montarRepertorio(botao.dataset.montarRepertorio);
    });
  });

  lista.querySelectorAll("[data-editar-repertorio]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      editarRepertorio(botao.dataset.editarRepertorio);
    });
  });

  lista.querySelectorAll("[data-compartilhar-repertorio]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      compartilharRepertorio(botao.dataset.compartilharRepertorio);
    });
  });

  lista.querySelectorAll("[data-pdf-repertorio]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      gerarPDFDoRepertorio(botao.dataset.pdfRepertorio);
    });
  });

  lista.querySelectorAll("[data-excluir-repertorio]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      excluirRepertorio(botao.dataset.excluirRepertorio);
    });
  });
}

function definirEdicaoRepertorioRecolhida(recolhida) {
  const cardForm = elemento("card-form-repertorio");
  const botaoToggle = elemento("btn-toggle-edicao-repertorio");

  if (!cardForm || !botaoToggle) {
    return;
  }

  if (recolhida) {
    cardForm.classList.add("edicao-repertorio-recolhida");
    botaoToggle.style.display = "inline-flex";
    botaoToggle.innerHTML = `<svg class="icone-limpo" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg><span>Editar repertório</span>`;
  } else {
    cardForm.classList.remove("edicao-repertorio-recolhida");
    botaoToggle.style.display = appState.repertorioEditandoId ? "inline-flex" : "none";
    botaoToggle.innerHTML = `<svg class="icone-limpo" viewBox="0 0 24 24" aria-hidden="true"><path d="m18 15-6 6-6-6"/><path d="M12 3v18"/></svg><span>Fechar edição</span>`;
  }
}

function alternarEdicaoRepertorio() {
  const cardForm = elemento("card-form-repertorio");

  if (!cardForm || !appState.repertorioEditandoId) {
    return;
  }

  const recolhida = cardForm.classList.contains("edicao-repertorio-recolhida");
  definirEdicaoRepertorioRecolhida(!recolhida);

  if (recolhida) {
    const campoNome = elemento("repertorio-nome");
    if (campoNome) {
      campoNome.focus();
    }
  }
}

function preencherFormularioRepertorio(item) {
  if (!item) {
    return;
  }

  const campoNome = elemento("repertorio-nome");
  const campoObservacoes = elemento("repertorio-observacoes");
  const titulo = elemento("titulo-form-repertorio");
  const botaoSalvar = elemento("btn-salvar-repertorio");
  const botaoCompartilhar = elemento("btn-compartilhar-repertorio");
  const botaoGerarPdf = elemento("btn-gerar-pdf-repertorio");
  const botaoMontarForm = elemento("btn-montar-repertorio-form");
  const botaoCancelar = elemento("btn-cancelar-repertorio");

  if (campoNome) {
    campoNome.value = item.nome || "";
  }

  if (campoObservacoes) {
    campoObservacoes.value = item.observacoes || "";
  }

  if (titulo) {
    titulo.textContent = "Editar repertório";
  }

  if (botaoSalvar) {
    botaoSalvar.innerHTML = `<svg class="icone-limpo" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg><span>Salvar alterações</span>`;
    botaoSalvar.style.display = "inline-flex";
  }

  if (botaoCompartilhar) {
    botaoCompartilhar.style.display = "inline-flex";
  }

  if (botaoGerarPdf) {
    botaoGerarPdf.style.display = "inline-flex";
  }

  if (botaoCancelar) {
    botaoCancelar.style.display = "none";
  }

  if (botaoMontarForm) {
    botaoMontarForm.style.display = "inline-flex";
  }

  const cardForm = elemento("card-form-repertorio");
  const cardLista = elemento("card-lista-repertorios");

  if (cardForm) {
    cardForm.style.gridColumn = "1 / -1";
  }

  if (cardLista) {
    cardLista.style.display = "none";
  }

  definirEdicaoRepertorioRecolhida(true);

  if (cardForm) {
    cardForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function limparFormularioRepertorio() {
  appState.repertorioEditandoId = null;

  const cardFormEdicao = elemento("card-form-repertorio");
  const botaoToggleEdicao = elemento("btn-toggle-edicao-repertorio");
  if (cardFormEdicao) {
    cardFormEdicao.classList.remove("edicao-repertorio-recolhida");
  }
  if (botaoToggleEdicao) {
    botaoToggleEdicao.style.display = "none";
  }

  const campoNome = elemento("repertorio-nome");
  const campoObservacoes = elemento("repertorio-observacoes");
  const titulo = elemento("titulo-form-repertorio");
  const botaoSalvar = elemento("btn-salvar-repertorio");
  const botaoCompartilhar = elemento("btn-compartilhar-repertorio");
  const botaoGerarPdf = elemento("btn-gerar-pdf-repertorio");
  const botaoMontarForm = elemento("btn-montar-repertorio-form");
  const botaoCancelar = elemento("btn-cancelar-repertorio");

  if (campoNome) {
    campoNome.value = "";
  }

  if (campoObservacoes) {
    campoObservacoes.value = "";
  }

  if (titulo) {
    titulo.textContent = "Novo repertório";
  }

  if (botaoSalvar) {
    botaoSalvar.innerHTML = `<svg class="icone-limpo" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg><span>Salvar repertório</span>`;
    botaoSalvar.style.display = "inline-flex";
  }

  if (botaoCompartilhar) {
    botaoCompartilhar.style.display = appState.repertorioEditandoId || appState.repertorioMontandoId ? "inline-flex" : "none";
  }

  if (botaoGerarPdf) {
    botaoGerarPdf.style.display = "none";
  }

  if (botaoCancelar) {
    botaoCancelar.style.display = "none";
  }

  const cardForm = elemento("card-form-repertorio");
  const cardLista = elemento("card-lista-repertorios");

  if (cardForm) {
    cardForm.style.gridColumn = "";
  }

  if (cardLista) {
    cardLista.style.display = "block";
  }

  appState.repertorioMusicas = [];
  fecharMontagemRepertorio();
}

async function salvarMusicasTemporariasDoRepertorio(repertorioId) {
  const cliente = sb();

  if (!cliente || !repertorioId) {
    return true;
  }

  const temporarias = (appState.repertorioMusicas || []).filter(function(item) {
    return item.temporario || String(item.id).startsWith("temp-");
  });

  if (!temporarias.length) {
    return true;
  }

  const payload = temporarias.map(function(item, indice) {
    return {
      repertorio_id: repertorioId,
      musica_id: item.musica_id,
      ordem: Number(item.ordem || indice + 1)
    };
  });

  const { error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.repertorioMusicas)
    .insert(payload);

  if (error) {
    alert("Repertório salvo, mas houve erro ao salvar as músicas: " + error.message);
    return false;
  }

  return true;
}


function obterValorCampoRepertorio(nomeCampo) {
  const campoMontagem = elemento(nomeCampo + "-montagem");
  if (campoMontagem) {
    return limparTexto(campoMontagem.value);
  }
  return limparTexto(elemento(nomeCampo)?.value);
}

function sincronizarCamposRepertorio() {
  const nomeMontagem = elemento("repertorio-nome-montagem");
  const obsMontagem = elemento("repertorio-observacoes-montagem");
  const nomeBase = elemento("repertorio-nome");
  const obsBase = elemento("repertorio-observacoes");

  if (nomeMontagem && nomeBase) {
    nomeBase.value = nomeMontagem.value || "";
  }
  if (obsMontagem && obsBase) {
    obsBase.value = obsMontagem.value || "";
  }
}

async function salvarRepertorio() {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();

  if (!cliente || !projetoId) {
    return;
  }

  sincronizarCamposRepertorio();
  const nome = obterValorCampoRepertorio("repertorio-nome");
  const observacoes = obterValorCampoRepertorio("repertorio-observacoes");

  if (!nome) {
    alert("Informe o nome do repertório.");
    return;
  }

  const payload = {
    projeto_id: projetoId,
    nome: nome,
    observacoes: observacoes
  };

  const musicasTemporarias = !appState.repertorioMontandoId
    ? [...(appState.repertorioMusicas || [])]
    : [];

  let idSalvo = appState.repertorioEditandoId || appState.repertorioMontandoId || null;
  let resultado;

  if (idSalvo) {
    resultado = await cliente
      .from(REPERTORIO_FACIL.tabelas.repertorios)
      .update(payload)
      .eq("id", idSalvo)
      .eq("projeto_id", projetoId)
      .select()
      .single();
  } else {
    resultado = await cliente
      .from(REPERTORIO_FACIL.tabelas.repertorios)
      .insert(payload)
      .select()
      .single();
  }

  if (resultado.error) {
    alert("Erro ao salvar repertório: " + resultado.error.message);
    return;
  }

  idSalvo = resultado.data?.id || idSalvo;

  if (musicasTemporarias.length) {
    appState.repertorioMusicas = musicasTemporarias;
    await salvarMusicasTemporariasDoRepertorio(idSalvo);
  }

  if (appState.repertorioEditandoId) {
    definirEdicaoRepertorioRecolhida(true);
  }

  await buscarRepertorios();

  const repertorioSalvo = (appState.repertorios || []).find(function(item) {
    return item.id === idSalvo;
  });

  if (repertorioSalvo) {
    appState.repertorioEditandoId = idSalvo;
    appState.repertorioMontandoId = idSalvo;
    preencherFormularioRepertorio(repertorioSalvo);
    await carregarDadosMontagemRepertorio();
    renderizarMontagemRepertorio();
  }
}

async function criarRepertorio() {
  await salvarRepertorio();
}

async function editarRepertorio(id) {
  const item = (appState.repertorios || []).find(function(repertorio) {
    return repertorio.id === id;
  });

  if (!item) {
    alert("Repertório não encontrado.");
    return;
  }

  appState.repertorioEditandoId = id;
  appState.repertorioMontandoId = id;
  preencherFormularioRepertorio(item);
  await carregarDadosMontagemRepertorio();
  renderizarMontagemRepertorio();
}

async function excluirRepertorio(id) {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();

  if (!cliente || !id || !projetoId) {
    return;
  }

  const confirmar = confirm("Excluir este repertório?");

  if (!confirmar) {
    return;
  }

  const { error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.repertorios)
    .delete()
    .eq("id", id)
    .eq("projeto_id", projetoId);

  if (error) {
    alert("Erro ao excluir repertório: " + error.message);
    return;
  }

  if (appState.repertorioEditandoId === id) {
    limparFormularioRepertorio();
  }

  if (appState.repertorioMontandoId === id) {
    fecharMontagemRepertorio();
  }

  await buscarRepertorios();
}

function obterRepertorioAtualMontagem() {
  const existente = (appState.repertorios || []).find(function(repertorio) {
    return repertorio.id === appState.repertorioMontandoId;
  });

  if (existente) {
    return existente;
  }

  const nome = obterValorCampoRepertorio("repertorio-nome") || "Novo repertório";
  const observacoes = obterValorCampoRepertorio("repertorio-observacoes") || "Monte seu repertório adicionando músicas da biblioteca.";

  return {
    id: null,
    nome: nome,
    observacoes: observacoes,
    temporario: true
  };
}

async function montarRepertorio(id) {
  appState.repertorioMontandoId = id || appState.repertorioEditandoId || null;

  if (!appState.repertorioMontandoId && !Array.isArray(appState.repertorioMusicas)) {
    appState.repertorioMusicas = [];
  }

  await carregarDadosMontagemRepertorio();
  renderizarMontagemRepertorio();

  const cardForm = elemento("card-form-repertorio");
  const cardLista = elemento("card-lista-repertorios");
  if (cardForm) {
    cardForm.classList.add("card-repertorio-expandido");
    cardForm.style.gridColumn = "1 / -1";
  }
  if (cardLista) {
    cardLista.style.display = "none";
  }

  const montagem = elemento("montagem-repertorio");
  if (montagem) {
    montagem.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

async function carregarDadosMontagemRepertorio() {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();
  const repertorioId = appState.repertorioMontandoId;

  if (!cliente || !projetoId) {
    return;
  }

  const consultas = [
    cliente
      .from(REPERTORIO_FACIL.tabelas.musicas)
      .select("*")
      .eq("projeto_id", projetoId)
      .order("nome", { ascending: true }),

    cliente
      .from(REPERTORIO_FACIL.tabelas.integrantes)
      .select("*")
      .eq("projeto_id", projetoId)
      .order("nome", { ascending: true }),

    cliente
      .from(REPERTORIO_FACIL.tabelas.progressoMusicas)
      .select("*")
      .eq("projeto_id", projetoId)
  ];

  if (repertorioId) {
    consultas.push(
      cliente
        .from(REPERTORIO_FACIL.tabelas.repertorioMusicas)
        .select("*")
        .eq("repertorio_id", repertorioId)
        .order("ordem", { ascending: true })
    );
  }

  const resultados = await Promise.all(consultas);
  const musicasResultado = resultados[0];
  const integrantesResultado = resultados[1];
  const progressoResultado = resultados[2];
  const relacoesResultado = resultados[3] || { data: [], error: null };

  if (!projetoAtualAindaEh(projetoId)) {
    return;
  }

  if (musicasResultado.error) {
    alert("Erro ao carregar músicas: " + musicasResultado.error.message);
    return;
  }

  if (integrantesResultado.error) {
    alert("Erro ao carregar integrantes: " + integrantesResultado.error.message);
    return;
  }

  if (progressoResultado.error) {
    alert("Erro ao carregar progresso: " + progressoResultado.error.message);
    return;
  }

  if (relacoesResultado.error) {
    alert("Erro ao carregar músicas do repertório: " + relacoesResultado.error.message);
    return;
  }

  appState.musicas = filtrarRegistrosDoProjetoAtual(musicasResultado.data || [], projetoId);
  appState.integrantesProjetoMusicas = filtrarRegistrosDoProjetoAtual(integrantesResultado.data || [], projetoId);
  appState.progressoMusicas = filtrarRegistrosDoProjetoAtual(progressoResultado.data || [], projetoId);

  if (repertorioId) {
    appState.repertorioMusicas = (relacoesResultado.data || []).map(function(relacao) {
      const musica = appState.musicas.find(function(item) {
        return item.id === relacao.musica_id;
      });

      return {
        id: relacao.id,
        repertorio_id: relacao.repertorio_id,
        musica_id: relacao.musica_id,
        ordem: relacao.ordem || 0,
        created_at: relacao.created_at || "",
        musica: musica || null
      };
    }).filter(function(item) {
      return item.musica !== null;
    });
  } else {
    appState.repertorioMusicas = (appState.repertorioMusicas || []).map(function(item) {
      const musica = appState.musicas.find(function(m) { return m.id === item.musica_id; });
      return Object.assign({}, item, { musica: musica || item.musica || null });
    }).filter(function(item) {
      return item.musica !== null;
    });
  }
}

function renderizarMontagemRepertorio() {
  const montagem = elemento("montagem-repertorio");
  const repertorio = obterRepertorioAtualMontagem();

  if (!montagem || !repertorio) {
    return;
  }

  montagem.style.display = "block";

  const idsSelecionados = new Set((appState.repertorioMusicas || []).map(function(item) {
    return item.musica_id;
  }));

  const buscaAtual = limparTexto(elemento("busca-musicas-repertorio")?.value).toLowerCase();

  let musicasDisponiveis = (appState.musicas || []).filter(function(musica) {
    return !idsSelecionados.has(musica.id);
  });

  if (buscaAtual) {
    musicasDisponiveis = musicasDisponiveis.filter(function(musica) {
      const texto = [musica.nome, musica.artista, musica.tom, musica.bpm].join(" ").toLowerCase();
      return texto.includes(buscaAtual);
    });
  }

  musicasDisponiveis.sort(function(a, b) {
    return compararTexto(a.nome, b.nome);
  });

  const criterioSelecionadas = appState.repertorioOrdenacaoSelecionadas || "manual";
  const selecionadas = ordenarMusicasSelecionadasRepertorio(
    [...(appState.repertorioMusicas || [])],
    criterioSelecionadas
  );

  const idsMusicasSelecionadas = selecionadas.map(function(item) {
    return item.musica_id;
  });
  const resumoRepertorio = calcularProgressoMedioDasMusicas(idsMusicasSelecionadas);
  const textoMusicas = resumoRepertorio.quantidade === 1 ? "1 música" : `${resumoRepertorio.quantidade} músicas`;
  const duracaoEstimada = resumoRepertorio.quantidade ? `${Math.max(1, resumoRepertorio.quantidade * 4)} min` : "0 min";
  const nomeAtual = obterValorCampoRepertorio("repertorio-nome") || (repertorio.temporario ? "" : repertorio.nome || "");
  const obsAtual = obterValorCampoRepertorio("repertorio-observacoes") || (repertorio.temporario ? "" : repertorio.observacoes || "");

  montagem.innerHTML = `
    <div class="repertorio-builder">
      <section class="repertorio-builder-card">
        <span class="tag">Repertório inteligente</span>
        <h3>Biblioteca do projeto</h3>
        <p class="texto-ajuda">Escolha músicas já cadastradas no projeto e adicione ao set.</p>

        <div class="filtros-montagem-repertorio filtros-montagem-repertorio-busca">
          <label>
            Pesquisar música
            <input id="busca-musicas-repertorio" type="text" placeholder="Buscar por nome, artista ou tom" value="${escaparHtml(buscaAtual)}" />
          </label>
        </div>

        <div id="lista-biblioteca-musicas" class="repertorio-biblioteca-lista">
          ${renderizarBibliotecaMusicasRepertorio(musicasDisponiveis)}
        </div>

        <button class="botao-adicionar-selecionadas-final" id="btn-adicionar-musicas-selecionadas" type="button">+ Adicionar selecionadas ao repertório</button>
      </section>

      <section class="repertorio-builder-card">
        <div class="repertorio-resumos">
          <div class="repertorio-resumo-card"><strong>${resumoRepertorio.quantidade}</strong><span>Músicas</span></div>
          <div class="repertorio-resumo-card"><strong>${duracaoEstimada}</strong><span>Duração estimada</span></div>
          <div class="repertorio-resumo-card"><strong>${resumoRepertorio.percentual}%</strong><span>Preparo médio</span></div>
        </div>

        <div class="resumo-repertorio-inteligente">
          ${montarMiniProgresso(resumoRepertorio.percentual, resumoRepertorio.cor, textoMusicas)}
          <p style="margin-top:8px; font-size:12px; color:#cbd5e1;">O percentual do repertório é a média do progresso das músicas selecionadas.</p>
        </div>

        <div class="setlist-cabecalho-final">
          <div>
            <h3>Músicas no repertório</h3>
            <p class="texto-ajuda">Arraste para reorganizar ou use as setas.</p>
          </div>
          <label class="setlist-ordenacao-final">
            Ordenar por
            <select id="ordenar-selecionadas-repertorio">
              <option value="manual" ${criterioSelecionadas === "manual" ? "selected" : ""}>Ordem do repertório</option>
              <option value="nome" ${criterioSelecionadas === "nome" ? "selected" : ""}>Nome da música (A–Z)</option>
              <option value="recentes" ${criterioSelecionadas === "recentes" ? "selected" : ""}>Adicionadas recentemente</option>
            </select>
          </label>
        </div>
        <div id="lista-musicas-repertorio" class="setlist-lista-final">
          ${renderizarMusicasSelecionadasRepertorio(selecionadas)}
        </div>

        <div class="rodape-repertorio-builder">
          <button class="botao-salvar-repertorio" id="btn-salvar-repertorio-edicao" type="button"><svg class="icone-limpo" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg><span>${repertorio.temporario ? "Salvar repertório" : "Salvar alterações"}</span></button>
          <button class="botao-whatsapp-repertorio" id="btn-compartilhar-repertorio-edicao" type="button" style="display:${repertorio.temporario ? "none" : "inline-flex"};"><svg class="icone-limpo" viewBox="0 0 24 24"><path d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.2-4.7A8.5 8.5 0 1 1 20.5 11.5Z"/><path d="M8.8 8.7c.3 2.7 2.2 5.1 4.9 5.9l1.4-1.3 2.1.6"/></svg><span>Compartilhar</span></button>
        </div>

        <div class="acoes-edicao-repertorio" style="margin-top:10px;">
          <button class="botao-repertorio-secundario btn-gerar-pdf-repertorio" id="btn-gerar-pdf-repertorio-edicao" type="button" style="display:${repertorio.temporario ? "none" : "inline-flex"};">Gerar PDF</button>
          <button class="botao-repertorio-secundario" id="btn-cancelar-repertorio-edicao" type="button">Voltar à lista</button>
        </div>
      </section>
    </div>
  `;

  configurarEventosMontagemRepertorio();
}

function renderizarBibliotecaMusicasRepertorio(musicas) {
  if (!musicas || musicas.length === 0) {
    return `<p style="color:#cbd5e1;">Nenhuma música disponível para adicionar.</p>`;
  }

  return musicas.map(function(musica) {
    const progresso = obterProgressoDaMusica(musica.id);
    const textoStatus = progresso.percentual >= 90 ? "Pronta" : progresso.percentual >= 50 ? "Em estudo" : "Não iniciada";

    return `
      <label class="musica-biblioteca-linha">
        <input class="check-musica-repertorio" type="checkbox" value="${escaparHtml(musica.id)}" aria-label="Selecionar música ${escaparHtml(musica.nome || "")}" />
        <div>
          <h4>${escaparHtml(musica.nome || "Sem nome")}</h4>
          <p>${escaparHtml(musica.artista || "Artista não informado")} • Tom: ${escaparHtml(musica.tom || "Não informado")} ${musica.bpm ? "• BPM: " + escaparHtml(musica.bpm) : ""}</p>
        </div>
        <div class="status-biblioteca-mini">
          <span class="bolinha-status-musica ${escaparHtml(progresso.cor)}"></span>${textoStatus}<br />${progresso.percentual}%
        </div>
      </label>
    `;
  }).join("");
}

function renderizarMusicasSelecionadasRepertorio(itens) {
  if (!itens || itens.length === 0) {
    return `<p style="color:#cbd5e1;">Nenhuma música adicionada ainda.</p>`;
  }

  return itens.map(function(item, indice) {
    const musica = item.musica || {};
    const numero = String(indice + 1).padStart(2, "0");
    const progresso = obterProgressoDaMusica(musica.id);
    const textoStatus = progresso.percentual >= 90 ? "Pronta" : progresso.percentual >= 50 ? "Em estudo" : "Não iniciada";
    const observacaoMusica = obterObservacaoMusicaManual(musica);
    const botaoObservacao = observacaoMusica ? `
      <button class="btn-observacao-repertorio" type="button" title="Ver observação" aria-label="Ver observação da música" data-observacao-musica-repertorio="${escaparHtml(musica.id)}">
        <svg class="icone-limpo" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M8 9h8"/><path d="M8 13h5"/></svg>
      </button>
    ` : "";

    return `
      <div class="setlist-linha" draggable="true" data-repertorio-item="${escaparHtml(item.id)}">
        <div class="setlist-arrastar" title="Arrastar para reorganizar" aria-hidden="true">⋮⋮</div>
        <div class="numero-setlist-final">${numero}</div>
        <div class="setlist-dados-compactos">
          <h4>${escaparHtml(musica.nome || "Sem nome")}</h4>
          <p>${escaparHtml(musica.artista || "Artista não informado")} • Tom: ${escaparHtml(musica.tom || "Não informado")} ${musica.bpm ? "• BPM: " + escaparHtml(musica.bpm) : ""} • <span class="bolinha-status-musica ${escaparHtml(progresso.cor)}"></span>${textoStatus} ${progresso.percentual}%</p>
        </div>
        <div class="setlist-acoes-final">
          ${botaoObservacao}
          <button type="button" title="Mover para cima" data-subir-musica-repertorio="${escaparHtml(item.id)}"><svg class="icone-limpo" viewBox="0 0 24 24"><path d="m18 15-6-6-6 6"/></svg></button>
          <button type="button" title="Mover para baixo" data-descer-musica-repertorio="${escaparHtml(item.id)}"><svg class="icone-limpo" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></button>
          <button class="remover" type="button" title="Remover" data-remover-musica-repertorio="${escaparHtml(item.id)}"><svg class="icone-limpo" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg></button>
        </div>
      </div>
    `;
  }).join("");
}

function atualizarBibliotecaMontagemRepertorio() {
  const lista = elemento("lista-biblioteca-musicas");
  const busca = limparTexto(elemento("busca-musicas-repertorio")?.value).toLowerCase();

  if (!lista) {
    return;
  }

  const idsSelecionados = new Set((appState.repertorioMusicas || []).map(function(item) {
    return item.musica_id;
  }));

  let musicasDisponiveis = (appState.musicas || []).filter(function(musica) {
    return !idsSelecionados.has(musica.id);
  });

  if (busca) {
    musicasDisponiveis = musicasDisponiveis.filter(function(musica) {
      const texto = [musica.nome, musica.artista, musica.tom, musica.bpm].join(" ").toLowerCase();
      return texto.includes(busca);
    });
  }

  musicasDisponiveis.sort(function(a, b) {
    return compararTexto(a.nome, b.nome);
  });

  lista.innerHTML = renderizarBibliotecaMusicasRepertorio(musicasDisponiveis);
}

function configurarEventosMontagemRepertorio() {
  const busca = elemento("busca-musicas-repertorio");
  const ordenarSelecionadas = elemento("ordenar-selecionadas-repertorio");
  const botaoAdicionarSelecionadas = elemento("btn-adicionar-musicas-selecionadas");
  const botaoSalvarEdicao = elemento("btn-salvar-repertorio-edicao");
  const botaoCompartilharEdicao = elemento("btn-compartilhar-repertorio-edicao");
  const botaoGerarPdfEdicao = elemento("btn-gerar-pdf-repertorio-edicao");
  const botaoCancelarEdicao = elemento("btn-cancelar-repertorio-edicao");
  const nomeMontagem = elemento("repertorio-nome-montagem");
  const obsMontagem = elemento("repertorio-observacoes-montagem");

  if (busca) {
    busca.addEventListener("input", atualizarBibliotecaMontagemRepertorio);
  }

  if (nomeMontagem) {
    nomeMontagem.addEventListener("input", sincronizarCamposRepertorio);
  }

  if (obsMontagem) {
    obsMontagem.addEventListener("input", sincronizarCamposRepertorio);
  }

  if (ordenarSelecionadas) {
    ordenarSelecionadas.addEventListener("change", function() {
      aplicarOrdenacaoSelecionadasRepertorio(ordenarSelecionadas.value);
    });
  }

  if (botaoAdicionarSelecionadas) {
    botaoAdicionarSelecionadas.addEventListener("click", adicionarMusicasSelecionadasAoRepertorio);
  }

  if (botaoSalvarEdicao) {
    botaoSalvarEdicao.addEventListener("click", salvarRepertorio);
  }

  if (botaoCompartilharEdicao) {
    botaoCompartilharEdicao.addEventListener("click", function() {
      compartilharRepertorio(appState.repertorioEditandoId || appState.repertorioMontandoId);
    });
  }

  if (botaoGerarPdfEdicao) {
    botaoGerarPdfEdicao.addEventListener("click", function() {
      gerarPDFDoRepertorio(appState.repertorioEditandoId || appState.repertorioMontandoId);
    });
  }

  if (botaoCancelarEdicao) {
    botaoCancelarEdicao.addEventListener("click", limparFormularioRepertorio);
  }

  document.querySelectorAll("[data-adicionar-musica-repertorio]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      adicionarMusicaAoRepertorio(botao.dataset.adicionarMusicaRepertorio);
    });
  });

  document.querySelectorAll("[data-observacao-musica-repertorio]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      const musicaId = botao.dataset.observacaoMusicaRepertorio;
      const relacao = (appState.repertorioMusicas || []).find(function(item) {
        return String(item.musica?.id || item.musica_id || "") === String(musicaId || "");
      });
      const musica = relacao?.musica || (appState.musicas || []).find(function(item) {
        return String(item.id || "") === String(musicaId || "");
      });
      const observacao = obterObservacaoMusicaManual(musica);

      if (observacao) {
        alert("OBS: " + observacao);
      }
    });
  });

  document.querySelectorAll("[data-remover-musica-repertorio]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      removerMusicaDoRepertorio(botao.dataset.removerMusicaRepertorio);
    });
  });

  document.querySelectorAll("[data-subir-musica-repertorio]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      moverMusicaDoRepertorio(botao.dataset.subirMusicaRepertorio, -1);
    });
  });

  document.querySelectorAll("[data-descer-musica-repertorio]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      moverMusicaDoRepertorio(botao.dataset.descerMusicaRepertorio, 1);
    });
  });

  configurarArrastarMusicasRepertorio();
}

async function adicionarMusicasSelecionadasAoRepertorio() {
  const checks = Array.from(document.querySelectorAll("#lista-biblioteca-musicas .check-musica-repertorio:checked"));
  const ids = checks.map(function(campo) {
    return campo.value;
  }).filter(Boolean);

  if (ids.length === 0) {
    alert("Selecione pelo menos uma música.");
    return;
  }

  await adicionarMusicasAoRepertorio(ids);
}

async function adicionarMusicasAoRepertorio(musicaIds) {
  const cliente = sb();
  const repertorioId = appState.repertorioMontandoId;

  if (!musicaIds || musicaIds.length === 0) {
    return;
  }

  const idsJaSelecionados = new Set((appState.repertorioMusicas || []).map(function(item) {
    return item.musica_id;
  }));

  const idsNovos = musicaIds.filter(function(id) {
    return !idsJaSelecionados.has(id);
  });

  if (idsNovos.length === 0) {
    alert("As músicas selecionadas já fazem parte deste repertório.");
    return;
  }

  const maiorOrdem = (appState.repertorioMusicas || []).reduce(function(maior, item) {
    return Math.max(maior, Number(item.ordem || 0));
  }, 0);

  if (!repertorioId) {
    const novosItens = idsNovos.map(function(musicaId, indice) {
      const musica = (appState.musicas || []).find(function(item) { return item.id === musicaId; });
      return {
        id: "temp-" + musicaId,
        repertorio_id: null,
        musica_id: musicaId,
        ordem: maiorOrdem + indice + 1,
        created_at: new Date(Date.now() + indice).toISOString(),
        musica: musica || null,
        temporario: true
      };
    }).filter(function(item) { return item.musica !== null; });

    appState.repertorioMusicas = (appState.repertorioMusicas || []).concat(novosItens);
    renderizarMontagemRepertorio();
    return;
  }

  if (!cliente) {
    return;
  }

  const payload = idsNovos.map(function(musicaId, indice) {
    return {
      repertorio_id: repertorioId,
      musica_id: musicaId,
      ordem: maiorOrdem + indice + 1
    };
  });

  const { error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.repertorioMusicas)
    .insert(payload);

  if (error) {
    alert("Erro ao adicionar músicas ao repertório: " + error.message);
    return;
  }

  await carregarDadosMontagemRepertorio();
  renderizarMontagemRepertorio();
}

async function adicionarMusicaAoRepertorio(musicaId) {
  if (!musicaId) {
    return;
  }

  await adicionarMusicasAoRepertorio([musicaId]);
}

async function removerMusicaDoRepertorio(relacaoId) {
  const cliente = sb();

  if (!relacaoId) {
    return;
  }

  const confirmar = confirm("Remover esta música do repertório?");

  if (!confirmar) {
    return;
  }

  if (String(relacaoId).startsWith("temp-")) {
    appState.repertorioMusicas = (appState.repertorioMusicas || []).filter(function(item) {
      return item.id !== relacaoId;
    }).map(function(item, indice) {
      return Object.assign({}, item, { ordem: indice + 1 });
    });
    renderizarMontagemRepertorio();
    return;
  }

  if (!cliente) {
    return;
  }

  const { error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.repertorioMusicas)
    .delete()
    .eq("id", relacaoId);

  if (error) {
    alert("Erro ao remover música do repertório: " + error.message);
    return;
  }

  await carregarDadosMontagemRepertorio();
  await normalizarOrdemRepertorio();
  await carregarDadosMontagemRepertorio();
  renderizarMontagemRepertorio();
}


function ordenarMusicasSelecionadasRepertorio(itens, criterio) {
  const lista = [...(itens || [])];

  if (criterio === "nome") {
    return lista.sort(function(a, b) {
      return compararTexto(a.musica?.nome, b.musica?.nome) ||
        Number(a.ordem || 0) - Number(b.ordem || 0);
    });
  }

  if (criterio === "recentes") {
    return lista.sort(function(a, b) {
      const dataA = new Date(a.created_at || 0).getTime();
      const dataB = new Date(b.created_at || 0).getTime();
      return dataB - dataA || Number(b.ordem || 0) - Number(a.ordem || 0);
    });
  }

  return lista.sort(function(a, b) {
    return Number(a.ordem || 0) - Number(b.ordem || 0);
  });
}

async function salvarOrdemCompletaRepertorio(itensOrdenados) {
  const cliente = sb();
  const lista = (itensOrdenados || []).map(function(item, indice) {
    return Object.assign({}, item, { ordem: indice + 1 });
  });

  appState.repertorioMusicas = lista;

  if (!appState.repertorioMontandoId || lista.some(function(item) {
    return String(item.id).startsWith("temp-");
  })) {
    return true;
  }

  if (!cliente) {
    return false;
  }

  for (let indice = 0; indice < lista.length; indice += 1) {
    const { error } = await cliente
      .from(REPERTORIO_FACIL.tabelas.repertorioMusicas)
      .update({ ordem: indice + 1 })
      .eq("id", lista[indice].id);

    if (error) {
      alert("Erro ao salvar a nova ordem: " + error.message);
      return false;
    }
  }

  return true;
}

async function aplicarOrdenacaoSelecionadasRepertorio(criterio) {
  const criterioValido = ["manual", "nome", "recentes"].includes(criterio)
    ? criterio
    : "manual";

  appState.repertorioOrdenacaoSelecionadas = criterioValido;

  if (criterioValido === "manual") {
    renderizarMontagemRepertorio();
    return;
  }

  const itensOrdenados = ordenarMusicasSelecionadasRepertorio(
    appState.repertorioMusicas || [],
    criterioValido
  );

  const salvou = await salvarOrdemCompletaRepertorio(itensOrdenados);
  if (salvou) {
    renderizarMontagemRepertorio();
  }
}

function configurarArrastarMusicasRepertorio() {
  const lista = elemento("lista-musicas-repertorio");

  if (!lista) {
    return;
  }

  let itemArrastadoId = "";
  let toqueAtivo = null;
  let toqueArrastando = false;
  let toqueTimer = null;
  let alvoToqueAtual = null;

  function limparAlvosArrastar() {
    lista.querySelectorAll(".alvo-arrastar").forEach(function(alvo) {
      alvo.classList.remove("alvo-arrastar");
    });
  }

  function limparEstadoToque() {
    if (toqueTimer) {
      clearTimeout(toqueTimer);
      toqueTimer = null;
    }

    if (toqueAtivo?.item) {
      toqueAtivo.item.classList.remove("arrastando");
    }

    limparAlvosArrastar();
    toqueAtivo = null;
    toqueArrastando = false;
    alvoToqueAtual = null;
    itemArrastadoId = "";
  }

  async function reordenarMusicaRepertorio(origemId, destinoId) {
    if (!origemId || !destinoId || origemId === destinoId) {
      return;
    }

    const itens = ordenarMusicasSelecionadasRepertorio(
      appState.repertorioMusicas || [],
      "manual"
    );
    const indiceOrigem = itens.findIndex(function(registro) {
      return String(registro.id) === String(origemId);
    });
    const indiceDestino = itens.findIndex(function(registro) {
      return String(registro.id) === String(destinoId);
    });

    if (indiceOrigem < 0 || indiceDestino < 0) {
      return;
    }

    const [movido] = itens.splice(indiceOrigem, 1);
    itens.splice(indiceDestino, 0, movido);

    const posicaoLista = lista.scrollTop;
    const posicaoPagina = window.scrollY;

    appState.repertorioOrdenacaoSelecionadas = "manual";
    const salvou = await salvarOrdemCompletaRepertorio(itens);

    if (salvou) {
      renderizarMontagemRepertorio();

      requestAnimationFrame(function() {
        const novaLista = elemento("lista-musicas-repertorio");

        if (novaLista) {
          novaLista.scrollTop = posicaoLista;
        }

        window.scrollTo({
          top: posicaoPagina,
          left: 0,
          behavior: "auto"
        });
      });
    }
  }

  lista.querySelectorAll("[data-repertorio-item]").forEach(function(item) {
    item.addEventListener("dragstart", function(evento) {
      itemArrastadoId = item.dataset.repertorioItem || "";
      item.classList.add("arrastando");
      evento.dataTransfer.effectAllowed = "move";
      evento.dataTransfer.setData("text/plain", itemArrastadoId);
    });

    item.addEventListener("dragend", function() {
      itemArrastadoId = "";
      item.classList.remove("arrastando");
      limparAlvosArrastar();
    });

    item.addEventListener("dragover", function(evento) {
      evento.preventDefault();
      evento.dataTransfer.dropEffect = "move";
      if ((item.dataset.repertorioItem || "") !== itemArrastadoId) {
        item.classList.add("alvo-arrastar");
      }
    });

    item.addEventListener("dragleave", function() {
      item.classList.remove("alvo-arrastar");
    });

    item.addEventListener("drop", async function(evento) {
      evento.preventDefault();
      item.classList.remove("alvo-arrastar");

      const origemId = itemArrastadoId || evento.dataTransfer.getData("text/plain");
      const destinoId = item.dataset.repertorioItem || "";
      await reordenarMusicaRepertorio(origemId, destinoId);
    });

    /* Android/TWA: arraste por toque iniciado somente na alça ⋮⋮. */
    const alcaToque = item.querySelector(".setlist-arrastar");

    if (alcaToque) {
      alcaToque.addEventListener("pointerdown", function(evento) {
        if (evento.pointerType === "mouse" || evento.button !== 0) {
          return;
        }

        evento.preventDefault();
        evento.stopPropagation();
        limparEstadoToque();

        toqueAtivo = {
          pointerId: evento.pointerId,
          item: item,
          alca: alcaToque,
          origemId: item.dataset.repertorioItem || "",
          inicioX: evento.clientX,
          inicioY: evento.clientY
        };

        toqueTimer = setTimeout(function() {
          if (!toqueAtivo) {
            return;
          }

          toqueArrastando = true;
          itemArrastadoId = toqueAtivo.origemId;
          item.classList.add("arrastando");

          try {
            alcaToque.setPointerCapture(evento.pointerId);
          } catch (erroCaptura) {}
        }, 120);
      }, { passive: false });

      alcaToque.addEventListener("pointermove", function(evento) {
        if (!toqueAtivo || evento.pointerId !== toqueAtivo.pointerId) {
          return;
        }

        const distanciaX = Math.abs(evento.clientX - toqueAtivo.inicioX);
        const distanciaY = Math.abs(evento.clientY - toqueAtivo.inicioY);

        /* Antes da ativação, tolera pequenos movimentos naturais do dedo. */
        if (!toqueArrastando && (distanciaX > 24 || distanciaY > 24)) {
          limparEstadoToque();
          return;
        }

        if (!toqueArrastando) {
          return;
        }

        evento.preventDefault();
        evento.stopPropagation();
        limparAlvosArrastar();

        const elementoSobToque = document.elementFromPoint(evento.clientX, evento.clientY);
        const alvo = elementoSobToque?.closest?.("[data-repertorio-item]");

        if (alvo && lista.contains(alvo) && alvo !== toqueAtivo.item) {
          alvo.classList.add("alvo-arrastar");
          alvoToqueAtual = alvo;
        } else {
          alvoToqueAtual = null;
        }
      }, { passive: false });

      alcaToque.addEventListener("pointerup", async function(evento) {
        if (!toqueAtivo || evento.pointerId !== toqueAtivo.pointerId) {
          return;
        }

        const origemId = toqueAtivo.origemId;
        const destinoId = alvoToqueAtual?.dataset?.repertorioItem || "";
        const deveReordenar = toqueArrastando && origemId && destinoId && origemId !== destinoId;

        try {
          alcaToque.releasePointerCapture(evento.pointerId);
        } catch (erroLiberacao) {}

        limparEstadoToque();

        if (deveReordenar) {
          evento.preventDefault();
          evento.stopPropagation();
          await reordenarMusicaRepertorio(origemId, destinoId);
        }
      }, { passive: false });

      alcaToque.addEventListener("pointercancel", limparEstadoToque);
      alcaToque.addEventListener("contextmenu", function(evento) {
        evento.preventDefault();
      });
    }
  });
}

async function moverMusicaDoRepertorio(relacaoId, direcao) {
  const cliente = sb();
  appState.repertorioOrdenacaoSelecionadas = "manual";

  if (!relacaoId) {
    return;
  }

  const itens = [...(appState.repertorioMusicas || [])].sort(function(a, b) {
    return Number(a.ordem || 0) - Number(b.ordem || 0);
  });

  const indice = itens.findIndex(function(item) {
    return item.id === relacaoId;
  });

  const novoIndice = indice + direcao;

  if (indice < 0 || novoIndice < 0 || novoIndice >= itens.length) {
    return;
  }

  const atual = itens[indice];
  const outro = itens[novoIndice];

  if (String(atual.id).startsWith("temp-") || String(outro.id).startsWith("temp-") || !appState.repertorioMontandoId) {
    const ordemAtual = atual.ordem;
    atual.ordem = outro.ordem;
    outro.ordem = ordemAtual;
    appState.repertorioMusicas = itens.sort(function(a, b) { return Number(a.ordem || 0) - Number(b.ordem || 0); });
    renderizarMontagemRepertorio();
    return;
  }

  if (!cliente) {
    return;
  }

  const ordemAtual = atual.ordem;
  const ordemOutro = outro.ordem;

  const { error: erroAtual } = await cliente
    .from(REPERTORIO_FACIL.tabelas.repertorioMusicas)
    .update({ ordem: ordemOutro })
    .eq("id", atual.id);

  if (erroAtual) {
    alert("Erro ao alterar ordem: " + erroAtual.message);
    return;
  }

  const { error: erroOutro } = await cliente
    .from(REPERTORIO_FACIL.tabelas.repertorioMusicas)
    .update({ ordem: ordemAtual })
    .eq("id", outro.id);

  if (erroOutro) {
    alert("Erro ao alterar ordem: " + erroOutro.message);
    return;
  }

  await carregarDadosMontagemRepertorio();
  renderizarMontagemRepertorio();
}

async function normalizarOrdemRepertorio() {
  const cliente = sb();

  if (!cliente) {
    return;
  }

  const itens = [...(appState.repertorioMusicas || [])].sort(function(a, b) {
    return Number(a.ordem || 0) - Number(b.ordem || 0);
  });

  for (let indice = 0; indice < itens.length; indice += 1) {
    await cliente
      .from(REPERTORIO_FACIL.tabelas.repertorioMusicas)
      .update({ ordem: indice + 1 })
      .eq("id", itens[indice].id);
  }
}



function garantirTelaRepertorioPublico() {
  if (elemento("tela-repertorio-publico")) {
    return;
  }

  const app = document.querySelector(".app");
  if (!app) {
    return;
  }

  const tela = document.createElement("section");
  tela.id = "tela-repertorio-publico";
  tela.className = "tela";
  tela.innerHTML = `
    <style>
      #tela-repertorio-publico.tela-ativa {
        display: flex !important;
        align-items: flex-start;
        justify-content: center;
        min-height: 100vh;
        padding: 18px;
        background:
          radial-gradient(circle at top left, rgba(51,196,255,.13), transparent 34%),
          radial-gradient(circle at bottom right, rgba(168,85,247,.16), transparent 38%),
          #0d1b2f;
      }

      .pagina-repertorio-publico {
        width: min(860px, 100%);
        margin: 0 auto;
      }

      .card-repertorio-publico {
        background: #07111f;
        border: 1px solid rgba(255,255,255,.13);
        border-radius: 28px;
        padding: 26px;
        box-shadow: 0 22px 70px rgba(0,0,0,.34);
      }

      .publico-tag {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: #c4b5fd;
        border: 1px solid rgba(139,92,246,.35);
        background: rgba(139,92,246,.14);
        border-radius: 999px;
        padding: 7px 12px;
        font-size: 12px;
        font-weight: 700;
        margin-bottom: 14px;
      }

      .publico-titulo h1 {
        margin: 0;
        color: #fff;
        font-size: clamp(28px, 5vw, 46px);
        line-height: 1.02;
        letter-spacing: -.04em;
      }

      .publico-titulo p {
        margin: 10px 0 0;
        color: #9fb0d6;
        font-size: 15px;
      }

      .publico-info-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        margin: 20px 0;
      }

      .publico-info-card {
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.05);
        border-radius: 16px;
        padding: 14px;
      }

      .publico-info-card span {
        display: block;
        color: #8fa2c8;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: .08em;
        margin-bottom: 6px;
        font-weight: 800;
      }

      .publico-info-card strong {
        color: #fff;
        font-size: 15px;
        line-height: 1.25;
        word-break: break-word;
      }

      .publico-setlist-topo {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: flex-end;
        border-top: 1px solid rgba(255,255,255,.10);
        padding-top: 20px;
        margin-top: 4px;
      }

      .publico-setlist-topo h2 {
        margin: 0;
        font-size: 22px;
        color: #fff;
      }

      .publico-setlist-topo p {
        margin: 4px 0 0;
        color: #9fb0d6;
        font-size: 13px;
      }

      .publico-lista-musicas {
        display: grid;
        gap: 8px;
        margin-top: 14px;
      }

      .publico-musica-item {
        display: grid;
        grid-template-columns: 48px 1fr;
        gap: 12px;
        align-items: center;
        padding: 12px 14px;
        border: 1px solid rgba(255,255,255,.10);
        border-radius: 16px;
        background: rgba(15,23,42,.62);
      }

      .publico-musica-numero {
        width: 38px;
        height: 38px;
        border-radius: 12px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #38bdf8, #6366f1, #a855f7);
        color: #fff;
        font-weight: 800;
        font-size: 13px;
      }

      .publico-musica-dados strong {
        display: block;
        color: #fff;
        font-size: 15px;
        line-height: 1.25;
      }

      .publico-musica-dados span {
        display: block;
        color: #a8b4c9;
        font-size: 12px;
        margin-top: 3px;
      }

      .publico-rodape {
        margin-top: 18px;
        text-align: center;
        color: #8fa2c8;
        font-size: 12px;
        line-height: 1.55;
      }

      .publico-rodape strong {
        color: #cbd5e1;
      }

      .publico-erro {
        color: #fecaca;
        background: rgba(239,68,68,.10);
        border: 1px solid rgba(239,68,68,.30);
        border-radius: 16px;
        padding: 14px;
        margin-top: 16px;
      }

      @media (max-width: 720px) {
        #tela-repertorio-publico.tela-ativa {
          padding: 12px;
        }

        .card-repertorio-publico {
          padding: 20px;
          border-radius: 22px;
        }

        .publico-info-grid {
          grid-template-columns: 1fr;
        }

        .publico-setlist-topo {
          align-items: flex-start;
          flex-direction: column;
        }
      }
    </style>
    <div class="pagina-repertorio-publico">
      <div class="card-repertorio-publico" id="conteudo-repertorio-publico">
        <span class="publico-tag">CrossSet</span>
        <div class="publico-titulo">
          <h1>Carregando repertório...</h1>
          <p>Buscando informações atualizadas.</p>
        </div>
      </div>
    </div>
  `;

  app.appendChild(tela);
}

function formatarDataPublica(valor) {
  if (!valor) {
    return "Não informada";
  }

  try {
    const data = new Date(valor + "T00:00:00");
    if (Number.isNaN(data.getTime())) {
      return valor;
    }

    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(data);
  } catch (erro) {
    return valor;
  }
}

async function carregarRepertorioPublico(repertorioId) {
  const cliente = sb();

  garantirTelaRepertorioPublico();
  mostrarTela("tela-repertorio-publico", { registrar: false });

  const conteudo = elemento("conteudo-repertorio-publico");
  if (!conteudo || !cliente) {
    return;
  }

  conteudo.innerHTML = `
    <span class="publico-tag">CrossSet</span>
    <div class="publico-titulo">
      <h1>Carregando repertório...</h1>
      <p>Buscando informações atualizadas.</p>
    </div>
  `;

  const { data, error } = await cliente.rpc("obter_repertorio_publico", {
    p_repertorio_id: repertorioId
  });

  if (error) {
    conteudo.innerHTML = `
      <span class="publico-tag">CrossSet</span>
      <div class="publico-titulo">
        <h1>Repertório não disponível</h1>
        <p>Não foi possível carregar este repertório.</p>
      </div>
      <div class="publico-erro">
        Verifique se o link está correto ou se a função pública do repertório foi criada no Supabase.
        <br><br>
        Detalhe: ${escaparHtml(error.message)}
      </div>
    `;
    return;
  }

  const repertorio = data || {};
  const projeto = repertorio.projeto || {};
  const evento = repertorio.evento || null;
  const musicas = Array.isArray(repertorio.musicas) ? repertorio.musicas : [];

  const titulo = repertorio.nome || "Repertório";
  const banda = projeto.nome || "Projeto musical";
  const nomeEvento = evento?.nome || "Não vinculado";
  const dataEvento = evento?.data_evento ? formatarDataPublica(evento.data_evento) : "Não informada";

  const listaHtml = musicas.length === 0
    ? `<div class="publico-erro">Nenhuma música foi adicionada a este repertório ainda.</div>`
    : musicas.map(function(item, indice) {
        const numero = String(indice + 1).padStart(2, "0");
        const detalhes = [];
        if (item.artista) detalhes.push(item.artista);
        if (item.tom) detalhes.push("Tom: " + item.tom);
        if (item.bpm) detalhes.push("BPM: " + item.bpm);

        return `
          <div class="publico-musica-item">
            <div class="publico-musica-numero">${numero}</div>
            <div class="publico-musica-dados">
              <strong>${escaparHtml(item.nome || "Sem nome")}</strong>
              ${detalhes.length ? `<span>${escaparHtml(detalhes.join(" • "))}</span>` : ""}
            </div>
          </div>
        `;
      }).join("");

  conteudo.innerHTML = `
    <span class="publico-tag">Repertório</span>

    <div class="publico-titulo">
      <h1>${escaparHtml(titulo)}</h1>
      <p>Link público do repertório atualizado automaticamente.</p>
    </div>

    <div class="publico-info-grid">
      <div class="publico-info-card">
        <span>Banda / Projeto</span>
        <strong>${escaparHtml(banda)}</strong>
      </div>
      <div class="publico-info-card">
        <span>Evento</span>
        <strong>${escaparHtml(nomeEvento)}</strong>
      </div>
      <div class="publico-info-card">
        <span>Data</span>
        <strong>${escaparHtml(dataEvento)}</strong>
      </div>
    </div>

    <div class="publico-setlist-topo">
      <div>
        <h2>Setlist</h2>
        <p>${musicas.length} música${musicas.length === 1 ? "" : "s"} na ordem salva.</p>
      </div>
    </div>

    <div class="publico-lista-musicas">
      ${listaHtml}
    </div>

    <div class="publico-rodape">
      <strong>CrossSet</strong><br>
      Este repertório é atualizado automaticamente.<br>
      Sempre consulte este link antes do ensaio ou show.
    </div>
  `;
}

function formatarDataPDF(data) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(data || new Date());
  } catch (erro) {
    return "";
  }
}

async function obterMusicasDoRepertorioParaPDF(repertorioId) {
  const cliente = sb();

  if (!cliente || !repertorioId) {
    return [];
  }

  if (appState.repertorioMontandoId === repertorioId && Array.isArray(appState.repertorioMusicas)) {
    return [...appState.repertorioMusicas].sort(function(a, b) {
      return Number(a.ordem || 0) - Number(b.ordem || 0);
    });
  }

  const { data, error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.repertorioMusicas)
    .select("id, ordem, musica:musica_id(id, nome, artista, tom, bpm, observacoes)")
    .eq("repertorio_id", repertorioId)
    .order("ordem", { ascending: true });

  if (error) {
    alert("Erro ao carregar músicas do repertório para PDF: " + error.message);
    return [];
  }

  return data || [];
}

function abrirJanelaImpressaoRepertorio(html) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const janela = window.open(url, "_blank");

  if (!janela) {
    URL.revokeObjectURL(url);
    alert("O navegador bloqueou a janela de impressão. Libere pop-ups para este site e tente novamente.");
    return;
  }

  setTimeout(function() {
    URL.revokeObjectURL(url);
  }, 60000);
}

function montarUrlCompartilhavel(tipo, id) {
  const base = REPERTORIO_FACIL.urlApp || (window.location.origin + window.location.pathname.replace(/[^\/]*$/, ""));
  const codigo = encodeURIComponent(id || "");

  if (tipo === "repertorio") {
    return base.replace(/\/$/, "/") + "repertorio.html?id=" + codigo;
  }

  if (tipo === "evento") {
    return base.replace(/\/$/, "/") + "index.html?evento=" + codigo;
  }

  if (tipo === "convite") {
    return base.replace(/\/$/, "/") + "?convite=" + codigo;
  }

  const separador = base.includes("?") ? "&" : "?";
  return base + separador + tipo + "=" + codigo;
}

async function copiarTextoCompartilhamento(texto) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch (erro) {
    // fallback abaixo
  }

  const campo = document.createElement("textarea");
  campo.value = texto;
  campo.setAttribute("readonly", "readonly");
  campo.style.position = "fixed";
  campo.style.left = "-9999px";
  document.body.appendChild(campo);
  campo.select();

  let sucesso = false;
  try {
    sucesso = document.execCommand("copy");
  } catch (erro) {
    sucesso = false;
  }

  document.body.removeChild(campo);
  return sucesso;
}

async function compartilharConteudo(titulo, texto, url) {
  const conteudo = texto + (url ? "\n\nLink: " + url : "");

  if (navigator.share) {
    try {
      await navigator.share({
        title: titulo,
        text: texto,
        url: url || REPERTORIO_FACIL.urlApp
      });
      return;
    } catch (erro) {
      // usuário cancelou ou navegador não compartilhou; usa fallback abaixo
    }
  }

  const copiado = await copiarTextoCompartilhamento(conteudo);

  if (copiado) {
    const abrirWhatsapp = confirm("Link e texto copiados. Deseja abrir o WhatsApp para compartilhar?");

    if (abrirWhatsapp) {
      window.open("https://wa.me/?text=" + encodeURIComponent(conteudo), "_blank");
    }
  } else {
    prompt("Copie o texto abaixo para compartilhar:", conteudo);
  }
}

async function montarTextoCompartilhamentoRepertorio(repertorioId) {
  const repertorio = (appState.repertorios || []).find(function(item) {
    return item.id === repertorioId;
  });

  if (!repertorio) {
    alert("Repertório não encontrado.");
    return null;
  }

  const projeto = appState.projetoAtual || {};
  const itens = await obterMusicasDoRepertorioParaPDF(repertorioId);
  const linhas = [];

  linhas.push("CrossSet");
  linhas.push("");
  linhas.push("Projeto: " + (projeto.nome || "Projeto"));
  linhas.push("Repertório: " + (repertorio.nome || "Repertório"));

  if (repertorio.observacoes) {
    linhas.push("Observações: " + repertorio.observacoes);
  }

  linhas.push("");
  linhas.push("Músicas:");

  if (itens.length === 0) {
    linhas.push("Nenhuma música adicionada ainda.");
  } else {
    itens.forEach(function(item, indice) {
      const musica = item.musica || {};
      const numero = String(indice + 1).padStart(2, "0");
      let linha = numero + ". " + (musica.nome || "Sem nome");

      if (musica.artista) {
        linha += " - " + musica.artista;
      }

      const detalhes = [];

      if (musica.tom) {
        detalhes.push("Tom: " + musica.tom);
      }

      if (musica.bpm) {
        detalhes.push("BPM: " + musica.bpm);
      }

      if (detalhes.length > 0) {
        linha += " (" + detalhes.join(" • ") + ")";
      }

      linhas.push(linha);

      const observacaoMusica = obterObservacaoMusicaManual(musica);
      if (observacaoMusica) {
        linhas.push("   OBS: " + observacaoMusica);
      }
    });
  }

  linhas.push("");
  linhas.push("Total de músicas: " + itens.length);
  linhas.push("Compartilhado pelo CrossSet");

  return linhas.join("\n");
}


let promessaCarregamentoHtml2Pdf = null;

function carregarHtml2Pdf() {
  if (typeof window.html2pdf === "function") {
    return Promise.resolve(window.html2pdf);
  }

  if (promessaCarregamentoHtml2Pdf) {
    return promessaCarregamentoHtml2Pdf;
  }

  promessaCarregamentoHtml2Pdf = new Promise(function(resolve, reject) {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.12.1/html2pdf.bundle.min.js";
    script.async = true;
    script.onload = function() {
      if (typeof window.html2pdf === "function") {
        resolve(window.html2pdf);
      } else {
        reject(new Error("Biblioteca de PDF não carregada."));
      }
    };
    script.onerror = function() {
      reject(new Error("Não foi possível carregar o gerador de PDF."));
    };
    document.head.appendChild(script);
  }).catch(function(erro) {
    promessaCarregamentoHtml2Pdf = null;
    throw erro;
  });

  return promessaCarregamentoHtml2Pdf;
}

function normalizarNomeArquivoPdf(valor) {
  const nome = String(valor || "repertorio")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return (nome || "repertorio") + ".pdf";
}

async function gerarBlobPdfRepertorio(html) {
  await carregarHtml2Pdf();

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = "794px";
  iframe.style.height = "1123px";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.srcdoc = html;
  document.body.appendChild(iframe);

  try {
    await new Promise(function(resolve, reject) {
      const temporizador = setTimeout(function() {
        reject(new Error("Tempo excedido ao preparar o PDF."));
      }, 10000);

      iframe.onload = function() {
        clearTimeout(temporizador);
        resolve();
      };
    });

    const conteudo = iframe.contentDocument && iframe.contentDocument.body;

    if (!conteudo) {
      throw new Error("Conteúdo do repertório indisponível para PDF.");
    }

    const configuracao = {
      margin: [8, 8, 8, 8],
      image: { type: "jpeg", quality: 0.96 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"] }
    };

    return await window.html2pdf()
      .set(configuracao)
      .from(conteudo)
      .outputPdf("blob");
  } finally {
    iframe.remove();
  }
}

async function compartilharArquivoPdfRepertorio(html, nomeArquivo, titulo, textoCompartilhamento) {
  if (!navigator.share || !navigator.canShare) {
    return false;
  }

  const blobPdf = await gerarBlobPdfRepertorio(html);
  const arquivoPdf = new File([blobPdf], nomeArquivo, { type: "application/pdf" });
  const dados = {
    title: titulo,
    text: textoCompartilhamento || "Repertório compartilhado pelo CrossSet.",
    files: [arquivoPdf]
  };

  if (!navigator.canShare(dados)) {
    return false;
  }

  await navigator.share(dados);
  return true;
}


function abrirMenuCompartilhamentoRepertorio(opcoes) {
  const menuAnterior = document.getElementById("menu-compartilhar-repertorio-crossset");
  if (menuAnterior) {
    menuAnterior.remove();
  }

  const overlay = document.createElement("div");
  overlay.id = "menu-compartilhar-repertorio-crossset";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Opções para compartilhar repertório");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "99999";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.padding = "20px";
  overlay.style.background = "rgba(17, 24, 39, 0.62)";

  const painel = document.createElement("div");
  painel.style.width = "min(100%, 360px)";
  painel.style.borderRadius = "16px";
  painel.style.padding = "18px";
  painel.style.background = "#5b21b6";
  painel.style.boxShadow = "0 18px 45px rgba(0,0,0,.28)";
  painel.style.color = "#ffffff";

  painel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;">
      <strong style="font-size:17px;">Compartilhar repertório</strong>
      <button type="button" data-fechar-compartilhamento aria-label="Fechar" style="border:0;background:transparent;color:#fff;padding:4px;cursor:pointer;display:flex;align-items:center;justify-content:center;">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
      </button>
    </div>
    <div style="display:grid;gap:10px;">
      <button type="button" data-opcao-compartilhar="whatsapp" style="width:100%;border:1px solid rgba(255,255,255,.22);border-radius:12px;background:rgba(255,255,255,.10);color:#fff;padding:12px 14px;display:flex;align-items:center;gap:12px;font:inherit;font-weight:700;cursor:pointer;text-align:left;">
        <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.2-4.7A8.5 8.5 0 1 1 20.5 11.5Z"/><path d="M8.8 8.7c.3 2.7 2.2 5.1 4.9 5.9l1.4-1.3 2.1.6"/></svg>
        <span>WhatsApp</span>
      </button>
      <button type="button" data-opcao-compartilhar="copiar" style="width:100%;border:1px solid rgba(255,255,255,.22);border-radius:12px;background:rgba(255,255,255,.10);color:#fff;padding:12px 14px;display:flex;align-items:center;gap:12px;font:inherit;font-weight:700;cursor:pointer;text-align:left;">
        <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        <span>Copiar</span>
      </button>
      <button type="button" data-opcao-compartilhar="pdf" style="width:100%;border:1px solid rgba(255,255,255,.22);border-radius:12px;background:rgba(255,255,255,.10);color:#fff;padding:12px 14px;display:flex;align-items:center;gap:12px;font:inherit;font-weight:700;cursor:pointer;text-align:left;">
        <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M9 15h6M9 18h4"/></svg>
        <span>Gerar PDF</span>
      </button>
    </div>
  `;

  overlay.appendChild(painel);
  document.body.appendChild(overlay);

  const fechar = function() {
    document.removeEventListener("keydown", aoTeclado);
    overlay.remove();
  };

  const aoTeclado = function(evento) {
    if (evento.key === "Escape") {
      fechar();
    }
  };

  document.addEventListener("keydown", aoTeclado);

  overlay.addEventListener("click", function(evento) {
    if (evento.target === overlay || evento.target.closest("[data-fechar-compartilhamento]")) {
      fechar();
      return;
    }

    const botao = evento.target.closest("[data-opcao-compartilhar]");
    if (!botao) {
      return;
    }

    const tipo = botao.dataset.opcaoCompartilhar;
    fechar();

    if (tipo === "whatsapp") {
      opcoes.whatsapp();
    } else if (tipo === "copiar") {
      opcoes.copiar();
    } else if (tipo === "pdf") {
      opcoes.pdf();
    }
  });

  const primeiroBotao = painel.querySelector("[data-opcao-compartilhar]");
  if (primeiroBotao) {
    primeiroBotao.focus();
  }
}

async function compartilharRepertorio(repertorioId) {
  const repertorio = (appState.repertorios || []).find(function(item) {
    return item.id === repertorioId;
  });
  const projeto = appState.projetoAtual || {};

  if (!repertorio) {
    alert("Selecione um repertório salvo antes de compartilhar.");
    return;
  }

  const itens = await obterMusicasDoRepertorioParaPDF(repertorioId);

  if (itens.length === 0) {
    alert("Adicione músicas ao repertório antes de compartilhar.");
    return;
  }

  const nomeProjeto = escaparHtml(projeto.nome || "Projeto");
  const nomeRepertorio = escaparHtml(repertorio.nome || "Repertório");
  const observacoes = escaparHtml(repertorio.observacoes || "");

  const linhas = itens.map(function(item, indice) {
    const musica = item.musica || {};
    const numero = String(indice + 1).padStart(2, "0");

    return `
      <tr>
        <td class="numero">${numero}</td>
        <td class="musica-coluna">
          <strong>${escaparHtml(musica.nome || "Sem nome")}</strong>
          <span>${escaparHtml(musica.artista || "Artista não informado")}</span>
        </td>
        <td class="obs-musica">${obterObservacaoMusicaManual(musica) ? escaparHtml(obterObservacaoMusicaManual(musica)) : "-"}</td>
        <td class="dado-centralizado">${escaparHtml(musica.tom || "-")}</td>
        <td class="dado-centralizado">${escaparHtml(musica.bpm || "-")}</td>
      </tr>
    `;
  }).join("");

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${nomeProjeto} - ${nomeRepertorio}</title>
      <style>
        * { box-sizing: border-box; }
        body {
          margin: 0;
          padding: 24px;
          font-family: Arial, Helvetica, sans-serif;
          color: #111827;
          background: #ffffff;
        }
        .pagina {
          width: 100%;
          max-width: 960px;
          margin: 0 auto;
        }
        .cabecalho {
          border-bottom: 3px solid #6d28d9;
          padding-bottom: 16px;
          margin-bottom: 22px;
        }
        .marca {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: #6d28d9;
          margin-bottom: 8px;
        }
        h1 {
          margin: 0 0 6px;
          font-size: 28px;
          color: #111827;
        }
        h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #374151;
        }
        .info {
          margin-top: 14px;
          font-size: 13px;
          color: #4b5563;
        }
        .observacoes {
          margin: 18px 0;
          padding: 12px 14px;
          border-radius: 10px;
          background: #f3f4f6;
          font-size: 13px;
          color: #374151;
        }
        .tabela-area {
          width: 100%;
          overflow-x: auto;
        }
        table {
          width: 100%;
          min-width: 680px;
          border-collapse: collapse;
          margin-top: 12px;
        }
        th {
          text-align: left;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: .04em;
          color: #6b7280;
          border-bottom: 2px solid #e5e7eb;
          padding: 10px 8px;
        }
        td {
          border-bottom: 1px solid #e5e7eb;
          padding: 12px 8px;
          vertical-align: top;
          font-size: 14px;
        }
        td strong {
          display: block;
          font-size: 15px;
          color: #111827;
          margin-bottom: 3px;
        }
        td span {
          display: block;
          font-size: 12px;
          color: #6b7280;
        }
        .numero {
          font-weight: 800;
          color: #6d28d9;
        }
        .musica-coluna { width: 56%; }
        .obs-musica {
          width: 24%;
          font-size: 12px;
          line-height: 1.4;
          color: #4b5563;
          font-style: italic;
          white-space: normal;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .dado-centralizado {
          text-align: center;
          white-space: nowrap;
        }
        th.dado-centralizado { text-align: center; }
        .rodape {
          margin-top: 24px;
          padding-top: 12px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          gap: 16px;
          font-size: 12px;
          color: #6b7280;
        }
        @media (max-width: 640px) {
          body { padding: 16px; }
          h1 { font-size: 23px; }
          h2 { font-size: 17px; }
          .rodape { flex-direction: column; gap: 4px; }
        }
      </style>
    </head>
    <body>
      <main class="pagina">
        <section class="cabecalho">
          <div class="marca">CrossSet</div>
          <h1>${nomeProjeto}</h1>
          <h2>${nomeRepertorio}</h2>
          <div class="info"><strong>Total de músicas:</strong> ${itens.length}</div>
        </section>

        ${observacoes ? `<div class="observacoes"><strong>Observações:</strong><br>${observacoes}</div>` : ""}

        <div class="tabela-area">
          <table>
            <colgroup>
              <col style="width:4%" />
              <col style="width:56%" />
              <col style="width:24%" />
              <col style="width:8%" />
              <col style="width:8%" />
            </colgroup>
            <thead>
              <tr>
                <th>Nº</th>
                <th>Música</th>
                <th>OBS</th>
                <th class="dado-centralizado">Tom</th>
                <th class="dado-centralizado">BPM</th>
              </tr>
            </thead>
            <tbody>${linhas}</tbody>
          </table>
        </div>

        <div class="rodape">
          <span>CrossSet</span>
          <span>${nomeRepertorio}</span>
        </div>
      </main>
    </body>
    </html>
  `;

  const nomeArquivo = normalizarNomeArquivoPdf(nomeProjeto + "-" + nomeRepertorio);
  const textoCompartilhamento = await montarTextoCompartilhamentoRepertorio(repertorioId);

  abrirMenuCompartilhamentoRepertorio({
    whatsapp: async function() {
      const texto = textoCompartilhamento || "Repertório compartilhado pelo CrossSet.";
      const dispositivoMovel = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");

      if (dispositivoMovel) {
        try {
          const compartilhado = await compartilharArquivoPdfRepertorio(
            html,
            nomeArquivo,
            (projeto.nome || "Projeto") + " - " + (repertorio.nome || "Repertório"),
            texto
          );

          if (compartilhado) {
            return;
          }
        } catch (erro) {
          if (erro && erro.name === "AbortError") {
            return;
          }
          console.warn("Não foi possível anexar o PDF ao compartilhamento.", erro);
        }
      }

      window.open("https://wa.me/?text=" + encodeURIComponent(texto), "_blank");
    },
    copiar: async function() {
      const texto = textoCompartilhamento || "Repertório compartilhado pelo CrossSet.";
      const copiado = await copiarTextoCompartilhamento(texto);

      if (copiado) {
        alert("Repertório copiado.");
      } else {
        prompt("Copie o repertório abaixo:", texto);
      }
    },
    pdf: function() {
      gerarPDFDoRepertorio(repertorioId);
    }
  });
}

function montarTextoCompartilhamentoEvento(evento) {
  const projeto = appState.projetoAtual || {};
  const linhas = [];

  linhas.push("CrossSet");
  linhas.push("");
  linhas.push("Projeto: " + (projeto.nome || "Projeto"));
  linhas.push("Evento: " + (evento.nome || "Evento"));
  linhas.push("Data: " + formatarDataBR(evento.data_evento));

  if (evento.hora_evento) {
    linhas.push("Horário: " + evento.hora_evento);
  }

  if (evento.local) {
    linhas.push("Local: " + evento.local);
  }

  const localizacao = [evento.cidade, evento.estado].filter(Boolean).join(" - ");

  if (localizacao) {
    linhas.push("Cidade: " + localizacao);
  }

  linhas.push("Status: " + (evento.status || "Agendado"));
  linhas.push("Repertório: " + obterNomeRepertorioPorId(evento.repertorio_id));

  if (evento.observacoes) {
    linhas.push("Observações: " + evento.observacoes);
  }

  linhas.push("");
  linhas.push("Compartilhado pelo CrossSet");

  return linhas.join("\n");
}

async function compartilharEvento(eventoId) {
  const evento = (appState.eventos || []).find(function(item) {
    return item.id === eventoId;
  });

  if (!evento) {
    alert("Evento não encontrado.");
    return;
  }

  const texto = montarTextoCompartilhamentoEvento(evento);
  window.open("https://wa.me/?text=" + encodeURIComponent(texto), "_blank");
}

async function gerarPDFDoRepertorio(repertorioId) {
  const repertorio = (appState.repertorios || []).find(function(item) {
    return item.id === repertorioId;
  });
  const projeto = appState.projetoAtual || {};

  if (!repertorio) {
    alert("Selecione um repertório salvo antes de gerar o PDF.");
    return;
  }

  const itens = await obterMusicasDoRepertorioParaPDF(repertorioId);

  if (itens.length === 0) {
    alert("Adicione músicas ao repertório antes de gerar o PDF.");
    return;
  }

  const dataGeracao = formatarDataPDF(new Date());
  const nomeProjeto = escaparHtml(projeto.nome || "Projeto");
  const nomeRepertorio = escaparHtml(repertorio.nome || "Repertório");
  const observacoes = escaparHtml(repertorio.observacoes || "");

  const linhas = itens.map(function(item, indice) {
    const musica = item.musica || {};
    const numero = String(indice + 1).padStart(2, "0");

    return `
      <tr>
        <td class="numero">${numero}</td>
        <td class="musica-coluna">
          <strong>${escaparHtml(musica.nome || "Sem nome")}</strong>
          <span>${escaparHtml(musica.artista || "Artista não informado")}</span>
        </td>
        <td class="obs-musica">${obterObservacaoMusicaManual(musica) ? escaparHtml(obterObservacaoMusicaManual(musica)) : "-"}</td>
        <td class="dado-centralizado">${escaparHtml(musica.tom || "-")}</td>
        <td class="dado-centralizado">${escaparHtml(musica.bpm || "-")}</td>
      </tr>
    `;
  }).join("");

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>${nomeProjeto} - ${nomeRepertorio}</title>
      <style>
        * { box-sizing: border-box; }
        body {
          margin: 0;
          padding: 32px;
          font-family: Arial, Helvetica, sans-serif;
          color: #111827;
          background: #ffffff;
        }
        .cabecalho {
          border-bottom: 3px solid #6d28d9;
          padding-bottom: 16px;
          margin-bottom: 22px;
        }
        .marca {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: #6d28d9;
          margin-bottom: 8px;
        }
        h1 {
          margin: 0 0 6px;
          font-size: 28px;
          color: #111827;
        }
        h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #374151;
        }
        .info {
          margin-top: 14px;
          display: grid;
          gap: 4px;
          font-size: 13px;
          color: #4b5563;
        }
        .observacoes {
          margin: 18px 0;
          padding: 12px 14px;
          border-radius: 10px;
          background: #f3f4f6;
          font-size: 13px;
          color: #374151;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 12px;
        }
        th {
          text-align: left;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: .04em;
          color: #6b7280;
          border-bottom: 2px solid #e5e7eb;
          padding: 10px 8px;
        }
        td {
          border-bottom: 1px solid #e5e7eb;
          padding: 12px 8px;
          vertical-align: top;
          font-size: 14px;
        }
        td strong {
          display: block;
          font-size: 15px;
          color: #111827;
          margin-bottom: 3px;
        }
        td span {
          display: block;
          font-size: 12px;
          color: #6b7280;
        }
        .numero {
          font-weight: 800;
          color: #6d28d9;
        }
        .musica-coluna {
          width: 56%;
        }
        .obs-musica {
          width: 24%;
          font-size: 12px;
          line-height: 1.4;
          color: #4b5563;
          font-style: italic;
          white-space: normal;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .dado-centralizado {
          text-align: center;
          white-space: nowrap;
        }
        th.dado-centralizado {
          text-align: center;
        }
        .rodape {
          margin-top: 24px;
          padding-top: 12px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          gap: 16px;
          font-size: 12px;
          color: #6b7280;
        }
        @media print {
          body { padding: 22px; }
          .cabecalho { break-after: avoid; }
          tr { break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <section class="cabecalho">
        <div class="marca">CrossSet</div>
        <h1>${nomeProjeto}</h1>
        <h2>${nomeRepertorio}</h2>
        <div class="info">
          <div><strong>Data de geração:</strong> ${escaparHtml(dataGeracao)}</div>
          <div><strong>Total de músicas:</strong> ${itens.length}</div>
        </div>
      </section>

      ${observacoes ? `<div class="observacoes"><strong>Observações:</strong><br>${observacoes}</div>` : ""}

      <table>
        <colgroup>
          <col style="width:4%" />
          <col style="width:56%" />
          <col style="width:24%" />
          <col style="width:8%" />
          <col style="width:8%" />
        </colgroup>
        <thead>
          <tr>
            <th>Nº</th>
            <th>Música</th>
            <th>OBS</th>
            <th class="dado-centralizado">Tom</th>
            <th class="dado-centralizado">BPM</th>
          </tr>
        </thead>
        <tbody>
          ${linhas}
        </tbody>
      </table>

      <div class="rodape">
        <span>Gerado pelo CrossSet</span>
        <span>${nomeRepertorio}</span>
      </div>

      <script>
        window.addEventListener('load', function() {
          setTimeout(function() {
            window.print();
          }, 300);
        });
      <\/script>
    </body>
    </html>
  `;

  abrirJanelaImpressaoRepertorio(html);
}

async function salvarRepertorioPDF() {
  const id = appState.repertorioEditandoId || appState.repertorioMontandoId;
  await gerarPDFDoRepertorio(id);
}

function fecharMontagemRepertorio() {
  appState.repertorioMontandoId = null;
  appState.repertorioMusicas = [];

  const montagem = elemento("montagem-repertorio");
  if (montagem) {
    montagem.style.display = "none";
    montagem.innerHTML = "";
  }

  const cardForm = elemento("card-form-repertorio");
  const cardLista = elemento("card-lista-repertorios");
  if (cardForm) {
    cardForm.classList.remove("card-repertorio-expandido");
    cardForm.style.gridColumn = "";
  }
  if (cardLista) {
    cardLista.style.display = "block";
  }
}

async function carregarEventos() {
  const area = elemento("area-modulo");
  const projetoId = obterProjetoAtualId();

  if (!area) {
    return;
  }

  if (!projetoId) {
    area.innerHTML = `
      <div class="card-projeto">
        <h3>Projeto não encontrado</h3>
        <p>Volte para Meus Projetos e acesse o projeto novamente.</p>
      </div>
    `;
    return;
  }

  area.innerHTML = `
    <style>
      .modulo-eventos {
        display: grid;
        grid-template-columns: minmax(280px, 420px) 1fr;
        gap: 18px;
        width: 100%;
      }

      .modulo-eventos > .card-projeto:first-child {
        align-self: start;
        min-height: auto !important;
        padding: 12px !important;
        border-radius: 16px !important;
      }

      .modulo-eventos > .card-projeto:first-child .tag {
        margin-bottom: 6px !important;
        padding: 4px 9px !important;
        font-size: 10px !important;
      }

      .modulo-eventos > .card-projeto:first-child h3 {
        margin-bottom: 5px !important;
        font-size: 19px !important;
        line-height: 1.08 !important;
      }

      .modulo-eventos > .card-projeto:first-child p {
        margin-bottom: 8px !important;
        font-size: 11.5px !important;
        line-height: 1.25 !important;
      }

      .form-eventos,
      .filtros-eventos {
        display: grid;
        gap: 7px;
      }

      .form-eventos label,
      .filtros-eventos label {
        display: grid;
        gap: 3px;
        font-size: 11.5px;
        line-height: 1.15;
        color: #e5e7eb;
      }

      .form-eventos input,
      .form-eventos select,
      .form-eventos textarea,
      .filtros-eventos input,
      .filtros-eventos select {
        width: 100%;
      }

      .form-eventos input,
      .form-eventos select {
        min-height: 34px !important;
        height: 34px !important;
        padding: 7px 10px !important;
        font-size: 12px !important;
        border-radius: 9px !important;
        margin-bottom: 0 !important;
      }

      .form-eventos textarea {
        min-height: 58px !important;
        max-height: 72px !important;
        padding: 8px 10px !important;
        font-size: 12px !important;
        line-height: 1.25 !important;
        border-radius: 9px !important;
        margin-bottom: 0 !important;
        resize: vertical;
      }

      .linha-form-eventos {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 7px;
      }

      .acoes-evento {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 2px;
      }

      #btn-salvar-evento {
        min-height: 38px !important;
        height: 38px !important;
        padding: 0 16px !important;
        border: 0 !important;
        border-radius: 12px !important;
        background: linear-gradient(135deg, #33c4ff, #7a5cff, #b84dff) !important;
        color: #ffffff !important;
        font-size: 14px !important;
        font-weight: 800 !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 9px !important;
        box-shadow: 0 10px 24px rgba(122, 92, 255, .22) !important;
      }

      #btn-salvar-evento::before {
        content: "✓";
        width: 19px;
        height: 19px;
        min-width: 19px;
        border: 2px solid rgba(255,255,255,.92);
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-size: 12px;
        font-weight: 900;
        line-height: 1;
      }

      .lista-eventos {
        display: grid;
        gap: 10px;
        max-height: 540px;
        overflow-y: auto;
        overflow-x: hidden;
        padding-right: 6px;
        overscroll-behavior: contain;
        scrollbar-width: thin;
        scrollbar-color: rgba(168, 85, 247, .48) rgba(255,255,255,.05);
      }

      .lista-eventos::-webkit-scrollbar {
        width: 8px;
      }

      .lista-eventos::-webkit-scrollbar-track {
        background: rgba(255,255,255,.05);
        border-radius: 999px;
      }

      .lista-eventos::-webkit-scrollbar-thumb {
        background: rgba(168, 85, 247, .48);
        border-radius: 999px;
      }

      .lista-eventos::-webkit-scrollbar-thumb:hover {
        background: rgba(168, 85, 247, .68);
      }

      .item-evento {
        border: 1px solid rgba(255, 255, 255, .16);
        border-radius: 14px;
        padding: 14px;
        background: #1f2937;
        color: #f9fafb;
      }

      .item-evento-topo {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }

      .item-evento-conteudo {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        flex: 1;
      }

      .icone-evento-placeholder {
        width: 42px;
        height: 42px;
        min-width: 42px;
        border-radius: 50%;
        background: #6d28d9;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        color: #ffffff;
      }

      .dados-evento h4 {
        margin: 0 0 6px;
        color: #ffffff;
        font-size: 17px;
      }

      .dados-evento p {
        margin: 3px 0;
        font-size: 13px;
        color: #d1d5db;
      }

      .dados-evento strong {
        color: #f3f4f6;
      }

      .tag-status-evento {
        display: inline-block;
        margin-top: 8px;
        padding: 4px 9px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
        background: #374151;
        color: #e5e7eb;
      }

      .tag-status-confirmado {
        background: #166534;
        color: #dcfce7;
      }

      .tag-status-cancelado {
        background: #7f1d1d;
        color: #fee2e2;
      }

      .tag-status-realizado {
        background: #1e3a8a;
        color: #dbeafe;
      }

      .botoes-item-evento {
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        gap: 12px;
        flex-wrap: nowrap;
      }

      .botoes-item-evento .btn-icone-evento,
      .botoes-item-evento .btn-editar-evento,
      .botoes-item-evento .btn-compartilhar-evento,
      .botoes-item-evento .btn-excluir-evento,
      .botoes-item-evento .btn-whatsapp-evento {
        width: 24px !important;
        height: 24px !important;
        min-width: 24px !important;
        min-height: 24px !important;
        padding: 0 !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        color: #ffffff !important;
        box-shadow: none !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        cursor: pointer !important;
      }

      .botoes-item-evento .btn-icone-evento:hover {
        background: transparent !important;
        transform: translateY(-1px);
        filter: brightness(1.08);
      }

      .botoes-item-evento .btn-icone-evento svg {
        width: 21px !important;
        height: 21px !important;
        display: block !important;
        fill: none !important;
        stroke: #ffffff !important;
        stroke-width: 2 !important;
        stroke-linecap: round !important;
        stroke-linejoin: round !important;
      }

      .botoes-item-evento .btn-icone-evento span {
        display: none !important;
      }

      .crossset-smart-card {
        margin-bottom: 10px;
        padding: 10px;
        border-radius: 13px;
        background: linear-gradient(135deg, rgba(51,196,255,.10), rgba(122,92,255,.16), rgba(184,77,255,.10));
        border: 1px solid rgba(255,255,255,.12);
        display: grid;
        gap: 8px;
      }

      .crossset-smart-topo {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .crossset-smart-topo strong {
        color: #ffffff;
        font-size: 14px;
      }

      .crossset-smart-topo span {
        color: #aebff2;
        font-size: 11px;
        font-weight: 700;
      }

      .crossset-smart-busca {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 6px;
      }

      .crossset-smart-busca input {
        margin-bottom: 0 !important;
      }

      .crossset-smart-busca button,
      .crossset-smart-confirmar {
        min-height: 34px !important;
        height: 34px !important;
        border: 0;
        border-radius: 9px;
        padding: 0 12px;
        cursor: pointer;
        background: linear-gradient(135deg, #33c4ff, #7a5cff, #b84dff);
        color: #ffffff;
        font-size: 12px;
        font-weight: 800;
        white-space: nowrap;
      }

      .crossset-smart-sugestoes {
        display: grid;
        gap: 6px;
      }

      .crossset-smart-sugestao {
        width: 100%;
        border: 1px solid rgba(255,255,255,.10);
        border-radius: 10px;
        background: rgba(255,255,255,.055);
        color: #ffffff;
        text-align: left;
        padding: 8px;
        cursor: pointer;
        display: grid;
        gap: 2px;
      }

      .crossset-smart-sugestao:hover {
        background: rgba(122,92,255,.18);
      }

      .crossset-smart-sugestao strong,
      .crossset-smart-preview strong {
        font-size: 13px;
        color: #ffffff;
      }

      .crossset-smart-sugestao span,
      .crossset-smart-preview span {
        font-size: 11.5px;
        color: #cbd5e1;
      }

      .crossset-smart-preview {
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 12px;
        padding: 9px;
        background: rgba(7,17,31,.72);
        display: none;
        gap: 5px;
      }

      .crossset-smart-preview.ativo {
        display: grid;
      }

      .crossset-smart-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        margin: 4px 0;
      }

      .crossset-smart-meta span {
        padding: 4px 7px;
        border-radius: 999px;
        background: rgba(255,255,255,.075);
        border: 1px solid rgba(255,255,255,.10);
        color: #dbeafe;
        font-weight: 700;
      }

      .crossset-smart-ajuda {
        color: #9ca3af;
        font-size: 11px;
        line-height: 1.35;
      }




      /* UX v0.9.20 - cadastro ultracompacto */
      .modulo-musicas > .card-projeto:first-child {
        align-self: start;
      }

      .modulo-musicas > .card-projeto:first-child label {
        margin: 0 !important;
      }

      .modulo-musicas > .card-projeto:first-child input,
      .modulo-musicas > .card-projeto:first-child textarea {
        box-shadow: none !important;
      }

      @media (max-width: 820px) {
        .modulo-eventos,
        .linha-form-eventos,
        .filtros-eventos,
        .item-evento-topo {
          grid-template-columns: 1fr;
          flex-direction: column;
        }

        .lista-eventos {
          max-height: none !important;
          overflow-y: visible !important;
          padding-right: 0 !important;
        }

        .botoes-item-evento {
          justify-content: flex-start;
        }
      }
    </style>

    <div class="modulo-eventos">
      <div class="card-projeto">
        <span class="tag">Cadastro</span>
        <h3 id="titulo-form-evento">Novo evento</h3>
        <p>Cadastre shows, ensaios e compromissos do projeto.</p>

        <div class="form-eventos">
          <label>
            Nome do evento
            <input id="evento-nome" type="text" placeholder="Ex: Show de Sábado" />
          </label>

          <div class="linha-form-eventos">
            <label>
              Data
              <input id="evento-data" type="date" />
            </label>

            <label>
              Horário
              <input id="evento-hora" type="time" />
            </label>
          </div>

          <label>
            Local
            <input id="evento-local" type="text" placeholder="Ex: Espaço Cultural" />
          </label>

          <div class="linha-form-eventos">
            <label>
              Cidade
              <input id="evento-cidade" type="text" placeholder="Ex: Campinas" />
            </label>

            <label>
              Estado (UF)
              <input id="evento-estado" type="text" maxlength="2" placeholder="SP" />
            </label>
          </div>

          <label>
            Repertório
            <select id="evento-repertorio">
              <option value="">Sem repertório definido</option>
            </select>
          </label>

          <label>
            Status
            <select id="evento-status">
              <option value="Agendado">Agendado</option>
              <option value="Confirmado">Confirmado</option>
              <option value="Cancelado">Cancelado</option>
              <option value="Realizado">Realizado</option>
            </select>
          </label>

          <label>
            Observações
            <textarea id="evento-observacoes" placeholder="Ex: Levar extensão e retorno"></textarea>
          </label>

          <div class="acoes-evento">
            <button class="botao-card" id="btn-salvar-evento" type="button">Salvar evento</button>
            <button class="botao-secundario-modulo" id="btn-cancelar-evento" type="button" style="display:none;">Cancelar edição</button>
          </div>
        </div>
      </div>

      <div class="card-projeto">
        <span class="tag">Lista</span>
        <h3>Eventos cadastrados</h3>
        <p>Cadastre, edite ou exclua eventos do projeto.</p>

        <div class="filtros-eventos">
          <label>
            Pesquisar
            <input id="busca-eventos" type="text" placeholder="Buscar por evento, local, cidade, status ou repertório" />
          </label>
        </div>

        <div id="lista-eventos" class="lista-eventos">
          <p>Carregando eventos...</p>
        </div>
      </div>
    </div>
  `;

  appState.eventoEditandoId = null;
  configurarEventosModuloEventos();
  await carregarRepertoriosParaEvento();
  await buscarEventos();
}

function configurarEventosModuloEventos() {
  const botaoSalvar = elemento("btn-salvar-evento");
  const botaoCancelar = elemento("btn-cancelar-evento");
  const busca = elemento("busca-eventos");

  if (botaoSalvar) {
    botaoSalvar.addEventListener("click", salvarEvento);
  }

  if (botaoCancelar) {
    botaoCancelar.addEventListener("click", limparFormularioEvento);
  }

  if (busca) {
    busca.addEventListener("input", renderizarListaEventos);
  }
}

async function carregarRepertoriosParaEvento() {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();
  const select = elemento("evento-repertorio");

  if (!cliente || !projetoId || !select) {
    return;
  }

  const { data, error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.repertorios)
    .select("id, nome")
    .eq("projeto_id", projetoId)
    .order("nome", { ascending: true });

  if (error) {
    select.innerHTML = `<option value="">Erro ao carregar repertórios</option>`;
    return;
  }

  appState.repertorios = data || appState.repertorios || [];

  select.innerHTML = `<option value="">Sem repertório definido</option>`;

  (data || []).forEach(function(repertorio) {
    select.innerHTML += `
      <option value="${escaparHtml(repertorio.id)}">${escaparHtml(repertorio.nome || "Sem nome")}</option>
    `;
  });
}

async function buscarEventos() {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();
  const lista = elemento("lista-eventos");

  if (!cliente || !projetoId || !lista) {
    return;
  }

  const { data, error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.eventos)
    .select("*")
    .eq("projeto_id", projetoId)
    .order("data_evento", { ascending: true })
    .order("hora_evento", { ascending: true });

  if (!projetoAtualAindaEh(projetoId)) {
    return;
  }

  if (error) {
    lista.innerHTML = `<p>Erro ao carregar eventos: ${escaparHtml(error.message)}</p>`;
    return;
  }

  appState.eventos = data || [];
  renderizarListaEventos();
}

function obterNomeRepertorioPorId(id) {
  if (!id) {
    return "Sem repertório definido";
  }

  const repertorio = (appState.repertorios || []).find(function(item) {
    return item.id === id;
  });

  return repertorio?.nome || "Repertório não encontrado";
}

function formatarDataBR(data) {
  if (!data) {
    return "Sem data";
  }

  const partes = String(data).split("-");

  if (partes.length !== 3) {
    return data;
  }

  return partes[2] + "/" + partes[1] + "/" + partes[0];
}

function renderizarListaEventos() {
  const lista = elemento("lista-eventos");
  const busca = limparTexto(elemento("busca-eventos")?.value).toLowerCase();

  if (!lista) {
    return;
  }

  let itens = [...(appState.eventos || [])];

  if (busca) {
    itens = itens.filter(function(item) {
      const texto = [
        item.nome,
        item.local,
        item.cidade,
        item.estado,
        item.status,
        item.observacoes,
        obterNomeRepertorioPorId(item.repertorio_id)
      ].join(" ").toLowerCase();

      return texto.includes(busca);
    });
  }

  if (itens.length === 0) {
    lista.innerHTML = `<p>Nenhum evento encontrado.</p>`;
    return;
  }

  lista.innerHTML = itens.map(function(item) {
    const status = item.status || "Agendado";
    const classeStatus = status === "Confirmado"
      ? "tag-status-confirmado"
      : status === "Cancelado"
        ? "tag-status-cancelado"
        : status === "Realizado"
          ? "tag-status-realizado"
          : "";

    return `
      <div class="item-evento">
        <div class="item-evento-topo">
          <div class="item-evento-conteudo">
            <div class="icone-evento-placeholder">📅</div>

            <div class="dados-evento">
              <h4>${escaparHtml(item.nome || "Sem nome")}</h4>
              <p><strong>Data:</strong> ${escaparHtml(formatarDataBR(item.data_evento))}${item.hora_evento ? " • " + escaparHtml(item.hora_evento) : ""}</p>
              <p><strong>Local:</strong> ${escaparHtml(item.local || "Não informado")}</p>
              <p><strong>Cidade:</strong> ${escaparHtml(item.cidade || "Não informada")}${item.estado ? " - " + escaparHtml(item.estado) : ""}</p>
              <p><strong>Repertório:</strong> ${escaparHtml(obterNomeRepertorioPorId(item.repertorio_id))}</p>
              ${item.observacoes ? `<p><strong>Obs:</strong> ${escaparHtml(item.observacoes)}</p>` : ""}
              <span class="tag-status-evento ${classeStatus}">${escaparHtml(status)}</span>
            </div>
          </div>

          <div class="botoes-item-evento">
            <button class="btn-editar-evento btn-icone-evento" type="button" title="Editar" aria-label="Editar evento" data-editar-evento="${escaparHtml(item.id)}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg><span>Editar</span></button>
            <button class="btn-compartilhar-evento btn-icone-evento" type="button" title="Compartilhar pelo WhatsApp" aria-label="Compartilhar evento pelo WhatsApp" data-compartilhar-evento="${escaparHtml(item.id)}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><path d="M8.7 10.6 15.3 6.4"></path><path d="M8.7 13.4l6.6 4.2"></path></svg><span>Compartilhar</span></button>
            <button class="btn-excluir-evento btn-icone-evento" type="button" title="Excluir" aria-label="Excluir evento" data-excluir-evento="${escaparHtml(item.id)}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M6 6l1 16h10l1-16"></path><path d="M10 11v6"></path><path d="M14 11v6"></path></svg><span>Excluir</span></button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  lista.querySelectorAll("[data-editar-evento]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      editarEvento(botao.dataset.editarEvento);
    });
  });

  lista.querySelectorAll("[data-compartilhar-evento]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      compartilharEvento(botao.dataset.compartilharEvento);
    });
  });

  lista.querySelectorAll("[data-excluir-evento]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      excluirEvento(botao.dataset.excluirEvento);
    });
  });
}

function obterDadosFormularioEvento() {
  return {
    nome: limparTexto(elemento("evento-nome")?.value),
    data_evento: limparTexto(elemento("evento-data")?.value),
    hora_evento: limparTexto(elemento("evento-hora")?.value),
    local: limparTexto(elemento("evento-local")?.value),
    cidade: limparTexto(elemento("evento-cidade")?.value),
    estado: normalizarUF(elemento("evento-estado")?.value),
    repertorio_id: limparTexto(elemento("evento-repertorio")?.value),
    status: limparTexto(elemento("evento-status")?.value) || "Agendado",
    observacoes: limparTexto(elemento("evento-observacoes")?.value)
  };
}

function preencherFormularioEvento(item) {
  if (!item) {
    return;
  }

  elemento("evento-nome").value = item.nome || "";
  elemento("evento-data").value = item.data_evento || "";
  elemento("evento-hora").value = item.hora_evento || "";
  elemento("evento-local").value = item.local || "";
  elemento("evento-cidade").value = item.cidade || "";
  elemento("evento-estado").value = item.estado || "";
  elemento("evento-repertorio").value = item.repertorio_id || "";
  elemento("evento-status").value = item.status || "Agendado";
  elemento("evento-observacoes").value = item.observacoes || "";

  const titulo = elemento("titulo-form-evento");
  const botaoSalvar = elemento("btn-salvar-evento");
  const botaoCancelar = elemento("btn-cancelar-evento");
  const botaoCompartilhar = elemento("btn-compartilhar-evento");
  const botaoGerarPdf = elemento("btn-gerar-pdf-evento");

  if (titulo) {
    titulo.textContent = "Editar evento";
  }

  if (botaoSalvar) {
    botaoSalvar.textContent = "✓ Salvar alterações";
    botaoSalvar.style.display = "inline-flex";
  }

  if (botaoCompartilhar) {
    botaoCompartilhar.style.display = appState.repertorioEditandoId || appState.repertorioMontandoId ? "inline-flex" : "none";
  }

  if (botaoGerarPdf) {
    botaoGerarPdf.style.display = "none";
  }

  if (botaoCancelar) {
    botaoCancelar.style.display = "none";
  }

  const area = elemento("area-modulo");
  if (area) {
    area.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function limparFormularioEvento() {
  appState.eventoEditandoId = null;

  [
    "evento-nome",
    "evento-data",
    "evento-hora",
    "evento-local",
    "evento-cidade",
    "evento-estado",
    "evento-observacoes"
  ].forEach(function(id) {
    const campo = elemento(id);
    if (campo) {
      campo.value = "";
    }
  });

  const repertorio = elemento("evento-repertorio");
  const status = elemento("evento-status");
  const titulo = elemento("titulo-form-evento");
  const botaoSalvar = elemento("btn-salvar-evento");
  const botaoCancelar = elemento("btn-cancelar-evento");

  if (repertorio) {
    repertorio.value = "";
  }

  if (status) {
    status.value = "Agendado";
  }

  if (titulo) {
    titulo.textContent = "Novo evento";
  }

  if (botaoSalvar) {
    botaoSalvar.textContent = "Salvar evento";
  }

  if (botaoCancelar) {
    botaoCancelar.style.display = "none";
  }
}

async function salvarEvento() {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();

  if (!cliente || !projetoId) {
    return;
  }

  const dados = obterDadosFormularioEvento();

  if (!dados.nome) {
    alert("Informe o nome do evento.");
    return;
  }

  const { data: sessionData } = await cliente.auth.getSession();
  const usuario = sessionData.session?.user;

  if (!usuario) {
    mostrarTela("tela-login", { registrar: false });
    return;
  }

  const payloadBase = {
    projeto_id: projetoId,
    nome: dados.nome,
    data_evento: dados.data_evento || null,
    hora_evento: dados.hora_evento || null,
    local: dados.local,
    cidade: dados.cidade,
    estado: dados.estado,
    repertorio_id: dados.repertorio_id || null,
    status: dados.status,
    observacoes: dados.observacoes
  };

  let resultado;

  if (appState.eventoEditandoId) {
    resultado = await cliente
      .from(REPERTORIO_FACIL.tabelas.eventos)
      .update(payloadBase)
      .eq("id", appState.eventoEditandoId)
      .eq("projeto_id", projetoId);
  } else {
    resultado = await cliente
      .from(REPERTORIO_FACIL.tabelas.eventos)
      .insert({
        ...payloadBase,
        usuario_id: usuario.id
      });
  }

  if (resultado.error) {
    alert("Erro ao salvar evento: " + resultado.error.message);
    return;
  }

  limparFormularioEvento();
  await buscarEventos();
}

function editarEvento(id) {
  const item = (appState.eventos || []).find(function(evento) {
    return evento.id === id;
  });

  if (!item) {
    alert("Evento não encontrado.");
    return;
  }

  appState.eventoEditandoId = id;
  preencherFormularioEvento(item);
}

async function excluirEvento(id) {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();

  if (!cliente || !id || !projetoId) {
    return;
  }

  const confirmar = confirm("Excluir este evento?");

  if (!confirmar) {
    return;
  }

  const { data: sessionData } = await cliente.auth.getSession();
  const usuario = sessionData.session?.user;

  if (!usuario) {
    mostrarTela("tela-login", { registrar: false });
    return;
  }

  const { error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.eventos)
    .delete()
    .eq("id", id)
    .eq("projeto_id", projetoId);

  if (error) {
    alert("Erro ao excluir evento: " + error.message);
    return;
  }

  if (appState.eventoEditandoId === id) {
    limparFormularioEvento();
  }

  await buscarEventos();
}

async function criarEvento() {
  await salvarEvento();
}

async function restaurarProjetoAtual() {
  const id = obterProjetoAtualId();

  if (!id) {
    return;
  }

  const cliente = sb();

  const { data, error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.projetos)
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    const projetoCache = obterProjetoConviteCache(id);

    if (projetoCache) {
      salvarProjetoAtual(projetoCache);
      return;
    }

    localStorage.removeItem("projeto_atual");
    return;
  }

  salvarProjetoAtual(data);
  salvarProjetoConviteCache(data);
}


function configurarRecuperacaoConviteManual() {
  // Opção manual de código de convite removida da tela de login.
}


function configurarBotoesFixos() {
  const botaoGoogle = elemento("btn-google");

  if (botaoGoogle) {
    botaoGoogle.addEventListener("click", entrarComGoogle);
  }

  const botaoLogin = elemento("btn-login-email");

  if (botaoLogin) {
    botaoLogin.addEventListener("click", entrarComEmail);
  }

  const botaoCriarProjeto = elemento("btn-criar-projeto");

  if (botaoCriarProjeto) {
    botaoCriarProjeto.addEventListener("click", criarProjeto);
  }

  document.querySelectorAll("[onclick]").forEach(function(item) {
    const acao = item.getAttribute("onclick");

    if (!acao) {
      return;
    }

    item.removeAttribute("onclick");

    if (acao.includes("tela-cadastro")) {
      item.addEventListener("click", function() {
        mostrarTela("tela-cadastro");
      });
    }

    if (acao.includes("tela-login")) {
      item.addEventListener("click", function() {
        mostrarTela("tela-login");
      });
    }

    if (acao.includes("tela-projetos")) {
      item.addEventListener("click", function() {
        mostrarTela("tela-projetos");
      });
    }

    if (acao.includes("tela-novo-projeto")) {
      item.addEventListener("click", function() {
        mostrarTela("tela-novo-projeto");
      });
    }

    if (acao.includes("validarCadastro")) {
      item.addEventListener("click", validarCadastro);
    }

    if (acao.includes("sair")) {
      item.addEventListener("click", sair);
    }
  });
}

function configurarEnterNosCampos() {
  const campos = [
    elemento("login-email"),
    elemento("login-senha")
  ];

  campos.forEach(function(campo) {
    if (!campo) {
      return;
    }

    campo.addEventListener("keydown", function(evento) {
      if (evento.key === "Enter") {
        entrarComEmail();
      }
    });
  });
}

function configurarNavegacaoEnterGlobal() {
  if (window.__repertorioFacilEnterGlobalConfigurado) {
    return;
  }

  window.__repertorioFacilEnterGlobalConfigurado = true;

  document.addEventListener("keydown", function(evento) {
    if (evento.key !== "Enter" || evento.isComposing) {
      return;
    }

    const campoAtual = evento.target;

    if (!campoAtual || !campoAtual.matches || !campoAtual.matches("input, select, textarea")) {
      return;
    }

    if (campoAtual.id === "login-email" || campoAtual.id === "login-senha") {
      return;
    }

    const tag = campoAtual.tagName.toLowerCase();

    if (tag === "textarea") {
      if (evento.ctrlKey || evento.metaKey) {
        evento.preventDefault();
        acionarBotaoSalvarDoFormulario(campoAtual);
      }

      return;
    }

    evento.preventDefault();

    if (evento.shiftKey) {
      focarCampoAnterior(campoAtual);
      return;
    }

    focarProximoCampoOuSalvar(campoAtual);
  });
}

function obterControlesDoFormulario(campo) {
  const container =
    campo.closest(".form-integrantes") ||
    campo.closest(".form-musicas") ||
    campo.closest(".form-repertorios") ||
    campo.closest(".form-eventos") ||
    campo.closest(".card-login") ||
    campo.closest(".card-projeto");

  if (!container) {
    return [];
  }

  return Array.from(container.querySelectorAll("input, select, textarea")).filter(function(controle) {
    if (controle.disabled || controle.readOnly) {
      return false;
    }

    const estilo = window.getComputedStyle(controle);

    if (estilo.display === "none" || estilo.visibility === "hidden") {
      return false;
    }

    if (controle.offsetParent === null && estilo.position !== "fixed") {
      return false;
    }

    return true;
  });
}

function focarProximoCampoOuSalvar(campoAtual) {
  const controles = obterControlesDoFormulario(campoAtual);
  const indiceAtual = controles.indexOf(campoAtual);

  if (indiceAtual === -1) {
    return;
  }

  const proximoCampo = controles[indiceAtual + 1];

  if (proximoCampo) {
    proximoCampo.focus();

    if (typeof proximoCampo.select === "function" && proximoCampo.tagName.toLowerCase() !== "select") {
      proximoCampo.select();
    }

    return;
  }

  acionarBotaoSalvarDoFormulario(campoAtual);
}

function focarCampoAnterior(campoAtual) {
  const controles = obterControlesDoFormulario(campoAtual);
  const indiceAtual = controles.indexOf(campoAtual);

  if (indiceAtual <= 0) {
    return;
  }

  const campoAnterior = controles[indiceAtual - 1];

  if (campoAnterior) {
    campoAnterior.focus();

    if (typeof campoAnterior.select === "function" && campoAnterior.tagName.toLowerCase() !== "select") {
      campoAnterior.select();
    }
  }
}

function acionarBotaoSalvarDoFormulario(campo) {
  const container =
    campo.closest(".form-integrantes") ||
    campo.closest(".form-musicas") ||
    campo.closest(".form-repertorios") ||
    campo.closest(".form-eventos") ||
    campo.closest(".card-login") ||
    campo.closest(".card-projeto");

  if (!container) {
    return;
  }

  const botaoSalvar =
    container.querySelector("#btn-salvar-integrante") ||
    container.querySelector("#btn-salvar-musica") ||
    container.querySelector("#btn-salvar-repertorio") ||
    container.querySelector("#btn-salvar-evento") ||
    container.querySelector("#btn-criar-projeto") ||
    container.querySelector("#btn-login-email") ||
    container.querySelector("button[id*='salvar']") ||
    container.querySelector("button.botao-card") ||
    container.querySelector("button.botao-principal");

  if (botaoSalvar && !botaoSalvar.disabled) {
    botaoSalvar.click();
  }
}



function configurarAuthListener() {
  const cliente = sb();

  if (!cliente) {
    return;
  }

  cliente.auth.onAuthStateChange(async function(event, session) {
    if (session && session.user) {
      appState.sessao = session;
      appState.usuario = session.user;

      preencherUsuario(session.user);

      const codigoConvite = obterCodigoConvitePendente();
      if (codigoConvite) {
        await carregarConvitePublico(codigoConvite);
        return;
      }

      const projetoConviteAberto = sessionStorage.getItem("abrir_projeto_convite_id");
      if (projetoConviteAberto) {
        abrirProjetoSalvoSeExistir();
        return;
      }

      if (
        appState.telaAtual === "tela-login" ||
        appState.telaAtual === "tela-cadastro"
      ) {
        abrirProjetoSalvoSeExistir().then(function(abriu) {
          if (!abriu) {
            mostrarTela("tela-projetos", { registrar: false });
          }
        });
      }
    }

    if (event === "SIGNED_OUT") {
      appState.sessao = null;
      appState.usuario = null;
      appState.projetoAtual = null;

      localStorage.removeItem("projeto_atual");

      mostrarTela("tela-login", { registrar: false });
    }
  });
}




function rfSvgIconeCampoTexto(tipo) {
  const icones = {
    material: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
    letra: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></svg>',
    observacoes: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h6"/></svg>',
    descricao: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg>',
    padrao: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>'
  };
  return icones[tipo] || icones.padrao;
}

function rfTipoCampoTexto(titulo, id) {
  const texto = (String(titulo || '') + ' ' + String(id || '')).toLowerCase();
  if (texto.includes('material') || texto.includes('cifra') || texto.includes('tablatura') || texto.includes('partitura')) return 'material';
  if (texto.includes('letra')) return 'letra';
  if (texto.includes('observa')) return 'observacoes';
  if (texto.includes('descri')) return 'descricao';
  return 'padrao';
}

function rfTituloCampoTexto(label, textarea) {
  const clone = label.cloneNode(true);
  clone.querySelectorAll('textarea, input, select, button, .rf-textarea-header, .rf-textarea-counter, .rf-textarea-help').forEach(function(no) {
    no.remove();
  });
  const texto = limparTexto(clone.textContent);
  if (texto) return texto;

  const id = textarea.id || '';
  if (id.includes('material')) return 'Cifra / Partitura';
  if (id.includes('letra')) return 'Letra';
  if (id.includes('observ')) return 'Observações';
  if (id.includes('descricao')) return 'Descrição';
  return 'Informações';
}

function rfAtualizarContadorTextarea(textarea, contador) {
  if (!textarea || !contador) return;
  const total = String(textarea.value || '').length;
  const max = Number(textarea.getAttribute('maxlength') || 0);
  contador.textContent = max > 0 ? `${total} / ${max} caracteres` : `${total} caracteres`;
}

function aprimorarCamposTextoGrandes(contexto) {
  const raiz = contexto && contexto.querySelectorAll ? contexto : document;

  raiz.querySelectorAll('label').forEach(function(label) {
    const textarea = label.querySelector(':scope > textarea');
    if (!textarea || label.dataset.rfTextarea === 'true') return;

    const titulo = rfTituloCampoTexto(label, textarea);
    const tipo = rfTipoCampoTexto(titulo, textarea.id);
    const obrigatorio = textarea.hasAttribute('required');

    Array.from(label.childNodes).forEach(function(no) {
      if (no.nodeType === Node.TEXT_NODE && limparTexto(no.textContent)) {
        no.textContent = '';
      }
    });

    label.classList.add('rf-campo-textarea');
    label.dataset.rfTextarea = 'true';

    const header = document.createElement('div');
    header.className = 'rf-textarea-header';
    header.innerHTML = `
      <span class="rf-textarea-icon">${rfSvgIconeCampoTexto(tipo)}</span>
      <span>${escaparHtml(titulo)}</span>
    `;

    label.insertBefore(header, textarea);

    const contador = document.createElement('div');
    contador.className = 'rf-textarea-counter';
    label.appendChild(contador);
    rfAtualizarContadorTextarea(textarea, contador);
    textarea.addEventListener('input', function() {
      rfAtualizarContadorTextarea(textarea, contador);
    });
  });
}

function configurarAprimoramentoCamposTexto() {
  aprimorarCamposTextoGrandes(document);

  const observer = new MutationObserver(function(mudancas) {
    mudancas.forEach(function(mudanca) {
      mudanca.addedNodes.forEach(function(no) {
        if (no.nodeType === 1) {
          aprimorarCamposTextoGrandes(no);
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

function prepararAplicacao() {
  configurarBotoesFixos();
  configurarRecuperacaoConviteManual();
  configurarEnterNosCampos();
  configurarAuthListener();
  configurarNavegacaoEnterGlobal();
  configurarAprimoramentoCamposTexto();
}

document.addEventListener("DOMContentLoaded", async function() {
  ativarBarrasInternasCrossSet();
  prepararAplicacao();

  await verificarSessao();
  await restaurarProjetoAtual();
});

const crosssetScrollObserver = new MutationObserver(function(){ ativarBarrasInternasCrossSet(); });
crosssetScrollObserver.observe(document.documentElement,{childList:true,subtree:true});

/* CrossSet v1.0.1 - padronização urgente do compartilhamento de repertórios.
   O clique no ícone sempre abre primeiro o menu próprio do CrossSet,
   independentemente do navegador ou do suporte a navigator.share(). */
(function garantirMenuPadraoCompartilhamentoRepertorio() {
  if (window.__crosssetMenuRepertorioPadraoAtivo) {
    return;
  }

  window.__crosssetMenuRepertorioPadraoAtivo = true;
  window.__crosssetFrontendVersion = "1.0.4-repertorio-unico-v70";

  document.addEventListener("click", function(evento) {
    const alvo = evento.target instanceof Element
      ? evento.target.closest("[data-compartilhar-repertorio]")
      : null;

    if (!alvo) {
      return;
    }

    evento.preventDefault();
    evento.stopPropagation();
    evento.stopImmediatePropagation();

    const repertorioId = alvo.getAttribute("data-compartilhar-repertorio") || "";

    if (!repertorioId) {
      return;
    }

    compartilharRepertorio(repertorioId);
  }, true);

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then(function(registros) {
        registros.forEach(function(registro) {
          registro.update().catch(function() {});
        });
      })
      .catch(function() {});
  }
})();


/* CrossSet v1.0.3 — consistência da montagem de repertório no app.
   Mantém somente a renderização compacta atual e força a atualização
   dos arquivos em cache quando esta versão chegar ao dispositivo. */
(function garantirVersaoCompactaRepertorio() {
  const VERSAO = "1.0.4-repertorio-unico-v70";
  const CHAVE = "crossset_frontend_build";

  window.__crosssetFrontendVersion = VERSAO;

  function reforcarMontagemCompacta() {
    const lista = document.getElementById("lista-musicas-repertorio");

    if (!lista) {
      return;
    }

    lista.classList.add("setlist-lista-final");

    const cabecalho = lista.previousElementSibling;
    const ajuda = cabecalho?.querySelector?.(".texto-ajuda");
    if (ajuda) {
      ajuda.textContent = "Arraste para reorganizar ou use as setas.";
    }

    if (typeof configurarArrastarMusicasRepertorio === "function") {
      configurarArrastarMusicasRepertorio();
    }
  }

  document.addEventListener("DOMContentLoaded", reforcarMontagemCompacta);

  const observador = new MutationObserver(function() {
    reforcarMontagemCompacta();
  });

  observador.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  let versaoAnterior = "";
  try {
    versaoAnterior = localStorage.getItem(CHAVE) || "";
    localStorage.setItem(CHAVE, VERSAO);
  } catch (erroStorage) {}

  if (versaoAnterior === VERSAO) {
    return;
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then(function(registros) {
        return Promise.all(registros.map(function(registro) {
          return registro.update().catch(function() {});
        }));
      })
      .catch(function() {});
  }

  if ("caches" in window) {
    caches.keys()
      .then(function(chaves) {
        return Promise.all(chaves.map(function(chave) {
          return caches.delete(chave);
        }));
      })
      .catch(function() {});
  }
})();


/* CrossSet v70 — proteção crítica contra interface antiga do repertório.
   Toda montagem aberta é normalizada para o componente atual com arraste. */
(function protegerMontagemAtualRepertorio() {
  const BUILD = "1.0.4-repertorio-unico-v70";
  window.__crosssetFrontendVersion = BUILD;

  function aplicar() {
    const lista = document.getElementById("lista-musicas-repertorio");
    if (!lista) return;

    lista.classList.add("setlist-lista-final");

    lista.querySelectorAll("[data-repertorio-item]").forEach(function(item) {
      item.classList.add("setlist-linha");
      item.setAttribute("draggable", "true");

      if (!item.querySelector(".setlist-arrastar")) {
        const alca = document.createElement("div");
        alca.className = "setlist-arrastar";
        alca.title = "Arrastar para reorganizar";
        alca.setAttribute("aria-label", "Arrastar para reorganizar");
        alca.textContent = "⋮⋮";
        item.insertBefore(alca, item.firstChild);
      }
    });

    if (typeof configurarArrastarMusicasRepertorio === "function") {
      configurarArrastarMusicasRepertorio();
    }
  }

  document.addEventListener("DOMContentLoaded", aplicar);
  window.addEventListener("load", aplicar);

  const observer = new MutationObserver(aplicar);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
