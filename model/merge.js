import mongoose from 'mongoose';

const mergeSchema = new mongoose.Schema({
    encounterOrgin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'encounter',
    },

    encounterToBeMerged: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'encounter',
    },

    user1: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'accountdb',
        required: true,
    },
    user2: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'accountdb',
        required: true,
    },
    userprompted:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'accountdb',
        required: true,
    },
    confirmedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'accountdb',
    }],
    status: {
        type: String,
        enum: ['pending', 'merging'],
        default: 'pending',
    },
});

const merge = mongoose.model('merge', mergeSchema);

export default merge;