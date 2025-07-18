const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const { createCanvas } = require('canvas');
const XLSX = require('xlsx');
const { Parser } = require('json2csv');
const nodemailer = require('nodemailer');
const FedaPay = require('fedapay');

// Utiliser le nouveau module de base de données hybride
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 9999;

// Configuration FedaPay - Nouvelle approche
try {
    // Configuration moderne de FedaPay
    if (FedaPay.setApiKey && typeof FedaPay.setApiKey === 'function') {
        FedaPay.setApiKey(process.env.FEDAPAY_SECRET_KEY || 'sk_sandbox_your_secret_key');
        FedaPay.setEnvironment(process.env.FEDAPAY_ENV || 'sandbox');
    } else {
        // Configuration alternative pour la nouvelle version
        FedaPay.config({
            api_key: process.env.FEDAPAY_SECRET_KEY || 'sk_sandbox_your_secret_key',
            environment: process.env.FEDAPAY_ENV || 'sandbox'
        });
    }
    console.log('✅ FedaPay configuré avec succès');
} catch (error) {
    console.warn('⚠️ Avertissement: Configuration FedaPay échouée:', error.message);
    console.log('🔄 Le serveur va continuer sans FedaPay pour le moment');
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Initialisation de la base de données pour Vercel
let dbInitialized = false;
async function ensureDbInitialized() {
    if (!dbInitialized) {
        try {
            await db.initialize();
            dbInitialized = true;
            console.log('✅ Base de données initialisée pour Vercel');
        } catch (error) {
            console.error('❌ Erreur initialisation DB:', error);
        }
    }
}

// Middleware pour s'assurer que la DB est initialisée
app.use(async (req, res, next) => {
    await ensureDbInitialized();
    next();
});

// Fonctions utilitaires pour QR codes et PDF

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
                size: [400, 600], // Taille badge standard
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
                id: participant._id || participant.id,
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

// Route pour obtenir les informations du congrès
app.get('/api/config', async (req, res) => {
    try {
        const config = await db.getConfig();
        
        // Formatter la réponse pour maintenir la compatibilité
        const response = {
            congrès: config
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
        const existingParticipant = await db.findParticipantByEmail(email);
        if (existingParticipant) {
            return res.status(400).json({ error: 'Cet email est déjà inscrit' });
        }
        
        const nouveauParticipant = await db.createParticipant({
            nom,
            prenom,
            email,
            telephone,
            specialite,
            institution,
            typeParticipant
        });
        
        res.json({ 
            message: 'Inscription réussie!', 
            codeAcces: nouveauParticipant.codeAcces,
            participantId: nouveauParticipant._id || nouveauParticipant.id
        });
    } catch (error) {
        console.error('Erreur inscription:', error);
        res.status(500).json({ error: error.message || 'Erreur lors de l\'inscription' });
    }
});

// Route pour soumettre un abstract
app.post('/api/abstract', async (req, res) => {
    try {
        const { titre, auteurs, resume, motsClefs, email, langue } = req.body;
        
        const nouvelAbstract = await db.createAbstract({
            titre,
            auteurs,
            resume,
            motsClefs,
            email,
            langue: langue || 'francais'
        });
        
        res.json({ message: 'Abstract soumis avec succès!', abstractId: nouvelAbstract._id || nouvelAbstract.id });
    } catch (error) {
        console.error('Erreur soumission abstract:', error);
        if (error.message && error.message.includes('300 mots')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Erreur lors de la soumission de l\'abstract' });
    }
});

// Route pour vérifier le code d'accès
app.post('/api/verifier-code', async (req, res) => {
    try {
        const { codeAcces } = req.body;
        
        const participant = await db.findParticipantByCode(codeAcces);
        
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
        
        const participant = await db.findParticipantByCode(codeAcces);
        
        if (!participant) {
            return res.status(404).json({ error: 'Participant non trouvé' });
        }
        
        const config = await db.getConfig();
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
        
        const participant = await db.findParticipantByCode(codeAcces);
        
        if (!participant) {
            return res.status(404).json({ error: 'Participant non trouvé' });
        }
        
        const qrData = JSON.stringify({
            id: participant._id || participant.id,
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
        
        const participant = await db.findParticipantByCode(codeAcces);
        
        if (!participant) {
            return res.status(404).json({ error: 'Participant non trouvé' });
        }
        
        const config = await db.getConfig();
        const certificatPDF = await generateCertificatePDF(participant, config);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="certificat-${participant.codeAcces}.pdf"`);
        res.send(certificatPDF);
        
    } catch (error) {
        console.error('Erreur génération certificat:', error);
        res.status(500).json({ error: 'Erreur lors de la génération du certificat' });
    }
});

// Route pour les statistiques
app.get('/api/stats', async (req, res) => {
    try {
        const participantStats = await db.getParticipantStats();
        const abstractStats = await db.getAbstractStats();
        const connectionInfo = db.getConnectionInfo();
        
        res.json({
            participants: participantStats,
            abstracts: abstractStats,
            database: connectionInfo
        });
    } catch (error) {
        console.error('Erreur statistiques:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
    }
});

// Route pour la migration (si MongoDB devient disponible)
app.post('/api/migrate-to-mongodb', async (req, res) => {
    try {
        if (!db.useMongoDb) {
            return res.status(400).json({ error: 'MongoDB non disponible' });
        }
        
        await db.migrateToMongoDB();
        res.json({ message: 'Migration vers MongoDB terminée avec succès!' });
    } catch (error) {
        console.error('Erreur migration:', error);
        res.status(500).json({ error: 'Erreur lors de la migration: ' + error.message });
    }
});

// =============================================================================
// ROUTES D'ADMINISTRATION
// =============================================================================

// Route pour l'interface d'administration
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Route pour accepter un abstract
app.post('/api/abstracts/:id/accept', async (req, res) => {
    try {
        const { id } = req.params;
        const { commentaires } = req.body;
        
        const abstract = await db.updateAbstract(id, {
            statut: 'accepte',
            commentairesReviewer: commentaires || '',
            dateReview: new Date()
        });
        
        if (abstract) {
            res.json({ message: 'Abstract accepté avec succès', abstract });
        } else {
            res.status(404).json({ error: 'Abstract non trouvé' });
        }
    } catch (error) {
        console.error('Erreur acceptation abstract:', error);
        res.status(500).json({ error: 'Erreur lors de l\'acceptation' });
    }
});

// Route pour refuser un abstract
app.post('/api/abstracts/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const { commentaires } = req.body;
        
        if (!commentaires) {
            return res.status(400).json({ error: 'Les commentaires sont obligatoires pour un refus' });
        }
        
        const abstract = await db.updateAbstract(id, {
            statut: 'refuse',
            commentairesReviewer: commentaires,
            dateReview: new Date()
        });
        
        if (abstract) {
            res.json({ message: 'Abstract refusé', abstract });
        } else {
            res.status(404).json({ error: 'Abstract non trouvé' });
        }
    } catch (error) {
        console.error('Erreur refus abstract:', error);
        res.status(500).json({ error: 'Erreur lors du refus' });
    }
});

// Route pour supprimer un participant
app.delete('/api/participants/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const success = await db.deleteParticipant(id);
        
        if (success) {
            res.json({ message: 'Participant supprimé avec succès' });
        } else {
            res.status(404).json({ error: 'Participant non trouvé' });
        }
    } catch (error) {
        console.error('Erreur suppression participant:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});

// Route pour supprimer un abstract
app.delete('/api/abstracts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const success = await db.deleteAbstract(id);
        
        if (success) {
            res.json({ message: 'Abstract supprimé avec succès' });
        } else {
            res.status(404).json({ error: 'Abstract non trouvé' });
        }
    } catch (error) {
        console.error('Erreur suppression abstract:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});

// Route pour l'export Excel/CSV
app.get('/api/export/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const { format } = req.query;
        
        let data = [];
        let filename = '';
        
        if (type === 'participants') {
            data = await db.getAllParticipants();
            filename = `participants_${new Date().toISOString().split('T')[0]}`;
            
            // Nettoyer les données pour l'export
            data = data.map(p => ({
                'Prénom': p.prenom,
                'Nom': p.nom,
                'Email': p.email,
                'Téléphone': p.telephone,
                'Spécialité': p.specialite,
                'Institution': p.institution,
                'Type': p.typeParticipant,
                'Code d\'accès': p.codeAcces,
                'Date inscription': new Date(p.dateInscription).toLocaleDateString('fr-FR')
            }));
        } else if (type === 'abstracts') {
            data = await db.getAllAbstracts();
            filename = `abstracts_${new Date().toISOString().split('T')[0]}`;
            
            data = data.map(a => ({
                'Titre': a.titre,
                'Auteur principal': a.auteurPrincipal,
                'Autres auteurs': a.autresAuteurs,
                'Institution': a.institution,
                'Email': a.email,
                'Résumé': a.resume,
                'Mots-clés': Array.isArray(a.motsClefs) ? a.motsClefs.join(', ') : a.motsClefs,
                'Sous-thème': a.sousTheme,
                'Statut': a.statut,
                'Commentaires': a.commentairesReviewer || '',
                'Date soumission': new Date(a.dateSubmission).toLocaleDateString('fr-FR'),
                'Date révision': a.dateReview ? new Date(a.dateReview).toLocaleDateString('fr-FR') : ''
            }));
        } else {
            return res.status(400).json({ error: 'Type d\'export non supporté' });
        }
        
        if (format === 'excel') {
            // Export Excel
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(workbook, worksheet, type);
            
            const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
            
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
            res.send(buffer);
        } else if (format === 'csv') {
            // Export CSV
            const parser = new Parser();
            const csv = parser.parse(data);
            
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
            res.send('\uFEFF' + csv); // BOM pour Excel
        } else {
            res.status(400).json({ error: 'Format non supporté. Utilisez excel ou csv.' });
        }
    } catch (error) {
        console.error('Erreur export:', error);
        res.status(500).json({ error: 'Erreur lors de l\'export' });
    }
});

// Configuration email (à personnaliser avec vos vraies informations)
const emailConfig = {
    host: 'smtp.gmail.com', // Ou votre serveur SMTP
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER || 'congresconjointbiologie@gmail.com',
        pass: process.env.EMAIL_PASS || '' // À configurer avec un mot de passe d'application
    }
};

// Route pour l'envoi d'emails en masse
app.post('/api/send-bulk-email', async (req, res) => {
    try {
        const { recipients, subject, content } = req.body;
        
        if (!recipients || !subject || !content) {
            return res.status(400).json({ error: 'Tous les champs sont obligatoires' });
        }
        
        // Récupérer les emails des destinataires
        let emailList = [];
        
        for (const recipient of recipients) {
            if (recipient === 'all') {
                const allParticipants = await db.getAllParticipants();
                emailList.push(...allParticipants.map(p => p.email));
            } else if (['enseignant', 'medecin', 'paramedical'].includes(recipient)) {
                const participants = await db.getAllParticipants();
                const filtered = participants.filter(p => p.typeParticipant === recipient);
                emailList.push(...filtered.map(p => p.email));
            } else if (recipient === 'abstract-authors') {
                const abstracts = await db.getAllAbstracts();
                emailList.push(...abstracts.map(a => a.email));
            }
        }
        
        // Supprimer les doublons
        emailList = [...new Set(emailList)];
        
        if (emailList.length === 0) {
            return res.status(400).json({ error: 'Aucun destinataire trouvé' });
        }
        
        // Créer le transporteur email
        const transporter = nodemailer.createTransporter(emailConfig);
        
        // Envoyer les emails (en lot pour éviter les limitations)
        const batchSize = 10;
        let sentCount = 0;
        
        for (let i = 0; i < emailList.length; i += batchSize) {
            const batch = emailList.slice(i, i + batchSize);
            
            const promises = batch.map(email => 
                transporter.sendMail({
                    from: emailConfig.auth.user,
                    to: email,
                    subject: subject,
                    text: content,
                    html: content.replace(/\n/g, '<br>')
                }).catch(err => {
                    console.error(`Erreur envoi email à ${email}:`, err);
                    return null;
                })
            );
            
            const results = await Promise.all(promises);
            sentCount += results.filter(r => r !== null).length;
            
            // Pause entre les lots
            if (i + batchSize < emailList.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        res.json({ 
            message: `Emails envoyés avec succès`,
            sent: sentCount,
            total: emailList.length
        });
        
    } catch (error) {
        console.error('Erreur envoi bulk email:', error);
        res.status(500).json({ error: 'Erreur lors de l\'envoi des emails' });
    }
});

// =============================================================================
// ROUTES DE PAIEMENT FEDAPAY
// =============================================================================

// Calculer le montant selon le type de participant
function calculateAmount(typeParticipant) {
    const tarifs = {
        enseignant: 50000,
        medecin: 40000,
        paramedical: 25000
    };
    return tarifs[typeParticipant] || 50000;
}

// Créer une transaction FedaPay
app.post('/api/payment/create', async (req, res) => {
    try {
        const { participantId, paymentMethod, phoneNumber, callbackUrl } = req.body;
        
        // Récupérer les données du participant
        const participant = await db.findParticipantByCode(participantId);
        if (!participant) {
            return res.status(404).json({ error: 'Participant non trouvé' });
        }
        
        const amount = calculateAmount(participant.typeParticipant);
        
        // Créer la transaction FedaPay
        const transaction = await FedaPay.Transaction.create({
            description: `Inscription Congrès SAFBMEN/SBCB - ${participant.prenom} ${participant.nom}`,
            amount: amount,
            currency: {
                iso: 'XOF'
            },
            callback_url: callbackUrl || `${req.protocol}://${req.get('host')}/api/payment/callback`,
            custom_metadata: {
                participant_id: participantId,
                participant_email: participant.email,
                participant_name: `${participant.prenom} ${participant.nom}`,
                type_participant: participant.typeParticipant,
                congres: 'SAFBMEN-SBCB-2025'
            }
        });
        
        // Générer le token de paiement selon la méthode
        let paymentToken;
        
        if (['orange_money', 'mtn_money', 'moov_money', 'airtel_money'].includes(paymentMethod)) {
            // Mobile Money
            paymentToken = await transaction.generateToken({
                payment_method: paymentMethod,
                mobile: {
                    number: phoneNumber
                }
            });
        } else if (paymentMethod === 'card') {
            // Carte bancaire
            paymentToken = await transaction.generateToken({
                payment_method: 'card'
            });
        } else {
            return res.status(400).json({ error: 'Méthode de paiement non supportée' });
        }
        
        res.json({
            success: true,
            transaction_id: transaction.id,
            token: paymentToken.token,
            url: paymentToken.url,
            amount: amount,
            currency: 'XOF',
            payment_method: paymentMethod
        });
        
    } catch (error) {
        console.error('Erreur création transaction FedaPay:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la création du paiement',
            details: error.message 
        });
    }
});

