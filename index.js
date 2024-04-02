const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "goodreads.db");
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    console.log("Database connected successfully!");
    app.listen(3000, () => {
      console.log("Server is running on port 3000");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

// API Get all books
app.get("/", async (request, response) => {
  const selectBooks = `
    SELECT 
    *
    FROM 
    book;`;
  const selectQuery = await db.all(selectBooks);
  response.send(selectQuery);
});

// API Get books from specific range
app.get("/books/", async (request, response) => {
  const {
    offset = 2,
    limit = 5,
    order = "ASC",
    order_by = "book_id",
    search_q = "",
  } = request.query;
  const getBooksQuery = `
    SELECT
      *
    FROM
     book
    WHERE
     title LIKE '%${search_q}%'
    ORDER BY ${order_by} ${order}
    LIMIT ${limit} OFFSET ${offset};`;
  const booksArray = await db.all(getBooksQuery);
  response.send(booksArray);
});

// API get book through ID
app.get("/books/:bookId/", async (request, response) => {
  const { bookId } = request.params;
  const getBook = `
    SELECT 
    * 
    FROM 
    book 
    WHERE 
    book_id = ${bookId};`;
  const book = await db.get(getBook);
  response.send(book);
});

// API Get book through authorID
app.get("/authors/:authorId/", async (request, response) => {
  const { authorId } = request.params;
  const getAuthorBooksQuery = `
    SELECT
     *
    FROM
     book
    WHERE
      author_id = ${authorId};`;
  const booksArray = await db.all(getAuthorBooksQuery);
  response.send(booksArray);
});

// API Get ratings of Books
app.get("/ratings/:rating/", async (request, response) => {
  const { rating } = request.params;
  const getRatingMoreThan = `
    SELECT 
    * 
    FROM 
    book 
    WHERE 
    rating = ?;`;
  const ratingsNo = await db.all(getRatingMoreThan, [rating]);
  response.send(ratingsNo);
});

// API Added Book
app.post("/books/post/", async (request, response) => {
  const bookDetails = request.body;
  const {
    title,
    authorId,
    rating,
    ratingCount,
    reviewCount,
    description,
    pages,
    dateOfPublication,
    editionLanguage,
    price,
    onlineStores,
  } = bookDetails;
  const addBookQuery = `
    INSERT INTO
      book (title,author_id,rating,rating_count,review_count,description,pages,date_of_publication,edition_language,price,online_stores)
    VALUES
      (
        '${title}',
         ${authorId},
         ${rating},
         ${ratingCount},
         ${reviewCount},
        '${description}',
         ${pages},
        '${dateOfPublication}',
        '${editionLanguage}',
         ${price},
        '${onlineStores}'
      );`;
  const dbResponse = await db.run(addBookQuery);
  const bookId = dbResponse.lastID;
  response.send({ bookId: bookId });
});

// API Update book
app.put("/update/books/:bookId/", async (request, response) => {
  const { bookId } = request.params;
  const bookDetails = request.body;
  const {
    title,
    authorId,
    rating,
    ratingCount,
    reviewCount,
    description,
    pages,
    dateOfPublication,
    editionLanguage,
    price,
    onlineStores,
  } = bookDetails;
  const updateBookQuery = `
    UPDATE
      book
    SET
      title='${title}',
      author_id=${authorId},
      rating=${rating},
      rating_count=${ratingCount},
      review_count=${reviewCount},
      description='${description}',
      pages=${pages},
      date_of_publication='${dateOfPublication}',
      edition_language='${editionLanguage}',
      price=${price},
      online_stores='${onlineStores}'
    WHERE
      book_id = ${bookId};`;
  await db.run(updateBookQuery);
  response.send("Book Updated Successfully");
});

// API delete book
app.delete("/delete/books/:bookId/", async (request, response) => {
  const { bookId } = request.params;
  const deleteBookQuery = `
    DELETE 
    FROM
      book
    WHERE
      book_id = ${bookId};`;
  await db.run(deleteBookQuery);
  response.send("Book Deleted Successfully");
});

// Register New User API
app.post("/users/", async (request, response) => {
  const { name, username, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(request.body.password, 10);
  const selectUser = `
    SELECT 
    *
    FROM
    user
    WHERE 
    username = '${username}'`;
  const dbUser = await db.get(selectUser);
  if (dbUser === undefined) {
    const newUser = `
        INSERT INTO
        user (name, username, password, gender, location)
        VALUES (
            '${name}',
            '${username}',
            '${hashedPassword}',
            '${gender}',
            '${location}'
            )`;
    const dbResponse = await db.run(newUser);
    const newUserId = dbResponse.lastID;
    response.send(`Created new user with ${newUserId}`);
  } else {
    response.status = 400;
    response.send("User already exists");
  }
});

// Login User API
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUser = `
    SELECT 
    *
    FROM
    user
    WHERE 
    username = '${username}'`;
  const dbUser = await db.get(selectUser);
  if (dbUser === undefined) {
    response.status(400).send("Invalid User");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched) {
      response.send("Login Success!");
    } else {
      response.status(400).send("Invalid Password");
    }
  }
});
