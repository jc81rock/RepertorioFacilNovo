function mostrarTela(idTela) {
  const telas = document.querySelectorAll(".tela");

  telas.forEach(function(tela) {
    tela.classList.remove("tela-ativa");
  });

  const telaSelecionada = document.getElementById(idTela);

  if (telaSelecionada) {
    telaSelecionada.classList.add("tela-ativa");
  }
}

function mostrarMensagemCadastro(tipo, texto) {
  const mensagem = document.getElementById("mensagem-cadastro");

  mensagem.className = "mensagem-cadastro " + tipo;
  mensagem.textContent = texto;
}

function validarCadastro() {
  const nome = document.getElementById("cadastro-nome").value.trim();
  const cidade = document.getElementById("cadastro-cidade").value.trim();
  const email = document.getElementById("cadastro-email").value.trim();
  const senha = document.getElementById("cadastro-senha").value.trim();
  const repetirSenha = document.getElementById("cadastro-repetir-senha").value.trim();

  if (nome === "") {
    mostrarMensagemCadastro("erro", "Informe seu nome.");
    return;
  }

  if (cidade === "") {
    mostrarMensagemCadastro("erro", "Informe sua cidade.");
    return;
  }

  if (email === "") {
    mostrarMensagemCadastro("erro", "Informe seu e-mail.");
    return;
  }

  if (senha === "") {
    mostrarMensagemCadastro("erro", "Informe sua senha.");
    return;
  }

  if (repetirSenha === "") {
    mostrarMensagemCadastro("erro", "Repita sua senha.");
    return;
  }

  if (senha !== repetirSenha) {
    mostrarMensagemCadastro("erro", "As senhas não coincidem.");
    return;
  }

  mostrarMensagemCadastro("sucesso", "Dados validados com sucesso.");
}

async function entrarComGoogle() {
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: "https://jc81rock.github.io/repertorio-facil/"
    }
  });

  if (error) {
    alert("Erro ao entrar com Google: " + error.message);
  }
}

async function verificarUsuarioLogado() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    console.log("Erro ao verificar login:", error.message);
    return;
  }

  if (data.session) {
    const usuario = data.session.user;
    const nomeUsuario = document.getElementById("nome-usuario");

    if (nomeUsuario) {
      const nome =
        usuario.user_metadata.full_name ||
        usuario.user_metadata.name ||
        usuario.email ||
        "Usuário";

      nomeUsuario.textContent = "Olá, " + nome;
    }

    mostrarTela("tela-projetos");
  } else {
    mostrarTela("tela-login");
  }
}

async function sair() {
  await supabaseClient.auth.signOut();
  mostrarTela("tela-login");
}

verificarUsuarioLogado();