// Vérifier le statut d'une transaction
app.get('/api/payment/status/:transactionId', async (req, res) => {
    try {
        const { transactionId } = req.params;
        
        const transaction = await FedaPay.Transaction.retrieve(transactionId);
        
        res.json({
            success: true,
            status: transaction.status,
            transaction: {
                id: transaction.id,
                reference: transaction.reference,
                status: transaction.status,
                amount: transaction.amount,
                currency: transaction.currency.iso,
                description: transaction.description,
                created_at: transaction.created_at,
                updated_at: transaction.updated_at,
                custom_metadata: transaction.custom_metadata
            }
        });
        
    } catch (error) {
        console.error('Erreur vérification statut:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la vérification du statut',
            details: error.message 
        });
    }
});

// Callback FedaPay pour les notifications de paiement
app.post('/api/payment/callback', async (req, res) => {
    try {
        const { entity, event } = req.body;
        
        console.log('📞 Callback FedaPay reçu:', { event, entity: entity?.id });
        
        if (event === 'transaction.approved' && entity) {
            // Transaction approuvée, mettre à jour le participant
            const participantId = entity.custom_metadata?.participant_id;
            
            if (participantId) {
                // Marquer le participant comme payé
                const participant = await db.findParticipantByCode(participantId);
                if (participant) {
                    // Ici vous pouvez ajouter un champ "statut_paiement" à votre modèle
                    console.log(`✅ Paiement confirmé pour ${participant.prenom} ${participant.nom}`);
                    
                    // Envoyer email de confirmation si configuré
                    // await sendPaymentConfirmationEmail(participant, entity);
                }
            }
        }
        
        res.status(200).json({ message: 'Callback traité' });
        
    } catch (error) {
        console.error('Erreur callback FedaPay:', error);
        res.status(500).json({ error: 'Erreur traitement callback' });
    }
});

