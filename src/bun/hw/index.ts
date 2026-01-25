Bun.serve({
  port: 8080,
  fetch() {
    return new Response(JSON.stringify({ message: "hello world" }), {
      headers: { "Content-Type": "application/json" },
    });
  },
});
