function updateStatus(status) {
  const statusDiv = document.getElementById("status");
  statusDiv.textContent = status;
  statusDiv.className = "status " + status.toLowerCase();
}

function updateError(error) {
  const errorDiv = document.getElementById("error");
  if (error) {
    errorDiv.textContent = error;
    errorDiv.style.display = "block";
  } else {
    errorDiv.style.display = "none";
  }
}

function updateTodo(todo) {
  const todoDiv = document.getElementById("todo");
  if (todo) {
    todoDiv.innerHTML = `
      <p><strong>Title:</strong> ${todo.title}</p>
      <p><strong>Description:</strong> ${todo.description}</p>
      <p><strong>Completed:</strong> ${todo.completed ? "Yes" : "No"}</p>
      <p><strong>User ID:</strong> ${todo.userID}</p>
      <p class="timestamp">Last updated: ${new Date(
        todo.lastUpdate
      ).toLocaleString()}</p>
    `;
  } else {
    todoDiv.innerHTML = "<p>No todo data available</p>";
  }
}

function updateUser(user) {
  const userDiv = document.getElementById("user");
  if (user) {
    userDiv.innerHTML = `
      <p><strong>Name:</strong> ${user.name}</p>
      <p><strong>Email:</strong> ${user.email}</p>
      <p><strong>Role:</strong> ${user.role}</p>
      <p class="timestamp">Last updated: ${new Date(
        user.lastUpdate
      ).toLocaleString()}</p>
    `;
  } else {
    userDiv.innerHTML = "<p>No user data available</p>";
  }
}

chrome.storage.local.onChanged.addListener((changes) => {
  if (changes.connectionStatus) {
    updateStatus(changes.connectionStatus.newValue);
  }
  if (changes.lastError) {
    updateError(changes.lastError.newValue);
  }
  if (changes.lastTodo) {
    updateTodo(changes.lastTodo.newValue);
  }
  if (changes.lastUser) {
    updateUser(changes.lastUser.newValue);
  }
});

chrome.storage.local.get(
  ["connectionStatus", "lastError", "lastTodo", "lastUser"],
  (result) => {
    if (result.connectionStatus) {
      updateStatus(result.connectionStatus);
    }
    if (result.lastError) {
      updateError(result.lastError);
    }
    if (result.lastTodo) {
      updateTodo(result.lastTodo);
    }
    if (result.lastUser) {
      updateUser(result.lastUser);
    }
  }
);
