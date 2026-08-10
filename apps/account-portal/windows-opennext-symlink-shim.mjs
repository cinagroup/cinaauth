import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";

// OpenNext copies pnpm package links without specifying a Windows link type.
// Non-elevated Windows can create directory junctions but not directory
// symbolic links. The shim is loaded only in the OpenNext child process.
if (process.platform === "win32") {
	const symlinkSync = fs.symlinkSync.bind(fs);
	const symlink = fs.symlink.bind(fs);
	const symlinkPromise = fs.promises.symlink.bind(fs.promises);
	fs.symlinkSync = (target, path, type) =>
		symlinkSync(target, path, type ?? "junction");
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
