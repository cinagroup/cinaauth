const DIALOG_LABEL = "Connect wallet";
const CLOSE_BUTTON_LABEL = "Close wallet dialog";
const MAX_PATCH_ATTEMPTS = 8;

type ReownAppKitModalState = {
	open: boolean;
};

export type ReownAppKitStateSource = {
	close(): Promise<void>;
	subscribeState(callback: (state: ReownAppKitModalState) => void): () => void;
};

export type ReownModalA11yObserver = Pick<
	MutationObserver,
	"disconnect" | "observe"
>;

type ReownModalA11yPlatform = {
	document: Document;
	requestAnimationFrame: (callback: FrameRequestCallback) => number;
	cancelAnimationFrame: (handle: number) => void;
	createObserver: (callback: MutationCallback) => ReownModalA11yObserver;
};

type InstallReownAppKitA11yShimOptions = {
	appKit: ReownAppKitStateSource;
	getTriggerElement: () => HTMLElement | null;
	platform?: ReownModalA11yPlatform;
};

const createBrowserPlatform = (): ReownModalA11yPlatform => ({
	document,
	requestAnimationFrame: window.requestAnimationFrame.bind(window),
	cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
	createObserver: (callback) => new MutationObserver(callback),
});

/**
 * Temporary accessibility bridge for the open Shadow DOM shipped by
 * @reown/appkit 1.8.23. Remove it after AppKit owns the dialog name, initial
 * focus, close-button name, and focus restoration itself.
 */
export const installReownAppKitA11yShim = ({
	appKit,
	getTriggerElement,
	platform = createBrowserPlatform(),
}: InstallReownAppKitA11yShimOptions) => {
	let frameHandle: number | undefined;
	let observer: ReownModalA11yObserver | undefined;
	let patchAttempts = 0;
	let dialogFocused = false;
	let modalOpen = false;
	let returnFocusElement: HTMLElement | null = null;
	let wiredCloseButton: HTMLButtonElement | null = null;

	const handleCloseButtonClick = () => {
		void appKit.close().catch(() => undefined);
	};

	const wireCloseButton = (button: HTMLButtonElement | null) => {
		if (wiredCloseButton === button) return;
		wiredCloseButton?.removeEventListener("click", handleCloseButtonClick);
		wiredCloseButton = button;
		wiredCloseButton?.addEventListener("click", handleCloseButtonClick);
	};

	const cancelPendingFrame = () => {
		if (frameHandle === undefined) return;
		platform.cancelAnimationFrame(frameHandle);
		frameHandle = undefined;
	};

	const disconnectObserver = () => {
		observer?.disconnect();
		observer = undefined;
	};

	const restoreTriggerFocus = () => {
		const trigger = returnFocusElement;
		returnFocusElement = null;
		if (trigger?.isConnected) trigger.focus({ preventScroll: true });
	};

	const closeModalSession = (restoreFocus: boolean) => {
		cancelPendingFrame();
		disconnectObserver();
		wireCloseButton(null);
		patchAttempts = 0;
		dialogFocused = false;
		modalOpen = false;
		if (restoreFocus) restoreTriggerFocus();
		else returnFocusElement = null;
	};

	const observeCurrentRoots = (
		modalRoot: ShadowRoot,
		headerRoot: ShadowRoot | null,
		closeButtonRoot: ShadowRoot | null,
	) => {
		observer?.disconnect();
		observer ??= platform.createObserver(() => {
			patchAttempts = 0;
			schedulePatch();
		});
		const options = { childList: true, subtree: true };
		observer.observe(modalRoot, options);
		if (headerRoot) observer.observe(headerRoot, options);
		if (closeButtonRoot) observer.observe(closeButtonRoot, options);
	};

	const patchOpenModal = () => {
		if (!modalOpen) return true;

		const modal = platform.document.querySelector<HTMLElement>(
			"w3m-modal, appkit-modal",
		);
		const modalRoot = modal?.shadowRoot;
		if (!modalRoot) return false;

		const dialog = modalRoot.querySelector<HTMLElement>(
			'[data-testid="w3m-modal-card"]',
		);
		if (!dialog) {
			observeCurrentRoots(modalRoot, null, null);
			return false;
		}

		dialog.setAttribute("role", "dialog");
		dialog.setAttribute("aria-label", DIALOG_LABEL);
		if (!dialogFocused) {
			dialog.focus({ preventScroll: true });
			dialogFocused = true;
		}

		const header = dialog.querySelector<HTMLElement>("w3m-header");
		const headerRoot = header?.shadowRoot ?? null;
		const closeButtonHost = headerRoot?.querySelector<HTMLElement>(
			'[data-testid="w3m-header-close"]',
		);
		const closeButtonRoot = closeButtonHost?.shadowRoot ?? null;
		const closeButton =
			closeButtonRoot?.querySelector<HTMLButtonElement>("button") ?? null;
		closeButton?.setAttribute("aria-label", CLOSE_BUTTON_LABEL);
		wireCloseButton(closeButton);

		observeCurrentRoots(modalRoot, headerRoot, closeButtonRoot);

		return closeButton !== null;
	};

	function schedulePatch() {
		if (!modalOpen || frameHandle !== undefined) return;
		frameHandle = platform.requestAnimationFrame(() => {
			frameHandle = undefined;
			patchAttempts += 1;
			const complete = patchOpenModal();
			if (!complete && patchAttempts < MAX_PATCH_ATTEMPTS) schedulePatch();
		});
	}

	const unsubscribe = appKit.subscribeState(({ open }) => {
		if (open) {
			if (!modalOpen) {
				modalOpen = true;
				returnFocusElement = getTriggerElement();
				patchAttempts = 0;
				dialogFocused = false;
			}
			schedulePatch();
			return;
		}

		if (modalOpen) closeModalSession(true);
	});

	return () => {
		const shouldRestoreFocus = modalOpen;
		closeModalSession(shouldRestoreFocus);
		unsubscribe();
	};
};
