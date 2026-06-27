"use strict";

const REPERTORIO_FACIL = {
  urlApp: "https://jc81rock.github.io/RepertorioFacilNovo/",
  tabelas: {
    projetos: "projetos",
    integrantes: "integrantes",
    musicas: "musicas",
    repertorios: "repertorios",
    repertorioMusicas: "repertorio_musicas",
    eventos: "eventos",
    projetoParticipantes: "projeto_participantes"
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
  eventos: [],
  eventoEditandoId: null,
  papelProjetoAtual: null,
  participantesProjetos: []
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


function obterChaveBoasVindas(usuario) {
  const identificador = usuario?.id || usuario?.email || "anonimo";
  return "repertorio_facil_boas_vindas_" + identificador;
}

function boasVindasJaConcluida(usuario) {
  return localStorage.getItem(obterChaveBoasVindas(usuario)) === "true";
}

function marcarBoasVindasConcluida(usuario) {
  localStorage.setItem(obterChaveBoasVindas(usuario), "true");
}

function abrirTelaInicialAutenticada(usuario, opcoes = {}) {
  if (!boasVindasJaConcluida(usuario)) {
    mostrarTela("tela-boas-vindas", { registrar: false });
    return;
  }

  mostrarTela("tela-projetos", opcoes);
}

function concluirBoasVindas() {
  if (appState.usuario) {
    marcarBoasVindasConcluida(appState.usuario);
  }

  mostrarTela("tela-projetos", { registrar: false });
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

function limparCampos(container) {
  if (!container) {
    return;
  }

  container.querySelectorAll("input, select, textarea").forEach(function(campo) {
    campo.value = "";
  });
}

function salvarProjetoAtual(projeto, papel = null) {
  appState.projetoAtual = projeto || null;
  appState.papelProjetoAtual = papel || projeto?.papel_usuario || null;

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

async function verificarSessao() {
  const cliente = sb();

  if (!cliente) {
    mostrarTela("tela-login", { registrar: false });
    return;
  }

  const { data, error } = await cliente.auth.getSession();

  if (error || !data.session) {
    appState.sessao = null;
    appState.usuario = null;
    mostrarTela("tela-login", { registrar: false });
    return;
  }

  appState.sessao = data.session;
  appState.usuario = data.session.user;

  preencherUsuario(appState.usuario);
  abrirTelaInicialAutenticada(appState.usuario, { registrar: false });
}

async function entrarComGoogle() {
  const cliente = sb();

  if (!cliente) {
    return;
  }

  const { data, error } = await cliente.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: REPERTORIO_FACIL.urlApp,
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
  abrirTelaInicialAutenticada(appState.usuario);
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

  const { error } = await cliente.auth.signUp({
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

  let projetos = [];

  const { data, error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.projetoParticipantes)
    .select("id, projeto_id, usuario_id, papel, status, projetos(*)")
    .eq("usuario_id", usuario.id)
    .eq("status", "ativo")
    .order("criado_em", { ascending: false });

  if (!error && Array.isArray(data)) {
    projetos = data
      .filter(function(item) {
        return item.projetos && item.projetos.id;
      })
      .map(function(item) {
        return {
          ...item.projetos,
          papel_usuario: item.papel || "integrante",
          participante_id: item.id
        };
      });
  }

  if (error) {
    console.warn("Erro ao carregar participantes. Tentando compatibilidade antiga:", error.message);
  }

  /*
    Compatibilidade de migração:
    se o usuário já tinha projetos na arquitetura antiga, o sistema ainda deve exibi-los.
    Aqui buscamos projetos com usuario_id do usuário, criamos o vínculo como administrador
    quando ele ainda não existe e mantemos o fluxo atual funcionando.
  */
  const { data: projetosAntigos, error: erroProjetosAntigos } = await cliente
    .from(REPERTORIO_FACIL.tabelas.projetos)
    .select("*")
    .eq("usuario_id", usuario.id)
    .order("created_at", { ascending: false });

  if (!erroProjetosAntigos && Array.isArray(projetosAntigos)) {
    for (const projetoAntigo of projetosAntigos) {
      const jaListado = projetos.some(function(projeto) {
        return projeto.id === projetoAntigo.id;
      });

      if (!jaListado) {
        await garantirParticipanteAdministrador(projetoAntigo, usuario);
        projetos.push({
          ...projetoAntigo,
          papel_usuario: "administrador"
        });
      }
    }
  }

  if (erroProjetosAntigos && error) {
    grid.innerHTML = `
      <div class="card-projeto">
        <h3>Erro ao carregar</h3>
        <p>${escaparHtml(error.message)}</p>
      </div>
    `;
    return;
  }

  await preencherResumoProjetos(projetos);
  appState.participantesProjetos = projetos;
  montarListaProjetos(projetos);
}

async function garantirParticipanteAdministrador(projeto, usuario) {
  const cliente = sb();

  if (!cliente || !projeto?.id || !usuario?.id) {
    return;
  }

  const { data: existente } = await cliente
    .from(REPERTORIO_FACIL.tabelas.projetoParticipantes)
    .select("id")
    .eq("projeto_id", projeto.id)
    .eq("usuario_id", usuario.id)
    .maybeSingle();

  if (existente && existente.id) {
    return;
  }

  const { error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.projetoParticipantes)
    .insert({
      projeto_id: projeto.id,
      usuario_id: usuario.id,
      email: usuario.email || "",
      nome: obterNomeUsuario(usuario),
      papel: "administrador",
      status: "ativo"
    });

  if (error) {
    console.warn("Não foi possível criar vínculo do projeto antigo:", error.message);
  }
}

async function contarTabelaProjeto(tabela, projetoId) {
  const cliente = sb();

  if (!cliente || !projetoId) {
    return 0;
  }

  const { count, error } = await cliente
    .from(tabela)
    .select("id", { count: "exact", head: true })
    .eq("projeto_id", projetoId);

  if (error) {
    console.warn("Erro ao contar", tabela, error.message);
    return 0;
  }

  return count || 0;
}

async function preencherResumoProjetos(projetos) {
  if (!Array.isArray(projetos) || projetos.length === 0) {
    return;
  }

  await Promise.all(projetos.map(async function(projeto) {
    const [integrantes, musicas, repertorios, eventos] = await Promise.all([
      contarTabelaProjeto(REPERTORIO_FACIL.tabelas.projetoParticipantes, projeto.id),
      contarTabelaProjeto(REPERTORIO_FACIL.tabelas.musicas, projeto.id),
      contarTabelaProjeto(REPERTORIO_FACIL.tabelas.repertorios, projeto.id),
      contarTabelaProjeto(REPERTORIO_FACIL.tabelas.eventos, projeto.id)
    ]);

    projeto.resumo = {
      integrantes: integrantes,
      musicas: musicas,
      repertorios: repertorios,
      eventos: eventos
    };
  }));
}

function montarListaProjetos(lista) {
  const grid = elemento("lista-projetos") || document.querySelector(".grid-projetos");

  if (!grid) {
    return;
  }

  grid.innerHTML = `
    <div class="card-projeto card-criar" id="novoProjetoCard">
      <div class="icone-mais">+</div>
      <h3>Criar novo projeto</h3>
      <p>Cadastre uma nova banda ou projeto musical.</p>
    </div>
  `;

  if (lista.length === 0) {
    grid.innerHTML += `
      <div class="card-projeto">
        <h3>Nenhum projeto cadastrado</h3>
        <p>Clique em Novo Projeto para criar o primeiro.</p>
      </div>
    `;
  }

  lista.forEach(function(projeto) {
    const papel = projeto.papel_usuario === "administrador" ? "Administrador" : "Integrante";
    const resumo = projeto.resumo || { integrantes: 0, musicas: 0, repertorios: 0, eventos: 0 };
    const localidade = [projeto.cidade, projeto.estado].filter(Boolean).join(" - ");
    const podeExcluir = projeto.papel_usuario === "administrador";

    grid.innerHTML += `
      <div class="card-projeto card-projeto-listado">
        <div class="topo-card-projeto">
          <span class="tag">${escaparHtml(projeto.tipo || "Projeto")}</span>
          <button class="menu-card-projeto" type="button" data-menu-projeto="${escaparHtml(projeto.id)}" aria-label="Ações do projeto">⋮</button>
        </div>

        <h3>${escaparHtml(projeto.nome || "Sem nome")}</h3>
        <p>${escaparHtml(projeto.estilo || "Sem estilo informado")}</p>

        <div class="detalhes detalhes-projeto-card">
          ${localidade ? `<span>${escaparHtml(localidade)}</span>` : ""}
          <span class="papel-projeto">${escaparHtml(papel)}</span>
        </div>

        <div class="resumo-projeto-card" aria-label="Resumo do projeto">
          <span title="Participantes">👥 ${resumo.integrantes}</span>
          <span title="Músicas">🎵 ${resumo.musicas}</span>
          <span title="Repertórios">📋 ${resumo.repertorios}</span>
          <span title="Eventos">📅 ${resumo.eventos}</span>
        </div>

        <div class="acoes-projeto-card" id="acoes-projeto-${escaparHtml(projeto.id)}">
          <button type="button" data-sair-projeto="${escaparHtml(projeto.id)}">Sair do projeto</button>
          ${podeExcluir ? `<button type="button" class="acao-perigo" data-excluir-projeto="${escaparHtml(projeto.id)}">Excluir projeto</button>` : ""}
        </div>

        <button class="botao-card abrir-projeto" type="button" data-id="${escaparHtml(projeto.id)}">
          Acessar projeto
        </button>
      </div>
    `;
  });

  const cardNovo = elemento("novoProjetoCard");

  if (cardNovo) {
    cardNovo.addEventListener("click", function() {
      mostrarTela("tela-novo-projeto");
    });
  }

  document.querySelectorAll(".abrir-projeto").forEach(function(botao) {
    botao.addEventListener("click", function() {
      acessarProjeto(botao.dataset.id);
    });
  });

  document.querySelectorAll("[data-menu-projeto]").forEach(function(botao) {
    botao.addEventListener("click", function(evento) {
      evento.stopPropagation();
      alternarMenuProjeto(botao.dataset.menuProjeto);
    });
  });

  document.querySelectorAll("[data-sair-projeto]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      sairDoProjeto(botao.dataset.sairProjeto);
    });
  });

  document.querySelectorAll("[data-excluir-projeto]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      excluirProjetoCompleto(botao.dataset.excluirProjeto);
    });
  });
}

