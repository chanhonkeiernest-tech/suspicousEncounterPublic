import encounter from '../model/encounter.js';
import account from '../model/accountdb.js';
import merge from '../model/merge.js';
import mongoose from 'mongoose';
import { recommend } from '../util/recommend.js';



const checksession = (req, res) => {

    //Use the passport function 
    const authenticated = typeof req.isAuthenticated === 'function' &&
        req.isAuthenticated() &&
        Boolean(req.user);

    return res.json({
        authenticated,
        user: authenticated ? { username: req.user.username } : null
    });
};

const sameUser = async (encounterIds, user) => {

    // A helper method that check wether or not a group of encounter all created by the same user

    //check array and the id in it
    if (!Array.isArray(encounterIds) || encounterIds.length === 0 ||
        !encounterIds.every((id) => mongoose.isValidObjectId(id))) return false;

    //group these encounter ID into an array and find the full encounter data at encounters
    const uniqueEncounterIds = [...new Set(encounterIds.map((id) => id.toString()))];
    const encounters = await encounter.find({ _id: { $in: uniqueEncounterIds } })
        .select('user')
        .lean();
    
        //If there is error regarding the user than the data is corrupted or incorrect
    if (encounters.length !== uniqueEncounterIds.length ||
        encounters.some((item) => !item.user)) {
        return false;
    }

    //check wether or not each of the encounter user field equal to parameter user
    for (const item of encounters) {
        if (item.user.toString() !== user._id.toString()) return false;
    }
    
    return true;
};

