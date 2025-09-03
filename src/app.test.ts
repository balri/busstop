import request from "supertest";

import app from "./app";

describe("Express App", () => {
	it("GET /health returns OK", async () => {
		const res = await request(app).get("/health");
		expect(res.status).toBe(200);
		expect(res.text).toBe("OK");
	});

	it("GET / returns HTML with BUS_TOKEN", async () => {
		const res = await request(app).get("/");
		expect(res.status).toBe(200);
		expect(res.text).toContain("window.BUS_TOKEN=");
		expect(res.text).toContain("<!DOCTYPE html>");
	});
});
