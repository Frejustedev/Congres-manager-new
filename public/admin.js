// Variables globales
let currentAdminData = null;
let participantsData = [];
let abstractsData = [];
let statsData = null;
let charts = {};

// Configuration
const ADMIN_PASSWORD = 'admin2024'; // Mot de passe par défaut (à changer en production)

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    initializeAdmin();
});

// Initialiser l'interface d'administration
function initializeAdmin() {
    // Vérifier si déjà connecté
    const adminToken = sessionStorage.getItem('adminToken');
    if (adminToken === 'authenticated') {
        showAdminPanel();
        loadAllData();
    }

    // Event listeners
    setupEventListeners();
}

// Configuration des event listeners
function setupEventListeners() {
    // Authentification admin
    const authForm = document.getElementById('admin-auth-form');
    if (authForm) {
        authForm.addEventListener('submit', handleAdminAuth);
    }

    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', handleNavigation);
    });

    // Recherche et filtres
    const participantsSearch = document.getElementById('participants-search');
    if (participantsSearch) {
        participantsSearch.addEventListener('input', filterParticipants);
    }

    const participantsFilter = document.getElementById('participants-filter');
    if (participantsFilter) {
        participantsFilter.addEventListener('change', filterParticipants);
    }

    const abstractsSearch = document.getElementById('abstracts-search');
    if (abstractsSearch) {
        abstractsSearch.addEventListener('input', filterAbstracts);
    }

    const abstractsFilter = document.getElementById('abstracts-filter');
    if (abstractsFilter) {
        abstractsFilter.addEventListener('change', filterAbstracts);
    }

    // Sélection en masse
    const selectAllParticipants = document.getElementById('select-all-participants');
    if (selectAllParticipants) {
        selectAllParticipants.addEventListener('change', toggleSelectAllParticipants);
    }

    // Email form
    const emailForm = document.getElementById('email-form');
    if (emailForm) {
        emailForm.addEventListener('submit', handleEmailSend);
    }

    // Template email
    const emailTemplate = document.getElementById('email-template');
    if (emailTemplate) {
        emailTemplate.addEventListener('change', loadEmailTemplate);
    }

    // Modals
    setupModals();
}

// Authentification admin
async function handleAdminAuth(event) {
    event.preventDefault();
    const password = document.getElementById('admin-password').value;

    if (password === ADMIN_PASSWORD) {
        sessionStorage.setItem('adminToken', 'authenticated');
        showAdminPanel();
        await loadAllData();
        showSuccess('Connexion réussie !');
    } else {
        showError('Mot de passe incorrect');
    }
}

// Afficher le panneau admin
function showAdminPanel() {
    document.getElementById('admin-auth').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'flex';
}

// Déconnexion admin
function adminLogout() {
    sessionStorage.removeItem('adminToken');
    location.reload();
}

// Navigation
function handleNavigation(event) {
    event.preventDefault();
    const sectionName = event.target.closest('.nav-link').dataset.section;
    
    // Mettre à jour navigation active
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    event.target.closest('.nav-link').classList.add('active');
    
    // Afficher la section
    document.querySelectorAll('.admin-section').forEach(section => section.classList.remove('active'));
    document.getElementById(`section-${sectionName}`).classList.add('active');
    
    // Mettre à jour le titre
    const titles = {
        dashboard: 'Tableau de Bord',
        participants: 'Gestion des Participants',
        abstracts: 'Gestion des Abstracts',
        exports: 'Exports et Rapports',
        emails: 'Envoi d\'Emails'
    };
    document.getElementById('page-title').textContent = titles[sectionName];
    
    // Charger les données spécifiques si nécessaire
    if (sectionName === 'participants' && participantsData.length === 0) {
        loadParticipants();
    } else if (sectionName === 'abstracts' && abstractsData.length === 0) {
        loadAbstracts();
    }
}

// Charger toutes les données
async function loadAllData() {
    try {
        await Promise.all([
            loadStats(),
            loadParticipants(),
            loadAbstracts()
        ]);
        updateLastUpdateTime();
    } catch (error) {
        console.error('Erreur chargement données:', error);
        showError('Erreur lors du chargement des données');
    }
}

// Charger les statistiques
async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        statsData = data;
        updateStatsDisplay();
        updateCharts();
    } catch (error) {
        console.error('Erreur stats:', error);
    }
}

