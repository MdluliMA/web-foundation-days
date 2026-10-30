TicketHub — System Design Document
1. Context and Goals

TicketHub is a website where users discover concerts and events, select seats, and purchase tickets online. It supports 2 million registered users and must handle ordinary daily traffic as well as sudden demand when popular concerts go on sale.

The most important correctness requirement is that the same seat must never be sold to two different customers.

Goals
Let users browse events and view seat availability.
Allow users to reserve available seats temporarily.
Process payments and issue tickets after successful payment.
Prevent duplicate bookings and double-selling.
Remain responsive during major ticket-sale events.
Handle payment failures and expired reservations safely.
Non-goals
Ticket resale between customers.
Event livestreaming.
Dynamic pricing or automated price optimization.
International multi-region active-active deployment in the initial version.

These features can be considered later if business requirements justify them.

2. Requirements
Functional requirements
Users can register and authenticate.
Users can browse events and view event details.
Users can view available seats and their prices.
Users can temporarily hold available seats while completing checkout.
Users can purchase tickets through a payment provider.
Users can view their confirmed orders and tickets.
Users can cancel eligible orders according to the event's cancellation policy.
The system prevents a seat from being confirmed for more than one order.
Failed payments and expired holds release seats for other customers.
Non-functional requirements
Correctness: A seat can have at most one active reservation or confirmed sale at a time.
Availability: Browsing should remain available during periods of heavy purchasing traffic, where possible.
Performance: Event listings and seat availability should load quickly. A target of p95 API latency below 300 ms for ordinary reads is a starting objective, excluding external payment processing.
Scalability: The system must absorb traffic spikes during popular ticket sales.
Security: Authentication, authorization, encrypted connections, input validation, and secure payment integration are required.
Reliability: Payment retries and repeated client requests must not create duplicate orders or charges.
Observability: The system must expose latency, error rates, booking failures, and payment outcomes.

3. Traffic and Storage Estimates
Normal traffic

Given:

2 million registered users.
50,000 daily visitors.
10 page views per visitor per day.
5,000 tickets sold per normal day.

Page views per day:

50,000 × 10 = 500,000 page views/day.

Average page-view rate:

500,000 ÷ 86,400 ≈ 5.8 page views/second.

Assuming each page view generates three API requests on average:

500,000 × 3 = 1.5 million API requests/day.

1,500,000 ÷ 86,400 ≈ 17.4 API requests/second on average.

Assuming a peak-to-average ratio of 5:1 gives approximately 87 API requests/second during ordinary peak periods.

Ticket sales:

5,000 ÷ 86,400 ≈ 0.058 tickets/second averaged across the day. Sales will actually be concentrated around event announcements and sale openings.

Popular concert sale

Given:

200,000 people attempt to buy tickets in the first 10 minutes.
20,000 seats are available.

Average arrival rate:

200,000 ÷ 600 seconds ≈ 333 purchase attempts/second.

Assuming a short-term peak three times higher than the ten-minute average gives approximately 1,000 purchase attempts/second.

These are planning assumptions, not measured traffic. Actual load tests must account for browsing, seat selection, checkout, payment callbacks, retries, and concurrent requests.

Demand versus supply:

200,000 interested buyers ÷ 20,000 seats = 10 potential buyers per seat on average.

Only 10% of those people could receive a seat if every seat were sold to a different buyer. A waiting room and clear availability feedback are therefore important.

Storage estimate

Assume each of the 5,000 normal daily ticket sales creates one ticket record averaging 1 KB of logical data.

5,000 × 1 KB = approximately 5 MB of new ticket data per day, or about 1.8 GB per year before indexes, orders, logs, and backups.

This is a rough estimate. Event records, seat inventory, payment records, indexes, and audit logs must also be included in production capacity planning.

4. Proposed Design
4.1 API design

The API uses REST-style resources and standard HTTP methods. All endpoints require authentication where appropriate, and users may access only their own orders and tickets.

