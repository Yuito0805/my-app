(() => {
  const titleInput = document.getElementById("title");
  const textbookIdInput = document.getElementById("textbookId");
  const authorInput = document.getElementById("author");
  const suggestionsBox = document.getElementById("suggestions");
  const fixedNote = document.getElementById("fixed-note");
  const clearButton = document.getElementById("clear-selected-textbook");
  if (!titleInput || !textbookIdInput || !authorInput || !suggestionsBox || !fixedNote || !clearButton) return;

  const courseNameInputs = [1, 2, 3].map((index) => document.getElementById(`courseName${index}`));
  const teacherNameInputs = [1, 2, 3].map((index) => document.getElementById(`teacherName${index}`));
  let searchTimer = null;

  const setReadonly = (readonly) => {
    [authorInput, ...courseNameInputs, ...teacherNameInputs].forEach((input) => {
      if (input) input.readOnly = readonly;
    });
  };

  const clearCourses = () => {
    [...courseNameInputs, ...teacherNameInputs].forEach((input) => {
      if (input) input.value = "";
    });
  };

  const resetSelection = ({ clearAutoFields = false, clearTitle = false } = {}) => {
    if (clearTitle) titleInput.value = "";
    if (clearAutoFields) {
      authorInput.value = "";
      clearCourses();
    }
    textbookIdInput.value = "";
    setReadonly(false);
    fixedNote.style.display = "none";
    clearButton.style.display = "none";
  };

  const selectTextbook = (textbook) => {
    textbookIdInput.value = String(textbook.id);
    titleInput.value = textbook.title;
    authorInput.value = textbook.author;
    clearCourses();
    textbook.courses.slice(0, 3).forEach((course, index) => {
      courseNameInputs[index].value = course.courseName;
      teacherNameInputs[index].value = course.teacherName;
    });
    setReadonly(true);
    suggestionsBox.style.display = "none";
    fixedNote.style.display = "block";
    clearButton.style.display = "inline-flex";
  };

  const showSuggestions = (textbooks) => {
    suggestionsBox.innerHTML = "";
    if (textbooks.length === 0) {
      suggestionsBox.innerHTML = '<div class="suggestion-item"><strong>登録済みの候補はありません</strong><p class="meta">このまま新しい教科書として入力してください。</p></div>';
      suggestionsBox.style.display = "block";
      return;
    }

    textbooks.forEach((textbook) => {
      const item = document.createElement("div");
      item.className = "suggestion-item";
      const courseText = textbook.courses.length
        ? textbook.courses.map((course) => `${course.courseName}（${course.teacherName}）`).join("、")
        : "関連教科なし";
      item.innerHTML = `
        <div class="suggestion-head">
          <div>
            <strong>${escapeHtml(textbook.title)}</strong>
            <p class="meta">著者：${escapeHtml(textbook.author)}<br>関連教科：${escapeHtml(courseText)}</p>
          </div>
        </div>`;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "primary small-button";
      button.textContent = "この教科書を選択";
      button.addEventListener("click", () => selectTextbook(textbook));
      item.appendChild(button);
      suggestionsBox.appendChild(item);
    });
    suggestionsBox.style.display = "block";
  };

  const escapeHtml = (value) => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  titleInput.addEventListener("input", () => {
    const hadSelectedTextbook = Boolean(textbookIdInput.value);
    resetSelection({ clearAutoFields: hadSelectedTextbook });
    const query = titleInput.value.trim();
    if (searchTimer) clearTimeout(searchTimer);
    if (!query) {
      suggestionsBox.innerHTML = "";
      suggestionsBox.style.display = "none";
      return;
    }

    searchTimer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/textbooks?q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error("教科書候補の取得に失敗しました");
        showSuggestions(await response.json());
      } catch (error) {
        console.error(error);
        suggestionsBox.innerHTML = '<div class="suggestion-item"><p class="meta">候補を取得できませんでした。このまま手入力できます。</p></div>';
        suggestionsBox.style.display = "block";
      }
    }, 250);
  });

  clearButton.addEventListener("click", () => {
    resetSelection({ clearAutoFields: true, clearTitle: true });
    suggestionsBox.innerHTML = "";
    suggestionsBox.style.display = "none";
    titleInput.focus();
  });
})();