// Mettre à jour l'affichage des statistiques
function updateStatsDisplay() {
    if (!statsData) return;

    const { participants, abstracts, database } = statsData;

    // Statistiques rapides
    document.getElementById('total-participants').textContent = participants.total || 0;
    document.getElementById('total-abstracts').textContent = abstracts.total || 0;
    
    const pendingAbstracts = abstracts.byStatus?.find(s => s._id === 'en_review')?.count || 0;
    document.getElementById('pending-abstracts').textContent = pendingAbstracts;

    // Calculer revenus estimés
    const revenue = calculateRevenue(participants.byType || []);
    document.getElementById('total-revenue').textContent = formatMoney(revenue);

    // Statistiques temps réel
    document.getElementById('today-registrations').textContent = calculateTodayRegistrations();
    document.getElementById('week-registrations').textContent = calculateWeekRegistrations();
    document.getElementById('db-status').textContent = database.type || 'JSON';
}

// Calculer les revenus
function calculateRevenue(participantsByType) {
    const tarifs = {
        enseignant: 50000,
        medecin: 40000,
        paramedical: 25000
    };

    return participantsByType.reduce((total, type) => {
        return total + (type.count * (tarifs[type._id] || 0));
    }, 0);
}

// Formater l'argent
function formatMoney(amount) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'XOF',
        minimumFractionDigits: 0
    }).format(amount).replace('XOF', 'FCFA');
}

// Mettre à jour les graphiques
function updateCharts() {
    if (!statsData) return;

    updateParticipantsChart();
    updateAbstractsChart();
    updateInscriptionsChart();
}

// Graphique répartition participants
function updateParticipantsChart() {
    const ctx = document.getElementById('participants-chart').getContext('2d');
    
    if (charts.participants) {
        charts.participants.destroy();
    }

    const data = statsData.participants.byType || [];
    const labels = data.map(item => {
        const labelMap = {
            enseignant: 'Enseignants',
            medecin: 'Médecins',
            paramedical: 'Paramédicaux'
        };
        return labelMap[item._id] || item._id;
    });
    const values = data.map(item => item.count);
    const colors = ['#3498db', '#1abc9c', '#f39c12'];

    charts.participants = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Graphique statut abstracts
function updateAbstractsChart() {
    const ctx = document.getElementById('abstracts-chart').getContext('2d');
    
    if (charts.abstracts) {
        charts.abstracts.destroy();
    }

    const data = statsData.abstracts.byStatus || [];
    const labels = data.map(item => {
        const labelMap = {
            en_review: 'En révision',
            accepte: 'Accepté',
            refuse: 'Refusé'
        };
        return labelMap[item._id] || item._id;
    });
    const values = data.map(item => item.count);
    const colors = ['#f39c12', '#27ae60', '#e74c3c'];

    charts.abstracts = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Graphique inscriptions par jour
function updateInscriptionsChart() {
    const ctx = document.getElementById('inscriptions-chart').getContext('2d');
    
    if (charts.inscriptions) {
        charts.inscriptions.destroy();
    }

    // Générer données fictives pour les 7 derniers jours
    const labels = [];
    const data = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }));
        data.push(Math.floor(Math.random() * 10) + 1); // Données fictives
    }

    charts.inscriptions = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Inscriptions',
                data: data,
                borderColor: '#1abc9c',
                backgroundColor: 'rgba(26, 188, 156, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Charger participants
async function loadParticipants() {
    try {
        const response = await fetch('/api/participants');
        participantsData = await response.json();
        displayParticipants(participantsData);
    } catch (error) {
        console.error('Erreur participants:', error);
        showError('Erreur lors du chargement des participants');
    }
}

// Afficher participants
function displayParticipants(participants) {
    const tbody = document.getElementById('participants-tbody');
    if (!tbody) return;

    tbody.innerHTML = participants.map(participant => `
        <tr>
            <td><input type="checkbox" class="participant-checkbox" value="${participant.codeAcces || participant.id}"></td>
            <td>${participant.prenom} ${participant.nom}</td>
            <td>${participant.email}</td>
            <td><span class="badge">${getTypeLabel(participant.typeParticipant)}</span></td>
            <td>${participant.institution}</td>
            <td><code>${participant.codeAcces || 'N/A'}</code></td>
            <td>${formatDate(participant.dateInscription)}</td>
            <td>
                <button onclick="editParticipant('${participant.codeAcces || participant.id}')" class="btn btn-sm btn-outline">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteParticipant('${participant.codeAcces || participant.id}')" class="btn btn-sm btn-danger">
                    <i class="fas fa-trash"></i>
                </button>
                <button onclick="generateBadgeAdmin('${participant.codeAcces || participant.id}')" class="btn btn-sm btn-primary">
                    <i class="fas fa-id-badge"></i>
                </button>
            </td>
        </tr>
    `).join('');

    // Event listeners pour les checkboxes
    document.querySelectorAll('.participant-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', updateBulkActions);
    });
}

