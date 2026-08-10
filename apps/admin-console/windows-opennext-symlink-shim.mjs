import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";

// Non-elevated Windows can create directory junctions but not directory
// symbolic links. Next/OpenNext omit the link type for traced pnpm packages.
if (process.platform === "win32") {
	const symlinkSync = fs.symlinkSync.bind(fs);
	const symlink = fs.symlink.bind(fs);
	const symlinkPromise = fs.promises.symlink.bind(fs.promises);
	fs.symlinkSync = (target, targetPath, type) =>
		symlinkSync(target, targetPath, type ?? "junction");
	fs.symlink = (target, targetPath, type, callback) => {
		if (typeof type === "function") {
			return symlink(target, targetPath, "junction", type);
		}
		return symlink(target, targetPath, type ?? "junction", callback);
	};
	fs.promises.symlink = (target, targetPath, type) =>
		symlinkPromise(target, targetPath, type ?? "junction");
	syncBuiltinESMExports();
}
