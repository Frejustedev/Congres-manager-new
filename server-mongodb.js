const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const { createCanvas } = require('canvas');

// Importer les modèles MongoDB
const Participant = require('./models/Participant');
const Abstract = require('./models/Abstract');
const Config = require('./models/Config');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration de la base de données
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/congres_medical';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Connexion à MongoDB
async function connectDB() {
    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connexion à MongoDB réussie');
    } catch (error) {
        console.error('❌ Erreur de connexion à MongoDB:', error);
        process.exit(1);
    }
}

// Fonctions utilitaires pour QR codes et PDF (identiques à la version précédente)

// Générer un QR code en base64
async function generateQRCode(data) {
    try {
        const qrCodeDataURL = await QRCode.toDataURL(data, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            quality: 0.92,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });
        return qrCodeDataURL;
    } catch (error) {
        console.error('Erreur génération QR code:', error);
        throw error;
    }
}

// Générer un badge PDF
async function generateBadgePDF(participant, config) {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: [400, 600],
                margins: { top: 40, bottom: 40, left: 30, right: 30 }
            });

            let buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                let pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            // Header du congrès
            doc.fontSize(16)
               .fillColor('#2c3e50')
               .font('Helvetica-Bold')
               .text(config.nom, { align: 'center' });

            doc.fontSize(12)
               .fillColor('#3498db')
               .font('Helvetica')
               .text(config.dates, { align: 'center' })
               .moveDown(0.5);

            doc.text(config.lieu, { align: 'center' })
               .moveDown(1);

            // Ligne de séparation
            doc.strokeColor('#1abc9c')
               .lineWidth(2)
               .moveTo(30, doc.y)
               .lineTo(370, doc.y)
               .stroke()
               .moveDown(1);

            // Informations participant
            doc.fontSize(18)
               .fillColor('#2c3e50')
               .font('Helvetica-Bold')
               .text(`${participant.prenom} ${participant.nom.toUpperCase()}`, { align: 'center' });

            doc.fontSize(12)
               .fillColor('#34495e')
               .font('Helvetica')
               .moveDown(0.5)
               .text(`Spécialité: ${participant.specialite}`, { align: 'center' })
               .text(`Institution: ${participant.institution}`, { align: 'center' })
               .moveDown(1);

            // Type de participant avec badge coloré
            const typeColors = {
                enseignant: '#e74c3c',
                medecin: '#3498db',
                paramedical: '#27ae60'
            };
            const typeLabels = {
                enseignant: 'ENSEIGNANT-CHERCHEUR',
                medecin: 'MÉDECIN/PHARMACIEN',
                paramedical: 'PARAMÉDICAL/ÉTUDIANT'
            };

            doc.rect(60, doc.y, 280, 30)
               .fillAndStroke(typeColors[participant.typeParticipant] || '#95a5a6', '#34495e');

            doc.fontSize(12)
               .fillColor('white')
               .font('Helvetica-Bold')
               .text(typeLabels[participant.typeParticipant] || participant.typeParticipant.toUpperCase(), 
                     60, doc.y - 20, { width: 280, align: 'center' });

            // QR Code
            doc.moveDown(2);
            const qrData = JSON.stringify({
                id: participant._id,
                nom: participant.nom,
                prenom: participant.prenom,
                code: participant.codeAcces,
                type: participant.typeParticipant
            });

            const qrCodeDataURL = await generateQRCode(qrData);
            const qrBuffer = Buffer.from(qrCodeDataURL.split(',')[1], 'base64');
            
            doc.image(qrBuffer, 150, doc.y, { width: 100, height: 100 });

            // Code d'accès
            doc.moveDown(8)
               .fontSize(14)
               .fillColor('#2c3e50')
               .font('Helvetica-Bold')
               .text(`Code: ${participant.codeAcces}`, { align: 'center' });

            // Footer
            doc.moveDown(1)
               .fontSize(8)
               .fillColor('#7f8c8d')
               .font('Helvetica')
               .text('Présentez ce badge à l\'entrée du congrès', { align: 'center' });

            doc.end();

        } catch (error) {
            reject(error);
        }
    });
}

