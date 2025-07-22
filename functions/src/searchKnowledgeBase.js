const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin (if not already done)
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

/**
 * Search Knowledge Base Firebase Cloud Function
 * Searches through n8n and synthflow knowledge bases for relevant information
 */
exports.searchKnowledgeBase = functions.https.onCall(async (data, context) => {
    try {
        console.log('Search knowledge base request:', data);
        
        const { query, sourceWebsite, limit = 3 } = data;
        
        // Validate input
        if (!query) {
            throw new functions.https.HttpsError('invalid-argument', 'Query is required');
        }
        
        if (!sourceWebsite || !['n8n', 'synthflow'].includes(sourceWebsite)) {
            throw new functions.https.HttpsError('invalid-argument', 'Valid sourceWebsite (n8n or synthflow) is required');
        }
        
        // Search the knowledge collection 
        // Based on your data structure, looking for documents where sourceWebsite matches
        const knowledgeBaseRef = db.collection('knowledge');
        
        // First, try to find documents by sourceWebsite
        let querySnapshot = await knowledgeBaseRef
            .where('sourceWebsite', '==', sourceWebsite)
            .limit(limit)
            .get();
        
        // If no documents found with sourceWebsite field, try searching by document ID patterns
        if (querySnapshot.empty) {
            console.log(`No documents found with sourceWebsite=${sourceWebsite}, trying alternative search...`);
            
            // Try searching all documents and filter by content
            const allDocsSnapshot = await knowledgeBaseRef.limit(100).get();
            const filteredDocs = [];
            
            allDocsSnapshot.forEach(doc => {
                const docData = doc.data();
                const docId = doc.id.toLowerCase();
                
                // Check if document relates to the source website
                if (docId.includes(sourceWebsite.toLowerCase()) || 
                    JSON.stringify(docData).toLowerCase().includes(sourceWebsite.toLowerCase())) {
                    filteredDocs.push({
                        id: doc.id,
                        data: docData
                    });
                }
            });
            
            // Create a mock snapshot with filtered results
            querySnapshot = {
                empty: filteredDocs.length === 0,
                docs: filteredDocs.slice(0, limit).map(item => ({
                    id: item.id,
                    data: () => item.data
                }))
            };
        }
        
        if (querySnapshot.empty) {
            console.log(`No knowledge base documents found for ${sourceWebsite}`);
            return {
                results: [],
                count: 0,
                sourceWebsite: sourceWebsite,
                query: query
            };
        }
        
        // Process the results
        const results = [];
        
        querySnapshot.docs.forEach(doc => {
            try {
                const docData = doc.data();
                console.log(`Processing document ${doc.id}:`, Object.keys(docData));
                
                // Handle different document structures
                let processedDoc = {
                    id: doc.id,
                    description: docData.description || docData.sectionTitle || '',
                    title: docData.sectionTitle || docData.title || doc.id,
                    source: sourceWebsite
                };
                
                // Add the original content as a stringified JSON for the extension to parse
                if (docData) {
                    processedDoc.originalContentString = JSON.stringify(docData);
                }
                
                // Calculate relevance score based on query match
                const relevanceScore = calculateRelevance(query, docData);
                processedDoc.relevanceScore = relevanceScore;
                
                results.push(processedDoc);
                
            } catch (error) {
                console.error(`Error processing document ${doc.id}:`, error);
            }
        });
        
        // Sort by relevance score (highest first)
        results.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
        
        console.log(`Found ${results.length} relevant documents for ${sourceWebsite}`);
        
        return {
            results: results,
            count: results.length,
            sourceWebsite: sourceWebsite,
            query: query
        };
        
    } catch (error) {
        console.error('Error searching knowledge base:', error);
        throw new functions.https.HttpsError('internal', `Search failed: ${error.message}`);
    }
});

/**
 * Calculate relevance score for a document based on query
 */
function calculateRelevance(query, docData) {
    if (!query || !docData) return 0;
    
    const queryWords = query.toLowerCase().split(/\s+/);
    const docText = JSON.stringify(docData).toLowerCase();
    
    let score = 0;
    
    queryWords.forEach(word => {
        if (word.length > 2) { // Skip very short words
            // Count occurrences of each query word
            const matches = (docText.match(new RegExp(word, 'g')) || []).length;
            score += matches;
            
            // Bonus points for matches in key fields
            if (docData.sectionTitle && docData.sectionTitle.toLowerCase().includes(word)) {
                score += 10;
            }
            if (docData.description && docData.description.toLowerCase().includes(word)) {
                score += 5;
            }
            if (docData.keyPoints && JSON.stringify(docData.keyPoints).toLowerCase().includes(word)) {
                score += 3;
            }
        }
    });
    
    return score;
}