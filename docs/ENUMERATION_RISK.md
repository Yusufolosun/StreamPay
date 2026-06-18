# Document Enumeration Risk: Public Streams Endpoint

The `GET /api/streams` (and `GET /streams`) endpoint is currently public and unauthenticated. While public blockchain data is inherently transparent on-chain, exposing a bulk query endpoint without authentication or parameter mandates introduces significant security and privacy concerns:

## 1. Identified Risks

- **Bulk Information Disclosure / Harvesting**: Malicious actors can call this endpoint repeatedly, changing `page` and `limit`, to harvest the entire database of active, paused, and cancelled streams.
- **User Address Harvesting**: The harvested data maps all user addresses (senders and recipients) participating in the platform.
- **Velocity Mapping**: Attackers can track platform volume, growth velocity, and active users, exposing proprietary business intelligence.
- **DDoS/Resource Exhaustion**: Crawling every page of streams places undue load on the indexing database.

## 2. Mitigation Recommendations

To address these risks, we recommend implementing one or more of the following remediations:

### Recommendation A: Mandate Address Parameters (Address Mandate)
Require that query parameter requests specify a target address:
- `sender`
- `recipient`
- `address` (checks both)

If none of these parameters are present, return a `400 Bad Request` or an empty list instead of returning the entire global list of streams.

### Recommendation B: Require API Key Authentication
Restrict the endpoint behind the existing `apiKeyAuth` middleware. This ensures only registered integrations and frontends can query stream records.

### Recommendation C: Stricter Rate Limiting
Apply a highly restrictive rate limiter specifically for the unparameterized global stream queries.
