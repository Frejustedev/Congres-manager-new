const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
    nom: {
        type: String,
        required: true,
        trim: true
    },
    prenom: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    telephone: {
        type: String,
        required: true,
        trim: true
    },
    specialite: {
        type: String,
        required: true,
        enum: ['cardiologie', 'neurologie', 'oncologie', 'chirurgie', 'pediatrie', 'psychiatrie', 'autre']
    },
    institution: {
        type: String,
        required: true,
        trim: true
    },
    typeParticipant: {
        type: String,
        required: true,
        enum: ['enseignant', 'medecin', 'paramedical']
    },
    codeAcces: {
        type: String,
        required: true,
        unique: true,
        uppercase: true
    },
    statut: {
        type: String,
        required: true,
        enum: ['inscrit', 'confirme', 'annule'],
        default: 'inscrit'
    },
    dateInscription: {
        type: Date,
        default: Date.now
    },
    dateModification: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Index pour améliorer les performances (email et codeAcces déjà indexés via unique: true)
participantSchema.index({ typeParticipant: 1 });
participantSchema.index({ dateInscription: -1 });

// Virtual pour le nom complet
participantSchema.virtual('nomComplet').get(function() {
    return `${this.prenom} ${this.nom}`;
});

// Méthode pour générer un code d'accès unique
participantSchema.statics.generateCodeAcces = async function() {
    let codeAcces;
    let exists = true;
    
    while (exists) {
        codeAcces = Math.random().toString(36).substring(2, 8).toUpperCase();
        exists = await this.findOne({ codeAcces });
    }
    
    return codeAcces;
};

// Middleware pour mettre à jour dateModification
participantSchema.pre('save', function(next) {
    this.dateModification = new Date();
    next();
});

module.exports = mongoose.model('Participant', participantSchema); 