function alternarMenuProjeto(projetoId) {
  document.querySelectorAll(".acoes-projeto-card").forEach(function(menu) {
    if (menu.id !== "acoes-projeto-" + projetoId) {
      menu.classList.remove("ativo");
    }
  });

  const menu = elemento("acoes-projeto-" + projetoId);

  if (menu) {
    menu.classList.toggle("ativo");
  }
}

function obterProjetoDaLista(id) {
  return (appState.participantesProjetos || []).find(function(projeto) {
    return projeto.id === id;
  });
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

  const { error: erroParticipante } = await cliente
    .from(REPERTORIO_FACIL.tabelas.projetoParticipantes)
    .insert({
      projeto_id: data.id,
      usuario_id: usuario.id,
      email: usuario.email || "",
      nome: obterNomeUsuario(usuario),
      papel: "administrador",
      status: "ativo"
    });

  if (erroParticipante) {
    alert("Projeto criado, mas houve erro ao vincular o administrador: " + erroParticipante.message);
  }

  limparCampos(elemento("tela-novo-projeto"));
  salvarProjetoAtual({ ...data, papel_usuario: "administrador" }, "administrador");
  mostrarTela("tela-projetos");
}

async function acessarProjeto(id) {
  const cliente = sb();

  if (!cliente || !id) {
    return;
  }

  const { data: sessionData } = await cliente.auth.getSession();
  const usuario = sessionData.session?.user;

  if (!usuario) {
    mostrarTela("tela-login", { registrar: false });
    return;
  }

  const { data, error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.projetoParticipantes)
    .select("papel, status, projetos(*)")
    .eq("projeto_id", id)
    .eq("usuario_id", usuario.id)
    .eq("status", "ativo")
    .maybeSingle();

  if (!error && data && data.projetos) {
    salvarProjetoAtual({ ...data.projetos, papel_usuario: data.papel }, data.papel);
    abrirPainelProjeto();
    return;
  }

  /* Compatibilidade com projetos criados antes da arquitetura colaborativa. */
  const { data: projetoAntigo, error: erroProjetoAntigo } = await cliente
    .from(REPERTORIO_FACIL.tabelas.projetos)
    .select("*")
    .eq("id", id)
    .eq("usuario_id", usuario.id)
    .maybeSingle();

  if (!erroProjetoAntigo && projetoAntigo) {
    await garantirParticipanteAdministrador(projetoAntigo, usuario);
    salvarProjetoAtual({ ...projetoAntigo, papel_usuario: "administrador" }, "administrador");
    abrirPainelProjeto();
    return;
  }

  alert("Você não possui acesso ativo a este projeto.");
  localStorage.removeItem("projeto_atual");
  carregarProjetos();
}

