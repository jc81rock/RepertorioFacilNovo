"use strict";

const REPERTORIO_FACIL = {
  urlApp: "https://jc81rock.github.io/RepertorioFacilNovo/",
  tabelas: {
    projetos: "projetos",
    integrantes: "integrantes",
    musicas: "musicas",
    repertorios: "repertorios",
    repertorioMusicas: "repertorio_musicas",
    eventos: "eventos"
  }
};

let appState = {
  usuario: null,
  sessao: null,
  telaAtual: "tela-login",
  historico: [],
  projetoAtual: null,
  musicas: [],
  musicaEditandoId: null
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

function salvarProjetoAtual(projeto) {
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
  mostrarTela("tela-projetos", { registrar: false });
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

  const { data, error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.projetos)
    .select("*")
    .eq("usuario_id", usuario.id)
    .order("created_at", { ascending: false });

  if (error) {
    grid.innerHTML = `
      <div class="card-projeto">
        <h3>Erro ao carregar</h3>
        <p>${escaparHtml(error.message)}</p>
      </div>
    `;
    return;
  }

  montarListaProjetos(data || []);
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
    grid.innerHTML += `
      <div class="card-projeto">
        <span class="tag">${escaparHtml(projeto.tipo || "Projeto")}</span>
        <h3>${escaparHtml(projeto.nome || "Sem nome")}</h3>
        <p>${escaparHtml(projeto.estilo || "Sem estilo informado")}</p>

        <div class="detalhes">
          <span>
            ${escaparHtml(projeto.cidade || "")}
            ${projeto.estado ? " - " + escaparHtml(projeto.estado) : ""}
          </span>
          <span>Projeto cadastrado</span>
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

      <section class="grid-projetos">
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

  if (modulo === "integrantes") {
    carregarIntegrantes();
    return;
  }

  if (modulo === "musicas") {
    carregarMusicas();
    return;
  }

  if (modulo === "repertorios") {
    carregarRepertorios();
    return;
  }

  if (modulo === "eventos") {
    carregarEventos();
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
  const projetoId = obterProjetoAtualId();

  limparAreaModulo();

  montarFormularioModulo(
    "Novo integrante",
    "Cadastre um músico ou administrador do projeto.",
    [
      { id: "integrante-nome", placeholder: "Nome do integrante" },
      { id: "integrante-funcao", placeholder: "Função" },
      { id: "integrante-email", placeholder: "E-mail", tipo: "email" }
    ],
    "Salvar integrante",
    criarIntegrante
  );

  const cliente = sb();

  const { data, error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.integrantes)
    .select("*")
    .eq("projeto_id", projetoId)
    .order("created_at", { ascending: false });

  if (error) {
    montarListaModulo("Integrantes cadastrados", [], function() {
      return "";
    });
    return;
  }

  montarListaModulo("Integrantes cadastrados", data || [], function(item) {
    return `
      <p>
        <strong>${escaparHtml(item.nome || "Sem nome")}</strong><br>
        ${escaparHtml(item.funcao || "Sem função")}
        ${item.email ? " • " + escaparHtml(item.email) : ""}
      </p>
    `;
  });
}

async function criarIntegrante() {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();

  const nome = limparTexto(elemento("integrante-nome")?.value);
  const funcao = limparTexto(elemento("integrante-funcao")?.value);
  const email = limparTexto(elemento("integrante-email")?.value);

  if (!nome) {
    alert("Informe o nome do integrante.");
    return;
  }

  const { error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.integrantes)
    .insert({
      projeto_id: projetoId,
      nome: nome,
      funcao: funcao,
      email: email
    });

  if (error) {
    alert("Erro ao salvar integrante: " + error.message);
    return;
  }

  carregarIntegrantes();
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
        grid-template-columns: minmax(280px, 430px) 1fr;
        gap: 18px;
        width: 100%;
      }

      .form-musicas {
        display: grid;
        gap: 12px;
      }

      .form-musicas label,
      .filtros-musicas label {
        display: grid;
        gap: 7px;
        font-size: 14px;
        color: #ffffff;
      }

      .form-musicas input,
      .form-musicas textarea,
      .filtros-musicas input,
      .filtros-musicas select {
        width: 100%;
      }

      .linha-form-musicas {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .acoes-musica {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 6px;
      }

      .botao-secundario-modulo {
        border: 0;
        border-radius: 12px;
        padding: 12px 14px;
        cursor: pointer;
        background: #eeeeee;
        color: #111111;
        font-weight: 800;
      }

      .filtros-musicas {
        display: grid;
        grid-template-columns: 1.4fr 1fr;
        gap: 12px;
        margin: 12px 0 18px;
      }

      .lista-musicas {
        display: grid;
        gap: 12px;
      }

      .item-musica {
        border: 1px solid rgba(255, 255, 255, .15);
        border-radius: 16px;
        padding: 16px;
        background: rgba(255, 255, 255, .08);
        color: #ffffff;
      }

      .item-musica-topo {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 14px;
      }

      .icone-musica-placeholder {
        width: 48px;
        height: 48px;
        min-width: 48px;
        border-radius: 50%;
        background: linear-gradient(135deg, #4f46e5, #a855f7);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 900;
        color: #ffffff;
      }

      .dados-musica {
        flex: 1;
      }

      .dados-musica h4 {
        margin: 0 0 8px;
        color: #ffffff;
        font-size: 18px;
      }

      .dados-musica p {
        margin: 5px 0;
        font-size: 14px;
        color: #e5e7eb;
      }

      .dados-musica strong {
        color: #ffffff;
      }

      .links-musica {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 10px;
      }

      .links-musica a,
      .tag-musica {
        display: inline-block;
        padding: 5px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 800;
        text-decoration: none;
        background: #8b5cf6;
        color: #ffffff;
      }

      .tag-musica.secundaria {
        background: rgba(255, 255, 255, .14);
      }

      .botoes-item-musica {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .botoes-item-musica button {
        border: 0;
        border-radius: 10px;
        padding: 9px 12px;
        cursor: pointer;
        font-weight: 800;
      }

      .btn-editar-musica {
        background: #f3f4f6;
        color: #111827;
      }

      .btn-excluir-musica {
        background: #fee2e2;
        color: #991b1b;
      }

      @media (max-width: 900px) {
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
        <p>Cadastre músicas com tom, BPM, links e observações.</p>

        <div class="form-musicas">
          <label>
            Nome da música
            <input id="musica-nome" type="text" placeholder="Ex: Tempo Perdido" />
          </label>

          <label>
            Artista / Banda
            <input id="musica-artista" type="text" placeholder="Ex: Legião Urbana" />
          </label>

          <div class="linha-form-musicas">
            <label>
              Tom original
              <input id="musica-tom" type="text" placeholder="Ex: A" />
            </label>

            <label>
              Tom da banda
              <input id="musica-tom-banda" type="text" placeholder="Ex: G" />
            </label>
          </div>

          <div class="linha-form-musicas">
            <label>
              BPM
              <input id="musica-bpm" type="number" min="0" step="1" placeholder="Ex: 132" />
            </label>

            <label>
              Link YouTube
              <input id="musica-youtube" type="url" placeholder="https://youtube.com/..." />
            </label>
          </div>

          <label>
            Link Spotify
            <input id="musica-spotify" type="url" placeholder="https://open.spotify.com/..." />
          </label>

          <label>
            Observações
            <textarea id="musica-observacoes" rows="3" placeholder="Ex: baixar meio tom, entrada da batera após 4 compassos"></textarea>
          </label>

          <div class="acoes-musica">
            <button class="botao-card" id="btn-salvar-musica" type="button">Salvar música</button>
            <button class="botao-secundario-modulo" id="btn-cancelar-musica" type="button" style="display:none;">Cancelar edição</button>
          </div>
        </div>
      </div>

      <div class="card-projeto">
        <span class="tag">Lista</span>
        <h3>Músicas cadastradas</h3>
        <p>Pesquise, ordene, edite ou exclua músicas deste projeto.</p>

        <div class="filtros-musicas">
          <label>
            Pesquisar
            <input id="busca-musicas" type="text" placeholder="Buscar por música, artista, tom ou observação" />
          </label>

          <label>
            Ordenar por
            <select id="ordenar-musicas">
              <option value="nome">Nome</option>
              <option value="artista">Artista / Banda</option>
              <option value="tom">Tom original</option>
              <option value="tom_banda">Tom da banda</option>
              <option value="bpm">BPM</option>
              <option value="created_at">Mais recentes</option>
            </select>
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
  const ordenar = elemento("ordenar-musicas");

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
    .order("nome", { ascending: true });

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
  const ordem = elemento("ordenar-musicas")?.value || "nome";

  if (!lista) {
    return;
  }

  let itens = [...(appState.musicas || [])];

  if (busca) {
    itens = itens.filter(function(item) {
      const texto = [
        item.nome,
        item.artista,
        item.tom,
        item.tom_banda,
        item.bpm,
        item.observacoes
      ].join(" ").toLowerCase();

      return texto.includes(busca);
    });
  }

  itens.sort(function(a, b) {
    if (ordem === "bpm") {
      return Number(a.bpm || 0) - Number(b.bpm || 0) || compararTexto(a.nome, b.nome);
    }

    if (ordem === "created_at") {
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    }

    if (ordem === "artista") {
      return compararTexto(a.artista, b.artista) || compararTexto(a.nome, b.nome);
    }

    if (ordem === "tom") {
      return compararTexto(a.tom, b.tom) || compararTexto(a.nome, b.nome);
    }

    if (ordem === "tom_banda") {
      return compararTexto(a.tom_banda, b.tom_banda) || compararTexto(a.nome, b.nome);
    }

    return compararTexto(a.nome, b.nome);
  });

  if (itens.length === 0) {
    lista.innerHTML = `<p>Nenhuma música encontrada.</p>`;
    return;
  }

  lista.innerHTML = itens.map(function(item) {
    const inicial = escaparHtml((item.nome || "?").trim().charAt(0).toUpperCase() || "?");
    const youtube = limparTexto(item.youtube_url || item.youtube);
    const spotify = limparTexto(item.spotify_url || item.spotify);

    return `
      <div class="item-musica">
        <div class="item-musica-topo">
          <div class="icone-musica-placeholder">${inicial}</div>

          <div class="dados-musica">
            <h4>${escaparHtml(item.nome || "Sem nome")}</h4>
            <p><strong>Artista/Banda:</strong> ${escaparHtml(item.artista || "Não informado")}</p>
            <p><strong>Tom original:</strong> ${escaparHtml(item.tom || "Não informado")} ${item.tom_banda ? " • <strong>Tom da banda:</strong> " + escaparHtml(item.tom_banda) : ""}</p>
            <p><strong>BPM:</strong> ${escaparHtml(item.bpm || "Não informado")}</p>
            ${item.observacoes ? `<p><strong>Observações:</strong> ${escaparHtml(item.observacoes)}</p>` : ""}

            <div class="links-musica">
              ${youtube ? `<a href="${escaparHtml(youtube)}" target="_blank" rel="noopener noreferrer">YouTube</a>` : `<span class="tag-musica secundaria">Sem YouTube</span>`}
              ${spotify ? `<a href="${escaparHtml(spotify)}" target="_blank" rel="noopener noreferrer">Spotify</a>` : `<span class="tag-musica secundaria">Sem Spotify</span>`}
            </div>
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
    tom_banda: limparTexto(elemento("musica-tom-banda")?.value),
    bpm: limparTexto(elemento("musica-bpm")?.value),
    youtube_url: limparTexto(elemento("musica-youtube")?.value),
    spotify_url: limparTexto(elemento("musica-spotify")?.value),
    observacoes: limparTexto(elemento("musica-observacoes")?.value)
  };
}

