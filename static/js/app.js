(function () {
  const syncForm = document.getElementById("sync-form");
  const syncButton = syncForm.querySelector("button[type='submit']");
  const shelfInput = document.getElementById("shelf-url");
  const addForm = document.getElementById("add-form");
  const bookList = document.getElementById("book-list");
  const bookTemplate = document.getElementById("book-list-item");
  const bookCount = document.getElementById("book-count");

  const pickButton = document.getElementById("pick-button");
  const fanContainer = document.getElementById("book-fan-container");
  const pageElements = Array.from(fanContainer.querySelectorAll(".book-page"));
  const selectedCard = document.getElementById("selected-book-card");
  const selectedCover = document.getElementById("selected-cover");
  const selectedTitle = document.getElementById("selected-title");
  const selectedAuthor = document.getElementById("selected-author");
  const selectedLink = document.getElementById("selected-link");
  const removeSelectedButton = document.getElementById("remove-selected");

  const initialShelf = document.body.getAttribute("data-shelf-url");
  if (initialShelf) {
    shelfInput.value = initialShelf;
  }

  let books = [];
  let currentSelection = null;
  let fanTimeout = null;

  async function loadBooks() {
    const response = await fetch("/api/books", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to load books");
    }
    books = await response.json();
    window.clearTimeout(fanTimeout);
    fanContainer.classList.remove("is-fanning");
    renderBooks();
    if (!books.some((book) => currentSelection && book.id === currentSelection.id)) {
      clearSelectedBook();
    }
  }

  function renderBooks() {
    bookList.innerHTML = "";
    bookCount.textContent = books.length ? `${books.length} total` : "";

    books.forEach((book) => {
      const item = document.importNode(bookTemplate.content, true);
      const cover = item.querySelector(".book-cover img");
      const titleLink = item.querySelector(".book-title");
      const authorEl = item.querySelector(".book-author");
      const removeButton = item.querySelector(".remove");

      if (book.image_url) {
        cover.src = resolveCover(book.image_url, 120);
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

  async function removeBook(id, { skipConfirm = false } = {}) {
    if (!skipConfirm && !window.confirm("Remove this book from your list?")) {
      return;
    }

    const response = await fetch(`/books/${id}`, { method: "DELETE" });
    if (!response.ok && response.status !== 204) {
      window.alert("Failed to remove book");
      return;
    }

    if (currentSelection && currentSelection.id === id) {
      clearSelectedBook();
    }

    await loadBooks();
  }

  function clearSelectedBook() {
    currentSelection = null;
    selectedCard.hidden = true;
    removeSelectedButton.disabled = true;
    selectedCover.removeAttribute("src");
    selectedCover.alt = "";
    selectedLink.hidden = true;
    fanContainer.classList.remove("is-fanning");
    pageElements.forEach((page) => {
      page.style.animationDelay = "";
    });
  }

  function resolveCover(url, targetSize) {
    if (!url) return url;
    const size = targetSize || 260;
    let enhanced = url
      .replace(/_SY\d+_/i, `_SY${size}_`)
      .replace(/_SX\d+_/i, `_SX${size}_`)
      .replace(/_SS\d+_/i, `_SS${size}_`);
    const [base] = enhanced.split("?");
    return base;
  }

  function showSelectedBook(book) {
    currentSelection = book;
    selectedTitle.textContent = book.title;
    selectedAuthor.textContent = book.author ? `by ${book.author}` : "Author unknown";

    if (book.image_url) {
      const highRes = resolveCover(book.image_url, 420);
      selectedCover.src = highRes;
      selectedCover.alt = `${book.title} cover`;
    } else {
      selectedCover.removeAttribute("src");
      selectedCover.alt = "Cover unavailable";
    }

    if (book.goodreads_url) {
      selectedLink.href = book.goodreads_url;
      selectedLink.hidden = false;
    } else {
      selectedLink.hidden = true;
    }

    selectedCard.hidden = false;
    removeSelectedButton.disabled = false;
  }

  function playBookAnimation() {
    if (!books.length) {
      window.alert("Your list is empty. Add or sync some books first.");
      return;
    }

    if (fanContainer.classList.contains("is-fanning")) {
      return;
    }

    pickButton.disabled = true;
    removeSelectedButton.disabled = true;

    const selectedBook = books[Math.floor(Math.random() * books.length)];
    const spinDuration = 1700 + Math.random() * 500;

    pageElements.forEach((page, index) => {
      page.style.animationDelay = `${index * 0.08}s`;
    });

    fanContainer.classList.add("is-fanning");
    window.clearTimeout(fanTimeout);
    fanTimeout = window.setTimeout(() => {
      fanContainer.classList.remove("is-fanning");
      pageElements.forEach((page) => {
        page.style.animationDelay = "";
      });
      showSelectedBook(selectedBook);
      pickButton.disabled = false;
    }, spinDuration);
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

  pickButton.addEventListener("click", () => {
    playBookAnimation();
  });

  removeSelectedButton.addEventListener("click", () => {
    if (!currentSelection) {
      return;
    }
    removeBook(currentSelection.id, { skipConfirm: true });
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
