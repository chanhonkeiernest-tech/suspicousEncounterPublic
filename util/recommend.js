import encounter from '../model/encounter.js';

const MIN_SIMILARITY = 0.1;
//Create counting algorthim that count how many words is inside
const termCounts = (text) => {
    const counts = new Map();
    const terms = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

    for (const term of terms) {
        counts.set(term, (counts.get(term) ?? 0) + 1);
    }

    return counts;
};
//The math used to calcuate is a machine learning method that run dot product to all the text in it
const cosineSimilarity = (left, right) => {
    let dotProduct = 0;
    let leftMagnitude = 0;
    let rightMagnitude = 0;

    for (const count of left.values()) {
        leftMagnitude += count ** 2;
    }
    for (const count of right.values()) {
        rightMagnitude += count ** 2;
    }
    for (const [term, count] of left) {
        dotProduct += count * (right.get(term) ?? 0);
    }

    if (leftMagnitude === 0 || rightMagnitude === 0) return 0;
    return dotProduct / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
};
//A recommend system that recommend cloesly related post
export const recommend = async (id) => {
    const source = await encounter.findById(id);
    if (!source) return [];

    const sourceTerms = termCounts(source.description);
    const listofencounter = await encounter
        .find({ _id: { $ne: source._id }, tag: { $in: source.tag } })
        .populate('user')
        .populate('related')
        .lean();

    return listofencounter
        .map((recommendedEncounter) => ({
            ...recommendedEncounter,
            similarity: cosineSimilarity(sourceTerms, termCounts(recommendedEncounter.description))
        }))
        .filter(({ similarity }) => similarity >= MIN_SIMILARITY)
        .sort((a, b) => b.similarity - a.similarity);
};