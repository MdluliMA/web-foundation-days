// The API endpoint that provides the user data.
const API_URL = "https://jsonplaceholder.typicode.com/users";

// the following will select  the HTML elements that JavaScript will control.
const loadButton = document.querySelector("#load-users");
const filterInput = document.querySelector("#filter-input");
const statusText = document.querySelector("#status");
const usersList = document.querySelector("#users-list");

// Stores the users retrieved from the server.
let allUsers = [];

// Creates and displays a list of users.
function renderUsers(users) {
  // Remove the previously displayed users.
  usersList.replaceChildren();

  // Display a message if the filtered list is empty.
  if (users.length === 0) {
    if (allUsers.length === 0) {
      statusText.textContent = "No users loaded yet.";
    } else {
      statusText.textContent = "No users match your filter.";
    }

    return;
  }

  // Create a card for every user in the supplied array.
  users.forEach((user) => {
    const listItem = document.createElement("li");

    const name = document.createElement("h2");
    name.textContent = user.name;

    const email = document.createElement("p");
    email.textContent = `Email: ${user.email}`;

    const city = document.createElement("p");
    city.textContent = `City: ${user.address.city}`;

    const company = document.createElement("p");
    company.textContent = `Company: ${user.company.name}`;

    // Put the user's details inside the list item.
    listItem.appendChild(name);
    listItem.appendChild(email);
    listItem.appendChild(city);
    listItem.appendChild(company);

    usersList.appendChild(listItem);
  });

  // Report how many users are currently displayed.
  statusText.textContent =
    `Showing ${users.length} of ${allUsers.length} users.`;
}

// Fetches users from the API and handles possible errors.
async function loadUsers() {
  statusText.textContent = "Loading users...";
  loadButton.disabled = true;

  // Clear the previous results before loading new data.
  usersList.replaceChildren();

  try {
    // Send the GET request to the server.
    const response = await fetch(API_URL);

    // fetch() does not automatically throw for HTTP errors.
    if (!response.ok) {
      throw new Error(
        `Server responded with status ${response.status}`
      );
    }

    // Convert the JSON response into a JavaScript array.
    allUsers = await response.json();

    // Display the retrieved users.
    renderUsers(allUsers);

    statusText.textContent = `Loaded ${allUsers.length} users.`;
  } catch (error) {
    // Display a friendly message if the request fails.
    allUsers = [];
    usersList.replaceChildren();

    statusText.textContent =
      "Could not load users. Please try again.";

    console.error("Could not load users:", error);
  } finally {
    // Re-enable the button whether the request succeeds or fails.
    loadButton.disabled = false;
  }
}

// Start loading users when the button is clicked.
loadButton.addEventListener("click", loadUsers);

// Filter the stored users whenever the search input changes.
filterInput.addEventListener("input", () => {
  const searchTerm = filterInput.value.trim().toLowerCase();

  // Search the existing array instead of making another API request.
  const filteredUsers = allUsers.filter((user) =>
    user.name.toLowerCase().includes(searchTerm)
  );

  renderUsers(filteredUsers);
});


// Filter users whenever the search input changes.
filterInput.addEventListener("input", () => {
  // Get the search text and make it lowercase for case-insensitive matching.
  const searchTerm = filterInput.value.trim().toLowerCase();

  // Filter the stored users without making another API request.
  const filteredUsers = allUsers.filter((user) =>
    user.name.toLowerCase().includes(searchTerm)
  );

  // Display the matching users.
  renderUsers(filteredUsers);
});