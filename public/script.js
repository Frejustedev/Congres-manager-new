// Variables globales
let configData = null;

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    loadCongressConfig();
    initializeEventListeners();
    initializeNavigation();
});

// Charger la configuration du congrès
async function loadCongressConfig() {
    try {
        const response = await fetch('/api/config');
        configData = await response.json();
        
        if (configData && configData.congrès) {
            updatePageContent(configData.congrès);
        }
    } catch (error) {
        console.error('Erreur lors du chargement de la configuration:', error);
    }
}

// Mettre à jour le contenu de la page
function updatePageContent(congress) {
    const elements = {
        'dates-congres': congress.dates,
        'lieu-congres': congress.lieu,
        'description-congres': congress.description,
        'email-contact': congress.email,
        'prix-enseignant': congress.fraisInscription.enseignant,
        'prix-medecin': congress.fraisInscription.medecin,
        'prix-paramedical': congress.fraisInscription.paramedical
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
    
    document.title = congress.nom;
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
        heroTitle.textContent = congress.nom;
    }
}

// Initialiser les écouteurs d'événements
function initializeEventListeners() {
    const inscriptionForm = document.getElementById('inscription-form');
    if (inscriptionForm) {
        inscriptionForm.addEventListener('submit', handleInscription);
    }
    
    const abstractForm = document.getElementById('abstract-form');
    if (abstractForm) {
        abstractForm.addEventListener('submit', handleAbstractSubmission);
    }
    
    const modal = document.getElementById('success-modal');
    const closeBtn = document.querySelector('.close');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Navigation
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-menu a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            scrollToSection(targetId);
        });
    });
}

function scrollToSection(sectionId) {
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        const navbarHeight = document.querySelector('.navbar').offsetHeight;
        const targetPosition = targetSection.offsetTop - navbarHeight - 20;
        
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
    }
}

// Gérer l'inscription
async function handleInscription(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    if (!validateInscriptionForm(data)) {
        return;
    }
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Inscription en cours...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('/api/inscription', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showSuccessModal(
                'Inscription réussie! Votre code d\'accès a été généré.',
                result.codeAcces
            );
            form.reset();
        } else {
            showErrorMessage(result.error || 'Erreur lors de l\'inscription');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showErrorMessage('Erreur de connexion. Veuillez réessayer.');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Gérer la soumission d'abstract
async function handleAbstractSubmission(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    if (!validateAbstractForm(data)) {
        return;
    }
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Soumission en cours...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('/api/abstract', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showSuccessModal('Abstract soumis avec succès!');
            form.reset();
        } else {
            showErrorMessage(result.error || 'Erreur lors de la soumission');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showErrorMessage('Erreur de connexion. Veuillez réessayer.');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Validations
function validateInscriptionForm(data) {
    const requiredFields = ['nom', 'prenom', 'email', 'telephone', 'specialite', 'institution', 'typeParticipant'];
    
    for (let field of requiredFields) {
        if (!data[field] || data[field].trim() === '') {
            showErrorMessage(`Le champ ${getFieldLabel(field)} est requis.`);
            return false;
        }
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        showErrorMessage('Veuillez entrer une adresse email valide.');
        return false;
    }
    
    return true;
}

function validateAbstractForm(data) {
    const requiredFields = ['titre', 'auteurs', 'email', 'langue', 'resume', 'motsClefs'];
    
    for (let field of requiredFields) {
        if (!data[field] || data[field].trim() === '') {
            showErrorMessage(`Le champ ${getFieldLabel(field)} est requis.`);
            return false;
        }
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        showErrorMessage('Veuillez entrer une adresse email valide.');
        return false;
    }
    
    // Vérifier la limite de mots (300 mots maximum)
    const wordCount = data.resume.trim().split(/\s+/).length;
    if (wordCount > 300) {
        showErrorMessage(`Le résumé ne doit pas dépasser 300 mots. Vous avez ${wordCount} mots.`);
        return false;
    }
    
    // Vérifier le nombre de mots-clés (5 maximum)
    const keywords = data.motsClefs.split(',').map(k => k.trim()).filter(k => k.length > 0);
    if (keywords.length > 5) {
        showErrorMessage('Vous ne pouvez pas saisir plus de 5 mots-clés.');
        return false;
    }
    
    return true;
}

function getFieldLabel(field) {
    const labels = {
        'nom': 'Nom',
        'prenom': 'Prénom',
        'email': 'Email',
        'telephone': 'Téléphone',
        'specialite': 'Spécialité',
        'institution': 'Institution',
        'typeParticipant': 'Type de participant',
        'titre': 'Titre',
        'auteurs': 'Auteurs',
        'langue': 'Langue',
        'resume': 'Résumé',
        'motsClefs': 'Mots-clés'
    };
    return labels[field] || field;
}

// Interface utilisateur
function showSuccessModal(message, codeAcces = null) {
    const modal = document.getElementById('success-modal');
    const messageElement = document.getElementById('success-message');
    const codeContainer = document.getElementById('code-acces-container');
    const codeElement = document.getElementById('code-acces');
    
    messageElement.textContent = message;
    
    if (codeAcces) {
        codeElement.textContent = codeAcces;
        codeContainer.style.display = 'block';
        
        // Ajouter le bouton de paiement s'il n'existe pas déjà
        let paymentBtn = codeContainer.querySelector('.payment-btn');
        if (!paymentBtn) {
            paymentBtn = document.createElement('a');
            paymentBtn.href = `/payment?participant=${codeAcces}`;
            paymentBtn.className = 'btn btn-primary payment-btn';
            paymentBtn.innerHTML = '<i class="fas fa-credit-card"></i> Procéder au paiement';
            paymentBtn.style.cssText = 'margin-top: 15px; display: inline-block; text-decoration: none;';
            codeContainer.appendChild(paymentBtn);
        } else {
            // Mettre à jour le lien si le bouton existe déjà
            paymentBtn.href = `/payment?participant=${codeAcces}`;
        }
        
        // Sauvegarder le code dans sessionStorage
        sessionStorage.setItem('participantCode', codeAcces);
    } else {
        codeContainer.style.display = 'none';
    }
    
    modal.style.display = 'block';
}

function showErrorMessage(message) {
    alert(message);
}

function copyCode() {
    const codeElement = document.getElementById('code-acces');
    const code = codeElement.textContent;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(code).then(() => {
            alert('Code copié!');
        });
    } else {
        const textArea = document.createElement('textarea');
        textArea.value = code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Code copié!');
    }
} 