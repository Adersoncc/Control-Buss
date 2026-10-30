// Control-Buss (VERSÃO DEFINITIVA COM CORREÇÕES DE CONTAGEM)
// new import pictures
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
// import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";


// CONFIGURAÇÃO DO FIREBASE
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
const storage = getStorage(app);

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

/* window.carregarDados = async function() {
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
}; */
// Variável de controle para saber se as duas coleções já carregaram a 1ª vez
let statusCarregamento = { onibus: false, campanhas: false };

window.carregarDados = function() {
    // 1. Escuta contínua da coleção "onibus"
    onSnapshot(collection(db, "onibus"), (snapshot) => {
        cacheOnibus = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        cacheOnibus.sort((a, b) => Number(a.prefixo) - Number(b.prefixo));
        
        statusCarregamento.onibus = true;
        processarAtualizacaoTempoReal();
    }, (error) => {
        console.error("Erro no listener de ônibus:", error);
    });

    // 2. Escuta contínua da coleção "campanhas"
    onSnapshot(collection(db, "campanhas"), (snapshot) => {
        cacheCampanhas = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        cacheCampanhas.reverse(); 
        
        statusCarregamento.campanhas = true;
        processarAtualizacaoTempoReal();
    }, (error) => {
        console.error("Erro no listener de campanhas:", error);
    });
};

// Nova função central para processar as mudanças em tempo real
async function processarAtualizacaoTempoReal() {
    // Só atualiza a tela se tanto os ônibus quanto as campanhas já tiverem sido baixados
    if (!statusCarregamento.onibus || !statusCarregamento.campanhas) return;

    // Executa sua regra de desvincular campanhas vencidas
    await verificarCampanhasVencidas();

    // Atualiza os cards superiores (Frota, Livres, etc)
    atualizarMetricas();
    
    // Atualiza as tabelas de campanhas
    renderizarTabelaCampanhas();

    // Atualiza a tabela de ônibus (respeitando se o usuário está com o filtro/pesquisa ativo)
    const inputFiltro = document.getElementById("filtro-onibus");
    if (inputFiltro && inputFiltro.value.trim() !== "") {
        window.filtrarOnibus(); // Aplica o filtro em cima dos dados novos
    } else {
        renderizarTabelaOnibus(cacheOnibus);
    }
}

// CORREÇÃO 1: Matemática rigorosa dos veículos livres baseada nas campanhas ativas
function atualizarMetricas() {
    const total = cacheOnibus.length;
    const operando = cacheOnibus.filter(o => o.status === 'Operando').length;
    const parados = cacheOnibus.filter(o => o.status === 'Parado' || o.status === 'Em Manutenção').length;
    
    const hoje = new Date().toISOString().split('T')[0];

    const campanhasAtivasTradicionais = cacheCampanhas.filter(c => c.fim >= hoje && (c.tipo === 'normal' || !c.tipo));
    const campanhasAtivasBackseat = cacheCampanhas.filter(c => c.fim >= hoje && c.tipo === 'backseat');

    const veiculosOcupadosTradicional = new Set();
    campanhasAtivasTradicionais.forEach(c => {
        if (c.veiculos) c.veiculos.forEach(v => veiculosOcupadosTradicional.add(v));
    });

    const veiculosOcupadosBackseat = new Set();
    campanhasAtivasBackseat.forEach(c => {
        if (c.veiculos) c.veiculos.forEach(v => veiculosOcupadosBackseat.add(v));
    });

    const dispTradicional = total - veiculosOcupadosTradicional.size;
    const dispBackseat = total - veiculosOcupadosBackseat.size;

    if (document.getElementById("metric-total")) document.getElementById("metric-total").innerText = total;
    if (document.getElementById("metric-operando")) document.getElementById("metric-operando").innerText = operando;
    if (document.getElementById("metric-parados")) document.getElementById("metric-parados").innerText = parados;
    
    if (document.getElementById("metric-livres-tradicional")) document.getElementById("metric-livres-tradicional").innerText = dispTradicional;
    if (document.getElementById("metric-livres-backseat")) document.getElementById("metric-livres-backseat").innerText = dispBackseat;
    
    if (document.getElementById("metric-sem-campanha")) {
        document.getElementById("metric-sem-campanha").innerText = dispTradicional;
    }
}

