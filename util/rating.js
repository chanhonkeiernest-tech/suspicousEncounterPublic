import encounter from '../model/encounter.js';
import account from '../model/accountdb.js';

const calculateScore = async (id) => {
    const user = await account.findById(id);
    if (!user) return false;

    let newRate = 0;
    const contributedEncounters = await encounter.find({
        user: user._id,
        origin: false
    }).select('related').lean();
    const ownedOrigins = await encounter.find({
        user: user._id,
        origin: true
    }).select('related sameUser').lean();
    const ownedOriginIds = new Set(ownedOrigins.map(({ _id }) => _id.toString()));

    for (const originEncounter of ownedOrigins) {
        const sameOwnerRelatedCount = originEncounter.sameUser || 0;
        const allRelatedCount = originEncounter.related.length;
        newRate += allRelatedCount - sameOwnerRelatedCount;
        
    }
    newRate += contributedEncounters.filter(({ related }) =>
        related.length > 0 && !ownedOriginIds.has(related[0].toString())
    ).length;

    const result = await account.updateOne(
        { _id: user._id },
        { $set: { rating: newRate } }
    );
    return result.matchedCount === 1;
};

export default {
  calculateScore
};