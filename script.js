// Variáveis globais de dados
let frotas = [];
let campanhas = [];
let db = null;
let fbModules = null;

// Aguarda o Firebase carregar da página HTML
window.addEventListener('firebase-pronto', () => {
    db = window.db;
    fbModules = window.firebaseModules;
    
    document.getElementById('db-status').innerHTML = `<span class="w-2 h-2 bg-white rounded-full animate-pulse"></span> Firebase Conectado`;
    document.getElementById('db-status').className = "text-xs bg-green-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1";

    // Iniciar escuta em tempo real do banco de dados
    carregarDadosEmTempoReal();
});

// Simulação de Autenticação local (ou você pode integrar com Firebase Auth futuramente)
function verificarAuth() {
    const logado = localStorage.getItem('control_buss_auth');
    if (!logado) {
        document.getElementById('modal-login').classList.remove('hidden');
    } else {
        document.getElementById('user-name').innerText = localStorage.getItem('control_buss_user') || 'Operador';
    }
}

function fazerLogin(e) {
    e.preventDefault();
    const usuario = document.getElementById('usuario').value;
    localStorage.setItem('control_buss_auth', 'true');
    localStorage.setItem('control_buss_user', usuario);
    document.getElementById('modal-login').classList.add('hidden');
    mostrarToast('Login realizado com sucesso!', 'sucesso');
}

function fazerLogout() {
    localStorage.removeItem('control_buss_auth');
    localStorage.removeItem('control_buss_user');
    location.reload();
}