// Route pour obtenir les informations de paiement d'un participant
app.get('/api/payment/info/:participantId', async (req, res) => {
    try {
        const { participantId } = req.params;
        
        const participant = await db.findParticipantByCode(participantId);
        if (!participant) {
            return res.status(404).json({ error: 'Participant non trouvé' });
        }
        
        const amount = calculateAmount(participant.typeParticipant);
        
        res.json({
            success: true,
            participant: {
                id: participant.codeAcces || participant.id,
                nom: participant.nom,
                prenom: participant.prenom,
                email: participant.email,
                type: participant.typeParticipant,
                institution: participant.institution
            },
            payment: {
                amount: amount,
                currency: 'XOF',
                description: `Inscription Congrès SAFBMEN/SBCB`,
                methods: [
                    'orange_money',
                    'mtn_money', 
                    'moov_money',
                    'airtel_money',
                    'card',
                    'bank_transfer'
                ]
            }
        });
        
    } catch (error) {
        console.error('Erreur info paiement:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des informations' });
    }
});

// Générer une facture PDF après paiement
app.get('/api/payment/invoice/:transactionId', async (req, res) => {
    try {
        const { transactionId } = req.params;
        
        const transaction = await FedaPay.Transaction.retrieve(transactionId);
        
        if (transaction.status !== 'approved') {
            return res.status(400).json({ error: 'Transaction non approuvée' });
        }
        
        const participantId = transaction.custom_metadata?.participant_id;
        const participant = await db.findParticipantByCode(participantId);
        
        if (!participant) {
            return res.status(404).json({ error: 'Participant non trouvé' });
        }
        
        // Créer le PDF de facture
        const doc = new PDFDocument();
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="facture_${transaction.reference}.pdf"`);
        
        doc.pipe(res);
        
        // En-tête de la facture
        doc.fontSize(20).text('FACTURE DE PAIEMENT', 50, 50);
        doc.fontSize(16).text('1er Congrès SAFBMEN - 5ème Congrès de Biologie Clinique', 50, 80);
        
        // Informations transaction
        doc.fontSize(12).text(`Référence: ${transaction.reference}`, 50, 120);
        doc.text(`Date: ${new Date(transaction.created_at).toLocaleDateString('fr-FR')}`, 50, 140);
        doc.text(`Statut: Payé`, 50, 160);
        
        // Informations participant
        doc.text(`Participant: ${participant.prenom} ${participant.nom}`, 50, 200);
        doc.text(`Email: ${participant.email}`, 50, 220);
        doc.text(`Type: ${participant.typeParticipant}`, 50, 240);
        doc.text(`Institution: ${participant.institution}`, 50, 260);
        
        // Montant
        doc.fontSize(14).text(`Montant: ${transaction.amount.toLocaleString()} XOF`, 50, 300);
        
        doc.end();
        
    } catch (error) {
        console.error('Erreur génération facture:', error);
        res.status(500).json({ error: 'Erreur lors de la génération de la facture' });
    }
});

// =============================================================================
// ROUTES PRINCIPALES
// =============================================================================

// Route principale
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route pour le tableau de bord
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Route pour la page de paiement
app.get('/payment', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'payment.html'));
});

// Initialiser et démarrer le serveur
async function startServer() {
    try {
        // Initialiser la base de données (MongoDB ou JSON)
        await db.initialize();
        
        app.listen(PORT, () => {
            const dbInfo = db.getConnectionInfo();
            console.log(`🏥 Serveur du Congrès Médical démarré sur http://localhost:${PORT}`);
            console.log(`📊 Tableau de bord disponible sur http://localhost:${PORT}/dashboard`);
            console.log(`🗄️  Base de données: ${dbInfo.type} (${dbInfo.uri})`);
        });
    } catch (error) {
        console.error('❌ Erreur démarrage serveur:', error);
        process.exit(1);
    }
}

// Pour le développement local
if (require.main === module) {
    startServer();
}

// Pour Vercel - exporter l'app Express
module.exports = app;

// Graceful shutdown (uniquement en local)
if (require.main === module) {
    process.on('SIGINT', async () => {
        console.log('\n🛑 Arrêt du serveur...');
        await db.disconnect();
        process.exit(0);
    });
} 