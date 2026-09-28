// script.js - Control-Buss
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// CONFIGURAÇÃO DO FIREBASE (Suas credenciais mantidas)
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

async function verificarCampanhasVencidas() {
    const hoje = new Date().toISOString().split('T')[0];
    const campanhasVencidas = cacheCampanhas.filter(c => c.fim < hoje);

    if (campanhasVencidas.length === 0) return;

    const promessasAtualizacao = [];

    for (let o of cacheOnibus) {
        let alterado = false;
        let updates = {};

        if (o.campanha) {
            const campNormal = campanhasVencidas.find(c => c.nome === o.campanha && (c.tipo === 'normal' || !c.tipo));
            if (campNormal) {
                o.campanha = "";
                updates.campanha = "";
                alterado = true;
            }
        }

        if (o.campanha_backseat) {
            const campBackseat = campanhasVencidas.find(c => c.nome === o.campanha_backseat && c.tipo === 'backseat');
            if (campBackseat) {
                o.campanha_backseat = "";
                updates.campanha_backseat = "";
                alterado = true;
            }
        }

        if (alterado) {
            const docRef = doc(db, "onibus", o.id);
            promessasAtualizacao.push(updateDoc(docRef, updates));
        }
    }

    if (promessasAtualizacao.length > 0) {
        try {
            await Promise.all(promessasAtualizacao);
            console.log("Veículos desvinculados de campanhas vencidas.");
        } catch (error) {
            console.error("Erro ao limpar campanhas:", error);
        }
    }
}

window.carregarDados = async function() {
    try {
        const snapOnibus = await getDocs(collection(db, "onibus"));
        cacheOnibus = snapOnibus.docs.map(d => ({ id: d.id, ...d.data() }));
        cacheOnibus.sort((a, b) => Number(a.prefixo) - Number(b.prefixo));

        const snapCampanhas = await getDocs(collection(db, "campanhas"));
        cacheCampanhas = snapCampanhas.docs.map(d => ({ id: d.id, ...d.data() }));
        cacheCampanhas.reverse();

        await verificarCampanhasVencidas();

        atualizarMetricas();
        renderizarTabelaOnibus(cacheOnibus);
        renderizarTabelaCampanhas();
    } catch (error) {
        console.error("Erro ao carregar dados:", error);
    }
};

function atualizarMetricas() {
    const total = cacheOnibus.length;
    const operando = cacheOnibus.filter(o => o.status === 'Operando').length;
    const parados = cacheOnibus.filter(o => o.status === 'Parado' || o.status === 'Em Manutenção').length;
    
    const semCampanha = cacheOnibus.filter(o => 
        (!o.campanha || o.campanha.trim() === '') && 
        (!o.campanha_backseat || o.campanha_backseat.trim() === '')
    ).length;

    document.getElementById("metric-total").innerText = total;
    document.getElementById("metric-operando").innerText = operando;
    document.getElementById("metric-parados").innerText = parados;
    document.getElementById("metric-sem-campanha").innerText = semCampanha;
}