// Sistema de Toast Notifications
function mostrarToast(mensagem, tipo = 'sucesso') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const cor = tipo === 'sucesso' ? 'bg-green-600' : 'bg-red-600';
    toast.className = `${cor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 transform translate-y-2 opacity-0 transition-all duration-300`;
    toast.innerHTML = `<i class="fa-solid ${tipo === 'sucesso' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i> <span>${mensagem}</span>`;
    container.appendChild(toast);

    setTimeout(() => { toast.classList.remove('translate-y-2', 'opacity-0'); }, 10);
    setTimeout(() => {
        toast.classList.add('translate-y-2', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// SINCRONIZAÇÃO EM TEMPO REAL COM O FIRESTORE
function carregarDadosEmTempoReal() {
    if (!db) return;

    // Escutar coleção 'frotas'
    fbModules.onSnapshot(fbModules.collection(db, 'frotas'), (snapshot) => {
        frotas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        atualizarDashboard();
    }, (error) => {
        console.error("Erro ao carregar frotas:", error);
        mostrarToast("Erro ao sincronizar frota com a nuvem.", "erro");
    });

    // Escutar coleção 'campanhas'
    fbModules.onSnapshot(fbModules.collection(db, 'campanhas'), (snapshot) => {
        campanhas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        atualizarDashboard();
    }, (error) => {
        console.error("Erro ao carregar campanhas:", error);
    });
}

// Atualizar Indicadores e Tabelas
function atualizarDashboard() {
    document.getElementById('stat-frota-total').innerText = frotas.length;
    const operando = frotas.filter(f => f.status === 'Operando').length;
    const inativos = frotas.filter(f => f.status !== 'Operando').length;
    const semCampanha = frotas.filter(f => !f.campanha || f.campanha === 'Nenhuma').length;

    document.getElementById('stat-operando').innerText = operando;
    document.getElementById('stat-inativos').innerText = inativos;
    document.getElementById('stat-sem-campanha').innerText = semCampanha;

    renderizarTabelaFrota();
    renderizarTabelaCampanhas();
}

function renderizarTabelaFrota(dados = frotas) {
    const tbody = document.getElementById('tabela-frota');
    if (dados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-gray-400">Nenhum veículo encontrado na nuvem.</td></tr>`;
        return;
    }

    tbody.innerHTML = dados.map(f => {
        let badgeStatus = '';
        if(f.status === 'Operando') badgeStatus = 'bg-green-100 text-green-700';
        else if(f.status === 'Em Manutenção') badgeStatus = 'bg-amber-100 text-amber-700';
        else badgeStatus = 'bg-red-100 text-red-700';

        return `
            <tr class="hover:bg-gray-50 transition">
                <td class="py-3 px-6 font-semibold text-gray-900">${f.prefixo}</td>
                <td class="py-3 px-6 text-gray-600">${f.linha}</td>
                <td class="py-3 px-6"><span class="px-2.5 py-1 rounded-full text-xs font-medium ${badgeStatus}">${f.status}</span></td>
                <td class="py-3 px-6"><span class="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md font-medium">${f.campanha || 'Nenhuma'}</span></td>
                <td class="py-3 px-6 text-right space-x-2">
                    <button onclick="editarOnibus('${f.id}')" class="text-blue-600 hover:text-blue-800" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button onclick="excluirOnibus('${f.id}')" class="text-red-600 hover:text-red-800" title="Excluir"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

function renderizarTabelaCampanhas() {
    const tbody = document.getElementById('tabela-campanhas');
    if (campanhas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-gray-400">Nenhuma campanha registrada na nuvem.</td></tr>`;
        return;
    }

    const hoje = new Date().toISOString().split('T')[0];

    tbody.innerHTML = campanhas.map(c => {
        const vencida = c.vencimento < hoje;
        const statusBadge = vencida 
            ? `<span class="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-medium">Encerrada</span>`
            : `<span class="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-medium">Ativa</span>`;

        return `
            <tr class="hover:bg-gray-50 transition">
                <td class="py-3 px-6 font-semibold text-gray-900">${c.nome}</td>
                <td class="py-3 px-6">${c.veiculos ? c.veiculos.length : 0} veículos</td>
                <td class="py-3 px-6 text-gray-500">${c.inicio ? c.inicio.split('-').reverse().join('/') : ''}</td>
                <td class="py-3 px-6 text-gray-500">${c.vencimento ? c.vencimento.split('-').reverse().join('/') : ''}</td>
                <td class="py-3 px-6">${statusBadge}</td>
                <td class="py-3 px-6 text-right">
                    <button onclick="excluirCampanha('${c.id}')" class="text-red-600 hover:text-red-800" title="Excluir"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

function filtrarFrota() {
    const termo = document.getElementById('filtro-frota').value.toLowerCase();
    const filtrados = frotas.filter(f => f.prefixo.toLowerCase().includes(termo) || f.linha.toLowerCase().includes(termo));
    renderizarTabelaFrota(filtrados);
}

// Operações de Ônibus (Firebase)
function abrirModalOnibus(id = null) {
    document.getElementById('form-onibus').reset();
    document.getElementById('onibus-id').value = '';
    document.getElementById('titulo-modal-onibus').innerText = 'Cadastrar Novo Ônibus';
    if (id) {
        const o = frotas.find(item => item.id === id);
        if (o) {
            document.getElementById('onibus-id').value = o.id;
            document.getElementById('onibus-prefixo').value = o.prefixo;
            document.getElementById('onibus-linha').value = o.linha;
            document.getElementById('onibus-status').value = o.status;
            document.getElementById('titulo-modal-onibus').innerText = 'Editar Ônibus';
        }
    }
    document.getElementById('modal-onibus').classList.remove('hidden');
}

function fecharModalOnibus() {
    document.getElementById('modal-onibus').classList.add('hidden');
}

async function salvarOnibus(e) {
    e.preventDefault();
    if (!db) return alert('Firebase não inicializado.');

    const id = document.getElementById('onibus-id').value;
    const prefixo = document.getElementById('onibus-prefixo').value;
    const linha = document.getElementById('onibus-linha').value;
    const status = document.getElementById('onibus-status').value;

    try {
        if (id) {
            const docRef = fbModules.doc(db, 'frotas', id);
            await fbModules.updateDoc(docRef, { prefixo, linha, status });
            mostrarToast('Veículo atualizado na nuvem!');
        } else {
            await fbModules.addDoc(fbModules.collection(db, 'frotas'), {
                prefixo,
                linha,
                status,
                campanha: 'Nenhuma'
            });
            mostrarToast('Veículo cadastrado na nuvem!');
        }
        fecharModalOnibus();
    } catch (error) {
        console.error("Erro ao salvar ônibus:", error);
        mostrarToast('Erro ao salvar no Firebase.', 'erro');
    }
}

function editarOnibus(id) {
    abrirModalOnibus(id);
}

async function excluirOnibus(id) {
    if (confirm('Deseja realmente excluir este veículo da nuvem?')) {
        try {
            await fbModules.deleteDoc(fbModules.doc(db, 'frotas', id));
            mostrarToast('Veículo excluído.', 'erro');
        } catch (error) {
            console.error("Erro ao excluir:", error);
            mostrarToast('Erro ao excluir veículo.', 'erro');
        }
    }
}

// Operações de Campanha (Firebase)
function abrirModalCampanha() {
    document.getElementById('campanha-nome').value = '';
    document.getElementById('campanha-inicio').value = '';
    document.getElementById('campanha-vencimento').value = '';
    
    const container = document.getElementById('lista-checkbox-onibus');
    container.innerHTML = frotas.map(f => `
        <label class="flex items-center space-x-2 cursor-pointer">
            <input type="checkbox" name="veiculos_campanha" value="${f.prefixo}" class="rounded text-blue-600 focus:ring-blue-500">
            <span>Prefixo: <strong>${f.prefixo}</strong> (${f.linha})</span>
        </label>
    `).join('') || '<p class="text-gray-400">Cadastre ônibus primeiro.</p>';

    document.getElementById('modal-campanha').classList.remove('hidden');
}

function fecharModalCampanha() {
    document.getElementById('modal-campanha').classList.add('hidden');
}

async function salvarCampanha(e) {
    e.preventDefault();
    if (!db) return;

    const nome = document.getElementById('campanha-nome').value;
    const inicio = document.getElementById('campanha-inicio').value;
    const vencimento = document.getElementById('campanha-vencimento').value;
    
    const checkboxes = document.querySelectorAll('input[name="veiculos_campanha"]:checked');
    const veiculosSelecionados = Array.from(checkboxes).map(cb => cb.value);

    if (veiculosSelecionados.length === 0) {
        alert('Selecione ao menos um veículo para a campanha.');
        return;
    }

    try {
        // Salva campanha no Firestore
        await fbModules.addDoc(fbModules.collection(db, 'campanhas'), {
            nome,
            inicio,
            vencimento,
            veiculos: veiculosSelecionados
        });

        // Atualiza a campanha nos ônibus correspondentes na nuvem
        for (let f of frotas) {
            if (veiculosSelecionados.includes(f.prefixo)) {
                const docRef = fbModules.doc(db, 'frotas', f.id);
                await fbModules.updateDoc(docRef, { campanha: nome });
            }
        }

        fecharModalCampanha();
        mostrarToast('Campanha criada na nuvem!');
    } catch (error) {
        console.error("Erro ao salvar campanha:", error);
        mostrarToast('Erro ao criar campanha.', 'erro');
    }
}

async function excluirCampanha(id) {
    if (confirm('Deseja excluir esta campanha?')) {
        try {
            const camp = campanhas.find(c => c.id === id);
            if (camp && camp.veiculos) {
                // Remove a tag de campanha dos ônibus afetados
                for (let f of frotas) {
                    if (camp.veiculos.includes(f.prefixo)) {
                        const docRef = fbModules.doc(db, 'frotas', f.id);
                        await fbModules.updateDoc(docRef, { campanha: 'Nenhuma' });
                    }
                }
            }
            await fbModules.deleteDoc(fbModules.doc(db, 'campanhas', id));
            mostrarToast('Campanha removida.', 'erro');
        } catch (error) {
            console.error("Erro ao excluir campanha:", error);
            mostrarToast('Erro ao remover campanha.', 'erro');
        }
    }
}

// Exportar para Excel (.xlsx)
function exportarExcel() {
    const wsData = frotas.map(f => ({
        'Prefixo': f.prefixo,
        'Nome da Linha': f.linha,
        'Status Operacional': f.status,
        'Campanha Atual': f.campanha
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Frota Control-Buss");
    XLSX.writeFile(wb, "Relatorio_Frota_Control_Buss.xlsx");
    mostrarToast('Relatório exportado com sucesso!');
}

// Inicia verificação de autenticação ao carregar
verificarAuth();
