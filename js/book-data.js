const BOOKS_PATH = new URL("../data/books.json", import.meta.url);

const request = async (resource, parse, errorMessage) => {
  const response = await fetch(resource);
  if (!response.ok) {
    throw new Error(errorMessage);
  }

  return parse(response);
};

const toUrl = (pathOrUrl) =>
  pathOrUrl instanceof URL ? pathOrUrl : new URL(pathOrUrl, document.baseURI);

export const getBookId = () =>
  new URLSearchParams(window.location.search).get("book");

export const loadBooks = async () => {
  const books = await request(
    BOOKS_PATH,
    (response) => response.json(),
    "Unable to load library"
  );

  if (!Array.isArray(books)) {
    throw new Error("Invalid library data");
  }

  return books;
};

export const loadBook = async (bookId) => {
  if (!bookId) {
    throw new Error("Book not found");
  }

  const books = await loadBooks();
  const book = books.find((item) => item.id === bookId);
  if (!book) {
    throw new Error("Book not found");
  }

  return book;
};

export const loadManifest = async (manifestPath) => {
  const manifest = await request(
    toUrl(manifestPath),
    (response) => response.json(),
    "Unable to load manifest"
  );

  return {
    title:
      typeof manifest?.title === "string" && manifest.title.trim()
        ? manifest.title
        : "Untitled",
    pages: Array.isArray(manifest?.pages) ? manifest.pages : []
  };
};

export const loadText = (path, errorMessage = "Unable to load text") =>
  request(toUrl(path), (response) => response.text(), errorMessage);
