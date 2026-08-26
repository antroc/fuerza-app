import { Buffer } from "node:buffer";
import { preview } from "vite";

const apiPrefix = "/fuerza-app/__github";
const uploadedMarkdownByToken = new Map();

const tokenFrom = (request) => request.headers.authorization?.replace(/^Bearer\s+/i, "") ?? "";

const respondJson = (response, status, value) => {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(value));
};

const readJsonBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
};

const githubMockPlugin = {
  name: "fuerza-e2e-github-mock",
  configurePreviewServer(server) {
    server.middlewares.use(async (request, response, next) => {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      if (!url.pathname.startsWith(apiPrefix)) return next();

      const path = url.pathname.slice(apiPrefix.length);
      if (path === "/__state" && request.method === "GET") {
        return respondJson(response, 200, {
          uploadedMarkdown: uploadedMarkdownByToken.get(url.searchParams.get("token") ?? "") ?? "",
        });
      }

      if (path === "/repos/antroc/fuerza-data" && request.method === "GET") {
        return respondJson(response, 200, {
          private: true,
          default_branch: "main",
          name: "fuerza-data",
        });
      }

      if (request.method === "PUT") {
        const body = await readJsonBody(request);
        if (path.includes("/contents/entrenamientos/")) {
          uploadedMarkdownByToken.set(
            tokenFrom(request),
            Buffer.from(body.content, "base64").toString("utf8"),
          );
        }
        return respondJson(response, 200, {
          content: { sha: "content-sha" },
          commit: { sha: "commit-sha" },
        });
      }

      if (path.endsWith("/contents/entrenamientos") && request.method === "GET") {
        return respondJson(response, 200, []);
      }

      return respondJson(response, 404, { message: "Not Found" });
    });
  },
};

const server = await preview({
  plugins: [githubMockPlugin],
  preview: { host: "127.0.0.1", port: 4173, strictPort: true },
});

server.printUrls();
