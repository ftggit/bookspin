class BookWheel {
  constructor(canvas, { onSpinEnd } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.books = [];
    this.rotation = 0;
    this.velocity = 0;
    this.animationFrame = null;
    this.onSpinEnd = onSpinEnd;
  }

  setBooks(books) {
    this.books = Array.isArray(books) ? books.filter(Boolean) : [];
    this.rotation = 0;
    this._draw();
  }

  isSpinning() {
    return this.animationFrame !== null;
  }

  spin() {
    if (!this.books.length || this.isSpinning()) {
      return null;
    }

    const minRotations = 6 * Math.PI;
    const randomness = Math.random() * 2 * Math.PI;
    this.velocity = (minRotations + randomness) / (120 + Math.random() * 40);
    this._animate();
    return true;
  }

  _animate() {
    if (this.velocity <= 0.001) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
      this.velocity = 0;
      const selected = this._currentBook();
      if (selected && typeof this.onSpinEnd === "function") {
        this.onSpinEnd(selected);
      }
      return;
    }

    this.rotation = (this.rotation + this.velocity) % (Math.PI * 2);
    this.velocity *= 0.985;
    this._draw();
    this.animationFrame = requestAnimationFrame(() => this._animate());
  }

  _currentBook() {
    if (!this.books.length) {
      return null;
    }

    const normalized = (Math.PI * 2 - this.rotation + Math.PI / 2) % (Math.PI * 2);
    const sliceSize = (Math.PI * 2) / this.books.length;
    const index = Math.floor(normalized / sliceSize) % this.books.length;
    return this.books[index];
  }

  _draw() {
    const ctx = this.ctx;
    const { canvas } = this;
    const size = Math.min(canvas.width, canvas.height);
    const radius = size / 2 - 10;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!this.books.length) {
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.fillStyle = "#c5ccd6";
      ctx.font = "20px Segoe UI";
      ctx.textAlign = "center";
      ctx.fillText("No books yet", 0, 10);
      ctx.restore();
      return;
    }

    const colors = ["#3a6ea5", "#f28705", "#5c9ead", "#6c5b7b", "#f67280", "#c06c84"];
    const slice = (Math.PI * 2) / this.books.length;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(this.rotation);

    this.books.forEach((book, index) => {
      const startAngle = index * slice;
      const endAngle = startAngle + slice;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = colors[index % colors.length];
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.rotate(startAngle + slice / 2);
      ctx.translate(radius * 0.6, 0);
      ctx.rotate(Math.PI / 2);
      ctx.font = "bold 16px Segoe UI";
      ctx.textAlign = "center";
      ctx.fillText(book.title.substring(0, 24), 0, 6);
      ctx.restore();
    });

    ctx.restore();

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.beginPath();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 3;
    ctx.arc(0, 0, 35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(centerX, centerY - radius - 20);
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(15, 20);
    ctx.lineTo(-15, 20);
    ctx.closePath();
    ctx.fillStyle = "#f25f5c";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

window.BookWheel = BookWheel;
