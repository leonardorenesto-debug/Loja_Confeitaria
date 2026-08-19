// Registro do Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js');
    });
}

const STORAGE_KEY = 'brigadeiros';
const CARRINHO_KEY = 'carrinho';

let brigadeiros = [];
let carrinho = [];
let deferredPrompt = null;

// Evento de instalação do PWA
window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;

    const installBtn = document.getElementById('installBtn');

    if (installBtn) {
        installBtn.hidden = false;
    }
});

// Inicialização
document.addEventListener('DOMContentLoaded', () => {

    carregarBrigadeiros();
    carregarCarrinho();

    renderizarBrigadeiros();
    renderizarCarrinho();

    const brigadeiroForm = document.getElementById('brigadeiroForm');

    if (brigadeiroForm) {
        brigadeiroForm.addEventListener('submit', adicionarBrigadeiro);
    }

    const installBtn = document.getElementById('installBtn');

    if (installBtn) {
        installBtn.addEventListener('click', async () => {

            if (!deferredPrompt) return;

            deferredPrompt.prompt();

            await deferredPrompt.userChoice;

            deferredPrompt = null;
            installBtn.hidden = true;
        });
    }
});

// Carregar brigadeiros do localStorage
function carregarBrigadeiros() {

    const dados = localStorage.getItem(STORAGE_KEY);

    brigadeiros = dados ? JSON.parse(dados) : [];
}

// Carregar carrinho do localStorage
function carregarCarrinho() {

    const dados = localStorage.getItem(CARRINHO_KEY);

    carrinho = dados ? JSON.parse(dados) : [];
}

// Salvar brigadeiros
function salvarBrigadeiros() {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(brigadeiros)
    );
}

// Salvar carrinho
function salvarCarrinho() {

    localStorage.setItem(
        CARRINHO_KEY,
        JSON.stringify(carrinho)
    );
}

// Renderizar brigadeiros na tela
function renderizarBrigadeiros() {

    const lista = document.getElementById('brigadeiroList');

    if (brigadeiros.length === 0) {

        lista.innerHTML = `
            <p class="empty-message">
                Nenhum brigadeiro cadastrado.
            </p>
        `;

        return;
    }

    lista.innerHTML = brigadeiros.map(brigadeiro => `

        <div class="brigadeiro-item">

            <img
                src="${brigadeiro.imagem}"
                alt="${escapeHtml(brigadeiro.nome)}"
                class="brigadeiro-imagem"
            >

            <strong>
                ${escapeHtml(brigadeiro.nome)}
            </strong>

            <p>
                ${escapeHtml(brigadeiro.descricao)}
            </p>

            <p>
                R$ ${brigadeiro.preco.toFixed(2).replace('.', ',')}
            </p>

            <div class="brigadeiro-actions">

                <button
                    class="btn btn-cart"
                    onclick="adicionarAoCarrinho(${brigadeiro.id})">
                    Adicionar ao Carrinho
                </button>

                <button
                    class="btn btn-delete"
                    onclick="deletarBrigadeiro(${brigadeiro.id})">
                    Remover
                </button>

            </div>

        </div>

    `).join('');
}

// Alternar formulário
function toggleFormSection() {

    const formSection = document.getElementById('formSection');

    formSection.classList.toggle('visible');

    if (formSection.classList.contains('visible')) {

        document.getElementById('nomeBrigadeiro').focus();

    }
}

// Adicionar novo brigadeiro
function adicionarBrigadeiro(e) {

    e.preventDefault();

    const nome = document
        .getElementById('nomeBrigadeiro')
        .value
        .trim();

    const descricao = document
        .getElementById('descricao')
        .value
        .trim();

    const preco = parseFloat(
        document.getElementById('preco').value
    );

    const imagemInput = document.getElementById('imagem');

    const arquivo = imagemInput.files[0];

    if (!nome || !descricao || isNaN(preco) || preco <= 0 || !arquivo) {

        alert('Preencha todos os campos corretamente.');

        return;
    }

    // Verificar se já existe
    if (brigadeiros.some(
        b => b.nome.toLowerCase() === nome.toLowerCase()
    )) {

        alert('Já existe um brigadeiro com este nome.');

        return;
    }

    // Ler a imagem
    const leitor = new FileReader();

    leitor.onload = function () {

        const novoBrigadeiro = {

            id: Date.now(),

            nome: nome,

            descricao: descricao,

            preco: preco,

            imagem: leitor.result,

            dataCriacao: new Date().toLocaleString('pt-BR')

        };

        brigadeiros.push(novoBrigadeiro);

        salvarBrigadeiros();

        document
            .getElementById('brigadeiroForm')
            .reset();

        toggleFormSection();

        renderizarBrigadeiros();

        mostrarNotificacao('Brigadeiro adicionado!');

    };

    leitor.readAsDataURL(arquivo);
}