// Générer un certificat de participation PDF
async function generateCertificatePDF(participant, config) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                layout: 'landscape',
                margins: { top: 60, bottom: 60, left: 60, right: 60 }
            });

            let buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                let pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            // Bordure décorative
            doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60)
               .lineWidth(3)
               .strokeColor('#1abc9c')
               .stroke();

            doc.rect(40, 40, doc.page.width - 80, doc.page.height - 80)
               .lineWidth(1)
               .strokeColor('#bdc3c7')
               .stroke();

            // Titre principal
            doc.fontSize(36)
               .fillColor('#2c3e50')
               .font('Helvetica-Bold')
               .text('CERTIFICAT DE PARTICIPATION', { align: 'center' })
               .moveDown(2);

            // Sous-titre du congrès
            doc.fontSize(18)
               .fillColor('#3498db')
               .font('Helvetica-Bold')
               .text(config.nom, { align: 'center' })
               .moveDown(0.5);

            doc.fontSize(14)
               .fillColor('#34495e')
               .font('Helvetica')
               .text(config.theme || config.description, { align: 'center' })
               .moveDown(0.5);

            doc.text(`${config.dates} - ${config.lieu}`, { align: 'center' })
               .moveDown(2);

            // Texte principal
            doc.fontSize(16)
               .fillColor('#2c3e50')
               .font('Helvetica')
               .text('Il est certifié que', { align: 'center' })
               .moveDown(1);

            // Nom du participant
            doc.fontSize(28)
               .fillColor('#e74c3c')
               .font('Helvetica-Bold')
               .text(`${participant.prenom} ${participant.nom.toUpperCase()}`, { align: 'center' })
               .moveDown(1);

            // Texte de certification
            doc.fontSize(16)
               .fillColor('#2c3e50')
               .font('Helvetica')
               .text('a participé activement au congrès en qualité de', { align: 'center' })
               .moveDown(0.5);

            const typeLabels = {
                enseignant: 'Enseignant-Chercheur',
                medecin: 'Médecin/Pharmacien Biologiste',
                paramedical: 'Paramédical/Étudiant'
            };

            doc.fontSize(18)
               .fillColor('#27ae60')
               .font('Helvetica-Bold')
               .text(typeLabels[participant.typeParticipant] || participant.typeParticipant, { align: 'center' })
               .moveDown(2);

            // Signature et date
            const currentDate = new Date().toLocaleDateString('fr-FR');
            
            doc.fontSize(12)
               .fillColor('#7f8c8d')
               .font('Helvetica')
               .text(`Délivré le ${currentDate}`, 100, doc.page.height - 150);

            doc.text('Président du Comité d\'Organisation', doc.page.width - 300, doc.page.height - 150, { width: 200 });

            doc.end();

        } catch (error) {
            reject(error);
        }
    });
}

// Routes API

// Route pour obtenir la configuration du congrès
app.get('/api/config', async (req, res) => {
    try {
        const config = await Config.getConfig();
        
        // Formatter la réponse pour maintenir la compatibilité avec le frontend
        const response = {
            congrès: {
                nom: config.nom,
                dates: config.dates,
                lieu: config.lieu,
                description: config.description,
                theme: config.theme,
                email: config.email,
                telephone: config.telephone,
                organisateurs: config.organisateurs,
                fraisInscription: config.fraisInscription,
                sousThemes: config.sousThemes,
                soumissions: config.soumissions,
                evenements: config.evenements
            }
        };
        
        res.json(response);
    } catch (error) {
        console.error('Erreur récupération config:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des données' });
    }
});

// Route pour l'inscription des participants
app.post('/api/inscription', async (req, res) => {
    try {
        const { nom, prenom, email, telephone, specialite, institution, typeParticipant } = req.body;
        
        // Vérifier si l'email existe déjà
        const existingParticipant = await Participant.findOne({ email });
        if (existingParticipant) {
            return res.status(400).json({ error: 'Cet email est déjà inscrit' });
        }
        
        // Générer un code d'accès unique
        const codeAcces = await Participant.generateCodeAcces();
        
        const nouveauParticipant = await Participant.create({
            nom,
            prenom,
            email,
            telephone,
            specialite,
            institution,
            typeParticipant,
            codeAcces
        });
        
        res.json({ 
            message: 'Inscription réussie!', 
            codeAcces,
            participantId: nouveauParticipant._id
        });
    } catch (error) {
        console.error('Erreur inscription:', error);
        res.status(500).json({ error: 'Erreur lors de l\'inscription' });
    }
});

// Route pour soumettre un abstract
app.post('/api/abstract', async (req, res) => {
    try {
        const { titre, auteurs, resume, motsClefs, email, langue } = req.body;
        
        // Trouver le participant correspondant
        const participant = await Participant.findOne({ email });
        
        const nouvelAbstract = await Abstract.create({
            titre,
            auteurs,
            resume,
            motsClefs,
            email,
            langue: langue || 'francais',
            participant: participant ? participant._id : null
        });
        
        res.json({ message: 'Abstract soumis avec succès!', abstractId: nouvelAbstract._id });
    } catch (error) {
        console.error('Erreur soumission abstract:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ error: messages.join(', ') });
        }
        res.status(500).json({ error: 'Erreur lors de la soumission de l\'abstract' });
    }
});

