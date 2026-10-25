# SnapShare: Photo App Scaling Plan

## 1. Assumptions

SnapShare is a photo-sharing application where users upload photos
and scroll through a feed containing photos from people they follow.

The following assumptions are used for the calculations:

- Registered users: 10,000,000.
- Daily active users: 10% of registered users.
- Each active user uploads 1 photo per day.
- Each active user views 50 feed pages per day.
- Average original photo size: 2 MB.
- Average thumbnail size: 50 KB.
- One year has 365 days.
- A day has 86,400 seconds.
- Average traffic is spread evenly across 24 hours.
- Peak traffic is estimated at 5 times the average traffic.
- Each photo produces one thumbnail.
- Storage calculations exclude database records, backups, replicas,
  temporary files, and other application data.
- Storage estimates use decimal units: 1 GB = 1,000 MB and
  1 TB = 1,000 GB.

These assumptions provide a starting point for planning the system.
Actual production traffic may vary depending on user behaviour and
time of day.

## 2. Daily Active Users

There are 10 million registered users, and 10% are active each day.

Calculation:

Daily active users = Registered users × Daily active percentage

Daily active users = 10,000,000 × 10%

Daily active users = 1,000,000

Therefore, SnapShare has approximately **1 million daily active users**.

## 3. Uploads Per Second

Each daily active user uploads one photo per day.

Daily uploads:

1,000,000 users × 1 photo = 1,000,000 photos per day

Average uploads per second:

1,000,000 ÷ 86,400 = 11.57

Therefore, SnapShare receives approximately **11.57 photo uploads
per second on average**.

Peak uploads per second:

11.57 × 5 = 57.87

Therefore, the estimated peak upload rate is approximately
**58 uploads per second**.

The application should be designed to handle bursts of traffic
without losing uploaded photos.

## 4. Feed Views Per Second

Each active user views 50 feed pages per day.

Daily feed views:

1,000,000 users × 50 pages = 50,000,000 feed views per day

Average feed views per second:

50,000,000 ÷ 86,400 = 578.70

Therefore, SnapShare handles approximately **579 feed views per second
on average**.

Peak feed views per second:

578.70 × 5 = 2,893.52

Therefore, the estimated peak feed traffic is approximately
**2,894 feed views per second**.

These figures count feed-page requests, not individual photo downloads.
A single feed page may display several photos, creating additional
requests for photo files or thumbnails.

## 5. Photo Storage Per Year

Each original photo occupies 2 MB, and each thumbnail occupies 50 KB.

For this estimate:

50 KB = 0.05 MB

Total storage per photo:

2 MB + 0.05 MB = 2.05 MB

### Daily Original Photo Storage

1,000,000 photos × 2 MB = 2,000,000 MB

2,000,000 MB ÷ 1,000 = 2,000 GB

Therefore, original photos require approximately **2 TB per day**.

### Daily Thumbnail Storage

1,000,000 thumbnails × 0.05 MB = 50,000 MB

50,000 MB ÷ 1,000 = 50 GB

Therefore, thumbnails require approximately **50 GB per day**.

### Total Daily Storage

2,000 GB + 50 GB = 2,050 GB

Therefore, the application generates approximately **2.05 TB of
photo and thumbnail data per day**.

### Total Storage Per Year

2,050 GB × 365 = 748,250 GB

748,250 GB ÷ 1,000 = 748.25 TB

Therefore, SnapShare needs approximately **748.25 TB of additional
photo and thumbnail storage per year**.

This estimate assumes every uploaded photo and thumbnail is retained.
It excludes backups, replication, storage overhead, and other data.

## 6. Is SnapShare Read-Heavy or Write-Heavy?

SnapShare is a **read-heavy system**.

The application receives:

- 1,000,000 photo uploads per day.
- 50,000,000 feed views per day.

There are 50 feed views for every photo upload.

This means feed requests greatly outnumber photo uploads.
The system must therefore be designed to serve large numbers of reads
quickly while still accepting uploads reliably.

The design should use:

- A Content Delivery Network (CDN) to serve photos and thumbnails
  close to users.
