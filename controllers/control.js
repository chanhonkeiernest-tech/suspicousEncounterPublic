import encounter from '../model/encounter.js';
import account from '../model/accountdb.js';
import merge from '../model/merge.js';
import mongoose from 'mongoose';

const checksession = (req, res) => {
    const authenticated = typeof req.isAuthenticated === 'function' &&
        req.isAuthenticated() &&
        Boolean(req.user);

    return res.json({
        authenticated,
        user: authenticated ? { username: req.user.username } : null
    });
};

const sameUser = async (encounterIds, user) => {
    if (!Array.isArray(encounterIds) || encounterIds.length === 0 ||
        !encounterIds.every((id) => mongoose.isValidObjectId(id))) return false;

    const uniqueEncounterIds = [...new Set(encounterIds.map((id) => id.toString()))];
    const encounters = await encounter.find({ _id: { $in: uniqueEncounterIds } })
        .select('user')
        .lean();

    if ( encounters.some((item) => !item.user)) {
        return false;
    }
    for (let i =0 ;i<encounters.length;i++){
        if(encounters[i]!=user)return false
    }
    
    return true;
};

const oneEncounter=async (req, res) => {
   try{
        const {id} = req.body;

        

        // const sortType=req.params.sortoption;
        // const order=req.params.sortorder;
        // const sortOption = {};
        // const sortDirection = order === "ase" ? 1 : -1;
        // sortOption[sortType] = sortDirection;
        const encounterRecord = await encounter.findOne({ _id: id })
            .populate('user')
            .populate('related');
       
        
        res.json(encounterRecord);
    }catch (error){
        res.status(500).json({ error: 'Server error' });
    }
};


//Function for handling fetching all the notes with the option of changing the query for searching speceific note, changing the search by option and changing the ordering of the list

