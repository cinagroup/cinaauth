// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import type {
	ReownAppKitStateSource,
	ReownModalA11yObserver,
} from "./reown-appkit-a11y";
import { installReownAppKitA11yShim } from "./reown-appkit-a11y";

const createFrameHarness = () => {
	let nextId = 1;
	const callbacks = new Map<number, FrameRequestCallback>();

	return {
		request(callback: FrameRequestCallback) {
			const id = nextId++;
			callbacks.set(id, callback);
			return id;
		},
		cancel(id: number) {
			callbacks.delete(id);
		},
		flushAll() {
			while (callbacks.size > 0) {
				const pending = [...callbacks.values()];
				callbacks.clear();
				for (const callback of pending) callback(0);
			}
		},
		get size() {
			return callbacks.size;
		},
	};
};

const createObserverHarness = () => {
	let callback: MutationCallback | undefined;
	const observer: ReownModalA11yObserver = {
		observe: vi.fn(),
		disconnect: vi.fn(),
	};

	return {
		observer,
		create(nextCallback: MutationCallback) {
			callback = nextCallback;
			return observer;
		},
		fire() {
			callback?.([], observer as MutationObserver);
		},
	};
};

const createStateSource = () => {
	const subscribers = new Set<(state: { open: boolean }) => void>();
	const unsubscribe = vi.fn();
	const close = vi.fn(async () => undefined);
	const appKit = {
		close,
		subscribeState(callback) {
			subscribers.add(callback);
			return () => {
				subscribers.delete(callback);
				unsubscribe();
			};
		},
	} satisfies ReownAppKitStateSource & { close: () => Promise<void> };

	return {
		appKit,
		close,
		unsubscribe,
		emit(open: boolean) {
			for (const subscriber of subscribers) subscriber({ open });
		},
	};
};

const createAppKitModalFixture = () => {
	const modal = document.createElement("w3m-modal");
	const modalRoot = modal.attachShadow({ mode: "open" });
	const dialog = document.createElement("div");
	dialog.dataset.testid = "w3m-modal-card";
	dialog.setAttribute("role", "alertdialog");
	dialog.setAttribute("aria-modal", "true");
	dialog.tabIndex = 0;

	const header = document.createElement("w3m-header");
	const headerRoot = header.attachShadow({ mode: "open" });
	const closeHost = document.createElement("wui-icon-button");
	closeHost.dataset.testid = "w3m-header-close";
	const closeRoot = closeHost.attachShadow({ mode: "open" });
	const closeButton = document.createElement("button");
	closeRoot.append(closeButton);
	headerRoot.append(closeHost);
	dialog.append(header);
	modalRoot.append(dialog);
	document.body.append(modal);

	return { closeButton, closeRoot, dialog };
};

afterEach(() => {
	document.body.replaceChildren();
});

