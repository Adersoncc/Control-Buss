// Simulação de Autenticação
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

// Dados locais simulados
let frotas = JSON.parse(localStorage.getItem('control_buss_frota')) || [
    { id: '1', prefixo: '1001', linha: 'Terminal Cohatrac / Centro', status: 'Operando', campanha: 'Campanha Institucional' },
    { id: '2', prefixo: '1025', linha: 'Cohab / Vinhais', status: 'Em Manutenção', campanha: 'Nenhuma' },
    { id: '3', prefixo: '2040', linha: 'São Cristóvão / Deodoro', status: 'Operando', campanha: 'Nenhuma' }
];

let campanhas = JSON.parse(localStorage.getItem('control_buss_campanhas')) || [
    { id: 'c1', nome: 'Campanha Institucional', veiculos: ['1001'], inicio: '2026-08-01', vencimento: '2026-12-31' }
];

// Sistema de Toast Notifications
function mostrarToast(mensagem, tipo = 'sucesso') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const cor = tipo === 'sucesso' ? 'bg-green-600' : 'bg-red-600';
    toast.className = `${cor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 transform translate-y-2 opacity-0 transition-all duration-300`;
    toast.innerHTML = `<i class="fa-solid ${tipo === 'sucesso' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i> <span>${mensagem}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
    }, 10);

    setTimeout(() => {
        toast.classList.add('translate-y-2', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Inicialização do Painel
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
    
    localStorage.setItem('control_buss_frota', JSON.stringify(frotas));
    localStorage.setItem('control_buss_campanhas', JSON.stringify(campanhas));
}

function renderizarTabelaFrota(dados = frotas) {
    const tbody = document.getElementById('tabela-frota');
    if (dados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-gray-400">Nenhum veículo encontrado.</td></tr>`;
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
        tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-gray-400">Nenhuma campanha cadastrada.</td></tr>`;
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
                <td class="py-3 px-6">${c.veiculos.length} veículos</td>
                <td class="py-3 px-6 text-gray-500">${c.inicio.split('-').reverse().join('/')}</td>
                <td class="py-3 px-6 text-gray-500">${c.vencimento.split('-').reverse().join('/')}</td>
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

// Modais de Ônibus
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

function salvarOnibus(e) {
    e.preventDefault();
    const id = document.getElementById('onibus-id').value;
    const prefixo = document.getElementById('onibus-prefixo').value;
    const linha = document.getElementById('onibus-linha').value;
    const status = document.getElementById('onibus-status').value;

    if (id) {
        frotas = frotas.map(f => f.id === id ? { ...f, prefixo, linha, status } : f);
        mostrarToast('Veículo atualizado com sucesso!');
    } else {
        const novo = { id: Date.now().toString(), prefixo, linha, status, campanha: 'Nenhuma' };
        frotas.push(novo);
        mostrarToast('Veículo cadastrado com sucesso!');
    }

    fecharModalOnibus();
    atualizarDashboard();
}

function editarOnibus(id) {
    abrirModalOnibus(id);
}

function excluirOnibus(id) {
    if (confirm('Deseja realmente excluir este veículo?')) {
        frotas = frotas.filter(f => f.id !== id);
        mostrarToast('Veículo excluído.', 'erro');
        atualizarDashboard();
    }
}

// Modais de Campanha
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

function salvarCampanha(e) {
    e.preventDefault();
    const nome = document.getElementById('campanha-nome').value;
    const inicio = document.getElementById('campanha-inicio').value;
    const vencimento = document.getElementById('campanha-vencimento').value;
    
    const checkboxes = document.querySelectorAll('input[name="veiculos_campanha"]:checked');
    const veiculosSelecionados = Array.from(checkboxes).map(cb => cb.value);

    if (veiculosSelecionados.length === 0) {
        alert('Selecione ao menos um veículo para a campanha.');
        return;
    }

    const novaCampanha = {
        id: Date.now().toString(),
        nome,
        inicio,
        vencimento,
        veiculos: veiculosSelecionados
    };

    campanhas.push(novaCampanha);

    frotas = frotas.map(f => {
        if (veiculosSelecionados.includes(f.prefixo)) {
            return { ...f, campanha: nome };
        }
        return f;
    });

    fecharModalCampanha();
    mostrarToast('Campanha criada com sucesso!');
    atualizarDashboard();
}

function excluirCampanha(id) {
    if (confirm('Deseja excluir esta campanha?')) {
        const camp = campanhas.find(c => c.id === id);
        if (camp) {
            frotas = frotas.map(f => {
                if (camp.veiculos.includes(f.prefixo)) {
                    return { ...f, campanha: 'Nenhuma' };
                }
                return f;
            });
        }
        campanhas = campanhas.filter(c => c.id !== id);
        mostrarToast('Campanha removida.', 'erro');
        atualizarDashboard();
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

// Inicializa o painel ao carregar o script
atualizarDashboard();
