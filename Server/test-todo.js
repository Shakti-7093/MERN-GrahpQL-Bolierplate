import fetch from "node-fetch";

const CREATE_TODO = `
  mutation CreateTodo($title: String!, $description: String!, $completed: Boolean!, $userID: ID!) {
    createTodo(title: $title, description: $description, completed: $completed, userID: $userID) {
      message
      todo {
        _id
        title
        description
        completed
        userID
      }
    }
  }
`;

const createTodo = async (userId) => {
  try {
    const response = await fetch("http://localhost:4000/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: CREATE_TODO,
        variables: {
          title: "Test Todo",
          description: "This is a test todo created via GraphQL",
          completed: false,
          userID: userId,
        },
      }),
    });

    const result = await response.json();
    console.log("Create Todo Result:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error creating todo:", error);
  }
};

const runTest = async () => {
  console.log("Creating user...");
  const userId = "68345c4b17736ca70c644580";

  if (userId) {
    console.log("Creating todo for user:", userId);
    await createTodo(userId);
  } else {
    console.error("Failed to create user, cannot create todo");
  }
};

runTest();
