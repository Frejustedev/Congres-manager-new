const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
    nom: {
        type: String,
        required: true,
        trim: true
    },
    dates: {
        type: String,
        required: true,
        trim: true
    },
    lieu: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    theme: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    telephone: [{
        type: String,
        trim: true
    }],
    organisateurs: [{
        type: String,
        trim: true
    }],
    fraisInscription: {
        enseignant: {
            type: Number,
            required: true,
            min: 0
        },
        medecin: {
            type: Number,
            required: true,
            min: 0
        },
        paramedical: {
            type: Number,
            required: true,
            min: 0
        }
    },
    sousThemes: [{
        type: String,
        trim: true
    }],
    soumissions: {
        motLimit: {
            type: Number,
            default: 300
        },
        format: {
            type: String,
            default: 'Word, Time New Roman, Police 12'
        },
        langues: {
            type: String,
            default: 'Français ou Anglais'
        },
        structure: {
            type: String,
            default: 'Introduction, objectif, méthodes, résultats, conclusion'
        },
        motsClefs: {
            type: String,
            default: '5 mots clés maximum'
        },
        dateLimite: {
            type: String,
            default: '10 août 2025'
        }
    },
    evenements: {
        precongres: {
            type: String,
            trim: true
        },
        assemblees: {
            type: String,
            trim: true
        }
    },
    parametres: {
        inscriptionsOuvertes: {
            type: Boolean,
            default: true
        },
        soumissionsOuvertes: {
            type: Boolean,
            default: true
        },
        maxParticipants: {
            type: Number,
            default: 1000
        },
        codeAccesLength: {
            type: Number,
            default: 6
        }
    },
    version: {
        type: String,
        default: '1.0'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Il ne devrait y avoir qu'une seule configuration
configSchema.statics.getConfig = async function() {
    let config = await this.findOne();
    
    if (!config) {
        // Créer la configuration par défaut si elle n'existe pas
        config = await this.create({
            nom: '1er Congrès SAFBMEN - 5ème Congrès de Biologie Clinique',
            dates: '21-23 Octobre 2025',
            lieu: 'ISBA COTONOU',
            description: 'La biologie médicale et la médecine nucléaire à l\'heure de la digitalisation: quels enjeux pour les pays à ressources limitées',
            theme: 'La biologie médicale et la médecine nucléaire à l\'heure de la digitalisation: quels enjeux pour les pays à ressources limitées',
            email: 'congresconjointbiologie@gmail.com',
            telephone: ['+229 0197894110', '+229 0197130061'],
            organisateurs: [
                'Société Africaine Francophone de Biophysique et Médecine Nucléaire (SAFBMEN)',
                'Société de Biologie Clinique du Bénin (SBCB)'
            ],
            fraisInscription: {
                enseignant: 50000,
                medecin: 40000,
                paramedical: 25000
            },
            sousThemes: [
                'Biologie polyvalente et e-santé',
                'Biologie spécialisée et e-santé', 
                'Télémédecine et interprétation à distance',
                'Intelligence artificielle appliquée au diagnostic médical',
                'Communications libres'
            ],
            evenements: {
                precongres: '20 octobre 2025',
                assemblees: '24 octobre 2025'
            }
        });
    }
    
    return config;
};

// Méthode pour mettre à jour la configuration
configSchema.statics.updateConfig = async function(updateData) {
    let config = await this.findOne();
    
    if (!config) {
        config = await this.getConfig();
    }
    
    Object.assign(config, updateData);
    return await config.save();
};

module.exports = mongoose.model('Config', configSchema); 