// Filtrer participants
function filterParticipants() {
    const searchTerm = document.getElementById('participants-search').value.toLowerCase();
    const typeFilter = document.getElementById('participants-filter').value;

    const filtered = participantsData.filter(participant => {
        const matchesSearch = 
            participant.nom.toLowerCase().includes(searchTerm) ||
            participant.prenom.toLowerCase().includes(searchTerm) ||
            participant.email.toLowerCase().includes(searchTerm) ||
            participant.institution.toLowerCase().includes(searchTerm);

        const matchesType = !typeFilter || participant.typeParticipant === typeFilter;

        return matchesSearch && matchesType;
    });

    displayParticipants(filtered);
}

// Charger abstracts
async function loadAbstracts() {
    try {
        const response = await fetch('/api/abstracts');
        abstractsData = await response.json();
        displayAbstracts(abstractsData);
    } catch (error) {
        console.error('Erreur abstracts:', error);
        showError('Erreur lors du chargement des abstracts');
    }
}

// Afficher abstracts
function displayAbstracts(abstracts) {
    const container = document.getElementById('abstracts-grid');
    if (!container) return;

    container.innerHTML = abstracts.map(abstract => `
        <div class="abstract-card">
            <div class="abstract-header">
                <div class="abstract-title">${abstract.titre}</div>
                <span class="abstract-status ${abstract.statut}">${getStatusLabel(abstract.statut)}</span>
            </div>
            <div class="abstract-meta">
                Par ${abstract.auteurPrincipal} • ${formatDate(abstract.dateSubmission)}
                ${abstract.sousTheme ? `• ${abstract.sousTheme}` : ''}
            </div>
            <div class="abstract-content">
                ${abstract.resume}
            </div>
            <div class="abstract-actions">
                <button onclick="viewAbstract('${abstract.id}')" class="btn btn-sm btn-outline">
                    <i class="fas fa-eye"></i> Voir
                </button>
                ${abstract.statut === 'en_review' ? `
                    <button onclick="acceptAbstract('${abstract.id}')" class="btn btn-sm btn-success">
                        <i class="fas fa-check"></i> Accepter
                    </button>
                    <button onclick="rejectAbstract('${abstract.id}')" class="btn btn-sm btn-danger">
                        <i class="fas fa-times"></i> Refuser
                    </button>
                ` : ''}
                <button onclick="deleteAbstract('${abstract.id}')" class="btn btn-sm btn-danger">
                    <i class="fas fa-trash"></i> Supprimer
                </button>
            </div>
        </div>
    `).join('');
}

// Filtrer abstracts
function filterAbstracts() {
    const searchTerm = document.getElementById('abstracts-search').value.toLowerCase();
    const statusFilter = document.getElementById('abstracts-filter').value;

    const filtered = abstractsData.filter(abstract => {
        const matchesSearch = 
            abstract.titre.toLowerCase().includes(searchTerm) ||
            abstract.auteurPrincipal.toLowerCase().includes(searchTerm) ||
            abstract.resume.toLowerCase().includes(searchTerm);

        const matchesStatus = !statusFilter || abstract.statut === statusFilter;

        return matchesSearch && matchesStatus;
    });

    displayAbstracts(filtered);
}

// Actions sur les abstracts
async function acceptAbstract(id) {
    const commentaires = prompt('Commentaires (optionnel):');
    try {
        const response = await fetch(`/api/abstracts/${id}/accept`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ commentaires })
        });

        if (response.ok) {
            showSuccess('Abstract accepté');
            loadAbstracts();
            loadStats();
        } else {
            showError('Erreur lors de l\'acceptation');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur lors de l\'acceptation');
    }
}

async function rejectAbstract(id) {
    const commentaires = prompt('Raison du refus (obligatoire):');
    if (!commentaires) return;

    try {
        const response = await fetch(`/api/abstracts/${id}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ commentaires })
        });

        if (response.ok) {
            showSuccess('Abstract refusé');
            loadAbstracts();
            loadStats();
        } else {
            showError('Erreur lors du refus');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur lors du refus');
    }
}

// Exports
async function exportData(type, format) {
    try {
        const response = await fetch(`/api/export/${type}?format=${format}`);
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `${type}_${new Date().toISOString().split('T')[0]}.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            showSuccess(`Export ${format.toUpperCase()} téléchargé`);
        } else {
            showError('Erreur lors de l\'export');
        }
    } catch (error) {
        console.error('Erreur export:', error);
        showError('Erreur lors de l\'export');
    }
}

