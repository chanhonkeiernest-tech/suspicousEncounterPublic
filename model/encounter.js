import mongoose from 'mongoose';

const encounterSchema = new mongoose.Schema({
    topic: {
        type: String,
        required: true,
        minlength: [1, 'Title cannot be empty'],
        trim: true,
    },
    description: {
        type: String,
        required: true,
        trim: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'accountdb' },
    tag: { type: [String], required: true },
    type: { type: String, enum: ['uncertain', 'certain'], default: 'uncertain' },
    issue: { type: String, enum: ['AI-slop', 'scam', 'advertisement', ''], default: '' },
    img: { type: [String]},
    origin: { type: Boolean, required: true },
    // Self-referencing relationship to other Encounter documents
    related: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'encounter' }], default: [] },
    sameUser :{
        type: Number,
        default : 0
    },
    contributedUser:{ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'accountdb' }], default: [] }
}, { timestamps: true });

// encounterSchema.pre(['deleteOne', 'findOneAndDelete'], async function(next) {
//     const target = await this.model.findOne(this.getFilter()).select('evidence').lean();

//     if (target?.evidence?.length) {
//         await mongoose.model('evidence').deleteMany({ _id: { $in: target.evidence } });
//     }

//     next();
// });

const encounter = mongoose.model('encounter', encounterSchema);

export default encounter;