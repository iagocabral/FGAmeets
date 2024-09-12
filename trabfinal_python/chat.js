var socket;
let nome, salaAtual, maoLevantada = false, contadorMaosLevantadas = 0;

async function iniciarConexaoSala() { // mudei
    nome = obterNomeUsuario();
    if (!nome) return;

    const sala = await selecionarSala();
    if (!sala) return;

    finalizarConexaoSala(); // mudei
    iniciarConexaoSockets(sala); // mudei
    configurarEventosSocket();
    modificarInterfaceSala(sala); // mudei
}

function obterNomeUsuario() {
    const nomeUsuario = document.getElementById('nome').value;

    if (nomeUsuario === "") {
        alert("Por favor, preencha seu nome.");
        return null;
    }
    
    return nomeUsuario;
}

async function selecionarSala() {
    const escolha = prompt("Deseja entrar em uma sala existente? (S/N)");
    
    if (escolha === "S" || escolha === "s") {
        return await exibirSalasParaSelecao();
    } else if (escolha === "N" || escolha === "n") {
        const nomeSala = prompt("Digite o nome da sala:").trim();
        if (nomeSala === "") {
            alert("Por favor, preencha o nome da sala.");
            return null;
        }
        return nomeSala;
    } else {
        alert("Opção inválida. Por favor, escolha S ou N.");
        return null;
    }
}


function finalizarConexaoSala() { // mjudei
    if (socket) {
        socket.send(`Saindo da sala ${salaAtual}`);
        socket.close();
    }
}

function iniciarConexaoSockets(sala) { // mudei
    salaAtual = sala;
    document.getElementById("loader").style.display = "inline-block";
    socket = new WebSocket(`ws://localhost:8765/${sala}`);
    socketVideo = new WebSocket(`ws://localhost:8767/${sala}`);
}

function configurarEventosSocket() {
    socket.onopen = () => {
        console.log("Conexão aberta");
        socket.send(`'${nome}' entrou na sala '${salaAtual}'`);
        atualizarInterfaceParaChat(`'${nome}' entrou na sala '${salaAtual}'`, "black");
    };

    socket.onmessage = (event) => interpretarChatMensagem(event.data);
    socket.onclose = () => encerrarSessaoTexto();

    socketVideo.onopen = () => console.log("WebSocket de vídeo conectado");
    socketVideo.onmessage = async (event) => await interpretarVideoMensagem(event);
}

async function interpretarVideoMensagem(event) {
    const data = JSON.parse(event.data);
    if (data.offer) await handleOffer(data.offer);
    else if (data.answer) await handleAnswer(data.answer);
    else if (data.ice) peerConnection.addIceCandidate(new RTCIceCandidate(data.ice));
}

function modificarInterfaceSala(sala) {
    document.getElementById("enviar").onclick = comunicarMensagem;
    document.getElementById("salaNome").innerText = sala;
}

function atualizarInterfaceParaChat(mensagem) {
    document.getElementById("telaEscolha").style.display = "none";
    document.getElementById("telaChat").style.display = "block";
    document.getElementById("telaVideo").style.display = "block";
    adicionarMensagem(mensagem);
}

function comunicarMensagem() {
    const mensagem = document.getElementById("mensagem").value;
    socket.send(`${nome}: ${mensagem}`);
    document.getElementById("mensagem").value = "";
    adicionarMensagem(`Você: ${mensagem}`);
}

function adicionarMensagem(mensagem) {
    const div = document.createElement("div");
    div.textContent = mensagem;
    div.style.color = "black";
    document.getElementById("chat").appendChild(div);
}
async function handleOffer(offer) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socketVideo.send(JSON.stringify({ answer }));
}

async function handleAnswer(answer) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
}

function encerrarSessaoTexto() {
    atualizarInterfaceParaChat(`Fim de histórico da sala ${salaAtual}`, "black");
    socket = null;
    salaAtual = null;
    document.getElementById("loader").style.display = "none";
}