function abrirPainelProjeto() {
  garantirTelasInternas();
  mostrarTela("tela-painel-projeto");
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
    const papel = appState.papelProjetoAtual === "administrador" ? "Administrador" : "Integrante";

    subtitulo.textContent = estilo + (cidade ? " • " + cidade + estado : "") + " • " + papel;
  }
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
          <img src="logo.png" alt="Repertório Fácil" />
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

      <section id="area-modulo" class="grid-projetos" style="margin-top:24px;"></section>

      <nav class="menu-inferior">
        <button id="menu-projeto-inicio" class="ativo" type="button">Início</button>
        <button type="button" data-modulo="integrantes">Integrantes</button>
        <button type="button" data-modulo="musicas">Músicas</button>
        <button type="button" data-modulo="repertorios">Repertórios</button>
        <button type="button" data-modulo="eventos">Eventos</button>
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
      mostrarTela("tela-projetos");
    });
  }

  document.querySelectorAll("#tela-painel-projeto [data-modulo]").forEach(function(botao) {
    if (botao.dataset.configurado) {
      return;
    }

    botao.dataset.configurado = "true";
    botao.addEventListener("click", function() {
      abrirModulo(botao.dataset.modulo);
    });
  });

  const menuInicio = elemento("menu-projeto-inicio");

  if (menuInicio && !menuInicio.dataset.configurado) {
    menuInicio.dataset.configurado = "true";
    menuInicio.addEventListener("click", function() {
      limparAreaModulo();

      document.querySelectorAll("#tela-painel-projeto .menu-inferior button").forEach(function(botao) {
        botao.classList.remove("ativo");
      });

      menuInicio.classList.add("ativo");
    });
  }
}

function definirMenuModulo(modulo) {
  document.querySelectorAll("#tela-painel-projeto .menu-inferior button").forEach(function(botao) {
    botao.classList.remove("ativo");
  });

  const botao = document.querySelector(
    "#tela-painel-projeto .menu-inferior button[data-modulo='" + modulo + "']"
  );

  if (botao) {
    botao.classList.add("ativo");
  }
}

function limparAreaModulo() {
  const area = elemento("area-modulo");

  if (area) {
    area.innerHTML = "";
  }
}

