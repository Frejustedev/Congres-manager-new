// Variables globales
let currentParticipant = null;

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

// Initialiser le tableau de bord
function initializeDashboard() {
    const authForm = document.getElementById('auth-form');
    if (authForm) {
        authForm.addEventListener('submit', handleAuthentication);
    }

    // Vérifier si l'utilisateur est déjà connecté
    const savedCode = sessionStorage.getItem('participantCode');
    if (savedCode) {
        verifyParticipant(savedCode);
    }

    initializeModals();
}

// Initialiser les modaux
function initializeModals() {
    // Modal de badge
    const badgeModal = document.getElementById('badge-modal');
    const closeBtn = badgeModal.querySelector('.close');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            badgeModal.style.display = 'none';
        });
    }

    window.addEventListener('click', (event) => {
        if (event.target === badgeModal) {
            badgeModal.style.display = 'none';
        }
    });
}

// Gérer l'authentification
async function handleAuthentication(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const codeAcces = formData.get('codeAcces').trim().toUpperCase();
    
    if (!codeAcces) {
        showError('Veuillez saisir votre code d\'accès');
        return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Vérification...';
    submitBtn.disabled = true;

    try {
        await verifyParticipant(codeAcces);
    } catch (error) {
        console.error('Erreur d\'authentification:', error);
        showError('Erreur de connexion. Veuillez réessayer.');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Vérifier le participant
async function verifyParticipant(codeAcces) {
    try {
        const response = await fetch('/api/verifier-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ codeAcces })
        });

        const result = await response.json();

        if (response.ok && result.valide) {
            currentParticipant = result.participant;
            currentParticipant.codeAcces = codeAcces;
            
            // Sauvegarder en session
            sessionStorage.setItem('participantCode', codeAcces);
            sessionStorage.setItem('participantData', JSON.stringify(currentParticipant));
            
            showDashboard();
            updateParticipantInfo();
        } else {
            showError(result.error || 'Code d\'accès invalide');
            sessionStorage.removeItem('participantCode');
            sessionStorage.removeItem('participantData');
        }
    } catch (error) {
        throw error;
    }
}

// Afficher le tableau de bord
function showDashboard() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
}

// Mettre à jour les informations du participant
function updateParticipantInfo() {
    if (!currentParticipant) return;

    // Header du participant
    document.getElementById('participant-name').textContent = 
        `Dr. ${currentParticipant.prenom} ${currentParticipant.nom}`;
    document.getElementById('participant-institution').textContent = 
        currentParticipant.institution;
    document.getElementById('participant-type').textContent = 
        currentParticipant.typeParticipant.charAt(0).toUpperCase() + 
        currentParticipant.typeParticipant.slice(1);
    document.getElementById('participant-code').textContent = 
        currentParticipant.codeAcces;

    // Date d'inscription
    const inscriptionDate = new Date(currentParticipant.dateInscription);
    document.getElementById('inscription-date').textContent = 
        inscriptionDate.toLocaleDateString('fr-FR');

    // Mettre à jour le badge modal
    updateBadgeModal();

    // Générer le QR code (simulation)
    generateQRCode();
}

// Mettre à jour le modal de badge
function updateBadgeModal() {
    if (!currentParticipant) return;

    document.getElementById('badge-name').textContent = 
        `Dr. ${currentParticipant.prenom} ${currentParticipant.nom}`;
    document.getElementById('badge-institution').textContent = 
        currentParticipant.institution;
    document.getElementById('badge-type').textContent = 
        currentParticipant.typeParticipant.toUpperCase();
    document.getElementById('badge-code').textContent = 
        currentParticipant.codeAcces;
}

// Générer et télécharger le badge PDF
async function generateBadge() {
    if (!currentParticipant) {
        showError('Erreur: Données du participant non disponibles');
        return;
    }

    try {
        // Afficher d'abord le modal de prévisualisation
        const badgeModal = document.getElementById('badge-modal');
        badgeModal.style.display = 'block';
        
        // Charger le QR code réel
        await loadRealQRCode();
        
        showSuccess('Badge généré! Vous pouvez maintenant le télécharger ou l\'imprimer.');
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur de connexion. Veuillez réessayer.');
    }
}

// Télécharger le badge PDF
async function downloadBadge() {
    if (!currentParticipant) {
        showError('Erreur: Données du participant non disponibles');
        return;
    }

    try {
        const response = await fetch(`/api/badge/${currentParticipant.codeAcces}`);
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `badge-${currentParticipant.codeAcces}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            showSuccess('Badge téléchargé avec succès!');
        } else {
            const result = await response.json();
            showError(result.error || 'Erreur lors du téléchargement du badge');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur de connexion. Veuillez réessayer.');
    }
}

// Télécharger le certificat PDF
async function downloadCertificat() {
    if (!currentParticipant) {
        showError('Erreur: Données du participant non disponibles');
        return;
    }

    try {
        const response = await fetch(`/api/certificat/${currentParticipant.codeAcces}`);
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `certificat-${currentParticipant.codeAcces}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            showSuccess('Certificat téléchargé avec succès!');
        } else {
            const result = await response.json();
            showError(result.error || 'Erreur lors du téléchargement du certificat');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur de connexion. Veuillez réessayer.');
    }
}

// Imprimer le badge
function printBadge() {
    const badgeContent = document.getElementById('badge-preview').innerHTML;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Badge - ${currentParticipant.prenom} ${currentParticipant.nom}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 20px;
                    background: white;
                }
                .badge-preview {
                    background: white;
                    border: 2px solid #e1e8ed;
                    border-radius: 15px;
                    padding: 30px;
                    max-width: 400px;
                    margin: 0 auto;
                }
                .badge-header {
                    text-align: center;
                    margin-bottom: 25px;
                    padding-bottom: 20px;
                    border-bottom: 2px solid #1abc9c;
                }
                .badge-content {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    margin-bottom: 25px;
                }
                .badge-photo {
                    width: 80px;
                    height: 80px;
                    background: #f8f9fa;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2rem;
                    color: #1abc9c;
                }
                .badge-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-top: 20px;
                    border-top: 1px solid #eee;
                }
                h2, h3 { color: #2c3e50; }
                p { color: #7f8c8d; }
            </style>
        </head>
        <body>
            <div class="badge-preview">${badgeContent}</div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
}

// Charger le QR code réel
async function loadRealQRCode() {
    if (!currentParticipant) return;

    try {
        const response = await fetch(`/api/qrcode/${currentParticipant.codeAcces}`);
        const result = await response.json();

        if (response.ok) {
            const qrContainer = document.getElementById('qr-code');
            qrContainer.innerHTML = `
                <div style="background: white; padding: 20px; border-radius: 10px; display: inline-block;">
                    <img src="${result.qrCode}" alt="QR Code" style="width: 150px; height: 150px; border: 1px solid #ddd;" />
                </div>
                <p style="margin-top: 15px; color: #2c3e50; font-weight: bold;">Code: ${currentParticipant.codeAcces}</p>
            `;
            
            // Mettre à jour aussi le QR code dans le badge modal
            const badgeQr = document.querySelector('.badge-qr');
            if (badgeQr) {
                badgeQr.innerHTML = `<img src="${result.qrCode}" alt="QR Code" style="width: 60px; height: 60px;" />`;
            }
        } else {
            console.error('Erreur QR code:', result.error);
            generateQRCodeFallback();
        }
    } catch (error) {
        console.error('Erreur chargement QR code:', error);
        generateQRCodeFallback();
    }
}

// Générer le QR code (fallback en cas d'erreur)
function generateQRCodeFallback() {
    if (!currentParticipant) return;

    const qrContainer = document.getElementById('qr-code');
    
    // Fallback avec simulation d'un QR code
    qrContainer.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 10px; display: inline-block;">
            <div style="width: 150px; height: 150px; background: #000; display: grid; grid-template-columns: repeat(15, 1fr); gap: 1px;">
                ${Array(225).fill().map((_, i) => 
                    `<div style="background: ${Math.random() > 0.5 ? '#000' : '#fff'}; width: 100%; height: 100%;"></div>`
                ).join('')}
            </div>
        </div>
        <p style="margin-top: 15px; color: #2c3e50; font-weight: bold;">Code: ${currentParticipant.codeAcces}</p>
    `;
}

// Générer le QR code (appelé lors de l'initialisation)
function generateQRCode() {
    loadRealQRCode();
}

// Afficher le QR code dans un modal
async function showQRCode() {
    if (!currentParticipant) {
        showError('Erreur: Données du participant non disponibles');
        return;
    }

    try {
        const response = await fetch(`/api/qrcode/${currentParticipant.codeAcces}`);
        const result = await response.json();

        if (response.ok) {
            // Créer un modal pour afficher le QR code
            const modalHTML = `
                <div id="qr-modal" class="modal" style="display: block;">
                    <div class="modal-content">
                        <span class="close" onclick="closeQRModal()">&times;</span>
                        <div class="modal-header">
                            <i class="fas fa-qrcode"></i>
                            <h3>Votre QR Code Personnel</h3>
                        </div>
                        <div class="modal-body" style="text-align: center; padding: 40px;">
                            <div style="background: white; padding: 30px; border-radius: 15px; display: inline-block; border: 2px solid #e1e8ed;">
                                <img src="${result.qrCode}" alt="QR Code Personnel" style="width: 250px; height: 250px;" />
                            </div>
                            <h3 style="margin: 20px 0 10px; color: #2c3e50;">
                                ${currentParticipant.prenom} ${currentParticipant.nom.toUpperCase()}
                            </h3>
                            <p style="color: #7f8c8d; margin-bottom: 10px;">${currentParticipant.institution}</p>
                            <p style="color: #1abc9c; font-weight: bold; font-size: 1.2rem;">
                                Code d'accès: ${currentParticipant.codeAcces}
                            </p>
                            <div style="margin-top: 30px;">
                                <button onclick="downloadQRCode()" class="btn btn-primary" style="margin-right: 10px;">
                                    <i class="fas fa-download"></i> Télécharger PNG
                                </button>
                                <button onclick="printQRCode()" class="btn btn-secondary">
                                    <i class="fas fa-print"></i> Imprimer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Ajouter le modal au DOM
            const existingModal = document.getElementById('qr-modal');
            if (existingModal) {
                existingModal.remove();
            }
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
        } else {
            showError(result.error || 'Erreur lors de la génération du QR code');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur de connexion. Veuillez réessayer.');
    }
}