function preencherFormularioMusica(item) {
  if (!item) {
    return;
  }

  elemento("musica-nome").value = item.nome || "";
  elemento("musica-artista").value = item.artista || "";
  elemento("musica-tom").value = item.tom || "";
  elemento("musica-tom-banda").value = item.tom_banda || "";
  elemento("musica-bpm").value = item.bpm ?? "";
  elemento("musica-youtube").value = item.youtube_url || item.youtube || "";
  elemento("musica-spotify").value = item.spotify_url || item.spotify || "";
  elemento("musica-observacoes").value = item.observacoes || "";

  const titulo = elemento("titulo-form-musica");
  const botaoSalvar = elemento("btn-salvar-musica");
  const botaoCancelar = elemento("btn-cancelar-musica");

  if (titulo) {
    titulo.textContent = "Editar música";
  }

  if (botaoSalvar) {
    botaoSalvar.textContent = "Salvar alterações";
  }

  if (botaoCancelar) {
    botaoCancelar.style.display = "inline-block";
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function limparFormularioMusica() {
  appState.musicaEditandoId = null;

  [
    "musica-nome",
    "musica-artista",
    "musica-tom",
    "musica-tom-banda",
    "musica-bpm",
    "musica-youtube",
    "musica-spotify",
    "musica-observacoes"
  ].forEach(function(id) {
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

  if (!dados.nome) {
    alert("Informe o nome da música.");
    return;
  }

  const payload = {
    projeto_id: projetoId,
    nome: dados.nome,
    artista: dados.artista,
    tom: dados.tom,
    tom_banda: dados.tom_banda,
    bpm: dados.bpm ? Number(dados.bpm) : null,
    youtube_url: dados.youtube_url,
    spotify_url: dados.spotify_url,
    observacoes: dados.observacoes
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

  alert(appState.musicaEditandoId ? "Música atualizada com sucesso." : "Música salva com sucesso.");
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

  alert("Música excluída com sucesso.");
  await buscarMusicas();
}

async function criarMusica() {
  await salvarMusica();
}

async function carregarRepertorios() {
  const projetoId = obterProjetoAtualId();

  limparAreaModulo();

  montarFormularioModulo(
    "Novo repertório",
    "Crie uma lista de músicas para show, ensaio ou evento.",
    [
      { id: "repertorio-nome", placeholder: "Nome do repertório" },
      { id: "repertorio-observacoes", placeholder: "Observações" }
    ],
    "Salvar repertório",
    criarRepertorio
  );

  const cliente = sb();

  const { data, error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.repertorios)
    .select("*")
    .eq("projeto_id", projetoId)
    .order("created_at", { ascending: false });

  if (error) {
    montarListaModulo("Repertórios cadastrados", [], function() {
      return "";
    });
    return;
  }

  montarListaModulo("Repertórios cadastrados", data || [], function(item) {
    return `
      <p>
        <strong>${escaparHtml(item.nome || "Sem nome")}</strong><br>
        ${escaparHtml(item.observacoes || "Sem observações")}
      </p>
    `;
  });
}

async function criarRepertorio() {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();

  const nome = limparTexto(elemento("repertorio-nome")?.value);
  const observacoes = limparTexto(elemento("repertorio-observacoes")?.value);

  if (!nome) {
    alert("Informe o nome do repertório.");
    return;
  }

  const { error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.repertorios)
    .insert({
      projeto_id: projetoId,
      nome: nome,
      observacoes: observacoes
    });

  if (error) {
    alert("Erro ao salvar repertório: " + error.message);
    return;
  }

  carregarRepertorios();
}

async function carregarEventos() {
  const projetoId = obterProjetoAtualId();

  limparAreaModulo();

  montarFormularioModulo(
    "Novo evento",
    "Cadastre shows, ensaios e compromissos do projeto.",
    [
      { id: "evento-nome", placeholder: "Nome do evento" },
      { id: "evento-data", placeholder: "Data", tipo: "date" },
      { id: "evento-local", placeholder: "Local" },
      { id: "evento-observacoes", placeholder: "Observações" }
    ],
    "Salvar evento",
    criarEvento
  );

  const cliente = sb();

  const { data, error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.eventos)
    .select("*")
    .eq("projeto_id", projetoId)
    .order("data_evento", { ascending: true });

  if (error) {
    montarListaModulo("Eventos cadastrados", [], function() {
      return "";
    });
    return;
  }

  montarListaModulo("Eventos cadastrados", data || [], function(item) {
    return `
      <p>
        <strong>${escaparHtml(item.nome || "Sem nome")}</strong><br>
        ${escaparHtml(item.data_evento || "Sem data")}
        ${item.local ? " • " + escaparHtml(item.local) : ""}
      </p>
    `;
  });
}

async function criarEvento() {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();

  const nome = limparTexto(elemento("evento-nome")?.value);
  const dataEvento = limparTexto(elemento("evento-data")?.value);
  const local = limparTexto(elemento("evento-local")?.value);
  const observacoes = limparTexto(elemento("evento-observacoes")?.value);

  if (!nome) {
    alert("Informe o nome do evento.");
    return;
  }

  const { error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.eventos)
    .insert({
      projeto_id: projetoId,
      nome: nome,
      data_evento: dataEvento || null,
      local: local,
      observacoes: observacoes
    });

  if (error) {
    alert("Erro ao salvar evento: " + error.message);
    return;
  }

  carregarEventos();
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
    localStorage.removeItem("projeto_atual");
    return;
  }

  salvarProjetoAtual(data);
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
        appState.telaAtual === "tela-cadastro"
      ) {
        mostrarTela("tela-projetos", { registrar: false });
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
}

document.addEventListener("DOMContentLoaded", async function() {
  prepararAplicacao();

  await verificarSessao();
  await restaurarProjetoAtual();
});