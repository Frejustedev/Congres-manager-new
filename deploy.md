# 🚀 Guide de Déploiement Gratuit - CongrésManager

## ✅ SOLUTION IMMÉDIATE (Active maintenant)

### 🎯 NGROK (Partage instantané)
Votre site est maintenant accessible publiquement via ngrok !

**Étapes :**
1. ✅ Serveur local lancé sur port 9999
2. ✅ ngrok installé et lancé  
3. 📱 Interface ngrok ouverte sur http://127.0.0.1:4040

**Pour obtenir votre URL publique :**
- Allez sur http://127.0.0.1:4040
- Copiez l'URL HTTPS (ex: https://abc123.ngrok.io)
- Partagez cette URL avec qui vous voulez !

---

## 🌐 SOLUTIONS PERMANENTES GRATUITES

### 1. 🏆 RENDER.com (Recommandé)
**Avantages :** Gratuit, permanent, custom domain
```bash
1. Créer compte sur render.com
2. "New Web Service" → GitHub
3. Connecter votre repo
4. Build Command: npm install
5. Start Command: npm start
6. Deploy !
```

### 2. 🚄 RAILWAY.app
**Avantages :** Très simple, CLI puissant
```bash
npm install -g @railway/cli
railway login
railway up
```

### 3. 🐙 VERCEL (Si static)
```bash
npm install -g vercel
vercel
```

### 4. 🌊 NETLIFY
- Drag & drop votre dossier sur netlify.com
- Ou connecter GitHub

### 5. 🆓 CYCLIC.sh
- Fork votre repo sur GitHub
- Connecter à cyclic.sh
- Deploy automatique

---

## 📱 PARTAGE RAPIDE

### Avec ngrok (maintenant actif) :
```bash
# Votre commande actuelle
ngrok http 9999

# Récupérer l'URL
curl http://127.0.0.1:4040/api/tunnels
```

### Alternative : Localtunnel
```bash
npm install -g localtunnel
lt --port 9999 --subdomain congresmanager
```

---

## 🔧 PRÉPARATION POUR DÉPLOIEMENT

### Fichiers requis pour certaines plateformes :

**1. Vercel (vercel.json)**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/server.js"
    }
  ]
}
```

**2. Heroku alternative (Dockerfile)**
```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 🎯 ACTIONS IMMÉDIATES

1. **MAINTENANT :** Utilisez l'URL ngrok depuis http://127.0.0.1:4040
2. **CETTE SEMAINE :** Configurez Render.com pour un site permanent
3. **BONUS :** Ajoutez un nom de domaine gratuit (.tk, .ml, .ga)

---

## 🆘 DÉPANNAGE

**Si ngrok ne fonctionne pas :**
```bash
# Vérifier le port
netstat -ano | findstr :9999

# Relancer ngrok
ngrok http 9999 --region eu
```

**Si le site ne charge pas :**
- Vérifiez que le serveur local fonctionne
- Testez d'abord sur http://localhost:9999
- Vérifiez les logs ngrok

---

💡 **Astuce :** Pour une présentation professionnelle, utilisez Render.com qui donne une URL permanente comme `https://votresite.onrender.com` 