- A cache to reduce repeated database queries.
- A database read replica to handle read traffic separately from
  database writes.
- Load balancing to distribute requests across application servers.
- Object storage to store original photos and thumbnails.
- A queue and background workers to process thumbnails asynchronously.

These components help the system scale without requiring every
request to reach the main database or application servers.

## 7. Why Photos Should Not Be Stored Inside the Database

Photos are large binary files, and storing them directly inside a
relational database would increase database size, backup times,
storage costs, and the amount of data the database must manage.

Instead, SnapShare should store original photos and thumbnails in
**object storage**, such as an S3-compatible storage service.

The database should store metadata, including:

- Photo ID.
- User ID.
- Caption.
- Upload timestamp.
- Object storage key or path.
- Thumbnail storage key or path.
- Visibility and access information.

This separation allows the database to manage searchable information
while object storage handles large files efficiently.

The CDN can then deliver photo files and thumbnails to users without
requiring every download to pass through an application server.

## 8. Architecture Diagram

The following diagram shows the main components of SnapShare.

                         +----------------------+
                         |         Users        |
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         |         CDN          |
                         | Photos and thumbnails|
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         |    Load Balancer     |
                         +----------+-----------+
                                    |
                    +---------------+---------------+
                    |               |               |
                    v               v               v
              +-----------+   +-----------+   +-----------+
              | App Server|   | App Server|   | App Server|
              |     1     |   |     2     |   |     3     |
              +-----+-----+   +-----+-----+   +-----+-----+
                    |               |               |
                    +---------------+---------------+
                                    |
                      +-------------+-------------+
                      |                           |
                      v                           v
               +-------------+             +-------------+
               |    Cache    |             |   Database  |
               |             |             |   Primary   |
               +------+------+             +------+------+
                      |                            |
                      |                            v
                      |                     +-------------+
                      |                     | Read Replica|
                      |                     +-------------+
                      |
                      +----------------------------------+

        UPLOAD PROCESSING

              App Server
                   |
                   v
             +-----------+
             |   Queue   |
             +-----+-----+
                   |
                   v
             +-----------+
             | Thumbnail |
             |  Worker   |
             +-----+-----+
                   |
                   v
             +----------------------+
             |    Object Storage    |
             | Original photos and |
             |    thumbnails       |
             +----------------------+

The CDN retrieves and caches public or otherwise authorized photo
content from object storage through a controlled origin-access path.

The application checks access permissions before issuing photo
references or authorized delivery URLs.
The CDN must not bypass private-photo permissions.

## 9. Component Responsibilities

### 1. CDN (Content Delivery Network)

The CDN caches and delivers photos and thumbnails from locations
near users, reducing latency, bandwidth costs, and load on the origin.

### 2. Load Balancer

The load balancer distributes incoming application requests across
healthy application servers to prevent one server from becoming
overloaded.

### 3. Application Servers

Application servers process API requests, authenticate users, enforce
permissions, validate uploads, manage feed requests, and communicate
with the cache, database, queue, and object storage.

### 4. Cache

The cache stores frequently requested feed data and photo metadata
temporarily, reducing repeated database queries and improving
response times.

### 5. Primary Database

The primary database stores structured information such as users,
follows, photo metadata, captions, permissions, and feed-related
records while accepting application writes.

### 6. Database Read Replica

The read replica handles suitable read queries, reducing read pressure
on the primary database and allowing read capacity to scale separately.

### 7. Object Storage

Object storage stores the original photo files and generated
thumbnails without placing large binary files inside the database.

### 8. Queue

The queue holds thumbnail-generation jobs so that photo uploads do
not need to wait for thumbnail processing to finish.

### 9. Thumbnail Worker

The thumbnail worker retrieves queued jobs, reads the original photo,
creates a smaller thumbnail, saves it to object storage, and updates
the photo's processing status when appropriate.

## 10. Photo Upload Flow

The following steps describe what happens when a user uploads a photo.

1. The user selects a photo and submits it through the SnapShare
   application.

2. The application server authenticates the user and checks upload
   permissions, file type, file size, and other validation rules.