Method	Endpoint	Purpose	Success response
GET	/api/events	List and search events	200 OK
GET	/api/events/:eventId	Retrieve event details	200 OK
GET	/api/events/:eventId/seats	Retrieve seat availability	200 OK
POST	/api/holds	Temporarily reserve selected seats	201 Created
POST	/api/orders	Create an order from a valid hold	201 Created
POST	/api/orders/:orderId/checkout	Initiate payment	200 OK or 202 Accepted
GET	/api/orders/:orderId	Retrieve an order	200 OK
GET	/api/me/tickets	List the authenticated user's tickets	200 OK

The exact checkout response depends on whether payment is completed immediately or asynchronously.

Example seat-hold request:

POST /api/holds
{
  "eventId": "evt_123",
  "seatIds": ["seat_A10", "seat_A11"],
  "idempotencyKey": "unique-client-request-123"
}


A successful response might be:

201 Created
{
  "holdId": "hold_456",
  "expiresAt": "2026-10-29T11:10:00Z",
  "status": "held"
}


The expiry time is illustrative. The implementation should return the actual hold expiration.

Important error responses include:

400 Bad Request — invalid input.
401 Unauthorized — authentication is missing or invalid.
403 Forbidden — the user is not allowed to access the resource.
404 Not Found — the event, seat, or order does not exist.
409 Conflict — the seat is unavailable or the hold has expired.
429 Too Many Requests — a rate limit has been exceeded.
500 Internal Server Error — an unexpected server error.

Idempotency keys allow clients to safely retry certain operations without accidentally creating duplicate orders. The server must persist the key and its outcome, scoped to the authenticated user and operation.

4.2 Data model

The design uses a relational database such as PostgreSQL because seat allocation requires strong consistency, uniqueness constraints, and transactions.

Users
Field	Type	Constraint
id	UUID	Primary key
email	VARCHAR	Unique, not null
password_hash	VARCHAR	Not null
created_at	TIMESTAMP	Not null

Passwords are stored as secure password hashes, never as plaintext.

Venues
Field	Type	Constraint
id	UUID	Primary key
name	VARCHAR	Not null
address	TEXT	Not null

A venue can host multiple events and contains multiple physical seats.

Seats
Field	Type	Constraint
id	UUID	Primary key
venue_id	UUID	Foreign key to venues.id
section	VARCHAR	Not null
row_label	VARCHAR	Not null
seat_number	VARCHAR	Not null

A unique constraint on (venue_id, section, row_label, seat_number) prevents duplicate physical seat definitions.

Events
Field	Type	Constraint
id	UUID	Primary key
venue_id	UUID	Foreign key to venues.id
name	VARCHAR	Not null
starts_at	TIMESTAMP	Not null
sale_starts_at	TIMESTAMP	Not null

Each event belongs to one venue. A venue can host many events.

Event seats

This table represents the inventory of seats for a particular event. A physical seat may be used for different events, so availability must be tracked per event.

Field	Type	Constraint
id	UUID	Primary key
event_id	UUID	Foreign key to events.id
seat_id	UUID	Foreign key to seats.id
price	NUMERIC(10,2)	Not null, non-negative
status	VARCHAR	Not null
hold_expires_at	TIMESTAMP	Nullable

A unique constraint on (event_id, seat_id) ensures that a physical seat has only one inventory record per event.

The status is one of available, held, or sold. State transitions are controlled by server-side transaction logic.

Orders
Field	Type	Constraint
id	UUID	Primary key
user_id	UUID	Foreign key to users.id
status	VARCHAR	Not null
total_amount	NUMERIC(10,2)	Not null, non-negative
created_at	TIMESTAMP	Not null

An order belongs to one user. An order may contain one or more tickets.

Tickets
Field	Type	Constraint
id	UUID	Primary key
order_id	UUID	Foreign key to orders.id
event_seat_id	UUID	Unique foreign key to event_seats.id
issued_at	TIMESTAMP	Not null

