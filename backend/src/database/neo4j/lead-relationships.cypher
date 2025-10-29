// Create Lead node
CREATE (l:Lead {
  id: $id,
  firstName: $firstName,
  lastName: $lastName,
  phone: $phone,
  email: $email,
  status: $status
})

// Create relationships
MERGE (c:Campaign {id: $campaignId})
CREATE (l)-[:BELONGS_TO]->(c)

// Create call relationship
MERGE (call:Call {id: $callId})
CREATE (l)-[:HAS_CALL]->(call)

// Create qualification relationship
MERGE (q:Qualification {id: $qualificationId})
CREATE (l)-[:HAS_QUALIFICATION]->(q)
CREATE (call)-[:RESULTED_IN]->(q)
