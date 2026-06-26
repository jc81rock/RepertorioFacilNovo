function mostrarTela(id) {
  document.querySelectorAll(".tela").forEach(tela => {
    tela.classList.remove("tela-ativa");
  });

  const tela = document.getElementById(id);
  if (tela) tela.classList.add("tela-ativa");

  if (id === "tela-projetos") {
    carregarProjetos();
  }
}

async function entrarComGoogle() {
  await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + window.location.pathname
    }
  });
}

async function entrarComEmail() {
  const email = document.getElementById("login-email").value.trim();
  const senha = document.getElementById("login-senha").value.trim();

  if (!email || !senha) {
    alert("Preencha e-mail e senha.");
    return;
  }

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password: senha
  });

  if (error) {
    alert("Erro ao entrar: " + error.message);
    return;
  }

  mostrarTela("tela-projetos");
}

async function validarCadastro() {
  const nome = document.getElementById("cadastro-nome").value.trim();
  const email = document.getElementById("cadastro-email").value.trim();
  const senha = document.getElementById("cadastro-senha").value.trim();
  const repetirSenha = document.getElementById("cadastro-repetir-senha").value.trim();
  const mensagem = document.getElementById("mensagem-cadastro");

  if (!nome || !email || !senha || !repetirSenha) {
    mensagem.innerText = "Preencha todos os campos.";
    return;
  }

  if (senha !== repetirSenha) {
    mensagem.innerText = "As senhas não conferem.";
    return;
  }

  const { error } = await supabaseClient.auth.signUp({
    email,
    password: senha,
    options: {
      data: {
        nome: nome
      }
    }
  });

  if (error) {
    mensagem.innerText = "Erro ao criar conta: " + error.message;
    return;
  }

  mensagem.innerText = "Conta criada com sucesso. Faça login para continuar.";
}

async function sair() {
  await supabaseClient.auth.signOut();
  mostrarTela("tela-login");
}

async function carregarUsuario() {
  const { data } = await supabaseClient.auth.getSession();
  const session = data.session;

  if (!session) {
    mostrarTela("tela-login");
    return;
  }

  const user = session.user;
  const nome =
    user.user_metadata?.full_name ||
    user.user_metadata?.nome ||
    user.email;

  const campoNome = document.getElementById("nome-usuario");
  if (campoNome) {
    campoNome.innerText = "Olá, " + nome;
  }

  mostrarTela("tela-projetos");
}

async function carregarProjetos() {
  const grid = document.querySelector(".grid-projetos");
  if (!grid) return;

  const { data: sessionData } = await supabaseClient.auth.getSession();
  const user = sessionData.session?.user;

  if (!user) return;

  const { data: projetos, error } = await supabaseClient
    .from("projetos")
    .select("*")
    .eq("usuario_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  grid.innerHTML = `
    <div class="card-projeto card-criar" onclick="mostrarTela('tela-novo-projeto')">
      <div class="icone-mais">+</div>
      <h3>Criar novo projeto</h3>
      <p>Cadastre uma nova banda ou projeto musical.</p>
    </div>
  `;

  if (!projetos || projetos.length === 0) {
    grid.innerHTML += `
      <div class="card-projeto">
        <h3>Nenhum projeto cadastrado</h3>
        <p>Clique em Novo Projeto para criar o primeiro.</p>
      </div>
    `;
    return;
  }

  projetos.forEach(projeto => {
    grid.innerHTML += `
      <div class="card-projeto">
        <span class="tag">${projeto.tipo || "Projeto"}</span>
        <h3>${projeto.nome}</h3>
        <p>${projeto.estilo || "Sem estilo informado"}</p>

        <div class="detalhes">
          <span>${projeto.cidade || ""}${projeto.estado ? " - " + projeto.estado : ""}</span>
          <span>0 integrantes</span>
        </div>

        <button class="botao-card" onclick="acessarProjeto('${projeto.id}')">
          Acessar projeto
        </button>
      </div>
    `;
  });
}

async function criarProjeto() {
  const tela = document.getElementById("tela-novo-projeto");
  const campos = tela.querySelectorAll("input, select");

  const nome = campos[0].value.trim();
  const tipo = campos[1].value.trim();
  const estilo = campos[2].value.trim();
  const cidade = campos[3].value.trim();
  const estado = campos[4].value.trim().toUpperCase();

  if (!nome) {
    alert("Informe o nome do projeto.");
    return;
  }

  const { data: sessionData } = await supabaseClient.auth.getSession();
  const user = sessionData.session?.user;

  if (!user) {
    alert("Você precisa estar logado.");
    mostrarTela("tela-login");
    return;
  }

  const { error } = await supabaseClient.from("projetos").insert({
    usuario_id: user.id,
    nome,
    tipo,
    estilo,
    cidade,
    estado
  });

  if (error) {
    alert("Erro ao criar projeto: " + error.message);
    return;
  }

  campos.forEach(campo => campo.value = "");
  mostrarTela("tela-projetos");
}

function acessarProjeto(id) {
  localStorage.setItem("projeto_atual", id);
  alert("Projeto aberto. Próximo passo: criar o painel interno do projeto.");
}

document.addEventListener("DOMContentLoaded", () => {
  if (window.location.search.includes("error=")) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  const btnGoogle = document.getElementById("btn-google");
  if (btnGoogle) {
    btnGoogle.addEventListener("click", entrarComGoogle);
  }

  const btnEntrar = document.querySelector("#tela-login .botao-principal");
  if (btnEntrar) {
    btnEntrar.removeAttribute("onclick");
    btnEntrar.addEventListener("click", entrarComEmail);
  }

  const btnCriarProjeto = document.querySelector("#tela-novo-projeto .botao-principal");
  if (btnCriarProjeto) {
    btnCriarProjeto.addEventListener("click", criarProjeto);
  }

  carregarUsuario();
});