// Adicionar brigadeiro ao carrinho
function adicionarAoCarrinho(id) {

    const brigadeiro = brigadeiros.find(
        b => b.id === id
    );

    if (!brigadeiro) return;

    const itemExistente = carrinho.find(
        item => item.id === id
    );

    if (itemExistente) {

        itemExistente.quantidade++;

    } else {

        carrinho.push({

            id: brigadeiro.id,

            nome: brigadeiro.nome,

            preco: brigadeiro.preco,

            quantidade: 1

        });

    }

    salvarCarrinho();

    renderizarCarrinho();

    mostrarNotificacao(
        'Brigadeiro adicionado ao carrinho!'
    );
}

// Renderizar carrinho
function renderizarCarrinho() {

    const lista = document.getElementById('carrinhoList');

    const totalElemento =
        document.getElementById('totalCarrinho');

    if (carrinho.length === 0) {

        lista.innerHTML = `
            <p class="empty-message">
                Seu carrinho está vazio.
            </p>
        `;

        totalElemento.textContent = '0,00';

        return;
    }

    lista.innerHTML = carrinho.map(item => `

        <div class="carrinho-item">

            <strong>
                ${escapeHtml(item.nome)}
            </strong>

            <p>
                Quantidade: ${item.quantidade}
            </p>

            <p>
                Subtotal: R$
                ${(item.preco * item.quantidade)
                    .toFixed(2)
                    .replace('.', ',')}
            </p>

            <div class="brigadeiro-actions">

                <button
                    class="btn btn-cart"
                    onclick="aumentarQuantidade(${item.id})">
                    +
                </button>

                <button
                    class="btn btn-secondary"
                    onclick="diminuirQuantidade(${item.id})">
                    -
                </button>

                <button
                    class="btn btn-delete"
                    onclick="removerDoCarrinho(${item.id})">
                    Remover
                </button>

            </div>

        </div>

    `).join('');

    calcularTotal();
}

// Aumentar quantidade
function aumentarQuantidade(id) {

    const item = carrinho.find(
        item => item.id === id
    );

    if (item) {

        item.quantidade++;

        salvarCarrinho();

        renderizarCarrinho();

    }
}

// Diminuir quantidade
function diminuirQuantidade(id) {

    const item = carrinho.find(
        item => item.id === id
    );

    if (!item) return;

    if (item.quantidade > 1) {

        item.quantidade--;

    } else {

        carrinho = carrinho.filter(
            item => item.id !== id
        );

    }

    salvarCarrinho();

    renderizarCarrinho();
}

// Remover item do carrinho
function removerDoCarrinho(id) {

    carrinho = carrinho.filter(
        item => item.id !== id
    );

    salvarCarrinho();

    renderizarCarrinho();

    mostrarNotificacao(
        'Item removido do carrinho!'
    );
}

// Calcular total
function calcularTotal() {

    let total = 0;

    carrinho.forEach(item => {

        total += item.preco * item.quantidade;

    });

    const totalElemento =
        document.getElementById('totalCarrinho');

    totalElemento.textContent =
        total.toFixed(2).replace('.', ',');
}

// Remover brigadeiro da loja
function deletarBrigadeiro(id) {

    if (!confirm(
        'Tem certeza que deseja remover este brigadeiro?'
    )) {

        return;
    }

    brigadeiros = brigadeiros.filter(
        brigadeiro => brigadeiro.id !== id
    );

    // Também remove do carrinho
    carrinho = carrinho.filter(
        item => item.id !== id
    );

    salvarBrigadeiros();

    salvarCarrinho();

    renderizarBrigadeiros();

    renderizarCarrinho();

    mostrarNotificacao(
        'Brigadeiro removido com sucesso!'
    );
}

// Finalizar pedido
function finalizarPedido() {

    if (carrinho.length === 0) {

        alert('Seu carrinho está vazio.');

        return;
    }

    let mensagem = 'Pedido realizado!\n\n';

    carrinho.forEach(item => {

        mensagem +=
            `${item.nome} - ` +
            `${item.quantidade} unidade(s)\n`;

    });

    const total = carrinho.reduce(
        (soma, item) =>
            soma + item.preco * item.quantidade,
        0
    );

    mensagem +=
        `\nTotal: R$ ${total
            .toFixed(2)
            .replace('.', ',')}`;

    alert(mensagem);

    carrinho = [];

    salvarCarrinho();

    renderizarCarrinho();

    mostrarNotificacao(
        'Pedido finalizado!'
    );
}

// Notificação temporária
function mostrarNotificacao(mensagem) {

    const el = document.createElement('div');

    el.textContent = mensagem;

    el.className = 'toast';

    document.body.appendChild(el);

    setTimeout(() => el.remove(), 2500);
}

// Sanitizar HTML
function escapeHtml(text) {

    const div = document.createElement('div');

    div.textContent = text;

    return div.innerHTML;
}