describe("Reown AppKit 1.8.23 modal accessibility shim", () => {
	it("patches and focuses the open Shadow DOM modal after AppKit state opens", () => {
		const frames = createFrameHarness();
		const observers = createObserverHarness();
		const state = createStateSource();
		const trigger = document.createElement("button");
		document.body.append(trigger);
		trigger.focus();
		const { closeButton, dialog } = createAppKitModalFixture();
		const focusDialog = vi.spyOn(dialog, "focus");

		const dispose = installReownAppKitA11yShim({
			appKit: state.appKit,
			getTriggerElement: () => trigger,
			platform: {
				document,
				requestAnimationFrame: frames.request,
				cancelAnimationFrame: frames.cancel,
				createObserver: observers.create,
			},
		});

		state.emit(true);
		expect(dialog.getAttribute("role")).toBe("alertdialog");
		frames.flushAll();

		expect(dialog.getAttribute("role")).toBe("dialog");
		expect(dialog.getAttribute("aria-label")).toBe("Connect wallet");
		expect(closeButton.getAttribute("aria-label")).toBe("Close wallet dialog");
		expect(focusDialog).toHaveBeenCalledTimes(1);

		dispose();
	});

	it("reapplies labels after an observed AppKit rerender without stealing focus", () => {
		const frames = createFrameHarness();
		const observers = createObserverHarness();
		const state = createStateSource();
		const trigger = document.createElement("button");
		document.body.append(trigger);
		const { closeButton, dialog } = createAppKitModalFixture();
		const focusDialog = vi.spyOn(dialog, "focus");

		const dispose = installReownAppKitA11yShim({
			appKit: state.appKit,
			getTriggerElement: () => trigger,
			platform: {
				document,
				requestAnimationFrame: frames.request,
				cancelAnimationFrame: frames.cancel,
				createObserver: observers.create,
			},
		});

		state.emit(true);
		frames.flushAll();
		closeButton.removeAttribute("aria-label");
		observers.fire();
		frames.flushAll();

		expect(closeButton.getAttribute("aria-label")).toBe("Close wallet dialog");
		expect(focusDialog).toHaveBeenCalledTimes(1);

		dispose();
	});

	it("uses the official AppKit close action when the deep close button is clicked", () => {
		const frames = createFrameHarness();
		const observers = createObserverHarness();
		const state = createStateSource();
		const trigger = document.createElement("button");
		document.body.append(trigger);
		const { closeButton } = createAppKitModalFixture();

		const dispose = installReownAppKitA11yShim({
			appKit: state.appKit,
			getTriggerElement: () => trigger,
			platform: {
				document,
				requestAnimationFrame: frames.request,
				cancelAnimationFrame: frames.cancel,
				createObserver: observers.create,
			},
		});

		state.emit(true);
		frames.flushAll();
		observers.fire();
		frames.flushAll();
		closeButton.click();

		expect(state.close).toHaveBeenCalledTimes(1);

		dispose();
		closeButton.click();
		expect(state.close).toHaveBeenCalledTimes(1);
	});

	it("moves the fallback listener when AppKit replaces its native close button", () => {
		const frames = createFrameHarness();
		const observers = createObserverHarness();
		const state = createStateSource();
		const trigger = document.createElement("button");
		document.body.append(trigger);
		const { closeButton, closeRoot } = createAppKitModalFixture();

		const dispose = installReownAppKitA11yShim({
			appKit: state.appKit,
			getTriggerElement: () => trigger,
			platform: {
				document,
				requestAnimationFrame: frames.request,
				cancelAnimationFrame: frames.cancel,
				createObserver: observers.create,
			},
		});

		state.emit(true);
		frames.flushAll();
		const replacement = document.createElement("button");
		closeRoot.replaceChildren(replacement);
		observers.fire();
		frames.flushAll();

		closeButton.click();
		expect(state.close).not.toHaveBeenCalled();
		replacement.click();
		expect(state.close).toHaveBeenCalledTimes(1);

		dispose();
	});

	it("restores trigger focus and removes short-lived work when the modal closes", () => {
		const frames = createFrameHarness();
		const observers = createObserverHarness();
		const state = createStateSource();
		const trigger = document.createElement("button");
		document.body.append(trigger);
		const focusTrigger = vi.spyOn(trigger, "focus");
		createAppKitModalFixture();

		const dispose = installReownAppKitA11yShim({
			appKit: state.appKit,
			getTriggerElement: () => trigger,
			platform: {
				document,
				requestAnimationFrame: frames.request,
				cancelAnimationFrame: frames.cancel,
				createObserver: observers.create,
			},
		});

		state.emit(true);
		frames.flushAll();
		observers.fire();
		expect(frames.size).toBe(1);
		state.emit(false);

		expect(focusTrigger).toHaveBeenCalledTimes(1);
		expect(observers.observer.disconnect).toHaveBeenCalled();
		expect(frames.size).toBe(0);

		dispose();
		expect(state.unsubscribe).toHaveBeenCalledTimes(1);
	});
});
