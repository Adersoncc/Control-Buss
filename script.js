// script.js - Control-Buss
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// CONFIGURAÇÃO DO FIREBASE (Certifique-se que seus dados estão corretos)
const firebaseConfig = {
  apiKey: "AIzaSyC63Q1eBXVFz5CkLxxWMAfDN6uxWwy_oU8",
  authDomain: "controle-de-campanhas-55ae2.firebaseapp.com",
  projectId: "controle-de-campanhas-55ae2",
  storageBucket: "controle-de-campanhas-55ae2.firebasestorage.app",
  messagingSenderId: "923348616466",
  appId: "1:923348616466:web:8bad212b45af31028ddfcb"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let cacheOnibus = [];
let cacheCampanhas = [];

window.carregarDados = async function() {
    try {
        // Carregar Ônibus
        const snapOnibus = await getDocs(collection(db, "onibus"));
        cacheOnibus = snapOnibus.docs.map(d => ({ id: d.id, ...d.data() }));

        // Ordenar Ônibus por Prefixo numericamente
        cacheOnibus.sort((a, b) => Number(a.prefixo) - Number(b.prefixo));

        // Carregar Campanhas
        const snapCampanhas = await getDocs(collection(db, "campanhas"));
        cacheCampanhas = snapCampanhas.docs.map(d => ({ id: d.id, ...d.data() }));

        // Ordenar Campanhas: As mais recentes (ou novas IDs/cadastros) aparecem no topo
        cacheCampanhas.reverse();

        atualizarMetricas();
        renderizarTabelaOnibus(cacheOnibus);
        renderizarTabelaCampanhas();
    } catch (error) {
        console.error("Erro ao carregar dados do Firebase:", error);
        document.getElementById("tabela-onibus").innerHTML = `<tr><td colspan="6" class="py-6 text-center text-red-500">Erro ao carregar dados do Firebase. Verifique a conexão.</td></tr>`;
        document.getElementById("tabela-campanhas").innerHTML = `<tr><td colspan="6" class="py-6 text-center text-red-500">Erro ao carregar campanhas.</td></tr>`;
    }
};

function atualizarMetricas() {
    const total = cacheOnibus.length;
    const operando = cacheOnibus.filter(o => o.status === 'Operando').length;
    const parados = cacheOnibus.filter(o => o.status === 'Parado' || o.status === 'Em Manutenção').length;
    const semCampanha = cacheOnibus.filter(o => !o.campanha || o.campanha.trim() === '').length;

    document.getElementById("metric-total").innerText = total;
    document.getElementById("metric-operando").innerText = operando;
    document.getElementById("metric-parados").innerText = parados;
    document.getElementById("metric-sem-campanha").innerText = semCampanha;
}

window.renderizarTabelaOnibus = function(lista) {
    const tbody = document.getElementById("tabela-onibus");
    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-gray-500">Nenhum ônibus cadastrado.</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(o => {
        let badgeStatus = '';
        if (o.status === 'Operando') badgeStatus = `<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">Operando</span>`;
        else if (o.status === 'Em Manutenção') badgeStatus = `<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">Em Manutenção</span>`;
        else badgeStatus = `<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800">Parado</span>`;

        const linhaTexto = o.linha && o.linha.trim() !== '' ? o.linha : `<span class="text-gray-400 italic">Não informada</span>`;
        const garagemTexto = o.garagem || `<span class="text-gray-400 italic">Não informada</span>`;
        const campanhaTexto = o.campanha && o.campanha.trim() !== '' ? `<span class="px-2 py-0.5 text-xs font-medium rounded bg-indigo-50 text-indigo-700">${o.campanha}</span>` : `<span class="text-gray-400 italic">Sem Campanha</span>`;

        return `
            <tr class="hover:bg-gray-50 transition border-b border-gray-100">
                <td class="py-3 px-6 font-semibold text-gray-900">${o.prefixo}</td>
                <td class="py-3 px-6 text-gray-700">${garagemTexto}</td>
                <td class="py-3 px-6 text-gray-700">${linhaTexto}</td>
                <td class="py-3 px-6">${badgeStatus}</td>
                <td class="py-3 px-6">${campanhaTexto}</td>
                <td class="py-3 px-6 text-center space-x-2">
                    <button onclick="editarOnibus('${o.id}')" title="Editar" class="text-blue-600 hover:text-blue-800 p-1"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button onclick="deletarOnibus('${o.id}')" title="Excluir" class="text-rose-600 hover:text-rose-800 p-1"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');
};
window.renderizarTabelaCampanhas = function() {
    const tbody = document.getElementById("tabela-campanhas");
    if (cacheCampanhas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-gray-500">Nenhuma campanha cadastrada.</td></tr>`;
        return;
    }

    const hoje = new Date().toISOString().split('T')[0];

    tbody.innerHTML = cacheCampanhas.map(c => {
        let statusBadge = '';
        if (hoje < c.inicio) statusBadge = `<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Agendada</span>`;
        else if (hoje > c.fim) statusBadge = `<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Encerrada</span>`;
        else statusBadge = `<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">Ativa</span>`;

        const qtdVeiculos = cacheOnibus.filter(o => o.campanha === c.nome).length;

        return `
            <tr class="hover:bg-gray-50 transition border-b border-gray-100">
                <td class="py-3 px-6 font-semibold text-gray-900">
                    <button onclick="abrirDetalhesCampanha('${c.id}')" class="text-indigo-600 hover:text-indigo-900 hover:underline text-left font-semibold flex items-center space-x-1.5">
                        <i class="fa-solid fa-bullhorn text-xs"></i>
                        <span>${c.nome}</span>
                    </button>
                </td>
                <td class="py-3 px-6 text-gray-700 font-medium">${qtdVeiculos} veículos</td>
                <td class="py-3 px-6 text-gray-700">${formatarData(c.inicio)}</td>
                <td class="py-3 px-6 text-gray-700">${formatarData(c.fim)}</td>
                <td class="py-3 px-6">${statusBadge}</td>
                <td class="py-3 px-6 text-center">
                    <button onclick="deletarCampanha('${c.id}', '${c.nome}')" title="Excluir Campanha" class="text-rose-600 hover:text-rose-800 p-1"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');
};

// FUNÇÕES DO NOVO MODAL DE DETALHES
window.abrirDetalhesCampanha = function(idCampanha) {
    const campanha = cacheCampanhas.find(c => c.id === idCampanha);
    if (!campanha) return;

    document.getElementById("modal-detalhes-titulo").innerText = campanha.nome;
    document.getElementById("modal-detalhes-inicio").innerText = formatarData(campanha.inicio);
    document.getElementById("modal-detalhes-vencimento").innerText = formatarData(campanha.fim);

    const onibusDaCampanha = cacheOnibus.filter(o => o.campanha === campanha.nome);
    const tbody = document.getElementById("tabela-detalhes-onibus");

    if (onibusDaCampanha.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-gray-500 italic">Nenhum veículo alocado nesta campanha.</td></tr>`;
    } else {
        tbody.innerHTML = onibusDaCampanha.map(o => {
            let badgeStatus = '';
            if (o.status === 'Operando') badgeStatus = `<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">Operando</span>`;
            else if (o.status === 'Em Manutenção') badgeStatus = `<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">Manutenção</span>`;
            else badgeStatus = `<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-800">Parado</span>`;

            return `
                <tr class="hover:bg-gray-50">
                    <td class="py-2 px-3 font-semibold text-gray-900">${o.prefixo}</td>
                    <td class="py-2 px-3 text-gray-700">${o.garagem || '-'}</td>
                    <td class="py-2 px-3 text-gray-700">${o.linha || '-'}</td>
                    <td class="py-2 px-3">${badgeStatus}</td>
                </tr>
            `;
        }).join('');
    }

    document.getElementById("modal-detalhes-campanha").classList.remove("hidden");
};

window.fecharModalDetalhesCampanha = function() {
    document.getElementById("modal-detalhes-campanha").classList.add("hidden");
};


/* window.renderizarTabelaCampanhas = function() {
    const tbody = document.getElementById("tabela-campanhas");
    if (cacheCampanhas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-gray-500">Nenhuma campanha cadastrada.</td></tr>`;
        return;
    }

    const hoje = new Date().toISOString().split('T')[0];

    tbody.innerHTML = cacheCampanhas.map(c => {
        let statusBadge = '';
        if (hoje < c.inicio) statusBadge = `<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Agendada</span>`;
        else if (hoje > c.fim) statusBadge = `<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Encerrada</span>`;
        else statusBadge = `<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">Ativa</span>`;

        const qtdVeiculos = cacheOnibus.filter(o => o.campanha === c.nome).length;

        return `
            <tr class="hover:bg-gray-50 transition border-b border-gray-100">
                <td class="py-3 px-6 font-semibold text-gray-900">${c.nome}</td>
                <td class="py-3 px-6 text-gray-700 font-medium">${qtdVeiculos} veículos</td>
                <td class="py-3 px-6 text-gray-700">${formatarData(c.inicio)}</td>
                <td class="py-3 px-6 text-gray-700">${formatarData(c.fim)}</td>
                <td class="py-3 px-6">${statusBadge}</td>
                <td class="py-3 px-6 text-center">
                    <button onclick="deletarCampanha('${c.id}', '${c.nome}')" title="Excluir Campanha" class="text-rose-600 hover:text-rose-800 p-1"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}; */

function formatarData(dataStr) {
    if (!dataStr) return '';
    const partes = dataStr.split('-');
    if (partes.length !== 3) return dataStr;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

window.filtrarOnibus = function() {
    const termo = document.getElementById("filtro-onibus").value.toLowerCase();
    const filtrados = cacheOnibus.filter(o => 
        (o.prefixo && o.prefixo.toLowerCase().includes(termo)) ||
        (o.linha && o.linha.toLowerCase().includes(termo)) ||
        (o.garagem && o.garagem.toLowerCase().includes(termo)) ||
        (o.status && o.status.toLowerCase().includes(termo))
    );
    renderizarTabelaOnibus(filtrados);
};

// MODAL ÔNIBUS
window.abrirModalOnibus = function(id = null) {
    document.getElementById("form-onibus").reset();
    document.getElementById("onibus-id").value = "";
    if (id) {
        document.getElementById("titulo-modal-onibus").innerText = "Editar Ônibus";
        const obj = cacheOnibus.find(o => o.id === id);
        if (obj) {
            document.getElementById("onibus-id").value = obj.id;
            document.getElementById("onibus-prefixo").value = obj.prefixo || "";
            document.getElementById("onibus-garagem").value = obj.garagem || "";
            document.getElementById("onibus-status").value = obj.status || "Operando";
            document.getElementById("onibus-linha").value = obj.linha || "";
        }
    } else {
        document.getElementById("titulo-modal-onibus").innerText = "Cadastrar Novo Ônibus";
        document.getElementById("onibus-status").value = "Operando";
    }
    document.getElementById("modal-onibus").classList.remove("hidden");
};

window.fecharModalOnibus = function() {
    document.getElementById("modal-onibus").classList.add("hidden");
};

window.salvarOnibus = async function(event) {
    event.preventDefault();
    const id = document.getElementById("onibus-id").value;
    const prefixo = document.getElementById("onibus-prefixo").value.trim();
    const garagem = document.getElementById("onibus-garagem").value;
    const status = document.getElementById("onibus-status").value;
    const linha = document.getElementById("onibus-linha").value.trim();

    const dadosOnibus = { prefixo, garagem, status, linha };

    try {
        if (id) {
            const objAntigo = cacheOnibus.find(o => o.id === id);
            if (objAntigo && objAntigo.campanha) dadosOnibus.campanha = objAntigo.campanha;

            await updateDoc(doc(db, "onibus", id), dadosOnibus);
        } else {
            dadosOnibus.campanha = "";
            await addDoc(collection(db, "onibus"), dadosOnibus);
        }
        fecharModalOnibus();
        carregarDados();
    } catch (error) {
        console.error("Erro ao salvar ônibus:", error);
        alert("Erro ao salvar ônibus.");
    }
};

window.editarOnibus = function(id) {
    abrirModalOnibus(id);
};

window.deletarOnibus = async function(id) {
    if (confirm("Deseja realmente excluir este ônibus?")) {
        try {
            await deleteDoc(doc(db, "onibus", id));
            carregarDados();
        } catch (error) {
            console.error("Erro ao excluir ônibus:", error);
        }
    }
};

// MODAL CAMPANHA
window.abrirModalCampanha = function() {
    document.getElementById("form-campanha").reset();
    const container = document.getElementById("lista-checkbox-onibus");
    if (cacheOnibus.length === 0) {
        container.innerHTML = `<p class="text-xs text-gray-500 italic p-2">Nenhum ônibus cadastrado para alocar campanha.</p>`;
    } else {
        container.innerHTML = cacheOnibus.map(o => `
            <label class="flex items-center space-x-2 p-1 hover:bg-white rounded cursor-pointer">
                <input type="checkbox" name="onibus-checkbox" value="${o.prefixo}" class="rounded text-indigo-600 focus:ring-indigo-500">
                <span class="text-xs font-medium text-gray-800">Prefixo: ${o.prefixo} ${o.linha ? '(' + o.linha + ')' : ''}</span>
            </label>
        `).join('');
    }
    document.getElementById("modal-campanha").classList.remove("hidden");
};

window.fecharModalCampanha = function() {
    document.getElementById("modal-campanha").classList.add("hidden");
};

window.selecionarTodosOnibus = function(marcar) {
    const checkboxes = document.querySelectorAll('input[name="onibus-checkbox"]');
    checkboxes.forEach(cb => cb.checked = marcar);
};

window.salvarCampanha = async function(event) {
    event.preventDefault();
    const nome = document.getElementById("campanha-nome").value.trim();
    const inicio = document.getElementById("campanha-inicio").value;
    const fim = document.getElementById("campanha-fim").value;

    const checkboxes = document.querySelectorAll('input[name="onibus-checkbox"]:checked');
    const prefixosSelecionados = Array.from(checkboxes).map(cb => cb.value);

    if (prefixosSelecionados.length === 0) {
        alert("Selecione pelo menos um ônibus para aplicar a campanha.");
        return;
    }

    try {
        // Salva a nova campanha no Firebase
        await addDoc(collection(db, "campanhas"), { nome, inicio, fim });

        // Atualiza os ônibus selecionados. Se já tiverem outra campanha, ela é substituída pela nova.
        for (let o of cacheOnibus) {
            if (prefixosSelecionados.includes(o.prefixo)) {
                await updateDoc(doc(db, "onibus", o.id), { campanha: nome });
            }
        }

        fecharModalCampanha();
        carregarDados();
    } catch (error) {
        console.error("Erro ao salvar campanha:", error);
        alert("Erro ao salvar campanha.");
    }
};

window.deletarCampanha = async function(id, nomeCampanha) {
    if (confirm(`Deseja realmente excluir a campanha "${nomeCampanha}"? Os ônibus vinculados ficarão sem campanha.`)) {
        try {
            for (let o of cacheOnibus) {
                if (o.campanha === nomeCampanha) {
                    await updateDoc(doc(db, "onibus", o.id), { campanha: "" });
                }
            }
            await deleteDoc(doc(db, "campanhas", id));
            carregarDados();
        } catch (error) {
            console.error("Erro ao excluir campanha:", error);
        }
    }
};

// Inicializar carregamento ao abrir a página
window.addEventListener('DOMContentLoaded', carregarDados);
