const mongoose = require('mongoose');
const fs = require('fs-extra');
const path = require('path');

// Importer les modèles
const Participant = require('./models/Participant');
const Abstract = require('./models/Abstract');
const Config = require('./models/Config');

// Configuration de la base de données
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/congres_medical';

// Chemins des fichiers JSON
const DATA_DIR = path.join(__dirname, 'data');
const PARTICIPANTS_FILE = path.join(DATA_DIR, 'participants.json');
const ABSTRACTS_FILE = path.join(DATA_DIR, 'abstracts.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

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

async function migrateParticipants() {
    try {
        console.log('📋 Migration des participants...');
        
        if (!await fs.pathExists(PARTICIPANTS_FILE)) {
            console.log('ℹ️  Aucun fichier participants.json trouvé, ignoré');
            return;
        }
        
        const participantsJSON = await fs.readJson(PARTICIPANTS_FILE);
        console.log(`📊 ${participantsJSON.length} participants trouvés dans le fichier JSON`);
        
        // Vérifier combien sont déjà en base
        const existingCount = await Participant.countDocuments();
        console.log(`📊 ${existingCount} participants déjà en base`);
        
        let migratedCount = 0;
        
        for (const participantData of participantsJSON) {
            try {
                // Vérifier si le participant existe déjà (par email)
                const exists = await Participant.findOne({ email: participantData.email });
                
                if (!exists) {
                    // Créer le participant avec les données existantes
                    await Participant.create({
                        nom: participantData.nom,
                        prenom: participantData.prenom,
                        email: participantData.email,
                        telephone: participantData.telephone,
                        specialite: participantData.specialite,
                        institution: participantData.institution,
                        typeParticipant: participantData.typeParticipant,
                        codeAcces: participantData.codeAcces,
                        statut: participantData.statut || 'inscrit',
                        dateInscription: new Date(participantData.dateInscription)
                    });
                    migratedCount++;
                }
            } catch (error) {
                console.error(`❌ Erreur migration participant ${participantData.email}:`, error.message);
            }
        }
        
        console.log(`✅ ${migratedCount} participants migrés avec succès`);
        
    } catch (error) {
        console.error('❌ Erreur migration participants:', error);
    }
}

async function migrateAbstracts() {
    try {
        console.log('📄 Migration des abstracts...');
        
        if (!await fs.pathExists(ABSTRACTS_FILE)) {
            console.log('ℹ️  Aucun fichier abstracts.json trouvé, ignoré');
            return;
        }
        
        const abstractsJSON = await fs.readJson(ABSTRACTS_FILE);
        console.log(`📊 ${abstractsJSON.length} abstracts trouvés dans le fichier JSON`);
        
        const existingCount = await Abstract.countDocuments();
        console.log(`📊 ${existingCount} abstracts déjà en base`);
        
        let migratedCount = 0;
        
        for (const abstractData of abstractsJSON) {
            try {
                // Vérifier si l'abstract existe déjà (par email + titre)
                const exists = await Abstract.findOne({ 
                    email: abstractData.email,
                    titre: abstractData.titre 
                });
                
                if (!exists) {
                    // Trouver le participant correspondant
                    const participant = await Participant.findOne({ email: abstractData.email });
                    
                    await Abstract.create({
                        titre: abstractData.titre,
                        auteurs: abstractData.auteurs,
                        email: abstractData.email,
                        langue: abstractData.langue || 'francais',
                        resume: abstractData.resume,
                        motsClefs: abstractData.motsClefs,
                        statut: abstractData.statut || 'en_review',
                        dateSubmission: new Date(abstractData.dateSubmission),
                        participant: participant ? participant._id : null
                    });
                    migratedCount++;
                }
            } catch (error) {
                console.error(`❌ Erreur migration abstract ${abstractData.titre}:`, error.message);
            }
        }
        
        console.log(`✅ ${migratedCount} abstracts migrés avec succès`);
        
    } catch (error) {
        console.error('❌ Erreur migration abstracts:', error);
    }
}

async function migrateConfig() {
    try {
        console.log('⚙️  Migration de la configuration...');
        
        if (!await fs.pathExists(CONFIG_FILE)) {
            console.log('ℹ️  Aucun fichier config.json trouvé, configuration par défaut créée');
            await Config.getConfig(); // Crée la config par défaut
            return;
        }
        
        const configJSON = await fs.readJson(CONFIG_FILE);
        console.log('📊 Configuration trouvée dans le fichier JSON');
        
        // Vérifier si la config existe déjà
        const existingConfig = await Config.findOne();
        
        if (!existingConfig) {
            const congresData = configJSON.congrès || configJSON;
            
            await Config.create({
                nom: congresData.nom,
                dates: congresData.dates,
                lieu: congresData.lieu,
                description: congresData.description,
                theme: congresData.theme,
                email: congresData.email,
                telephone: congresData.telephone || [],
                organisateurs: congresData.organisateurs || [],
                fraisInscription: congresData.fraisInscription,
                sousThemes: congresData.sousThemes || [],
                soumissions: congresData.soumissions || {},
                evenements: congresData.evenements || {}
            });
            
            console.log('✅ Configuration migrée avec succès');
        } else {
            console.log('ℹ️  Configuration déjà existante en base');
        }
        
    } catch (error) {
        console.error('❌ Erreur migration config:', error);
    }
}

async function createBackup() {
    try {
        console.log('💾 Création d\'une sauvegarde des fichiers JSON...');
        
        const backupDir = path.join(__dirname, 'backup_json_' + Date.now());
        await fs.ensureDir(backupDir);
        
        if (await fs.pathExists(PARTICIPANTS_FILE)) {
            await fs.copy(PARTICIPANTS_FILE, path.join(backupDir, 'participants.json'));
        }
        
        if (await fs.pathExists(ABSTRACTS_FILE)) {
            await fs.copy(ABSTRACTS_FILE, path.join(backupDir, 'abstracts.json'));
        }
        
        if (await fs.pathExists(CONFIG_FILE)) {
            await fs.copy(CONFIG_FILE, path.join(backupDir, 'config.json'));
        }
        
        console.log(`✅ Sauvegarde créée dans: ${backupDir}`);
        
    } catch (error) {
        console.error('❌ Erreur création sauvegarde:', error);
    }
}

async function verifyMigration() {
    try {
        console.log('🔍 Vérification de la migration...');
        
        const participantCount = await Participant.countDocuments();
        const abstractCount = await Abstract.countDocuments();
        const configCount = await Config.countDocuments();
        
        console.log(`📊 Base de données MongoDB:`);
        console.log(`   - ${participantCount} participants`);
        console.log(`   - ${abstractCount} abstracts`);
        console.log(`   - ${configCount} configuration(s)`);
        
        // Tester quelques opérations
        const sampleParticipant = await Participant.findOne();
        if (sampleParticipant) {
            console.log(`✅ Test participant: ${sampleParticipant.nomComplet}`);
        }
        
        const config = await Config.getConfig();
        if (config) {
            console.log(`✅ Test configuration: ${config.nom}`);
        }
        
    } catch (error) {
        console.error('❌ Erreur vérification:', error);
    }
}

async function runMigration() {
    console.log('🚀 Début de la migration vers MongoDB...\n');
    
    try {
        // Connexion à la base de données
        await connectDB();
        
        // Créer une sauvegarde
        await createBackup();
        
        // Migrer les données
        await migrateConfig();
        await migrateParticipants();
        await migrateAbstracts();
        
        // Vérifier la migration
        await verifyMigration();
        
        console.log('\n🎉 Migration terminée avec succès!');
        console.log('💡 Vous pouvez maintenant redémarrer le serveur avec MongoDB');
        
    } catch (error) {
        console.error('\n❌ Erreur lors de la migration:', error);
    } finally {
        await mongoose.disconnect();
        console.log('📡 Déconnexion de MongoDB');
    }
}

// Exécuter la migration si ce fichier est appelé directement
if (require.main === module) {
    runMigration();
}

module.exports = {
    runMigration,
    migrateParticipants,
    migrateAbstracts,
    migrateConfig
}; 