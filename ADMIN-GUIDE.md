# 🔧 Guide d'Administration - Congrès SAFBMEN/SBCB

Interface d'administration complète pour gérer votre congrès médical de A à Z.

## 🚀 **ACCÈS ADMINISTRATION**

### URL d'accès
```
http://localhost:3000/admin
```

### Mot de passe par défaut
```
admin2024
```
> ⚠️ **Important** : Changez ce mot de passe en production dans le fichier `public/admin.js` ligne 8

---

## 📊 **TABLEAU DE BORD**

### Statistiques en temps réel
- **Total participants** inscrits avec répartition par type
- **Abstracts soumis** avec statuts (en révision/accepté/refusé)
- **Revenus estimés** calculés automatiquement selon les tarifs
- **Inscriptions récentes** (aujourd'hui/cette semaine)

### Graphiques interactifs
- **Répartition participants** : Enseignants vs Médecins vs Paramédicaux
- **Statut abstracts** : Progression des révisions
- **Tendances inscriptions** : Évolution sur 7 jours
- **État base de données** : MongoDB ou JSON

---

## 👥 **GESTION DES PARTICIPANTS**

### Fonctionnalités
✅ **Recherche avancée** par nom, email, institution  
✅ **Filtrage** par type de participant  
✅ **Sélection multiple** pour actions en masse  
✅ **Modification individuelle** des profils  
✅ **Suppression** avec confirmation  
✅ **Génération badges** à la demande  

### Actions en masse
- **Modifier** plusieurs participants à la fois
- **Supprimer** des inscriptions en lot
- **Envoyer emails** à une sélection
- **Export** de listes ciblées

### Informations affichées
| Champ | Description |
|-------|-------------|
| Nom complet | Prénom + Nom |
| Email | Contact principal |
| Type | Enseignant/Médecin/Paramédical |
| Institution | Établissement d'origine |
| Code accès | Identifiant unique |
| Date inscription | Horodatage |

---

## 📄 **GESTION DES ABSTRACTS**

### Workflow de révision
1. **Soumission** : Abstract en statut "En révision"
2. **Évaluation** : Lecture du contenu complet
3. **Décision** : Accepter ou Refuser avec commentaires
4. **Notification** : Email automatique à l'auteur

### Interface de révision
- **Titre et auteurs** clairement affichés
- **Résumé complet** avec mise en forme
- **Sous-thème** associé
- **Statut visuel** avec badges colorés
- **Actions rapides** : Voir/Accepter/Refuser/Supprimer

### Statuts disponibles
- 🟡 **En révision** : En attente d'évaluation
- 🟢 **Accepté** : Validé pour présentation
- 🔴 **Refusé** : Non retenu avec motifs

---

## 📋 **EXPORTS ET RAPPORTS**

### Export participants
**Formats** : Excel (.xlsx) / CSV  
**Contenu** :
- Informations personnelles complètes
- Institution et spécialité
- Codes d'accès et dates
- Statistiques de participation

### Export abstracts
**Formats** : Excel (.xlsx) / CSV  
**Contenu** :
- Contenu complet des abstracts
- Statut et commentaires de révision
- Informations auteurs
- Dates de soumission/révision

### Rapport complet PDF
**Inclut** :
- Statistiques générales du congrès
- Graphiques et tendances
- Analyse des inscriptions
- Recommandations automatiques

### Utilisation
```bash
# Export automatique avec nom de fichier horodaté
participants_2024-12-18.xlsx
abstracts_2024-12-18.csv
rapport_complet_2024-12-18.pdf
```

---

## 📧 **SYSTÈME D'EMAILS**

### Templates prédéfinis
1. **Confirmation d'inscription**
   - Rappel du code d'accès
   - Informations pratiques
   - Badge à télécharger

2. **Rappel événement**
   - Notification 1 semaine avant
   - Programme personnalisé
   - Consignes dernière minute

3. **Statut abstract**
   - Acceptation avec félicitations
   - Refus avec explications
   - Instructions pour la présentation

### Groupes de destinataires
- **Tous les participants** : Communication générale
- **Par type** : Enseignants/Médecins/Paramédicaux
- **Auteurs d'abstracts** : Informations spécifiques
- **Sélection manuelle** : Participants choisis

### Configuration email
```javascript
// Dans server.js - Configuration SMTP
const emailConfig = {
    host: 'smtp.gmail.com',
    port: 587,
    auth: {
        user: 'congresconjointbiologie@gmail.com',
        pass: 'MOT_DE_PASSE_APPLICATION'
    }
};
```

### Variables dynamiques
- `{{nom}}` : Nom du participant
- `{{codeAcces}}` : Code d'accès unique
- `{{titre}}` : Titre de l'abstract
- `{{statut}}` : Statut actuel
- `{{commentaires}}` : Commentaires du reviewer

---

## 🔒 **SÉCURITÉ**

### Authentification
- **Mot de passe unique** pour l'administration
- **Session sécurisée** avec token
- **Déconnexion automatique** après inactivité

### Bonnes pratiques
1. **Changez le mot de passe** par défaut
2. **Utilisez HTTPS** en production
3. **Limitez l'accès** aux IP autorisées
4. **Sauvegardez** régulièrement les données

### Variables d'environnement
```bash
# Créer un fichier .env
EMAIL_USER=votre-email@gmail.com
EMAIL_PASS=mot_de_passe_application
ADMIN_PASSWORD=votre_mot_de_passe_securise
```

---

## 🛠️ **MAINTENANCE**

### Actualisation des données
- **Bouton "Actualiser"** : Rechargement en temps réel
- **Auto-refresh** : Statistiques mises à jour
- **Synchronisation** : MongoDB ↔ JSON

### Monitoring
- **État de la base** : Visible en permanence
- **Connexions** : Nombre d'utilisateurs actifs
- **Performance** : Temps de réponse API

### Dépannage
```bash
# Redémarrer le serveur
npm start

# Vérifier les logs
tail -f logs/admin.log

# Test des emails
curl -X POST http://localhost:3000/api/send-bulk-email
```

---

## 📱 **RESPONSIVE DESIGN**

### Desktop (> 1024px)
- **Navigation latérale** fixe
- **Graphiques** en grille 2x2
- **Tableaux** avec toutes les colonnes

### Tablet (768px - 1024px)
- **Navigation** réduite
- **Graphiques** en colonne unique
- **Actions** simplifiées

### Mobile (< 768px)
- **Menu hamburger** avec overlay
- **Interface** adaptée au tactile
- **Cartes** plutôt que tableaux

---

## 🚀 **FONCTIONNALITÉS AVANCÉES**

### Prochaines améliorations
- **Notifications push** en temps réel
- **Chat support** intégré
- **Backup automatique** quotidien
- **Analytics Google** intégré
- **API REST** complète pour intégrations
- **Dashboard mobile** dédié

### Personnalisation
- **Thèmes** de couleurs
- **Logo** personnalisé
- **Widgets** configurables
- **Rapports** sur mesure

---

## 📞 **SUPPORT**

### En cas de problème
1. **Consultez** la console navigateur (F12)
2. **Vérifiez** les logs serveur
3. **Redémarrez** le service si nécessaire
4. **Contactez** l'équipe technique

### Logs importants
```bash
# Logs de connexion
✅ Admin connecté à [timestamp]

# Logs d'actions
📊 Export participants généré par admin
📧 Email envoyé à 150 participants
🗑️ Participant supprimé: [ID]

# Logs d'erreur
❌ Erreur envoi email: [détails]
⚠️ Tentative de connexion échouée
```

---

## 🎯 **UTILISATION OPTIMALE**

### Workflow recommandé
1. **Matin** : Consulter le dashboard et statistiques
2. **Révision abstracts** : 30min par session
3. **Réponse emails** : Template + personnalisation
4. **Export données** : Sauvegarde hebdomadaire
5. **Communication** : Newsletter bi-hebdomadaire

### Raccourcis clavier
- `Ctrl + R` : Actualiser les données
- `Ctrl + S` : Sauvegarder les modifications
- `Ctrl + E` : Ouvrir l'export rapide
- `Esc` : Fermer les modals

---

**🎉 Votre interface d'administration est maintenant prête pour gérer efficacement le congrès SAFBMEN/SBCB avec plus de 500 participants attendus !** 