-- Initial database schema migration
-- Run all schema files in order
\i backend/src/database/postgresql/schemas/leads.sql
\i backend/src/database/postgresql/schemas/calls.sql
\i backend/src/database/postgresql/schemas/qualifications.sql
\i backend/src/database/postgresql/schemas/dnc_list.sql
\i backend/src/database/postgresql/schemas/campaigns.sql
\i backend/src/database/postgresql/schemas/users.sql
