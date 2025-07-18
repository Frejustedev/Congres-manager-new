// Variables globales
let selectedPaymentMethod = null;
let participantData = null;
let currentTransaction = null;

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    initializePayment();
});

// Initialiser la page de paiement
async function initializePayment() {
    // Récupérer l'ID du participant depuis l'URL ou le sessionStorage
    const urlParams = new URLSearchParams(window.location.search);
    const participantId = urlParams.get('participant') || sessionStorage.getItem('participantCode');
    
    if (!participantId) {
        showError('Aucun participant spécifié. Veuillez vous inscrire d\'abord.');
        setTimeout(() => {
            window.location.href = '/';
        }, 3000);
        return;
    }
    
    try {
        // Charger les informations du participant
        await loadParticipantInfo(participantId);
        
        // Configurer les event listeners
        setupEventListeners();
        
    } catch (error) {
        console.error('Erreur initialisation paiement:', error);
        showError('Erreur lors du chargement des informations de paiement');
    }
}

// Charger les informations du participant
async function loadParticipantInfo(participantId) {
    try {
        const response = await fetch(`/api/payment/info/${participantId}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Erreur lors du chargement');
        }
        
        participantData = data;
        updateParticipantDisplay();
        
    } catch (error) {
        throw new Error('Impossible de charger les informations du participant');
    }
}

// Mettre à jour l'affichage des informations du participant
function updateParticipantDisplay() {
    const infoContainer = document.getElementById('participant-info');
    const { participant, payment } = participantData;
    
    infoContainer.innerHTML = `
        <div class="participant-detail">
            <span class="label">Nom :</span>
            <span class="value">${participant.prenom} ${participant.nom}</span>
        </div>
        <div class="participant-detail">
            <span class="label">Email :</span>
            <span class="value">${participant.email}</span>
        </div>
        <div class="participant-detail">
            <span class="label">Type :</span>
            <span class="value">${getTypeLabel(participant.type)}</span>
        </div>
        <div class="participant-detail">
            <span class="label">Institution :</span>
            <span class="value">${participant.institution}</span>
        </div>
    `;
    
    // Mettre à jour les prix
    document.getElementById('base-price').textContent = formatAmount(payment.amount);
    document.getElementById('total-price').innerHTML = `<strong>${formatAmount(payment.amount)}</strong>`;
    
    // Mettre à jour le bouton de paiement
    document.getElementById('pay-button-text').textContent = `Payer ${formatAmount(payment.amount)}`;
    
    // Générer référence pour virement
    const reference = `SAFBMEN-${participant.id}-${Date.now().toString().slice(-6)}`;
    document.getElementById('payment-reference').textContent = reference;
}

// Configuration des event listeners
function setupEventListeners() {
    // Options de paiement
    document.querySelectorAll('.payment-option').forEach(option => {
        option.addEventListener('click', () => {
            selectPaymentMethod(option.dataset.method);
        });
    });
    
    // Checkbox conditions
    const acceptTerms = document.getElementById('accept-terms');
    acceptTerms.addEventListener('change', togglePayButton);
    
    // Bouton de paiement
    document.getElementById('pay-button').addEventListener('click', processPayment);
    
    // Formatage des champs de carte
    const cardNumber = document.getElementById('card-number');
    if (cardNumber) {
        cardNumber.addEventListener('input', formatCardNumber);
    }
    
    const expiryDate = document.getElementById('expiry-date');
    if (expiryDate) {
        expiryDate.addEventListener('input', formatExpiryDate);
    }
    
    const phoneNumber = document.getElementById('phone-number');
    if (phoneNumber) {
        phoneNumber.addEventListener('input', formatPhoneNumber);
    }
}

// Sélectionner une méthode de paiement
function selectPaymentMethod(method) {
    // Retirer la sélection précédente
    document.querySelectorAll('.payment-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Sélectionner la nouvelle option
    const selectedOption = document.querySelector(`[data-method="${method}"]`);
    selectedOption.classList.add('selected');
    
    selectedPaymentMethod = method;
    
    // Afficher le formulaire correspondant
    showPaymentForm(method);
}

// Afficher le formulaire de paiement
function showPaymentForm(method) {
    const form = document.getElementById('payment-form');
    const title = document.getElementById('payment-method-title');
    const mobileForm = document.getElementById('mobile-money-form');
    const cardForm = document.getElementById('card-form');
    const bankInfo = document.getElementById('bank-transfer-info');
    
    // Cacher tous les formulaires
    mobileForm.style.display = 'none';
    cardForm.style.display = 'none';
    bankInfo.style.display = 'none';
    
    // Afficher le formulaire principal
    form.style.display = 'block';
    
    // Configurer selon la méthode
    const methodLabels = {
        orange_money: 'Paiement Orange Money',
        mtn_money: 'Paiement MTN Mobile Money',
        moov_money: 'Paiement Moov Money',
        airtel_money: 'Paiement Airtel Money',
        card: 'Paiement par Carte Bancaire',
        bank_transfer: 'Virement Bancaire'
    };
    
    title.textContent = methodLabels[method] || 'Paiement';
    
    if (['orange_money', 'mtn_money', 'moov_money', 'airtel_money'].includes(method)) {
        mobileForm.style.display = 'block';
    } else if (method === 'card') {
        cardForm.style.display = 'block';
    } else if (method === 'bank_transfer') {
        bankInfo.style.display = 'block';
    }
    
    // Réinitialiser l'état du bouton
    togglePayButton();
}

// Activer/désactiver le bouton de paiement
function togglePayButton() {
    const acceptTerms = document.getElementById('accept-terms').checked;
    const payButton = document.getElementById('pay-button');
    
    payButton.disabled = !acceptTerms || !selectedPaymentMethod;
}

// Traiter le paiement
async function processPayment() {
    if (!selectedPaymentMethod || !participantData) {
        showError('Veuillez sélectionner une méthode de paiement');
        return;
    }
    
    // Vérifier les champs requis selon la méthode
    if (!validatePaymentForm()) {
        return;
    }
    
    // Cas spécial pour le virement bancaire
    if (selectedPaymentMethod === 'bank_transfer') {
        showBankTransferSuccess();
        return;
    }
    
    // Préparer les données de paiement
    const paymentData = {
        participantId: participantData.participant.id,
        paymentMethod: selectedPaymentMethod
    };
    
    // Ajouter le numéro de téléphone pour mobile money
    if (['orange_money', 'mtn_money', 'moov_money', 'airtel_money'].includes(selectedPaymentMethod)) {
        const countryCode = document.getElementById('country-code').value;
        const phoneNumber = document.getElementById('phone-number').value.replace(/\s/g, '');
        paymentData.phoneNumber = countryCode + phoneNumber;
    }
    
    try {
        // Afficher le modal de traitement
        showProcessingModal();
        
        // Créer la transaction
        await createPaymentTransaction(paymentData);
        
    } catch (error) {
        hideProcessingModal();
        console.error('Erreur paiement:', error);
        showError(error.message || 'Erreur lors du paiement');
    }
}

// Valider le formulaire de paiement
function validatePaymentForm() {
    if (['orange_money', 'mtn_money', 'moov_money', 'airtel_money'].includes(selectedPaymentMethod)) {
        const phoneNumber = document.getElementById('phone-number').value.trim();
        if (!phoneNumber || phoneNumber.length < 8) {
            showError('Veuillez saisir un numéro de téléphone valide');
            return false;
        }
    } else if (selectedPaymentMethod === 'card') {
        const cardNumber = document.getElementById('card-number').value.replace(/\s/g, '');
        const expiryDate = document.getElementById('expiry-date').value;
        const cvv = document.getElementById('cvv').value;
        const cardHolder = document.getElementById('card-holder').value.trim();
        
        if (!cardNumber || cardNumber.length < 16) {
            showError('Numéro de carte invalide');
            return false;
        }
        if (!expiryDate || !expiryDate.match(/\d{2}\/\d{2}/)) {
            showError('Date d\'expiration invalide');
            return false;
        }
        if (!cvv || cvv.length < 3) {
            showError('CVV invalide');
            return false;
        }
        if (!cardHolder) {
            showError('Nom du titulaire requis');
            return false;
        }
    }
    
    return true;
}

// Créer la transaction de paiement
async function createPaymentTransaction(paymentData) {
    try {
        updateProcessingStep('step-init', 'completed');
        updateProcessingStep('step-payment', 'active');
        
        const response = await fetch('/api/payment/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paymentData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Erreur lors de la création du paiement');
        }
        
        currentTransaction = result;
        
        // Rediriger vers l'interface de paiement FedaPay
        if (result.url) {
            window.location.href = result.url;
        } else {
            // Pour les cartes, traitement direct
            await monitorPaymentStatus(result.transaction_id);
        }
        
    } catch (error) {
        throw error;
    }
}

// Surveiller le statut du paiement
async function monitorPaymentStatus(transactionId) {
    const maxAttempts = 30; // 5 minutes max
    let attempts = 0;
    
    const checkStatus = async () => {
        try {
            attempts++;
            
            const response = await fetch(`/api/payment/status/${transactionId}`);
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Erreur de vérification');
            }
            
            const status = result.status;
            
            if (status === 'approved') {
                updateProcessingStep('step-payment', 'completed');
                updateProcessingStep('step-confirmation', 'active');
                
                setTimeout(() => {
                    showPaymentSuccess(result.transaction);
                }, 1000);
                
            } else if (status === 'declined' || status === 'failed') {
                throw new Error('Paiement refusé ou échoué');
                
            } else if (attempts < maxAttempts) {
                // Continuer à surveiller
                setTimeout(checkStatus, 10000); // Vérifier toutes les 10 secondes
                
            } else {
                throw new Error('Délai d\'attente dépassé');
            }
            
        } catch (error) {
            hideProcessingModal();
            throw error;
        }
    };
    
    // Commencer la surveillance après 5 secondes
    setTimeout(checkStatus, 5000);
}

// Afficher le succès du paiement
function showPaymentSuccess(transaction) {
    hideProcessingModal();
    
    document.getElementById('transaction-ref').textContent = transaction.reference;
    document.getElementById('transaction-amount').textContent = formatAmount(transaction.amount);
    
    document.getElementById('success-modal').style.display = 'block';
}

// Afficher le succès pour virement bancaire
function showBankTransferSuccess() {
    hideProcessingModal();
    
    // Personnaliser le message pour virement
    const successModal = document.getElementById('success-modal');
    const content = successModal.querySelector('.modal-content');
    
    content.innerHTML = `
        <div class="success-icon">
            <i class="fas fa-university"></i>
        </div>
        <h3>Instructions de virement reçues</h3>
        <p>Veuillez effectuer le virement bancaire selon les coordonnées fournies.</p>
        <div class="success-details">
            <p><strong>Référence :</strong> <span id="transfer-ref">${document.getElementById('payment-reference').textContent}</span></p>
            <p><strong>Montant :</strong> <span>${formatAmount(participantData.payment.amount)}</span></p>
            <p><strong>Délai :</strong> Confirmation sous 24h ouvrées</p>
        </div>
        <div class="success-actions">
            <button onclick="window.location.href='/'" class="btn btn-primary">
                <i class="fas fa-home"></i> Retour à l'accueil
            </button>
        </div>
    `;
    
    successModal.style.display = 'block';
}

// Fonctions des modals
function showProcessingModal() {
    document.getElementById('processing-modal').style.display = 'block';
    document.getElementById('processing-message').textContent = 
        'Veuillez patienter pendant que nous traitons votre paiement...';
}

function hideProcessingModal() {
    document.getElementById('processing-modal').style.display = 'none';
}

function updateProcessingStep(stepId, status) {
    const step = document.getElementById(stepId);
    step.className = `step-indicator ${status}`;
}

// Fonctions utilitaires
function formatAmount(amount) {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

function getTypeLabel(type) {
    const labels = {
        enseignant: 'Enseignant',
        medecin: 'Médecin', 
        paramedical: 'Paramédical'
    };
    return labels[type] || type;
}

// Formatage des champs de saisie
function formatCardNumber(event) {
    let value = event.target.value.replace(/\s/g, '');
    let formattedValue = value.replace(/(.{4})/g, '$1 ').trim();
    
    if (formattedValue.length > 19) {
        formattedValue = formattedValue.substr(0, 19);
    }
    
    event.target.value = formattedValue;
}

function formatExpiryDate(event) {
    let value = event.target.value.replace(/\D/g, '');
    
    if (value.length >= 2) {
        value = value.substr(0, 2) + '/' + value.substr(2, 2);
    }
    
    event.target.value = value;
}

function formatPhoneNumber(event) {
    let value = event.target.value.replace(/\D/g, '');
    let formattedValue = value.replace(/(.{2})/g, '$1 ').trim();
    
    if (formattedValue.length > 11) {
        formattedValue = formattedValue.substr(0, 11);
    }
    
    event.target.value = formattedValue;
}

// Actions post-paiement
function downloadInvoice() {
    if (currentTransaction) {
        window.open(`/api/payment/invoice/${currentTransaction.transaction_id}`, '_blank');
    }
}

function goToDashboard() {
    window.location.href = '/dashboard';
}

// Conditions générales
function showTerms() {
    document.getElementById('terms-modal').style.display = 'block';
}

function closeTerms() {
    document.getElementById('terms-modal').style.display = 'none';
}

// Gestion des erreurs
function showError(message) {
    // Créer une notification d'erreur
    const notification = document.createElement('div');
    notification.className = 'notification error';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #dc3545;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        font-weight: 600;
        z-index: 10001;
        animation: slideIn 0.3s ease;
        max-width: 400px;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Fermer les modals en cliquant à l'extérieur
window.addEventListener('click', function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
});

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