// Fermer le modal QR code
function closeQRModal() {
    const modal = document.getElementById('qr-modal');
    if (modal) {
        modal.remove();
    }
}

// Télécharger le QR code en PNG
function downloadQRCode() {
    const qrImg = document.querySelector('#qr-modal img');
    if (qrImg) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 250;
        canvas.height = 250;
        
        const img = new Image();
        img.onload = function() {
            ctx.drawImage(img, 0, 0, 250, 250);
            canvas.toBlob(function(blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `qrcode-${currentParticipant.codeAcces}.png`;
                document.body.appendChild(a);
                a.click();
                URL.revokeObjectURL(url);
                document.body.removeChild(a);
                showSuccess('QR Code téléchargé avec succès!');
            });
        };
        img.src = qrImg.src;
    }
}

// Imprimer le QR code
function printQRCode() {
    const qrContent = document.querySelector('#qr-modal .modal-body').innerHTML;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>QR Code - ${currentParticipant.prenom} ${currentParticipant.nom}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 20px;
                    background: white;
                    text-align: center;
                }
                h3 { color: #2c3e50; }
                p { color: #7f8c8d; }
            </style>
        </head>
        <body>
            ${qrContent.replace(/<button[^>]*>.*?<\/button>/g, '')}
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
}

// Déconnexion
function logout() {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
        sessionStorage.removeItem('participantCode');
        sessionStorage.removeItem('participantData');
        currentParticipant = null;
        
        // Retourner à l'écran d'authentification
        document.getElementById('dashboard-section').style.display = 'none';
        document.getElementById('auth-section').style.display = 'block';
        
        // Réinitialiser le formulaire
        document.getElementById('auth-form').reset();
    }
}

// Afficher un message d'erreur
function showError(message) {
    const errorDiv = createNotification(message, 'error');
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 5000);
}

// Afficher un message de succès
function showSuccess(message) {
    const successDiv = createNotification(message, 'success');
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.parentNode.removeChild(successDiv);
        }
    }, 5000);
}

// Créer une notification
function createNotification(message, type = 'error') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'error' ? '#e74c3c' : '#27ae60'};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 2000;
        max-width: 300px;
        animation: slideInRight 0.3s ease;
    `;
    
    notification.innerHTML = `
        <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : 'check-circle'}"></i>
        <span style="margin-left: 10px;">${message}</span>
    `;
    
    return notification;
}

// Ajouter les styles d'animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// Vérifier la session à l'initialisation
window.addEventListener('load', () => {
    const savedData = sessionStorage.getItem('participantData');
    if (savedData) {
        try {
            currentParticipant = JSON.parse(savedData);
            showDashboard();
            updateParticipantInfo();
        } catch (error) {
            console.error('Erreur lors de la récupération des données sauvegardées:', error);
            sessionStorage.clear();
        }
    }
}); 