3. The application generates a unique photo ID and an object storage
   key so that the photo can be stored and retrieved reliably.

4. The original photo is uploaded to object storage, preferably using
   a secure, time-limited upload URL when direct uploads are supported.

5. After the original upload succeeds, the application records the
   photo metadata in the primary database, including the user ID,
   object storage key, upload time, and processing status.

6. The application adds a thumbnail-generation job to the queue.
   The job contains the photo ID and the information needed to locate
   the original file.

7. The application confirms that the upload has been accepted.
   The photo may initially be marked as processing until its thumbnail
   is ready.

8. A background worker retrieves the thumbnail job from the queue.

9. The worker downloads or reads the original photo from object storage
   and generates a thumbnail with a target size of approximately 50 KB.

10. The worker saves the thumbnail in object storage under its own key.

11. The worker updates the photo metadata to indicate that thumbnail
    processing has completed.

12. When users request their feeds, application servers retrieve the
    required photo metadata from the cache or an appropriate database
    read replica.

13. The application provides authorized photo references, and the CDN
    serves the original photos or thumbnails from its cache or retrieves
    them from object storage when necessary.

14. If thumbnail generation fails, the job can be retried, and
    repeated failures can be sent to a dead-letter queue for investigation.

The queue makes thumbnail generation asynchronous, so slow image
processing does not unnecessarily delay the upload response.

The system should also make upload retries and thumbnail jobs
idempotent, preventing duplicate processing or inconsistent records.

## 11. Scaling Trade-Offs

### Trade-Off 1: CDN Caching vs. Freshness and Access Control

**Advantage:**

The CDN reduces latency and bandwidth costs by serving cached photos
and thumbnails without repeatedly contacting object storage.

**Disadvantage:**

Changes to photos or access permissions may not appear immediately
if cached content remains available.

**Decision:**

Use cache-control policies, versioned object keys, and appropriate
cache invalidation. Private photos must use authorization-aware
delivery, such as signed URLs or signed cookies, and must not become
publicly accessible through a misconfigured cache.

### Trade-Off 2: Database Read Replicas vs. Read Consistency

**Advantage:**

Read replicas distribute read traffic and reduce the workload on the
primary database.

**Disadvantage:**

Replication can lag behind the primary database, meaning a user might
not immediately see a newly uploaded photo or an updated caption.

**Decision:**

Use read replicas for suitable feed and browsing queries, but send
operations requiring immediate consistency to the primary database.
The application should account for replication lag where necessary.

### Trade-Off 3: Asynchronous Thumbnail Processing vs. Immediate Availability

**Advantage:**

A queue allows uploads to finish without waiting for thumbnail
generation, making the upload experience faster and more resilient.

**Disadvantage:**

Users may temporarily see a processing indicator or a placeholder
while the thumbnail is being generated.

**Decision:**

Return an upload confirmation once the original photo and its metadata
have been safely stored and the thumbnail job has been accepted.
Display a placeholder until thumbnail processing finishes, and retry
failed jobs safely.

### Trade-Off 4: Object Storage vs. Operational Complexity

**Advantage:**

Object storage is well suited to large files and can scale independently
from the relational database.

**Disadvantage:**

The application must manage object keys, permissions, upload failures,
orphaned files, lifecycle policies, and consistency between file storage
and database records.

**Decision:**

Use unique object keys, reliable upload-state tracking, cleanup jobs,
and monitoring to keep the database and object storage consistent.

## 12. Conclusion

SnapShare has approximately 1 million daily active users, 11.57 average
photo uploads per second, 579 average feed views per second, and a
projected peak of about 2,894 feed views per second.

The application generates approximately 748.25 TB of original photo
and thumbnail data per year under the stated assumptions.

Because SnapShare is read-heavy, its architecture prioritizes efficient
feed delivery through a CDN, caching, load balancing, and database
read replicas. Object storage handles photo files, while a queue and
background worker generate thumbnails without blocking uploads.

This architecture provides a foundation for scaling SnapShare as its
user base and photo collection grow.