const oneEncounter=async (req, res) => {

    //Get one encounter, but include a bunch of suggestion
   try{
        const {id} = req.body;

        const suggest = await recommend(id);
        const encounterRecord = await encounter.findOne({ _id: id })
            .populate('user')
            .populate('related');
       

        res.json([
            encounterRecord.toObject(),
            ...suggest
        ]);
    }catch (error){
        console.error('oneEncounter error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};


const allEncounter=async (req, res) => {
    //Function for handling fetching all the notes with the option of changing the query for searching speceific note, changing the search by option and changing the ordering of the list

   try{
        const { tag, name, type, issue } = req.query;

        const filter = { origin: true };
        const nameQuery = typeof name === 'string' ? name.trim() : '';
        const tagQuery = typeof tag === 'string' ? tag.split(",").map(value => value.trim()).filter(Boolean): [];
        const typeQuery = typeof type === 'string' ? type.trim() : '';
        const issueQuery = typeof issue === 'string' ? issue.trim() : '';

        if (nameQuery) {
            filter.topic = new RegExp(nameQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        }
        
        if (typeQuery) filter.type = typeQuery;
        if (issueQuery) filter.issue = issueQuery;
        let listofencounter=[];
        if (tagQuery.length) {
            listofencounter= await encounter.find({...filter, tag: {$in: tagQuery}}).populate('user', 'username').populate('related');

        }
        else {
            listofencounter= await encounter.find(filter).populate('user', 'username').populate('related');
       
        }
        res.json(listofencounter);
    }catch (error){
        console.error('allEncounter error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

const myEncounter=async (req, res) => {
   try{
        //Return a list of encounter created by a speceifc user based on login cookie
        const currentuser = await account.findOne({ username: req.user.username });
        if (!currentuser) return res.status(401).json({ message: 'Unauthorized' });
        const { type, issue } = req.query;
        const filter = { user: currentuser._id };
        const typeQuery = typeof type === 'string' ? type.trim() : '';
        const issueQuery = typeof issue === 'string' ? issue.trim() : '';
        if (typeQuery) filter.type = typeQuery;
        if (issueQuery) filter.issue = issueQuery;

        const listofencounter = await encounter.find(filter).populate('user').populate('related')
        res.json(listofencounter);
    }catch (error){
        console.error('myEncounter error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};


const newEncounter=async (req, res) => {
   try{
       //Create new encounter
        const {topic, description, tagString, imgString, type, issue} = req.body;
        const currentuser=await account.findOne({username : req.user.username});
        
        //remove danger symbole to prevent xss
        if(topic.includes("<")||topic.includes("//")) res.status(402).json({ error: 'bad entry' });
        if(description.includes("<")||description.includes("//")) res.status(402).json({ error: 'bad entry' });
        if(tagString.includes("<")||tagString.includes("//")) res.status(402).json({ error: 'bad entry' });
        
        const tag = tagString.split(", ");
        const tempimg = imgString.split(", ");

        //All img link restrict to imgur.com link
        const img = tempimg.filter((i) =>{
            try{
                return (new URL(i)).hostname.replace('www.','')==="imgur.com"
            }catch{
                return false;
            }
            

        });

        const createEncounter = new encounter({
                topic, 
                description,
                user :currentuser._id,
                tag,
                type,
                issue,
                img,
                origin: true
            });
       
        await createEncounter.save();
       
        
        res.status(201).json({status:"created"});
    }catch (error){
        console.error('new encounter error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};


const mergeEncounter=async (req, res) => {

    //Create a merge request
   try{
       
        const {idOrgin, idToBeMerged} = req.body;
    const currentuser=await account.findOne({username : req.user.username});
    if (!currentuser) return res.status(401).json({ error: 'Unauthorized' });
        
        //Get the requested encounter first and ensure that both are origin
        const encounterOrgin=await encounter.findById(idOrgin);
        const encounterToBeMerged=await encounter.findById(idToBeMerged);
                if(!encounterOrgin || !encounterToBeMerged ||
                        encounterOrgin.origin !== true || encounterToBeMerged.origin !== true ||
                        idOrgin === idToBeMerged){
                    return res.status(400).json({ error: 'both has to be origin true' });
                }
        //First find wether or not such merge request already exist
        const existingPendingMerge = await merge.findOne({
            status: 'pending',
            $or: [
                {
                    encounterOrgin: encounterOrgin._id,
                    encounterToBeMerged: encounterToBeMerged._id
                },
                {
                    encounterOrgin: encounterToBeMerged._id,
                    encounterToBeMerged: encounterOrgin._id
                }
            ]
        });

        //If it does, don't create new merge request
        if (existingPendingMerge) {
            const isOwner = encounterOrgin.user.equals(currentuser._id) ||
                encounterToBeMerged.user.equals(currentuser._id);
            if (isOwner) {
                return mergingEncounter({
                    user: req.user,
                    body: { id: existingPendingMerge._id }
                }, res);
            }
            return res.status(201).json({
                message: 'A pending merge request already exists',
                id: existingPendingMerge._id
            });
        }

        const proposerIsOwner = encounterOrgin.user.equals(currentuser._id) ||
            encounterToBeMerged.user.equals(currentuser._id);

        //create a new merge. If the issue is either post owner, no need to prommpt such user again by adding the user to confirm field.

        const sameOwner = encounterOrgin.user.equals(encounterToBeMerged.user);
        const newMerge = new merge({
            encounterOrgin: encounterOrgin._id,
            encounterToBeMerged: encounterToBeMerged._id,
            user1: encounterOrgin.user,
            user2: encounterToBeMerged.user,
            userprompted: currentuser._id,
            confirmedBy: proposerIsOwner ? [currentuser._id] : [],

        })
        
        await newMerge.save();

        //If both posts are created by the same user and the issue is such user, merge immdeiately.
        if (sameOwner && currentuser._id.equals(encounterOrgin.user)) {
            return mergingEncounter({
                user: req.user,
                body: { id: newMerge._id }
            }, res);
        }
        
        


        
        
        res.status(201).json({ status: "wait for approve" });
    }catch (error){
        console.error('merge encounter error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

const pendingmerges=async (req, res) => {
    try{
        //retrive a list of pending request for the user currently login      
        const currentuser=await account.findOne({username :  req.user.username});
        if (!currentuser) return res.status(401).json({ error: 'Unauthorized' });

        //First group of pending will be those that has not been rejected or accepted
        const mergeP = await merge.find({
                status: 'pending',
                _id: { $nin: currentuser.rejectedMerges },
                $or: [{ user1: currentuser._id }, { user2: currentuser._id }],
                confirmedBy: {$nin: currentuser._id }
            })
                .populate('encounterOrgin')
                .populate('encounterToBeMerged')
                .populate('user1', 'username rating')
                .populate('user2', 'username rating')
                .populate('userprompted');

        //The other group will be the rejected group. Using rejected id list recorded in the user account line 274        
        const mergeR = await  merge.find({
                _id: { $in: currentuser.rejectedMerges },
                $or: [{ user1: currentuser._id }, { user2: currentuser._id }],
                confirmedBy: {$nin: currentuser._id }
            })
                .populate('encounterOrgin')
                .populate('encounterToBeMerged')
                .populate('user1', 'username rating')
                .populate('user2', 'username rating')
                .populate('userprompted');

        return res.json({ mergeP, mergeR });

    }catch (error){
        console.error('pending:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

const mergingEncounter=async (req, res) => {
   try{
       //Merging encounter function
        const {id} = req.body;
        const currentuser=await account.findOne({username :  req.user.username});
        if (!currentuser) return res.status(401).json({ error: 'Unauthorized' });

        //First find the merge request for it
        const request = await merge.findOne({
            _id: id,
            status: 'pending',
            $or: [{ user1: currentuser._id }, { user2: currentuser._id }]
        });

        //If no such request exist, than this is a bad request
        if (!request) {
            const existingMerge = await merge.findById(id);
            if (!existingMerge) return res.status(404).json({ error: 'Merge not found' });
            if (!existingMerge.user1.equals(currentuser._id) &&
                !existingMerge.user2.equals(currentuser._id)) {
                return res.status(403).json({ error: 'You are not an owner of these encounters' });
            }
            if (existingMerge.status === 'merging') {
                return res.status(202).json({ status: 'merge is already being processed' });
            }
            return res.status(404).json({ error: 'Merge not found' });
        }

        //edit the merge request to record one user confimration
        let merging = await merge.findOneAndUpdate({
            _id: id,
            status: 'pending',
            $or: [{ user1: currentuser._id }, { user2: currentuser._id }]
        }, {
            $addToSet: { confirmedBy: currentuser._id }
        }, { returnDocument: 'after' });
        

        //If all part has been confirmed finish the merge
        if(merging){
            const requiredUsers = [...new Set([merging.user1.toString(), merging.user2.toString()])];
            const isFullyConfirmed = requiredUsers.every(userId =>
                merging.confirmedBy.some(confirmedUser => confirmedUser.toString() === userId)
            );

            if(!isFullyConfirmed){
                return res.status(202).json({ status: 'waiting for other user approval' });
            }
            //Start by getting both post again
            const encounterOrgin=await encounter.findById(merging.encounterOrgin); //get the orgin encounter
            const encounterToBeMerged=await encounter.findById(merging.encounterToBeMerged); //get the to be merged encounter 
            //ensure both origin
            if(!encounterOrgin || !encounterToBeMerged ||
                encounterOrgin.origin !== true || encounterToBeMerged.origin !== true){
                return res.status(400).json({ error: 'both has to be origin' });
            }
            //edit the merge status
            merging = await merge.findOneAndUpdate({
                _id: merging._id,
                status: 'pending',
                confirmedBy: { $all: requiredUsers },
            }, { $set: { status: 'merging' } }, { returnDocument: 'after' });
            //This is to prevent race condition becuase if update fail this indcate that the request has been removed thus merge has been completed
            if(!merging){
                return res.status(202).json({ status: 'merge is already being processed' });
            }
            //Combine all the tag together
            const newTag = encounterOrgin.tag;
            const otherTag = encounterToBeMerged.tag;
            for(let i=0; i<otherTag.length; i++){
                if(!newTag.includes(otherTag[i])){
                newTag.push(otherTag[i]);
                }
            }

            //combine the related post information
            const newRelation = encounterOrgin.related.concat(encounterToBeMerged.related);
            newRelation.push(encounterToBeMerged._id);

            //combine the contributed User list
            const contributedUserIds = new Set();
            const contributedUsers = [
                ...encounterOrgin.contributedUser,
                ...encounterToBeMerged.contributedUser
            ].filter((userId) => {
                const userIdString = userId.toString();
                if (contributedUserIds.has(userIdString)) return false;
                contributedUserIds.add(userIdString);
                return true;
            });
            //count how many time same user try to merge to their own post
            var newSameUser = 0;
            if(encounterOrgin.user.equals(encounterToBeMerged.user)){
                newSameUser = encounterToBeMerged.sameUser+encounterOrgin.sameUser+1;
            }
            const eO = await encounter.findOneAndUpdate({_id:merging.encounterOrgin},
                {
                    
                    $set:{
                        tag: newTag,
                        related : newRelation,
                        sameUser : newSameUser,
                        contributedUser: contributedUsers
                        
                    }
                    
                },{returnDocument: 'after'}
            );
            
            const eM = await encounter.findOneAndUpdate({_id:merging.encounterToBeMerged},
                {
                    
                    $set:{
                       
                        origin : false,
                        related: [merging.encounterOrgin],
                        contributedUser: []
                    }
                    
                },{returnDocument: 'after'}
            );
            //This is a castcate update so all other existed merge will point to the same new root in a case one of the merge brings in a group of merged posted
            const relatedEncounterIds = [...new Set(
                encounterToBeMerged.related.map((id) => id.toString())
            )];
            const reparentedRelated = await encounter.updateMany(
                { _id: { $in: relatedEncounterIds } },
                { $set: { related: [merging.encounterOrgin] } }
            );

            //If any fail return error
            if(!eO||!eM||reparentedRelated.matchedCount !== relatedEncounterIds.length) {
                return res.status(400).json({ error: "fail to merge" });
            }

            //remove all merges the invole the tobeMerged as it no longer is an oriigin all other requests will be void and are illegal
            const mergesToRemove = await merge.find({
                $or: [
                    { encounterOrgin: merging.encounterToBeMerged },
                    { encounterToBeMerged: merging.encounterToBeMerged }
                ]
            }).select('_id').lean();
            const mergeIdsToRemove = mergesToRemove.map(({ _id }) => _id);
            const removeAllMerge = await merge.deleteMany({ _id: { $in: mergeIdsToRemove } });
            
            //ensure all request has been clear also update account information for its rejected merges as they no longer exist
            if(removeAllMerge.deletedCount === mergeIdsToRemove.length){
                if (mergeIdsToRemove.length > 0) {
                    await account.updateMany(
                        { rejectedMerges: { $in: mergeIdsToRemove } },
                        { $pull: { rejectedMerges: { $in: mergeIdsToRemove } } }
                    );
                }
                return res.status(201).json({status: "merged"});
            }
            return res.status(400).json({ error: "fail to merge" });


            

        }else{
            //This will make sure race condtion to be minimum 
            const existingMerge = await merge.findById(id);
            if(existingMerge && existingMerge.status === 'merging'){
                return res.status(202).json({ status: 'merge is already being processed' });
            }
            if(existingMerge &&
                !existingMerge.user1.equals(currentuser._id) &&
                !existingMerge.user2.equals(currentuser._id)) {
                return res.status(403).json({ error: 'You are not an owner of these encounters' });
            }
            return res.status(404).json({ error: "Merge not found" });
        }
        


        
        
        
    }catch (error){
        console.error('merging error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

const rejectMerge = async (req, res) => {
    //This function is for use to reject a merge request
    try {
        const { id } = req.body;
        const currentuser = await account.findOne({ username: req.user.username });
        if (!currentuser) return res.status(401).json({ error: 'Unauthorized' });
        //find the request first 
        const pendingRequest = await merge.findOne({
            _id: id,
            status: 'pending',
            $or: [{ user1: currentuser._id }, { user2: currentuser._id }]
        });
        //If it doesn't exist return error 
        if (!pendingRequest) {
            const existingRequest = await merge.findById(id);
            if (!existingRequest) return res.status(404).json({ error: 'Merge not found' });
            if (!existingRequest.user1.equals(currentuser._id) &&
                !existingRequest.user2.equals(currentuser._id)) {
                return res.status(403).json({ error: 'You are not an owner of these encounters' });
            }
            return res.status(409).json({ error: 'Merge request is no longer pending' });
        }
        //we mark the reject record on the user account instead
        const updatedAccount = await account.findOneAndUpdate(
            { _id: currentuser._id },
            { $addToSet: { rejectedMerges: pendingRequest._id } },
            { returnDocument: 'after' }
        );
        if (!updatedAccount) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        return res.status(200).json({
            status: 'rejected',
            mergeRequestId: pendingRequest._id
        });
    } catch (error) {
        console.error('reject error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

const unmerge = async (req, res) => {
    //umerge request 
   try{
       const {id} = req.body;
       const currentuser=await account.findOne({username :  req.user.username});
       if (!currentuser) return res.status(401).json({ error: 'Unauthorized' });
       //Find that post first and make sure it is a child merge not a parent or root 
       const encounterTarget = await encounter.findOne({_id: id, user: currentuser._id, origin: false});

       if(!encounterTarget)return res.status(401).json({ error: 'Encounter not found or this encounter does not belong to you' });
       //If there is no source, this is a corrupt data and should not be process
       const sourceEncounter = await encounter.findOne({_id: encounterTarget.related[0], origin: true});

       if(!sourceEncounter )return res.status(403).json({ error: 'The other encounter not found or you are trying to umerge an origin' });
        const newRelation = sourceEncounter.related;
        
        
        //When the soruce encounter is rely on by other encoutner created by user that's not the source user, all other encoutner created by the source user and merged to this source encouter cannot be remove until the source encouter is longer that user. 
        if (sourceEncounter.user.equals(encounterTarget.user) &&
            !(await sameUser(newRelation, currentuser))) {
            return res.status(401).json({ error: 'Not allow to unmerge source' });
        }
        //Edit the child post list to reflect the merge and upate accordingly
        const index = newRelation.indexOf(id);
        const removeIndex = sourceEncounter.contributedUser.indexOf(currentuser);
        const newConributedUser = sourceEncounter.contributedUser.splice(removeIndex,1);
        if(index<0)return res.status(405).json({ error: 'The other index not found' });
        newRelation.splice(index, 1);
       const DeMergeEncounter = await encounter.findOneAndUpdate({_id: id, user: currentuser, origin: false},
                {
                    
                    $set:{
                        origin: true,
                        related : [],
                        contributedUser : []
                        
                        
                    }
                    
                },{returnDocument: 'after'}
            );

         const ChangeRelationEncounter = await encounter.findOneAndUpdate({_id: sourceEncounter._id,  origin: true},
                {
                    
                    $set:{
                        
                        related : newRelation
                        
                        
                    }
                    
                },{returnDocument: 'after'}
            );

        if(DeMergeEncounter&&ChangeRelationEncounter){
            
            res.status(201).json({ message: "demerged" });
        }
       
    }catch (error){
        console.error('unmerge error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};


const relatedEncounter =async (req, res) => {
    //A request to just get the child post of a post
   try{
        const eid=req.params.eid;        
        //Make sure the request entry is a parent or root post
        const sourceEncounter= await encounter.findOne({_id:eid, origin: true});
        if(!sourceEncounter){
            return res.status(401).json({ error: 'Encounter not found' });
           
        }
        
        const relatedEncounterIDs=sourceEncounter.related;
        //Since the list onky record id we need to query it again to get the full post
        const relatedEncounters= await Promise.all(
            relatedEncounterIDs.map( async(ID) => {
                return await encounter.findById(ID).lean();})
        );
            
        return res.json(relatedEncounters);
       
    }catch (error){
        console.error('related error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};




    

    const deleteEncounter = async (req, res) => {
        //Function for deleting a post
        try {
            const { id } = req.body;
            if (!id) return res.status(400).json({ message: 'Missing id' });

            const currentuser = await account.findOne({ username: req.user && req.user.username });
            if (!currentuser) return res.status(401).json({ message: 'Unauthorized' });
            //Start with find the post
            const target = await encounter.findOne({ _id: id, user: currentuser._id });
            if (!target) return res.status(404).json({ message: 'Encounter not found' });
            //It is important to not for data intergity reason, only post that has no child can be delete. Thus unmerge everything first
            if (target.origin === true && target.related.length === 0) { 
                await encounter.deleteOne({ _id: id });
            }
            else{
                return res.status(401).json({ message: 'cannot delete root origin' });
            }
            
            return res.status(201).json({ message: 'deleted' });
        } catch (error) {
            console.error('deleteEncounter error', error);
            return res.status(500).json({ error: 'Server error' });
        }
    };

    
        



export default {
  checksession,
  oneEncounter,  
  allEncounter,
  myEncounter,
  newEncounter,
  mergeEncounter,
  pendingmerges,
  mergingEncounter,
  rejectMerge,
  relatedEncounter,
  unmerge,
  deleteEncounter
};


// const tag = tagString.split(", ");
//         const img = imgString.split(", ");