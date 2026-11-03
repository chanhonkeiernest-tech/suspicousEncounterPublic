import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
//account database schema. The notes part is not used.
const accountschema = new mongoose.Schema({
    username: {
        type: String,
        require:true,
        minlength: [1, 'Title cannot be empty'],
        trim: true,
        unique: true 
    },
    password: {
        type: String,
        require:true,
        minlength: [1, 'Password cannot be empty'],
        trim: true
    },
    rating: {
        type: Number,
        default: 0
    },
    rejectedMerges: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'merge'
    }],
});

accountschema.statics.hashing = async function (password) {
  
  return await bcrypt.hash(password, 10);
};

accountschema.methods.passwordCheck = async function (password) {
  
  return await bcrypt.compare(password, this.password);
};


const accountdb = mongoose.model('accountdb', accountschema);

export default accountdb;