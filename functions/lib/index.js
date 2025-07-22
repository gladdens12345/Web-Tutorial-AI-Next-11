"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRolesAndTasks = exports.initializeRoleTemplates = exports.searchKnowledgeBase = exports.cleanupSessions = exports.startFreeTrial = exports.trackUsage = exports.validateSession = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto_1 = require("crypto");
// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();
// Constants for security validation
const FREE_TIME_LIMIT_MS = 30 * 60 * 1000; // 30 minutes
const DAILY_LIMIT_MS = 60 * 60 * 1000; // 1 hour
/**
 * Generate a cryptographically secure device fingerprint hash
 */
function hashDeviceFingerprint(fingerprint) {
    const salt = process.env.DEVICE_FINGERPRINT_SALT || 'default_salt_12345';
    return (0, crypto_1.createHash)('sha256')
        .update(fingerprint + salt)
        .digest('hex');
}
/**
 * Detect usage anomalies to prevent tampering
 */
function detectAnomalies(session, requestTime) {
    const timeGap = requestTime - session.lastValidated.toMillis();
    // Flag suspicious activity
    if (timeGap < 10000) {
        return { anomaly: true, type: 'TOO_FREQUENT' };
    }
    if (timeGap > 300000) { // More than 5 minutes gap
        return { anomaly: true, type: 'LARGE_TIME_GAP' };
    }
    return { anomaly: false };
}
/**
 * Calculate time remaining based on user type and usage
 */
function calculateTimeRemaining(session) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    switch (session.subscriptionStatus) {
        case 'premium':
            return -1; // Unlimited
        case 'trial':
            return -1; // Unlimited during valid trial
        case 'limited':
            const todayUsage = session.dailyUsage[today] || 0;
            return Math.max(0, DAILY_LIMIT_MS - todayUsage);
        case 'anonymous':
        default:
            return Math.max(0, FREE_TIME_LIMIT_MS - session.timeUsed);
    }
}
/**
 * Main session validation function - called by extension
 */
exports.validateSession = functions.https.onCall(async (data, context) => {
    try {
        console.log('Session validation request:', {
            sessionId: data.sessionId,
            userId: data.userId,
            timestamp: data.requestTime
        });
        const { sessionId, userId, deviceFingerprint, requestTime } = data;
        if (!sessionId || !deviceFingerprint) {
            throw new functions.https.HttpsError('invalid-argument', 'Session ID and device fingerprint required');
        }
        // Get session from Firestore
        const sessionRef = db.collection('extension_sessions').doc(sessionId);
        const sessionDoc = await sessionRef.get();
        if (!sessionDoc.exists) {
            // Create new anonymous session
            const newSession = {
                sessionId,
                userId: userId || undefined,
                deviceFingerprint: hashDeviceFingerprint(deviceFingerprint),
                subscriptionStatus: userId ? 'limited' : 'anonymous',
                createdAt: admin.firestore.Timestamp.fromMillis(requestTime),
                lastValidated: admin.firestore.Timestamp.fromMillis(requestTime),
                timeUsed: 0,
                dailyUsage: {},
                isValid: true
            };
            await sessionRef.set(newSession);
            const response = {
                isValid: true,
                subscriptionStatus: newSession.subscriptionStatus,
                timeRemaining: userId ? DAILY_LIMIT_MS : FREE_TIME_LIMIT_MS,
                hasKnowledgeBase: false
            };
            console.log('New session created:', response);
            return response;
        }
        const session = sessionDoc.data();
        // Validate device fingerprint
        const expectedFingerprint = hashDeviceFingerprint(deviceFingerprint);
        if (session.deviceFingerprint !== expectedFingerprint) {
            console.warn('Device fingerprint mismatch:', {
                sessionId,
                expected: session.deviceFingerprint,
                received: expectedFingerprint
            });
            await sessionRef.update({ isValid: false });
            throw new functions.https.HttpsError('permission-denied', 'Device fingerprint mismatch');
        }
        // Check for anomalies
        const anomaly = detectAnomalies(session, requestTime);
        if (anomaly.anomaly) {
            console.warn('Usage anomaly detected:', { sessionId, anomaly });
            await sessionRef.update({
                isValid: false,
                anomalyDetected: anomaly.type,
                anomalyTime: admin.firestore.Timestamp.fromMillis(requestTime)
            });
            throw new functions.https.HttpsError('permission-denied', `Anomaly detected: ${anomaly.type}`);
        }
        // Update last validation time
        await sessionRef.update({
            lastValidated: admin.firestore.Timestamp.fromMillis(requestTime)
        });
        // Calculate time remaining
        const timeRemaining = calculateTimeRemaining(session);
        const hasKnowledgeBase = ['trial', 'premium'].includes(session.subscriptionStatus);
        // Determine if session is still valid
        const isValid = timeRemaining > 0 || timeRemaining === -1; // -1 means unlimited
        const response = {
            isValid,
            subscriptionStatus: session.subscriptionStatus,
            timeRemaining,
            hasKnowledgeBase,
            warning: timeRemaining <= 300000 && timeRemaining > 0 ? 'Time running low' : undefined,
            shouldUpgrade: !isValid && session.subscriptionStatus !== 'premium'
        };
        console.log('Session validation result:', response);
        return response;
    }
    catch (error) {
        console.error('Session validation error:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Session validation failed');
    }
});
/**
 * Track usage time for active sessions
 */
