CREATE TABLE students (
    student_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
);

CREATE TABLE courses (
    course_id INTEGER PRIMARY KEY,
    course_name TEXT NOT NULL,
    description TEXT
);

CREATE TABLE enrolments (
    enrolment_id INTEGER PRIMARY KEY,
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    grade TEXT,
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (course_id) REFERENCES courses(course_id),
    UNIQUE (student_id, course_id)
);

INSERT INTO students (student_id, name, email)
VALUES
    (1, 'Georgina Boss', 'georgina@example.com'),
    (2, 'Mdluli MA', 'mdluli@example.com'),
    (3, 'Otter Tech', 'otter@example.com');

INSERT INTO courses (course_id, course_name, description)
VALUES
    (1, 'Web Development', 'HTML, CSS and JavaScript'),
    (2, 'Database Systems', 'Database design and SQL'),
    (3, 'Computer Networks', 'Networking fundamentals');

INSERT INTO enrolments (enrolment_id, student_id, course_id, grade)
VALUES
    (1, 1, 1, 'A'),
    (2, 1, 2, 'B'),
    (3, 2, 1, 'B'),
    (4, 2, 3, 'A'),
    (5, 3, 2, 'C');

-- Query 1: Find all courses for Georgina Boss.

SELECT
    students.name AS student_name,
    courses.course_name
FROM students
JOIN enrolments
    ON students.student_id = enrolments.student_id
JOIN courses
    ON enrolments.course_id = courses.course_id
WHERE students.name = 'Georgina Boss';

-- Query 2: Find all students enrolled in Web Development.

SELECT
    courses.course_name,
    students.name AS student_name
FROM courses
JOIN enrolments
    ON courses.course_id = enrolments.course_id
JOIN students
    ON enrolments.student_id = students.student_id
WHERE courses.course_name = 'Web Development';

-- Query 3: Count the students enrolled in each course.

SELECT
    courses.course_name,
    COUNT(enrolments.student_id) AS student_count
FROM courses
LEFT JOIN enrolments
    ON courses.course_id = enrolments.course_id
GROUP BY courses.course_id, courses.course_name
ORDER BY courses.course_name;

-- Query 4: Find students who have no enrolments.

SELECT
    students.student_id,
    students.name,
    students.email
FROM students
LEFT JOIN enrolments
    ON students.student_id = enrolments.student_id
WHERE enrolments.enrolment_id IS NULL;

-- Query 5: Update Georgina Boss's Database Systems grade.

UPDATE enrolments
SET grade = 'A'
WHERE student_id = 1
  AND course_id = 2;

-- Verify the updated grade.

SELECT
    students.name AS student_name,
    courses.course_name,
    enrolments.grade
FROM enrolments
JOIN students
    ON enrolments.student_id = students.student_id
JOIN courses
    ON enrolments.course_id = courses.course_id
WHERE enrolments.student_id = 1
  AND enrolments.course_id = 2;

-- Create an index for course-based searches.

CREATE INDEX idx_enrolments_course_id
ON enrolments(course_id);