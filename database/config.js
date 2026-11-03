import mongo from 'mongoose';
//configuration for the database
const connectdb = async() => {
    try{
        await mongo.connect(process.env.MONGODB_URI)
    }catch (error){
        console.log(error);
        process.exit(1); // Exit process with failure
    }




}

export default connectdb;