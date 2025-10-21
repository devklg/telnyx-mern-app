// BMAD V4 - Conversation Graph
// Owner: Sarah Chen (Database Architect)
// Created: 2025-10-21
//
// TODO: Define conversation flow in Neo4j

// Create Conversation nodes
// CREATE (c:Conversation {id: $convId, callId: $callId})

// Link to Lead
// MATCH (l:Lead {id: $leadId})
// MATCH (c:Conversation {id: $convId})
// CREATE (l)-[:HAD_CONVERSATION]->(c)
