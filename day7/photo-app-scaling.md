# SnapShare - Scaling Plan

## Assumptions

- Registered users: 10,000,000.
- Daily active users (DAU): 10% of registered users.
- Each active user uploads 1 photo per day.
- Each active user views 50 feed pages per day.
- Each original photo is 2 MB.
- Each photo also has one thumbnail of 50 KB.
- One day has 86,400 seconds.
- Peak traffic is estimated at 5 times the average traffic.
- One year has 365 days.
- Storage calculations use decimal units: 1 GB = 1,000 MB and 1 TB = 1,000 GB.
- All uploaded photos and thumbnails are retained for the year.
- Storage estimates exclude backups, replicas, temporary files, and other application data.

## Estimates

### 1. Daily Active Users

Daily active users = Registered users × Daily active percentage

10,000,000 × 10% = 1,000,000

Therefore, SnapShare has **1,000,000 daily active users**.

### 2. Uploads Per Second

Each active user uploads one photo per day.

Daily uploads:

1,000,000 × 1 = 1,000,000 photos per day

Average uploads per second:

1,000,000 ÷ 86,400 ≈ 11.57 uploads per second

Peak uploads per second:

11.57 × 5 ≈ 57.87 uploads per second

Therefore:
- Average: approximately **12 uploads per second**.
- Peak: approximately **58 uploads per second**.

### 3. Feed Views Per Second

Each active user views 50 feed pages per day.

Daily feed views:

1,000,000 × 50 = 50,000,000 feed views per day

Average feed views per second:

50,000,000 ÷ 86,400 ≈ 578.70 feed views per second

Peak feed views per second:

578.70 × 5 ≈ 2,893.52 feed views per second

Therefore:
- Average: approximately **579 feed views per second**.
- Peak: approximately **2,894 feed views per second**.

These figures count feed-page requests, not individual photo downloads. Each feed page may contain several photos, creating additional image requests.

### 4. Photo Storage Per Year

Each photo requires:
- Original photo: 2 MB.
- Thumbnail: 50 KB = 0.05 MB.

Total storage per photo:

2 MB + 0.05 MB = 2.05 MB

Daily storage:

1,000,000 × 2.05 MB = 2,050,000 MB

2,050,000 ÷ 1,000 = 2,050 GB = 2.05 TB per day

Annual storage:

2.05 TB × 365 = 748.25 TB per year

Therefore, SnapShare requires approximately **748.25 TB of additional photo and thumbnail storage per year**, excluding backups and other overhead.

## Read-Heavy or Write-Heavy?

SnapShare is a **read-heavy system** because users view feeds much more frequently than they upload photos.

There are 50,000,000 feed views and 1,000,000 photo uploads per day.

50,000,000 ÷ 1,000,000 = 50 feed views per upload.

This means the system handles approximately **50 feed views for every photo upload**.

The architecture must therefore prioritize fast feed delivery while ensuring that uploads are reliable. A CDN, cache, load balancer, and database read replicas help handle the large volume of read requests.

## Where Do the Photos Go?

Photos should not be stored directly inside the database.

With hundreds of terabytes of new photo data each year, storing large binary files in the database would increase database size, backup times, storage costs, and operational complexity.

Instead, original photos and thumbnails should be stored in **object storage**, such as Amazon S3 or another compatible object storage service.

Object storage is designed to store large files reliably and scale independently from the database.

The database stores structured metadata, including:
- Photo ID.
- Owner or user ID.
- Caption.
- Upload timestamp.
- Original photo storage key.
- Thumbnail storage key.
- Visibility and access permissions.

The CDN delivers photos and thumbnails to users from locations close to them, reducing latency and the load on the application servers and object storage.

## Architecture

```text
                    +----------------------+
                    |    Mobile / Browser  |
                    +----------+-----------+
                               |
                    +----------v-----------+
                    |          CDN         |
                    |  Photos / Thumbnails |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    |    Load Balancer     |
                    +----------+-----------+
                               |
                  +------------+------------+
                  |            |            |
                  v            v            v
             +---------+  +---------+  +---------+
             | App     |  | App     |  | App     |
             | Server 1|  | Server 2|  | Server 3|
             +----+----+  +----+----+  +----+----+
                  |            |            |
                  +------------+------------+
                               |
                  +------------+------------+
                  |                         |
                  v                         v
          +---------------+         +---------------+
          | Cache (Redis) |         | Primary DB    |
          | Feed data     |         | Metadata      |
          +---------------+         +-------+-------+
                                            |
                                            | Replication
                                            v
                                    +---------------+
                                    | Read Replica  |
                                    | Feed queries  |
                                    +---------------+


                    PHOTO UPLOAD AND PROCESSING

                       +----------------+
                       |  App Server    |
                       +-------+--------+
                               |
                  +------------+------------+
                  |                         |
                  v                         v
          +---------------+         +---------------+
          | Object Storage|         |     Queue     |
          | Original Photo|         | Thumbnail Job |
          +-------+-------+         +-------+-------+
                  ^                         |
                  |                         v
                  |                 +---------------+
                  +-----------------| Thumbnail     |
                                    | Worker        |
                                    +-------+-------+
                                            |
                                            v
                                    +---------------+
                                    | Object Storage|
                                    | Thumbnail     |
                                    +---------------+
```

