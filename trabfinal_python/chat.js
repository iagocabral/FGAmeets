var socket;
let nome, salaAtual, maoLevantada = false, contadorMaosLevantadas = 0;

async function entrarNaSala() {
    nome = obterNomeUsuario();
    if (!nome) return;

    const sala = await selecionarSala();
    if (!sala) return;

    sairDaSalaAtual();
    conectarSockets(sala);
    configurarEventosSocket();
    configurarInterfaceUsuario(sala);
}

function obterNomeUsuario() {
    const nomeUsuario = prompt("Digite seu nome:").trim();
    if (nomeUsuario === "") {
        alert("Por favor, preencha seu nome.");
        return null;
    }
    return nomeUsuario;
}

async function selecionarSala() {
    const escolha = prompt("Deseja entrar em uma sala existente? (S/N)").toUpperCase();
    if (escolha === "S") {
        return await listarSalasESelecionar();
    } else {
        const nomeSala = prompt("Digite o nome da sala:").trim();
        if (nomeSala === "") {
            alert("Por favor, preencha o nome da sala.");
            return null;
        }
        return nomeSala;
    }
}

function sairDaSalaAtual() {
    if (socket) {
        socket.send(`Saindo da sala ${salaAtual}`);
        socket.close();
    }
}

function conectarSockets(sala) {
    salaAtual = sala;
    document.getElementById("loader").style.display = "inline-block";
    socket = new WebSocket(`ws://localhost:8765/${sala}`);
    socketVideo = new WebSocket(`ws://localhost:8767/${sala}`);
}

function configurarEventosSocket() {
    socket.onopen = () => {
        console.log("Conexão aberta");
        socket.send(`'${nome}' entrou na sala '${salaAtual}'`);
        exibirChat(`'${nome}' entrou na sala '${salaAtual}'`, "black");
    };

    socket.onmessage = (event) => processarMensagemTexto(event.data);
    socket.onclose = () => finalizarConexaoTexto();

    socketVideo.onopen = () => console.log("WebSocket de vídeo conectado");
    socketVideo.onmessage = async (event) => await processarMensagemVideo(event);
}

function processarMensagemTexto(mensagem) {
    if (mensagem.includes("levantou a mão")) {
        mostrarMaoIcon();
        contadorMaosLevantadas++;
    } else if (mensagem.includes("abaixou a mão")) {
        esconderMaoIcon();
        contadorMaosLevantadas--;
    }
    updateMaoIcon();
    exibirMensagem(mensagem);
}

async function processarMensagemVideo(event) {
    const data = JSON.parse(event.data);
    if (data.offer) await handleOffer(data.offer);
    else if (data.answer) await handleAnswer(data.answer);
    else if (data.ice) peerConnection.addIceCandidate(new RTCIceCandidate(data.ice));
}

function configurarInterfaceUsuario(sala) {
    document.getElementById("enviar").onclick = enviarMensagem;
    document.getElementById("salaNome").innerText = sala;
}

function exibirChat(mensagem, cor) {
    document.getElementById("telaEscolha").style.display = "none";
    document.getElementById("telaChat").style.display = "block";
    document.getElementById("telaVideo").style.display = "block";
    exibirMensagem(mensagem, cor);
}

function enviarMensagem() {
    const mensagem = document.getElementById("mensagem").value;
    socket.send(`${nome}: ${mensagem}`);
    document.getElementById("mensagem").value = "";
    exibirMensagem(`Você: ${mensagem}`, "black");
}

function exibirMensagem(mensagem, cor = "black") {
    const div = document.createElement("div");
    div.textContent = mensagem;
    div.style.color = cor;
    document.getElementById("chat").appendChild(div);
}

function mostrarMaoIcon() {
    document.getElementById("maoIcon").style.display = "inline-block";
}

function esconderMaoIcon() {
    document.getElementById("maoIcon").style.display = "none";
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

function finalizarConexaoTexto() {
    exibirChat(`Fim de histórico da sala ${salaAtual}`, "black");
    socket = null;
    salaAtual = null;
    document.getElementById("loader").style.display = "none";
}



function listarSalasESelecionar() {
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

function toggleMao() {
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

function toggleMute() {
    if (!localStream) return;

    const audioTracks = localStream.getAudioTracks();
    if (audioTracks.length === 0) return;

    audioTracks[0].enabled = !audioTracks[0].enabled;

    const muteButton = document.getElementById("muteButton");
    if (audioTracks[0].enabled) {
        muteButton.textContent = "Mutar";
    } else {
        muteButton.textContent = "Desmutar";
    }
}

function toggleCamera() {
    if (!localStreamVideo) return;

    const videoTracks = localStreamVideo.getVideoTracks();

    if (videoTracks.length === 0) return;

    videoTracks[0].enabled = !videoTracks[0].enabled;

    const toggleCameraButton =
        document.getElementById("toggleCameraButton");
    if (videoTracks[0].enabled) {
        toggleCameraButton.textContent = "Desligar Câmera";
    } else {
        toggleCameraButton.textContent = "Ligar Câmera";
    }
}

function updateMaoIcon() {
    const maoIcon = document.getElementById("maoIcon");
    maoIcon.innerHTML = "Falar".repeat(contadorMaosLevantadas);
    maoIcon.style.display =
        contadorMaosLevantadas > 0 ? "inline-block" : "none";
}

function voltarParaEscolha() {
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