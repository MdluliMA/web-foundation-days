// Select the HTML elements that JavaScript will control
const textarea = document.querySelector("#note-text");
const charCount = document.querySelector("#char-count");
const wordCount = document.querySelector("#word-count");
const clearBtn = document.querySelector("#clear-btn");
const themeToggle = document.querySelector("#theme-toggle");


// Names used to store the draft and theme in localStorage
const DRAFT_KEY = "quicknotes-draft";
const THEME_KEY = "quicknotes-theme";


// Updates the character count, word count and warning styles
function updateCounts() {

  // Get the current text from the textarea
  const text = textarea.value;

  // Count all characters
  const characterCount = text.length;

  // Count words
  // An empty textarea should show 0 words
  const words = text.trim() === ""
    ? 0
    : text.trim().split(/\s+/).length;


  // Update the character counter in the HTML
  charCount.textContent = `${characterCount} / 200 characters`;

  // Update the word counter in the HTML
  wordCount.textContent = `${words} words`;


  // Remove previous warning styles
  charCount.classList.remove("warning", "over");


  // More than 200 characters = red and bold
  if (characterCount > 200) {

    charCount.classList.add("over");

  // More than 180 characters = orange warning
  } else if (characterCount > 180) {

    charCount.classList.add("warning");
  }
}


// Saves the current note as a draft
function saveDraft() {

  localStorage.setItem(DRAFT_KEY, textarea.value);
}


// Clears the textarea, counters and saved draft
function clearEverything() {

  // Empty the textarea
  textarea.value = "";

  // Reset the counters
  updateCounts();

  // Remove the saved draft
  localStorage.removeItem(DRAFT_KEY);

  // Put the cursor back into the textarea
  textarea.focus();
}


// Run whenever the user types or changes the note
textarea.addEventListener("input", () => {

  // Update the counters
  updateCounts();

  // Save the current text
  saveDraft();
});


// Clear the note when the Clear button is clicked
clearBtn.addEventListener("click", () => {

  clearEverything();
});


// Pressing Escape inside the textarea clears everything
textarea.addEventListener("keydown", (event) => {

  if (event.key === "Escape") {

    clearEverything();
  }
});


// Switch between light and dark mode
themeToggle.addEventListener("click", () => {

  // Add dark class if it is missing,
  // or remove it if it is already there
  document.body.classList.toggle("dark");


  // Check whether dark mode is active
  const isDark = document.body.classList.contains("dark");


  // Change the button label
  if (isDark) {

    themeToggle.textContent = "Light mode";

  } else {

    themeToggle.textContent = "Dark mode";
  }


  // Remember the selected theme
  localStorage.setItem(
    THEME_KEY,
    isDark ? "dark" : "light"
  );
});


// Restore the saved draft when the page loads
const savedDraft = localStorage.getItem(DRAFT_KEY);

if (savedDraft !== null) {

  // Put the saved draft back into the textarea
  textarea.value = savedDraft;
}


// Restore the saved theme when the page loads
const savedTheme = localStorage.getItem(THEME_KEY);

if (savedTheme === "dark") {

  // Add the dark class to the body
  document.body.classList.add("dark");

  // Change the button label
  themeToggle.textContent = "Light mode";

} else {

  // Use the light mode label
  themeToggle.textContent = "Dark mode";
}


// Update counters after restoring the saved draft
updateCounts();