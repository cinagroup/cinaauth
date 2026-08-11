/**
 * Comprehensive browser E2E test — full feature coverage.
 * Run: node e2e/test-full.cjs
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
	console.log("  CinaSeek Admin 全功能浏览器测试 (Playwright)");
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
		if (
			msg.type() === "error" &&
			!msg.text().includes("Failed to load resource")
		)
			consoleErrors.push(msg.text());
	});
	page.on("requestfailed", (req) => {
		const url = req.url();
		const err = req.failure()?.errorText || "";
		if (
			!url.includes("demo-auth") &&
			!url.includes("favicon") &&
			!url.includes("cdn-cgi") &&
			err !== "net::ERR_ABORTED"
		) {
			networkErrors.push(`${req.method()} ${url.slice(0, 80)} - ${err}`);
		}
	});

	try {
		// ═══════════════════════════════════════
		// 1. OIDC-authenticated storage state
		// ═══════════════════════════════════════
		console.log("【1. OIDC 会话】");
		await page.goto(`${BASE}/dashboard`, {
			waitUntil: "commit",
			timeout: 45000,
		});
		await page.waitForTimeout(5000);
		const authenticated = assertAuthenticatedAdminPage(page, BASE);
		log("OIDC storageState 已认证", authenticated, page.url().slice(0, 60));

		await page
			.waitForSelector("aside nav a", { timeout: 15000 })
			.catch(() => {});
		await page.waitForTimeout(3000);

		// ═══════════════════════════════════════
		// 2. 仪表盘
		// ═══════════════════════════════════════
		console.log("\n【2. 仪表盘】");
		await page.goto(`${BASE}/dashboard`, {
			waitUntil: "commit",
			timeout: 30000,
		});
		// Clear localStorage to reset language to default (zh)
		await page.evaluate(() => {
			try {
				localStorage.removeItem("cinaadmin.lang");
			} catch (_e) {}
		});
		await page.reload({ waitUntil: "commit", timeout: 30000 });
		await page.waitForTimeout(8000);

		const dashText = await page
			.locator("body")
			.innerText()
			.catch(() => "");
		// Dashboard title is locale-dependent — check for any known title
		log(
			"仪表盘标题",
			dashText.includes("概览") ||
				dashText.includes("Overview") ||
				dashText.includes("Dashboard"),
			dashText.includes("概览")
				? "zh"
				: dashText.includes("Overview")
					? "en"
					: "?",
		);
		log(
			"数据快照",
			dashText.includes("数据快照") ||
				dashText.includes("Snapshot") ||
				dashText.includes("Stats"),
			"",
		);
		log(
			"KPI 卡片渲染",
			(await page.locator("section").count()) > 0,
			`${await page.locator("section").count()} sections`,
		);

		// StatCard values: check for any numeric text in the KPI area
		const statTexts = await page.locator("section").allInnerTexts();
		const hasNumbers = statTexts.some((t) => /\d/.test(t));
		log("StatCard 数值渲染", hasNumbers, `${statTexts.length} sections`);

		// ═══════════════════════════════════════
		// 3. 用户列表
		// ═══════════════════════════════════════
		console.log("\n【3. 用户列表】");
		await page.goto(`${BASE}/users`, { waitUntil: "commit", timeout: 30000 });
		await page.waitForTimeout(5000);
		// Poll for table rows or empty state
		for (let i = 0; i < 15; i++) {
			await page.waitForTimeout(1000);
			const r = await page.locator("table tbody tr").count();
			if (r > 0) break;
			const e = await page.locator("text=暂无用户, text=No users").count();
			if (e > 0) break;
		}

		const userRows = await page.locator("table tbody tr").count();
		log("用户列表有数据", userRows > 0, `${userRows} 行`);

		if (userRows > 0) {
			// Check columns
			const headers = await page.locator("table thead th").allInnerTexts();
			log("表头完整", headers.length >= 4, headers.join(", "));

			// Check status badges
			const badges = await page
				.locator("table tbody tr td .inline-flex")
				.count();
			log("状态徽章渲染", badges > 0, `${badges} 个`);

			// Check search
			const searchInput = page
				.locator('input[placeholder*="搜索"], input[placeholder*="Search"]')
				.first();
			log("搜索框存在", (await searchInput.count()) > 0, "");

			// Check pagination
			const pagination = page.locator("text=/共.*条|Previous|下一页/");
			log("分页组件", (await pagination.count()) > 0, "");
		}

		// ═══════════════════════════════════════
		// 4. 用户详情
		// ═══════════════════════════════════════
		console.log("\n【4. 用户详情】");
		const userId = await page
			.evaluate(async () => {
				const r = await fetch("/api/admin/users?limit=1");
				const d = await r.json();
				return d.data?.users?.[0]?.id || null;
			})
			.catch(() => null);

		if (userId) {
			await page.goto(`${BASE}/users/${userId}`, {
				waitUntil: "commit",
				timeout: 30000,
			});
			await page.waitForTimeout(5000);
			// Wait for tabs to hydrate
			for (let i = 0; i < 10; i++) {
				await page.waitForTimeout(1000);
				if ((await page.locator('[role="tab"]').count()) > 0) break;
			}

			const detailText = await page.locator("body").innerText();
			log(
				"详情页加载",
				!detailText.includes("加载失败") && !detailText.includes("not found"),
				"",
			);
			log("显示用户邮箱", /\S+@\S+\.\S+/.test(detailText), "");

			// Check tabs
			const tabs = await page.locator('[role="tab"]').count();
			log("Tab 数量", tabs >= 4, `${tabs} 个 tabs`);

			// Check action buttons
			const actionBtns = await page.locator("header button").count();
			log("操作按钮", actionBtns >= 3, `${actionBtns} 个`);

			// Check edit form
			const saveBtn = page.locator('button[type="submit"]').first();
			const hasSaveBtn = (await saveBtn.count()) > 0;
			log("编辑表单存在", hasSaveBtn, "");

			// Check email verified badge
			if (detailText.includes("已验证") || detailText.includes("Verified")) {
				log("邮箱已验证标记", true, "");
			}
		}

		// ═══════════════════════════════════════
		// 5. 会话页
		// ═══════════════════════════════════════
		console.log("\n【5. 会话页】");
		await page.goto(`${BASE}/sessions`, {
			waitUntil: "commit",
			timeout: 30000,
		});
		await page.waitForTimeout(3000);
		const sessText = await page.locator("body").innerText();
		log(
			"会话页加载",
			!sessText.includes("error") && !sessText.includes("502"),
			"",
		);
		log(
			"会话页标题",
			sessText.includes("会话管理") || sessText.includes("Sessions"),
			"",
		);

		// ═══════════════════════════════════════
		// 6. 审计日志
		// ═══════════════════════════════════════
		console.log("\n【6. 审计日志】");
		await page.goto(`${BASE}/audit`, { waitUntil: "commit", timeout: 30000 });
		await page.waitForTimeout(5000);
		for (let i = 0; i < 15; i++) {
			await page.waitForTimeout(1000);
			const r = await page.locator("table tbody tr").count();
			if (r > 0) break;
			const e = await page.locator("text=暂无审计, text=No audit").count();
			if (e > 0) break;
		}

		const auditRows = await page.locator("table tbody tr").count();
		log("审计日志有数据", auditRows > 0, `${auditRows} 行`);

		// Check filters
		const selects = await page.locator('button[role="combobox"]').count();
		log("筛选器数量", selects >= 2, `${selects} 个`);

		// Check export button
		const exportBtn = page.locator("a").filter({ hasText: /导出|Export|CSV/i });
		log("导出按钮", (await exportBtn.count()) > 0, "");

		// ═══════════════════════════════════════
		// 7. 组织页
		// ═══════════════════════════════════════
		console.log("\n【7. 组织页】");
		await page.goto(`${BASE}/organizations`, {
			waitUntil: "commit",
			timeout: 30000,
		});
		await page.waitForTimeout(3000);
		const orgText = await page.locator("body").innerText();
		log(
			"组织页加载",
			!orgText.includes("error") && !orgText.includes("502"),
			"",
		);
		log(
			"组织页标题",
			orgText.includes("组织") || orgText.includes("Organization"),
			"",
		);

		// ═══════════════════════════════════════
		// 8. API 密钥页
		// ═══════════════════════════════════════
		console.log("\n【8. API 密钥页】");
		await page.goto(`${BASE}/api-keys`, {
			waitUntil: "commit",
			timeout: 30000,
		});
		await page.waitForTimeout(3000);
		const apiKeyText = await page.locator("body").innerText();
		log(
			"API密钥页加载",
			!apiKeyText.includes("error") && !apiKeyText.includes("502"),
			"",
		);
		log(
			"API密钥页标题",
			apiKeyText.includes("API") || apiKeyText.includes("Key"),
			"",
		);

		// ═══════════════════════════════════════
		// 9. 安全策略页
		// ═══════════════════════════════════════
		console.log("\n【9. 安全策略页】");
		await page.goto(`${BASE}/settings/security`, {
			waitUntil: "commit",
			timeout: 30000,
		});
		await page.waitForTimeout(3000);
		const secText = await page.locator("body").innerText();
		log(
			"安全策略页加载",
			!secText.includes("error") && !secText.includes("502"),
			"",
		);
		log(
			"只读标记",
			secText.includes("只读") ||
				secText.includes("Read-only") ||
				secText.includes("read"),
			"",
		);

		// ═══════════════════════════════════════
		// 10. 创建用户页
		// ═══════════════════════════════════════
		console.log("\n【10. 创建用户页】");
		await page.goto(`${BASE}/users/new`, {
			waitUntil: "commit",
			timeout: 30000,
		});
		await page.waitForTimeout(3000);
		const newText = await page.locator("body").innerText();
		log(
			"创建用户页加载",
			!newText.includes("error") && !newText.includes("502"),
			"",
		);
		// Check role selector
		const roleSelect = page.locator('button[role="combobox"]').first();
		log("角色选择器存在", (await roleSelect.count()) > 0, "");

		// ═══════════════════════════════════════
		// 11. 多语言切换
		// ═══════════════════════════════════════
		console.log("\n【11. 多语言切换】");
		await page.goto(`${BASE}/dashboard`, {
			waitUntil: "commit",
			timeout: 30000,
		});
		await page.waitForTimeout(3000);
		const _navZh = await page
			.locator("nav")
			.innerText()
			.catch(() => "");
		const langTrigger = page.locator('header button[role="combobox"]').first();
		if ((await langTrigger.count()) > 0) {
			await langTrigger.click();
			await page.waitForTimeout(1000);
			const enOpt = page
				.locator('[role="option"]')
				.filter({ hasText: /^EN$/ })
				.first();
			if ((await enOpt.count()) > 0) {
				await enOpt.click();
				await page.waitForTimeout(1500);
				const navEn = await page
					.locator("nav")
					.innerText()
					.catch(() => "");
				log(
					"切换到英文",
					navEn.includes("Overview") || navEn.includes("Users"),
					"",
				);
			}
		}

		// ═══════════════════════════════════════
		// 12. 主题切换
		// ═══════════════════════════════════════
		console.log("\n【12. 主题切换】");
		const themeBtn = page
			.locator('header button[aria-label*="theme" i]')
			.first();
		if ((await themeBtn.count()) > 0) {
			await themeBtn.click();
			await page.waitForTimeout(1000);
			const lightOpt = page
				.locator('[role="menuitem"]')
				.filter({ hasText: /浅色|Light/i })
				.first();
			if ((await lightOpt.count()) > 0) {
				await lightOpt.click();
				await page.waitForTimeout(1500);
				const isLight = await page.evaluate(
					() => !document.documentElement.classList.contains("dark"),
				);
				log("切换到浅色", isLight, "");
			}
		}

		// ═══════════════════════════════════════
		// 13. Toast 反馈
		// ═══════════════════════════════════════
		console.log("\n【13. Toast 反馈】");
		const uid2 = await page
			.evaluate(async () => {
				const r = await fetch("/api/admin/users?limit=1");
				const d = await r.json();
				return d.data?.users?.[0]?.id || null;
			})
			.catch(() => null);
		if (uid2) {
			// Fresh navigation — the previous theme test may have left
			// the page in a state where React Query cache is stale.
			await page.goto(`${BASE}/users/${uid2}`, {
				waitUntil: "commit",
				timeout: 30000,
			});
			await page.waitForTimeout(5000);
			// The edit form is in the overview tab's second card.
			// Wait for it to hydrate — this can take 10-20s on slow edge.
			for (let i = 0; i < 25; i++) {
				await page.waitForTimeout(1000);
				if ((await page.locator('button[type="submit"]').count()) > 0) break;
			}
			const saveBtn = page.locator('button[type="submit"]').first();
			const btnCount = await saveBtn.count();
			if (btnCount > 0) {
				const nameInput = page.locator('input[id="name"]').first();
				if ((await nameInput.count()) > 0) {
					const cur = await nameInput.inputValue().catch(() => "");
					await nameInput.fill(cur.trim() + " ");
				}
				await saveBtn.click();
				let found = false;
				for (let i = 0; i < 10; i++) {
					await page.waitForTimeout(500);
					if (
						(await page
							.locator('[data-sonner-toast], [class*="sonner"]')
							.count()) > 0
					) {
						found = true;
						break;
					}
				}
				log("Toast 保存反馈", found, "");
			}
		}

		// ═══════════════════════════════════════
		// 14. 控制台错误
		// ═══════════════════════════════════════
		console.log("\n【14. 控制台错误 & 网络】");
		const realErrors = consoleErrors.filter(
			(e) => !e.includes("favicon") && !e.includes("React DevTools"),
		);
		log("无控制台错误", realErrors.length === 0, `${realErrors.length} 个`);
		realErrors
			.slice(0, 3)
			.forEach((e) => console.log(`    ⚠ ${e.slice(0, 100)}`));
		log("无网络失败", networkErrors.length === 0, `${networkErrors.length} 个`);
	} catch (err) {
		log("测试执行", false, err.message.slice(0, 80));
	} finally {
		await page.screenshot({ path: join(__dirname, "screenshot-full.png") });
		await browser.close();
	}

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