exports.trackUsage = functions.https.onCall(async (data, context) => {
    try {
        const { sessionId, usageTimeMs } = data;
        if (!sessionId || usageTimeMs < 0) {
            throw new functions.https.HttpsError('invalid-argument', 'Valid session ID and usage time required');
        }
        const sessionRef = db.collection('extension_sessions').doc(sessionId);
        const sessionDoc = await sessionRef.get();
        if (!sessionDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Session not found');
        }
        const session = sessionDoc.data();
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        // Update usage tracking
        const updatedDailyUsage = Object.assign({}, session.dailyUsage);
        updatedDailyUsage[today] = (updatedDailyUsage[today] || 0) + usageTimeMs;
        await sessionRef.update({
            timeUsed: session.timeUsed + usageTimeMs,
            dailyUsage: updatedDailyUsage,
            lastUsageUpdate: admin.firestore.Timestamp.now()
        });
        const timeRemaining = calculateTimeRemaining(Object.assign(Object.assign({}, session), { dailyUsage: updatedDailyUsage }));
        return {
            success: true,
            timeRemaining,
            todayUsage: updatedDailyUsage[today]
        };
    }
    catch (error) {
        console.error('Usage tracking error:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Usage tracking failed');
    }
});
/**
 * Start free trial for a user
 */
exports.startFreeTrial = functions.https.onCall(async (data, context) => {
    try {
        const { userId } = data;
        if (!userId) {
            console.error('Start trial: Missing userId');
            throw new functions.https.HttpsError('invalid-argument', 'User ID is required');
        }
        console.log('Starting trial for user:', userId);
        // Use Firebase Admin SDK for full database access
        const userDocRef = db.collection('users').doc(userId);
        const userDoc = await userDocRef.get();
        // Calculate trial end date (7 days from now)
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 7);
        const trialData = {
            subscriptionStatus: 'trial',
            subscriptionStartDate: admin.firestore.Timestamp.now(),
            subscriptionEndDate: admin.firestore.Timestamp.fromDate(trialEndDate),
            updatedAt: admin.firestore.Timestamp.now(),
        };
        if (userDoc.exists) {
            // Update existing user document
            console.log('Updating existing user document');
            await userDocRef.update(trialData);
        }
        else {
            // Create new user document with trial status
            console.log('Creating new user document with trial status');
            await userDocRef.set(Object.assign(Object.assign({ uid: userId }, trialData), { createdAt: admin.firestore.Timestamp.now() }));
        }
        console.log('Trial started successfully for user:', userId);
        return {
            success: true,
            trialEndDate: trialEndDate.toISOString(),
            message: 'Trial started successfully'
        };
    }
    catch (error) {
        console.error('Error starting trial:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', `Failed to start trial: ${(error === null || error === void 0 ? void 0 : error.message) || 'Unknown error'}`);
    }
});
/**
 * Clean up old sessions (runs daily)
 */
exports.cleanupSessions = functions.pubsub.schedule('0 0 * * *').onRun(async (context) => {
    const cutoffTime = admin.firestore.Timestamp.fromMillis(Date.now() - (7 * 24 * 60 * 60 * 1000)); // 7 days ago
    const oldSessions = await db.collection('extension_sessions')
        .where('lastValidated', '<', cutoffTime)
        .get();
    const batch = db.batch();
    oldSessions.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();
    console.log(`Cleaned up ${oldSessions.size} old sessions`);
    return null;
});
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
        querySnapshot.docs.forEach((doc) => {
            try {
                const docData = doc.data();
                console.log(`Processing document ${doc.id}:`, Object.keys(docData));
                // Handle different document structures
                let processedDoc = {
                    id: doc.id,
                    description: docData.description || docData.sectionTitle || '',
                    title: docData.sectionTitle || docData.title || doc.id,
                    source: sourceWebsite,
                    originalContentString: JSON.stringify(docData),
                    relevanceScore: calculateRelevanceScore(query, docData)
                };
                results.push(processedDoc);
            }
            catch (error) {
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
    }
    catch (error) {
        console.error('Error searching knowledge base:', error);
        throw new functions.https.HttpsError('internal', `Search failed: ${(error === null || error === void 0 ? void 0 : error.message) || 'Unknown error'}`);
    }
});
/**
 * Calculate relevance score for a document based on query
 */
