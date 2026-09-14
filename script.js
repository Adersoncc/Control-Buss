// ==========================================
// COLE SUAS CREDENCIAIS DO FIREBASE ABAIXO:
// ==========================================
const firebaseConfig = {
    apiKey: "SUA_API_KEY_AQUI",
    authDomain: "seu-projeto.firebaseapp.com",
    projectId: "seu-projeto-id",
    storageBucket: "seu-projeto.appspot.com",
    messagingSenderId: "seu-id",
    appId: "seu-app-id"
};

// Inicialização do Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

document.addEventListener("DOMContentLoaded", () => {
    // ---- CONTROLE DO MODAL DA FROTA ----
    const modalFrota = document.getElementById("modalFrota");
    const btnAbrirFrota = document.getElementById("btnAbrirFrota");
    const btnFecharFrota = document.getElementById("btnFecharFrota");

    if (btnAbrirFrota && modalFrota) {
        btnAbrirFrota.addEventListener("click", () => {
            modalFrota.style.display = "flex";
        });
    }

    if (btnFecharFrota && modalFrota) {
        btnFecharFrota.addEventListener("click", () => {
            modalFrota.style.display = "none";
        });
    }

    window.addEventListener("click", (event) => {
        if (event.target === modalFrota) {
            modalFrota.style.display = "none";
        }
    });

    // ---- FUNÇÃO DE ATUALIZAÇÃO E FILTRAGEM CORRETA DA FROTA ----
    function atualizarDashboard(frota) {
        const totalFrota = frota.length;
        
        // Filtro estrito para veículos operando
        const operando = frota.filter(v => v.statusOperacional && v.statusOperacional.toLowerCase() === 'operando').length;
        
        // Correção aplicada: Filtro específico para manutenção ou parados (evita puxar a frota inteira por engano)
        const manutencaoParados = frota.filter(v => {
            const status = v.statusOperacional ? v.statusOperacional.toLowerCase() : '';
            return status.includes('manutenção') || status.includes('manutencao') || status.includes('parado');
        }).length;

        const semCampanha = frota.filter(v => !v.campanhaAtual || v.campanhaAtual.trim() === '' || v.campanhaAtual.toLowerCase() === 'sem campanha').length;

        // Atualizando os cards de métricas na tela
        document.getElementById('totalFrota').textContent = totalFrota;
        document.getElementById('totalOperando').textContent = operando;
        document.getElementById('totalManutencao').textContent = manutencaoParados;
        document.getElementById('totalSemCampanha').textContent = semCampanha;

        // Renderizando a tabela dentro do modal
        const tbody = document.getElementById('tabelaFrotaCorpo');
        if (tbody) {
            tbody.innerHTML = '';
            if (totalFrota === 0) {
                tbody.innerHTML = '<tr><td colspan="5">Nenhum veículo cadastrado.</td></tr>';
                return;
            }

            frota.forEach(veiculo => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${veiculo.prefixo || '-'}</td>
                    <td>${veiculo.linha || '-'}</td>
                    <td>${veiculo.statusOperacional || '-'}</td>
                    <td>${veiculo.campanhaAtual || 'Sem Campanha'}</td>
                    <td>-</td>
                `;
                tbody.appendChild(tr);
            });
        }
    }

    // Exemplo de escuta em tempo real do Firestore (ajuste o nome da coleção se necessário, ex: "fleet" ou "frota")
    db.collection("fleet").onSnapshot((snapshot) => {
        const listaFrota = [];
        snapshot.forEach((doc) => {
            listaFrota.push({ id: doc.id, ...doc.data() });
        });
        atualizarDashboard(listaFrota);
    }, (error) => {
        console.error("Erro ao carregar frota do Firebase: ", error);
    });
});
