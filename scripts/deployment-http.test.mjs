import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test from "node:test";
import { deploymentFetch } from "./deployment-http.mjs";

const startServer = async (t, handler) => {
	const server = createServer(handler);
	server.listen(0, "127.0.0.1");
	await once(server, "listening");
	t.after(() => new Promise((resolve) => server.close(resolve)));
	return `http://127.0.0.1:${server.address().port}`;
};

for (const useRequest of [false, true]) {
	test(`deployment probe preserves authenticated POST with ${useRequest ? "Request" : "URL"} input`, async (t) => {
		const url = await startServer(t, async (request, response) => {
			if (!request.headers["user-agent"]?.startsWith("CinaAuth-Deployment/")) {
				response.writeHead(403).end("error code: 1010");
				return;
			}
			assert.equal(request.headers.authorization, "Bearer test-token");
			assert.equal(request.headers.accept, "application/json");
			assert.equal(request.method, "POST");
			let body = "";
			for await (const chunk of request) body += chunk;
			assert.equal(body, "probe-body");
			response.writeHead(200, { "content-type": "application/json" });
			response.end(JSON.stringify({ ready: true }));
		});
		const headers = new Headers({
			Authorization: "Bearer test-token",
			Accept: "application/json",
		});
		const init = { method: "POST", headers, body: "probe-body" };
		const input = useRequest ? new Request(url, init) : url;
		const result = await deploymentFetch(input, useRequest ? undefined : init);
		assert.equal(result.status, 200);
		assert.deepEqual(await result.json(), { ready: true });
		assert.equal(headers.has("user-agent"), false);
		if (useRequest) assert.equal(input.headers.has("user-agent"), false);
	});
}

test("deployment probe preserves application HTTP failures", async (t) => {
	const url = await startServer(t, (_request, response) => {
		response.writeHead(403, { "content-type": "application/json" });
		response.end(JSON.stringify({ error: "Forbidden" }));
	});
	const result = await deploymentFetch(url);
	assert.equal(result.status, 403);
	assert.equal(result.ok, false);
	assert.deepEqual(await result.json(), { error: "Forbidden" });
});

test("deployment probe preserves the caller abort signal", async () => {
	const controller = new AbortController();
	controller.abort();
	await assert.rejects(
		deploymentFetch("http://127.0.0.1:1", { signal: controller.signal }),
		{ name: "AbortError" },
	);
});
