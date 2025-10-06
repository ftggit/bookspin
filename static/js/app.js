(function () {
  const syncForm = document.getElementById("sync-form");
  const syncButton = syncForm.querySelector("button[type='submit']");
  const shelfInput = document.getElementById("shelf-url");
  const addForm = document.getElementById("add-form");
  const bookList = document.getElementById("book-list");
  const bookTemplate = document.getElementById("book-list-item");
  const spinButton = document.getElementById("spin-button");
  const selectedBook = document.getElementById("selected-book");
  const bookCount = document.getElementById("book-count");
  const wheelCanvas = document.getElementById("wheel-canvas");

  const wheel = new window.BookWheel(wheelCanvas, {
    onSpinEnd(book) {
      selectedBook.textContent = book.author
        ? `${book.title} — ${book.author}`
        : book.title;
    },
  });

  const initialShelf = document.body.getAttribute("data-shelf-url");
  if (initialShelf) {
    shelfInput.value = initialShelf;
  }

  async function loadBooks() {
    const response = await fetch("/api/books", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to load books");
    }
    const books = await response.json();
    renderBooks(books);
    wheel.setBooks(books);
    selectedBook.textContent = "";
  }

  function renderBooks(books) {
    bookList.innerHTML = "";
    bookCount.textContent = books.length ? `${books.length} total` : "";

    books.forEach((book) => {
      const item = document.importNode(bookTemplate.content, true);
      const cover = item.querySelector(".book-cover img");
      const titleLink = item.querySelector(".book-title");
      const authorEl = item.querySelector(".book-author");
      const removeButton = item.querySelector(".remove");

      if (book.image_url) {
        cover.src = book.image_url;
        cover.alt = `${book.title} cover`;
      } else {
        cover.removeAttribute("src");
        cover.alt = "Cover unavailable";
      }

      titleLink.textContent = book.title;
      if (book.goodreads_url) {
        titleLink.href = book.goodreads_url;
      } else {
        titleLink.removeAttribute("href");
        titleLink.classList.add("no-link");
      }

      authorEl.textContent = book.author ? `by ${book.author}` : "";

      removeButton.dataset.id = book.id;
      removeButton.addEventListener("click", () => removeBook(book.id));

      bookList.appendChild(item);
    });
  }

  async function removeBook(id) {
    if (!window.confirm("Remove this book from the wheel?")) {
      return;
    }

    const response = await fetch(`/books/${id}`, { method: "DELETE" });
    if (!response.ok && response.status !== 204) {
      window.alert("Failed to remove book");
      return;
    }
    await loadBooks();
  }

  syncForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const shelfUrl = shelfInput.value.trim();
    if (!shelfUrl) {
      window.alert("Please paste your Goodreads shelf URL first.");
      return;
    }

    toggleSyncState(true);
    try {
      const response = await fetch("/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shelf_url: shelfUrl }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to sync shelf");
      }
      await loadBooks();
      window.alert(`Imported ${payload.imported} books from Goodreads.`);
    } catch (error) {
      console.error(error);
      window.alert(error.message);
    } finally {
      toggleSyncState(false);
    }
  });

  addForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(addForm);
    const title = (formData.get("title") || "").trim();
    const author = (formData.get("author") || "").trim();
    if (!title) {
      window.alert("Title is required");
      return;
    }

    try {
      const response = await fetch("/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, author }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to add book");
      }
      addForm.reset();
      await loadBooks();
    } catch (error) {
      console.error(error);
      window.alert(error.message);
    }
  });

  spinButton.addEventListener("click", () => {
    if (!wheel.books || !wheel.books.length) {
      window.alert("The wheel is empty. Add or sync some books first.");
      return;
    }

    if (wheel.isSpinning()) {
      return;
    }

    selectedBook.textContent = "Spinning...";
    wheel.spin();
  });

  function toggleSyncState(isSyncing) {
    syncButton.disabled = isSyncing;
    syncButton.textContent = isSyncing ? "Syncing..." : "Sync";
  }

  loadBooks().catch((error) => {
    console.error(error);
    window.alert("Unable to load books from the server. Check the backend logs.");
  });
})();