// Emails
function loadEmailTemplate() {
    const template = document.getElementById('email-template').value;
    const subjectInput = document.getElementById('email-subject');
    const contentInput = document.getElementById('email-content');

    const templates = {
        confirmation: {
            subject: 'Confirmation d\'inscription - Congrès SAFBMEN/SBCB',
            content: `Cher(e) participant(e),

Nous confirmons votre inscription au 1er Congrès SAFBMEN - 5ème Congrès de Biologie Clinique qui se déroulera du 21 au 23 octobre 2025 à ISBA COTONOU.

Votre code d'accès: {{codeAcces}}

Cordialement,
L'équipe organisatrice`
        },
        reminder: {
            subject: 'Rappel - Congrès SAFBMEN/SBCB dans une semaine',
            content: `Cher(e) participant(e),

Le congrès approche ! Nous vous rappelons que l'événement aura lieu dans une semaine.

Pensez à télécharger votre badge depuis votre espace personnel.

À bientôt !
L'équipe organisatrice`
        },
        'abstract-status': {
            subject: 'Statut de votre abstract - Congrès SAFBMEN/SBCB',
            content: `Cher(e) auteur(e),

Nous avons le plaisir de vous informer du statut de votre abstract "{{titre}}".

Statut: {{statut}}
{{commentaires}}

Cordialement,
Le comité scientifique`
        }
    };

    if (templates[template]) {
        subjectInput.value = templates[template].subject;
        contentInput.value = templates[template].content;
    }
}

async function handleEmailSend(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const recipients = Array.from(document.getElementById('email-recipients').selectedOptions).map(opt => opt.value);
    const subject = formData.get('subject');
    const content = formData.get('content');

    if (!recipients.length || !subject || !content) {
        showError('Veuillez remplir tous les champs');
        return;
    }

    try {
        const response = await fetch('/api/send-bulk-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipients, subject, content })
        });

        if (response.ok) {
            showSuccess('Emails envoyés avec succès');
            event.target.reset();
        } else {
            showError('Erreur lors de l\'envoi');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur lors de l\'envoi');
    }
}

// Utilitaires
function getTypeLabel(type) {
    const labels = {
        enseignant: 'Enseignant',
        medecin: 'Médecin',
        paramedical: 'Paramédical'
    };
    return labels[type] || type;
}

function getStatusLabel(status) {
    const labels = {
        en_review: 'En révision',
        accepte: 'Accepté',
        refuse: 'Refusé'
    };
    return labels[status] || status;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function calculateTodayRegistrations() {
    if (!participantsData.length) return 0;
    const today = new Date().toDateString();
    return participantsData.filter(p => 
        p.dateInscription && new Date(p.dateInscription).toDateString() === today
    ).length;
}

function calculateWeekRegistrations() {
    if (!participantsData.length) return 0;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return participantsData.filter(p => 
        p.dateInscription && new Date(p.dateInscription) >= weekAgo
    ).length;
}

function updateLastUpdateTime() {
    document.getElementById('last-update').textContent = new Date().toLocaleTimeString('fr-FR');
}

// Actions en masse participants
function toggleSelectAllParticipants() {
    const selectAll = document.getElementById('select-all-participants');
    const checkboxes = document.querySelectorAll('.participant-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
    });
    
    updateBulkActions();
}

function updateBulkActions() {
    const checkboxes = document.querySelectorAll('.participant-checkbox:checked');
    const bulkActions = document.getElementById('participants-bulk-actions');
    const selectedCount = bulkActions.querySelector('.selected-count');
    
    if (checkboxes.length > 0) {
        bulkActions.style.display = 'flex';
        selectedCount.textContent = `${checkboxes.length} participant(s) sélectionné(s)`;
    } else {
        bulkActions.style.display = 'none';
    }
}

// Modals
function setupModals() {
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            closeBtn.closest('.modal').style.display = 'none';
        });
    });

    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
}

// Actualiser les données
async function refreshData() {
    const button = document.querySelector('[onclick="refreshData()"]');
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualisation...';
    button.disabled = true;

    try {
        await loadAllData();
        showSuccess('Données actualisées');
    } catch (error) {
        showError('Erreur lors de l\'actualisation');
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// Messages de notification
function showSuccess(message) {
    showNotification(message, 'success');
}

function showError(message) {
    showNotification(message, 'error');
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 10001;
        animation: slideIn 0.3s ease;
        background: ${type === 'success' ? '#27ae60' : '#e74c3c'};
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Styles pour les animations de notification
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style); 