const allEncounter=async (req, res) => {
   try{
        const { tag, name, type, issue } = req.query;

        const filter = { origin: true };
        const nameQuery = typeof name === 'string' ? name.trim() : '';
        const tagQuery = typeof tag === 'string' ? tag.trim() : '';
        const typeQuery = typeof type === 'string' ? type.trim() : '';
        const issueQuery = typeof issue === 'string' ? issue.trim() : '';

        if (nameQuery) {
            filter.topic = new RegExp(nameQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        }
        if (tagQuery) {
            filter.tag = new RegExp(tagQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        }
        if (typeQuery) filter.type = typeQuery;
        if (issueQuery) filter.issue = issueQuery;

        // const sortType=req.params.sortoption;
        // const order=req.params.sortorder;
        // const sortOption = {};
        // const sortDirection = order === "ase" ? 1 : -1;
        // sortOption[sortType] = sortDirection;
        const listofencounter= await encounter.find(filter).populate('user', 'username rating').populate('related');//.sort(sortOption));
       
        
        res.json(listofencounter);
    }catch (error){
        res.status(500).json({ error: 'Server error' });
    }
};

const myEncounter=async (req, res) => {
   try{
      
        const currentuser = await account.findOne({ username: req.user.username });
        if (!currentuser) return res.status(401).json({ message: 'Unauthorized' });
        const { type, issue } = req.query;
        const filter = { user: currentuser._id };
        const typeQuery = typeof type === 'string' ? type.trim() : '';
        const issueQuery = typeof issue === 'string' ? issue.trim() : '';
        if (typeQuery) filter.type = typeQuery;
        if (issueQuery) filter.issue = issueQuery;

        const listofencounter = await encounter.find(filter).populate('related');
        res.json(listofencounter);
    }catch (error){
        res.status(500).json({ error: 'Server error' });
    }
};


const newEncounter=async (req, res) => {
   try{
       
        const {topic, description, tagString, imgString, type, issue} = req.body;
        const currentuser=await account.findOne({username : req.user.username});
        //const check = await checkdonotexist(title, currentuser._id);
        
  
        const tag = tagString.split(", ");
        const img = imgString.split(", ");

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
        res.status(500).json({ error: 'Server error' });
    }
};


const mergeEncounter=async (req, res) => {
   try{
       
        const {idOrgin, idToBeMerged} = req.body;
    const currentuser=await account.findOne({username : req.user.username});
    if (!currentuser) return res.status(401).json({ error: 'Unauthorized' });
        //const check = await checkdonotexist(title, currentuser._id);

        const encounterOrgin=await encounter.findById(idOrgin);
        const encounterToBeMerged=await encounter.findById(idToBeMerged);
                if(!encounterOrgin || !encounterToBeMerged ||
                        encounterOrgin.origin !== true || encounterToBeMerged.origin !== true ||
                        idOrgin === idToBeMerged){
                    return res.status(400).json({ error: 'both has to be origin true' });
                }

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

        //const sameOwner = await areEncountersOwnedBySameUser([idOrgin, idToBeMerged]);
        
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

        if (sameOwner && currentuser._id.equals(encounterOrgin.user)) {
            return mergingEncounter({
                user: req.user,
                body: { id: newMerge._id }
            }, res);
        }
        
        


        
        
        res.status(201).json({ status: "wait for approve" });
    }catch (error){
        res.status(500).json({ error: 'Server error' });
    }
};

const pendingmerges=async (req, res) => {
    try{
              
        const currentuser=await account.findOne({username :  req.user.username});
        if (!currentuser) return res.status(401).json({ error: 'Unauthorized' });
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
        res.status(500).json({ error: 'Server error' });
    }
};

const mergingEncounter=async (req, res) => {
   try{
       
        const {id} = req.body;
        const currentuser=await account.findOne({username :  req.user.username});
        if (!currentuser) return res.status(401).json({ error: 'Unauthorized' });

        const request = await merge.findOne({
            _id: id,
            status: 'pending',
            $or: [{ user1: currentuser._id }, { user2: currentuser._id }]
        });
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

        let merging = await merge.findOneAndUpdate({
            _id: id,
            status: 'pending',
            $or: [{ user1: currentuser._id }, { user2: currentuser._id }]
        }, {
            $addToSet: { confirmedBy: currentuser._id }
        }, { returnDocument: 'after' });
        
        if(merging){
            const requiredUsers = [...new Set([merging.user1.toString(), merging.user2.toString()])];
            const isFullyConfirmed = requiredUsers.every(userId =>
                merging.confirmedBy.some(confirmedUser => confirmedUser.toString() === userId)
            );

            if(!isFullyConfirmed){
                return res.status(202).json({ status: 'waiting for other user approval' });
            }

            const encounterOrgin=await encounter.findById(merging.encounterOrgin); //get the orgin encounter
            const encounterToBeMerged=await encounter.findById(merging.encounterToBeMerged); //get the to be merged encounter 

            if(!encounterOrgin || !encounterToBeMerged ||
                encounterOrgin.origin !== true || encounterToBeMerged.origin !== true){
                return res.status(400).json({ error: 'both has to be origin' });
            }

            merging = await merge.findOneAndUpdate({
                _id: merging._id,
                status: 'pending',
                confirmedBy: { $all: requiredUsers },
            }, { $set: { status: 'merging' } }, { returnDocument: 'after' });

            if(!merging){
                return res.status(202).json({ status: 'merge is already being processed' });
            }

            const newTag = encounterOrgin.tag;
            const otherTag = encounterToBeMerged.tag;
            for(let i=0; i<otherTag.length; i++){
                if(!newTag.includes(otherTag[i])){
                newTag.push(otherTag[i]);
                }
            }
            const newRelation = encounterOrgin.related.concat(encounterToBeMerged.related);
            newRelation.push(encounterToBeMerged._id);

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

            const relatedEncounterIds = [...new Set(
                encounterToBeMerged.related.map((id) => id.toString())
            )];
            const reparentedRelated = await encounter.updateMany(
                { _id: { $in: relatedEncounterIds } },
                { $set: { related: [merging.encounterOrgin] } }
            );

            if(!eO||!eM||reparentedRelated.matchedCount !== relatedEncounterIds.length) {
                return res.status(400).json({ error: "fail to merge" });
            }
            const mergesToRemove = await merge.find({
                $or: [
                    { encounterOrgin: merging.encounterToBeMerged },
                    { encounterToBeMerged: merging.encounterToBeMerged }
                ]
            }).select('_id').lean();
            const mergeIdsToRemove = mergesToRemove.map(({ _id }) => _id);
            const removeAllMerge = await merge.deleteMany({ _id: { $in: mergeIdsToRemove } });
            //const removeMerge = await merge.deleteOne({ _id : id});
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
        res.status(500).json({ error: 'Server error' });
    }
};

const rejectMerge = async (req, res) => {
    
    try {
        const { id } = req.body;
        const currentuser = await account.findOne({ username: req.user.username });
        if (!currentuser) return res.status(401).json({ error: 'Unauthorized' });

        const pendingRequest = await merge.findOne({
            _id: id,
            status: 'pending',
            $or: [{ user1: currentuser._id }, { user2: currentuser._id }]
        });

        if (!pendingRequest) {
            const existingRequest = await merge.findById(id);
            if (!existingRequest) return res.status(404).json({ error: 'Merge not found' });
            if (!existingRequest.user1.equals(currentuser._id) &&
                !existingRequest.user2.equals(currentuser._id)) {
                return res.status(403).json({ error: 'You are not an owner of these encounters' });
            }
            return res.status(409).json({ error: 'Merge request is no longer pending' });
        }

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
        res.status(500).json({ error: 'Server error' });
    }
};

const unmerge = async (req, res) => {
   try{
       const {id} = req.body;
       const currentuser=await account.findOne({username :  req.user.username});
 
       const encounterTarget = await encounter.findOne({_id: id, user: currentuser._id, origin: false});

       if(!encounterTarget)return res.status(401).json({ error: 'Encounter not found or this encounter does not belong to you' });
       const sourceEncounter = await encounter.findOne({_id: encounterTarget.related[0], origin: true});

       if(!sourceEncounter )return res.status(403).json({ error: 'The other encounter not found or you are trying to umerge an origin' });
        const newRelation = sourceEncounter.related;
        
        
        //When the soruce encounter is rely on by other encoutner created by user that's not the source user, all other encoutner created by the source user and merged to this source encouter cannot be remove until the source encouter is longer that user. 
        if(sourceEncounter.user===encounterTarget.user&&!sameUser(newRelation, currentuser))return res.status(401).json({ error: 'Not allow to unmerge source' });

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
        res.status(500).json({ error: 'Server error' });
    }
};


const relatedEncounter =async (req, res) => {
   try{
        const eid=req.params.eid;        
  
        const sourceEncounter= await encounter.findOne({_id:eid, origin: true});
        if(!sourceEncounter){
            return res.status(401).json({ error: 'Encounter not found' });
           
        }
        
        const relatedEncounterIDs=sourceEncounter.related;

        const relatedEncounters= await Promise.all(
            relatedEncounterIDs.map( async(ID) => {
                return await encounter.findById(ID).lean();})
        );
            
        return res.json(relatedEncounters);
       
    }catch (error){
        res.status(500).json({ error: 'Server error' });
    }
};




    //User are expect to unmerge before deleting encounter

    const deleteEncounter = async (req, res) => {
        try {
            const { id } = req.body;
            if (!id) return res.status(400).json({ message: 'Missing id' });

            const currentuser = await account.findOne({ username: req.user && req.user.username });
            if (!currentuser) return res.status(401).json({ message: 'Unauthorized' });

            const target = await encounter.findOne({ _id: id, user: currentuser._id });
            if (!target) return res.status(404).json({ message: 'Encounter not found' });
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