function abrirModulo(modulo) {
  if (!appState.projetoAtual) {
    alert("Abra um projeto primeiro.");
    mostrarTela("tela-projetos");
    return;
  }

  definirMenuModulo(modulo);

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
        gap: 6px;
        font-size: 13px;
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
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 4px;
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
        font-size: 17px;
      }

      .dados-integrante p {
        margin: 3px 0;
        font-size: 13px;
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
        border-radius: 10px;
        padding: 8px 10px;
        cursor: pointer;
        font-weight: 700;
      }

      .btn-editar-integrante {
        background: #e5e7eb;
        color: #111827;
      }

      .btn-excluir-integrante {
        background: #fee2e2;
        color: #991b1b;
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

          <label>
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

          <div class="acoes-integrante">
            <button class="botao-card" id="btn-salvar-integrante" type="button">Salvar integrante</button>
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

function configurarEventosIntegrantes() {
  const botaoSalvar = elemento("btn-salvar-integrante");
  const botaoCancelar = elemento("btn-cancelar-integrante");
  const busca = elemento("busca-integrantes");
  const ordenar = elemento("ordenar-integrantes");

  if (botaoSalvar) {
    botaoSalvar.addEventListener("click", salvarIntegrante);
  }

  if (botaoCancelar) {
    botaoCancelar.addEventListener("click", limparFormularioIntegrante);
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

  const { data, error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.integrantes)
    .select("*")
    .eq("projeto_id", projetoId)
    .order("nome", { ascending: true });

  if (error) {
    lista.innerHTML = `<p>Erro ao carregar integrantes: ${escaparHtml(error.message)}</p>`;
    return;
  }

  appState.integrantes = data || [];
  renderizarListaIntegrantes();
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
    const inicial = escaparHtml((item.nome || "?").trim().charAt(0).toUpperCase() || "?");

    return `
      <div class="item-integrante">
        <div class="item-integrante-topo">
          <div class="foto-integrante-placeholder">${inicial}</div>

          <div class="dados-integrante">
            <h4>${escaparHtml(item.nome || "Sem nome")}</h4>
            <p><strong>Função:</strong> ${escaparHtml(item.funcao || "Não informada")}</p>
            <p><strong>Instrumento:</strong> ${escaparHtml(item.instrumento || "Não informado")}</p>
            <p><strong>E-mail:</strong> ${escaparHtml(item.email || "Não informado")}</p>
            <p><strong>Telefone:</strong> ${escaparHtml(item.telefone || "Não informado")}</p>
            ${item.administrador ? `<span class="tag-admin">Administrador</span>` : `<span class="tag-integrante">Integrante</span>`}
          </div>

          <div class="botoes-item-integrante">
            <button class="btn-editar-integrante" type="button" data-editar-integrante="${escaparHtml(item.id)}">Editar</button>
            <button class="btn-excluir-integrante" type="button" data-excluir-integrante="${escaparHtml(item.id)}">Excluir</button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  lista.querySelectorAll("[data-editar-integrante]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      editarIntegrante(botao.dataset.editarIntegrante);
    });
  });

  lista.querySelectorAll("[data-excluir-integrante]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      excluirIntegrante(botao.dataset.excluirIntegrante);
    });
  });
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
    telefone: limparTexto(elemento("integrante-telefone")?.value)
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
    "integrante-telefone"
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
    botaoSalvar.textContent = "Salvar integrante";
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

  const payload = {
    projeto_id: projetoId,
    usuario_id: usuario.id,
    nome: dados.nome,
    funcao: dados.funcao,
    instrumento: dados.instrumento,
    administrador: dados.administrador,
    email: dados.email,
    telefone: dados.telefone
  };

  let resultado;

  if (appState.integranteEditandoId) {
    resultado = await cliente
      .from(REPERTORIO_FACIL.tabelas.integrantes)
      .update(payload)
      .eq("id", appState.integranteEditandoId)
      .eq("projeto_id", projetoId)
      .eq("usuario_id", usuario.id);
  } else {
    resultado = await cliente
      .from(REPERTORIO_FACIL.tabelas.integrantes)
      .insert(payload);
  }

  if (resultado.error) {
    alert("Erro ao salvar integrante: " + resultado.error.message);
    return;
  }

  limparFormularioIntegrante();
  await buscarIntegrantes();
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
    .eq("projeto_id", projetoId)
    .eq("usuario_id", usuario.id);

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
        grid-template-columns: minmax(280px, 380px) 1fr;
        gap: 18px;
        width: 100%;
      }

      .form-musicas {
        display: grid;
        gap: 10px;
      }

      .form-musicas label,
      .filtros-musicas label {
        display: grid;
        gap: 6px;
        font-size: 13px;
        color: #e5e7eb;
      }

      .form-musicas input,
      .filtros-musicas input,
      .filtros-musicas select {
        width: 100%;
      }

      .linha-form-musicas {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }

      .acoes-musica {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 4px;
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

      .btn-editar-musica {
        background: #e5e7eb;
        color: #111827;
      }

      .btn-excluir-musica {
        background: #fee2e2;
        color: #991b1b;
      }

      @media (max-width: 820px) {
        .modulo-musicas,
        .linha-form-musicas,
        .filtros-musicas {
          grid-template-columns: 1fr;
        }

        .item-musica-topo {
          flex-direction: column;
        }

        .botoes-item-musica {
          justify-content: flex-start;
        }
      }
    </style>

    <div class="modulo-musicas">
      <div class="card-projeto">
        <span class="tag">Cadastro</span>
        <h3 id="titulo-form-musica">Nova música</h3>
        <p>Cadastre músicas para montar repertórios.</p>

        <div class="form-musicas">
          <label>
            Nome da música
            <input id="musica-nome" type="text" placeholder="Nome da música" />
          </label>

          <label>
            Artista / Banda
            <input id="musica-artista" type="text" placeholder="Artista / banda" />
          </label>

          <div class="linha-form-musicas">
            <label>
              Tom
              <input id="musica-tom" type="text" placeholder="Ex: Mi menor (Em)" />
            </label>

            <label>
              BPM
              <input id="musica-bpm" type="text" placeholder="Ex: 96" />
            </label>
          </div>

          <div class="acoes-musica">
            <button class="botao-card" id="btn-salvar-musica" type="button">Salvar música</button>
            <button class="botao-secundario-modulo" id="btn-cancelar-musica" type="button" style="display:none;">Cancelar edição</button>
          </div>
        </div>
      </div>

      <div class="card-projeto">
        <span class="tag">Lista</span>
        <h3>Músicas cadastradas</h3>
        <p>Pesquise, edite ou exclua músicas deste projeto.</p>

        <div class="filtros-musicas">
          <label>
            Pesquisar
            <input id="busca-musicas" type="text" placeholder="Buscar por nome, artista ou tom" />
          </label>
        </div>

        <div id="lista-musicas" class="lista-musicas">
          <p>Carregando músicas...</p>
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

  if (botaoSalvar) {
    botaoSalvar.addEventListener("click", salvarMusica);
  }

  if (botaoCancelar) {
    botaoCancelar.addEventListener("click", limparFormularioMusica);
  }

  if (busca) {
    busca.addEventListener("input", renderizarListaMusicas);
  }
}

async function buscarMusicas() {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();
  const lista = elemento("lista-musicas");

  if (!cliente || !projetoId || !lista) {
    return;
  }

  const { data, error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.musicas)
    .select("*")
    .eq("projeto_id", projetoId)
    .order("created_at", { ascending: false });

  if (error) {
    lista.innerHTML = `<p>Erro ao carregar músicas: ${escaparHtml(error.message)}</p>`;
    return;
  }

  appState.musicas = data || [];
  renderizarListaMusicas();
}

function renderizarListaMusicas() {
  const lista = elemento("lista-musicas");
  const busca = limparTexto(elemento("busca-musicas")?.value).toLowerCase();

  if (!lista) {
    return;
  }

  let itens = [...(appState.musicas || [])];

  if (busca) {
    itens = itens.filter(function(item) {
      const texto = [item.nome, item.artista, item.tom, item.bpm].join(" ").toLowerCase();
      return texto.includes(busca);
    });
  }

  if (itens.length === 0) {
    lista.innerHTML = `<p>Nenhuma música encontrada.</p>`;
    return;
  }

  lista.innerHTML = itens.map(function(item) {
    return `
      <div class="item-musica">
        <div class="item-musica-topo">
          <div class="icone-musica-placeholder">♪</div>

          <div class="dados-musica">
            <h4>${escaparHtml(item.nome || "Sem nome")}</h4>
            <p><strong>Artista:</strong> ${escaparHtml(item.artista || "Não informado")}</p>
            <p><strong>Tom:</strong> ${escaparHtml(item.tom || "Não informado")}</p>
            <p><strong>BPM:</strong> ${escaparHtml(item.bpm || "Não informado")}</p>
          </div>

          <div class="botoes-item-musica">
            <button class="btn-editar-musica" type="button" data-editar-musica="${escaparHtml(item.id)}">Editar</button>
            <button class="btn-excluir-musica" type="button" data-excluir-musica="${escaparHtml(item.id)}">Excluir</button>
          </div>
        </div>
      </div>
    `;
  }).join("");

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
}

function obterDadosFormularioMusica() {
  return {
    nome: limparTexto(elemento("musica-nome")?.value),
    artista: limparTexto(elemento("musica-artista")?.value),
    tom: limparTexto(elemento("musica-tom")?.value),
    bpm: limparTexto(elemento("musica-bpm")?.value)
  };
}

function preencherFormularioMusica(item) {
  if (!item) {
    return;
  }

  elemento("musica-nome").value = item.nome || "";
  elemento("musica-artista").value = item.artista || "";
  elemento("musica-tom").value = item.tom || "";
  elemento("musica-bpm").value = item.bpm || "";

  const titulo = elemento("titulo-form-musica");
  const botaoSalvar = elemento("btn-salvar-musica");
  const botaoCancelar = elemento("btn-cancelar-musica");

  if (titulo) {
    titulo.textContent = "Editar música";
  }

  if (botaoSalvar) {
    botaoSalvar.textContent = "Salvar alterações";
    botaoSalvar.style.display = "none";
  }

  if (botaoCompartilhar) {
    botaoCompartilhar.style.display = "none";
  }

  if (botaoGerarPdf) {
    botaoGerarPdf.style.display = "none";
  }

  if (botaoCancelar) {
    botaoCancelar.style.display = "none";
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function limparFormularioMusica() {
  appState.musicaEditandoId = null;

  ["musica-nome", "musica-artista", "musica-tom", "musica-bpm"].forEach(function(id) {
    const campo = elemento(id);
    if (campo) {
      campo.value = "";
    }
  });

  const titulo = elemento("titulo-form-musica");
  const botaoSalvar = elemento("btn-salvar-musica");
  const botaoCancelar = elemento("btn-cancelar-musica");

  if (titulo) {
    titulo.textContent = "Nova música";
  }

  if (botaoSalvar) {
    botaoSalvar.textContent = "Salvar música";
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

  if (!dados.nome) {
    alert("Informe o nome da música.");
    return;
  }

  const payload = {
    projeto_id: projetoId,
    nome: dados.nome,
    artista: dados.artista,
    tom: dados.tom,
    bpm: Number.isFinite(bpmNumero) ? bpmNumero : null
  };

  let resultado;

  if (appState.musicaEditandoId) {
    resultado = await cliente
      .from(REPERTORIO_FACIL.tabelas.musicas)
      .update(payload)
      .eq("id", appState.musicaEditandoId)
      .eq("projeto_id", projetoId);
  } else {
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
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 4px;
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
      }

      .btn-editar-repertorio,
      .btn-montar-repertorio,
      .btn-gerar-pdf-repertorio,
      .btn-compartilhar-repertorio,
      .btn-mover-repertorio,
      .btn-subir-musica,
      .btn-descer-musica,
      .btn-adicionar-musica-repertorio {
        background: #e5e7eb;
        color: #111827;
      }

      .btn-excluir-repertorio,
      .btn-remover-musica-repertorio {
        background: #fee2e2;
        color: #991b1b;
      }

      .montagem-repertorio {
        margin-top: 18px;
        padding-top: 16px;
        border-top: 1px solid rgba(255,255,255,.12);
      }

      .montagem-repertorio-grid {
        display: grid;
        grid-template-columns: minmax(280px, 1fr) minmax(280px, 1.2fr);
        gap: 18px;
      }

      .titulo-montagem-repertorio {
        margin-bottom: 14px;
      }

      .titulo-montagem-repertorio h3 {
        margin-bottom: 6px;
      }

      @media (max-width: 820px) {
        .modulo-repertorios,
        .montagem-repertorio-grid,
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
    </style>

    <div class="modulo-repertorios">
      <div class="card-projeto">
        <span class="tag">Cadastro</span>
        <h3 id="titulo-form-repertorio">Novo repertório</h3>
        <p>Crie uma lista para show, ensaio ou evento.</p>

        <div class="form-repertorios">
          <label>
            Nome do repertório
            <input id="repertorio-nome" type="text" placeholder="Ex: Cicranos Rock 2026" />
          </label>

          <label>
            Observações
            <textarea id="repertorio-observacoes" placeholder="Ex: Repertório usado no ano de 2026"></textarea>
          </label>

          <div class="acoes-repertorio">
            <button class="botao-card" id="btn-salvar-repertorio" type="button">Salvar repertório</button>
            <button class="botao-secundario-modulo btn-compartilhar-repertorio" id="btn-compartilhar-repertorio" type="button" style="display:none;">Compartilhar</button>
            <button class="botao-secundario-modulo btn-gerar-pdf-repertorio" id="btn-gerar-pdf-repertorio" type="button" style="display:none;">PDF</button>
            <button class="botao-secundario-modulo" id="btn-cancelar-repertorio" type="button" style="display:none;">Cancelar edição</button>
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

  if (error) {
    lista.innerHTML = `<p>Erro ao carregar repertórios: ${escaparHtml(error.message)}</p>`;
    return;
  }

  appState.repertorios = data || [];
  renderizarListaRepertorios();
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
    return `
      <div class="item-repertorio">
        <div class="item-repertorio-topo">
          <div class="item-repertorio-conteudo">
            <div class="icone-repertorio-placeholder">R</div>
            <div class="dados-repertorio">
              <h4>${escaparHtml(item.nome || "Sem nome")}</h4>
              <p>${escaparHtml(item.observacoes || "Sem observações")}</p>
            </div>
          </div>

          <div class="botoes-item-repertorio">
            <button class="btn-editar-repertorio" type="button" data-editar-repertorio="${escaparHtml(item.id)}">Editar</button>
            <button class="btn-compartilhar-repertorio" type="button" data-compartilhar-repertorio="${escaparHtml(item.id)}">Compartilhar</button>
            <button class="btn-excluir-repertorio" type="button" data-excluir-repertorio="${escaparHtml(item.id)}">Excluir</button>
          </div>
        </div>
      </div>
    `;
  }).join("");

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

  lista.querySelectorAll("[data-excluir-repertorio]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      excluirRepertorio(botao.dataset.excluirRepertorio);
    });
  });
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
    botaoSalvar.textContent = "Salvar alterações";
    botaoSalvar.style.display = "none";
  }

  if (botaoCompartilhar) {
    botaoCompartilhar.style.display = "none";
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
    cardForm.style.gridColumn = "1 / -1";
  }

  if (cardLista) {
    cardLista.style.display = "none";
  }

  if (cardForm) {
    cardForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function limparFormularioRepertorio() {
  appState.repertorioEditandoId = null;

  const campoNome = elemento("repertorio-nome");
  const campoObservacoes = elemento("repertorio-observacoes");
  const titulo = elemento("titulo-form-repertorio");
  const botaoSalvar = elemento("btn-salvar-repertorio");
  const botaoCompartilhar = elemento("btn-compartilhar-repertorio");
  const botaoGerarPdf = elemento("btn-gerar-pdf-repertorio");
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
    botaoSalvar.textContent = "Salvar repertório";
    botaoSalvar.style.display = "inline-block";
  }

  if (botaoCompartilhar) {
    botaoCompartilhar.style.display = "none";
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

  fecharMontagemRepertorio();
}

async function salvarRepertorio() {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();

  if (!cliente || !projetoId) {
    return;
  }

  const nome = limparTexto(elemento("repertorio-nome")?.value);
  const observacoes = limparTexto(elemento("repertorio-observacoes")?.value);

  if (!nome) {
    alert("Informe o nome do repertório.");
    return;
  }

  const payload = {
    projeto_id: projetoId,
    nome: nome,
    observacoes: observacoes
  };

  let resultado;

  if (appState.repertorioEditandoId) {
    resultado = await cliente
      .from(REPERTORIO_FACIL.tabelas.repertorios)
      .update(payload)
      .eq("id", appState.repertorioEditandoId)
      .eq("projeto_id", projetoId);
  } else {
    resultado = await cliente
      .from(REPERTORIO_FACIL.tabelas.repertorios)
      .insert(payload);
  }

  if (resultado.error) {
    alert("Erro ao salvar repertório: " + resultado.error.message);
    return;
  }

  limparFormularioRepertorio();
  await buscarRepertorios();
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
  return (appState.repertorios || []).find(function(repertorio) {
    return repertorio.id === appState.repertorioMontandoId;
  });
}

async function montarRepertorio(id) {
  appState.repertorioMontandoId = id;
  await carregarDadosMontagemRepertorio();
  renderizarMontagemRepertorio();

  const montagem = elemento("montagem-repertorio");
  if (montagem) {
    montagem.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

async function carregarDadosMontagemRepertorio() {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();
  const repertorioId = appState.repertorioMontandoId;

  if (!cliente || !projetoId || !repertorioId) {
    return;
  }

  const { data: musicas, error: erroMusicas } = await cliente
    .from(REPERTORIO_FACIL.tabelas.musicas)
    .select("*")
    .eq("projeto_id", projetoId)
    .order("nome", { ascending: true });

  if (erroMusicas) {
    alert("Erro ao carregar músicas: " + erroMusicas.message);
    return;
  }

  const { data: relacoes, error: erroRelacoes } = await cliente
    .from(REPERTORIO_FACIL.tabelas.repertorioMusicas)
    .select("*")
    .eq("repertorio_id", repertorioId)
    .order("ordem", { ascending: true });

  if (erroRelacoes) {
    alert("Erro ao carregar músicas do repertório: " + erroRelacoes.message);
    return;
  }

  appState.musicas = musicas || [];
  appState.repertorioMusicas = (relacoes || []).map(function(relacao) {
    const musica = appState.musicas.find(function(item) {
      return item.id === relacao.musica_id;
    });

    return {
      id: relacao.id,
      repertorio_id: relacao.repertorio_id,
      musica_id: relacao.musica_id,
      ordem: relacao.ordem || 0,
      musica: musica || null
    };
  }).filter(function(item) {
    return item.musica !== null;
  });
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

  const selecionadas = [...(appState.repertorioMusicas || [])].sort(function(a, b) {
    return Number(a.ordem || 0) - Number(b.ordem || 0);
  });

  montagem.innerHTML = `
    <div class="titulo-montagem-repertorio">
      <span class="tag">Músicas do repertório</span>
      <p><strong>${escaparHtml(repertorio.nome || "Repertório")}</strong></p>
      <p>Adicione músicas, altere a ordem e remova músicas deste repertório.</p>
    </div>

    <div class="montagem-repertorio-grid">
      <div>
        <h3>Biblioteca de músicas</h3>
        <div class="filtros-montagem-repertorio">
          <label>
            Pesquisar música
            <input id="busca-musicas-repertorio" type="text" placeholder="Buscar por nome, artista ou tom" value="${escaparHtml(buscaAtual)}" />
          </label>
        </div>
        <div id="lista-biblioteca-musicas" class="lista-biblioteca-musicas">
          ${renderizarBibliotecaMusicasRepertorio(musicasDisponiveis)}
        </div>
      </div>

      <div>
        <h3>Músicas no repertório</h3>
        <p>${selecionadas.length} música(s) selecionada(s).</p>
        <div id="lista-musicas-repertorio" class="lista-musicas-repertorio">
          ${renderizarMusicasSelecionadasRepertorio(selecionadas)}
        </div>
      </div>
    </div>

    <div class="acoes-edicao-repertorio">
      <button class="botao-card" id="btn-salvar-repertorio-edicao" type="button">Salvar alterações</button>
      <button class="botao-secundario-modulo btn-compartilhar-repertorio" id="btn-compartilhar-repertorio-edicao" type="button">Compartilhar</button>
      <button class="botao-secundario-modulo btn-gerar-pdf-repertorio" id="btn-gerar-pdf-repertorio-edicao" type="button">Gerar PDF</button>
      <button class="botao-secundario-modulo" id="btn-cancelar-repertorio-edicao" type="button">Cancelar edição</button>
    </div>
  `;

  configurarEventosMontagemRepertorio();
}

function renderizarBibliotecaMusicasRepertorio(musicas) {
  if (!musicas || musicas.length === 0) {
    return `<p>Nenhuma música disponível para adicionar.</p>`;
  }

  return musicas.map(function(musica) {
    return `
      <div class="item-biblioteca-musica">
        <div class="dados-biblioteca-musica">
          <h4>${escaparHtml(musica.nome || "Sem nome")}</h4>
          <p>${escaparHtml(musica.artista || "Artista não informado")}</p>
          <p>Tom: ${escaparHtml(musica.tom || "Não informado")} ${musica.bpm ? "• BPM: " + escaparHtml(musica.bpm) : ""}</p>
        </div>
        <button class="btn-adicionar-musica-repertorio" type="button" data-adicionar-musica-repertorio="${escaparHtml(musica.id)}">+ Adicionar</button>
      </div>
    `;
  }).join("");
}

function renderizarMusicasSelecionadasRepertorio(itens) {
  if (!itens || itens.length === 0) {
    return `<p>Nenhuma música adicionada ainda.</p>`;
  }

  return itens.map(function(item, indice) {
    const musica = item.musica || {};
    const numero = String(indice + 1).padStart(2, "0");

    return `
      <div class="item-musica-repertorio">
        <div class="item-musica-repertorio-conteudo">
          <div class="numero-musica-repertorio">${numero}</div>
          <div class="dados-musica-repertorio">
            <h4>${escaparHtml(musica.nome || "Sem nome")}</h4>
            <p>${escaparHtml(musica.artista || "Artista não informado")}</p>
            <p>Tom: ${escaparHtml(musica.tom || "Não informado")} ${musica.bpm ? "• BPM: " + escaparHtml(musica.bpm) : ""}</p>
          </div>
        </div>

        <div class="botoes-musica-repertorio">
          <button class="btn-subir-musica" type="button" data-subir-musica-repertorio="${escaparHtml(item.id)}">⬆ Antes</button>
          <button class="btn-descer-musica" type="button" data-descer-musica-repertorio="${escaparHtml(item.id)}">⬇ Depois</button>
          <button class="btn-remover-musica-repertorio" type="button" data-remover-musica-repertorio="${escaparHtml(item.id)}">🗑 Remover</button>
        </div>
      </div>
    `;
  }).join("");
}

function configurarEventosMontagemRepertorio() {
  const busca = elemento("busca-musicas-repertorio");
  const botaoSalvarEdicao = elemento("btn-salvar-repertorio-edicao");
  const botaoCompartilharEdicao = elemento("btn-compartilhar-repertorio-edicao");
  const botaoGerarPdfEdicao = elemento("btn-gerar-pdf-repertorio-edicao");
  const botaoCancelarEdicao = elemento("btn-cancelar-repertorio-edicao");

  if (busca) {
    busca.addEventListener("input", renderizarMontagemRepertorio);
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
}

async function adicionarMusicaAoRepertorio(musicaId) {
  const cliente = sb();
  const repertorioId = appState.repertorioMontandoId;

  if (!cliente || !repertorioId || !musicaId) {
    return;
  }

  const maiorOrdem = (appState.repertorioMusicas || []).reduce(function(maior, item) {
    return Math.max(maior, Number(item.ordem || 0));
  }, 0);

  const { error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.repertorioMusicas)
    .insert({
      repertorio_id: repertorioId,
      musica_id: musicaId,
      ordem: maiorOrdem + 1
    });

  if (error) {
    alert("Erro ao adicionar música ao repertório: " + error.message);
    return;
  }

  await carregarDadosMontagemRepertorio();
  renderizarMontagemRepertorio();
}

async function removerMusicaDoRepertorio(relacaoId) {
  const cliente = sb();

  if (!cliente || !relacaoId) {
    return;
  }

  const confirmar = confirm("Remover esta música do repertório?");

  if (!confirmar) {
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

async function moverMusicaDoRepertorio(relacaoId, direcao) {
  const cliente = sb();

  if (!cliente || !relacaoId) {
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
    .select("id, ordem, musica:musica_id(id, nome, artista, tom, bpm)")
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
  const base = REPERTORIO_FACIL.urlApp || window.location.origin + window.location.pathname;
  const separador = base.includes("?") ? "&" : "?";
  return base + separador + tipo + "=" + encodeURIComponent(id || "");
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

  linhas.push("Repertório Fácil");
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
    });
  }

  linhas.push("");
  linhas.push("Total de músicas: " + itens.length);
  linhas.push("Compartilhado pelo Repertório Fácil");

  return linhas.join("\n");
}

async function compartilharRepertorio(repertorioId) {
  const repertorio = (appState.repertorios || []).find(function(item) {
    return item.id === repertorioId;
  });

  if (!repertorio) {
    alert("Repertório não encontrado.");
    return;
  }

  const texto = await montarTextoCompartilhamentoRepertorio(repertorioId);

  if (!texto) {
    return;
  }

  const url = montarUrlCompartilhavel("repertorio", repertorioId);
  await compartilharConteudo("Repertório - " + (repertorio.nome || "Repertório"), texto, url);
}

function montarTextoCompartilhamentoEvento(evento) {
  const projeto = appState.projetoAtual || {};
  const linhas = [];

  linhas.push("Repertório Fácil");
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
  linhas.push("Compartilhado pelo Repertório Fácil");

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
  const url = montarUrlCompartilhavel("evento", eventoId);
  await compartilharConteudo("Evento - " + (evento.nome || "Evento"), texto, url);
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
        <td>
          <strong>${escaparHtml(musica.nome || "Sem nome")}</strong>
          <span>${escaparHtml(musica.artista || "Artista não informado")}</span>
        </td>
        <td>${escaparHtml(musica.tom || "-")}</td>
        <td>${escaparHtml(musica.bpm || "-")}</td>
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
          width: 52px;
          font-weight: 800;
          color: #6d28d9;
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
        <div class="marca">Repertório Fácil</div>
        <h1>${nomeProjeto}</h1>
        <h2>${nomeRepertorio}</h2>
        <div class="info">
          <div><strong>Data de geração:</strong> ${escaparHtml(dataGeracao)}</div>
          <div><strong>Total de músicas:</strong> ${itens.length}</div>
        </div>
      </section>

      ${observacoes ? `<div class="observacoes"><strong>Observações:</strong><br>${observacoes}</div>` : ""}

      <table>
        <thead>
          <tr>
            <th>Nº</th>
            <th>Música</th>
            <th>Tom</th>
            <th>BPM</th>
          </tr>
        </thead>
        <tbody>
          ${linhas}
        </tbody>
      </table>

      <div class="rodape">
        <span>Gerado pelo Repertório Fácil</span>
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

      .form-eventos,
      .filtros-eventos {
        display: grid;
        gap: 10px;
      }

      .form-eventos label,
      .filtros-eventos label {
        display: grid;
        gap: 6px;
        font-size: 13px;
        color: #e5e7eb;
      }

      .form-eventos input,
      .form-eventos select,
      .form-eventos textarea,
      .filtros-eventos input,
      .filtros-eventos select {
        width: 100%;
      }

      .form-eventos textarea {
        min-height: 92px;
        resize: vertical;
      }

      .linha-form-eventos {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }

      .acoes-evento {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 4px;
      }

      .lista-eventos {
        display: grid;
        gap: 10px;
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
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .botoes-item-evento button {
        border: 0;
        border-radius: 10px;
        padding: 8px 10px;
        cursor: pointer;
        font-weight: 700;
      }

      .btn-editar-evento,
      .btn-compartilhar-evento {
        background: #e5e7eb;
        color: #111827;
      }

      .btn-excluir-evento {
        background: #fee2e2;
        color: #991b1b;
      }

      @media (max-width: 820px) {
        .modulo-eventos,
        .linha-form-eventos,
        .filtros-eventos,
        .item-evento-topo {
          grid-template-columns: 1fr;
          flex-direction: column;
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
            <input id="evento-nome" type="text" placeholder="Ex: Festa Pinga Óleo MC" />
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
            <input id="evento-local" type="text" placeholder="Ex: Águias do Sol MC" />
          </label>

          <div class="linha-form-eventos">
            <label>
              Cidade
              <input id="evento-cidade" type="text" placeholder="Ex: Diadema" />
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
            <textarea id="evento-observacoes" placeholder="Ex: Chegar às 18h para passagem de som"></textarea>
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
            <button class="btn-editar-evento" type="button" data-editar-evento="${escaparHtml(item.id)}">Editar</button>
            <button class="btn-compartilhar-evento" type="button" data-compartilhar-evento="${escaparHtml(item.id)}">Compartilhar</button>
            <button class="btn-excluir-evento" type="button" data-excluir-evento="${escaparHtml(item.id)}">Excluir</button>
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

  if (titulo) {
    titulo.textContent = "Editar evento";
  }

  if (botaoSalvar) {
    botaoSalvar.textContent = "Salvar alterações";
    botaoSalvar.style.display = "none";
  }

  if (botaoCompartilhar) {
    botaoCompartilhar.style.display = "none";
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

  const payload = {
    projeto_id: projetoId,
    usuario_id: usuario.id,
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
      .update(payload)
      .eq("id", appState.eventoEditandoId)
      .eq("projeto_id", projetoId)
      .eq("usuario_id", usuario.id);
  } else {
    resultado = await cliente
      .from(REPERTORIO_FACIL.tabelas.eventos)
      .insert(payload);
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
    .eq("projeto_id", projetoId)
    .eq("usuario_id", usuario.id);

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


async function sairDoProjeto(projetoId) {
  const cliente = sb();
  const projeto = obterProjetoDaLista(projetoId);

  if (!cliente || !projetoId || !projeto) {
    return;
  }

  const confirmar = confirm(
    "Sair do projeto \"" + (projeto.nome || "Projeto") + "\"?\n\n" +
    "Você perderá acesso a este projeto, mas os dados continuarão disponíveis para os demais participantes."
  );

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
    .from(REPERTORIO_FACIL.tabelas.projetoParticipantes)
    .update({ status: "saiu" })
    .eq("projeto_id", projetoId)
    .eq("usuario_id", usuario.id);

  if (error) {
    alert("Erro ao sair do projeto: " + error.message);
    return;
  }

  if (obterProjetoAtualId() === projetoId) {
    salvarProjetoAtual(null);
  }

  await carregarProjetos();
}

async function excluirProjetoCompleto(projetoId) {
  const cliente = sb();
  const projeto = obterProjetoDaLista(projetoId);

  if (!cliente || !projetoId || !projeto) {
    return;
  }

  if (projeto.papel_usuario !== "administrador") {
    alert("Apenas administradores podem excluir o projeto.");
    return;
  }

  const digitado = prompt(
    "Para excluir definitivamente este projeto, digite exatamente o nome:\n\n" +
    (projeto.nome || "Projeto")
  );

  if (digitado !== projeto.nome) {
    alert("Exclusão cancelada. O nome digitado não confere.");
    return;
  }

  const { data: sessionData } = await cliente.auth.getSession();
  const usuario = sessionData.session?.user;

  if (!usuario) {
    mostrarTela("tela-login", { registrar: false });
    return;
  }

  const { data: participante, error: erroPermissao } = await cliente
    .from(REPERTORIO_FACIL.tabelas.projetoParticipantes)
    .select("papel")
    .eq("projeto_id", projetoId)
    .eq("usuario_id", usuario.id)
    .eq("status", "ativo")
    .single();

  if (erroPermissao || participante?.papel !== "administrador") {
    alert("Não foi possível confirmar sua permissão de administrador.");
    return;
  }

  await cliente.from(REPERTORIO_FACIL.tabelas.repertorioMusicas).delete().eq("projeto_id", projetoId);
  await cliente.from(REPERTORIO_FACIL.tabelas.eventos).delete().eq("projeto_id", projetoId);
  await cliente.from(REPERTORIO_FACIL.tabelas.repertorios).delete().eq("projeto_id", projetoId);
  await cliente.from(REPERTORIO_FACIL.tabelas.musicas).delete().eq("projeto_id", projetoId);
  await cliente.from(REPERTORIO_FACIL.tabelas.integrantes).delete().eq("projeto_id", projetoId);
  await cliente.from(REPERTORIO_FACIL.tabelas.projetoParticipantes).delete().eq("projeto_id", projetoId);

  const { error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.projetos)
    .delete()
    .eq("id", projetoId);

  if (error) {
    alert("Erro ao excluir projeto: " + error.message);
    return;
  }

  if (obterProjetoAtualId() === projetoId) {
    salvarProjetoAtual(null);
  }

  await carregarProjetos();
}

async function restaurarProjetoAtual() {
  const id = obterProjetoAtualId();

  if (!id) {
    return;
  }

  const cliente = sb();

  if (!cliente) {
    return;
  }

  const { data: sessionData } = await cliente.auth.getSession();
  const usuario = sessionData.session?.user;

  if (!usuario) {
    localStorage.removeItem("projeto_atual");
    return;
  }

  const { data, error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.projetoParticipantes)
    .select("papel, status, projetos(*)")
    .eq("projeto_id", id)
    .eq("usuario_id", usuario.id)
    .eq("status", "ativo")
    .maybeSingle();

  if (!error && data && data.projetos) {
    salvarProjetoAtual({ ...data.projetos, papel_usuario: data.papel }, data.papel);
    return;
  }

  const { data: projetoAntigo, error: erroProjetoAntigo } = await cliente
    .from(REPERTORIO_FACIL.tabelas.projetos)
    .select("*")
    .eq("id", id)
    .eq("usuario_id", usuario.id)
    .maybeSingle();

  if (!erroProjetoAntigo && projetoAntigo) {
    await garantirParticipanteAdministrador(projetoAntigo, usuario);
    salvarProjetoAtual({ ...projetoAntigo, papel_usuario: "administrador" }, "administrador");
    return;
  }

  localStorage.removeItem("projeto_atual");
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

  const botaoComecarBoasVindas = elemento("btn-comecar-boas-vindas");

  if (botaoComecarBoasVindas) {
    botaoComecarBoasVindas.addEventListener("click", concluirBoasVindas);
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

  cliente.auth.onAuthStateChange(function(event, session) {
    if (session && session.user) {
      appState.sessao = session;
      appState.usuario = session.user;

      preencherUsuario(session.user);

      if (
        appState.telaAtual === "tela-login" ||
        appState.telaAtual === "tela-cadastro" ||
        appState.telaAtual === "tela-boas-vindas"
      ) {
        abrirTelaInicialAutenticada(session.user, { registrar: false });
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


function prepararAplicacao() {
  configurarBotoesFixos();
  configurarEnterNosCampos();
  configurarAuthListener();
  configurarNavegacaoEnterGlobal();
}

document.addEventListener("DOMContentLoaded", async function() {
  prepararAplicacao();

  await verificarSessao();
  await restaurarProjetoAtual();
});