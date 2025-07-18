const mongoose = require('mongoose');

const abstractSchema = new mongoose.Schema({
    titre: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    auteurs: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    langue: {
        type: String,
        required: true,
        enum: ['francais', 'anglais']
    },
    resume: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000, // Environ 300 mots
        validate: {
            validator: function(v) {
                // Vérifier que le résumé ne dépasse pas 300 mots
                const wordCount = v.trim().split(/\s+/).length;
                return wordCount <= 300;
            },
            message: 'Le résumé ne doit pas dépasser 300 mots'
        }
    },
    motsClefs: {
        type: [String],
        required: true,
        validate: {
            validator: function(v) {
                return v && v.length <= 5 && v.length >= 1;
            },
            message: 'Il faut entre 1 et 5 mots-clés'
        }
    },
    statut: {
        type: String,
        required: true,
        enum: ['en_review', 'accepte', 'refuse', 'en_attente'],
        default: 'en_review'
    },
    commentairesReviewer: {
        type: String,
        trim: true
    },
    dateSubmission: {
        type: Date,
        default: Date.now
    },
    dateReview: {
        type: Date
    },
    sousTheme: {
        type: String,
        enum: [
            'Biologie polyvalente et e-santé',
            'Biologie spécialisée et e-santé', 
            'Télémédecine et interprétation à distance',
            'Intelligence artificielle appliquée au diagnostic médical',
            'Communications libres'
        ]
    },
    participant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Participant'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Index pour améliorer les performances
abstractSchema.index({ email: 1 });
abstractSchema.index({ statut: 1 });
abstractSchema.index({ dateSubmission: -1 });
abstractSchema.index({ sousTheme: 1 });

// Virtual pour le nombre de mots
abstractSchema.virtual('nombreMots').get(function() {
    return this.resume ? this.resume.trim().split(/\s+/).length : 0;
});

// Méthode pour accepter un abstract
abstractSchema.methods.accepter = function(commentaires = '') {
    this.statut = 'accepte';
    this.commentairesReviewer = commentaires;
    this.dateReview = new Date();
    return this.save();
};

// Méthode pour refuser un abstract
abstractSchema.methods.refuser = function(commentaires) {
    this.statut = 'refuse';
    this.commentairesReviewer = commentaires;
    this.dateReview = new Date();
    return this.save();
};

// Middleware pour parser les mots-clés depuis une chaîne
abstractSchema.pre('save', function(next) {
    if (typeof this.motsClefs === 'string') {
        this.motsClefs = this.motsClefs.split(',').map(k => k.trim()).filter(k => k.length > 0);
    }
    next();
});

module.exports = mongoose.model('Abstract', abstractSchema); 