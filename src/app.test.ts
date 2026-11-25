import request from "supertest";

import app from "./app";

describe("Express App", () => {
	it("GET /health returns OK", async () => {
		const res = await request(app).get("/health");
		expect(res.status).toBe(200);
		expect(res.text).toBe("OK");
	});

	it("allows cross-origin status requests", async () => {
		const res = await request(app)
			.options("/status")
			.set("Origin", "https://busstop.example")
			.set("Access-Control-Request-Method", "POST")
			.set("Access-Control-Request-Headers", "content-type");

		expect(res.status).toBe(204);
		expect(res.headers["access-control-allow-origin"]).toBe("*");
		expect(res.headers["access-control-allow-methods"]).toContain("POST");
	});

	it("GET / returns HTML with BUS_TOKEN", async () => {
		const res = await request(app).get("/");
		expect(res.status).toBe(200);
		expect(res.text).toContain("window.BUS_TOKEN=");
		expect(res.text).toContain("<!doctype html>");
	});
});
