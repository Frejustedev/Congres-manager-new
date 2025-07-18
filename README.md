# 🏥 Système de Gestion de Congrès Médical

Un site web complet et moderne pour gérer de A à Z un congrès de médecine, avec interface publique et tableau de bord privé pour les participants.

## ✨ Fonctionnalités

### 🌐 Interface Publique
- **Page d'accueil élégante** avec informations générales du congrès
- **Programme détaillé** sur 3 jours avec sessions spécialisées
- **Inscription en ligne** pour participants, panélistes et étudiants
- **Soumission d'abstracts** avec formulaire complet
- **Tarification différenciée** selon le type de participant
- **Design responsive** adapté à tous les appareils

### 🔐 Tableau de Bord Privé
- **Authentification sécurisée** avec code d'accès unique
- **Profil personnalisé** avec informations du participant
- **Génération de badges** avec QR code personnel
- **Programme personnalisé** avec statut de participation
- **Documents téléchargeables** (badges, certificats)
- **Informations pratiques** (lieu, horaires, WiFi, contacts)
- **Notifications** en temps réel

## 🚀 Installation et Lancement

### Prérequis
- Node.js 16+ installé
- npm ou yarn

### Installation
```bash
# Cloner ou télécharger le projet
cd CONGRESMANAGER

# Installer les dépendances
npm install

# Démarrer le serveur
npm start
```

### Accès à l'application
- **Site principal** : http://localhost:3000
- **Tableau de bord** : http://localhost:3000/dashboard

## 🎯 Utilisation

### 1. Inscription au Congrès
1. Visitez la page d'accueil
2. Naviguez vers la section "Inscription"
3. Choisissez votre type de participation :
   - **Participant** (250€) : Accès complet avec certificat
   - **Panéliste** (150€) : Inclut présentation et badge spécial
   - **Étudiant** (100€) : Tarif réduit avec accès aux sessions
4. Remplissez le formulaire avec vos informations
5. Recevez votre **code d'accès unique** à conserver

### 2. Soumission d'Abstract
1. Accédez à la section "Abstract"
2. Remplissez le formulaire avec :
   - Titre de votre présentation
   - Liste des auteurs
   - Résumé (max 500 caractères)
   - Mots-clés
3. Soumettez pour révision

### 3. Accès au Tableau de Bord
1. Visitez `/dashboard`
2. Saisissez votre code d'accès
3. Accédez à votre espace personnel avec :
   - Génération de votre badge personnalisé
   - Visualisation de votre programme
   - Téléchargement des documents
   - QR code personnel pour l'entrée

## 🏗️ Architecture Technique

### Backend (Node.js + Express)
- **API REST** complète avec gestion des erreurs
- **Stockage JSON** pour les données (participants, abstracts, configuration)
- **Validation** des données côté serveur
- **Génération automatique** de codes d'accès uniques

### Frontend (HTML5 + CSS3 + JavaScript)
- **Design moderne** avec dégradés et animations
- **Interface responsive** compatible mobile/desktop
- **Validation** en temps réel des formulaires
- **Modals interactifs** pour les confirmations
- **Smooth scrolling** et navigation fluide

### Sécurité
- **Codes d'accès uniques** générés automatiquement
- **Validation** des données d'entrée
- **Sessions** côté client pour l'authentification
- **Protection** contre les doublons d'inscription

## 📁 Structure du Projet

```
CONGRESMANAGER/
├── server.js              # Serveur backend principal
├── package.json           # Configuration et dépendances
├── data/                  # Dossier des données JSON
│   ├── participants.json  # Base des participants
│   ├── abstracts.json     # Base des abstracts
│   └── config.json        # Configuration du congrès
└── public/                # Interface frontend
    ├── index.html         # Page d'accueil publique
    ├── dashboard.html     # Tableau de bord privé
    ├── styles.css         # Styles principaux
    ├── dashboard.css      # Styles du tableau de bord
    ├── script.js          # JavaScript page publique
    └── dashboard.js       # JavaScript tableau de bord
```

## 🔧 Configuration

### Modifier les informations du congrès
Éditez le fichier `data/config.json` (créé automatiquement au premier lancement) :

```json
{
  "congrès": {
    "nom": "Congrès International de Médecine",
    "dates": "15-17 Mars 2024",
    "lieu": "Centre de Conférences Médical",
    "description": "Un événement prestigieux...",
    "email": "contact@congres-medical.com",
    "fraisInscription": {
      "participant": 250,
      "paneliste": 150,
      "etudiant": 100
    }
  }
}
```

### Modifier le programme
Éditez directement le HTML dans `public/index.html` section `#programme`.

## 📊 Gestion des Données

### Participants
- Stockage automatique dans `data/participants.json`
- Génération de codes d'accès uniques (6 caractères)
- Informations complètes : nom, email, spécialité, institution
- Statut d'inscription et date d'enregistrement

### Abstracts
- Stockage dans `data/abstracts.json`
- Suivi du statut de révision
- Liaison avec l'email de l'auteur principal

## 🎨 Personnalisation

### Couleurs et Thème
Modifiez les variables CSS dans `public/styles.css` :
- **Couleur principale** : `#1abc9c` (turquoise médical)
- **Couleur secondaire** : `#2c3e50` (bleu marine)
- **Dégradés** : `#667eea` vers `#764ba2`

### Contenu
- **Logo** : Remplacez l'icône Font Awesome par votre logo
- **Textes** : Modifiez directement dans les fichiers HTML
- **Images** : Ajoutez vos visuels dans le dossier `public/`

## 🔄 Fonctionnalités Avancées

### Génération de Documents
- **Badges personnalisés** avec QR codes
- **Certificats de participation** (après le congrès)
- **Format d'impression** optimisé

### Notifications
- **Messages en temps réel** dans le tableau de bord
- **Alertes importantes** pour les participants
- **Mises à jour du programme**

### Responsive Design
- **Navigation mobile** avec menu hamburger
- **Formulaires adaptés** pour smartphone
- **Tableaux de bord optimisés** pour tablettes

## 🆘 Support et Dépannage

### Problèmes Courants

**Le serveur ne démarre pas :**
- Vérifiez que le port 3000 est libre
- Installez les dépendances avec `npm install`

**Erreur de code d'accès :**
- Vérifiez la casse (codes en majuscules)
- Consultez le fichier `data/participants.json`

**Problèmes d'affichage :**
- Videz le cache du navigateur
- Vérifiez la console pour les erreurs JavaScript

### Extension Possible
- **Base de données** : Migration vers MongoDB/PostgreSQL
- **Email automatique** : Envoi des codes par email
- **Paiement en ligne** : Intégration Stripe/PayPal
- **QR codes réels** : Intégration d'une bibliothèque QR
- **PDF automatique** : Génération de documents PDF

## 📞 Contact

Pour toute question technique ou demande de personnalisation, l'architecture modulaire permet des extensions faciles selon vos besoins spécifiques.

---

*Développé avec ❤️ pour la communauté médicale* 