The CDN retrieves photo files from object storage through a controlled origin-access path. Application servers enforce authorization and provide appropriate photo references so private photos cannot be accessed by unauthorized users.

## Components

### 1. CDN (Content Delivery Network)

The CDN caches and delivers photos and thumbnails from locations near users, reducing latency, bandwidth costs, and load on the origin.

### 2. Load Balancer

The load balancer distributes incoming API requests across healthy application servers so that no single server becomes overloaded.

### 3. Application Servers

Application servers authenticate users, validate requests, enforce permissions, handle feed requests, and coordinate uploads, database operations, and background jobs.

### 4. Cache (Redis)

The cache stores frequently requested feed data and metadata in memory, reducing repeated database queries and improving scrolling performance.

### 5. Primary Database

The primary database stores structured data such as user accounts, follow relationships, photo metadata, captions, and permissions while handling application writes.

### 6. Database Read Replica

The read replica handles suitable read queries, reducing the workload on the primary database and allowing read capacity to scale independently.

### 7. Object Storage

Object storage holds original photos and generated thumbnails, allowing large files to scale independently from the relational database.

### 8. Queue

The queue holds thumbnail-generation jobs so that photo uploads do not have to wait for image processing to finish.

### 9. Thumbnail Worker

The thumbnail worker retrieves jobs from the queue, reads original photos, generates thumbnails, saves them to object storage, and updates processing status in the database.

## Upload Flow

1. The user selects a photo and submits it through the SnapShare application.

2. The load balancer routes the API request to a healthy application server.

3. The application server authenticates the user and validates the file type, size, and upload permissions.

4. The application generates a unique photo ID and an object storage key.

5. The original photo is uploaded to object storage. A secure, time-limited upload URL can be used to let the client upload directly to storage.

6. Once the original upload succeeds, the application records the photo metadata in the primary database, including the user ID, storage key, upload time, and processing status.

7. The application adds a thumbnail-generation job to the queue.

8. The application returns an upload confirmation to the user. The photo may initially be marked as processing while its thumbnail is generated.

9. A background worker retrieves the thumbnail job from the queue.

10. The worker reads the original photo from object storage and generates a thumbnail targeting approximately 50 KB.

11. The worker saves the thumbnail in object storage under its own unique key.

12. The worker updates the photo's database record to indicate that thumbnail processing is complete and records the thumbnail storage key.

13. The application updates or invalidates relevant cached feeds so that followers can see the new photo.

14. When users scroll their feeds, application servers retrieve feed data from the cache or an appropriate database read replica.

15. The CDN serves requested photos and thumbnails from its cache or retrieves them from object storage when necessary.

16. If thumbnail processing fails, the queue can retry the job, and repeated failures can be sent to a dead-letter queue for investigation.

Upload retries and thumbnail jobs should be idempotent so that repeated requests do not create duplicate records or inconsistent files.

## Trade-Offs

### 1. Speed vs. Freshness

**Advantage:** Caching feed data and using a CDN makes feeds and images load faster while reducing database load.

**Disadvantage:** A newly uploaded photo may take a few seconds to appear in followers' feeds because cached data may not update immediately.

**Decision:** Use cache invalidation or short cache lifetimes where freshness matters, while keeping frequently accessed content cached.

### 2. Fast Uploads vs. Immediate Thumbnail Availability

**Advantage:** Generating thumbnails in the background allows the application to accept uploads without making users wait for image processing.

**Disadvantage:** A photo may temporarily appear without its thumbnail while the worker processes the job.

**Decision:** Show a placeholder until thumbnail processing finishes, and retry failed jobs safely.

### 3. Read Replicas vs. Immediate Consistency

**Advantage:** Read replicas distribute read traffic and reduce the workload on the primary database.

**Disadvantage:** Replication lag can cause a recently uploaded photo or updated caption to be temporarily missing from a read query.

**Decision:** Use read replicas for suitable browsing and feed queries, but use the primary database when immediate consistency is required.

### 4. Object Storage vs. Operational Complexity

**Advantage:** Object storage is designed for large files and can scale independently of the database.

**Disadvantage:** The application must manage file keys, permissions, failed uploads, orphaned files, and consistency between storage and database records.

**Decision:** Use unique storage keys, reliable upload-state tracking, cleanup jobs, and monitoring.

### 5. Scalability vs. Cost

**Advantage:** A CDN and object storage can handle large amounts of photo traffic without requiring the application to serve every image directly.

**Disadvantage:** Storage, data transfer, CDN requests, and background processing all incur costs.

**Decision:** Monitor storage and bandwidth usage, apply suitable lifecycle policies, and optimize image sizes without compromising image quality unnecessarily.

## Conclusion

SnapShare has approximately 1 million daily active users, 12 average photo uploads per second, and 579 average feed views per second. At peak, the system should plan for approximately 58 uploads per second and 2,894 feed views per second.

The application generates approximately 748.25 TB of original photo and thumbnail data each year under the stated assumptions.

Because SnapShare is read-heavy, its design prioritizes efficient feed delivery through a CDN, caching, load balancing, and database read replicas.

Object storage handles large photo files, while the database stores structured metadata. A queue and background worker generate thumbnails asynchronously, allowing uploads to complete without waiting for image processing.

Together, these components provide a scalable foundation for SnapShare as its users, traffic, and photo collection grow.