The unique constraint on event_seat_id is an additional database-level safeguard: a particular event seat cannot appear in two issued ticket records.

Payment transactions should also be tracked using a separate payment table in a production implementation, including the provider reference, amount, status, and idempotency information.

Relationships
One venue has many physical seats.
One venue hosts many events.
One event has many event-seat inventory records.
One physical seat can appear in multiple events' inventories.
One user can have many orders.
One order can contain many tickets.
Each ticket references one unique event-seat inventory record.
4.3 Preventing two people from buying the same seat

This is the central correctness problem.

The database, not the cache or front end, is the final authority on seat ownership.

The reservation process works as follows:

The client requests a temporary hold on one or more seats.
The application starts a database transaction and locks the requested event-seat rows using row-level locking, such as SELECT ... FOR UPDATE. Multiple seats are locked in a consistent order to reduce deadlocks.
For each seat, the application checks whether it is available or has an expired hold. If it is already sold or has a valid hold belonging to another customer, the request fails with 409 Conflict.
If all requested seats are eligible, the application changes them to held, records the hold expiration, and creates the corresponding order or hold records within the same transaction.
The transaction commits. A competing request must wait for the lock and then sees the committed state, so it cannot successfully hold the same seat.
After payment is confirmed, a transaction verifies that the hold is still valid, marks the inventory as sold, and creates ticket records. Database uniqueness constraints provide a final defense against duplicate ticket issuance.

Expired holds are released through a scheduled worker or when a subsequent request encounters an expired hold. The release operation must itself use safe transactional state changes.

Payment requires special care. External payment calls should not be made while holding database row locks for a long period. Instead, create a pending order with an expiring hold, commit it, and call the payment provider separately. A payment callback or reconciliation worker then finalizes the order idempotently. If payment fails or the hold expires, the system releases inventory according to a defined payment and reservation policy. Late payment success must be handled explicitly, for example through a refund or controlled recovery workflow.

The system must never issue tickets merely because the browser reports that payment succeeded.

