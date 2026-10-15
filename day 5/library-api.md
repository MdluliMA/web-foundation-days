 Library API Design

 Overview
The Library API allows users to manage a collection of books. It supports listing, retrieving, creating, updating, and deleting books, as well as searching for books by author.

 Base URL
`https://api.example.com`

 Book Resource
 
Each book contains the following fields:
- `id`: A unique identifier for the book.
- `title`: The title of the book.
- `author`: The name of the author.
- `publishedYear`: The year the book was published.
- `genre`: The book's genre.

Endpoints

1. List All Books
- Method:GET
- Path:`/books`
- Description: Retrieves a list of all books in the library.
- Example Request Body: None required.
- Success Status Code: `200 OK`

2. Get One Book
- Method:GET
- Path:`/books/{id}`
- Description: Retrieves a single book using its unique ID.
- Example Request Body: None required.
- Success Status Code: `200 OK`

 3. Create a Book
- Method:POST
- Path: `/books`
- Description: Add  a new book to the library.
- Example Request Body:
  ```json
  [
  {
    "title": "Things Fall Apart",
    "author": "Chinua Achebe",
    "publishedYear": 1958,
    "genre": "Fiction"
  },
  {
    "title": "No Longer at Ease",
    "author": "Chinua Achebe",
    "publishedYear": 1960,
    "genre": "Fiction"
  },
  {
    "title": "Arrow of God",
    "author": "Chinua Achebe",
    "publishedYear": 1964,
    "genre": "Fiction"
  }
  ]

4.  Update a Book
Method: PUT
Path: /books/{id}  
Description: Updates an existing book using its unique ID.
Example Request Body:

 {
  "title": "Things Fall Apart",
  "author": "Chinua Achebe",
  "publishedYear": 1958,
  "genre": "Historical Fiction"
}

Success Status Code: 200 OK

5. Delete a Book
Method: DELETE
Path: /books/{id}
Description: Deletes a book from the library using its unique ID.
Example Request Body: None required.
Success Status Code: 204 No Content

6.  List Books by Author
Method: GET
Path: /books?author=Chinua%20Achebe
Description: Retrieves all books written by the specified author using a query parameter.
Example Request Body: None required.
Success Status Code: 200 OK

 Error responses

400 Bad Request
Description: The request contains invalid data or is missing required fields.
Example: Creating a book without a title or providing an invalid publishedYear.

Example Response:

,{
  "error": "Bad Request",
  "message": "The title field is required."
},

404 Not Found
Description: The requested book or resource does not exist.
Example: Requesting GET /books/999 when no book with ID 999 exists.
Example Response:

{
  "error": "Not Found",
  "message": "The requested book was not found."
}


]