function desconectarDaSala() {
    if (socket && salaAtual) {
        socket.send(`${nome} saiu da sala ${salaAtual}.`);
        socket.onclose = function () {};
        socket.close();
        var div = document.createElement("div");
        div.textContent = `Fim de histórico da sala ${salaAtual}.`;
        div.style.color = "black" || "red";
        socket = null;
        socketVideo = null;
        salaAtual = null;
        document.getElementById("chat").appendChild(div);
        document.getElementById("loader").style.display = "none";
    }

    document.getElementById("telaEscolha").style.display = "block";
    document.getElementById("telaChat").style.display = "none";
    document.getElementById("telaVideo").style.display = "none";
    document.getElementById("chatVideo").style.display = "none";
}

function exibirSalasParaSelecao() {
    const socket = new WebSocket("ws://localhost:8766");

    const socketOpen = new Promise((resolve) => {
        socket.onopen = () => resolve();
    });

    socketOpen.then(() => {
        socket.send("listar_salas");
    });

    return new Promise((resolve) => {
        socket.onmessage = (event) => {
            const salasDisponiveis = JSON.parse(event.data);
            const listaSalas =
                document.getElementById("listaSalas");
            listaSalas.innerHTML = "";

            const telaListaSalas =
                document.getElementById("telaListaSalas");
            const backButton =
                document.getElementById("backButton");

            if (!backButton) {
                const newBackButton =
                    document.createElement("button");
                newBackButton.textContent = "Voltar";
                newBackButton.id = "backButton";
                newBackButton.addEventListener("click", () => {
                    telaListaSalas.style.display = "none";
                    document.getElementById(
                        "telaEscolha"
                    ).style.display = "block";
                });
                telaListaSalas.appendChild(newBackButton);
            }

            salasDisponiveis.forEach((sala) => {
                const listItem = document.createElement("li");
                listItem.textContent = sala;
                listItem.style.cursor = "pointer";
                listItem.addEventListener("click", () => {
                    socket.close();
                    resolve(sala);
                    document.getElementById(
                        "telaListaSalas"
                    ).style.display = "none";
                    document.getElementById(
                        "telaEscolha"
                    ).style.display = "block";
                });
                listaSalas.appendChild(listItem);
            });

            if (salasDisponiveis.length > 0) {
                telaListaSalas.style.display = "block";
                document.getElementById(
                    "telaEscolha"
                ).style.display = "none";
            }
        };
    });
}

function atualizarExibicaoIconeMao(estado) {
    document.getElementById("maoIcon").style.display = estado ? "inline-block" : "none";
}

function interpretarChatMensagem(mensagem) {
    if (mensagem.includes("levantou a mão")) {
        atualizarExibicaoIconeMao(true);
        contadorMaosLevantadas++;
    } else if (mensagem.includes("abaixou a mão")) {
        atualizarExibicaoIconeMao(true);
        contadorMaosLevantadas--;
    }
    console.log("teste", nome);
    updateMaoIcon();
    adicionarMensagem(mensagem);
}

function trocarModoMao() {
    const nomeUsuario = nome;
    const mensagem = `${nomeUsuario} levantou a mão`;
    console.log(mensagem);

    const levantarMaoButton =
        document.getElementById("levantarMaoButton");

    if (!maoLevantada) {
        maoLevantada = true;
        levantarMaoButton.style.backgroundColor = "green";
        socket.send(mensagem);
        contadorMaosLevantadas++;
    } else {
        maoLevantada = false;
        levantarMaoButton.style.backgroundColor = "";
        socket.send(`${nomeUsuario} abaixou a mão`);
        contadorMaosLevantadas--;
    }
    updateMaoIcon();
}

function updateMaoIcon() {
    const maoIcon = document.getElementById("maoIcon");
    maoIcon.innerHTML = "Falar".repeat(contadorMaosLevantadas);
    maoIcon.style.display =
        contadorMaosLevantadas > 0 ? "inline-block" : "none";
}