// Route pour vérifier le code d'accès
app.post('/api/verifier-code', async (req, res) => {
    try {
        const { codeAcces } = req.body;
        
        const participant = await Participant.findOne({ codeAcces });
        
        if (!participant) {
            return res.status(404).json({ error: 'Code d\'accès invalide' });
        }
        
        res.json({ 
            valide: true, 
            participant: {
                nom: participant.nom,
                prenom: participant.prenom,
                email: participant.email,
                typeParticipant: participant.typeParticipant,
                institution: participant.institution,
                dateInscription: participant.dateInscription
            }
        });
    } catch (error) {
        console.error('Erreur vérification code:', error);
        res.status(500).json({ error: 'Erreur lors de la vérification' });
    }
});

// Route pour générer un badge PDF
app.get('/api/badge/:codeAcces', async (req, res) => {
    try {
        const { codeAcces } = req.params;
        
        const participant = await Participant.findOne({ codeAcces });
        
        if (!participant) {
            return res.status(404).json({ error: 'Participant non trouvé' });
        }
        
        const config = await Config.getConfig();
        const badgePDF = await generateBadgePDF(participant, config);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="badge-${participant.codeAcces}.pdf"`);
        res.send(badgePDF);
        
    } catch (error) {
        console.error('Erreur génération badge:', error);
        res.status(500).json({ error: 'Erreur lors de la génération du badge' });
    }
});

// Route pour générer un QR code
app.get('/api/qrcode/:codeAcces', async (req, res) => {
    try {
        const { codeAcces } = req.params;
        
        const participant = await Participant.findOne({ codeAcces });
        
        if (!participant) {
            return res.status(404).json({ error: 'Participant non trouvé' });
        }
        
        const qrData = JSON.stringify({
            id: participant._id,
            nom: participant.nom,
            prenom: participant.prenom,
            code: participant.codeAcces,
            type: participant.typeParticipant
        });
        
        const qrCodeDataURL = await generateQRCode(qrData);
        
        res.json({ qrCode: qrCodeDataURL });
        
    } catch (error) {
        console.error('Erreur génération QR code:', error);
        res.status(500).json({ error: 'Erreur lors de la génération du QR code' });
    }
});

// Route pour générer un certificat PDF
app.get('/api/certificat/:codeAcces', async (req, res) => {
    try {
        const { codeAcces } = req.params;
        
        const participant = await Participant.findOne({ codeAcces });
        
        if (!participant) {
            return res.status(404).json({ error: 'Participant non trouvé' });
        }
        
        const config = await Config.getConfig();
        const certificatPDF = await generateCertificatePDF(participant, config);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="certificat-${participant.codeAcces}.pdf"`);
        res.send(certificatPDF);
        
    } catch (error) {
        console.error('Erreur génération certificat:', error);
        res.status(500).json({ error: 'Erreur lors de la génération du certificat' });
    }
});

// Routes pour les statistiques (nouvelles fonctionnalités MongoDB)
app.get('/api/stats', async (req, res) => {
    try {
        const participantCount = await Participant.countDocuments();
        const abstractCount = await Abstract.countDocuments();
        
        const participantsByType = await Participant.aggregate([
            {
                $group: {
                    _id: '$typeParticipant',
                    count: { $sum: 1 }
                }
            }
        ]);
        
        const abstractsByStatus = await Abstract.aggregate([
            {
                $group: {
                    _id: '$statut',
                    count: { $sum: 1 }
                }
            }
        ]);
        
        res.json({
            participants: {
                total: participantCount,
                byType: participantsByType
            },
            abstracts: {
                total: abstractCount,
                byStatus: abstractsByStatus
            }
        });
    } catch (error) {
        console.error('Erreur statistiques:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
    }
});

// Route principale
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route pour le tableau de bord
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Gestion des erreurs MongoDB
mongoose.connection.on('error', err => {
    console.error('❌ Erreur MongoDB:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('⚠️  MongoDB déconnecté');
});

// Initialiser et démarrer le serveur
async function startServer() {
    try {
        // Connecter à MongoDB
        await connectDB();
        
        // Vérifier que la configuration existe
        await Config.getConfig();
        
        app.listen(PORT, () => {
            console.log(`🏥 Serveur du Congrès Médical démarré sur http://localhost:${PORT}`);
            console.log(`📊 Tableau de bord disponible sur http://localhost:${PORT}/dashboard`);
            console.log(`🗄️  Base de données MongoDB connectée`);
        });
    } catch (error) {
        console.error('❌ Erreur démarrage serveur:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Arrêt du serveur...');
    await mongoose.disconnect();
    console.log('📡 Déconnexion de MongoDB');
    process.exit(0);
});

startServer(); 