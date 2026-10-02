let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

function searchNotes(word) {
  const searchWord = word.toLowerCase();

  return notes.filter((note) => note.text.toLowerCase().includes(searchWord));
}

function longestNote() {
  if (notes.length === 0) {
    return null;
  }

  let longest = notes[0];

  for (const note of notes) {
    if (note.text.length > longest.text.length) {
      longest = note;
    }
  }

  return longest;
}

function countByCategory() {
  const counts = {
    personal: 0,
    work: 0,
    study: 0,
  };

  for (const note of notes) {
    if (counts[note.category] !== undefined) {
      counts[note.category]++;
    }
  }

  return counts;
}

function getSummary() {
  const counts = countByCategory();
  const noteWord = notes.length === 1 ? "note" : "notes";

  return `${notes.length} ${noteWord}: ${counts.personal} personal, ${counts.work} work, ${counts.study} study.`;
}

function isDuplicate(text) {
  const normalizedText = text.trim().toLowerCase();

  return notes.some(
    (note) => note.text.trim().toLowerCase() === normalizedText
  );
}

function addNote(text, category) {
  const trimmedText = text.trim();
  const validCategories = ["personal", "work", "study"];

  if (trimmedText.length < 1 || trimmedText.length > 200) {
    console.log("Note not added: text must be 1–200 characters.");
    return false;
  }

  if (isDuplicate(trimmedText)) {
    console.log("Note not added: duplicate text.");
    return false;
  }

  if (!validCategories.includes(category)) {
    console.log("Note not added: invalid category.");
    return false;
  }

  const newNote = {
    id: notes.length > 0 ? Math.max(...notes.map((note) => note.id)) + 1 : 1,
    text: trimmedText,
    category: category,
  };

  notes.push(newNote);
  console.log("Note added successfully.");
  return true;
}

// searchNotes tests
console.log(searchNotes("DAY 3"));
// Expected: [{ id: 2, text: "Finish the Day 3 assignment", category: "study" }]

console.log(searchNotes("Python"));
// Expected: []

// longestNote tests
console.log(longestNote());
// Expected: { id: 3, text: "Email the project report to Grace", category: "work" }

const savedNotesForLongest = notes;
notes = [];
console.log(longestNote());
// Expected: null
notes = savedNotesForLongest;

// countByCategory tests
console.log(countByCategory());
// Expected: { personal: 2, work: 1, study: 2 }

const savedNotesForCount = notes;
notes = [{ id: 6, text: "Only one note", category: "work" }];
console.log(countByCategory());
// Expected: { personal: 0, work: 1, study: 0 }
notes = savedNotesForCount;

// getSummary tests
console.log(getSummary());
// Expected: "5 notes: 2 personal, 1 work, 2 study."

const savedNotesForSummary = notes;
notes = [{ id: 6, text: "Only one note", category: "work" }];
console.log(getSummary());
// Expected: "1 note: 0 personal, 1 work, 0 study."
notes = savedNotesForSummary;

// isDuplicate tests
console.log(isDuplicate("buy milk and bread"));
// Expected: true

console.log(isDuplicate("Buy eggs"));
// Expected: false

// addNote tests
console.log(addNote("Plan weekend trip", "personal"));
// Expected: true

console.log(addNote("  plan weekend trip  ", "personal"));
// Expected: false
// Reason logged: Note not added: duplicate text.

console.log(addNote("Learn Python", "invalid"));
// Expected: false
// Reason logged: Note not added: invalid category.