function calculateRelevanceScore(query, docData) {
    if (!query || !docData)
        return 0;
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
/**
 * Initialize role templates in Firestore with premium roles
 */
exports.initializeRoleTemplates = functions.https.onCall(async (data, context) => {
    try {
        console.log('Initializing role templates in Firestore');
        const rolesRef = db.collection('roleTemplates');
        // Define premium roles with knowledge base access
        const premiumRoles = [
            {
                id: 'synth-flow-expert',
                name: 'Synth Flow Expert',
                description: 'Specialized in Synth Flow features, workflow, and documentation.',
                systemPrompt: 'You are a Synth Flow Expert who understands all aspects of the Synth Flow platform. You provide guidance on features, workflows, best practices, and troubleshooting. You can explain complex Synth Flow concepts clearly and suggest optimal approaches for working with the platform.',
                category: 'automation',
                isPremium: true,
                sourceWebsite: 'synthflow',
                hasKnowledgeBase: true,
                isPublic: true,
                tasks: [
                    {
                        id: 'synth-flow-help',
                        name: 'Synth Flow Help',
                        description: 'Get assistance with Synth Flow features and workflows.',
                        contextPrompt: 'I need help with using Synth Flow. Specifically, I\'m trying to [TASK/FEATURE] and need guidance on how to accomplish this effectively.'
                    }
                ]
            },
            {
                id: 'n8n-guide',
                name: 'n8n Guide',
                description: 'Expert assistant for n8n automation workflows and platform features.',
                systemPrompt: 'You are an n8n automation expert who understands all aspects of the n8n platform. You provide guidance on creating workflows, using nodes, best practices, and troubleshooting. You can explain complex n8n concepts clearly and suggest optimal approaches for automation workflows.',
                category: 'automation',
                isPremium: true,
                sourceWebsite: 'n8n',
                hasKnowledgeBase: true,
                isPublic: true,
                tasks: [
                    {
                        id: 'n8n-workflow-help',
                        name: 'n8n Workflow Help',
                        description: 'Get assistance with creating and managing n8n automation workflows.',
                        contextPrompt: 'I need help with n8n automation workflows. Specifically, I\'m trying to [TASK/FEATURE] and need guidance on how to set this up effectively.'
                    }
                ]
            }
        ];
        // Add each role to Firestore
        const batch = db.batch();
        for (const role of premiumRoles) {
            const roleRef = rolesRef.doc(role.id);
            batch.set(roleRef, Object.assign(Object.assign({}, role), { createdAt: admin.firestore.Timestamp.now(), updatedAt: admin.firestore.Timestamp.now() }), { merge: true });
        }
        await batch.commit();
        console.log(`Successfully initialized ${premiumRoles.length} role templates`);
        return {
            success: true,
            rolesAdded: premiumRoles.length,
            message: 'Role templates initialized successfully'
        };
    }
    catch (error) {
        console.error('Error initializing role templates:', error);
        throw new functions.https.HttpsError('internal', `Failed to initialize roles: ${(error === null || error === void 0 ? void 0 : error.message) || 'Unknown error'}`);
    }
});
/**
 * Get available roles and tasks dynamically
 * Loads roles from Firestore instead of static JSON
 */
exports.getRolesAndTasks = functions.https.onCall(async (data, context) => {
    try {
        console.log('Loading dynamic roles and tasks');
        // Get roles from Firestore roleTemplates collection
        const rolesRef = db.collection('roleTemplates');
        const rolesSnapshot = await rolesRef.get();
        if (rolesSnapshot.empty) {
            console.log('No roles found in roleTemplates collection');
            return {
                roles: [],
                tasks: [],
                count: 0
            };
        }
        const roles = [];
        const tasks = [];
        rolesSnapshot.forEach(doc => {
            try {
                const roleData = doc.data();
                console.log(`Processing role: ${doc.id}`);
                // Add role
                const role = Object.assign({ id: doc.id, name: roleData.name || doc.id, description: roleData.description || '', category: roleData.category || 'general', isPremium: roleData.isPremium || false, sourceWebsite: roleData.sourceWebsite || null, hasKnowledgeBase: !!roleData.sourceWebsite }, roleData);
                roles.push(role);
                // Add associated tasks if they exist
                if (roleData.tasks && Array.isArray(roleData.tasks)) {
                    roleData.tasks.forEach((task, index) => {
                        tasks.push(Object.assign({ id: `${doc.id}_task_${index}`, roleId: doc.id, name: task.name || task, description: task.description || '', category: role.category, isPremium: role.isPremium, sourceWebsite: role.sourceWebsite, hasKnowledgeBase: role.hasKnowledgeBase }, task));
                    });
                }
            }
            catch (error) {
                console.error(`Error processing role ${doc.id}:`, error);
            }
        });
        console.log(`Loaded ${roles.length} roles and ${tasks.length} tasks from Firestore`);
        return {
            roles: roles,
            tasks: tasks,
            count: roles.length + tasks.length,
            lastUpdated: new Date().toISOString()
        };
    }
    catch (error) {
        console.error('Error loading roles and tasks:', error);
        throw new functions.https.HttpsError('internal', `Failed to load roles: ${(error === null || error === void 0 ? void 0 : error.message) || 'Unknown error'}`);
    }
});
//# sourceMappingURL=index.js.map