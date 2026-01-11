const libraryContainer = document.getElementById("library");

const createBookCard = (book) => {
  const card = document.createElement("a");
  card.className = "book-card";
  card.href = `viewer.html?book=${encodeURIComponent(book.id)}`;

  const img = document.createElement("img");
  img.className = "book-cover";
  img.src = book.cover;
  img.alt = `${book.title} cover`;
  img.loading = "lazy";

  const title = document.createElement("div");
  title.className = "book-title";
  title.textContent = book.title;

  card.append(img, title);
  return card;
};

const renderLibrary = (books) => {
  libraryContainer.innerHTML = "";
  books.forEach((book) => {
    libraryContainer.appendChild(createBookCard(book));
  });
};

const showError = (message) => {
  libraryContainer.innerHTML = "";
  const error = document.createElement("p");
  error.className = "loading";
  error.textContent = message;
  libraryContainer.appendChild(error);
};

fetch("data/books.json")
  .then((response) => {
    if (!response.ok) {
      throw new Error("Unable to load library");
    }
    return response.json();
  })
  .then((books) => {
    if (!Array.isArray(books)) {
      throw new Error("Invalid library data");
    }
    renderLibrary(books);
  })
  .catch(() => {
    showError("Books are unavailable right now.");
  });