4.4 Architecture diagram
mermaid
flowchart TD
    U[Customers' browsers] --> W[Waiting room and rate limiter]
    W --> LB[Load balancer]
    LB --> API[Stateless application servers]
    API --> CACHE[Redis cache]
    API --> DB[(PostgreSQL primary)]
    DB --> REPLICA[(Read replicas)]
    API --> Q[Queue]
    Q --> WORKER[Background workers]
    WORKER --> PAY[Payment provider]
    WORKER --> DB
    PAY --> WEBHOOK[Payment callbacks]
    WEBHOOK --> API
    CDN[CDN for static assets] --> U

Component explanations
Customers' browsers: Display events, seat maps, checkout, and tickets.
CDN: Delivers static images, stylesheets, JavaScript, and other cacheable assets close to users, reducing load on the application servers.
Waiting room and rate limiter: Controls admission during extremely popular sales, reducing overload and giving customers clearer expectations. Admission control does not guarantee a ticket.
Load balancer: Distributes requests across healthy application servers.
Stateless application servers: Handle API requests without relying on local memory for persistent user or booking state. This allows instances to be added or replaced safely.
Redis cache: Speeds up suitable read-heavy operations such as event listings. Cached availability is advisory; all booking decisions must be verified against the primary database.
PostgreSQL primary: Stores authoritative seat inventory, holds, orders, and tickets. Transactions and constraints protect correctness.
Read replicas: Serve suitable read queries to reduce load on the primary. Replication lag means they must not be used as the authority for confirming seat availability.
Queue: Buffers asynchronous tasks, such as notifications and some payment workflows, preventing non-critical work from slowing down the main request path.
Background workers: Process queued tasks, reconcile payment outcomes, release expired holds, and send confirmations.
Payment provider and callbacks: Process payments externally and notify TicketHub about payment outcomes. Callbacks must be authenticated, deduplicated, and processed idempotently.

The queue and worker architecture does not replace database transactions. Seat inventory is protected by the primary database even when background jobs are delayed or retried.

4.5 Scaling and operational behavior

During ordinary traffic, a small application deployment and PostgreSQL may be sufficient.

During a popular sale:

The waiting room limits how many users enter checkout simultaneously.
Multiple application instances handle admitted requests.
The cache serves suitable event and page reads.
The database uses indexed queries, short transactions, row-level locks, and uniqueness constraints for seat allocation.
Background workers process non-critical work asynchronously.
Rate limits and load shedding protect the system if demand exceeds safe capacity.

The main bottleneck during a sale is likely to be contention for popular event-seat records and database transaction capacity, rather than the average daily request rate alone.

Before launch, load tests should simulate concentrated traffic, concurrent attempts for the same seat, payment timeouts, retries, and database failures. The system should measure lock wait times, transaction latency, failed reservations, queue depth, payment reconciliation, and p95/p99 API latency.

5. Trade-offs and Alternatives

Trade-off 1: Strongly consistent seat allocation versus maximum throughput

A single authoritative relational database with transactions and row-level locks simplifies the guarantee that a seat cannot be sold twice.

The downside is that popular seats can become contention hotspots. Transactions may wait, increasing latency during major sales.

Decision: Prefer correctness over accepting conflicting bookings. Scale with efficient transactions, indexes, admission control, and load testing before considering more complex partitioning.

Trade-off 2: Cached availability versus always querying the primary

Caching event information and seat availability reduces read latency and database load.

However, cached seat availability can become stale when another customer reserves a seat.

Decision: Cache browse data and use cached availability only as a display hint. Always recheck and atomically reserve inventory in PostgreSQL before confirming a hold or purchase.

Trade-off 3: Synchronous versus asynchronous payment workflows

Waiting for every external payment call to finish within one long database transaction would simplify some control flow but create long-held locks, connection pressure, and greater failure risk.

Asynchronous payment confirmation allows shorter transactions and better resilience but requires durable order states, retries, reconciliation, and idempotent callbacks.

Decision: Use short database transactions and an explicit pending-payment state, with durable processing and reconciliation for external payment outcomes.

Trade-off 4: Immediate admission versus a virtual waiting room

Allowing every customer to enter the sale immediately is simpler and avoids queue infrastructure.

However, 200,000 customers competing within ten minutes could overwhelm checkout and create a poor experience.

Decision: Use a waiting room with controlled admission during exceptional demand. Explain that queue position governs access to the sale, not a guarantee of obtaining a ticket.

6. Risks and Open Questions

Payment ambiguity: A payment provider may time out after charging a customer. Reconciliation and idempotency are required to avoid duplicate charges or incorrect order status.
Hot-seat contention: Many customers may request the same popular seat. Load tests must verify acceptable latency and correct conflict handling.
Database outage: The system needs tested backups, recovery procedures, monitoring, and an appropriate failover strategy.
Fraud and bots: Authentication, rate limits, bot mitigation, purchase limits, and audit logs may be necessary.
Privacy and security: Customer and payment-related data must be protected. Sensitive card details should be handled by a compliant payment provider rather than stored directly by TicketHub.
Fairness: The waiting-room policy must define queue ordering, reconnection behavior, and how automated abuse is handled.
Business rules: Refund eligibility, hold duration, per-user ticket limits, and late payment outcomes must be defined.
Capacity targets: The assumed three-times burst multiplier and latency targets must be validated through load testing.


**Conclusion**

TicketHub needs to support ordinary browsing efficiently while preserving strict correctness during sudden ticket-sale spikes. The design separates read optimization from booking correctness: caches and replicas improve read capacity, while the primary relational database enforces exclusive seat allocation through transactions, locks, and uniqueness constraints.

The system starts with a relatively simple architecture and adds admission control, asynchronous workers, and additional capacity where they solve identifiable problems. Its success should be measured not only by speed and availability, but also by whether every confirmed ticket corresponds to a valid, uniquely allocated seat and payment outcome.