window.renderizarTabelaOnibus = function(lista) {
    const tbody = document.getElementById("tabela-onibus");
    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-gray-500">Nenhum ônibus cadastrado.</td></tr>`;
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
        const backseatTexto = o.campanha_backseat && o.campanha_backseat.trim() !== '' ? `<span class="px-2 py-0.5 text-xs font-medium rounded bg-purple-50 text-purple-700">${o.campanha_backseat}</span>` : `<span class="text-gray-400 italic">Sem Backseat</span>`;

        return `
            <tr class="hover:bg-gray-50 transition border-b border-gray-100">
                <td class="py-3 px-6 font-semibold text-gray-900">${o.prefixo}</td>
                <td class="py-3 px-6 text-gray-700">${garagemTexto}</td>
                <td class="py-3 px-6 text-gray-700">${linhaTexto}</td>
                <td class="py-3 px-6">${badgeStatus}</td>
                <td class="py-3 px-6">${campanhaTexto}</td>
                <td class="py-3 px-6">${backseatTexto}</td>
                <td class="py-3 px-6 text-center space-x-2">
                    <button onclick="editarOnibus('${o.id}')" title="Editar" class="text-blue-600 hover:text-blue-800 p-1"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button onclick="deletarOnibus('${o.id}')" title="Excluir" class="text-rose-600 hover:text-rose-800 p-1"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');
};

window.renderizarTabelaCampanhas = function() {
    const hoje = new Date().toISOString().split('T')[0];

    const normais = cacheCampanhas.filter(c => c.fim >= hoje && (c.tipo === 'normal' || !c.tipo));
    const backseats = cacheCampanhas.filter(c => c.fim >= hoje && c.tipo === 'backseat');
    const vencidas = cacheCampanhas.filter(c => c.fim < hoje);

    gerarLinhasHTML(normais, "tabela-campanhas-normal", "Nenhuma campanha tradicional ativa.");
    gerarLinhasHTML(backseats, "tabela-campanhas-backseat", "Nenhuma campanha backseat ativa.");
    gerarLinhasHTML(vencidas, "tabela-campanhas-vencidas", "Nenhuma campanha no histórico de vencidas.");
};

function gerarLinhasHTML(lista, tbodyId, mensagemVazio) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    
    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-gray-500">${mensagemVazio}</td></tr>`;
        return;
    }

    const hoje = new Date().toISOString().split('T')[0];

    tbody.innerHTML = lista.map(c => {
        let statusBadge = '';
        if (hoje < c.inicio) statusBadge = `<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Agendada</span>`;
        else if (hoje > c.fim) statusBadge = `<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800">Vencida</span>`;
        else statusBadge = `<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">Ativa</span>`;

        const qtdVeiculos = c.veiculos ? c.veiculos.length : cacheOnibus.filter(o => o.campanha === c.nome || o.campanha_backseat === c.nome).length;
        
        const icone = c.tipo === 'backseat' ? 'fa-chair' : 'fa-bullhorn';
        const corIcone = c.tipo === 'backseat' ? 'text-purple-600' : 'text-indigo-600';

        return `
            <tr class="hover:bg-gray-50 transition border-b border-gray-100">
                <td class="py-3 px-6 font-semibold text-gray-900">
                    <button onclick="abrirDetalhesCampanha('${c.id}')" class="${corIcone} hover:underline text-left font-semibold flex items-center space-x-2">
                        <i class="fa-solid ${icone} text-xs"></i>
                        <span>${c.nome}</span>
                    </button>
                </td>
                <td class="py-3 px-6 text-gray-700 font-medium">${qtdVeiculos} veículos</td>
                <td class="py-3 px-6 text-gray-700">${formatarData(c.inicio)}</td>
                <td class="py-3 px-6 text-gray-700">${formatarData(c.fim)}</td>
                <td class="py-3 px-6">${statusBadge}</td>
                <td class="py-3 px-6 text-center space-x-2">
                    <button onclick="editarCampanha('${c.id}')" title="Editar Campanha" class="text-blue-600 hover:text-blue-800 p-1"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button onclick="deletarCampanha('${c.id}', '${c.nome}', '${c.tipo || 'normal'}')" title="Excluir Definitivamente" class="text-rose-600 hover:text-rose-800 p-1"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

window.abrirDetalhesCampanha = function(idCampanha) {
    const campanha = cacheCampanhas.find(c => c.id === idCampanha);
    if (!campanha) return;

    document.getElementById("modal-detalhes-titulo").innerText = campanha.nome + (campanha.tipo === 'backseat' ? ' (Backseat)' : '');
    document.getElementById("modal-detalhes-inicio").innerText = formatarData(campanha.inicio);
    document.getElementById("modal-detalhes-vencimento").innerText = formatarData(campanha.fim);

    let onibusDaCampanha = [];

    if (campanha.veiculos && campanha.veiculos.length > 0) {
        onibusDaCampanha = cacheOnibus.filter(o => campanha.veiculos.includes(o.prefixo));
    } else {
        onibusDaCampanha = cacheOnibus.filter(o => o.campanha === campanha.nome || o.campanha_backseat === campanha.nome);
    }

    const tbody = document.getElementById("tabela-detalhes-onibus");

    if (onibusDaCampanha.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-gray-500 italic">Nenhum veículo encontrado no sistema.</td></tr>`;
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
        (o.campanha && o.campanha.toLowerCase().includes(termo)) ||
        (o.campanha_backseat && o.campanha_backseat.toLowerCase().includes(termo)) ||
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
            if (objAntigo && objAntigo.campanha_backseat) dadosOnibus.campanha_backseat = objAntigo.campanha_backseat;

            await updateDoc(doc(db, "onibus", id), dadosOnibus);
        } else {
            dadosOnibus.campanha = "";
            dadosOnibus.campanha_backseat = "";
            await addDoc(collection(db, "onibus"), dadosOnibus);
        }
        fecharModalOnibus();
        carregarDados();
    } catch (error) {
        console.error("Erro ao salvar ônibus:", error);
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

// MODAL CAMPANHA (SERVE PARA NORMAL E BACKSEAT)
window.abrirModalCampanha = function(tipo = 'normal') {
    document.getElementById("form-campanha").reset();
    document.getElementById("campanha-id").value = ""; // Limpa ID para criar nova
    document.getElementById("campanha-tipo").value = tipo;
    
    const tituloEl = document.getElementById("titulo-modal-campanha");
    if (tipo === 'backseat') {
        tituloEl.innerText = "Cadastrar Nova Campanha Backseat";
    } else {
        tituloEl.innerText = "Cadastrar Nova Campanha";
    }

    const container = document.getElementById("lista-checkbox-onibus");
    if (cacheOnibus.length === 0) {
        container.innerHTML = `<p class="text-xs text-gray-500 italic p-2">Nenhum ônibus cadastrado.</p>`;
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

// FUNÇÃO NOVA: ABRIR CAMPANHA EXISTENTE PARA EDIÇÃO
window.editarCampanha = function(id) {
    const campanha = cacheCampanhas.find(c => c.id === id);
    if (!campanha) return;

    document.getElementById("form-campanha").reset();
    document.getElementById("campanha-id").value = campanha.id;
    document.getElementById("campanha-tipo").value = campanha.tipo || 'normal';
    document.getElementById("campanha-nome").value = campanha.nome;
    document.getElementById("campanha-inicio").value = campanha.inicio;
    document.getElementById("campanha-fim").value = campanha.fim;

    const tituloEl = document.getElementById("titulo-modal-campanha");
    tituloEl.innerText = (campanha.tipo === 'backseat') ? "Editar Campanha Backseat" : "Editar Campanha";

    const container = document.getElementById("lista-checkbox-onibus");
    const veiculosMarcados = campanha.veiculos || [];
    
    if (cacheOnibus.length === 0) {
        container.innerHTML = `<p class="text-xs text-gray-500 italic p-2">Nenhum ônibus cadastrado.</p>`;
    } else {
        container.innerHTML = cacheOnibus.map(o => {
            const checked = veiculosMarcados.includes(o.prefixo) ? "checked" : "";
            return `
            <label class="flex items-center space-x-2 p-1 hover:bg-white rounded cursor-pointer">
                <input type="checkbox" name="onibus-checkbox" value="${o.prefixo}" ${checked} class="rounded text-indigo-600 focus:ring-indigo-500">
                <span class="text-xs font-medium text-gray-800">Prefixo: ${o.prefixo} ${o.linha ? '(' + o.linha + ')' : ''}</span>
            </label>
            `;
        }).join('');
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
    const id = document.getElementById("campanha-id").value; // Verifica se tem ID (Edição)
    const nome = document.getElementById("campanha-nome").value.trim();
    const inicio = document.getElementById("campanha-inicio").value;
    const fim = document.getElementById("campanha-fim").value;
    const tipo = document.getElementById("campanha-tipo").value;

    const checkboxes = document.querySelectorAll('input[name="onibus-checkbox"]:checked');
    const prefixosSelecionados = Array.from(checkboxes).map(cb => cb.value);

    if (prefixosSelecionados.length === 0) {
        alert("Selecione pelo menos um ônibus para aplicar a campanha.");
        return;
    }

    try {
        let nomeAntigo = null;

        if (id) {
            // EDIÇÃO DE CAMPANHA EXISTENTE
            const campAntiga = cacheCampanhas.find(c => c.id === id);
            if (campAntiga) nomeAntigo = campAntiga.nome;

            await updateDoc(doc(db, "campanhas", id), { 
                nome, inicio, fim, tipo, veiculos: prefixosSelecionados 
            });
        } else {
            // CRIAÇÃO DE NOVA CAMPANHA
            await addDoc(collection(db, "campanhas"), { 
                nome, inicio, fim, tipo, veiculos: prefixosSelecionados 
            });
        }

        // ATUALIZA OS ÔNIBUS NO BANCO
        for (let o of cacheOnibus) {
            let updates = {};
            let atualizou = false;

            // Passo 1: Se era dessa campanha e foi desmarcado, limpa.
            if (nomeAntigo) {
                if (tipo === 'backseat' && o.campanha_backseat === nomeAntigo) {
                    updates.campanha_backseat = "";
                    atualizou = true;
                } else if (tipo === 'normal' && o.campanha === nomeAntigo) {
                    updates.campanha = "";
                    atualizou = true;
                }
            }

            // Passo 2: Se foi marcado na lista atual, aplica o nome (mesmo se for edição de nome).
            if (prefixosSelecionados.includes(o.prefixo)) {
                if (tipo === 'backseat') {
                    updates.campanha_backseat = nome;
                } else {
                    updates.campanha = nome;
                }
                atualizou = true;
            }

            if (atualizou) {
                await updateDoc(doc(db, "onibus", o.id), updates);
            }
        }

        fecharModalCampanha();
        carregarDados();
    } catch (error) {
        console.error("Erro ao salvar campanha:", error);
    }
};

window.deletarCampanha = async function(id, nomeCampanha, tipo) {
    if (confirm(`Deseja realmente excluir a campanha "${nomeCampanha}" DEFINITIVAMENTE?`)) {
        try {
            for (let o of cacheOnibus) {
                if (tipo === 'backseat' && o.campanha_backseat === nomeCampanha) {
                    await updateDoc(doc(db, "onibus", o.id), { campanha_backseat: "" });
                } else if (tipo === 'normal' && o.campanha === nomeCampanha) {
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

window.addEventListener('DOMContentLoaded', carregarDados);