window.renderizarTabelaOnibus = function(lista) {
    const tbody = document.getElementById("tabela-onibus");
    if (!tbody) return;
    
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
        // button new picture
        //const iconeVerFoto = o.foto_url ? `<a href="${o.foto_url}" target="_blank" class="text-blue-500 text-xs ml-2 hover:underline"><i class="fa-solid fa-image"></i> Ver</a>` : '';
       const iconeVerFoto = o.foto_url ? `<button onclick="abrirModalVerFoto('${o.foto_url}')" class="text-blue-500 text-xs ml-2 hover:underline"><i class="fa-solid fa-image"></i> Ver</button>` : '';
       const btnFoto = `<button onclick="abrirModalFoto('${o.id}', '${o.prefixo}')" title="Comprovação Fotográfica" class="text-emerald-600 hover:text-emerald-800 p-1"><i class="fa-solid fa-camera"></i></button>`;

        return `
            <tr class="hover:bg-gray-50 transition border-b border-gray-100">
                <td class="py-3 px-6 font-semibold text-gray-900">${o.prefixo} ${iconeVerFoto}</td>
                <td class="py-3 px-6 text-gray-700">${garagemTexto}</td>
                <td class="py-3 px-6 text-gray-700">${linhaTexto}</td>
                <td class="py-3 px-6">${badgeStatus}</td>
                <td class="py-3 px-6">${campanhaTexto}</td>
                <td class="py-3 px-6">${backseatTexto}</td>
                <td class="py-3 px-6 text-center space-x-2">
                    ${btnFoto}
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

    const hoje = new Date().toLocaleDateString('en-CA');

    tbody.innerHTML = lista.map(c => {
        let statusBadge = '';
        if (hoje < c.inicio) statusBadge = `<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Agendada</span>`;
        else if (hoje > c.fim) statusBadge = `<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800">Vencida</span>`;
        else statusBadge = `<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">Ativa</span>`;

        // CORREÇÃO 2: Lógica visual X de Y adaptada para campanhas novas e antigas
        const historico = c.historico_veiculos && c.historico_veiculos.length > 0 ? c.historico_veiculos : (c.veiculos || []);
        const qtdOriginal = historico.length; 
        
        const qtdAtivos = cacheOnibus.filter(o =>
            c.tipo === 'backseat' ? o.campanha_backseat === c.nome : o.campanha === c.nome
        ).length;

        let textoVeiculos = '';
        
        if (hoje > c.fim) {
            textoVeiculos = `${qtdOriginal} veículos`;
        } else {
            if (qtdAtivos === qtdOriginal || qtdOriginal === 0) {
                textoVeiculos = `${qtdAtivos} veículos`;
            } else {
                textoVeiculos = `<span class="text-blue-700 font-bold">${qtdAtivos} ativos</span> <br><span class="text-xs text-gray-500">(de ${qtdOriginal} cadastrados)</span>`;
            }
        }

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
                <td class="py-3 px-6 text-gray-700 font-medium leading-tight">${textoVeiculos}</td>
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

    const historico = campanha.historico_veiculos || campanha.veiculos || [];
    let onibusDaCampanha = [];

    if (historico.length > 0) {
        onibusDaCampanha = cacheOnibus.filter(o => historico.includes(o.prefixo));
    } else {
        onibusDaCampanha = cacheOnibus.filter(o => o.campanha === campanha.nome || o.campanha_backseat === campanha.nome);
    }

    const tbody = document.getElementById("tabela-detalhes-onibus");
    const hoje = new Date().toLocaleDateString('en-CA');

    if (onibusDaCampanha.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-gray-500 italic">Nenhum veículo encontrado no sistema.</td></tr>`;
    } else {
        tbody.innerHTML = onibusDaCampanha.map(o => {
            let badgeStatus = '';
            const campanhaAtual = campanha.tipo === 'backseat' ? o.campanha_backseat : o.campanha;

            if (campanhaAtual && campanhaAtual !== campanha.nome && hoje <= campanha.fim) {
                badgeStatus = `<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">Movido p/ ${campanhaAtual}</span>`;
            } else {
                if (o.status === 'Operando') badgeStatus = `<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">Operando</span>`;
                else if (o.status === 'Em Manutenção') badgeStatus = `<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">Manutenção</span>`;
                else badgeStatus = `<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-800">Parado</span>`;
            }

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
        //carregarDados();
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
            //carregarDados();
        } catch (error) {
            console.error("Erro ao excluir ônibus:", error);
        }
    }
};

window.abrirModalCampanha = function(tipo = 'normal') {
    document.getElementById("form-campanha").reset();
    document.getElementById("campanha-id").value = ""; 
    document.getElementById("campanha-tipo").value = tipo;
    
    const tituloEl = document.getElementById("titulo-modal-campanha");
    tituloEl.innerText = tipo === 'backseat' ? "Cadastrar Nova Campanha Backseat" : "Cadastrar Nova Campanha";

    const container = document.getElementById("lista-checkbox-onibus");
    if (cacheOnibus.length === 0) {
        container.innerHTML = `<p class="text-xs text-gray-500 italic p-2">Nenhum ônibus cadastrado.</p>`;
    } else {
        container.innerHTML = cacheOnibus.map(o => {
            const ocupado = (tipo === 'normal') ? o.campanha : o.campanha_backseat;
            const badgeOcupado = ocupado ? `<span class="ml-2 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">Em uso: ${ocupado}</span>` : `<span class="ml-2 text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">Livre</span>`;

            return `
            <label class="flex items-center space-x-2 p-1.5 hover:bg-gray-100 rounded cursor-pointer border-b border-gray-200">
                <input type="checkbox" name="onibus-checkbox" value="${o.prefixo}" class="rounded text-indigo-600 focus:ring-indigo-500">
                <span class="text-xs font-medium text-gray-800">Prefixo: ${o.prefixo} ${o.linha ? '(' + o.linha + ')' : ''}</span>
                ${badgeOcupado}
            </label>
        `}).join('');
    }
    document.getElementById("modal-campanha").classList.remove("hidden");
};

window.editarCampanha = function(id) {
    const campanha = cacheCampanhas.find(c => c.id === id);
    if (!campanha) return;

    const tipo = campanha.tipo || 'normal';

    document.getElementById("form-campanha").reset();
    document.getElementById("campanha-id").value = campanha.id;
    document.getElementById("campanha-tipo").value = tipo;
    document.getElementById("campanha-nome").value = campanha.nome;
    document.getElementById("campanha-inicio").value = campanha.inicio;
    document.getElementById("campanha-fim").value = campanha.fim;

    document.getElementById("titulo-modal-campanha").innerText = (tipo === 'backseat') ? "Editar Campanha Backseat" : "Editar Campanha";

    const container = document.getElementById("lista-checkbox-onibus");
    
    if (cacheOnibus.length === 0) {
        container.innerHTML = `<p class="text-xs text-gray-500 italic p-2">Nenhum ônibus cadastrado.</p>`;
    } else {
        container.innerHTML = cacheOnibus.map(o => {
            const ocupadoAtual = (tipo === 'normal') ? o.campanha : o.campanha_backseat;
            const checked = (ocupadoAtual === campanha.nome) ? "checked" : "";

            let badge = '';
            if (checked) {
                badge = `<span class="ml-2 text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">Nesta Campanha</span>`;
            } else if (ocupadoAtual) {
                badge = `<span class="ml-2 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">Em uso: ${ocupadoAtual}</span>`;
            } else {
                badge = `<span class="ml-2 text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">Livre</span>`;
            }

            return `
            <label class="flex items-center space-x-2 p-1.5 hover:bg-gray-100 rounded cursor-pointer border-b border-gray-200">
                <input type="checkbox" name="onibus-checkbox" value="${o.prefixo}" ${checked} class="rounded text-indigo-600 focus:ring-indigo-500">
                <span class="text-xs font-medium text-gray-800">Prefixo: ${o.prefixo} ${o.linha ? '(' + o.linha + ')' : ''}</span>
                ${badge}
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

// CORREÇÃO 3: Varredura Rigorosa na hora de salvar, limpando campanhas antigas automaticamente
window.salvarCampanha = async function(event) {
    event.preventDefault();
    const id = document.getElementById("campanha-id").value; 
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
        let historico = prefixosSelecionados;

        if (id) {
            const campAntiga = cacheCampanhas.find(c => c.id === id);
            if (campAntiga) {
                nomeAntigo = campAntiga.nome;
                const historicoAntigo = campAntiga.historico_veiculos || campAntiga.veiculos || [];
                historico = [...new Set([...historicoAntigo, ...prefixosSelecionados])];
            }

            await updateDoc(doc(db, "campanhas", id), { 
                nome, inicio, fim, tipo, veiculos: prefixosSelecionados, historico_veiculos: historico 
            });
        } else {
            await addDoc(collection(db, "campanhas"), { 
                nome, inicio, fim, tipo, veiculos: prefixosSelecionados, historico_veiculos: historico 
            });
        }

        const promessasAtualizacao = [];

        // PASSO 1: Varredura limpando as outras campanhas
        for (const prefixo of prefixosSelecionados) {
            const onibusNoBanco = cacheOnibus.find(o => o.prefixo === prefixo);
            if (onibusNoBanco) {
                const campanhaAntiga = tipo === 'normal' ? onibusNoBanco.campanha : onibusNoBanco.campanha_backseat;
                
                if (campanhaAntiga && campanhaAntiga !== nome) {
                    const campanhaParaLimpar = cacheCampanhas.find(c => c.nome === campanhaAntiga && (c.tipo === tipo || (!c.tipo && tipo === 'normal')));
                    
                    if (campanhaParaLimpar) {
                        const novaLista = (campanhaParaLimpar.veiculos || []).filter(v => v !== prefixo);
                        promessasAtualizacao.push(updateDoc(doc(db, "campanhas", campanhaParaLimpar.id), { veiculos: novaLista }));
                    }
                }
            }
        }

        // PASSO 2: Atualizando os ônibus
        for (let o of cacheOnibus) {
            let updatesOnibus = {};
            let alterouOnibus = false;

            if (tipo === 'normal') {
                if (prefixosSelecionados.includes(o.prefixo)) {
                    if (o.campanha !== nome) {
                        updatesOnibus.campanha = nome;
                        alterouOnibus = true;
                    }
                } else if (o.campanha === nome) { 
                    updatesOnibus.campanha = "";
                    alterouOnibus = true;
                }
            } else if (tipo === 'backseat') {
                 if (prefixosSelecionados.includes(o.prefixo)) {
                    if (o.campanha_backseat !== nome) {
                        updatesOnibus.campanha_backseat = nome;
                        alterouOnibus = true;
                    }
                } else if (o.campanha_backseat === nome) {
                    updatesOnibus.campanha_backseat = "";
                    alterouOnibus = true;
                }
            }

            if (alterouOnibus) {
                promessasAtualizacao.push(updateDoc(doc(db, "onibus", o.id), updatesOnibus));
            }
        }

        if (promessasAtualizacao.length > 0) {
            await Promise.all(promessasAtualizacao);
        }

        fecharModalCampanha();
        //carregarDados();
    } catch (error) {
        console.error("Erro ao salvar campanha:", error);
        alert("Erro ao salvar a campanha. Verifique o console.");
    }
};

window.deletarCampanha = async function(id, nomeCampanha, tipo) {
    if (confirm(`Deseja realmente excluir a campanha "${nomeCampanha}"?`)) {
        try {
            await deleteDoc(doc(db, "campanhas", id));
            
            const promessasOnibus = [];
            
            for (let o of cacheOnibus) {
                let alterado = false;
                let updates = {};

                if (tipo === 'normal' && o.campanha === nomeCampanha) {
                    updates.campanha = "";
                    alterado = true;
                } else if (tipo === 'backseat' && o.campanha_backseat === nomeCampanha) {
                    updates.campanha_backseat = "";
                    alterado = true;
                }

                if (alterado) {
                    promessasOnibus.push(updateDoc(doc(db, "onibus", o.id), updates));
                }
            }

            if (promessasOnibus.length > 0) {
                await Promise.all(promessasOnibus);
            }

            //carregarDados();
        } catch (error) {
            console.error("Erro ao excluir campanha:", error);
            alert("Erro ao excluir. Verifique o console.");
        }
    }
};
// --- SISTEMA DE VISUALIZAÇÃO RÁPIDA DE ÔNIBUS LIVRES ---

window.abrirModalLivres = function(tipo) {
    const hoje = new Date().toISOString().split('T')[0];
    
    // 1. Isolar campanhas ativas do tipo clicado (Tradicional ou Backseat)
    const campanhasAtivas = cacheCampanhas.filter(c => c.fim >= hoje && (tipo === 'normal' ? (c.tipo === 'normal' || !c.tipo) : c.tipo === 'backseat'));
    
    // 2. Extrair todos os veículos que estão atualmente com adesivo neste tipo
    const veiculosOcupados = new Set();
    campanhasAtivas.forEach(c => {
        if (c.veiculos) c.veiculos.forEach(v => veiculosOcupados.add(v));
    });

    // 3. Filtrar veículos 100% livres (também ocultamos os que estão "Parados/Manutenção")
    const onibusLivres = cacheOnibus.filter(o => !veiculosOcupados.has(o.prefixo) && o.status === 'Operando');

    // 4. Agrupar os veículos resultantes por Garagem
    const garagens = {};
    onibusLivres.forEach(o => {
        const g = (o.garagem && o.garagem.trim() !== '') ? o.garagem : "Outros (Sem Garagem)";
        if (!garagens[g]) garagens[g] = [];
        garagens[g].push(o.prefixo);
    });

    // 5. Configurar Cabeçalho do Modal
    const titulo = document.getElementById("titulo-modal-livres");
    const conteudo = document.getElementById("conteudo-modal-livres");

    titulo.innerHTML = tipo === 'normal' 
        ? `<i class="fa-solid fa-bullhorn text-indigo-600 mr-2"></i> Livres (Tradicional)` 
        : `<i class="fa-solid fa-chair text-purple-600 mr-2"></i> Livres (Backseat)`;

    // 6. Gerar os blocos visuais de Garagem + Contagem + Prefixos
    if (Object.keys(garagens).length === 0) {
        conteudo.innerHTML = `<div class="bg-white p-6 rounded-xl border border-gray-200 text-center"><p class="text-gray-500 font-medium">Nenhum veículo operando e livre no momento.</p></div>`;
    } else {
        const garagensOrdenadas = Object.keys(garagens).sort();
        let html = '';
        
        garagensOrdenadas.forEach(g => {
            // Ordena os números dos ônibus do menor pro maior (Ex: 4001, 4002...)
            const prefixos = garagens[g].sort((a, b) => Number(a) - Number(b));
            const qtd = prefixos.length;
            const corBadge = tipo === 'normal' ? 'bg-indigo-100 text-indigo-800' : 'bg-purple-100 text-purple-800';
            
            html += `
            <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div class="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                    <h4 class="font-bold text-gray-800 text-sm uppercase tracking-wider">${g}</h4>
                    <span class="${corBadge} text-xs font-bold px-3 py-1 rounded-full border border-opacity-20 border-current shadow-sm">${qtd} Livre${qtd > 1 ? 's' : ''}</span>
                </div>
                <div class="p-4 flex flex-wrap gap-2.5">
                    ${prefixos.map(p => `
                        <span class="bg-white border-2 border-gray-200 text-gray-800 text-sm font-bold px-3 py-1.5 rounded-lg shadow-sm hover:border-gray-400 transition cursor-default">
                            ${p}
                        </span>
                    `).join('')}
                </div>
            </div>
            `;
        });
        conteudo.innerHTML = html;
    }

    // Abre o modal
    document.getElementById("modal-livres").classList.remove("hidden");
};

window.fecharModalLivres = function() {
    document.getElementById("modal-livres").classList.add("hidden");
};
let arquivoFotoAtual = null;

// NOVA FUNÇÃO: Comprime a imagem antes do envio (Coração da otimização)
function comprimirImagem(file, maxWidth, maxHeight, quality) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // Mantém a proporção da foto, limitando pelo tamanho máximo
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round(height * (maxWidth / width));
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round(width * (maxHeight / height));
                        height = maxHeight;
                    }
                }

                // Cria o canvas (tela virtual) para desenhar a imagem redimensionada
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Converte a imagem do canvas para um arquivo Blob (JPEG otimizado)
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', quality);
            };
        };
    });
}

window.abrirModalFoto = function(id, prefixo) {
    document.getElementById("foto-onibus-id").value = id;
    document.getElementById("foto-prefixo-texto").innerText = `Anexar foto ao Prefixo: ${prefixo}`;
    
    // Reseta o modal
    document.getElementById("input-foto").value = "";
    document.getElementById("preview-container").classList.add("hidden");
    document.getElementById("imagem-preview").src = "";
    document.getElementById("status-upload").classList.add("hidden");
    document.getElementById("btn-enviar-foto").disabled = true;
    arquivoFotoAtual = null;

    document.getElementById("modal-foto").classList.remove("hidden");
};

window.fecharModalFoto = function() {
    document.getElementById("modal-foto").classList.add("hidden");
};

// Envio da foto
// Comprime na hora que o usuário seleciona ou tira a foto
window.mostrarPreviewFoto = async function(event) {
    const file = event.target.files[0];
    if (file) {
        // Mostra um aviso rápido na tela pro usuário saber que tá carregando
        document.getElementById("status-upload").innerText = "Otimizando imagem...";
        document.getElementById("status-upload").classList.remove("hidden");

        // Chama a função de compressão: 
        // Max 1280px (ótimo para telas de celular/PC) e 75% de qualidade
        const blobComprimido = await comprimirImagem(file, 1280, 1280, 0.75);
        arquivoFotoAtual = blobComprimido;

        // Cria uma URL temporária só pro preview
        document.getElementById("imagem-preview").src = URL.createObjectURL(blobComprimido);
        document.getElementById("preview-container").classList.remove("hidden");
        document.getElementById("btn-enviar-foto").disabled = false;
        
        // Esconde o aviso de otimização
        document.getElementById("status-upload").classList.add("hidden");
        document.getElementById("status-upload").innerText = "Enviando foto, aguarde...";
    }
};

window.salvarFotoBus = async function() {
    if (!arquivoFotoAtual) return;

    const id = document.getElementById("foto-onibus-id").value;
    const prefixo = document.getElementById("foto-prefixo-texto").innerText.split(": ")[1];
    const btn = document.getElementById("btn-enviar-foto");
    const status = document.getElementById("status-upload");

    try {
        btn.disabled = true;
        btn.innerText = "Enviando...";
        status.classList.remove("hidden");

        // Forçamos a extensão .jpg, pois a compressão converteu tudo para image/jpeg
        const nomeArquivo = `${prefixo}_${Date.now()}.jpg`;
        const caminhoRef = ref(storage, `fotos_garagem/${nomeArquivo}`);

        // O uploadBytes aceita o Blob comprimido sem problemas
        await uploadBytes(caminhoRef, arquivoFotoAtual);
        const urlDownload = await getDownloadURL(caminhoRef);

        await updateDoc(doc(db, "onibus", id), {
            foto_url: urlDownload
        });

        alert("Foto anexada com sucesso!");
        fecharModalFoto();
    } catch (error) {
        console.error("Erro ao subir a foto:", error);
        alert("Erro ao enviar a foto. Verifique a conexão.");
        btn.disabled = false;
        btn.innerText = "Salvar Foto";
        status.classList.add("hidden");
    }
};



window.onload = carregarDados;
