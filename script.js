import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// CONFIGURAÇÕES DO FIREBASE (Insira suas credenciais)
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyC63Q1eBXVFz5CkLxxWMAfDN6uxWwy_oU8",
  authDomain: "controle-de-campanhas-55ae2.firebaseapp.com",
  projectId: "controle-de-campanhas-55ae2",
  storageBucket: "controle-de-campanhas-55ae2.firebasestorage.app",
  messagingSenderId: "923348616466",
  appId: "1:923348616466:web:8bad212b45af31028ddfcb"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let buses = [];
let campaigns = [];

// Iniciar escuta dos dados em tempo real após carregar a página
document.addEventListener("DOMContentLoaded", () => {
    initFirebaseListeners();
});

function initFirebaseListeners() {
    // Escutar alterações na coleção 'buses' em tempo real
    onSnapshot(collection(db, "buses"), (snapshot) => {
        buses = [];
        snapshot.forEach((docItem) => {
            buses.push({ id: docItem.id, ...docItem.data() });
        });
        render();
    });

    // Escutar alterações na coleção 'campaigns' em tempo real
    onSnapshot(collection(db, "campaigns"), (snapshot) => {
        campaigns = [];
        snapshot.forEach((docItem) => {
            campaigns.push({ id: docItem.id, ...docItem.data() });
        });
        render();
    });
}

// Funções globais de controle de modais
window.openModal = function(id) {
    document.getElementById(id).classList.remove('hidden');
    document.getElementById(id).classList.add('flex');
    if(id === 'busModal') updateCampaignSelect();
}

window.closeModal = function(id) {
    document.getElementById(id).classList.remove('flex');
    document.getElementById(id).classList.add('hidden');
}

function updateCampaignSelect() {
    const select = document.getElementById('busCampaign');
    select.innerHTML = '<option value="Sem Campanha">Sem Campanha</option>';
    campaigns.forEach(c => {
        select.innerHTML += `<option value="${c.name}">${c.name}</option>`;
    });
}

// Adicionar Novo Ônibus
window.addBus = async function(event) {
    event.preventDefault();
    const bus = {
        prefix: document.getElementById('busPrefix').value,
        line: document.getElementById('busLine').value,
        status: document.getElementById('busStatus').value,
        campaign: document.getElementById('busCampaign').value
    };
    try {
        await addDoc(collection(db, "buses"), bus);
        document.getElementById('busForm').reset();
        closeModal('busModal');
    } catch (error) {
        console.error("Erro ao adicionar ônibus: ", error);
        alert("Erro ao salvar no Firebase. Verifique suas credenciais.");
    }
}

// Adicionar Nova Campanha
window.addCampaign = async function(event) {
    event.preventDefault();
    const camp = {
        name: document.getElementById('campName').value,
        start: document.getElementById('campStart').value,
        end: document.getElementById('campEnd').value
    };
    try {
        await addDoc(collection(db, "campaigns"), camp);
        document.getElementById('campaignForm').reset();
        closeModal('campaignModal');
    } catch (error) {
        console.error("Erro ao adicionar campanha: ", error);
        alert("Erro ao salvar no Firebase. Verifique suas credenciais.");
    }
}

// Excluir Ônibus
window.deleteBus = async function(id) {
    if(confirm("Deseja realmente excluir este ônibus?")) {
        try {
            await deleteDoc(doc(db, "buses", id));
        } catch (error) {
            console.error("Erro ao excluir ônibus: ", error);
        }
    }
}

// Excluir Campanha
window.deleteCampaign = async function(id) {
    if(confirm("Deseja realmente excluir esta campanha?")) {
        try {
            await deleteDoc(doc(db, "campaigns", id));
        } catch (error) {
            console.error("Erro ao excluir campanha: ", error);
        }
    }
}

// Renderizar dados na tela e atualizar métricas
function render() {
    // Métricas
    document.getElementById('total-fleet').innerText = buses.length;
    document.getElementById('operating-fleet').innerText = buses.filter(b => b.status === 'Operando').length;
    document.getElementById('maintenance-fleet').innerText = buses.filter(b => b.status === 'Manutenção' || b.status === 'Parado').length;
    document.getElementById('no-campaign-fleet').innerText = buses.filter(b => b.campaign === 'Sem Campanha').length;

    // Tabela Frota
    const busTable = document.getElementById('bus-table-body');
    if (buses.length === 0) {
        busTable.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-400">Nenhum ônibus cadastrado.</td></tr>`;
    } else {
        busTable.innerHTML = buses.map(b => `
            <tr class="hover:bg-blue-50/30 border-b border-slate-100 transition">
                <td class="p-3.5 font-medium text-slate-700">${b.prefix}</td>
                <td class="p-3.5 text-slate-600">${b.line}</td>
                <td class="p-3.5">
                    <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${
                        b.status === 'Operando' ? 'bg-emerald-100 text-emerald-700' :
                        b.status === 'Manutenção' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                    }">${b.status}</span>
                </td>
                <td class="p-3.5 text-slate-600">${b.campaign}</td>
                <td class="p-3.5 text-center">
                    <button onclick="deleteBus('${b.id}')" class="text-rose-400 hover:text-rose-600 transition p-1"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    }

    // Tabela Campanhas
    const campTable = document.getElementById('campaign-table-body');
    if (campaigns.length === 0) {
        campTable.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400">Nenhuma campanha cadastrada.</td></tr>`;
    } else {
        const today = new Date().toISOString().split('T')[0];
        campTable.innerHTML = campaigns.map(c => {
            const count = buses.filter(b => b.campaign === c.name).length;
            const isActive = c.end >= today;
            return `
                <tr class="hover:bg-blue-50/30 border-b border-slate-100 transition">
                    <td class="p-3.5 font-medium text-slate-700">${c.name}</td>
                    <td class="p-3.5 text-slate-600">${count} veículo(s)</td>
                    <td class="p-3.5 text-slate-600">${c.start ? c.start.split('-').reverse().join('/') : ''}</td>
                    <td class="p-3.5 text-slate-600">${c.end ? c.end.split('-').reverse().join('/') : ''}</td>
                    <td class="p-3.5">
                        <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}">
                            ${isActive ? 'Ativa' : 'Expirada'}
                        </span>
                    </td>
                    <td class="p-3.5 text-center">
                        <button onclick="deleteCampaign('${c.id}')" class="text-rose-400 hover:text-rose-600 transition p-1"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
    }
}
