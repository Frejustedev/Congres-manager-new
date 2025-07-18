# 🗄️ Installation MongoDB pour Base de Données Robuste

Ce guide vous permet d'installer MongoDB pour bénéficier d'une base de données robuste et performante au lieu des fichiers JSON.

## 🚀 État Actuel du Système

✅ **Le système fonctionne déjà** avec les fichiers JSON en mode **fallback**  
⚡ **Installation optionnelle** : MongoDB améliore les performances et la fiabilité  
🔄 **Migration automatique** : Les données JSON existantes seront transférées vers MongoDB

## 📥 Options d'Installation MongoDB

### Option 1: MongoDB Atlas (Cloud - Recommandé)

**Avantages :** Gratuit, aucune installation locale, sauvegarde automatique

1. **Créer un compte gratuit :**
   - Visitez [mongodb.com/atlas](https://www.mongodb.com/atlas)
   - Créez un compte gratuit (512MB gratuits)

2. **Créer un cluster :**
   - Sélectionnez "Shared" (gratuit)
   - Région : Europe (Frankfurt) ou US East
   - Créez le cluster

3. **Configurer l'accès :**
   - **Database Access** : Créez un utilisateur avec mot de passe
   - **Network Access** : Ajoutez `0.0.0.0/0` (toutes IPs)

4. **Obtenir l'URI de connexion :**
   - Cliquez "Connect" → "Connect your application"
   - Copiez l'URI (format : `mongodb+srv://username:password@cluster.xxx.mongodb.net/congres_medical`)

5. **Configurer dans le projet :**
   ```bash
   # Créer un fichier .env
   echo MONGODB_URI=mongodb+srv://votre-username:votre-password@cluster.xxx.mongodb.net/congres_medical > .env
   ```

### Option 2: MongoDB Community (Local)

**Installation sur Windows :**

1. **Télécharger MongoDB :**
   - Visitez [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
   - Sélectionnez "Windows x64"
   - Téléchargez le fichier MSI

2. **Installer MongoDB :**
   ```powershell
   # Exécuter l'installateur téléchargé
   # OU installer via Chocolatey
   choco install mongodb
   ```

3. **Démarrer MongoDB :**
   ```powershell
   # Créer le dossier de données
   mkdir C:\data\db
   
   # Démarrer MongoDB
   mongod --dbpath C:\data\db
   ```

4. **Service Windows (optionnel) :**
   ```powershell
   # Installer comme service Windows
   mongod --install --serviceName MongoDB --dbpath C:\data\db
   net start MongoDB
   ```

## 🔄 Migration des Données

Une fois MongoDB installé et configuré :

### 1. Redémarrer le serveur
```bash
# Arrêter le serveur actuel
Ctrl+C (ou taskkill /f /im node.exe)

# Redémarrer
node server.js
```

### 2. Vérifier la connexion
Le serveur affichera :
```
✅ Base de données MongoDB connectée
🗄️  Base de données: MongoDB (mongodb://localhost:27017/congres_medical)
```

### 3. Migration automatique
```bash
# Lancer la migration depuis l'interface ou via API
curl -X POST http://localhost:3000/api/migrate-to-mongodb
```

### 4. Vérifier la migration
```bash
# Voir les statistiques
curl http://localhost:3000/api/stats
```

## 📊 Avantages de MongoDB

### 🚀 **Performances**
- **Requêtes rapides** avec indexation automatique
- **Recherche avancée** par critères multiples
- **Pagination efficace** pour de gros volumes

### 🔒 **Fiabilité**
- **Transactions ACID** pour la cohérence des données
- **Validation automatique** des schémas
- **Sauvegarde** et récupération intégrées

### 📈 **Scalabilité**
- **Support de milliers** de participants
- **Requêtes complexes** (statistiques, rapports)
- **Clustering** pour haute disponibilité

### 🔧 **Fonctionnalités Avancées**
- **Recherche full-text** dans les abstracts
- **Agrégation** pour statistiques complexes
- **Relations** entre participants et abstracts
- **Historique** des modifications

## 🆕 Nouvelles Fonctionnalités avec MongoDB

Une fois MongoDB activé, le système gagne :

### 📊 **API Statistiques Avancées**
```bash
GET /api/stats
```
```json
{
  "participants": {
    "total": 50,
    "byType": [
      {"_id": "enseignant", "count": 20},
      {"_id": "medecin", "count": 25},
      {"_id": "paramedical", "count": 5}
    ]
  },
  "abstracts": {
    "total": 30,
    "byStatus": [
      {"_id": "en_review", "count": 15},
      {"_id": "accepte", "count": 12},
      {"_id": "refuse", "count": 3}
    ]
  },
  "database": {
    "type": "MongoDB",
    "connected": true
  }
}
```

### 🔍 **Recherche Avancée**
- Recherche par nom, institution, spécialité
- Filtrage des abstracts par statut, thème
- Tri par date, alphabétique, type

### 📈 **Tableaux de Bord**
- Graphiques en temps réel
- Statistiques de participation
- Suivi des soumissions d'abstracts

### 🔄 **Gestion Avancée**
- Modification en masse des participants
- Workflow de révision des abstracts
- Notifications automatiques

## 🛠️ **Dépannage**

### MongoDB ne se connecte pas
```bash
# Vérifier que MongoDB est démarré
mongosh
# ou
telnet localhost 27017
```

### Erreur de permissions
```bash
# Windows : Exécuter PowerShell en administrateur
# Vérifier les permissions du dossier C:\data\db
```

### URI Atlas incorrect
```bash
# Vérifier le format dans .env
# Remplacer <password> par votre vrai mot de passe
# Échapper les caractères spéciaux dans le mot de passe
```

## 🎯 **Recommandations**

### Pour le Développement
- **MongoDB Atlas** : Plus simple, gratuit, aucune maintenance

### Pour la Production
- **MongoDB Local** : Contrôle total, performance maximale
- **Sauvegarde régulière** recommandée

### Migration Progressive
1. **Continuer avec JSON** pour tester les nouvelles fonctionnalités
2. **Installer MongoDB** quand prêt pour la production
3. **Migrer automatiquement** les données existantes
4. **Profiter des fonctionnalités avancées**

---

## 📞 Support

En cas de problème :
1. Le système **fonctionne toujours** avec les fichiers JSON
2. MongoDB est **optionnel** pour améliorer les performances
3. La **migration est réversible** et sans perte de données

**Le système de gestion de congrès reste pleinement fonctionnel avec ou sans MongoDB !** 🎉 