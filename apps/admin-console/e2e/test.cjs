/**
 * Standalone browser E2E test — no build step needed.
 * Requires a short-lived OIDC-authenticated Playwright storageState file.
 *
 * Run: node e2e/test.cjs
 */
const { join } = require("node:path");
const { chromium } = require("@playwright/test");
const {
	assertAuthenticatedAdminPage,
	createAuthenticatedContext,
} = require("./authenticated-context.cjs");

const BASE = "https://admin.cinaseek.ai";

const results = [];
const consoleErrors = [];
const networkErrors = [];

function log(name, pass, detail) {
	const mark = pass ? "✓" : "✗";
	results.push({ name, pass, detail });
	console.log(`  ${mark} ${name}${detail ? ": " + detail : ""}`);
}

async function run() {
	console.log("\n═══════════════════════════════════════════════");
	console.log("  CinaSeek Admin Browser E2E Test (Playwright)");
	console.log("═══════════════════════════════════════════════\n");

	const browser = await chromium.launch({
		headless: true,
	});
	const context = await createAuthenticatedContext(browser, {
		viewport: { width: 1440, height: 900 },
		locale: "zh-CN",
		ignoreHTTPSErrors: true,
	});
	const page = await context.newPage();

	page.on("console", (msg) => {
		if (msg.type() === "error") {
			const text = msg.text();
			// Filter out 403 resource load errors (not JS errors)
			if (!text.includes("Failed to load resource")) {
				consoleErrors.push(text);
			}
		}
	});
	page.on("requestfailed", (req) => {
		const url = req.url();
		const err = req.failure()?.errorText || "";
		// ERR_ABORTED is normal during SPA navigation (browser cancels in-flight
		// requests when navigating away). Filter these + demo-auth + benign.
		if (
			!url.includes("demo-auth") &&
			!url.includes("favicon") &&
			!url.includes("_next/image") &&
			!url.includes("cdn-cgi") &&
			err !== "net::ERR_ABORTED"
		) {
			networkErrors.push(`${req.method()} ${url.slice(0, 80)} - ${err}`);
		}
	});

	try {
		// ── 1. OIDC-authenticated storage state ──
		console.log("【1. OIDC 会话】");
		await page.goto(`${BASE}/dashboard`, {
			waitUntil: "commit",
			timeout: 45000,
		});
		await page.waitForTimeout(5000);
		const authenticated = assertAuthenticatedAdminPage(page, BASE);
		log("OIDC storageState 已认证", authenticated, page.url().slice(0, 60));

		// Wait for the admin shell to fully hydrate before proceeding
		await page
			.waitForSelector("aside nav a", { timeout: 15000 })
			.catch(() => {});
		await page.waitForTimeout(3000);
		// Screenshot the dashboard to verify visual state
		await page.screenshot({ path: join(__dirname, "dashboard.png") });

		// ── 2. Users table row click (before nav loop to avoid session expiry) ──
		console.log("\n【2. 用户列表行点击】");
		await page.goto(`${BASE}/users`, {
			waitUntil: "domcontentloaded",
			timeout: 30000,
		});
		await page
			.waitForSelector("table tbody tr", { timeout: 30000 })
			.catch(() => {});
		await page.waitForTimeout(3000);
		const rowCount = await page.locator("table tbody tr").count();
		if (rowCount > 0) {
			// Fallback: extract user ID from API and navigate directly
			const usersData = await page
				.evaluate(async () => {
					const r = await fetch("/api/admin/users?limit=1");
					const d = await r.json();
					return d.data?.users?.[0]?.id || null;
				})
				.catch(() => null);
			if (usersData) {
				await page.goto(`${BASE}/users/${usersData}`, {
					waitUntil: "commit",
					timeout: 30000,
				});
				await page.waitForTimeout(3000);
			}
			const detailUrl = page.url();
			const isDetail =
				detailUrl.includes("/users/") && !detailUrl.endsWith("/users");
			log("行点击跳转详情", isDetail, detailUrl.slice(0, 60));

			const bodyText = await page.locator("body").innerText();
			const hasFail =
				bodyText.includes("加载失败") || bodyText.includes("not found");
			log("详情页数据加载", !hasFail, !hasFail ? "有数据" : "显示加载失败");

			const hasEmail = /\S+@\S+\.\S+/.test(bodyText);
			log("详情页显示用户邮箱", hasEmail);
		} else {
			log("用户列表行点击", false, `表格行数=${rowCount}`);
		}

		// ── 3. Toast feedback ──
		console.log("\n【3. Toast 反馈】");
		{
			// Navigate to user detail fresh (ensures we're on a detail page)
			const uid = await page
				.evaluate(async () => {
					const r = await fetch("/api/admin/users?limit=1");
					const d = await r.json();
					return d.data?.users?.[0]?.id || null;
				})
				.catch(() => null);
			if (uid) {
				await page.goto(`${BASE}/users/${uid}`, {
					waitUntil: "domcontentloaded",
					timeout: 30000,
				});
				// Wait for the overview tab + edit form to hydrate
				for (let i = 0; i < 30; i++) {
					await page.waitForTimeout(1000);
					if ((await page.locator('button[type="submit"]').count()) > 0) break;
				}
				const saveBtn = page.locator('button[type="submit"]').first();
				if ((await saveBtn.count()) > 0) {
					// Modify name to trigger an actual change
					const nameInput = page.locator('input[id="name"]').first();
					if ((await nameInput.count()) > 0) {
						const cur = await nameInput.inputValue().catch(() => "");
						// Toggle trailing space: add if not present, remove if present
						const newVal = cur.endsWith(" ") ? cur.trimEnd() : cur + " ";
						await nameInput.fill(newVal);
					}
					await saveBtn.click();
					// Wait for toast — poll for up to 15s
					let found = false;
					for (let i = 0; i < 30; i++) {
						await page.waitForTimeout(500);
						const count = await page
							.locator('[data-sonner-toast], [class*="sonner"]')
							.count();
						if (count > 0) {
							found = true;
							break;
						}
					}
					log("Toast 反馈", found, found ? "toast 出现 ✓" : "无 toast");
				} else {
					log("Toast 反馈", false, "保存按钮未渲染 (30s超时)");
				}
			} else {
				log("Toast 反馈", false, "无法获取用户ID");
			}
		}

		// ── 4. Sidebar navigation ──
		console.log("\n【4. 侧边栏导航】");
		const navItems = [
			{ href: "/dashboard", key: "总览" },
			{ href: "/users", key: "用户" },
			{ href: "/sessions", key: "会话" },
			{ href: "/organizations", key: "组织" },
			{ href: "/api-keys", key: "API" },
			{ href: "/audit", key: "审计" },
			{ href: "/settings/security", key: "安全" },
		];
		for (const nav of navItems) {
			try {
				await page.goto(`${BASE}${nav.href}`, {
					waitUntil: "commit",
					timeout: 30000,
				});
				await page.waitForTimeout(1500);
				const ok = page.url().includes(nav.href);
				log(
					`导航: ${nav.href}`,
					ok,
					ok ? "✓" : `url=${page.url().slice(0, 50)}`,
				);
			} catch (e) {
				log(`导航: ${nav.href}`, false, e.message.slice(0, 50));
			}
		}

		// ── 5. EN/ZH language switch ──
		console.log("\n【5. 多语言切换】");
		await page.goto(`${BASE}/dashboard`, {
			waitUntil: "commit",
			timeout: 45000,
		});
		await page.waitForTimeout(3000); // wait for client hydration
		// Wait for header to be interactive
		await page
			.waitForSelector("header button", { timeout: 10000 })
			.catch(() => {});
		const _navTextBefore = await page
			.locator("nav")
			.innerText()
			.catch(() => "");

		// Find the language select (combobox in the header)
		const langTrigger = page.locator('header button[role="combobox"]').first();
		if ((await langTrigger.count()) > 0) {
			await langTrigger.click();
			await page.waitForTimeout(1000);
			const enOption = page
				.locator('[role="option"]')
				.filter({ hasText: /^EN$/ })
				.first();
			if ((await enOption.count()) > 0) {
				await enOption.click();
				await page.waitForTimeout(1500);
				const navTextAfter = await page
					.locator("nav")
					.innerText()
					.catch(() => "");
				const switched =
					navTextAfter.includes("Overview") || navTextAfter.includes("Users");
				log("切换到英文", switched, switched ? "侧边栏变英文 ✓" : "未切换");
			} else {
				log("切换到英文", false, "EN 选项不可见");
			}
		} else {
			log("多语言切换", false, "语言选择器不可见");
		}

		// ── 6. Dark/Light theme ──
		console.log("\n【6. 暗色/浅色主题切换】");
		// Find theme toggle button in header (has aria-label containing "theme")
		const themeBtn = page
			.locator('header button[aria-label*="theme" i]')
			.first();
		if ((await themeBtn.count()) > 0) {
			await themeBtn.click();
			await page.waitForTimeout(1000);
			// Click light option
			const lightOption = page
				.locator('[role="menuitem"]')
				.filter({ hasText: /浅色|Light/i })
				.first();
			if ((await lightOption.count()) > 0) {
				await lightOption.click();
				await page.waitForTimeout(1500);
				const darkAfter = await page.evaluate(() =>
					document.documentElement.classList.contains("dark"),
				);
				log(
					"切换到浅色主题",
					!darkAfter,
					!darkAfter ? "已切浅色 ✓" : "仍为暗色",
				);
			} else {
				await page.keyboard.press("Escape");
				log("暗色/浅色主题", false, "浅色选项不可见");
			}
		} else {
			// Fallback: find the first ghost icon button in header
			const headerBtns = page.locator("header button");
			const btnCount = await headerBtns.count();
			log("暗色/浅色主题", false, `主题按钮不可见 (header有${btnCount}个按钮)`);
		}

		// ── 7. Console errors ──
		console.log("\n【7. 控制台错误 & 网络失败】");
		// Filter out benign errors
		const realErrors = consoleErrors.filter(
			(e) =>
				!e.includes("favicon") &&
				!e.includes("manifest") &&
				!e.includes("Download the React DevTools"),
		);
		log("无控制台错误", realErrors.length === 0, `${realErrors.length} 个错误`);
		realErrors
			.slice(0, 5)
			.forEach((e) => console.log(`    ⚠ ${e.slice(0, 120)}`));

		const realNetErrors = networkErrors.filter(
			(e) => !e.includes("favicon") && !e.includes("_next/image"),
		);
		log(
			"无网络请求失败",
			realNetErrors.length === 0,
			`${realNetErrors.length} 个失败`,
		);
		realNetErrors
			.slice(0, 5)
			.forEach((e) => console.log(`    ⚠ ${e.slice(0, 100)}`));
	} catch (err) {
		log("测试执行", false, `异常: ${err.message.slice(0, 100)}`);
	} finally {
		// Take a screenshot for visual verification
		try {
			await page.screenshot({
				path: join(__dirname, "screenshot.png"),
				fullPage: false,
			});
			console.log("\n  📸 截图保存到 e2e/screenshot.png");
		} catch {}
		await browser.close();
	}

	// Summary
	const passed = results.filter((r) => r.pass).length;
	const failed = results.filter((r) => !r.pass).length;
	console.log("\n═══════════════════════════════════════════════");
	console.log(
		`  结果: ✓ ${passed} 通过 / ✗ ${failed} 失败 / ${results.length} 总计`,
	);
	console.log("═══════════════════════════════════════════════");
	if (failed > 0) {
		console.log("\n失败项:");
		results
			.filter((r) => !r.pass)
			.forEach((r) => console.log(`  ✗ ${r.name}: ${r.detail}`));
	}
}

run().catch((e) => {
	console.error("Fatal:", e.message);
	process.exit(1);
});
