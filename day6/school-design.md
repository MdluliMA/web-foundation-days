# School Database Design

## 1. Tables

### Students

The students table stores student information, including
student ID, name, and email address. The student ID is the
primary key, and the email address must be unique.

### Courses

The courses table stores information about courses offered
by the school. It contains a course ID, course name, and
description. The course ID is the primary key.

### Enrolments

The enrolments table records which students are enrolled
in which courses. It stores an enrolment ID, student ID,
course ID, and grade. The enrolment ID is the primary key,
while student ID and course ID are foreign keys.

A unique constraint on student ID and course ID prevents
a student from enrolling in the same course twice.

## 2. Relationships

### One-to-Many Relationships

**Students and Enrolments:** One student can have multiple
enrolments because a student can take several courses.
Each enrolment belongs to one student.

**Courses and Enrolments:** One course can have multiple
enrolments because many students can take the same course.
Each enrolment refers to one course.

### Many-to-Many Relationship

Students and courses have a many-to-many relationship.
A student can enrol in multiple courses, and each course
can have multiple students.

The enrolments table acts as a join table connecting
students and courses. It divides the many-to-many
relationship into two one-to-many relationships. The
join table is necessary because it records each enrolment
and stores the grade associated with that enrolment.

## 3. Index

I would add an index on the course_id column in the
enrolments table:

    CREATE INDEX idx_enrolments_course_id
    ON enrolments(course_id);

This index can improve queries that find students enrolled
in a particular course and queries that count students
per course. It can also improve joins involving the
enrolments and courses tables.

## 4. SQL or NoSQL?

I would choose SQL for this school database because the
data has clear relationships between students, courses,
and enrolments. SQL supports primary keys, foreign keys,
unique constraints, joins, and aggregate functions.
These features help maintain data accuracy and retrieve
information efficiently. SQLite is suitable for this
project because it is lightweight and easy to set up.
NoSQL can be useful for systems with flexible or rapidly
changing data structures, but SQL is more appropriate
for this system because it requires structured data
and reliable relationships.