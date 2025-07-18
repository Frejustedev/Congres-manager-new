const mongoose = require('mongoose');
const fs = require('fs-extra');
const path = require('path');

// Importer les modèles MongoDB
const Participant = require('./models/Participant');
const Abstract = require('./models/Abstract');
const Config = require('./models/Config');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/congres_medical';
const DATA_DIR = path.join(__dirname, 'data');
const PARTICIPANTS_FILE = path.join(DATA_DIR, 'participants.json');
const ABSTRACTS_FILE = path.join(DATA_DIR, 'abstracts.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

class DatabaseManager {
    constructor() {
        this.useMongoDb = false;
        this.isConnected = false;
    }

    // Initialiser la connexion (MongoDB ou JSON)
    async initialize() {
        try {
            // Essayer de se connecter à MongoDB
            await mongoose.connect(MONGODB_URI, {
                serverSelectionTimeoutMS: 5000 // Timeout de 5 secondes
            });
            
            this.useMongoDb = true;
            this.isConnected = true;
            console.log('✅ Base de données MongoDB connectée');
            
            // Vérifier que la configuration existe
            await Config.getConfig();
            
        } catch (error) {
            console.log('⚠️  MongoDB non disponible, utilisation des fichiers JSON');
            this.useMongoDb = false;
            await this.initializeJsonFiles();
        }
    }

    // Initialiser les fichiers JSON (fallback)
    async initializeJsonFiles() {
        await fs.ensureDir(DATA_DIR);
        
        if (!await fs.pathExists(PARTICIPANTS_FILE)) {
            await fs.writeJson(PARTICIPANTS_FILE, []);
        }
        
        if (!await fs.pathExists(ABSTRACTS_FILE)) {
            await fs.writeJson(ABSTRACTS_FILE, []);
        }
        
        if (!await fs.pathExists(CONFIG_FILE)) {
            await fs.writeJson(CONFIG_FILE, {
                congrès: {
                    nom: "1er Congrès SAFBMEN - 5ème Congrès de Biologie Clinique",
                    dates: "21-23 Octobre 2025",
                    lieu: "ISBA COTONOU",
                    description: "La biologie médicale et la médecine nucléaire à l'heure de la digitalisation: quels enjeux pour les pays à ressources limitées",
                    theme: "La biologie médicale et la médecine nucléaire à l'heure de la digitalisation: quels enjeux pour les pays à ressources limitées",
                    email: "congresconjointbiologie@gmail.com",
                    telephone: ["+229 0197894110", "+229 0197130061"],
                    organisateurs: [
                        "Société Africaine Francophone de Biophysique et Médecine Nucléaire (SAFBMEN)",
                        "Société de Biologie Clinique du Bénin (SBCB)"
                    ],
                    fraisInscription: {
                        enseignant: 50000,
                        medecin: 40000,
                        paramedical: 25000
                    },
                    sousThemes: [
                        "Biologie polyvalente et e-santé",
                        "Biologie spécialisée et e-santé", 
                        "Télémédecine et interprétation à distance",
                        "Intelligence artificielle appliquée au diagnostic médical",
                        "Communications libres"
                    ],
                    soumissions: {
                        motLimit: 300,
                        format: "Word, Time New Roman, Police 12",
                        langues: "Français ou Anglais",
                        structure: "Introduction, objectif, méthodes, résultats, conclusion",
                        motsClefs: "5 mots clés maximum",
                        dateLimite: "10 août 2025"
                    },
                    evenements: {
                        precongres: "20 octobre 2025",
                        assemblees: "24 octobre 2025"
                    }
                }
            });
        }
        
        console.log('✅ Fichiers JSON initialisés');
    }

    // PARTICIPANTS

    async createParticipant(participantData) {
        if (this.useMongoDb) {
            const codeAcces = await Participant.generateCodeAcces();
            return await Participant.create({
                ...participantData,
                codeAcces
            });
        } else {
            const participants = await fs.readJson(PARTICIPANTS_FILE);
            
            // Vérifier si l'email existe déjà
            const exists = participants.find(p => p.email === participantData.email);
            if (exists) {
                throw new Error('Cet email est déjà inscrit');
            }
            
            // Générer un code d'accès unique
            let codeAcces;
            let unique = false;
            while (!unique) {
                codeAcces = Math.random().toString(36).substring(2, 8).toUpperCase();
                unique = !participants.find(p => p.codeAcces === codeAcces);
            }
            
            const { v4: uuidv4 } = require('uuid');
            const nouveauParticipant = {
                id: uuidv4(),
                ...participantData,
                codeAcces,
                dateInscription: new Date().toISOString(),
                statut: 'inscrit'
            };
            
            participants.push(nouveauParticipant);
            await fs.writeJson(PARTICIPANTS_FILE, participants, { spaces: 2 });
            
            return nouveauParticipant;
        }
    }

    async findParticipantByEmail(email) {
        if (this.useMongoDb) {
            return await Participant.findOne({ email });
        } else {
            const participants = await fs.readJson(PARTICIPANTS_FILE);
            return participants.find(p => p.email === email);
        }
    }

    async getAllParticipants() {
        if (this.useMongoDb) {
            return await Participant.find({}).sort({ dateInscription: -1 });
        } else {
            return await fs.readJson(PARTICIPANTS_FILE);
        }
    }

    async findParticipantByCode(codeAcces) {
        if (this.useMongoDb) {
            return await Participant.findOne({ codeAcces });
        } else {
            const participants = await fs.readJson(PARTICIPANTS_FILE);
            return participants.find(p => p.codeAcces === codeAcces);
        }
    }

    async getParticipantStats() {
        if (this.useMongoDb) {
            const total = await Participant.countDocuments();
            const byType = await Participant.aggregate([
                {
                    $group: {
                        _id: '$typeParticipant',
                        count: { $sum: 1 }
                    }
                }
            ]);
            return { total, byType };
        } else {
            const participants = await fs.readJson(PARTICIPANTS_FILE);
            const total = participants.length;
            const byType = participants.reduce((acc, p) => {
                acc[p.typeParticipant] = (acc[p.typeParticipant] || 0) + 1;
                return acc;
            }, {});
            return { 
                total, 
                byType: Object.entries(byType).map(([_id, count]) => ({ _id, count }))
            };
        }
    }

    // ABSTRACTS

    async createAbstract(abstractData) {
        if (this.useMongoDb) {
            // Trouver le participant correspondant
            const participant = await Participant.findOne({ email: abstractData.email });
            
            return await Abstract.create({
                ...abstractData,
                participant: participant ? participant._id : null
            });
        } else {
            const abstracts = await fs.readJson(ABSTRACTS_FILE);
            const { v4: uuidv4 } = require('uuid');
            
            const nouvelAbstract = {
                id: uuidv4(),
                ...abstractData,
                dateSubmission: new Date().toISOString(),
                statut: 'en_review'
            };
            
            abstracts.push(nouvelAbstract);
            await fs.writeJson(ABSTRACTS_FILE, abstracts, { spaces: 2 });
            
            return nouvelAbstract;
        }
    }

    async getAllAbstracts() {
        if (this.useMongoDb) {
            return await Abstract.find({}).sort({ dateSubmission: -1 });
        } else {
            return await fs.readJson(ABSTRACTS_FILE);
        }
    }

    async getAbstractStats() {
        if (this.useMongoDb) {
            const total = await Abstract.countDocuments();
            const byStatus = await Abstract.aggregate([
                {
                    $group: {
                        _id: '$statut',
                        count: { $sum: 1 }
                    }
                }
            ]);
            return { total, byStatus };
        } else {
            const abstracts = await fs.readJson(ABSTRACTS_FILE);
            const total = abstracts.length;
            const byStatus = abstracts.reduce((acc, a) => {
                acc[a.statut] = (acc[a.statut] || 0) + 1;
                return acc;
            }, {});
            return { 
                total, 
                byStatus: Object.entries(byStatus).map(([_id, count]) => ({ _id, count }))
            };
        }
    }

    // CONFIGURATION

    async getConfig() {
        if (this.useMongoDb) {
            return await Config.getConfig();
        } else {
            const config = await fs.readJson(CONFIG_FILE);
            return config.congrès || config;
        }
    }

    async updateConfig(updateData) {
        if (this.useMongoDb) {
            return await Config.updateConfig(updateData);
        } else {
            const config = await fs.readJson(CONFIG_FILE);
            config.congrès = { ...config.congrès, ...updateData };
            await fs.writeJson(CONFIG_FILE, config, { spaces: 2 });
            return config.congrès;
        }
    }

    // UTILITAIRES

    getConnectionInfo() {
        return {
            type: this.useMongoDb ? 'MongoDB' : 'JSON Files',
            connected: this.isConnected,
            uri: this.useMongoDb ? MONGODB_URI : DATA_DIR
        };
    }

    async disconnect() {
        if (this.useMongoDb && this.isConnected) {
            await mongoose.disconnect();
            this.isConnected = false;
            console.log('📡 Déconnexion de MongoDB');
        }
    }

    // Migration depuis JSON vers MongoDB
    async migrateToMongoDB() {
        if (!this.useMongoDb) {
            throw new Error('MongoDB non disponible pour la migration');
        }

        console.log('🚀 Début de la migration JSON vers MongoDB...');

        // Migrer les participants
        if (await fs.pathExists(PARTICIPANTS_FILE)) {
            const participants = await fs.readJson(PARTICIPANTS_FILE);
            let migratedCount = 0;
            
            for (const p of participants) {
                const exists = await Participant.findOne({ email: p.email });
                if (!exists) {
                    await Participant.create({
                        nom: p.nom,
                        prenom: p.prenom,
                        email: p.email,
                        telephone: p.telephone,
                        specialite: p.specialite,
                        institution: p.institution,
                        typeParticipant: p.typeParticipant,
                        codeAcces: p.codeAcces,
                        statut: p.statut || 'inscrit',
                        dateInscription: new Date(p.dateInscription)
                    });
                    migratedCount++;
                }
            }
            console.log(`✅ ${migratedCount} participants migrés`);
        }

        // Migrer les abstracts
        if (await fs.pathExists(ABSTRACTS_FILE)) {
            const abstracts = await fs.readJson(ABSTRACTS_FILE);
            let migratedCount = 0;
            
            for (const a of abstracts) {
                const exists = await Abstract.findOne({ email: a.email, titre: a.titre });
                if (!exists) {
                    const participant = await Participant.findOne({ email: a.email });
                    await Abstract.create({
                        titre: a.titre,
                        auteurs: a.auteurs,
                        email: a.email,
                        langue: a.langue || 'francais',
                        resume: a.resume,
                        motsClefs: a.motsClefs,
                        statut: a.statut || 'en_review',
                        dateSubmission: new Date(a.dateSubmission),
                        participant: participant ? participant._id : null
                    });
                    migratedCount++;
                }
            }
            console.log(`✅ ${migratedCount} abstracts migrés`);
        }

        console.log('🎉 Migration terminée!');
    }

    // =========================================================================
    // MÉTHODES D'ADMINISTRATION
    // =========================================================================

    // Mettre à jour un abstract
    async updateAbstract(id, updates) {
        if (this.useMongoDb) {
            try {
                const abstract = await Abstract.findByIdAndUpdate(id, updates, { new: true });
                return abstract;
            } catch (error) {
                console.error('Erreur MongoDB updateAbstract:', error);
                return null;
            }
        } else {
            try {
                const abstracts = await this.getAllAbstracts();
                const index = abstracts.findIndex(a => a.id === id);
                
                if (index !== -1) {
                    abstracts[index] = { ...abstracts[index], ...updates };
                    await fs.writeJson(ABSTRACTS_FILE, abstracts, { spaces: 2 });
                    return abstracts[index];
                }
                return null;
            } catch (error) {
                console.error('Erreur JSON updateAbstract:', error);
                return null;
            }
        }
    }

    // Supprimer un participant
    async deleteParticipant(id) {
        if (this.useMongoDb) {
            try {
                const result = await Participant.findOneAndDelete({
                    $or: [{ _id: id }, { codeAcces: id }]
                });
                return !!result;
            } catch (error) {
                console.error('Erreur MongoDB deleteParticipant:', error);
                return false;
            }
        } else {
            try {
                const participants = await this.getAllParticipants();
                const filtered = participants.filter(p => p.id !== id && p.codeAcces !== id);
                
                if (filtered.length < participants.length) {
                    await fs.writeJson(PARTICIPANTS_FILE, filtered, { spaces: 2 });
                    return true;
                }
                return false;
            } catch (error) {
                console.error('Erreur JSON deleteParticipant:', error);
                return false;
            }
        }
    }

    // Supprimer un abstract
    async deleteAbstract(id) {
        if (this.useMongoDb) {
            try {
                const result = await Abstract.findByIdAndDelete(id);
                return !!result;
            } catch (error) {
                console.error('Erreur MongoDB deleteAbstract:', error);
                return false;
            }
        } else {
            try {
                const abstracts = await this.getAllAbstracts();
                const filtered = abstracts.filter(a => a.id !== id);
                
                if (filtered.length < abstracts.length) {
                    await fs.writeJson(ABSTRACTS_FILE, filtered, { spaces: 2 });
                    return true;
                }
                return false;
            } catch (error) {
                console.error('Erreur JSON deleteAbstract:', error);
                return false;
            }
        }
    }
}

// Créer une instance singleton
const db = new DatabaseManager();

module.exports = db; 